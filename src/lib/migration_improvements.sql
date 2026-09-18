-- MIGRATION SCRIPT: PORTAL IMPROVEMENTS (FREQUENCY & ANNOUNCEMENTS)
-- Copie todo este script e execute-o no "SQL Editor" do seu painel Supabase.

-- =========================================================================
-- 1. FREQUÊNCIA DE CULTOS: ADICIONAR COLUNA DE CRIANÇAS E ATUALIZAR REGRAS
-- =========================================================================

-- Adicionar coluna 'children_attendance' se ela não existir
ALTER TABLE worship_frequency ADD COLUMN IF NOT EXISTS children_attendance INTEGER NOT NULL DEFAULT 0;

-- Remover constraints antigas de limites de visitantes
ALTER TABLE worship_frequency DROP CONSTRAINT IF EXISTS check_visitors_limit;
ALTER TABLE worship_frequency DROP CONSTRAINT IF EXISTS check_attendance_limits;

-- Adicionar nova constraint que considera visitantes + crianças dentro da presença total
ALTER TABLE worship_frequency ADD CONSTRAINT check_attendance_limits CHECK (
  visitors_attendance + children_attendance <= total_attendance
);

-- =========================================================================
-- 2. MURAL DE AVISOS: CRIAR TABELA FÍSICA E DEFINIR RLS
-- =========================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date_info TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'event', 'alert')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- Nulo significa que o aviso é permanente ou sem expiração explícita
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Limpar políticas legadas se houver
DROP POLICY IF EXISTS "Leitura pública de avisos" ON announcements;
DROP POLICY IF EXISTS "Escrita de avisos para gestores" ON announcements;
DROP POLICY IF EXISTS "Atualização de avisos para gestores" ON announcements;
DROP POLICY IF EXISTS "Deleção de avisos para gestores" ON announcements;

-- Política de Leitura: Qualquer membro autenticado do portal pode ler os avisos ativos
CREATE POLICY "Leitura pública de avisos" 
ON announcements FOR SELECT 
TO authenticated 
USING (true);

-- Política de Inserção: Apenas perfis ADMIN ou SECRETARY podem criar avisos
CREATE POLICY "Escrita de avisos para gestores" 
ON announcements FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'SECRETARY')
  )
);

-- Política de Atualização: Apenas perfis ADMIN ou SECRETARY podem editar avisos
CREATE POLICY "Atualização de avisos para gestores" 
ON announcements FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'SECRETARY')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'SECRETARY')
  )
);

-- Política de Deleção: Apenas perfis ADMIN ou SECRETARY podem deletar avisos
CREATE POLICY "Deleção de avisos para gestores" 
ON announcements FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'SECRETARY')
  )
);

-- =========================================================================
-- 3. SEGURANÇA E PRIVACIDADE: TABELA PROFILES BLINDADA & RPC DE ANIVERSARIANTES
-- =========================================================================

-- 1. Função de segurança com SECURITY DEFINER para buscar o papel do usuário sem causar recursão RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT UPPER(role) INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'MEMBER');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- 2. Limpar todas as políticas de leitura anteriores na tabela profiles
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Gestores podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Admins e Secretarias podem ver tudo" ON profiles;
DROP POLICY IF EXISTS "Leitura de perfis para gestores" ON profiles;
DROP POLICY IF EXISTS "Leitura de perfis para gestores e recepcao" ON profiles;
DROP POLICY IF EXISTS "Leitura de perfis restrita a gestores e proprio usuario" ON profiles;

-- 3. POLÍTICA ULTRA RESTRITA NA TABELA PROFILES:
-- RECEPÇÃO NÃO TEM ACESSO À TABELA PROFILES!
-- Apenas ADMIN e SECRETARY podem consultar os cadastros completos.
-- Membros comuns e Recepção só enxergam a sua própria linha (auth.uid() = id).
CREATE POLICY "Leitura de perfis restrita a gestores e proprio usuario" 
ON profiles FOR SELECT 
TO authenticated 
USING (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY')
  OR auth.uid() = id
);

-- 4. FUNÇÃO RPC EXCLUSIVA E SEGURA PARA ANIVERSARIANTES (LGPD):
-- A Recepção busca os aniversariantes através desta função.
-- Esta função retorna ESTRITAMENTE o Nome, Datas de Aniversário/Casamento e WhatsApp.
-- DADOS SENSÍVEIS (CPF, RG, Endereço, Histórico, E-mail) NUNCA SÃO EXPOSTOS!
CREATE OR REPLACE FUNCTION public.get_member_birthdays()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  birth_date text,
  marriage_date text,
  spouse_name text,
  cell text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só permite a execução se quem chamou for RECEPTION, ADMIN ou SECRETARY
  IF public.get_auth_role() NOT IN ('RECEPTION', 'ADMIN', 'SECRETARY') THEN
    RAISE EXCEPTION 'Acesso negado: apenas recepção e gestores autorizados podem consultar aniversariantes.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.birth_date,
    p.marriage_date,
    p.spouse_name,
    p.cell,
    p.status
  FROM public.profiles p
  ORDER BY p.first_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_birthdays() TO authenticated;



