import type { PlotDimensions, PlotSurface } from "../types";

export interface SurfaceManagerOptions {
  rootCanvas: HTMLCanvasElement;
}

export interface SurfaceHandle {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  isDirty(): boolean;
  markDirty(): void;
  markClean(): void;
  clear(): void;
  resize(dimensions: PlotDimensions): void;
}

export interface SurfaceManager {
  getSurface(surface: PlotSurface): SurfaceHandle;
  resizeAll(dimensions: PlotDimensions): void;
  markSurface(surface: PlotSurface): void;
  setBackgroundColor(color: string): void;
  getBoundingClientRect(): DOMRectReadOnly;
  destroy(): void;
}

type SurfaceState = {
  readonly handle: SurfaceHandle;
};

const SURFACE_Z_ORDER: PlotSurface[] = ["static", "data", "overlay"];

export function createSurfaceManager(
  options: SurfaceManagerOptions
): SurfaceManager {
  const { rootCanvas } = options;
  const rootParent = rootCanvas.parentNode;
  const nextSibling = rootCanvas.nextSibling as ChildNode | null;
  const previousStyle = rootCanvas.getAttribute("style");

  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.display = "block";

  const canvases: Record<PlotSurface, HTMLCanvasElement> = {
    static: document.createElement("canvas"),
    data: rootCanvas,
    overlay: document.createElement("canvas"),
  };

  const surfaceStates = new Map<PlotSurface, SurfaceState>();

  const ensureContext = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Plot engine requires a 2D canvas context");
    }
    return ctx;
  };

  const applyCanvasStyles = (
    canvas: HTMLCanvasElement,
    pointerEvents: "auto" | "none"
  ) => {
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = pointerEvents;
  };

  applyCanvasStyles(canvases.static, "none");
  applyCanvasStyles(canvases.data, "none");
  applyCanvasStyles(canvases.overlay, "auto");

  if (!rootParent) {
    throw new Error("Plot canvas must have a parent node");
  }
  rootParent.insertBefore(container, nextSibling);
  container.appendChild(canvases.static);
  container.appendChild(canvases.data);
  container.appendChild(canvases.overlay);

  const createHandle = (surface: PlotSurface): SurfaceHandle => {
    const canvas = canvases[surface];
    const ctx = ensureContext(canvas);
    let dirty = true;
    let dimensions: PlotDimensions = {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
    };

    return {
      canvas,
      ctx,
      isDirty: () => dirty,
      markDirty: () => {
        dirty = true;
      },
      markClean: () => {
        dirty = false;
      },
      clear: () => {
        const { width, height } = dimensions;
        if (width <= 0 || height <= 0) return;
        ctx.clearRect(0, 0, width, height);
      },
      resize: (dims: PlotDimensions) => {
        dimensions = dims;
        const pixelWidth = Math.max(
          1,
          Math.round(dims.width * dims.devicePixelRatio)
        );
        const pixelHeight = Math.max(
          1,
          Math.round(dims.height * dims.devicePixelRatio)
        );
        if (canvas.width !== pixelWidth) {
          canvas.width = pixelWidth;
        }
        if (canvas.height !== pixelHeight) {
          canvas.height = pixelHeight;
        }
        canvas.style.width = `${Math.max(1, Math.round(dims.width))}px`;
        canvas.style.height = `${Math.max(1, Math.round(dims.height))}px`;
        ctx.setTransform(dims.devicePixelRatio, 0, 0, dims.devicePixelRatio, 0, 0);
        dirty = true;
      },
    };
  };

  for (const surface of SURFACE_Z_ORDER) {
    surfaceStates.set(surface, {
      handle: createHandle(surface),
    });
  }

  const updateBackground = (color: string) => {
    container.style.background = color;
  };

  const resizeAll = (dimensions: PlotDimensions) => {
    for (const surface of SURFACE_Z_ORDER) {
      const state = surfaceStates.get(surface);
      if (!state) continue;
      state.handle.resize(dimensions);
    }
  };

  const destroy = () => {
    for (const surface of SURFACE_Z_ORDER) {
      const state = surfaceStates.get(surface);
      if (!state) continue;
      if (state.handle.canvas !== canvases.data) {
        state.handle.canvas.remove();
      }
    }
    if (previousStyle === null) {
      canvases.data.removeAttribute("style");
    } else {
      canvases.data.setAttribute("style", previousStyle);
    }
    container.replaceWith(canvases.data);
    surfaceStates.clear();
  };

  return {
    getSurface(surface: PlotSurface) {
      const state = surfaceStates.get(surface);
      if (!state) {
        throw new Error(`Unknown plot surface "${surface}"`);
      }
      return state.handle;
    },
    resizeAll,
    markSurface(surface: PlotSurface) {
      const state = surfaceStates.get(surface);
      if (!state) return;
      state.handle.markDirty();
    },
    setBackgroundColor(color: string) {
      updateBackground(color);
    },
    getBoundingClientRect() {
      return container.getBoundingClientRect();
    },
    destroy,
  };
}
