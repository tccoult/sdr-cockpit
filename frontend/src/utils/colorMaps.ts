/**
 * Color map definitions for waterfall and FFT displays
 */

export interface ColorMap {
  name: string;
  id: string;
  colors: [number, number, number][]; // RGB tuples (0-255)
}

export type ColorMapInput = ColorMap | Uint8ClampedArray | string | undefined;

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

export const VIRIDIS: ColorMap = {
  name: "Viridis",
  id: "viridis",
  colors: [
    [68, 1, 84],
    [58, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
};

export const GRAYSCALE: ColorMap = {
  name: "Grayscale",
  id: "grayscale",
  colors: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
};

export const DEFAULT_COLOR_MAPS: Record<string, ColorMap> = {
  [PLASMA.id]: PLASMA,
  [VIRIDIS.id]: VIRIDIS,
  [GRAYSCALE.id]: GRAYSCALE,
};

function isColorMap(value: unknown): value is ColorMap {
  return (
    typeof value === "object" &&
    value !== null &&
    "colors" in (value as Record<string, unknown>)
  );
}

export function resolveColorMap(input: ColorMapInput): Uint8ClampedArray {
  if (input instanceof Uint8ClampedArray) {
    return input;
  }
  if (typeof input === "string") {
    const key = input.toLowerCase();
    const map = DEFAULT_COLOR_MAPS[key] ?? PLASMA;
    return buildColorLUT(map);
  }
  if (isColorMap(input)) {
    return buildColorLUT(input);
  }
  return buildColorLUT(PLASMA);
}
