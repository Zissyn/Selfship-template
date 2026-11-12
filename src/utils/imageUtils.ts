/**
 * Robust image utilities for the scrapbooking card template.
 * Solves file picker failures in iframes, provides drag-and-drop & clipboard paste.
 */

export function processImageFile(
  file: File | Blob,
  maxDim: number = 800,
  preserveAlpha: boolean = true
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDim / Math.max(origW, origH));
        const targetW = Math.round(origW * scale);
        const targetH = Math.round(origH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('No se pudo inicializar el lienzo para procesar la imagen.'));
          return;
        }

        const isPng = file.type === 'image/png' || file.type === 'image/webp';
        if (!preserveAlpha || !isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        URL.revokeObjectURL(objectUrl);

        const format = preserveAlpha && isPng ? 'image/png' : 'image/jpeg';
        const quality = format === 'image/jpeg' ? 0.88 : undefined;
        const dataUrl = canvas.toDataURL(format, quality);

        resolve({ dataUrl, width: targetW, height: targetH });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Programmatically open file dialog with full DOM attachment to avoid iframe blocking
 */
export function openImagePicker(
  onSuccess: (dataUrl: string, width: number, height: number) => void,
  onError?: (err: string) => void,
  maxDim: number = 800
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  document.body.appendChild(input);

  const cleanup = () => {
    try {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    } catch {}
  };

  input.onchange = async () => {
    const file = input.files?.[0];
    cleanup();
    if (!file) return;

    try {
      const res = await processImageFile(file, maxDim, true);
      onSuccess(res.dataUrl, res.width, res.height);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al procesar la imagen';
      onError?.(msg);
    }
  };

  input.oncancel = () => {
    cleanup();
  };

  // Trigger file picker with user activation
  try {
    input.click();
  } catch (err) {
    cleanup();
    onError?.('El navegador no permitió abrir el selector de archivos.');
  }
}

/**
 * Programmatically open audio dialog
 */
export function openAudioPicker(
  onSuccess: (file: File) => void,
  onError?: (err: string) => void
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  document.body.appendChild(input);

  const cleanup = () => {
    try {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    } catch {}
  };

  input.onchange = () => {
    const file = input.files?.[0];
    cleanup();
    if (!file) return;
    onSuccess(file);
  };

  input.oncancel = () => {
    cleanup();
  };

  try {
    input.click();
  } catch (err) {
    cleanup();
    onError?.('No se pudo abrir el selector de audio.');
  }
}

/**
 * Extract image file from clipboard paste event
 */
export function getImageFromClipboard(
  event: ClipboardEvent
): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      return item.getAsFile();
    }
  }
  return null;
}
