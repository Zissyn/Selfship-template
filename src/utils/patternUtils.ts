import React from 'react';

export type PaperPatternId =
  | 'none'
  | 'dotted'
  | 'lined'
  | 'graph'
  | 'fine-grid'
  | 'isometric'
  | 'vintage-dots';

export interface PaperPatternOption {
  id: PaperPatternId;
  name: string;
  desc: string;
}

export const PAPER_PATTERNS: PaperPatternOption[] = [
  {
    id: 'none',
    name: 'Papel liso',
    desc: 'Sin textura de fondo',
  },
  {
    id: 'dotted',
    name: 'Punteado',
    desc: 'Puntos bullet journal',
  },
  {
    id: 'lined',
    name: 'Rayado',
    desc: 'Líneas horizontales de cuaderno',
  },
  {
    id: 'graph',
    name: 'Cuadrícula',
    desc: 'Papel cuadriculado clásico',
  },
  {
    id: 'fine-grid',
    name: 'Malla fina',
    desc: 'Micro-cuadrícula para apuntes',
  },
  {
    id: 'isometric',
    name: 'Isométrico',
    desc: 'Malla en rombos y diamantes',
  },
  {
    id: 'vintage-dots',
    name: 'Polka dots',
    desc: 'Puntos alternos de scrapbook',
  },
];

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(91, 63, 134, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(91, 63, 134, ${alpha})`;
}

/**
 * Returns CSS properties for the card background container and overlay.
 * Uses calc(var(--px, 1px) * ...) to scale seamlessly with board dimensions.
 */
export function getPatternCss(
  patternId: PaperPatternId | string | undefined,
  inkColor: string = '#5b3f86'
): React.CSSProperties {
  const c = hexToRgba(inkColor, 0.22);
  const cLight = hexToRgba(inkColor, 0.16);
  const cFaint = hexToRgba(inkColor, 0.11);

  switch (patternId) {
    case 'dotted':
      return {
        backgroundImage: `radial-gradient(${c} 1.4px, transparent 1.5px)`,
        backgroundSize: 'calc(var(--px, 1px) * 26) calc(var(--px, 1px) * 26)',
      };

    case 'lined':
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent calc(var(--px, 1px) * 29), ${cLight} calc(var(--px, 1px) * 29), ${cLight} calc(var(--px, 1px) * 30.5))`,
        backgroundSize: '100% calc(var(--px, 1px) * 30.5)',
      };

    case 'graph':
      return {
        backgroundImage: `linear-gradient(to right, ${cLight} 1px, transparent 1px), linear-gradient(to bottom, ${cLight} 1px, transparent 1px)`,
        backgroundSize: 'calc(var(--px, 1px) * 26) calc(var(--px, 1px) * 26)',
      };

    case 'fine-grid':
      return {
        backgroundImage: `linear-gradient(to right, ${cFaint} 1px, transparent 1px), linear-gradient(to bottom, ${cFaint} 1px, transparent 1px)`,
        backgroundSize: 'calc(var(--px, 1px) * 14) calc(var(--px, 1px) * 14)',
      };

    case 'isometric':
      return {
        backgroundImage: `linear-gradient(45deg, ${cFaint} 1px, transparent 1px), linear-gradient(-45deg, ${cFaint} 1px, transparent 1px)`,
        backgroundSize: 'calc(var(--px, 1px) * 26) calc(var(--px, 1px) * 26)',
      };

    case 'vintage-dots':
      return {
        backgroundImage: `radial-gradient(${c} 1.4px, transparent 1.5px), radial-gradient(${c} 1.4px, transparent 1.5px)`,
        backgroundPosition: '0 0, calc(var(--px, 1px) * 14) calc(var(--px, 1px) * 14)',
        backgroundSize: 'calc(var(--px, 1px) * 28) calc(var(--px, 1px) * 28)',
      };

    case 'none':
    default:
      return {
        backgroundImage: 'none',
      };
  }
}

/**
 * Returns CSS properties for small preview swatch boxes in the ToolsPanel.
 */
export function getPatternPreviewStyle(
  patternId: PaperPatternId,
  inkColor: string = '#5b3f86'
): React.CSSProperties {
  const c = hexToRgba(inkColor, 0.45);
  const cLight = hexToRgba(inkColor, 0.35);

  switch (patternId) {
    case 'dotted':
      return {
        backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.3px)`,
        backgroundSize: '8px 8px',
      };

    case 'lined':
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 7px, ${cLight} 7px, ${cLight} 8px)`,
        backgroundSize: '100% 8px',
      };

    case 'graph':
      return {
        backgroundImage: `linear-gradient(to right, ${cLight} 1px, transparent 1px), linear-gradient(to bottom, ${cLight} 1px, transparent 1px)`,
        backgroundSize: '8px 8px',
      };

    case 'fine-grid':
      return {
        backgroundImage: `linear-gradient(to right, ${cLight} 1px, transparent 1px), linear-gradient(to bottom, ${cLight} 1px, transparent 1px)`,
        backgroundSize: '4px 4px',
      };

    case 'isometric':
      return {
        backgroundImage: `linear-gradient(45deg, ${cLight} 1px, transparent 1px), linear-gradient(-45deg, ${cLight} 1px, transparent 1px)`,
        backgroundSize: '9px 9px',
      };

    case 'vintage-dots':
      return {
        backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.3px), radial-gradient(${c} 1.2px, transparent 1.3px)`,
        backgroundPosition: '0 0, 5px 5px',
        backgroundSize: '10px 10px',
      };

    case 'none':
    default:
      return {
        backgroundImage: 'none',
        backgroundColor: '#faf6ee',
      };
  }
}

/**
 * Draws the selected paper background pattern on an HTML Canvas context.
 * Used when exporting high-resolution PNG (1312 x 1199).
 */
export function drawPatternOnCanvas(
  ctx: CanvasRenderingContext2D,
  patternId: PaperPatternId | string | undefined,
  inkColor: string,
  width: number,
  height: number
): void {
  if (!patternId || patternId === 'none') return;

  ctx.save();

  if (patternId === 'dotted') {
    ctx.fillStyle = inkColor;
    ctx.globalAlpha = 0.14;
    const step = 26;
    for (let x = step / 2; x < width; x += step) {
      for (let y = step / 2; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (patternId === 'lined') {
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.12;
    const step = 30;
    ctx.beginPath();
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (patternId === 'graph') {
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.11;
    const step = 26;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (patternId === 'fine-grid') {
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.08;
    const step = 14;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (patternId === 'isometric') {
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.08;
    const step = 26;
    ctx.beginPath();
    // 45 deg diagonals
    for (let d = -height; d < width; d += step) {
      ctx.moveTo(d, 0);
      ctx.lineTo(d + height, height);
    }
    // -45 deg diagonals
    for (let d = 0; d < width + height; d += step) {
      ctx.moveTo(d, 0);
      ctx.lineTo(d - height, height);
    }
    ctx.stroke();
  } else if (patternId === 'vintage-dots') {
    ctx.fillStyle = inkColor;
    ctx.globalAlpha = 0.14;
    const step = 28;
    const half = step / 2;
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + half, y + half, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
