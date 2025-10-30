import { ColorMapName, type ColorStop, type CustomColorMap } from "./types";

type ColorMapDefinition = {
  name: ColorMapName;
  stops: ColorStop[];
};

const HEX_TO_RGB: Record<string, [number, number, number]> = {};

function hexToRgb(hex: string): [number, number, number] {
  if (HEX_TO_RGB[hex]) {
    return HEX_TO_RGB[hex];
  }

  const normalized = hex.replace(/^#/, "");
  const bigint = parseInt(normalized, 16);
  let r: number;
  let g: number;
  let b: number;

  if (normalized.length === 3) {
    r = ((bigint >> 8) & 0xf) * 17;
    g = ((bigint >> 4) & 0xf) * 17;
    b = (bigint & 0xf) * 17;
  } else {
    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;
  }

  const rgb: [number, number, number] = [r, g, b];
  HEX_TO_RGB[hex] = rgb;
  return rgb;
}

const PRESET_MAPS: ColorMapDefinition[] = [
  {
    name: ColorMapName.Plasma,
    stops: [
      { value: 0, color: "#0d0887" },
      { value: 0.25, color: "#7e03a8" },
      { value: 0.5, color: "#cc4778" },
      { value: 0.75, color: "#f89441" },
      { value: 1, color: "#f0f921" },
    ],
  },
  {
    name: ColorMapName.Viridis,
    stops: [
      { value: 0, color: "#440154" },
      { value: 0.25, color: "#3b528b" },
      { value: 0.5, color: "#21918c" },
      { value: 0.75, color: "#5ec962" },
      { value: 1, color: "#fde725" },
    ],
  },
  {
    name: ColorMapName.Turbo,
    stops: [
      { value: 0, color: "#30123b" },
      { value: 0.25, color: "#4145ab" },
      { value: 0.5, color: "#2fb884" },
      { value: 0.75, color: "#e6d450" },
      { value: 1, color: "#fc641b" },
    ],
  },
  {
    name: ColorMapName.Grayscale,
    stops: [
      { value: 0, color: "#000000" },
      { value: 1, color: "#ffffff" },
    ],
  },
  {
    name: ColorMapName.Jet,
    stops: [
      { value: 0, color: "#00007f" },
      { value: 0.35, color: "#007fff" },
      { value: 0.5, color: "#7fff7f" },
      { value: 0.75, color: "#ff7f00" },
      { value: 1, color: "#7f0000" },
    ],
  },
  {
    name: ColorMapName.Hot,
    stops: [
      { value: 0, color: "#0b0000" },
      { value: 0.3, color: "#ff0000" },
      { value: 0.6, color: "#ffff00" },
      { value: 1, color: "#ffffff" },
    ],
  },
  {
    name: ColorMapName.Cool,
    stops: [
      { value: 0, color: "#00ffff" },
      { value: 1, color: "#ff00ff" },
    ],
  },
];

const PRESET_LOOKUP = new Map<ColorMapName, ColorStop[]>(
  PRESET_MAPS.map((map) => [map.name, map.stops])
);

export function resolveColorMap(
  map: ColorMapName | CustomColorMap
): ColorStop[] {
  if (typeof map === "string") {
    return PRESET_LOOKUP.get(map) ?? PRESET_LOOKUP.get(ColorMapName.Viridis)!;
  }
  return map.stops.length > 0 ? map.stops : PRESET_LOOKUP.get(ColorMapName.Viridis)!;
}

export function colorForValue(
  value: number,
  stops: ColorStop[],
  opacity = 1
): [number, number, number, number] {
  if (stops.length === 0) {
    return [255, 255, 255, Math.round(opacity * 255)];
  }

  if (value <= stops[0].value) {
    const [r, g, b] = hexToRgb(stops[0].color);
    return [r, g, b, Math.round(opacity * 255)];
  }

  for (let i = 1; i < stops.length; i += 1) {
    const stop = stops[i];
    const prev = stops[i - 1];
    if (value <= stop.value) {
      const t = (value - prev.value) / (stop.value - prev.value || 1);
      const [r1, g1, b1] = hexToRgb(prev.color);
      const [r2, g2, b2] = hexToRgb(stop.color);
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return [r, g, b, Math.round(opacity * 255)];
    }
  }

  const [r, g, b] = hexToRgb(stops[stops.length - 1].color);
  return [r, g, b, Math.round(opacity * 255)];
}
