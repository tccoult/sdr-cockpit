/**
 * Shared helpers for working with CSS custom properties that power theming.
 */

/**
 * Read a CSS variable from the root document element.
 */
export function getCSSVariable(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Convert an RGB triplet string (e.g. "124 131 255") to a hex color.
 */
export function rgbStringToHex(rgb: string): string {
  const [r, g, b] = rgb.split(" ").map(Number);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "";
  return (
    "#" +
    [r, g, b]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Convert an RGB triplet string to an `rgb(r, g, b)` CSS string.
 */
export function rgbStringToCssRgb(rgb: string): string {
  if (!rgb) return "";
  return `rgb(${rgb.replace(/\s+/g, " ")})`;
}
