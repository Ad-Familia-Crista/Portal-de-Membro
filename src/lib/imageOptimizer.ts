/**
 * Image optimization utilities for browser-side resizing, compression, and format conversion.
 * Features:
 * - EXIF orientation preservation via createImageBitmap with imageOrientation: 'from-image'
 * - Fast memory management using Object URLs instead of large in-memory Base64 strings
 * - Detection of already-optimized images to prevent double compression
 * - WebP encoding with automatic JPEG fallback for universal compatibility
 * - Pre-downscaling helper for cropper modals to prevent memory bloat on mobile
 */

export interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg' | 'auto';
  preserveAspect?: boolean;
}

let _isWebPSupportedCache: boolean | null = null;

/**
 * Checks if the current browser environment supports Canvas WebP export.
 */
export function isWebPSupported(): boolean {
  if (_isWebPSupportedCache !== null) {
    return _isWebPSupportedCache;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL('image/webp');
    _isWebPSupportedCache = dataUrl.startsWith('data:image/webp');
  } catch {
    _isWebPSupportedCache = false;
  }
  return _isWebPSupportedCache;
}

/**
 * Verifica se a imagem já se encontra em formato otimizado e dimensões adequadas,
 * evitando recompressão desnecessária e economizando ciclos de CPU.
 */
export function isAlreadyOptimized(dataUrlOrFile: string | File | Blob): boolean {
  if (typeof dataUrlOrFile === 'string') {
    // URLs remotas (HTTP/HTTPS) já são consideradas prontas
    if (dataUrlOrFile.startsWith('http://') || dataUrlOrFile.startsWith('https://')) {
      return true;
    }
    // Base64 em WebP com tamanho inferior a 160KB já foi enquadrado e comprimido
    if (dataUrlOrFile.startsWith('data:image/webp;base64,') && dataUrlOrFile.length < 160 * 1024) {
      return true;
    }
  }
  return false;
}

/**
 * Converts a Base64/DataURL string to a Blob without creating intermediate string duplications.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('DataURL inválida para conversão em Blob.');
  }

  const header = dataUrl.substring(0, commaIndex);
  const base64Data = dataUrl.substring(commaIndex + 1);
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const binary = atob(base64Data);
  const length = binary.length;
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mime });
}

/**
 * Redimensiona e comprime uma foto no navegador para dimensões ideais de perfil/carteirinha (400x400),
 * preservando a orientação EXIF e convertendo para WebP (com fallback transparente para JPEG).
 */
export async function optimizeImage(
  fileOrDataUrl: File | Blob | string,
  options: ResizeImageOptions = {}
): Promise<string> {
  // Evita recompressão repetida se a imagem já estiver otimizada
  if (isAlreadyOptimized(fileOrDataUrl)) {
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
  }

  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    format = 'auto'
  } = options;

  let chosenFormat: 'image/webp' | 'image/jpeg' = 'image/jpeg';
  if (format === 'image/webp' || format === 'auto') {
    chosenFormat = isWebPSupported() ? 'image/webp' : 'image/jpeg';
  }

  // Se o input for File ou Blob e o navegador suportar createImageBitmap com orientação EXIF nativa:
  if (typeof createImageBitmap === 'function' && typeof fileOrDataUrl !== 'string') {
    try {
      const bitmap = await createImageBitmap(fileOrDataUrl, { imageOrientation: 'from-image' });
      const origWidth = bitmap.width;
      const origHeight = bitmap.height;

      if (origWidth > 0 && origHeight > 0) {
        const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1);
        const targetWidth = Math.max(1, Math.round(origWidth * ratio));
        const targetHeight = Math.max(1, Math.round(origHeight * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: chosenFormat === 'image/webp' });

        if (ctx) {
          if (chosenFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
          bitmap.close();

          return exportCanvasToDataUrl(canvas, chosenFormat, quality);
        }
      }
      bitmap.close();
    } catch (bitmapErr) {
      // Fallback para fluxo com ImageElement se createImageBitmap falhar
      console.warn('[IMAGE] createImageBitmap não suportado para este arquivo, utilizando fallback:', bitmapErr);
    }
  }

  // Fluxo seguro com Object URL
  let objectUrlToRevoke: string | null = null;
  let sourceUrl = '';

  if (typeof fileOrDataUrl === 'string') {
    sourceUrl = fileOrDataUrl;
  } else {
    objectUrlToRevoke = URL.createObjectURL(fileOrDataUrl);
    sourceUrl = objectUrlToRevoke;
  }

  try {
    const img = await loadImageElement(sourceUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (width <= 0 || height <= 0) {
      return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
    }

    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { alpha: chosenFormat === 'image/webp' });
    if (!ctx) {
      throw new Error('Não foi possível obter o contexto 2D do canvas.');
    }

    if (chosenFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return exportCanvasToDataUrl(canvas, chosenFormat, quality);
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

function exportCanvasToDataUrl(canvas: HTMLCanvasElement, format: 'image/webp' | 'image/jpeg', quality: number): string {
  let result = '';
  try {
    result = canvas.toDataURL(format, quality);
    if (format === 'image/webp' && !result.startsWith('data:image/webp')) {
      result = canvas.toDataURL('image/jpeg', quality);
    }
  } catch {
    result = canvas.toDataURL('image/jpeg', quality);
  }
  return result;
}

/**
 * Pre-redimensiona uma foto pesada (até 10MB) de câmera de celular para um tamanho de trabalho ágil (1200px),
 * evitando travar a GPU e a memória RAM durante o enquadramento no modal de recorte.
 */
export async function preResizeForCropper(
  file: File,
  maxDimension = 1200
): Promise<string> {
  // Se o arquivo já for leve (< 350KB), gera a visualização diretamente
  if (file.size < 350 * 1024) {
    return optimizeImage(file, {
      maxWidth: maxDimension,
      maxHeight: maxDimension,
      quality: 0.90,
      format: 'image/jpeg'
    });
  }

  return optimizeImage(file, {
    maxWidth: maxDimension,
    maxHeight: maxDimension,
    quality: 0.85,
    format: 'image/jpeg'
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Erro ao carregar imagem para processamento.'));
    img.src = src;
  });
}
