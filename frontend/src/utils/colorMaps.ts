/**
 * Color map definitions for waterfall and FFT displays
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
    lut[i * 4 + 3] = 255; // A
  }

  return lut;
}

/**
 * Plasma - Modern, vibrant, perceptually uniform
 */
export const PLASMA: ColorMap = {
  name: "Plasma",
  id: "plasma",
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
