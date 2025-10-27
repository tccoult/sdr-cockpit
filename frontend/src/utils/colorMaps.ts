/**
 * Color map definitions for waterfall and FFT displays
 * Inspired by GQRX, OpenWebRx, and scientific visualization libraries
 */

export interface ColorMap {
  name: string;
  id: string;
  colors: [number, number, number][]; // RGB tuples (0-255)
}

/**
 * Interpolate between two RGB colors
 */
function interpolateRGB(
  color1: [number, number, number],
  color2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t),
  ];
}

/**
 * Build a 256-entry lookup table from a color map
 */
export function buildColorLUT(colorMap: ColorMap): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  const colors = colorMap.colors;

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const segmentLength = 1 / (colors.length - 1);
    const segmentIndex = Math.min(
      Math.floor(t / segmentLength),
      colors.length - 2
    );
    const segmentT = (t - segmentIndex * segmentLength) / segmentLength;

    const rgb = interpolateRGB(
      colors[segmentIndex],
      colors[segmentIndex + 1],
      segmentT
    );

    lut[i * 4 + 0] = rgb[0]; // R
    lut[i * 4 + 1] = rgb[1]; // G
    lut[i * 4 + 2] = rgb[2]; // B
    lut[i * 4 + 3] = 255;     // A
  }

  return lut;
}

/**
 * Convert dB value to color index (0-255)
 */
export function dbToColorIndex(dbValue: number, minDb: number = -100, maxDb: number = 0): number {
  const normalized = (dbValue - minDb) / (maxDb - minDb);
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 255);
}

/**
 * Google Turbo - Perceptually uniform, vibrant, good contrast
 * From OpenWebRx and Google's Turbo colormap
 */
export const TURBO: ColorMap = {
  name: 'Turbo',
  id: 'turbo',
  colors: [
    [48, 18, 59],
    [62, 73, 137],
    [72, 126, 186],
    [64, 176, 166],
    [97, 214, 106],
    [156, 238, 69],
    [221, 246, 70],
    [253, 206, 51],
    [250, 156, 40],
    [240, 92, 42],
    [208, 33, 39],
    [122, 4, 3],
  ],
};

/**
 * Viridis - Perceptually uniform, colorblind-friendly
 * Popular in scientific visualization
 */
export const VIRIDIS: ColorMap = {
  name: 'Viridis',
  id: 'viridis',
  colors: [
    [68, 1, 84],
    [72, 40, 120],
    [62, 73, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ],
};

/**
 * Hot/Jet - Classic SDR/RF colormap
 * Black → Red → Yellow → White
 */
export const HOT: ColorMap = {
  name: 'Hot',
  id: 'hot',
  colors: [
    [0, 0, 0],
    [128, 0, 0],
    [255, 0, 0],
    [255, 128, 0],
    [255, 255, 0],
    [255, 255, 128],
    [255, 255, 255],
  ],
};

/**
 * Plasma - Modern, vibrant, perceptually uniform
 */
export const PLASMA: ColorMap = {
  name: 'Plasma',
  id: 'plasma',
  colors: [
    [13, 8, 135],
    [84, 2, 163],
    [139, 10, 165],
    [185, 50, 137],
    [219, 92, 104],
    [244, 136, 73],
    [254, 188, 43],
    [240, 249, 33],
  ],
};

/**
 * Monochrome Green - Retro CRT phosphor aesthetic
 */
export const GREEN: ColorMap = {
  name: 'Monochrome Green',
  id: 'green',
  colors: [
    [0, 0, 0],
    [0, 32, 0],
    [0, 64, 0],
    [0, 128, 0],
    [0, 192, 0],
    [0, 255, 0],
    [128, 255, 128],
  ],
};

/**
 * Monochrome Blue - Cool, low eye strain
 */
export const BLUE: ColorMap = {
  name: 'Monochrome Blue',
  id: 'blue',
  colors: [
    [0, 0, 0],
    [0, 0, 64],
    [0, 0, 128],
    [0, 64, 192],
    [0, 128, 255],
    [64, 192, 255],
    [128, 224, 255],
  ],
};

/**
 * Inferno - Warm, high contrast
 */
export const INFERNO: ColorMap = {
  name: 'Inferno',
  id: 'inferno',
  colors: [
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [159, 42, 99],
    [212, 72, 66],
    [245, 125, 21],
    [250, 193, 39],
    [252, 255, 164],
  ],
};

/**
 * Magma - Purple to orange, perceptually uniform
 */
export const MAGMA: ColorMap = {
  name: 'Magma',
  id: 'magma',
  colors: [
    [0, 0, 4],
    [28, 16, 68],
    [79, 18, 123],
    [129, 37, 129],
    [181, 54, 122],
    [229, 80, 100],
    [251, 136, 97],
    [254, 194, 135],
    [252, 253, 191],
  ],
};

/**
 * All available color maps
 */
export const COLOR_MAPS: ColorMap[] = [
  TURBO,
  VIRIDIS,
  PLASMA,
  INFERNO,
  MAGMA,
  HOT,
  GREEN,
  BLUE,
];

/**
 * Default color map
 */
export const DEFAULT_COLOR_MAP = TURBO;
