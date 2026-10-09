-- ==============================================================================
-- Migração: Criar tabela departments para gestão dinâmica de departamentos
-- Portal de Membro - Assembleia de Deus Família Cristã (ADFC)
-- ==============================================================================

-- 1. Cria a tabela departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilita RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso:
-- Qualquer usuário autenticado ou visitante pode ler os departamentos ativos
CREATE POLICY "departments_read_policy" ON departments
  FOR SELECT USING (true);

-- Apenas Administradores e Secretários podem inserir/atualizar departamentos
CREATE POLICY "departments_admin_write_policy" ON departments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'SECRETARY')
    )
  );

-- 4. Insere os departamentos padrão caso ainda não existam
INSERT INTO departments (name) VALUES
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
  ('Dep. Corderinhos'),
  ('Nenhum Departamento')
ON CONFLICT (name) DO NOTHING;
