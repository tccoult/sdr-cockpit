export function createDomRect(
  x: number,
  y: number,
  width: number,
  height: number
): DOMRectReadOnly {
  if (typeof DOMRect === "function") {
    return new DOMRect(x, y, width, height);
  }

  const left = x;
  const top = y;
  const right = x + width;
  const bottom = y + height;

  return {
    x,
    y,
    width,
    height,
    top,
    right,
    bottom,
    left,
    toJSON() {
      return { x, y, width, height, top, right, bottom, left };
    },
  } as DOMRectReadOnly;
}
