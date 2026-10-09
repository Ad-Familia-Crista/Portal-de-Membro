-- ==============================================================================
-- Migração: Adicionar campo department_start_date na tabela profiles
-- Portal de Membro - Assembleia de Deus Família Cristã (ADFC)
-- ==============================================================================

-- 1. Adiciona a coluna department_start_date caso ainda não exista
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department_start_date DATE;

-- 2. Comentário explicativo na coluna
COMMENT ON COLUMN profiles.department_start_date IS 'Data em que o membro ingressou no(s) seu(s) departamento(s) atual(is)';
