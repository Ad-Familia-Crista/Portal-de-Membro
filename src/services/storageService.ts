import { supabase } from '../lib/supabase';
import { dataUrlToBlob } from '../lib/imageOptimizer';

export const MEMBER_PHOTOS_BUCKET = 'member-photos';

export interface PhotoUploadResult {
  url: string;
  storageType: 'storage' | 'base64';
  method?: 'storage' | 'base64';
  reason?: 'success' | 'timeout' | 'error' | 'network_error' | 'unauthorized' | string;
  oldPhotoToDelete?: string | null;
  warning?: string;
  error?: string;
}

/**
 * Converte um Blob em Base64 / DataURL de forma assíncrona.
 * Utilizado quando a foto chega como blob: URL e o fallback Base64 é acionado.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Processa a foto do membro:
 * 1. Faz upload direto para o Supabase Storage com AbortController (timeout de 12 segundos).
 * 2. Garante que o caminho do arquivo siga rigorosamente `members/<auth.uid()>/<arquivo>.webp`.
 * 3. Trata URLs `blob:` com fetch(url).then(r => r.blob()).
 * 4. Se o upload falhar ou sofrer timeout (12s), retorna fallback Base64 seguro com `{ method: 'base64', reason: 'timeout' | ... }`.
 * 5. REGRA DE INTEGRIDADE: NÃO exclui a foto antiga antecipadamente. Retorna a referência em `oldPhotoToDelete`
 *    para que a exclusão física ocorra SOMENTE APÓS a confirmação do salvamento no banco de dados.
 */
export async function uploadMemberPhoto(
  userId: string,
  photoDataUrl: string,
  oldPhotoUrl?: string
): Promise<PhotoUploadResult> {
  const t0 = performance.now();

  // 1. Caso de remoção de foto (valor vazio)
  if (!photoDataUrl || !photoDataUrl.trim()) {
    console.info('[DEBUG_FOTO] Foto vazia / remoção solicitada');
    return {
      url: '',
      storageType: 'base64',
      method: 'base64',
      reason: 'removed',
      oldPhotoToDelete: oldPhotoUrl && isStorageUrl(oldPhotoUrl) ? oldPhotoUrl : null
    };
  }

  // 2. Foto já é uma URL remota (já foi salva no Storage anteriormente)
  if (photoDataUrl.startsWith('http://') || photoDataUrl.startsWith('https://')) {
    console.info('[DEBUG_FOTO] Foto já é URL remota existente:', photoDataUrl);
    return {
      url: photoDataUrl,
      storageType: 'storage',
      method: 'storage',
      reason: 'unchanged',
      oldPhotoToDelete: null
    };
  }

  // 3. Obtenção do Blob binário e do fallback Base64
  let blob: Blob;
  let fallbackBase64 = photoDataUrl;

  try {
    if (photoDataUrl.startsWith('blob:')) {
      // Trata URLs blob: com fetch nativo
      const res = await fetch(photoDataUrl);
      blob = await res.blob();
      // Prepara o fallback Base64 caso o upload falhe posteriormente
      fallbackBase64 = await blobToDataUrl(blob);
    } else if (photoDataUrl.startsWith('data:')) {
      blob = dataUrlToBlob(photoDataUrl);
    } else {
      throw new Error('Formato de foto não reconhecido (deve ser blob: ou data:).');
    }
  } catch (err: any) {
    console.warn('[DEBUG_FOTO] Erro ao decodificar imagem para Blob:', err);
    return {
      url: photoDataUrl,
      storageType: 'base64',
      method: 'base64',
      reason: 'conversion_error',
      warning: 'Falha na conversão para Blob binário. Foto salva em Base64 otimizado.'
    };
  }

  const blobSizeKb = (blob.size / 1024).toFixed(1);
  console.info(`[DEBUG_FOTO] Imagem preparada para upload: ${blobSizeKb} KB | MIME: ${blob.type}`);

  // 4. Garantir que o userId seja exatamente o do membro autenticado (ou alvo informado)
  let cleanUserId = (userId || '').trim();
  if (!cleanUserId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      cleanUserId = session?.user?.id || '';
    } catch {}
  }

  if (!cleanUserId) {
    console.warn('[DEBUG_FOTO] Usuário não identificado. Ativando fallback Base64.');
    return {
      url: fallbackBase64,
      storageType: 'base64',
      method: 'base64',
      reason: 'no_user_id',
      warning: 'Usuário não autenticado para upload no storage. Foto salva em Base64.'
    };
  }

  // 5. Construção do caminho estritamente alinhado com a RLS: members/<auth.uid()>/<arquivo>.webp
  const extension = blob.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `avatar_${Date.now()}.${extension}`;
  const filePath = `members/${cleanUserId}/${fileName}`;
  console.info(`[DEBUG_FOTO] Caminho de destino no Storage: ${filePath}`);

  // 6. Upload direto com AbortController (timeout estrito de 12 segundos)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${MEMBER_PHOTOS_BUCKET}/${filePath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[DEBUG_FOTO] ⏱️ Timeout de 12 segundos atingido durante o upload da foto. Abortando requisição...');
    controller.abort();
  }, 12000);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || supabaseAnonKey;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'x-upsert': 'true',
        'cache-control': 'max-age=3600',
        'Content-Type': blob.type || 'image/webp'
      },
      body: blob,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const uploadElapsed = (performance.now() - t0).toFixed(1);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.message || errorJson.error || errorDetail;
      } catch {}

      console.warn(`[DEBUG_FOTO] Falha no upload direto para o Storage (${errorDetail}) após ${uploadElapsed} ms. Usando fallback Base64.`);
      return {
        url: fallbackBase64,
        storageType: 'base64',
        method: 'base64',
        reason: response.status === 403 ? 'unauthorized' : 'error',
        warning: `Falha no upload (${errorDetail}). Foto salva em Base64 otimizado.`
      };
    }

    // Sucesso: obtém URL pública do Supabase
    const { data: publicUrlData } = supabase.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || '';
    if (publicUrl) {
      console.info(`[DEBUG_FOTO] ✅ Upload concluído com sucesso em ${uploadElapsed} ms: ${publicUrl}`);

      const oldPhotoToDelete = (oldPhotoUrl && isStorageUrl(oldPhotoUrl) && oldPhotoUrl !== publicUrl)
        ? oldPhotoUrl
        : null;

      return {
        url: publicUrl,
        storageType: 'storage',
        method: 'storage',
        reason: 'success',
        oldPhotoToDelete
      };
    }

    console.warn('[DEBUG_FOTO] URL pública não gerada após upload. Usando fallback Base64.');
    return {
      url: fallbackBase64,
      storageType: 'base64',
      method: 'base64',
      reason: 'public_url_failed',
      warning: 'Não foi possível obter a URL pública do arquivo enviado.'
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const uploadElapsed = (performance.now() - t0).toFixed(1);
    const isTimeout = err?.name === 'AbortError';
    const reason = isTimeout ? 'timeout' : 'network_error';

    console.warn(
      `[DEBUG_FOTO] ⚠️ Exceção no upload [motivo: ${reason}] após ${uploadElapsed} ms:`,
      err?.message || err
    );

    return {
      url: fallbackBase64,
      storageType: 'base64',
      method: 'base64',
      reason,
      warning: isTimeout
        ? 'Upload cancelado por timeout de 12s. Foto salva em Base64 otimizado.'
        : `Falha na rede (${err?.message || 'conexão instável'}). Foto salva em Base64 otimizado.`
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
        console.warn('[DEBUG_FOTO] Aviso ao remover foto antiga:', error.message);
      } else {
        console.info('[DEBUG_FOTO] Foto antiga removida com sucesso do storage:', relativePath);
      }
    }
  } catch (err: any) {
    console.warn('[DEBUG_FOTO] Exceção ao excluir foto anterior do storage:', err?.message || err);
  }
}

function isStorageUrl(url: string): boolean {
  return url.startsWith('http') && url.includes(MEMBER_PHOTOS_BUCKET);
}
