import type { CursorState, Layer, LayerRenderContext, PlotTheme } from "../types";
import type { CursorStyle } from "../types";

const DEFAULT_LINE_WIDTH = 1;
const HIGHLIGHT_RADIUS = 4;

export interface CursorLayer extends Layer {
  setCursor(cursor: CursorState | null): void;
  setStyle(style: CursorStyle): void;
}

export function createCursorLayer(
  theme: PlotTheme,
  style: CursorStyle
): CursorLayer {
  let visible = true;
  let zIndex = 1000;
  let currentCursor: CursorState | null = null;
  let currentStyle: CursorStyle = style;

  return {
    id: "cursor-layer",
    phase: "cursor",
    get visible() {
      return visible;
    },
    set visible(value: boolean) {
      visible = value;
    },
    get zIndex() {
      return zIndex;
    },
    set zIndex(value: number) {
      zIndex = value;
    },
    setCursor(cursor: CursorState | null) {
      currentCursor = cursor;
    },
    setStyle(style: CursorStyle) {
      currentStyle = style;
    },
    draw(ctx: CanvasRenderingContext2D, context: LayerRenderContext) {
      if (!visible) return;
      if (!currentCursor) return;
      if (currentStyle === "none") return;
      const { viewport } = context;
      const rect = viewport.rect;
      ctx.save();
      ctx.strokeStyle = theme.cursorLineColor ?? "rgba(255,255,255,0.7)";
      ctx.lineWidth = DEFAULT_LINE_WIDTH;
      ctx.setLineDash([]);

      const x = currentCursor.canvasX;
      const y = currentCursor.canvasY;

      if (currentStyle === "crosshair" || currentStyle === "horizontal") {
        ctx.beginPath();
        ctx.moveTo(rect.left, y);
        ctx.lineTo(rect.right, y);
        ctx.stroke();
      }

      if (currentStyle === "crosshair" || currentStyle === "vertical") {
        ctx.beginPath();
        ctx.moveTo(x, rect.top);
        ctx.lineTo(x, rect.bottom);
        ctx.stroke();
      }

      ctx.strokeStyle = theme.cursorHighlightColor ?? "#ffff7a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, HIGHLIGHT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    },
  };
}
