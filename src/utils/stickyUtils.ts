import { StickyNote } from '../types/album';
import { STICKY_COLORS } from './constants';

export function createStickyNote(
  text: string = '',
  customColor?: string,
  preferredX?: number,
  preferredY?: number
): StickyNote {
  // Random rotation between -6.0 and +6.0 degrees for authentic scrapbook feel
  const randomRotation = +(Math.random() * 11 - 5.5).toFixed(1);

  // Pick color or randomize
  const color =
    customColor ||
    STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)].bg;

  // Place note at preferred spot or slight random offset around the board notes area
  const x =
    preferredX !== undefined
      ? preferredX
      : Math.round(550 + (Math.random() * 120 - 60));
  const y =
    preferredY !== undefined
      ? preferredY
      : Math.round(460 + (Math.random() * 120 - 60));

  return {
    id: Math.random().toString(36).slice(2, 9),
    text,
    x: Math.max(20, Math.min(1080, x)),
    y: Math.max(20, Math.min(1000, y)),
    color,
    rotation: randomRotation,
  };
}

export function getTapeColorForSticky(bgColor: string): string {
  const match = STICKY_COLORS.find(
    (c) => c.bg.toLowerCase() === bgColor.toLowerCase()
  );
  return match?.tape || 'rgba(255, 185, 207, 0.75)';
}

export function cycleStickyColor(currentColor: string): string {
  const currentIndex = STICKY_COLORS.findIndex(
    (c) => c.bg.toLowerCase() === currentColor.toLowerCase()
  );
  const nextIndex = (currentIndex + 1) % STICKY_COLORS.length;
  return STICKY_COLORS[nextIndex].bg;
}
