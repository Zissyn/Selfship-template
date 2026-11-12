import { CardData, Palette, ImageSlot } from '../types/album';
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
  NB,
  INF,
  FB,
  FBOX,
  PL,
  OPT,
} from './constants';
import { SIL } from '../assets/templateAssets';
import { initColorEngine } from './colorEngine';
import { drawPatternOnCanvas } from './patternUtils';

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

function fitSlotInBox(
  box: [number, number, number, number],
  d: ImageSlot
): [number, number, number, number] {
  const [bx, by, bw, bh] = box;
  if (!d.w || !d.h) return [bx, by, bw, bh];
  const zoom = d.z || 1;
  const k = Math.max(bw / d.w, bh / d.h) * zoom;
  const w = d.w * k;
  const h = d.h * k;
  const mx = (w - bw) / 2;
  const my = (h - bh) / 2;
  const ox = Math.max(-mx, Math.min(mx, d.x || 0));
  const oy = Math.max(-my, Math.min(my, d.y || 0));
  return [bx + bw / 2 - w / 2 + ox, by + bh / 2 - h / 2 + oy, w, h];
}

function drawPaw(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  z: number
): void {
  ctx.beginPath();
  ctx.ellipse(px + z / 2, py + z * 0.68, z * 0.24, z * 0.19, 0, 0, Math.PI * 2);
  const toes: [number, number, number][] = [
    [20, 42, 10],
    [39, 24, 11],
    [61, 24, 11],
    [80, 42, 10],
  ];
  toes.forEach(([a, b, r]) => {
    ctx.moveTo(px + (a * z) / 100 + (r * z) / 100, py + (b * z) / 100);
    ctx.arc(px + (a * z) / 100, py + (b * z) / 100, (r * z) / 100, 0, Math.PI * 2);
  });
  ctx.fill();
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  x: number,
  y: number,
  sz: number,
  mode: 'fill' | 'line',
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sz / 24, sz / 24);
  const p = new Path2D(pathData);
  if (mode === 'fill') {
    ctx.fillStyle = color;
    ctx.fill(p);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = mode === 'fill' ? 1.4 : 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(p);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const result: string[] = [];
  const paragraphs = (text || '').split('\n');
  paragraphs.forEach((p) => {
    let line = '';
    const words = p.split(' ');
    words.forEach((w) => {
      const testLine = line ? line + ' ' + w : w;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        result.push(line);
        line = w;
      } else {
        line = testLine;
      }
    });
    result.push(line);
  });
  return result;
}

const PF = '"Patrick Hand", cursive';

export async function renderCardToCanvas(
  card: CardData,
  palette: Palette
): Promise<HTMLCanvasElement> {
  const engine = await initColorEngine();
  engine.recolor(palette);

  const font = card.fontFamily || card.font || 'Patrick Hand';
  const customFontFamily = `"${font}", ${PF}`;

  try {
    await Promise.all([
      document.fonts.load(`30px "${font}"`),
      document.fonts.load(`30px ${PF}`),
    ]);
  } catch {}

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw recolored background
  ctx.drawImage(engine.bgCanvas, 0, 0);

  // 1b. Draw subtle paper pattern if chosen
  if (card.paperPattern && card.paperPattern !== 'none') {
    drawPatternOnCanvas(ctx, card.paperPattern, palette.ink, W, H);
  }

  // 2. Draw text field backgrounds
  ctx.fillStyle = palette.field;
  drawRoundRect(ctx, NB[0], NB[1], NB[2], NB[3], 22);
  ctx.fill();

  INF.forEach(([, , x]) => {
    drawRoundRect(ctx, x, 636, 129, 44, 22);
    ctx.fill();
  });

  drawRoundRect(ctx, FBOX[0], FBOX[1], FBOX[2], FBOX[3], 30);
  ctx.fill();

  // 3. Draw 3 Hearts and images
  for (let i = 0; i < 3; i++) {
    const catIdx = card.o[i] ?? i;
    const cat = OC[catIdx] || OC[0];
    const pathOuter = new Path2D(heartPath(...HO[i]));

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = cat.g;
    ctx.lineWidth = 20;
    ctx.stroke(pathOuter);
    ctx.globalAlpha = 1;

    ctx.fillStyle = palette.card;
    ctx.fill(pathOuter);
    ctx.strokeStyle = cat.d;
    ctx.lineWidth = 9;
    ctx.stroke(pathOuter);

    ctx.setLineDash([7, 6]);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = cat.g;
    ctx.lineWidth = 2.5;
    ctx.stroke(new Path2D(heartPath(...HS[i])));
    ctx.restore();

    // Heart photo
    const slotData = card.h[i];
    if (slotData && slotData.s) {
      try {
        const heartImg = await loadImg(slotData.s);
        ctx.save();
        ctx.clip(new Path2D(heartPath(...HI[i])));
        const fitted = fitSlotInBox(HI[i], slotData);
        ctx.drawImage(heartImg, fitted[0], fitted[1], fitted[2], fitted[3]);
        ctx.restore();
      } catch (err) {
        console.warn('Could not render heart image', err);
      }
    }
  }

  // 4. Draw Avatar with Silhouette mask and Polaroid Frame
  if (card.av && card.av.s) {
    try {
      const avImg = await loadImg(card.av.s);
      const silImg = await loadImg(SIL);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = FR.w;
      offCanvas.height = FR.h;
      const offCtx = offCanvas.getContext('2d')!;

      const fitted = fitSlotInBox(HOLE, card.av);
      offCtx.drawImage(
        avImg,
        fitted[0] - FR.x,
        fitted[1] - FR.y,
        fitted[2],
        fitted[3]
      );
      offCtx.globalCompositeOperation = 'destination-in';
      offCtx.drawImage(silImg, 0, 0, offCanvas.width, offCanvas.height);

      ctx.drawImage(offCanvas, FR.x, FR.y);
    } catch (err) {
      console.warn('Could not render avatar image', err);
    }
  }

  // Draw recolored Polaroid frame on top
  ctx.drawImage(
    engine.frameCanvas,
    0,
    0,
    engine.frameCanvas.width,
    engine.frameCanvas.height,
    FR.x,
    FR.y,
    FR.w,
    FR.h
  );

  // 5. Draw category pills under hearts
  ctx.font = `29px ${PF}`;
  ctx.textBaseline = 'middle';

  PB.forEach(([bx, by, bw, bh], i) => {
    const catIdx = card.o[i] ?? i;
    const cat = OC[catIdx] || OC[0];
    ctx.fillStyle = cat.f;
    ctx.strokeStyle = cat.d;
    ctx.lineWidth = 3.5;
    drawRoundRect(ctx, bx, by, bw, bh, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cat.d;
    drawPaw(ctx, bx + 20, by + 14, 28);
    drawPaw(ctx, bx + bw - 48, by + 14, 28);

    ctx.textAlign = 'center';
    ctx.fillText(OPT[catIdx], bx + bw / 2, by + bh / 2 + 1);
  });

  // 6. Labels and Values
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.ink;
  ctx.font = `29px ${PF}`;

  INF.forEach(([, t, bx]) => ctx.fillText(t, bx + 29, 616));
  ctx.fillText('Fandoms:', 284, 718);

  ctx.font = `30px ${customFontFamily}`;
  ctx.fillText(card.name || '', NB[0] + 14, NB[1] + NB[3] / 2 + 1);

  ctx.font = `26px ${customFontFamily}`;
  ctx.fillText(card.age || '', INF[0][2] + 10, 636 + 23);
  ctx.fillText(card.gen || '', INF[1][2] + 10, 636 + 23);
  ctx.fillText(card.race || '', INF[2][2] + 10, 636 + 23);

  ctx.font = `27px ${customFontFamily}`;
  wrapText(ctx, card.fand || '', FB[2] - 40)
    .slice(0, 4)
    .forEach((l, i) => {
      ctx.fillText(l, FB[0] + 20, FB[1] + 10 + 17 + i * 34);
    });

  // 7. Draw Music Player Mockup
  const [X, Y, w, h] = PL;
  const ink = palette.ink;
  const lav = palette.prin;
  const acc = palette.acc;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, X - 8, Y - 8, w + 16, h + 16, 48);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = palette.card;
  drawRoundRect(ctx, X, Y, w, h, 40);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  drawRoundRect(ctx, X + 2.5, Y + 2.5, w - 5, h - 5, 38);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = acc;
  ctx.lineWidth = 2;
  drawRoundRect(ctx, X + 14, Y + 14, w - 28, h - 28, 28);
  ctx.stroke();
  ctx.restore();

  // Cover disk
  const cx = X + 60;
  const cy = Y + 66;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = lav;
  ctx.fillRect(cx - 46, cy - 46, 92, 92);

  if (card.pc) {
    try {
      const coverImg = await loadImg(card.pc);
      const k = Math.max(92 / coverImg.width, 92 / coverImg.height);
      ctx.drawImage(
        coverImg,
        cx - (coverImg.width * k) / 2,
        cy - (coverImg.height * k) / 2,
        coverImg.width * k,
        coverImg.height * k
      );
    } catch {
      ctx.fillStyle = ink;
      drawPaw(ctx, cx - 21, cy - 21, 42);
    }
  } else {
    ctx.fillStyle = ink;
    drawPaw(ctx, cx - 21, cy - 21, 42);
  }
  ctx.restore();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.stroke();

  // Badge icon
  ctx.fillStyle = acc;
  ctx.beginPath();
  ctx.arc(X + 28, Y + 104, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  [
    [-8, 3],
    [-3, 8],
    [2, 5],
    [7, 2],
  ].forEach(([dx, b]) => {
    ctx.beginPath();
    ctx.moveTo(X + 28 + dx, Y + 104 - b);
    ctx.lineTo(X + 28 + dx, Y + 104 + b);
    ctx.stroke();
  });

  // Song title
  ctx.font = `27px ${customFontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  if (card.pt) {
    ctx.fillText(card.pt, X + 118 + 8, Y + 31);
  }

  // Waveform bars
  const NBARS = 30;
  const bw = (330 - 3 * (NBARS - 1)) / NBARS;
  // Seeded peaks
  let hashVal = 0;
  for (const ch of card.id || 'seed') {
    hashVal = (hashVal * 31 + ch.charCodeAt(0)) >>> 0;
  }
  for (let i = 0; i < NBARS; i++) {
    hashVal = (hashVal * 1664525 + 1013904223) >>> 0;
    const r = hashVal / 4294967296;
    const val = Math.max(
      0.16,
      Math.min(
        1,
        (0.5 + 0.5 * Math.sin(((i + 0.5) / NBARS) * Math.PI)) * (0.35 + 0.65 * r)
      )
    );
    ctx.fillStyle = i < Math.round(0.35 * NBARS) ? ink : lav;
    drawRoundRect(
      ctx,
      X + 122 + i * (bw + 3),
      Y + 52 + 19 - val * 19,
      bw,
      val * 38,
      bw / 2
    );
    ctx.fill();
  }

  // Time display
  ctx.font = `21px ${PF}`;
  ctx.fillStyle = ink;
  ctx.fillText('1:14', X + 122, Y + 107);
  ctx.textAlign = 'right';
  ctx.fillText('3:42', X + 452, Y + 107);

  // Controls icons
  const heartIconPath =
    'M12 21C5 15.5 2.5 12 2.5 8.5 2.5 6 4.5 4 7 4c2 0 3.8 1.2 5 3 1.2-1.8 3-3 5-3 2.5 0 4.5 2 4.5 4.5C21.5 12 19 15.5 12 21z';
  drawIcon(
    ctx,
    heartIconPath,
    X + 30,
    Y + 128,
    44,
    card.lk ? 'fill' : 'line',
    card.lk ? '#e0678f' : ink
  );

  drawIcon(
    ctx,
    'M11 6v12L2.5 12zM21 6v12l-8.5-6z',
    X + 143,
    Y + 128,
    44,
    'fill',
    ink
  );
  drawIcon(
    ctx,
    'M13 6v12l8.5-6zM3 6v12l8.5-6z',
    X + 283,
    Y + 128,
    44,
    'fill',
    ink
  );

  // Center play/pause
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(X + 235, Y + 148, 26, 0, Math.PI * 2);
  ctx.fill();
  drawIcon(
    ctx,
    'M7 4.5v15l13-7.5z',
    X + 235 - 14.5,
    Y + 148 - 14.5,
    29,
    'fill',
    palette.card
  );

  // Volume
  drawIcon(
    ctx,
    'M3 9v6h4l5 4V5L7 9z',
    X + 352,
    Y + 139,
    22,
    'fill',
    ink
  );
  ctx.strokeStyle = lav;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X + 384, Y + 150);
  ctx.lineTo(X + 450, Y + 150);
  ctx.stroke();

  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(X + 384, Y + 150);
  ctx.lineTo(X + 384 + 66 * 0.85, Y + 150);
  ctx.stroke();

  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(X + 384 + 66 * 0.85, Y + 150, 7, 0, Math.PI * 2);
  ctx.fill();

  // 8. Draw Sticky Notes
  if (card.notes && card.notes.length > 0) {
    const noteW = 200;
    const noteH = 150;
    card.notes.forEach((note) => {
      ctx.save();
      const centerX = note.x + noteW / 2;
      const centerY = note.y + noteH / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((note.rotation * Math.PI) / 180);
      ctx.translate(-noteW / 2, -noteH / 2);

      // Drop shadow for scrapbook depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 5;

      // Note paper background
      ctx.fillStyle = note.color;
      drawRoundRect(ctx, 0, 0, noteW, noteH, 4);
      ctx.fill();

      // Reset shadow for border and details
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, 0, 0, noteW, noteH, 4);
      ctx.stroke();

      // Washi tape strip at top
      ctx.save();
      ctx.translate(noteW / 2, 0);
      ctx.rotate((-note.rotation * 0.4 * Math.PI) / 180);
      ctx.fillStyle = 'rgba(244, 185, 207, 0.8)';
      drawRoundRect(ctx, -32, -10, 64, 20, 2);
      ctx.fill();
      ctx.restore();

      // Text blurb
      if (note.text) {
        ctx.font = `22px ${customFontFamily}`;
        ctx.fillStyle = '#3a2d48';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, note.text, noteW - 28);
        lines.slice(0, 5).forEach((line, lineIdx) => {
          ctx.fillText(line, 14, 22 + lineIdx * 25);
        });
      }

      ctx.restore();
    });
  }

  return canvas;
}

/**
 * Standard browser file download using HTML5 blob link
 */
export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {}
  }, 1000);
}

/**
 * High quality PNG Export
 */
export async function exportCardAsPng(
  card: CardData,
  palette: Palette
): Promise<{ dataUrl: string; blob: Blob; filename: string }> {
  const canvas = await renderCardToCanvas(card, palette);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('No se pudo convertir el canvas a blob PNG.'));
    }, 'image/png');
  });

  const safeName =
    (card.name || 'ficha')
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'ficha-ships';
  const filename = `${safeName}.png`;

  downloadBlobAsFile(blob, filename);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    blob,
    filename,
  };
}
