export interface ImageSlot {
  s: string; // data URL or image source
  w: number; // original width
  h: number; // original height
  x: number; // offset x in pixels
  y: number; // offset y in pixels
  z: number; // zoom factor (1.0 to 3.0)
}

export interface Palette {
  prin: string;  // Principal: Panel, listones y lazos
  ink: string;   // Contorno: Líneas y textos
  card: string;  // Tarjeta: Crema de la tarjeta
  field: string; // Campos: Casillas para escribir
  acc: string;   // Acento: Orejitas y corazones rosas
}

export interface StickyNote {
  id: string;
  text: string;
  x: number; // x coordinate relative to board width (0 to 1312)
  y: number; // y coordinate relative to board height (0 to 1199)
  color: string; // pastel background color
  rotation: number; // random rotation in degrees for scrapbook look
}

export interface CardData {
  id: string;
  name: string;
  age: string;
  gen: string;
  race: string;
  fand: string;
  av: ImageSlot;
  h: [ImageSlot, ImageSlot, ImageSlot];
  o: [number, number, number]; // 0: Sharing, 1: Selective, 2: Non-sharing
  pal: Palette | null;
  font: string;
  fontFamily?: string;
  paperPattern?: import('../utils/patternUtils').PaperPatternId;
  pt: string; // Song title
  pc: string; // Song cover
  lk: boolean; // Song liked
  tags: string[];
  notes?: StickyNote[];
  fav: boolean;
  ts: number;
}

export type SlotKey = 'a' | 0 | 1 | 2 | 'cover';

export interface SharingCategory {
  f: string; // fill
  d: string; // dark border & icon
  g: string; // glow / outer halo
  n: string; // name
}
