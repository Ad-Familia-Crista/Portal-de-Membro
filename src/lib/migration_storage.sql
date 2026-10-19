-- =========================================================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE: BUCKET DE FOTOS DE MEMBROS (ADFC)
-- =========================================================================
-- Execute este script no "SQL Editor" do painel Supabase se desejar habilitar
-- o armazenamento físico em nuvem de fotos através do Supabase Storage.
-- O sistema possui fallback automático caso este script ainda não tenha sido executado.
-- =========================================================================

-- 1. Criar o bucket público 'member-photos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  true,
  5242880, -- Limite de 5MB por arquivo (as fotos são comprimidas para ~20KB antes do upload)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Habilitar RLS no Storage (padrão do Supabase)
-- (storage.objects já possui RLS habilitado por padrão)

-- 3. Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Fotos de membros visíveis publicamente" ON storage.objects;
DROP POLICY IF EXISTS "Membros podem enviar suas próprias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Membros podem atualizar suas próprias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Membros podem excluir suas próprias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Gestores possuem controle total sobre fotos" ON storage.objects;

-- 4. POLÍTICAS DE ACESSO (RLS)

-- A) Leitura: Qualquer membro autenticado ou carteirinha digital pode visualizar fotos
CREATE POLICY "Fotos de membros visíveis publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

-- B) Inserção: Membro pode fazer upload no diretório com seu próprio UID (members/<uid>/...)
CREATE POLICY "Membros podem enviar suas próprias fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[2]
    OR public.get_auth_role() IN ('ADMIN', 'SECRETARY')
  )
);

-- C) Atualização: Membro pode sobrescrever arquivos em seu diretório
CREATE POLICY "Membros podem atualizar suas próprias fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[2]
    OR public.get_auth_role() IN ('ADMIN', 'SECRETARY')
  )
);

-- D) Exclusão: Membro ou gestores podem excluir fotos antigas
CREATE POLICY "Membros podem excluir suas próprias fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[2]
    OR public.get_auth_role() IN ('ADMIN', 'SECRETARY')
  )
);
