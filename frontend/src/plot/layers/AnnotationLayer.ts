import type {
  AnnotationDefinition,
  AnnotationLayerHandle,
  AnnotationLayerOptions,
  Layer,
  LayerCreateContext,
  LayerRenderContext,
} from "../types";

export interface AnnotationLayer extends Layer, AnnotationLayerHandle {}

let counter = 0;

export function createAnnotationLayer(
  context: LayerCreateContext,
  options: AnnotationLayerOptions = {}
): AnnotationLayer {
  const id = options.id ?? `annotation-${counter++}`;
  const annotations = new Map<string, AnnotationDefinition>();
  let visible = true;
  let zIndex = 900;

  const invalidateLayer = () => context.invalidateLayer(id);

  const setAnnotations = (defs: AnnotationDefinition[]) => {
    annotations.clear();
    for (const def of defs) {
      annotations.set(def.id, def);
    }
    invalidateLayer();
  };

  if (Array.isArray(options.annotations)) {
    setAnnotations(options.annotations);
  }

  const add = (annotation: AnnotationDefinition) => {
    annotations.set(annotation.id, annotation);
    invalidateLayer();
  };

  const remove = (annotationId: string) => {
    annotations.delete(annotationId);
    invalidateLayer();
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    annotation: Extract<AnnotationDefinition, { type: "line" }>,
    renderContext: LayerRenderContext
  ) => {
    const x = renderContext.viewport.projectX(annotation.x);
    ctx.save();
    ctx.strokeStyle = annotation.color ?? "#ffeb3b";
    ctx.lineWidth = annotation.width ?? 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, renderContext.viewport.rect.top);
    ctx.lineTo(x, renderContext.viewport.rect.top + renderContext.viewport.rect.height);
    ctx.stroke();
    ctx.restore();
  };

  const drawSpan = (
    ctx: CanvasRenderingContext2D,
    annotation: Extract<AnnotationDefinition, { type: "span" }>,
    renderContext: LayerRenderContext
  ) => {
    const x0 = renderContext.viewport.projectX(annotation.x0);
    const x1 = renderContext.viewport.projectX(annotation.x1);
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    ctx.save();
    ctx.fillStyle = annotation.fill ?? "rgba(255, 235, 59, 0.2)";
    if (annotation.opacity !== undefined) {
      ctx.globalAlpha = annotation.opacity;
    }
    ctx.fillRect(
      left,
      renderContext.viewport.rect.top,
      right - left,
      renderContext.viewport.rect.height
    );

    if (annotation.color) {
      ctx.strokeStyle = annotation.color;
      ctx.beginPath();
      ctx.moveTo(left, renderContext.viewport.rect.top);
      ctx.lineTo(left, renderContext.viewport.rect.top + renderContext.viewport.rect.height);
      ctx.moveTo(right, renderContext.viewport.rect.top);
      ctx.lineTo(right, renderContext.viewport.rect.top + renderContext.viewport.rect.height);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawPoint = (
    ctx: CanvasRenderingContext2D,
    annotation: Extract<AnnotationDefinition, { type: "point" }>,
    renderContext: LayerRenderContext
  ) => {
    const x = renderContext.viewport.projectX(annotation.x);
    const y = renderContext.viewport.projectY(annotation.y);
    ctx.save();
    ctx.fillStyle = annotation.color ?? "#ffeb3b";
    ctx.beginPath();
    ctx.arc(x, y, annotation.radius ?? 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  return {
    id,
    phase: "foreground",
    get visible() {
      return visible;
    },
    set visible(value: boolean) {
      visible = value;
      invalidateLayer();
    },
    get zIndex() {
      return zIndex;
    },
    set zIndex(value: number) {
      zIndex = value;
      context.notifyLayerOrderChange();
      invalidateLayer();
    },
    draw(ctx: CanvasRenderingContext2D, context: LayerRenderContext) {
      if (!visible) return;
      annotations.forEach((annotation) => {
        if (annotation.visible === false) {
          return;
        }
        switch (annotation.type) {
          case "line":
            drawLine(ctx, annotation, context);
            break;
          case "span":
            drawSpan(ctx, annotation, context);
            break;
          case "point":
            drawPoint(ctx, annotation, context);
            break;
        }
      });
    },
    setVisible(value: boolean) {
      visible = value;
      invalidateLayer();
    },
    remove() {
      annotations.clear();
      invalidateLayer();
    },
    addAnnotation(annotation: AnnotationDefinition) {
      add(annotation);
    },
    upsertAnnotations(defs: AnnotationDefinition[]) {
      setAnnotations(defs);
    },
    deleteAnnotation(annotationId: string) {
      remove(annotationId);
    },
  } as AnnotationLayer;
}
