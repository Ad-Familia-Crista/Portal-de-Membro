-- ==============================================================================
-- MIGRATION: Suporte a Múltiplas Funções por Departamento (JSONB department_roles)
-- ==============================================================================
-- Descrição:
-- Converte valores de funções no JSONB 'department_roles' que estejam no formato antigo
-- (texto simples, ex: {"Dep. Músicos": "Líder"}) para o formato novo (array de textos,
-- ex: {"Dep. Músicos": ["Líder"]}).
-- 
-- ATENÇÃO: NÃO execute diretamente no código. Entregue para execução manual no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONSULTA DE CONFERÊNCIA (ANTES DA MIGRAÇÃO)
-- Identifica membros cujo department_roles possui ao menos um papel no formato string
-- ------------------------------------------------------------------------------
SELECT 
    id, 
    first_name, 
    last_name, 
    department_roles 
FROM public.profiles
WHERE department_roles IS NOT NULL
  AND department_roles::text != '{}'
  AND EXISTS (
      SELECT 1 
      FROM jsonb_each(department_roles) AS kv(dept, role_val)
      WHERE jsonb_typeof(kv.role_val) = 'string'
  );

-- ------------------------------------------------------------------------------
-- 2. MIGRAÇÃO DE DADOS (SEGURA E IDEMPOTENTE)
-- Converte valores do tipo 'string' em arrays de 1 elemento, mantendo arrays já existentes.
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET department_roles = (
    SELECT jsonb_object_agg(
        kv.dept,
        CASE 
            WHEN jsonb_typeof(kv.role_val) = 'string' THEN jsonb_build_array(kv.role_val)
            ELSE kv.role_val
        END
    )
    FROM jsonb_each(department_roles) AS kv(dept, role_val)
)
WHERE department_roles IS NOT NULL
  AND department_roles::text != '{}'
  AND EXISTS (
      SELECT 1 
      FROM jsonb_each(department_roles) AS kv(dept, role_val)
      WHERE jsonb_typeof(kv.role_val) = 'string'
  );

-- ------------------------------------------------------------------------------
-- 3. CONSULTA DE CONFERÊNCIA (DEPOIS DA MIGRAÇÃO)
-- O resultado esperado é ZERO linhas com valores em formato string.
-- ------------------------------------------------------------------------------
SELECT 
    id, 
    first_name, 
    last_name, 
    department_roles 
FROM public.profiles
WHERE department_roles IS NOT NULL
  AND department_roles::text != '{}'
  AND EXISTS (
      SELECT 1 
      FROM jsonb_each(department_roles) AS kv(dept, role_val)
      WHERE jsonb_typeof(kv.role_val) = 'string'
  );
