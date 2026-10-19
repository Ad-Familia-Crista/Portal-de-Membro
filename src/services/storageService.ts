import { supabase } from '../lib/supabase';
import { dataUrlToBlob, isAlreadyOptimized } from '../lib/imageOptimizer';

export const MEMBER_PHOTOS_BUCKET = 'member-photos';

export interface PhotoUploadResult {
  url: string;
  storageType: 'storage' | 'base64';
  oldPhotoToDelete?: string | null;
  warning?: string;
  error?: string;
}

// Cache em memória da disponibilidade do bucket para evitar requisições de upload repetidas que falhariam
let _bucketStatus: 'unknown' | 'available' | 'unavailable' = 'unknown';
let _bucketCheckPromise: Promise<boolean> | null = null;

/**
 * Verifica se o bucket de storage existe e está acessível no Supabase.
 * O resultado é memorizado para evitar overhead de rede em requisições subsequentes.
 */
export async function checkStorageBucketAvailable(forceRefresh = false): Promise<boolean> {
  if (!forceRefresh && _bucketStatus !== 'unknown') {
    return _bucketStatus === 'available';
  }

  if (_bucketCheckPromise && !forceRefresh) {
    return _bucketCheckPromise;
  }

  _bucketCheckPromise = (async () => {
    try {
      // getBucket verifica a existência do bucket sem precisar fazer upload de arquivo
      const { data, error } = await supabase.storage.getBucket(MEMBER_PHOTOS_BUCKET);
      if (error || !data) {
        console.warn(
          `[STORAGE] Bucket '${MEMBER_PHOTOS_BUCKET}' não encontrado no Supabase Storage (${error?.message || 'não configurado'}). O portal operará em modo Base64 otimizado (WebP).`
        );
        _bucketStatus = 'unavailable';
        return false;
      }
      _bucketStatus = 'available';
      console.info(`[STORAGE] Bucket '${MEMBER_PHOTOS_BUCKET}' verificado e pronto para uso.`);
      return true;
    } catch (err: any) {
      console.warn('[STORAGE] Erro ao verificar bucket do Supabase Storage. Usando fallback:', err?.message || err);
      _bucketStatus = 'unavailable';
      return false;
    } finally {
      _bucketCheckPromise = null;
    }
  })();

  return _bucketCheckPromise;
}

/**
 * Reseta o cache de verificação do bucket (usado em testes ou se o administrador acabou de criar o bucket).
 */
export function resetBucketStatusCache(): void {
  _bucketStatus = 'unknown';
}

/**
 * Processa a foto do membro:
 * - Se o bucket do Supabase Storage estiver disponível, faz o upload do arquivo e retorna a URL pública.
 * - Se o bucket não existir ou o upload falhar, opera com fallback explícito para Base64 otimizado (WebP/JPEG).
 * - IMPORTANTE (Regra de Integridade): NÃO exclui a foto antiga antecipadamente. Retorna a referência em `oldPhotoToDelete`
 *   para que a exclusão física ocorra SOMENTE APÓS a confirmação do salvamento no banco de dados.
 */
export async function uploadMemberPhoto(
  userId: string,
  photoDataUrl: string,
  oldPhotoUrl?: string
): Promise<PhotoUploadResult> {
  const cleanUserId = (userId || '').trim() || 'temp_user';

  // 1. Caso de remoção de foto (valor vazio)
  if (!photoDataUrl || !photoDataUrl.trim()) {
    return {
      url: '',
      storageType: 'base64',
      oldPhotoToDelete: oldPhotoUrl && isStorageUrl(oldPhotoUrl) ? oldPhotoUrl : null
    };
  }

  // 2. Foto já é uma URL remota (já foi salva no Storage anteriormente)
  if (photoDataUrl.startsWith('http://') || photoDataUrl.startsWith('https://')) {
    return {
      url: photoDataUrl,
      storageType: 'storage',
      oldPhotoToDelete: null
    };
  }

  // 3. Converter DataURL para Blob binário para upload
  let blob: Blob;
  try {
    blob = dataUrlToBlob(photoDataUrl);
  } catch (err: any) {
    console.warn('[STORAGE] Erro ao decodificar DataURL, mantendo Base64 direto:', err);
    return {
      url: photoDataUrl,
      storageType: 'base64',
      warning: 'Falha na conversão para Blob binário. Foto salva em Base64 otimizado.'
    };
  }

  // 4. Verificar se o bucket está acessível antes de disparar o upload
  const isBucketReady = await checkStorageBucketAvailable();
  if (!isBucketReady) {
    return {
      url: photoDataUrl,
      storageType: 'base64',
      warning: `Bucket '${MEMBER_PHOTOS_BUCKET}' não disponível no Supabase Storage. Armazenamento direto em Base64 otimizado ativo.`
    };
  }

  // 5. Bucket disponível: executa o upload
  const extension = blob.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `avatar_${Date.now()}.${extension}`;
  const filePath = `members/${cleanUserId}/${fileName}`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type
      });

    if (uploadError) {
      console.warn(`[STORAGE] Falha no upload para o bucket '${MEMBER_PHOTOS_BUCKET}' (${uploadError.message}). Utilizando fallback Base64:`, uploadError);
      return {
        url: photoDataUrl,
        storageType: 'base64',
        warning: `Falha no upload do arquivo (${uploadError.message}). Salvo em Base64 otimizado.`
      };
    }

    if (uploadData?.path) {
      const { data: publicUrlData } = supabase.storage
        .from(MEMBER_PHOTOS_BUCKET)
        .getPublicUrl(uploadData.path);

      const publicUrl = publicUrlData?.publicUrl || '';
      if (publicUrl) {
        // Marca a foto antiga para exclusão posterior (somente após gravação no banco)
        const oldPhotoToDelete = (oldPhotoUrl && isStorageUrl(oldPhotoUrl) && oldPhotoUrl !== publicUrl)
          ? oldPhotoUrl
          : null;

        return {
          url: publicUrl,
          storageType: 'storage',
          oldPhotoToDelete
        };
      }
    }

    return {
      url: photoDataUrl,
      storageType: 'base64',
      warning: 'Não foi possível obter a URL pública do arquivo enviado.'
    };
  } catch (err: any) {
    console.warn('[STORAGE] Exceção durante upload para o Supabase Storage:', err);
    return {
      url: photoDataUrl,
      storageType: 'base64',
      warning: `Exceção de rede: ${err?.message || 'Erro inesperado'}. Utilizando Base64 otimizado.`
    };
  }
}

/**
 * Remove um arquivo de foto antigo do Supabase Storage.
 * Deve ser chamado SOMENTE após a confirmação bem-sucedida do cadastro no banco de dados.
 */
export async function deleteMemberPhoto(photoUrl?: string | null): Promise<void> {
  if (!photoUrl || typeof photoUrl !== 'string') return;
  if (!isStorageUrl(photoUrl)) return;

  try {
    const marker = `/${MEMBER_PHOTOS_BUCKET}/`;
    const index = photoUrl.indexOf(marker);
    if (index === -1) return;

    let relativePath = photoUrl.substring(index + marker.length);
    relativePath = relativePath.split('?')[0];

    if (relativePath) {
      const { error } = await supabase.storage.from(MEMBER_PHOTOS_BUCKET).remove([relativePath]);
      if (error) {
        console.warn('[STORAGE] Aviso ao remover foto antiga:', error.message);
      } else {
        console.info('[STORAGE] Foto antiga removida com sucesso do storage:', relativePath);
      }
    }
  } catch (err: any) {
    console.warn('[STORAGE] Exceção ao excluir foto anterior do storage:', err?.message || err);
  }
}

function isStorageUrl(url: string): boolean {
  return url.startsWith('http') && url.includes(MEMBER_PHOTOS_BUCKET);
}
