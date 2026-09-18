-- SCRIPT DE BANCO DE DADOS: MODULO DE FREQUENCIA DE CULTOS (ADFC)
-- Copie todo este script e execute-o no "SQL Editor" do seu painel Supabase.

-- 1. Ampliar a constraint CHECK da coluna 'role' na tabela de perfis para aceitar o novo perfil 'RECEPTION'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('MEMBER', 'RECEPTION', 'SECRETARY', 'ADMIN'));

-- 2. Criar a tabela de Frequência de Cultos
CREATE TABLE IF NOT EXISTS worship_frequency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cult_date DATE NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN (
    'Culto de Primícias', 
    'Culto de Missões', 
    'Culto de Santa Ceia', 
    'Culto da Família', 
    'Culto Minha Família no Altar do Senhor',
    'Culto da Vitória'
  )),
  total_attendance INTEGER NOT NULL CHECK (total_attendance >= 0),
  visitors_attendance INTEGER NOT NULL CHECK (visitors_attendance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Regra de Negócio: Impedir duplicidade para a mesma DATA e TEMA do culto
  CONSTRAINT unique_cult_date_theme UNIQUE (cult_date, theme),
  
  -- Regra de Negócio: O número de visitantes não pode ser maior que a presença total
  CONSTRAINT check_visitors_limit CHECK (visitors_attendance <= total_attendance)
);

-- 3. Habilitar RLS (Row Level Security) na tabela worship_frequency
ALTER TABLE worship_frequency ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de Segurança RLS
DROP POLICY IF EXISTS "Leitura autorizada de frequências" ON worship_frequency;
DROP POLICY IF EXISTS "Escrita autorizada de frequências" ON worship_frequency;
DROP POLICY IF EXISTS "Inserção autorizada de frequências" ON worship_frequency;
DROP POLICY IF EXISTS "Atualização autorizada de frequências" ON worship_frequency;
DROP POLICY IF EXISTS "Deleção exclusiva do Administrador" ON worship_frequency;

-- Política de Leitura: ADMIN, SECRETARY e RECEPTION podem ver todos os registros
CREATE POLICY "Leitura autorizada de frequências" 
ON worship_frequency FOR SELECT 
TO authenticated 
USING (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY', 'RECEPTION')
);

-- Política de Inserção: ADMIN, SECRETARY e RECEPTION podem registrar
CREATE POLICY "Inserção autorizada de frequências" 
ON worship_frequency FOR INSERT
TO authenticated 
WITH CHECK (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY', 'RECEPTION')
);

-- Política de Atualização: ADMIN, SECRETARY e RECEPTION podem editar
CREATE POLICY "Atualização autorizada de frequências" 
ON worship_frequency FOR UPDATE
TO authenticated 
USING (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY', 'RECEPTION')
)
WITH CHECK (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY', 'RECEPTION')
);

-- Política de Deleção: ADMIN, SECRETARY e RECEPTION podem deletar registros de cultos
CREATE POLICY "Deleção autorizada de frequências" 
ON worship_frequency FOR DELETE 
TO authenticated 
USING (
  public.get_auth_role() IN ('ADMIN', 'SECRETARY', 'RECEPTION')
);
