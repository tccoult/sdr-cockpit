import { buildColorLUT, PLASMA } from "../../utils/colorMaps";

const cache = new Map<string, Uint8ClampedArray>();

const DEFAULT_NAME = "plasma+";

function getPreset(name: string): Uint8ClampedArray {
  const key = name.toLowerCase();
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  switch (key) {
    case "plasma+":
    case "default": {
      const lut = buildColorLUT(PLASMA);
      cache.set(key, lut);
      return lut;
    }
    case "plasma": {
      const lut = buildColorLUT(PLASMA);
      cache.set(key, lut);
      return lut;
    }
    default: {
      // Unknown name, fall back to plasma.
      return getPreset(DEFAULT_NAME);
    }
  }
}

export function resolveColormap(
  colormap?: string | Uint8ClampedArray
): Uint8ClampedArray {
  if (colormap instanceof Uint8ClampedArray) {
    return colormap;
  }
  const name = colormap ?? DEFAULT_NAME;
  return getPreset(name);
}
