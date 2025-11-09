import type { AxisModel } from "./AxisModel";
import type { AxisOptions, AxisTheme, AxisSide, Tick } from "./axisTypes";
import type { Layer, LayerRenderContext } from "../types";

const SIDE_TO_PHASE: Record<AxisSide, "grid" | "foreground"> = {
  left: "foreground",
  right: "foreground",
  top: "foreground",
  bottom: "foreground",
};

export interface AxisLayerConfig {
  model: AxisModel;
  options: AxisOptions;
  theme: AxisTheme;
  drawGrid?: boolean;
}

let layerCounter = 0;

export function createAxisLayer(config: AxisLayerConfig): Layer {
  const id = config.options.side
    ? `axis-${config.options.side}-${layerCounter++}`
    : `axis-${layerCounter++}`;
  let visible = true;
  let zIndex = config.drawGrid ? -100 : 100;
  const phase = config.drawGrid ? "grid" : SIDE_TO_PHASE[config.options.side];

  return {
    id,
    phase,
    surface: "static",
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
    draw(ctx: CanvasRenderingContext2D, renderContext: LayerRenderContext) {
      if (!visible) return;
      const { viewport } = renderContext;
      const ticks = config.model.ticks();
      if (config.drawGrid) {
        drawGridLines(ctx, ticks, viewport.rect, config);
      } else {
        drawAxis(ctx, ticks, viewport.rect, config);
      }
    },
  };
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  ticks: Tick[],
  rect: DOMRectReadOnly,
  config: AxisLayerConfig
) {
  ctx.save();
  ctx.strokeStyle = config.theme.gridColor;
  ctx.lineWidth = 1;

  for (const tick of ticks) {
    ctx.beginPath();
    if (config.options.side === "left" || config.options.side === "right") {
      const y = rect.top + rect.height - tick.px;
      ctx.moveTo(rect.left, y);
      ctx.lineTo(rect.right, y);
    } else {
      const x = rect.left + tick.px;
      ctx.moveTo(x, rect.top);
      ctx.lineTo(x, rect.bottom);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawAxis(
  ctx: CanvasRenderingContext2D,
  ticks: Tick[],
  rect: DOMRectReadOnly,
  config: AxisLayerConfig
) {
  ctx.save();
  ctx.strokeStyle = config.theme.axisColor;
  ctx.fillStyle = config.theme.textColor;
  ctx.lineWidth = config.theme.lineWidth;
  ctx.font = config.theme.font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const side = config.options.side;
  const axisLine = () => {
    ctx.beginPath();
    if (side === "left") {
      const x = snap(rect.left);
      ctx.moveTo(x, rect.top);
      ctx.lineTo(x, rect.bottom);
    } else if (side === "right") {
      const x = snap(rect.right);
      ctx.moveTo(x, rect.top);
      ctx.lineTo(x, rect.bottom);
    } else if (side === "bottom") {
      const y = snap(rect.bottom);
      ctx.moveTo(rect.left, y);
      ctx.lineTo(rect.right, y);
    } else if (side === "top") {
      const y = snap(rect.top);
      ctx.moveTo(rect.left, y);
      ctx.lineTo(rect.right, y);
    }
    ctx.stroke();
  };

  axisLine();
  const tickSize = config.options.tickSizePx ?? 6;
  for (const tick of ticks) {
    ctx.beginPath();
    if (side === "left" || side === "right") {
      const y = snap(rect.top + rect.height - tick.px);
      const direction = side === "left" ? -1 : 1;
      const x = snap(side === "left" ? rect.left : rect.right);
      ctx.moveTo(x, y);
      ctx.lineTo(x + tickSize * direction, y);
      ctx.stroke();
      ctx.textAlign = side === "left" ? "right" : "left";
      ctx.fillText(
        tick.label,
        x + direction * (tickSize + config.theme.tickLabelPaddingPx),
        y
      );
    } else {
      const x = rect.left + tick.px;
      const direction = side === "top" ? -1 : 1;
      const y = snap(side === "top" ? rect.top : rect.bottom);
      const tickX = snap(x);
      ctx.moveTo(tickX, y);
      ctx.lineTo(tickX, y + tickSize * direction);
      ctx.stroke();
      ctx.textBaseline = side === "top" ? "bottom" : "top";
      ctx.fillText(
        tick.label,
        x,
        y + direction * (tickSize + config.theme.tickLabelPaddingPx)
      );
    }
  }

  if (config.options.label) {
    ctx.save();
    ctx.fillStyle = config.theme.textColor;
    const label = config.options.label;
    const padding = config.theme.labelPaddingPx;
    const tickLabelPadding = config.theme.tickLabelPaddingPx;
    if (side === "left") {
      // Calculate actual max tick label width for accurate positioning
      let maxTickLabelWidth = 0;
      for (const tick of ticks) {
        const width = ctx.measureText(tick.label).width;
        maxTickLabelWidth = Math.max(maxTickLabelWidth, width);
      }
      // Use minimal padding for y-axis to bring closer to edge
      const yAxisPadding = 6;
      ctx.translate(
        rect.left - (tickSize + tickLabelPadding) - maxTickLabelWidth - yAxisPadding,
        rect.top + rect.height / 2
      );
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, 0, 0);
    } else if (side === "right") {
      // Calculate actual max tick label width for accurate positioning
      let maxTickLabelWidth = 0;
      for (const tick of ticks) {
        const width = ctx.measureText(tick.label).width;
        maxTickLabelWidth = Math.max(maxTickLabelWidth, width);
      }
      const yAxisPadding = 6;
      ctx.translate(
        rect.right + (tickSize + tickLabelPadding) + maxTickLabelWidth + yAxisPadding,
        rect.top + rect.height / 2
      );
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, 0, 0);
    } else if (side === "top") {
      ctx.textBaseline = "bottom";
      ctx.textAlign = "center";
      ctx.fillText(label, rect.left + rect.width / 2, rect.top - (tickSize + tickLabelPadding) - padding);
    } else {
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      // Position below tick labels: tickSize + space for tick label text + padding
      ctx.fillText(
        label,
        rect.left + rect.width / 2,
        rect.bottom + tickSize + tickLabelPadding + padding
      );
    }
    ctx.restore();
  }

  ctx.restore();
}

const snap = (value: number) => Math.round(value) + 0.5;
