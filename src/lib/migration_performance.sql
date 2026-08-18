-- =========================================================================
-- SCRIPT DE OTIMIZAÇÃO DE PERFORMANCE (ADFC - PORTAL DE MEMBROS)
-- Copie e execute este script no "SQL Editor" do seu painel Supabase.
-- Todas as instruções são IDEMPOTENTES (podem ser executadas múltiplas vezes sem erro).
-- =========================================================================

-- 1. ÍNDICES DE PERFORMANCE NA TABELA PROFILES
-- Melhora significativamente buscas por CPF, cargo, status, nome e data de aniversário
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_marriage_date ON profiles(marriage_date);

-- Índice GIN para consultas eficientes no JSONB 'children'
CREATE INDEX IF NOT EXISTS idx_profiles_children_gin ON profiles USING GIN (children);

-- 2. ÍNDICES NA TABELA WORSHIP_FREQUENCY
CREATE INDEX IF NOT EXISTS idx_worship_frequency_cult_date ON worship_frequency(cult_date);

-- 3. ÍNDICES NA TABELA ANNOUNCEMENTS (MURAL DE AVISOS)
CREATE INDEX IF NOT EXISTS idx_announcements_start_end_dates ON announcements(start_date, end_date);

-- 4. FUNÇÃO RPC OTIMIZADA PARA VALIDAÇÃO DE CPF DE FILHOS
-- Esta função executa no PostgreSQL e verifica se o CPF já está cadastrado
-- seja na tabela 'profiles' como membro, seja no array 'children' de outros membros.
-- Utiliza SECURITY DEFINER para que qualquer usuário autenticado possa validar sem expor dados de terceiros.

CREATE OR REPLACE FUNCTION public.check_child_cpf_exists(check_cpf text, exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_cpf text;
  formatted_cpf text;
  cpf_exists boolean := false;
BEGIN
  -- Normaliza o CPF para apenas dígitos
  clean_cpf := regexp_replace(check_cpf, '\D', '', 'g');
  
  IF length(clean_cpf) <> 11 THEN
    RETURN false;
  END IF;

  -- Formata o CPF no padrão 000.000.000-00
  formatted_cpf := substring(clean_cpf from 1 for 3) || '.' ||
                   substring(clean_cpf from 4 for 3) || '.' ||
                   substring(clean_cpf from 7 for 3) || '-' ||
                   substring(clean_cpf from 10 for 2);

  -- 1. Verifica se já existe na coluna cpf de profiles
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE (regexp_replace(cpf, '\D', '', 'g') = clean_cpf OR cpf = formatted_cpf)
    AND (exclude_user_id IS NULL OR id <> exclude_user_id)
  ) INTO cpf_exists;

  IF cpf_exists THEN
    RETURN true;
  END IF;

  -- 2. Verifica se já existe dentro do array jsonb children de outros perfis
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p,
         jsonb_array_elements(
           CASE 
             WHEN jsonb_typeof(p.children) = 'array' THEN p.children 
             ELSE '[]'::jsonb 
           END
         ) AS child
    WHERE (exclude_user_id IS NULL OR p.id <> exclude_user_id)
      AND (
        regexp_replace(child->>'cpf', '\D', '', 'g') = clean_cpf
        OR child->>'cpf' = formatted_cpf
      )
  ) INTO cpf_exists;

  RETURN cpf_exists;
END;
$$;

-- Conceder permissão de execução para usuários autenticados e anônimos (durante cadastro)
GRANT EXECUTE ON FUNCTION public.check_child_cpf_exists(text, uuid) TO authenticated, anon;
