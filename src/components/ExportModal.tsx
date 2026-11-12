import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pngDataUrl: string | null;
  filename: string;
  blob: Blob | null;
  onToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  pngDataUrl,
  filename,
  blob,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !pngDataUrl) return null;

  const handleCopyClipboard = async () => {
    if (!blob) {
      onToast('No hay imagen para copiar.');
      return;
    }
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        onToast('¡Imagen copiada al portapapeles! ✿');
        setTimeout(() => setCopied(false), 3000);
      } else {
        onToast('Tu navegador no admite copiar imágenes al portapapeles directamente.');
      }
    } catch {
      onToast('No se pudo copiar al portapapeles. Puedes descargarla con el botón.');
    }
  };

  const handleDownloadAgain = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
    onToast('Descarga iniciada.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-w-2xl w-full max-h-[90vh] bg-[var(--paper2)] rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col border border-[var(--line)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div>
            <h3 className="text-xl font-normal text-[var(--tx)] m-0">
              ¡Tu ficha está lista! ✿
            </h3>
            <p className="text-xs opacity-70 m-0 mt-0.5">
              Se ha iniciado la descarga como <span className="font-mono">{filename}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-lg text-gray-600 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 overflow-auto my-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2 flex items-center justify-center">
          <img
            src={pngDataUrl}
            alt="Ficha de fandom exportada"
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="px-4 py-2 rounded-full border-2 border-[var(--line)] bg-white text-sm font-medium hover:border-[var(--tx)] cursor-pointer transition-colors"
          >
            {copied ? '✓ ¡Copiada!' : '📋 Copiar al portapapeles'}
          </button>
          <button
            type="button"
            onClick={handleDownloadAgain}
            className="px-5 py-2 rounded-full bg-[#b08fd8] text-white border-2 border-[#8c63c4] hover:bg-[#9d7bc5] text-sm font-medium cursor-pointer shadow-sm transition-colors"
          >
            ⬇ Volver a descargar PNG
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-gray-300 text-sm opacity-80 hover:opacity-100 cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
