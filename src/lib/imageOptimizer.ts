/**
 * Image optimization utilities for browser-side resizing and compression.
 * Downscales large images to reasonable dimensions before conversion to Base64/Upload,
 * avoiding database bloat and slow network payload transfer.
 */

export interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/webp';
}

/**
 * Resize and compress an image file or data URL
 */
export async function optimizeImage(
  fileOrDataUrl: File | string,
  options: ResizeImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width <= 0 || height <= 0) {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        return;
      }

      // Calculate ratio to fit inside maxWidth x maxHeight
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      const targetWidth = Math.round(width * ratio);
      const targetHeight = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto 2D do canvas.'));
        return;
      }

      // Fill white background for JPEGs
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const compressedDataUrl = canvas.toDataURL(format, quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar a imagem para processamento.'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo de imagem.'));
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
