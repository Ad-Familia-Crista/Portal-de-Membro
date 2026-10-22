-- ==============================================================================
-- MIGRATION: Renomear "Dep. Lideres" para "Dep. Líderes" (com acento)
-- ==============================================================================
-- Descrição:
-- 1. Atualiza registros no array 'departments' da tabela 'profiles'
-- 2. Atualiza a chave no JSONB 'department_roles' da tabela 'profiles'
-- 3. Atualiza o texto na coluna legada 'leader_department' da tabela 'profiles'
-- 4. Atualiza a tabela auxiliar 'departments' (se houver o registro 'Dep. Lideres')
--
-- ATENÇÃO: NÃO execute diretamente no código. Entregue para execução manual no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONSULTA DE CONFERÊNCIA (ANTES DA MIGRAÇÃO)
-- Localiza membros que possuem a grafia legada sem acento 'Dep. Lideres'
-- ------------------------------------------------------------------------------
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    departments, 
    department_roles, 
    leader_department
FROM public.profiles
WHERE 'Dep. Lideres' = ANY(departments)
   OR department_roles ? 'Dep. Lideres'
   OR leader_department LIKE '%Dep. Lideres%';

-- Conferir na tabela 'departments' (se existir)
SELECT * FROM public.departments WHERE name = 'Dep. Lideres';

-- ------------------------------------------------------------------------------
-- 2. MIGRAÇÃO SEGURA E IDEMPOTENTE
-- ------------------------------------------------------------------------------

-- A) Atualizar no array 'departments' dos membros
UPDATE public.profiles
SET departments = array_replace(departments, 'Dep. Lideres', 'Dep. Líderes')
WHERE 'Dep. Lideres' = ANY(departments);

-- B) Atualizar chave no JSONB 'department_roles', preservando o valor associado (string ou lista)
UPDATE public.profiles
SET department_roles = (department_roles - 'Dep. Lideres') || jsonb_build_object('Dep. Líderes', department_roles->'Dep. Lideres')
WHERE department_roles ? 'Dep. Lideres';

-- C) Atualizar na coluna de texto legada 'leader_department'
UPDATE public.profiles
SET leader_department = REPLACE(leader_department, 'Dep. Lideres', 'Dep. Líderes')
WHERE leader_department LIKE '%Dep. Lideres%';

-- D) Atualizar na tabela de departamentos cadastrados (se existir)
UPDATE public.departments
SET name = 'Dep. Líderes'
WHERE name = 'Dep. Lideres';

-- ------------------------------------------------------------------------------
-- 3. CONSULTA DE CONFERÊNCIA (DEPOIS DA MIGRAÇÃO)
-- O resultado esperado para todas as consultas abaixo é ZERO linhas.
-- ------------------------------------------------------------------------------
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    departments, 
    department_roles, 
    leader_department
FROM public.profiles
WHERE 'Dep. Lideres' = ANY(departments)
   OR department_roles ? 'Dep. Lideres'
   OR leader_department LIKE '%Dep. Lideres%';

SELECT * FROM public.departments WHERE name = 'Dep. Lideres';
