import type {
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
  let visible = true;
  let zIndex = 0;
  void context;
  const notReady = (...args: unknown[]) => {
    void args;
    throw new Error(`AnnotationLayer ${id} not implemented yet`);
  };

  return {
    id,
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
      void ctx;
      void renderContext;
      notReady();
    },
    setVisible(value: boolean) {
      visible = value;
    },
    remove() {
      notReady();
    },
  };
}
