function estimateLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0.5;
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkColor(color: string): boolean {
  return estimateLuminance(color) < 0.5;
}

export function parseColor(
  color: string
): { r: number; g: number; b: number } | null {
  if (!color) return null;
  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }
  const hex6Match = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hex6Match) {
    const hex = hex6Match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)/
  );
  if (rgbMatch) {
    const r = Number.parseFloat(rgbMatch[1]);
    const g = Number.parseFloat(rgbMatch[2]);
    const b = Number.parseFloat(rgbMatch[3]);
    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    };
  }
  return null;
}
