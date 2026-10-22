-- ==============================================================================
-- MIGRAÇÃO: MELHORIAS NA GESTÃO DE MEMBROS (ADFC)
-- ==============================================================================
-- 1. Inserção do novo departamento 'Dep. Músicos'
-- 2. Correção da grafia de 'Dep. Corderinhos' para 'Dep. Cordeirinhos'
-- 
-- Execute este script no "SQL Editor" do painel Supabase.
-- ==============================================================================

-- ==============================================================================
-- ETAPA A: CONSULTAS DE CONFERÊNCIA ANTES DO UPDATE (EXECUTE PARA AUDITORIA)
-- ==============================================================================

-- A.1 Conferir ocorrências no array 'departments' dos membros
SELECT id, email, first_name, departments 
FROM public.profiles 
WHERE 'Dep. Corderinhos' = ANY(departments);

-- A.2 Conferir ocorrências no JSONB 'department_roles'
SELECT id, email, first_name, department_roles 
FROM public.profiles 
WHERE department_roles ? 'Dep. Corderinhos';

-- A.3 Conferir ocorrências no texto 'leader_department'
SELECT id, email, first_name, leader_department 
FROM public.profiles 
WHERE leader_department ILIKE '%corderinhos%';

-- A.4 Conferir ocorrências no JSONB de filhos/crianças
SELECT id, email, first_name, children 
FROM public.profiles 
WHERE children::text ILIKE '%corderinhos%';

-- A.5 Conferir ocorrência na tabela departments (caso exista)
SELECT id, name, is_active 
FROM public.departments 
WHERE name ILIKE '%corderinhos%';


-- ==============================================================================
-- ETAPA B: APLICAÇÃO SEGURA DAS ALTERAÇÕES
-- ==============================================================================

-- B.1 Inserir o novo departamento 'Dep. Músicos' na tabela global de departamentos (se existir)
INSERT INTO public.departments (name, is_active)
VALUES ('Dep. Músicos', true)
ON CONFLICT (name) DO NOTHING;

-- B.2 Corrigir o nome na tabela global departments
UPDATE public.departments
SET name = 'Dep. Cordeirinhos'
WHERE name = 'Dep. Corderinhos';

-- B.3 Atualizar o array 'departments' nos perfis dos membros
-- Utiliza array_replace: substitui pontualmente sem apagar nem duplicar outros departamentos
UPDATE public.profiles
SET departments = array_replace(departments, 'Dep. Corderinhos', 'Dep. Cordeirinhos')
WHERE 'Dep. Corderinhos' = ANY(departments);

-- B.4 Atualizar a chave do departamento no JSONB 'department_roles'
-- Preserva a função de liderança (Líder, Vice-Líder, etc.) atribuída ao departamento
UPDATE public.profiles
SET department_roles = (department_roles - 'Dep. Corderinhos') || jsonb_build_object('Dep. Cordeirinhos', department_roles->'Dep. Corderinhos')
WHERE department_roles ? 'Dep. Corderinhos';

-- B.5 Atualizar a string 'leader_department'
UPDATE public.profiles
SET leader_department = replace(leader_department, 'Corderinhos', 'Cordeirinhos')
WHERE leader_department ILIKE '%corderinhos%';

-- B.6 Atualizar os departamentos das crianças na coluna 'children' (JSONB)
UPDATE public.profiles
SET children = replace(children::text, 'Dep. Corderinhos', 'Dep. Cordeirinhos')::jsonb
WHERE children::text ILIKE '%corderinhos%';


-- ==============================================================================
-- ETAPA C: CONSULTA DE CONFERÊNCIA FINAL (DEVE RETORNAR ZERO LINHAS)
-- ==============================================================================
SELECT id, email, first_name 
FROM public.profiles 
WHERE 'Dep. Corderinhos' = ANY(departments)
   OR department_roles ? 'Dep. Corderinhos'
   OR leader_department ILIKE '%corderinhos%'
   OR children::text ILIKE '%corderinhos%';
