import React, { useState } from 'react';
import { CardData, Palette, SlotKey } from '../types/album';
import {
  NAMES,
  ROLES,
  DEF_PALETTE,
  PRESETS,
  FONTS,
  STICKY_COLORS,
} from '../utils/constants';
import { hexOf } from '../utils/colorEngine';
import { createStickyNote } from '../utils/stickyUtils';
import {
  PAPER_PATTERNS,
  PaperPatternId,
  getPatternPreviewStyle,
} from '../utils/patternUtils';

interface ToolsPanelProps {
  card: CardData;
  palette: Palette;
  selectedSlot: SlotKey | null;
  onSelectSlot: (slot: SlotKey | null) => void;
  onUpdateCard: (updated: Partial<CardData>) => void;
  onUploadSlot: (slot: SlotKey) => void;
  onUpdatePalette: (newPalette: Palette | null) => void;
  onExportPng: () => void;
  isExporting: boolean;
  onToast: (msg: string) => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  card,
  palette,
  selectedSlot,
  onSelectSlot,
  onUpdateCard,
  onUploadSlot,
  onUpdatePalette,
  onExportPng,
  isExporting,
  onToast,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [selectedStickyColor, setSelectedStickyColor] = useState<string>(
    STICKY_COLORS[0].bg
  );

  const handleAddStickyNote = (colorOverride?: string) => {
    const existing = card.notes || [];
    if (existing.length >= 12) {
      onToast('Máximo 12 notas adhesivas por ficha.');
      return;
    }
    const newNote = createStickyNote('', colorOverride || selectedStickyColor);
    onUpdateCard({ notes: [...existing, newNote] });
    onToast('¡Nota adhesiva añadida! Puedes arrastrarla y escribir.');
  };

  const handleRemoveStickyNote = (id: string) => {
    const updated = (card.notes || []).filter((n) => n.id !== id);
    onUpdateCard({ notes: updated });
    onToast('Nota eliminada.');
  };

  const handleClearAllNotes = () => {
    if (!card.notes || card.notes.length === 0) return;
    onUpdateCard({ notes: [] });
    onToast('Todas las notas han sido retiradas.');
  };

  // Selected slot helper
  const getSlot = (k: SlotKey | null) => {
    if (k === 'a') return card.av;
    if (k === 0 || k === 1 || k === 2) return card.h[k];
    return null;
  };

  const activeSlotData = getSlot(selectedSlot);
  const hasActiveImage = !!activeSlotData?.s;

  // Zoom handler
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    if (selectedSlot === 'a') {
      onUpdateCard({ av: { ...card.av, z: val } });
    } else if (typeof selectedSlot === 'number') {
      const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
      newH[selectedSlot] = { ...newH[selectedSlot], z: val };
      onUpdateCard({ h: newH });
    }
  };

  const handleCenterImage = () => {
    if (!selectedSlot) return;
    if (selectedSlot === 'a') {
      onUpdateCard({ av: { ...card.av, x: 0, y: 0, z: 1 } });
    } else if (typeof selectedSlot === 'number') {
      const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
      newH[selectedSlot] = { ...newH[selectedSlot], x: 0, y: 0, z: 1 };
      onUpdateCard({ h: newH });
    }
    onToast('Imagen centrada.');
  };

  const handleRemoveImage = () => {
    if (!selectedSlot) return;
    if (selectedSlot === 'a') {
      onUpdateCard({
        av: { s: '', w: 0, h: 0, x: 0, y: 0, z: 1 },
      });
    } else if (typeof selectedSlot === 'number') {
      const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
      newH[selectedSlot] = { s: '', w: 0, h: 0, x: 0, y: 0, z: 1 };
      onUpdateCard({ h: newH });
    } else if (selectedSlot === 'cover') {
      onUpdateCard({ pc: '' });
    }
    onSelectSlot(null);
    onToast('Imagen eliminada.');
  };

  // Tag helpers
  const handleAddTag = (rawTag: string) => {
    const clean = rawTag
      .trim()
      .replace(/^#/, '')
      .replace(/\s+/g, ' ')
      .slice(0, 24);
    if (!clean) return;
    if (card.tags.length >= 8) {
      onToast('Máximo 8 etiquetas por ficha.');
      return;
    }
    if (card.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      onToast('Esa etiqueta ya existe en esta ficha.');
      return;
    }
    onUpdateCard({ tags: [...card.tags, clean] });
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    const newTags = card.tags.filter((_, i) => i !== index);
    onUpdateCard({ tags: newTags });
  };

  // Color palette helpers
  const handleRoleColorChange = (roleKey: keyof Palette, colorHex: string) => {
    const newPal: Palette = {
      ...palette,
      [roleKey]: colorHex,
    };
    onUpdatePalette(newPal);
  };

  const handleSurprisePalette = () => {
    const baseHue = Math.random() * 360;
    const surprise: Palette = {
      prin: hexOf(baseHue, 0.55, 0.86),
      ink: hexOf(baseHue, 0.32, 0.34),
      card: hexOf((baseHue + 15) % 360, 0.7, 0.965),
      field: hexOf(baseHue, 0.45, 0.87),
      acc: hexOf((baseHue + 165 + Math.random() * 30) % 360, 0.7, 0.82),
    };
    onUpdatePalette(surprise);
    onToast('¡Paleta aleatoria creada! 🎲');
  };

  const suggestedTags = [
    'OTP',
    'Canon',
    'Fic',
    'Anime',
    'Manga',
    'Genshin',
    'Kpop',
    'OC',
    'Comisión',
    'AU',
  ].filter((t) => !card.tags.some((x) => x.toLowerCase() === t.toLowerCase()));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-[900px] mx-auto">
      {/* 1. Image Adjustments */}
      <section className="scrap-note">
        <h2 className="text-xl font-normal mb-2 flex items-center justify-between">
          <span>Ajustar imagen</span>
          {selectedSlot && (
            <span className="text-xs text-[#8c63c4] font-medium">
              {NAMES[String(selectedSlot)] || 'Seleccionada'}
            </span>
          )}
        </h2>

        <p className="text-sm opacity-75 mb-3">
          {hasActiveImage
            ? `Ajustando encuadre de: ${NAMES[String(selectedSlot)]}`
            : 'Toca una imagen en la ficha para acomodarla o sube una nueva.'}
        </p>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 my-2">
          <span className="w-14 text-sm opacity-80">Zoom</span>
          <input
            type="range"
            min="100"
            max="300"
            value={activeSlotData ? Math.round((activeSlotData.z || 1) * 100) : 100}
            onChange={handleZoomChange}
            disabled={!hasActiveImage}
            aria-label="Zoom de la imagen"
            className="flex-1 cursor-pointer accent-[#b08fd8] disabled:opacity-40"
          />
          <span className="text-xs font-mono w-10 text-right opacity-70">
            {activeSlotData ? `${Math.round((activeSlotData.z || 1) * 100)}%` : '100%'}
          </span>
        </div>

        {/* Adjustment buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => onUploadSlot(selectedSlot ?? 'a')}
            className="px-3 py-1.5 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-sm cursor-pointer transition-colors"
          >
            {hasActiveImage ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          <button
            type="button"
            onClick={handleCenterImage}
            disabled={!hasActiveImage}
            className="px-3 py-1.5 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-sm cursor-pointer transition-colors disabled:opacity-40"
          >
            Centrar
          </button>
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={!hasActiveImage}
            className="px-3 py-1.5 rounded-full border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm cursor-pointer transition-colors disabled:opacity-40"
          >
            Quitar
          </button>
        </div>

        <p className="text-xs opacity-65 mt-2.5">
          Tip: Arrastra la imagen dentro del marco. Con el ratón también puedes usar la rueda para zoom o pegar capturas con Ctrl+V.
        </p>
      </section>

      {/* 2. Tags Section */}
      <section className="scrap-note alt-tape">
        <h2 className="text-xl font-normal mb-2">Etiquetas y Categorías</h2>

        {/* Active tags */}
        <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center mb-2">
          {card.tags.length === 0 ? (
            <span className="text-xs opacity-60">Sin etiquetas todavía</span>
          ) : (
            card.tags.map((tag, i) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-xs text-[#5b3f86]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(i)}
                  className="hover:text-red-600 cursor-pointer text-sm leading-none ml-0.5"
                  aria-label={`Eliminar etiqueta ${tag}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* Tag Input */}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              handleAddTag(tagInput);
            }
          }}
          placeholder="Escribe una etiqueta y pulsa Enter"
          maxLength={24}
          aria-label="Añadir etiqueta"
          className="w-full px-3 py-1.5 border-2 border-dashed border-[var(--line)] rounded-xl bg-transparent outline-none text-sm"
        />

        {/* Suggested Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestedTags.slice(0, 6).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddTag(tag)}
              className="px-2 py-0.5 rounded-full border border-dashed border-[var(--line)] text-xs opacity-80 hover:opacity-100 hover:border-[#8c63c4] cursor-pointer transition-colors"
            >
              ＋ #{tag}
            </button>
          ))}
        </div>

        {/* Favorite Checkbox */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm select-none">
          <input
            type="checkbox"
            checked={card.fav}
            onChange={(e) => onUpdateCard({ fav: e.target.checked })}
            className="accent-[#b08fd8] cursor-pointer"
          />
          <span>⭐ Marcar esta ficha como favorita</span>
        </label>
      </section>

      {/* 3. Colors Section (Wide) */}
      <section className="scrap-note md:col-span-2">
        <h2 className="text-xl font-normal mb-2 flex items-center justify-between">
          <span>Colores de la ficha</span>
          <span className="text-xs opacity-70">
            Recolorea el marco, paneles y textos
          </span>
        </h2>

        {/* Presets buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(PRESETS).map(([name, colors]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onUpdatePalette({
                  prin: colors[0],
                  ink: colors[1],
                  card: colors[2],
                  field: colors[3],
                  acc: colors[4],
                });
                onToast(`Paleta aplicada: ${name}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-xs cursor-pointer transition-colors"
            >
              <span className="flex rounded-full overflow-hidden w-4 h-4 border border-black/10">
                <b className="w-1/3 h-full" style={{ background: colors[0] }} />
                <b className="w-1/3 h-full" style={{ background: colors[1] }} />
                <b className="w-1/3 h-full" style={{ background: colors[4] }} />
              </span>
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Role Color Pickers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-3">
          {ROLES.map(([k, label, desc]) => (
            <label
              key={k}
              className="flex items-center gap-2.5 p-2 rounded-xl border border-[var(--line)] bg-white/50 cursor-pointer transition-all hover:bg-white"
            >
              <input
                type="color"
                value={palette[k] || DEF_PALETTE[k]}
                onChange={(e) => handleRoleColorChange(k, e.target.value)}
                aria-label={label}
                className="w-9 h-9 rounded-lg border border-[var(--line)] bg-none p-0.5 cursor-pointer flex-none"
              />
              <div className="min-w-0">
                <span className="block text-sm font-medium leading-tight truncate">
                  {label}
                </span>
                <span className="block text-[11px] opacity-60 leading-tight truncate">
                  {desc}
                </span>
              </div>
            </label>
          ))}
        </div>

        {/* Surprise & Reset Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleSurprisePalette}
            className="px-4 py-1.5 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[#8c63c4] hover:text-[#5b3f86] text-sm cursor-pointer transition-colors font-medium"
          >
            🎲 Sorpréndeme
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdatePalette(null);
              onToast('Colores restablecidos al tono Lavanda original.');
            }}
            className="px-4 py-1.5 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-sm cursor-pointer transition-colors"
          >
            Restablecer a original
          </button>
        </div>
      </section>

      {/* 4. Typography Section */}
      <section className="scrap-note">
        <h2 className="text-xl font-normal mb-2 flex items-center justify-between">
          <span>Tipografía de la ficha</span>
          <span className="text-xs text-[#8c63c4] font-medium">
            {card.fontFamily || card.font || 'Patrick Hand'}
          </span>
        </h2>
        <p className="text-xs opacity-75 mb-3">
          Elige el estilo de letra manuscrita para todos los campos de texto de la ficha.
        </p>

        {/* Font selection dropdown */}
        <div className="mb-3.5">
          <label
            htmlFor="font-family-dropdown"
            className="block text-xs font-medium mb-1.5 opacity-80"
          >
            Menú desplegable de tipografías:
          </label>
          <select
            id="font-family-dropdown"
            value={card.fontFamily || card.font || 'Patrick Hand'}
            onChange={(e) => {
              const selectedFont = e.target.value;
              onUpdateCard({ fontFamily: selectedFont, font: selectedFont });
              onToast(`Tipografía cambiada a: ${selectedFont} ✿`);
            }}
            aria-label="Seleccionar tipografía de la ficha"
            className="w-full px-3 py-2 rounded-xl border-2 border-[var(--line)] bg-[var(--paper)] text-base outline-none cursor-pointer transition-colors focus:border-[#8c63c4]"
            style={{
              fontFamily: `'${card.fontFamily || card.font || 'Patrick Hand'}', cursive, system-ui, sans-serif`,
            }}
          >
            {FONTS.map((fontName) => (
              <option
                key={fontName}
                value={fontName}
                style={{ fontFamily: `'${fontName}', cursive` }}
              >
                {fontName} {fontName === 'Patrick Hand' ? '(Original)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Grid of font buttons with live visual preview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FONTS.map((fontName) => {
            const currentFont = card.fontFamily || card.font || 'Patrick Hand';
            const isSelected = currentFont === fontName;
            return (
              <button
                key={fontName}
                type="button"
                onClick={() => {
                  onUpdateCard({ fontFamily: fontName, font: fontName });
                  onToast(`Fuente cambiada a: ${fontName}`);
                }}
                className={`p-2 rounded-xl border-2 cursor-pointer text-center leading-tight transition-all ${
                  isSelected
                    ? 'border-[#8c63c4] bg-[#f0e6fb] text-[#4a3b5c] shadow-sm font-medium'
                    : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)]'
                }`}
              >
                <span
                  className="block text-lg"
                  style={{ fontFamily: `'${fontName}', cursive` }}
                >
                  Luna ✿ 19
                </span>
                <small className="block font-sans text-[10px] opacity-65 truncate mt-0.5">
                  {fontName}
                  {fontName === 'Patrick Hand' ? ' (original)' : ''}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Paper Background Pattern Section */}
      <section className="scrap-note">
        <h2 className="text-xl font-normal mb-1 flex items-center justify-between">
          <span>Patrón de papel</span>
          <span className="text-xs text-[#8c63c4] font-medium">
            {PAPER_PATTERNS.find((p) => p.id === (card.paperPattern || 'none'))?.name || 'Papel liso'}
          </span>
        </h2>
        <p className="text-xs opacity-75 mb-3">
          Elige una textura sutil para el fondo de esta ficha (punteado bullet journal, líneas de libreta o cuadrícula escolar).
        </p>

        {/* Pattern Selection Dropdown */}
        <div className="mb-3">
          <label
            htmlFor="paper-pattern-dropdown"
            className="block text-xs font-medium mb-1.5 opacity-80"
          >
            Menú desplegable de patrones:
          </label>
          <select
            id="paper-pattern-dropdown"
            value={card.paperPattern || 'none'}
            onChange={(e) => {
              const selectedPattern = e.target.value as PaperPatternId;
              onUpdateCard({ paperPattern: selectedPattern });
              const found = PAPER_PATTERNS.find((p) => p.id === selectedPattern);
              onToast(`Patrón de papel: ${found?.name || selectedPattern}`);
            }}
            aria-label="Seleccionar patrón de papel de fondo"
            className="w-full px-3 py-2 rounded-xl border-2 border-[var(--line)] bg-[var(--paper)] text-sm outline-none cursor-pointer transition-colors focus:border-[#8c63c4]"
          >
            {PAPER_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Swatch grid with live visual previews */}
        <div className="grid grid-cols-2 gap-2">
          {PAPER_PATTERNS.map((p) => {
            const isSelected = (card.paperPattern || 'none') === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onUpdateCard({ paperPattern: p.id });
                  onToast(`Patrón aplicado: ${p.name}`);
                }}
                className={`p-2 rounded-xl border-2 cursor-pointer flex items-center gap-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-[#8c63c4] bg-[#f0e6fb] text-[#4a3b5c] shadow-sm font-medium'
                    : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)]'
                }`}
              >
                {/* Visual texture swatch */}
                <span
                  className="w-8 h-8 rounded-lg border border-black/15 flex-none shadow-inner"
                  style={{
                    backgroundColor: '#fbf7ee',
                    ...getPatternPreviewStyle(p.id, palette.ink),
                  }}
                />
                <div className="min-w-0">
                  <span className="block text-xs font-medium leading-tight truncate">
                    {p.name}
                  </span>
                  <small className="block text-[10px] opacity-60 leading-tight truncate">
                    {p.desc}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Sticky Notes Section (Scrapbook Post-its) */}
      <section className="scrap-note alt-tape flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-normal flex items-center gap-1.5">
              <span>📌 Notas adhesivas</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-[#5b3f86] font-medium font-sans">
                {card.notes?.length || 0}
              </span>
            </h2>
            {card.notes && card.notes.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllNotes}
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer underline"
              >
                Limpiar todas
              </button>
            )}
          </div>

          <p className="text-xs opacity-75 mb-3">
            Escribe textos breves, dedicatorias o comentarios. Tienen rotación aleatoria y cinta washi tape para un acabado de scrapbook auténtico.
          </p>

          {/* Color Picker for new note */}
          <div className="mb-3">
            <span className="block text-xs font-medium mb-1.5 opacity-80">
              Color del papel:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STICKY_COLORS.map((c) => {
                const isSelected = selectedStickyColor === c.bg;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedStickyColor(c.bg);
                      handleAddStickyNote(c.bg);
                    }}
                    title={`Añadir nota color ${c.name}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'border-gray-500 shadow-sm font-medium scale-105'
                        : 'border-black/10 hover:border-black/30'
                    }`}
                    style={{ backgroundColor: c.bg, color: '#3b2c4d' }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: c.border }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => handleAddStickyNote()}
            className="w-full py-2 px-3 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[#8c63c4] hover:text-[#5b3f86] text-sm font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <span>＋ Añadir nota adhesiva a la ficha</span>
          </button>
        </div>

        {/* Existing notes list */}
        {card.notes && card.notes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--line)]">
            <span className="block text-xs opacity-60 mb-1.5 font-medium">
              Notas en esta ficha:
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {card.notes.map((note, idx) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-black/5 text-xs"
                  style={{ backgroundColor: note.color }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono opacity-50 flex-none">
                      #{idx + 1}
                    </span>
                    <span
                      className="truncate text-[#34234c]"
                      style={{ fontFamily: `'${card.fontFamily || 'Patrick Hand'}', cursive` }}
                    >
                      {note.text ? note.text : '(Nota vacía)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    <span className="text-[10px] opacity-60 font-mono">
                      {note.rotation > 0 ? `+${note.rotation}°` : `${note.rotation}°`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStickyNote(note.id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer font-bold px-1 text-sm leading-none"
                      aria-label="Eliminar nota"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 7. Export Section */}
      <section className="scrap-note md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-md">
          <h2 className="text-xl font-normal mb-1">Exportar Ficha</h2>
          <p className="text-xs opacity-75">
            Genera una imagen PNG nítida a resolución completa (1312 x 1199 píxeles) incluyendo tus fotos, textos, música, patrones de papel y notas adhesivas con sus rotaciones y texturas.
          </p>
        </div>

        <div className="flex-none">
          <button
            type="button"
            onClick={onExportPng}
            disabled={isExporting}
            className="py-2.5 px-6 rounded-full font-medium text-white bg-[#b08fd8] border-2 border-[#8c63c4] hover:bg-[#9d7bc5] active:scale-98 transition-all cursor-pointer shadow-md text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generando imagen de alta resolución…</span>
              </>
            ) : (
              <>
                <span>⬇ Descargar PNG de alta resolución</span>
              </>
            )}
          </button>
          <p className="text-[11px] opacity-65 mt-1.5 text-center md:text-right">
            Privacidad total: procesado localmente en tu navegador.
          </p>
        </div>
      </section>
    </div>
  );
};
