import { Palette } from '../types/album';
import { BGURL, FRAME } from '../assets/templateAssets';
import { W, H, ROLES, DEF_PALETTE } from './constants';

let _h = 0;
let _s = 0;
let _l = 0;
let _r = 0;
let _g = 0;
let _b = 0;

export function hsl(r: number, g: number, b: number): void {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  _l = (mx + mn) / 2;
  _s = 0;
  _h = 0;
  if (d > 1e-6) {
    _s = d / (1 - Math.abs(2 * _l - 1));
    _h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    _h *= 60;
    if (_h < 0) _h += 360;
  }
}

export function rgbOf(h: number, s: number, l: number): void {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  _r = (r + m) * 255;
  _g = (g + m) * 255;
  _b = (b + m) * 255;
}

export function hexOf(h: number, s: number, l: number): string {
  rgbOf(h, s, l);
  return (
    '#' +
    [_r, _g, _b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexHsl(hex: string): [number, number, number] {
  hsl(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  );
  return [_h, _s, _l];
}

export function roleOf(h: number, s: number, l: number): number {
  if (s < 0.08) return 0;
  if (h >= 238 && h < 335) return l < 0.47 ? 2 : 1;
  if ((h >= 335 || h < 22) && s >= 0.3 && l < 0.915) return 4;
  if ((h < 60 || h >= 335) && l >= 0.915 && s >= 0.15) return 3;
  return 0;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });

export interface ColorEngineState {
  isReady: boolean;
  bgCanvas: HTMLCanvasElement;
  frameCanvas: HTMLCanvasElement;
  frameDataUrl: string;
  defaultPalette: Palette;
  recolor: (palette: Palette) => void;
  getFrameDataUrl: () => string;
}

let engineInstance: ColorEngineState | null = null;
let initPromise: Promise<ColorEngineState> | null = null;

export function initColorEngine(): Promise<ColorEngineState> {
  if (engineInstance) return Promise.resolve(engineInstance);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const [bgImg, frameImg] = await Promise.all([loadImage(BGURL), loadImage(FRAME)]);

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = W;
    bgCanvas.height = H;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.drawImage(bgImg, 0, 0, W, H);

    const outImageData = bgCtx.getImageData(0, 0, W, H);
    const srcData = new Uint8ClampedArray(outImageData.data);

    const N = W * H;
    const RL = new Uint8Array(N);
    const HU = new Float32Array(N);
    const SS = new Float32Array(N);
    const LL = new Float32Array(N);

    const A = [0, 1, 2, 3, 4].map(() => ({ n: 0, x: 0, y: 0, s: 0, l: 0 }));
    const idxList: number[] = [];

    for (let i = 0, p = 0; i < N; i++, p += 4) {
      hsl(srcData[p], srcData[p + 1], srcData[p + 2]);
      HU[i] = _h;
      SS[i] = _s;
      LL[i] = _l;
      const r = roleOf(_h, _s, _l);
      RL[i] = r;
      if (r) {
        idxList.push(i);
        const px = i % W;
        const py = (i / W) | 0;
        if (r !== 3 || (px > 215 && px < 700 && py > 300 && py < 1000)) {
          const a = A[r];
          a.n++;
          a.x += Math.cos((_h * Math.PI) / 180);
          a.y += Math.sin((_h * Math.PI) / 180);
          a.s += _s;
          a.l += _l;
        }
      }
    }

    const IDX = Int32Array.from(idxList);
    const REF: Record<number, { h: number; s: number; l: number }> = {};
    for (let r = 1; r <= 4; r++) {
      const a = A[r];
      REF[r] = {
        h: (Math.atan2(a.y, a.x) * 180 / Math.PI + 360) % 360,
        s: a.n ? a.s / a.n : 0.5,
        l: a.n ? a.l / a.n : 0.5,
      };
    }

    const initialPalette: Palette = { ...DEF_PALETTE };
    ROLES.forEach(([k, , , r]) => {
      if (r && REF[r]) {
        initialPalette[k] = hexOf(REF[r].h, REF[r].s, REF[r].l);
      }
    });

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = frameImg.width;
    frameCanvas.height = frameImg.height;
    const frameCtx = frameCanvas.getContext('2d')!;
    frameCtx.drawImage(frameImg, 0, 0);
    const fsrcImageData = frameCtx.getImageData(0, 0, frameImg.width, frameImg.height);
    let frameDataUrl = frameCanvas.toDataURL();

    const computeDeltas = (p: Palette) => {
      const D: Record<number, { dh: number; ss: number; dl: number }> = {};
      ROLES.forEach(([k, , , r]) => {
        if (!r || !REF[r]) return;
        const [h, s, l] = hexHsl(p[k]);
        const f = REF[r];
        D[r] = {
          dh: h - f.h,
          ss: f.s > 0.01 ? s / f.s : 1,
          dl: l - f.l,
        };
      });
      return D;
    };

    const recolor = (palette: Palette) => {
      const D = computeDeltas(palette);
      const outData = outImageData.data;
      outData.set(srcData);

      for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        const d = D[RL[i]];
        if (!d) continue;
        let h = (HU[i] + d.dh) % 360;
        if (h < 0) h += 360;
        let s = SS[i] * d.ss;
        if (s > 1) s = 1;
        let l = LL[i] + d.dl;
        l = l < 0 ? 0 : l > 1 ? 1 : l;
        rgbOf(h, s, l);
        const q = i * 4;
        outData[q] = _r;
        outData[q + 1] = _g;
        outData[q + 2] = _b;
      }
      bgCtx.putImageData(outImageData, 0, 0);

      const fImgData = new ImageData(
        new Uint8ClampedArray(fsrcImageData.data),
        fsrcImageData.width,
        fsrcImageData.height
      );
      const fo = fImgData.data;
      for (let q = 0; q < fo.length; q += 4) {
        if (fo[q + 3] < 8) continue;
        hsl(fo[q], fo[q + 1], fo[q + 2]);
        const r = roleOf(_h, _s, _l);
        const d = D[r];
        if (!d) continue;
        let h = (_h + d.dh) % 360;
        if (h < 0) h += 360;
        let s = _s * d.ss;
        if (s > 1) s = 1;
        let l = _l + d.dl;
        l = l < 0 ? 0 : l > 1 ? 1 : l;
        rgbOf(h, s, l);
        fo[q] = _r;
        fo[q + 1] = _g;
        fo[q + 2] = _b;
      }
      frameCtx.putImageData(fImgData, 0, 0);
      frameDataUrl = frameCanvas.toDataURL();
    };

    // Run initial recolor with default
    recolor(initialPalette);

    engineInstance = {
      isReady: true,
      bgCanvas,
      frameCanvas,
      frameDataUrl,
      defaultPalette: initialPalette,
      recolor,
      getFrameDataUrl: () => frameDataUrl,
    };

    return engineInstance;
  })();

  return initPromise;
}
