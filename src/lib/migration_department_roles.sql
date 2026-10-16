-- ==============================================================================
-- Migração: Suporte a Papéis de Liderança por Departamento e Gestão Global
-- Portal de Membro - Assembleia de Deus Família Cristã (ADFC)
-- ==============================================================================

-- 1. Criação da tabela global de departamentos (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita Row Level Security na tabela departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Política de leitura: qualquer usuário autenticado ou visitante pode consultar departamentos
DROP POLICY IF EXISTS "departments_read_policy" ON public.departments;
CREATE POLICY "departments_read_policy" ON public.departments
  FOR SELECT USING (true);

-- Política de escrita: Administradores e Secretários podem cadastrar novos departamentos
DROP POLICY IF EXISTS "departments_admin_write_policy" ON public.departments;
CREATE POLICY "departments_admin_write_policy" ON public.departments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'SECRETARY')
    )
  );

-- Inserir departamentos padrão caso ainda não constem no banco
INSERT INTO public.departments (name) VALUES
  ('Dep. The Search'),
  ('Dep. Lideres'),
  ('Dep. Secretaria'),
  ('Dep. Mídia'),
  ('Dep. Rosas de Saron'),
  ('Dep. Evangelismo'),
  ('Dep. Tesouraria'),
  ('Dep. Louvor'),
  ('Dep. Som/Tecnica'),
  ('Dep. Obreiros'),
  ('Dep. Recepção'),
  ('Dep. Escola Biblica Dominical'),
  ('Dep. Ele Vem'),
  ('Dep. Corderinhos')
ON CONFLICT (name) DO NOTHING;

-- 2. Adicionar coluna 'department_roles' na tabela profiles para armazenar JSON de papéis
-- Exemplo de conteúdo: {"Dep. Acolhimento": "Líder", "Dep. The Search": "Vice-Líder"}
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department_roles JSONB DEFAULT '{}'::jsonb;

-- Comentário explicativo na coluna
COMMENT ON COLUMN public.profiles.department_roles IS 'Mapeamento chave-valor de departamentos e seus papéis específicos (Membro, Líder, Vice-Líder, Coordenador, Regente)';
