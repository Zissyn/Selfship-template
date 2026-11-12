import React, { useState } from 'react';
import { CardData } from '../types/album';
import { OC } from '../utils/constants';

interface CardSidebarProps {
  cards: CardData[];
  currentCardId: string;
  onSelectCard: (id: string) => void;
  onAddCard: () => void;
  onDuplicateCard: (card: CardData) => void;
  onDeleteCard: (card: CardData) => void;
  onToggleFavorite: (card: CardData) => void;
  onReorderCards: (newCards: CardData[]) => void;
  onBackup: () => void;
  onImport: () => void;
  lastBackup: number | null;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({
  cards,
  currentCardId,
  onSelectCard,
  onAddCard,
  onDuplicateCard,
  onDeleteCard,
  onToggleFavorite,
  onReorderCards,
  onBackup,
  onImport,
  lastBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFav, setFilterFav] = useState(false);
  const [filterCategories, setFilterCategories] = useState<number[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'manual' | 'recent' | 'az'>('manual');
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  // Collect all unique tags across cards
  const allTags = Array.from(
    new Set(cards.flatMap((c) => c.tags.map((t) => t.toLowerCase())))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  // Filter cards
  const isFiltering =
    searchQuery.trim().length > 0 ||
    filterFav ||
    filterCategories.length > 0 ||
    filterTags.length > 0;

  const filteredCards = cards.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (c.name || '').toLowerCase().includes(q) ||
        (c.fand || '').toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterFav && !c.fav) return false;
    if (filterTags.length > 0) {
      const hasAllTags = filterTags.every((t) =>
        c.tags.some((ct) => ct.toLowerCase() === t.toLowerCase())
      );
      if (!hasAllTags) return false;
    }
    if (filterCategories.length > 0) {
      const matchesCat = filterCategories.some((catIdx) =>
        c.h.some((slot, i) => slot.s && c.o[i] === catIdx)
      );
      if (!matchesCat) return false;
    }
    return true;
  });

  // Sort cards
  const displayCards = [...filteredCards];
  if (sortOrder === 'recent') {
    displayCards.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  } else if (sortOrder === 'az') {
    displayCards.sort((a, b) =>
      (a.name || 'Sin nombre').localeCompare(b.name || 'Sin nombre', 'es')
    );
  }

  // Backup info text
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup) / (1000 * 60 * 60 * 24))
    : null;
  const backupText =
    lastBackup == null || daysSinceBackup == null
      ? 'Aún no has guardado una copia en JSON.'
      : daysSinceBackup === 0
      ? 'Última copia: hoy.'
      : `Última copia: hace ${daysSinceBackup} día${daysSinceBackup > 1 ? 's' : ''}.`;

  // Reorder handlers
  const handleDragStart = (idx: number) => {
    if (sortOrder !== 'manual' || isFiltering) return;
    setDraggedCardIndex(idx);
  };

  const handleDragOverItem = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedCardIndex === null || draggedCardIndex === targetIdx) return;
    const newItems = [...cards];
    const [moved] = newItems.splice(draggedCardIndex, 1);
    newItems.splice(targetIdx, 0, moved);
    setDraggedCardIndex(targetIdx);
    onReorderCards(newItems);
  };

  const moveCard = (card: CardData, direction: 'up' | 'down') => {
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;
    const newItems = [...cards];
    const [item] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, item);
    onReorderCards(newItems);
  };

  return (
    <aside className="scrap-note" id="sidebar">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
        <h2 className="text-2xl font-normal m-0 flex items-center gap-2">
          <span>Mis fichas</span>
          <span className="text-sm opacity-70">
            {displayCards.length === cards.length
              ? `(${cards.length})`
              : `(${displayCards.length} de ${cards.length})`}
          </span>
        </h2>
      </div>

      {/* Search Input */}
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar nombre, etiqueta o fandom…"
        aria-label="Buscar fichas"
        className="w-full mt-3 px-3 py-1.5 border-2 border-dashed border-[var(--line)] rounded-xl bg-transparent outline-none text-base"
      />

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {/* Favorite filter */}
        <button
          type="button"
          onClick={() => setFilterFav(!filterFav)}
          className={`px-2.5 py-0.5 rounded-full border-2 border-[var(--line)] text-sm cursor-pointer transition-colors ${
            filterFav ? 'bg-[#b08fd8] text-white border-[#8c63c4]' : 'bg-[var(--paper)]'
          }`}
        >
          ⭐ Favoritas
        </button>

        {/* Categories filter */}
        {OC.map((cat, idx) => {
          const active = filterCategories.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setFilterCategories(
                  active
                    ? filterCategories.filter((x) => x !== idx)
                    : [...filterCategories, idx]
                );
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border-2 border-[var(--line)] text-sm cursor-pointer transition-colors ${
                active ? 'bg-[#b08fd8] text-white border-[#8c63c4]' : 'bg-[var(--paper)]'
              }`}
            >
              <i
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: cat.d }}
              />
              {cat.n}
            </button>
          );
        })}

        {/* Tag filters */}
        {allTags.slice(0, 5).map((tag) => {
          const active = filterTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setFilterTags(
                  active ? filterTags.filter((x) => x !== tag) : [...filterTags, tag]
                );
              }}
              className={`px-2 py-0.5 rounded-full border-2 border-[var(--line)] text-sm cursor-pointer transition-colors ${
                active ? 'bg-[#b08fd8] text-white border-[#8c63c4]' : 'bg-[var(--paper)]'
              }`}
            >
              #{tag}
            </button>
          );
        })}

        {/* Clear Filters */}
        {isFiltering && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterFav(false);
              setFilterCategories([]);
              setFilterTags([]);
            }}
            className="px-2 py-0.5 rounded-full border border-[var(--line)] text-xs text-red-600 bg-white cursor-pointer"
          >
            ✕ Quitar filtros
          </button>
        )}
      </div>

      {/* Sorting selector */}
      <select
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value as 'manual' | 'recent' | 'az')}
        aria-label="Ordenar fichas"
        className="w-full mt-2.5 px-2.5 py-1 text-sm border-2 border-dashed border-[var(--line)] rounded-xl bg-transparent outline-none cursor-pointer"
      >
        <option value="manual">Orden: manual (arrastra ⋮⋮)</option>
        <option value="recent">Orden: más recientes</option>
        <option value="az">Orden: A–Z</option>
      </select>

      {/* Cards List */}
      <ul className="list-none p-0 my-3 flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
        {displayCards.length === 0 ? (
          <li className="text-center py-6 text-sm opacity-60">
            No se encontraron fichas con esos criterios.
          </li>
        ) : (
          displayCards.map((cardItem, idx) => {
            const isCurrent = cardItem.id === currentCardId;
            const canReorder = sortOrder === 'manual' && !isFiltering;

            return (
              <li
                key={cardItem.id}
                draggable={canReorder}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOverItem(e, idx)}
                onDragEnd={() => setDraggedCardIndex(null)}
                onClick={() => onSelectCard(cardItem.id)}
                className={`flex items-center gap-2 p-2 rounded-lg bg-white shadow-sm border-2 cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-[#8c63c4] shadow-md -rotate-0.5 bg-purple-50/50'
                    : 'border-transparent hover:border-purple-200'
                }`}
              >
                {/* Drag handle or position control */}
                {canReorder ? (
                  <span
                    className="text-gray-400 cursor-grab hover:text-gray-600 select-none px-1"
                    title="Arrastra para reordenar"
                  >
                    ⋮⋮
                  </span>
                ) : (
                  <div className="flex flex-col gap-0.5 opacity-60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCard(cardItem, 'up');
                      }}
                      disabled={idx === 0}
                      className="text-[10px] leading-none hover:text-purple-600 disabled:opacity-20 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCard(cardItem, 'down');
                      }}
                      disabled={idx === displayCards.length - 1}
                      className="text-[10px] leading-none hover:text-purple-600 disabled:opacity-20 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                )}

                {/* Avatar thumbnail */}
                <div
                  className="w-10 h-10 rounded-full flex-none bg-[#e9ddf8] bg-center bg-cover border border-purple-200 flex items-center justify-center text-sm shadow-inner"
                  style={{
                    backgroundImage: cardItem.av?.s ? `url(${cardItem.av.s})` : undefined,
                  }}
                >
                  {!cardItem.av?.s && '🐾'}
                </div>

                {/* Card Title and Tags */}
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-semibold truncate text-[#4a3b5c]">
                    {cardItem.name || 'Sin nombre'}
                  </b>
                  <span className="block text-xs text-[#8a77a8] truncate">
                    {cardItem.tags.length > 0
                      ? cardItem.tags.map((t) => `#${t}`).join(' ')
                      : cardItem.fand || 'Sin fandom'}
                  </span>
                </div>

                {/* Action mini buttons */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Favorite star */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(cardItem)}
                    title={cardItem.fav ? 'Quitar favorita' : 'Marcar favorita'}
                    className={`px-1.5 py-0.5 rounded text-sm cursor-pointer transition-colors ${
                      cardItem.fav
                        ? 'bg-[#ffe9a8] text-[#b17a00]'
                        : 'bg-[#f0e6fb] text-[#5b3f86] hover:bg-purple-200'
                    }`}
                  >
                    {cardItem.fav ? '★' : '☆'}
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => onDuplicateCard(cardItem)}
                    title="Duplicar ficha"
                    className="px-1.5 py-0.5 rounded text-sm bg-[#f0e6fb] text-[#5b3f86] hover:bg-purple-200 cursor-pointer"
                  >
                    ⧉
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteCard(cardItem)}
                    title="Eliminar ficha"
                    className="px-1.5 py-0.5 rounded text-sm bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Add New Card Button */}
      <button
        type="button"
        onClick={onAddCard}
        className="w-full py-2 px-4 rounded-full font-medium text-white bg-[#b08fd8] border-2 border-[#8c63c4] hover:bg-[#9d7bc5] active:scale-98 transition-all cursor-pointer shadow-sm text-base mb-3 flex items-center justify-center gap-1.5"
      >
        <span>＋ Nueva ficha</span>
      </button>

      {/* Backup and Restore Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBackup}
          title="Descargar archivo JSON con todas tus fichas"
          className="flex-1 py-1.5 px-2 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-sm cursor-pointer transition-colors text-center"
        >
          Guardar copia
        </button>
        <button
          type="button"
          onClick={onImport}
          title="Cargar fichas desde un archivo JSON"
          className="flex-1 py-1.5 px-2 rounded-full border-2 border-[var(--line)] bg-[var(--paper)] hover:border-[var(--tx)] text-sm cursor-pointer transition-colors text-center"
        >
          Cargar copia
        </button>
      </div>

      <p className="text-xs opacity-70 mt-2 text-center">{backupText}</p>

      {/* Usage Guide Accordion */}
      <details className="mt-3 text-xs opacity-80 pt-2 border-t border-[var(--line)]">
        <summary className="cursor-pointer font-medium hover:opacity-100">
          ¿Cómo se usa el álbum? ✿
        </summary>
        <ol className="pl-4 mt-1.5 list-decimal space-y-1">
          <li>Toca la foto o un corazón para subir tu imagen o arrástrala encima.</li>
          <li>Arrastra con el mouse dentro del marco para encuadrarla y usa la rueda para zoom.</li>
          <li>Elige Sharing, Selective o Non-sharing en cada corazón.</li>
          <li>Personaliza colores, fuentes y reproduce tu canción favorita.</li>
          <li>Descarga en PNG de alta resolución cuando esté lista.</li>
        </ol>
      </details>
    </aside>
  );
};
