import { Palette } from '../types/album';

export const W = 1312;
export const H = 1199;
export const STORAGE_KEY = 'ships-album-v1';

export function heartPath(x: number, y: number, w: number, h: number): string {
  const X = (u: number) => +(x + (u * w) / 100).toFixed(1);
  const Y = (v: number) => +(y + (v * h) / 100).toFixed(1);
  return `M${X(50)} ${Y(97)}C${X(22)} ${Y(72)} ${X(2)} ${Y(52)} ${X(2)} ${Y(30)}C${X(2)} ${Y(12)} ${X(14)} ${Y(2)} ${X(28)} ${Y(2)}C${X(38)} ${Y(2)} ${X(46)} ${Y(8)} ${X(50)} ${Y(18)}C${X(54)} ${Y(8)} ${X(62)} ${Y(2)} ${X(72)} ${Y(2)}C${X(86)} ${Y(2)} ${X(98)} ${Y(12)} ${X(98)} ${Y(30)}C${X(98)} ${Y(52)} ${X(78)} ${Y(72)} ${X(50)} ${Y(97)}Z`;
}

export const HX = 774;
export const HW = 324;
export const HH = 226;
export const HT = [220, 489, 758];

export const HO: [number, number, number, number][] = HT.map((t) => [HX + 5, t + 4, HW - 10, HH - 8]);
export const HI: [number, number, number, number][] = HT.map((t) => [HX + 17, t + 15, HW - 34, HH - 30]);
export const HS: [number, number, number, number][] = HT.map((t) => [HX + 11, t + 9.5, HW - 22, HH - 19]);

export const PB: [number, number, number, number][] = [
  [809, 430, 254, 56],
  [809, 699, 254, 56],
  [803, 968, 266, 56],
];

export const OC = [
  { f: '#d8f3e3', d: '#3f9a78', g: '#8fd8b5', n: 'Sharing' },
  { f: '#fff0c4', d: '#c0850f', g: '#f1cf6a', n: 'Selective' },
  { f: '#ffdbe5', d: '#cc4c79', g: '#f28aa9', n: 'Non-sharing' },
];

export const OPT = OC.map((o) => o.n);

export const FW = 276;
export const FR = { x: 455 - FW / 2, y: 290, w: FW, h: (FW * 562) / 640 };
export const HOLE: [number, number, number, number] = [
  FR.x + 0.0924 * FR.w,
  FR.y + 0.09375 * FR.h,
  0.8077 * FR.w,
  0.8267 * FR.h,
];

export const SL: Record<string | number, [number, number, number, number]> = {
  a: HOLE,
  0: HI[0],
  1: HI[1],
  2: HI[2],
};

export const NAMES: Record<string, string> = {
  a: 'Foto del Personaje',
  0: 'Corazón 1',
  1: 'Corazón 2',
  2: 'Corazón 3',
  cover: 'Portada del Reproductor',
};

export const NB: [number, number, number, number] = [248, 546, 414, 44];
export const INF: [string, string, number][] = [
  ['age', 'Edad:', 248],
  ['gen', 'Género:', 391],
  ['race', 'Raza:', 534],
];
export const FB: [number, number, number, number] = [227, 744, 454, 148];
export const FBOX: [number, number, number, number] = [227, 744, 454, 266];
export const PL: [number, number, number, number] = [124, 892, 470, 186];

export const FONTS = [
  'Patrick Hand',
  'Caveat',
  'Kalam',
  'Indie Flower',
  'Gaegu',
  'Shadows Into Light',
  'Handlee',
  'Dancing Script',
  'Quicksand',
  'Nunito',
  'Special Elite',
];

export const ROLES: [keyof Palette, string, string, number][] = [
  ['prin', 'Principal', 'Panel, listones y lazos', 1],
  ['ink', 'Contorno', 'Líneas y textos', 2],
  ['card', 'Tarjeta', 'Crema de la tarjeta', 3],
  ['field', 'Campos', 'Casillas para escribir', 0],
  ['acc', 'Acento', 'Orejitas y corazones rosas', 4],
];

export const DEF_PALETTE: Palette = {
  prin: '#dcc8f5',
  ink: '#5b3f86',
  card: '#fcf3f2',
  field: '#ead3ea',
  acc: '#f4a9c0',
};

export const PRESETS: Record<string, [string, string, string, string, string]> = {
  Lavanda: ['#dcc8f5', '#5b3f86', '#fcf3f2', '#ead3ea', '#f4a9c0'],
  Rosa: ['#f6cfe0', '#8a3a63', '#fff5f7', '#f3cadc', '#c9a7f0'],
  Durazno: ['#fbd9c3', '#8a4b2d', '#fff7f0', '#f6d3bd', '#f29b9b'],
  Menta: ['#cdeee0', '#2f6b57', '#f7fff9', '#c3e6d6', '#f7a8b8'],
  Celeste: ['#cfe5fa', '#35577f', '#f6fbff', '#c4dcf3', '#ffb3c7'],
  Noche: ['#4a4270', '#efe4ff', '#3a3358', '#5a5185', '#ff9fc4'],
  Matcha: ['#d4e2c0', '#415730', '#f8faf3', '#cadab3', '#e8a598'],
  Pastel: ['#e1d4f9', '#4d4073', '#fef8ff', '#f3d9ed', '#fbbac8'],
};

export const createBlankSlot = () => ({
  s: '',
  w: 0,
  h: 0,
  x: 0,
  y: 0,
  z: 1,
});

export const STICKY_COLORS = [
  { name: 'Amarillo', bg: '#fff8b8', border: '#e8dc88', tape: 'rgba(255, 180, 200, 0.75)' },
  { name: 'Rosa', bg: '#ffd9e8', border: '#f2b5ce', tape: 'rgba(180, 230, 210, 0.75)' },
  { name: 'Menta', bg: '#d4f5e5', border: '#aee3ca', tape: 'rgba(255, 200, 180, 0.75)' },
  { name: 'Celeste', bg: '#d6edff', border: '#b2daf8', tape: 'rgba(255, 220, 160, 0.75)' },
  { name: 'Lavanda', bg: '#edd6ff', border: '#d5b2f6', tape: 'rgba(180, 220, 240, 0.75)' },
  { name: 'Durazno', bg: '#ffe5cc', border: '#f5cbb0', tape: 'rgba(200, 180, 240, 0.75)' },
];

export const createBlankCard = (id?: string) => ({
  id: id || Math.random().toString(36).slice(2, 9),
  name: '',
  age: '',
  gen: '',
  race: '',
  fand: '',
  av: createBlankSlot(),
  h: [createBlankSlot(), createBlankSlot(), createBlankSlot()] as [
    ReturnType<typeof createBlankSlot>,
    ReturnType<typeof createBlankSlot>,
    ReturnType<typeof createBlankSlot>
  ],
  o: [0, 1, 2] as [number, number, number],
  pal: null as Palette | null,
  font: 'Patrick Hand',
  fontFamily: 'Patrick Hand',
  paperPattern: 'none' as import('./patternUtils').PaperPatternId,
  pt: '',
  pc: '',
  lk: false,
  tags: [] as string[],
  notes: [] as import('../types/album').StickyNote[],
  fav: false,
  ts: Date.now(),
});
