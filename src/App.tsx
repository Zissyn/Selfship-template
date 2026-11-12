import { useEffect, useState, useCallback, useRef } from 'react';
import { CardData, Palette, SlotKey } from './types/album';
import {
  STORAGE_KEY,
  createBlankCard,
  DEF_PALETTE,
  NAMES,
} from './utils/constants';
import { CardSidebar } from './components/CardSidebar';
import { BoardCanvas } from './components/BoardCanvas';
import { ToolsPanel } from './components/ToolsPanel';
import { ExportModal } from './components/ExportModal';
import { openImagePicker, getImageFromClipboard, processImageFile } from './utils/imageUtils';
import { initColorEngine, ColorEngineState } from './utils/colorEngine';
import { exportCardAsPng, downloadBlobAsFile } from './utils/exportUtils';
import { FRAME } from './assets/templateAssets';
import { loadAlbumData, saveAlbumData } from './utils/storageUtils';

interface ToastState {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export default function App() {
  // 1. Initial State from Storage (IndexedDB + localStorage fallback)
  const [cards, setCards] = useState<CardData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          return parsed.cards.map((c: Partial<CardData>) => ({
            ...createBlankCard(),
            ...c,
            tags: Array.isArray(c.tags) ? c.tags : [],
          }));
        }
      }
    } catch {}
    return [createBlankCard()];
  });

  const [currentCardId, setCurrentCardId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.cur) return parsed.cur;
      }
    } catch {}
    return cards[0]?.id || 'card-1';
  });

  const [lastBackup, setLastBackup] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.lastBackup || null;
      }
    } catch {}
    return null;
  });

  const [mobileTab, setMobileTab] = useState<'canvas' | 'album'>('canvas');
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    loadAlbumData().then((data) => {
      if (mounted && data.cards.length > 0) {
        setCards(data.cards);
        setCurrentCardId(data.cur);
        setLastBackup(data.lastBackup);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [colorEngine, setColorEngine] = useState<ColorEngineState | null>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string>(FRAME);

  const [isExporting, setIsExporting] = useState(false);
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    pngDataUrl: string | null;
    filename: string;
    blob: Blob | null;
  }>({
    isOpen: false,
    pngDataUrl: null,
    filename: '',
    blob: null,
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Current active card
  const currentCard =
    cards.find((c) => c.id === currentCardId) || cards[0] || createBlankCard();

  // Active palette
  const activePalette = currentCard.pal || DEF_PALETTE;

  // 2. Initialize Color Engine
  useEffect(() => {
    let mounted = true;
    initColorEngine().then((engine) => {
      if (mounted) {
        setColorEngine(engine);
        engine.recolor(activePalette);
        setFrameDataUrl(engine.getFrameDataUrl());
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Update recolored canvas whenever card or palette changes
  useEffect(() => {
    if (colorEngine) {
      colorEngine.recolor(activePalette);
      setFrameDataUrl(colorEngine.getFrameDataUrl());
    }
  }, [colorEngine, activePalette]);

  // Sync with document element for dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);

  // Show Toast notification
  const showToast = useCallback(
    (message: string, actionText?: string, onAction?: () => void, ms = 4000) => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      setToast({ message, actionText, onAction });
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast(null);
      }, ms);
    },
    []
  );

  // 3. Save to IndexedDB (with localStorage mirror)
  useEffect(() => {
    saveAlbumData(cards, currentCardId, lastBackup).catch(() => {
      showToast('Error al guardar datos. Considera descargar una copia (JSON).');
    });
  }, [cards, currentCardId, lastBackup, showToast]);

  // Card update helper
  const handleUpdateCard = useCallback(
    (updatedFields: Partial<CardData>) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === currentCardId
            ? { ...c, ...updatedFields, ts: Date.now() }
            : c
        )
      );
    },
    [currentCardId]
  );

  // Update palette helper
  const handleUpdatePalette = useCallback(
    (newPalette: Palette | null) => {
      handleUpdateCard({ pal: newPalette });
      if (colorEngine) {
        colorEngine.recolor(newPalette || DEF_PALETTE);
        setFrameDataUrl(colorEngine.getFrameDataUrl());
      }
    },
    [handleUpdateCard, colorEngine]
  );

  // Reliable image upload for slots
  const handleUploadSlot = useCallback(
    (slotKey: SlotKey) => {
      openImagePicker(
        (dataUrl, width, height) => {
          const newSlotData = {
            s: dataUrl,
            w: width,
            h: height,
            x: 0,
            y: 0,
            z: 1,
          };

          if (slotKey === 'a') {
            handleUpdateCard({ av: newSlotData });
          } else if (slotKey === 0 || slotKey === 1 || slotKey === 2) {
            const newH = [...currentCard.h] as [
              typeof currentCard.h[0],
              typeof currentCard.h[1],
              typeof currentCard.h[2]
            ];
            newH[slotKey] = newSlotData;
            handleUpdateCard({ h: newH });
          } else if (slotKey === 'cover') {
            handleUpdateCard({ pc: dataUrl });
          }

          setSelectedSlot(slotKey);
          showToast(`¡Imagen agregada a ${NAMES[String(slotKey)]}! ✿`);
        },
        (err) => {
          showToast(err || 'No se pudo cargar la imagen.');
        },
        1200
      );
    },
    [currentCard, handleUpdateCard, showToast]
  );

  // Clipboard Paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const file = getImageFromClipboard(e);
      if (!file) return;

      const targetSlot = selectedSlot || 'a';
      try {
        const res = await processImageFile(file, 1200);
        const newSlotData = {
          s: res.dataUrl,
          w: res.width,
          h: res.height,
          x: 0,
          y: 0,
          z: 1,
        };

        if (targetSlot === 'a') {
          handleUpdateCard({ av: newSlotData });
        } else if (typeof targetSlot === 'number') {
          const newH = [...currentCard.h] as [
            typeof currentCard.h[0],
            typeof currentCard.h[1],
            typeof currentCard.h[2]
          ];
          newH[targetSlot] = newSlotData;
          handleUpdateCard({ h: newH });
        } else if (targetSlot === 'cover') {
          handleUpdateCard({ pc: res.dataUrl });
        }

        setSelectedSlot(targetSlot);
        showToast(`¡Imagen pegada desde el portapapeles a ${NAMES[String(targetSlot)]}!`);
      } catch {
        showToast('No se pudo procesar la imagen pegada.');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedSlot, currentCard, handleUpdateCard, showToast]);

  // Card Management Actions
  const handleAddCard = useCallback(() => {
    const newCard = createBlankCard();
    setCards((prev) => [...prev, newCard]);
    setCurrentCardId(newCard.id);
    setSelectedSlot(null);
    showToast('Nueva ficha creada ✿');
  }, [showToast]);

  const handleDuplicateCard = useCallback(
    (cardToDup: CardData) => {
      const copy: CardData = {
        ...JSON.parse(JSON.stringify(cardToDup)),
        id: Math.random().toString(36).slice(2, 9),
        name: `${cardToDup.name || 'Ficha'} (copia)`,
        ts: Date.now(),
      };
      setCards((prev) => {
        const idx = prev.findIndex((c) => c.id === cardToDup.id);
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return next;
      });
      setCurrentCardId(copy.id);
      showToast('Ficha duplicada.');
    },
    [showToast]
  );

  const handleDeleteCard = useCallback(
    (cardToDelete: CardData) => {
      const idx = cards.findIndex((c) => c.id === cardToDelete.id);
      const isCurrent = currentCardId === cardToDelete.id;

      const remaining = cards.filter((c) => c.id !== cardToDelete.id);
      const nextCards = remaining.length > 0 ? remaining : [createBlankCard()];
      setCards(nextCards);

      if (isCurrent) {
        const nextActive = nextCards[Math.min(idx, nextCards.length - 1)];
        setCurrentCardId(nextActive.id);
      }

      showToast(
        'Ficha eliminada.',
        'Deshacer',
        () => {
          setCards((prev) => {
            const restored = [...prev];
            restored.splice(Math.min(idx, restored.length), 0, cardToDelete);
            return restored;
          });
          setCurrentCardId(cardToDelete.id);
          showToast('Ficha restaurada.');
        },
        7000
      );
    },
    [cards, currentCardId, showToast]
  );

  const handleToggleFavorite = useCallback(
    (card: CardData) => {
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, fav: !c.fav } : c))
      );
    },
    []
  );

  // Backup and Restore Actions
  const handleBackup = useCallback(() => {
    const data = {
      cards,
      cur: currentCardId,
      lastBackup: Date.now(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    downloadBlobAsFile(blob, 'mis-fichas-scrapbook.json');
    setLastBackup(Date.now());
    showToast('Copia de respaldo JSON descargada ✿');
  }, [cards, currentCardId, showToast]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.cards)) {
          const imported = parsed.cards.map((c: Partial<CardData>) => ({
            ...createBlankCard(),
            ...c,
            id: Math.random().toString(36).slice(2, 9),
            tags: Array.isArray(c.tags) ? c.tags : [],
          }));
          setCards((prev) => [...prev, ...imported]);
          if (imported.length > 0) {
            setCurrentCardId(imported[0].id);
          }
          showToast(`¡Se importaron ${imported.length} fichas con éxito!`);
        } else {
          showToast('El archivo no contiene un formato de fichas válido.');
        }
      } catch {
        showToast('Error al leer el archivo JSON de respaldo.');
      }
    };

    input.click();
  }, [showToast]);

  // Export PNG Action
  const handleExportPng = useCallback(async () => {
    setIsExporting(true);
    showToast('Preparando tu imagen a máxima resolución…', undefined, undefined, 2000);

    try {
      const result = await exportCardAsPng(currentCard, activePalette);
      setExportModal({
        isOpen: true,
        pngDataUrl: result.dataUrl,
        filename: result.filename,
        blob: result.blob,
      });
      showToast('¡Listo! Tu ficha se ha descargado en PNG ✿');
    } catch {
      showToast('No se pudo generar la imagen para exportar.');
    } finally {
      setIsExporting(false);
    }
  }, [currentCard, activePalette, showToast]);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-purple-200 selection:text-purple-900">
      {/* Top Header */}
      <header className="text-center pt-7 pb-2 px-4 relative">
        <div className="flex items-center justify-center relative max-w-4xl mx-auto">
          <h1 className="washi-title m-0 tracking-wide text-[#4a3b5c] dark:text-[#f0e8fa]">
            Mi álbum de fichas ✿
          </h1>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--paper2)] flex items-center justify-center text-sm cursor-pointer shadow-xs hover:border-[var(--tx)] transition-all"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <p className="mt-2.5 text-base opacity-75">
          Crea, ordena y exporta tus fichas de fandoms y ships
        </p>

        {/* Mobile Navigation Segmented Tabs (Visible on mobile screens) */}
        <div className="lg:hidden flex items-center justify-center mt-3">
          <div className="inline-flex bg-[var(--paper2)] p-1 rounded-full border border-[var(--line)] shadow-xs">
            <button
              type="button"
              onClick={() => setMobileTab('canvas')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                mobileTab === 'canvas'
                  ? 'bg-[#b08fd8] text-white shadow-xs'
                  : 'text-[var(--tx)] opacity-70 hover:opacity-100'
              }`}
            >
              <span>🎴 Ficha actual</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('album')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                mobileTab === 'album'
                  ? 'bg-[#b08fd8] text-white shadow-xs'
                  : 'text-[var(--tx)] opacity-70 hover:opacity-100'
              }`}
            >
              <span>📂 Mis Fichas ({cards.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="w-full max-w-7xl mx-auto px-4 py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-7 items-start flex-1">
        {/* Left Sidebar (Always visible on desktop, tab-controlled on mobile) */}
        <div className={mobileTab === 'album' ? 'block' : 'hidden lg:block'}>
          <CardSidebar
            cards={cards}
            currentCardId={currentCardId}
            onSelectCard={(id) => {
              setCurrentCardId(id);
              setSelectedSlot(null);
              setMobileTab('canvas');
            }}
            onAddCard={() => {
              handleAddCard();
              setMobileTab('canvas');
            }}
            onDuplicateCard={(cardToDup) => {
              handleDuplicateCard(cardToDup);
              setMobileTab('canvas');
            }}
            onDeleteCard={handleDeleteCard}
            onToggleFavorite={handleToggleFavorite}
            onReorderCards={(newCards) => setCards(newCards)}
            onBackup={handleBackup}
            onImport={handleImport}
            lastBackup={lastBackup}
          />
        </div>

        {/* Right Main Canvas & Tools (Always visible on desktop, tab-controlled on mobile) */}
        <main className={`w-full min-w-0 ${mobileTab === 'canvas' ? 'block' : 'hidden lg:block'}`}>
          {/* Interactive Card Board */}
          <BoardCanvas
            card={currentCard}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onUpdateCard={handleUpdateCard}
            onUploadSlot={handleUploadSlot}
            frameDataUrl={frameDataUrl}
            bgCanvas={colorEngine?.bgCanvas || null}
            onToast={showToast}
          />

          {/* Customization & Adjustment Tools */}
          <ToolsPanel
            card={currentCard}
            palette={activePalette}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onUpdateCard={handleUpdateCard}
            onUploadSlot={handleUploadSlot}
            onUpdatePalette={handleUpdatePalette}
            onExportPng={handleExportPng}
            isExporting={isExporting}
            onToast={showToast}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm opacity-70 py-6 pb-24">
        Hecho con ♥ para la comunidad de fichas y ships
      </footer>

      {/* Floating Action Button (FAB) for Instant PNG Download */}
      <button
        type="button"
        onClick={handleExportPng}
        disabled={isExporting}
        aria-label="Descargar PNG"
        className="fixed right-6 bottom-6 z-40 py-2.5 px-5 rounded-full bg-[#b08fd8] text-white border-2 border-[#8c63c4] hover:bg-[#9d7bc5] active:scale-95 shadow-xl font-medium flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
      >
        <span>⬇ PNG</span>
      </button>

      {/* Toast Notification with Undo */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-20 -translate-x-1/2 z-50 bg-[#4a3b5c] text-white py-2 px-5 rounded-full shadow-2xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span>{toast.message}</span>
          {toast.actionText && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="text-[#ffd1e3] underline hover:text-white cursor-pointer font-medium ml-1"
            >
              {toast.actionText}
            </button>
          )}
        </div>
      )}

      {/* High-Resolution Export Modal Preview */}
      <ExportModal
        isOpen={exportModal.isOpen}
        onClose={() => setExportModal((prev) => ({ ...prev, isOpen: false }))}
        pngDataUrl={exportModal.pngDataUrl}
        filename={exportModal.filename}
        blob={exportModal.blob}
        onToast={showToast}
      />
    </div>
  );
}
