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
-- 3. PERMISSÕES DE SELEÇÃO DE PERFIS: HABILITAR LEITURA PARA RECEPÇÃO
-- =========================================================================

-- Limpar possíveis políticas antigas para evitar conflitos de nomes
DROP POLICY IF EXISTS "Gestores podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Admins e Secretarias podem ver tudo" ON profiles;
DROP POLICY IF EXISTS "Leitura de perfis para gestores" ON profiles;
DROP POLICY IF EXISTS "Leitura de perfis para gestores e recepcao" ON profiles;

-- Criar política unificada que permite que gestores (ADMIN, SECRETARY) e RECEPÇÃO
-- leiam todos os perfis, enquanto membros normais leem apenas o próprio perfil.
CREATE POLICY "Leitura de perfis para gestores e recepcao" 
ON profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'SECRETARY', 'RECEPTION')
  )
  OR auth.uid() = id
);

