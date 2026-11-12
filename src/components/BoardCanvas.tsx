import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CardData, SlotKey, StickyNote } from '../types/album';
import {
  W,
  H,
  heartPath,
  HO,
  HI,
  HS,
  PB,
  OC,
  FR,
  HOLE,
  SL,
  NB,
  INF,
  FB,
  FBOX,
  OPT,
} from '../utils/constants';
import { SIL } from '../assets/templateAssets';
import { MusicPlayer } from './MusicPlayer';
import { processImageFile } from '../utils/imageUtils';
import {
  createStickyNote,
  cycleStickyColor,
  getTapeColorForSticky,
} from '../utils/stickyUtils';
import { getPatternCss } from '../utils/patternUtils';

interface BoardCanvasProps {
  card: CardData;
  selectedSlot: SlotKey | null;
  onSelectSlot: (slot: SlotKey | null) => void;
  onUpdateCard: (updated: Partial<CardData>) => void;
  onUploadSlot: (slot: SlotKey) => void;
  frameDataUrl: string;
  bgCanvas: HTMLCanvasElement | null;
  onToast: (msg: string) => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  card,
  selectedSlot,
  onSelectSlot,
  onUpdateCard,
  onUploadSlot,
  frameDataUrl,
  bgCanvas,
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  // State variable for font applied to all card text elements
  const [appliedFont, setAppliedFont] = useState<string>(
    card.fontFamily || card.font || 'Patrick Hand'
  );

  useEffect(() => {
    const f = card.fontFamily || card.font || 'Patrick Hand';
    setAppliedFont(f);
  }, [card.fontFamily, card.font]);

  // Dragging state for image panning within slot
  const [dragState, setDragState] = useState<{
    slot: SlotKey;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    scale: number;
  } | null>(null);

  // Dragging state for sticky notes
  const [draggedNote, setDraggedNote] = useState<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    scale: number;
  } | null>(null);

  // Sync background canvas whenever it updates
  useEffect(() => {
    if (bgCanvas && bgCanvasRef.current) {
      const ctx = bgCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(bgCanvas, 0, 0);
      }
    }
  }, [bgCanvas]);

  // Helper to calculate image fit and transform inside box
  const getFittedRect = (
    box: [number, number, number, number],
    slotData: { w: number; h: number; x: number; y: number; z: number }
  ) => {
    const [bx, by, bw, bh] = box;
    if (!slotData.w || !slotData.h) return [bx, by, bw, bh];
    const zoom = slotData.z || 1;
    const k = Math.max(bw / slotData.w, bh / slotData.h) * zoom;
    const w = slotData.w * k;
    const h = slotData.h * k;
    const mx = (w - bw) / 2;
    const my = (h - bh) / 2;
    const ox = Math.max(-mx, Math.min(mx, slotData.x || 0));
    const oy = Math.max(-my, Math.min(my, slotData.y || 0));
    return [bx + bw / 2 - w / 2 + ox, by + bh / 2 - h / 2 + oy, w, h];
  };

  const getSlotData = useCallback((k: SlotKey) => {
    if (k === 'a') return card.av;
    if (k === 0 || k === 1 || k === 2) return card.h[k];
    return null;
  }, [card]);

  // Pointer down for dragging image inside slot
  const handleSlotPointerDown = (
    e: React.PointerEvent<SVGElement>,
    k: SlotKey
  ) => {
    const d = getSlotData(k);
    if (!d || !d.s) return;

    onSelectSlot(k);
    const rect = containerRef.current?.getBoundingClientRect();
    const scale = rect ? W / rect.width : 1;

    (e.target as SVGElement).setPointerCapture?.(e.pointerId);
    setDragState({
      slot: k,
      startX: e.clientX,
      startY: e.clientY,
      initX: d.x || 0,
      initY: d.y || 0,
      scale,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 1. Dragging sticky note
    if (draggedNote) {
      const dx = (e.clientX - draggedNote.startX) * draggedNote.scale;
      const dy = (e.clientY - draggedNote.startY) * draggedNote.scale;
      const newX = Math.max(10, Math.min(W - 220, Math.round(draggedNote.initX + dx)));
      const newY = Math.max(10, Math.min(H - 170, Math.round(draggedNote.initY + dy)));

      const updatedNotes = (card.notes || []).map((n) =>
        n.id === draggedNote.id ? { ...n, x: newX, y: newY } : n
      );
      onUpdateCard({ notes: updatedNotes });
      return;
    }

    // 2. Dragging image in slot
    if (!dragState) return;
    const { slot, startX, startY, initX, initY, scale } = dragState;
    const dx = (e.clientX - startX) * scale;
    const dy = (e.clientY - startY) * scale;

    if (slot === 'a') {
      onUpdateCard({
        av: { ...card.av, x: initX + dx, y: initY + dy },
      });
    } else if (slot === 0 || slot === 1 || slot === 2) {
      const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
      newH[slot] = { ...newH[slot], x: initX + dx, y: initY + dy };
      onUpdateCard({ h: newH });
    }
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
    }
    if (draggedNote) {
      setDraggedNote(null);
    }
  };

  // Sticky Note handlers
  const handleAddStickyNote = () => {
    const existing = card.notes || [];
    if (existing.length >= 12) {
      onToast('Máximo 12 notas adhesivas por ficha.');
      return;
    }
    const newNote = createStickyNote();
    onUpdateCard({ notes: [...existing, newNote] });
    onToast('¡Nota adhesiva añadida! Arrástrala a donde quieras.');
  };

  const handleNotePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    note: StickyNote
  ) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const scale = rect ? W / rect.width : 1;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggedNote({
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
      scale,
    });
  };

  const handleUpdateNoteText = (id: string, text: string) => {
    const updated = (card.notes || []).map((n) =>
      n.id === id ? { ...n, text } : n
    );
    onUpdateCard({ notes: updated });
  };

  const handleCycleColor = (id: string, currentColor: string) => {
    const nextColor = cycleStickyColor(currentColor);
    const updated = (card.notes || []).map((n) =>
      n.id === id ? { ...n, color: nextColor } : n
    );
    onUpdateCard({ notes: updated });
  };

  const handleRerollRotation = (id: string) => {
    const newRot = +(Math.random() * 11 - 5.5).toFixed(1);
    const updated = (card.notes || []).map((n) =>
      n.id === id ? { ...n, rotation: newRot } : n
    );
    onUpdateCard({ notes: updated });
    onToast(`Inclinación cambiada: ${newRot > 0 ? '+' : ''}${newRot}°`);
  };

  const handleDeleteNote = (id: string) => {
    const updated = (card.notes || []).filter((n) => n.id !== id);
    onUpdateCard({ notes: updated });
    onToast('Nota adhesiva eliminada.');
  };

  // Wheel zoom inside slot
  const handleSlotWheel = (e: React.WheelEvent<SVGElement>, k: SlotKey) => {
    const d = getSlotData(k);
    if (!d || !d.s) return;
    e.preventDefault();
    onSelectSlot(k);

    const delta = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newZoom = Math.max(1, Math.min(3, (d.z || 1) * delta));

    if (k === 'a') {
      onUpdateCard({ av: { ...card.av, z: newZoom } });
    } else if (k === 0 || k === 1 || k === 2) {
      const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
      newH[k] = { ...newH[k], z: newZoom };
      onUpdateCard({ h: newH });
    }
  };

  // Drag and drop image files directly onto slot
  const handleSlotDrop = async (
    e: React.DragEvent<SVGElement>,
    k: SlotKey
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
      const res = await processImageFile(file, 900);
      const newSlot = { s: res.dataUrl, w: res.width, h: res.height, x: 0, y: 0, z: 1 };
      if (k === 'a') {
        onUpdateCard({ av: newSlot });
      } else if (k === 0 || k === 1 || k === 2) {
        const newH = [...card.h] as [typeof card.h[0], typeof card.h[1], typeof card.h[2]];
        newH[k] = newSlot;
        onUpdateCard({ h: newH });
      }
      onSelectSlot(k);
      onToast('Imagen colocada con éxito.');
    } catch {
      onToast('No se pudo procesar la imagen arrastrada.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Percentage position style helper
  const pc = ([x, y, w, h]: [number, number, number, number]) => ({
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
    width: `${(w / W) * 100}%`,
    height: `${(h / H) * 100}%`,
  });

  return (
    <div className="board-container">
      <div
        ref={containerRef}
        id="board"
        className="board-card"
        style={
          {
            '--ff': `'${appliedFont}', cursive`,
            fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
            ...getPatternCss(card.paperPattern, card.pal?.ink || '#5b3f86'),
          } as React.CSSProperties
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Recolored background canvas */}
        <canvas
          ref={bgCanvasRef}
          width={W}
          height={H}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Subtle Paper Background Pattern Overlay */}
        {card.paperPattern && card.paperPattern !== 'none' && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none rounded-[calc(var(--px)*20)] transition-all duration-300"
            style={{
              ...getPatternCss(card.paperPattern, card.pal?.ink || '#5b3f86'),
              mixBlendMode: 'multiply',
              zIndex: 1,
            }}
          />
        )}

        {/* SVG Graphic Layer */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          style={{ color: 'var(--ink)' }}
        >
          <defs>
            {/* Heart clip paths */}
            {HI.map((b, i) => (
              <clipPath key={i} id={`ch${i}`}>
                <path d={heartPath(...b)} />
              </clipPath>
            ))}

            {/* Silhouette frame mask for photo */}
            <mask
              id="photo-mask"
              maskUnits="userSpaceOnUse"
              x={FR.x}
              y={FR.y}
              width={FR.w}
              height={FR.h}
            >
              <image
                href={SIL}
                x={FR.x}
                y={FR.y}
                width={FR.w}
                height={FR.h}
                preserveAspectRatio="none"
              />
            </mask>

            {/* Cute paw print symbol */}
            <symbol id="paw-icon" viewBox="0 0 100 100">
              <ellipse cx="50" cy="68" rx="24" ry="19" fill="currentColor" />
              <circle cx="20" cy="42" r="10" fill="currentColor" />
              <circle cx="39" cy="24" r="11" fill="currentColor" />
              <circle cx="61" cy="24" r="11" fill="currentColor" />
              <circle cx="80" cy="42" r="10" fill="currentColor" />
            </symbol>
          </defs>

          {/* Form field backgrounds in SVG */}
          <rect
            className="fill-[var(--field)]"
            x={NB[0]}
            y={NB[1]}
            width={NB[2]}
            height={NB[3]}
            rx={22}
          />
          {INF.map(([k, , x]) => (
            <rect
              key={k}
              className="fill-[var(--field)]"
              x={x}
              y={636}
              width={129}
              height={44}
              rx={22}
            />
          ))}
          <rect
            className="fill-[var(--field)]"
            x={FBOX[0]}
            y={FBOX[1]}
            width={FBOX[2]}
            height={FBOX[3]}
            rx={30}
          />

          {/* Labels */}
          {INF.map(([, t, x]) => (
            <text
              key={t}
              x={x + 29}
              y={616}
              style={{ fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif` }}
              className="fill-[var(--ink)] text-[29px] dominant-baseline-central"
            >
              {t}
            </text>
          ))}
          <text
            x={284}
            y={718}
            style={{ fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif` }}
            className="fill-[var(--ink)] text-[29px] dominant-baseline-central"
          >
            Fandoms:
          </text>

          {/* 3 Heart Slots */}
          {[0, 1, 2].map((i) => {
            const catIdx = card.o[i] ?? i;
            const cat = OC[catIdx] || OC[0];
            const slotData = card.h[i];
            const isSelected = selectedSlot === i;
            const fitted = getFittedRect(HI[i], slotData || { w: 0, h: 0, x: 0, y: 0, z: 1 });

            return (
              <g key={i}>
                {/* Glow & Border */}
                <path
                  d={heartPath(...HO[i])}
                  fill="none"
                  stroke={cat.g}
                  strokeWidth={20}
                  strokeLinejoin="round"
                  opacity={0.35}
                />
                <path
                  d={heartPath(...HO[i])}
                  fill="var(--card)"
                  stroke={cat.d}
                  strokeWidth={9}
                  strokeLinejoin="round"
                />
                <path
                  d={heartPath(...HS[i])}
                  fill="none"
                  stroke={cat.g}
                  strokeWidth={2.5}
                  strokeDasharray="7 6"
                  opacity={0.8}
                />

                {/* Placeholder text if empty */}
                {!slotData?.s && (
                  <text
                    x={HO[i][0] + HO[i][2] / 2}
                    y={HO[i][1] + HO[i][3] * 0.47}
                    textAnchor="middle"
                    style={{ fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif` }}
                    className="fill-[var(--ink)] opacity-55 text-[30px] pointer-events-none select-none"
                  >
                    ＋ subir imagen
                  </text>
                )}

                {/* Uploaded Heart image clipped */}
                {slotData?.s ? (
                  <image
                    href={slotData.s}
                    x={fitted[0]}
                    y={fitted[1]}
                    width={fitted[2]}
                    height={fitted[3]}
                    preserveAspectRatio="none"
                    clipPath={`url(#ch${i})`}
                  />
                ) : null}

                {/* Selection Outline when active */}
                {isSelected && (
                  <path
                    d={heartPath(...HO[i])}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth={4}
                    strokeDasharray="7 6"
                    className="pointer-events-none"
                  />
                )}

                {/* Interactive Click / Drag Hit Area */}
                <path
                  d={heartPath(...HO[i])}
                  className="fill-transparent cursor-pointer"
                  style={{
                    cursor: slotData?.s
                      ? dragState?.slot === i
                        ? 'grabbing'
                        : 'grab'
                      : 'pointer',
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => handleSlotPointerDown(e, i as SlotKey)}
                  onWheel={(e) => handleSlotWheel(e, i as SlotKey)}
                  onClick={() => {
                    if (!slotData?.s) {
                      onUploadSlot(i as SlotKey);
                    } else {
                      onSelectSlot(i as SlotKey);
                    }
                  }}
                  onDoubleClick={() => onUploadSlot(i as SlotKey)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleSlotDrop(e, i as SlotKey)}
                />
              </g>
            );
          })}

          {/* Category badges below each heart */}
          {PB.map(([x, y, bw, bh], i) => {
            const catIdx = card.o[i] ?? i;
            const cat = OC[catIdx] || OC[0];
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={bh}
                  rx={28}
                  fill={cat.f}
                  stroke={cat.d}
                  strokeWidth={3.5}
                />
                <g style={{ color: cat.d }}>
                  <use href="#paw-icon" x={x + 20} y={y + 14} width={28} height={28} />
                  <use href="#paw-icon" x={x + bw - 48} y={y + 14} width={28} height={28} />
                </g>
              </g>
            );
          })}

          {/* Avatar Photo Slot */}
          <g>
            {/* Placeholder if empty */}
            {!card.av?.s && (
              <text
                x={HOLE[0] + HOLE[2] / 2}
                y={HOLE[1] + HOLE[3] / 2}
                textAnchor="middle"
                style={{ fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif` }}
                className="fill-[var(--ink)] opacity-55 text-[26px] pointer-events-none select-none"
              >
                ＋ foto del personaje
              </text>
            )}

            {/* Masked avatar image */}
            {card.av?.s ? (
              <g mask="url(#photo-mask)">
                {(() => {
                  const fitted = getFittedRect(HOLE, card.av);
                  return (
                    <image
                      href={card.av.s}
                      x={fitted[0]}
                      y={fitted[1]}
                      width={fitted[2]}
                      height={fitted[3]}
                      preserveAspectRatio="none"
                    />
                  );
                })()}
              </g>
            ) : null}

            {/* Recolored Polaroid frame on top */}
            {frameDataUrl ? (
              <image
                href={frameDataUrl}
                x={FR.x}
                y={FR.y}
                width={FR.w}
                height={FR.h}
                className="pointer-events-none"
              />
            ) : null}

            {/* Selection Outline for Photo */}
            {selectedSlot === 'a' && (
              <rect
                x={FR.x - 4}
                y={FR.y - 4}
                width={FR.w + 8}
                height={FR.h + 8}
                rx={14}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={4}
                strokeDasharray="7 6"
                className="pointer-events-none"
              />
            )}

            {/* Interactive Hit Area for Avatar */}
            <rect
              x={FR.x}
              y={FR.y}
              width={FR.w}
              height={FR.h}
              className="fill-transparent cursor-pointer"
              style={{
                cursor: card.av?.s
                  ? dragState?.slot === 'a'
                    ? 'grabbing'
                    : 'grab'
                  : 'pointer',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handleSlotPointerDown(e, 'a')}
              onWheel={(e) => handleSlotWheel(e, 'a')}
              onClick={() => {
                if (!card.av?.s) {
                  onUploadSlot('a');
                } else {
                  onSelectSlot('a');
                }
              }}
              onDoubleClick={() => onUploadSlot('a')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleSlotDrop(e, 'a')}
            />
          </g>
        </svg>

        {/* HTML Input Overlays */}
        {/* Name input */}
        <input
          type="text"
          value={card.name || ''}
          onChange={(e) => onUpdateCard({ name: e.target.value })}
          placeholder="Nombre / apodo"
          maxLength={40}
          aria-label="Nombre o apodo"
          className="absolute bg-transparent border-0 outline-none px-[calc(var(--px)*14)] rounded-[calc(var(--px)*22)] focus:bg-white/40 text-[calc(var(--px)*30)]"
          style={{
            ...pc(NB),
            color: 'var(--ink)',
            fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
          }}
        />

        {/* Info inputs: Edad, Género, Raza */}
        {INF.map(([k, t, x]) => (
          <input
            key={k}
            type="text"
            value={(card as unknown as Record<string, string>)[k] || ''}
            onChange={(e) => onUpdateCard({ [k]: e.target.value })}
            placeholder={t.replace(':', '')}
            maxLength={20}
            aria-label={t.replace(':', '')}
            className="absolute bg-transparent border-0 outline-none px-[calc(var(--px)*10)] rounded-[calc(var(--px)*22)] focus:bg-white/40 text-[calc(var(--px)*26)]"
            style={{
              ...pc([x, 636, 129, 44]),
              color: 'var(--ink)',
              fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
            }}
          />
        ))}

        {/* Fandoms Textarea */}
        <textarea
          value={card.fand || ''}
          onChange={(e) => onUpdateCard({ fand: e.target.value })}
          placeholder="Escribe tus fandoms, ships o notas…"
          maxLength={200}
          aria-label="Fandoms"
          className="absolute bg-transparent border-0 outline-none p-[calc(var(--px)*12)] rounded-[calc(var(--px)*24)] focus:bg-white/40 text-[calc(var(--px)*27)] leading-[calc(var(--px)*34)] resize-none"
          style={{
            ...pc(FB),
            color: 'var(--ink)',
            fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
          }}
        />

        {/* Category dropdowns under hearts */}
        {PB.map((b, i) => {
          const catIdx = card.o[i] ?? i;
          const cat = OC[catIdx] || OC[0];
          return (
            <select
              key={i}
              value={catIdx}
              onChange={(e) => {
                const newO = [...card.o] as [number, number, number];
                newO[i] = parseInt(e.target.value, 10);
                onUpdateCard({ o: newO });
              }}
              aria-label={`Categoría del corazón ${i + 1}`}
              className="absolute bg-transparent border-0 outline-none text-center cursor-pointer text-[calc(var(--px)*29)] rounded-[calc(var(--px)*28)] px-[calc(var(--px)*40)] font-bold transition-transform hover:scale-102"
              style={{
                ...pc(b),
                color: cat.d,
                fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
              }}
            >
              {OPT.map((optName, j) => (
                <option key={j} value={j} className="text-[#4a3b5c] bg-white">
                  {optName}
                </option>
              ))}
            </select>
          );
        })}

        {/* Music Player Interactive Component */}
        <MusicPlayer
          card={card}
          onChange={onUpdateCard}
          onCoverClick={() => onUploadSlot('cover')}
          onToast={onToast}
        />

        {/* Sticky Notes (Post-its) Layer */}
        {(card.notes || []).map((note) => {
          const isDraggingThis = draggedNote?.id === note.id;
          const tapeColor = getTapeColorForSticky(note.color);

          return (
            <div
              key={note.id}
              className={`absolute flex flex-col group select-none transition-shadow ${
                isDraggingThis ? 'cursor-grabbing z-50 shadow-2xl' : 'cursor-grab z-30'
              }`}
              style={{
                left: `calc(var(--px) * ${note.x})`,
                top: `calc(var(--px) * ${note.y})`,
                width: `calc(var(--px) * 200)`,
                minHeight: `calc(var(--px) * 150)`,
                transform: `rotate(${note.rotation}deg)`,
                backgroundColor: note.color,
                borderRadius: 'calc(var(--px) * 5)',
                boxShadow: isDraggingThis
                  ? '0 calc(var(--px) * 12) calc(var(--px) * 24) rgba(0,0,0,0.25)'
                  : '0 calc(var(--px) * 4) calc(var(--px) * 10) rgba(0,0,0,0.16)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handleNotePointerDown(e, note)}
            >
              {/* Washi tape strip at top */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 'calc(var(--px) * -10)',
                  left: '50%',
                  transform: `translateX(-50%) rotate(${-(note.rotation * 0.4)}deg)`,
                  width: 'calc(var(--px) * 64)',
                  height: 'calc(var(--px) * 20)',
                  backgroundColor: tapeColor,
                  borderRadius: 'calc(var(--px) * 2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              />

              {/* Note action toolbar (drag handle, cycle color, tilt, delete) */}
              <div
                className="flex items-center justify-between px-[calc(var(--px)*6)] pt-[calc(var(--px)*10)] pb-[calc(var(--px)*2)] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => handleNotePointerDown(e, note)}
              >
                {/* Drag indicator icon */}
                <span
                  title="Arrastrar nota"
                  className="text-[calc(var(--px)*16)] opacity-50 cursor-grab active:cursor-grabbing leading-none"
                >
                  ⋮⋮
                </span>

                <div className="flex items-center gap-[calc(var(--px)*4)]">
                  {/* Re-roll rotation angle */}
                  <button
                    type="button"
                    title={`Inclinación: ${note.rotation}° (clic para girar)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRerollRotation(note.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-[calc(var(--px)*24)] h-[calc(var(--px)*24)] rounded-full hover:bg-black/10 flex items-center justify-center text-[calc(var(--px)*14)] cursor-pointer text-gray-700 transition-colors"
                  >
                    ↺
                  </button>

                  {/* Change color button */}
                  <button
                    type="button"
                    title="Cambiar color del post-it"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCycleColor(note.id, note.color);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-[calc(var(--px)*24)] h-[calc(var(--px)*24)] rounded-full hover:bg-black/10 flex items-center justify-center text-[calc(var(--px)*14)] cursor-pointer text-gray-700 transition-colors"
                  >
                    🎨
                  </button>

                  {/* Delete note button */}
                  <button
                    type="button"
                    title="Eliminar esta nota"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-[calc(var(--px)*24)] h-[calc(var(--px)*24)] rounded-full hover:bg-red-500/20 text-red-700 flex items-center justify-center text-[calc(var(--px)*16)] font-bold cursor-pointer transition-colors leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Textarea for note blurb */}
              <textarea
                value={note.text || ''}
                onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Escribe aquí tu nota…"
                maxLength={180}
                rows={4}
                className="flex-1 w-full bg-transparent border-0 outline-none resize-none px-[calc(var(--px)*10)] pb-[calc(var(--px)*10)] text-[calc(var(--px)*21)] leading-[calc(var(--px)*26)] cursor-text select-text"
                style={{
                  color: '#34234c',
                  fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
                }}
              />
            </div>
          );
        })}

        {/* Quick-add Sticky Note Button (Top Right Floating Badge) */}
        <div className="absolute top-[calc(var(--px)*16)] right-[calc(var(--px)*20)] z-20">
          <button
            type="button"
            onClick={handleAddStickyNote}
            title="Añadir una nota adhesiva / post-it a la ficha"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fff8b8] border-2 border-[#e8dc88] hover:bg-[#fff09e] text-[#5b3f86] text-xs font-medium shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:scale-105"
            style={{
              fontFamily: `'${appliedFont}', cursive, system-ui, sans-serif`,
            }}
          >
            <span className="text-base leading-none">📌</span>
            <span>＋ Post-it</span>
          </button>
        </div>
      </div>
    </div>
  );
};
