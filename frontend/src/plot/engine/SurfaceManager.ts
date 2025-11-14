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
  readonly canvas: HTMLCanvasElement;
};

export function createSurfaceManager(
  options: SurfaceManagerOptions
): SurfaceManager {
  const { rootCanvas } = options;
  const rootParent = rootCanvas.parentNode;
  const nextSibling = rootCanvas.nextSibling as ChildNode | null;
  const previousStyle = rootCanvas.getAttribute("style");
  const previousClass = rootCanvas.getAttribute("class");

  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.display = "block";
  container.style.flex = "1 1 auto";
  container.style.minWidth = "0";
  container.style.minHeight = "0";
  if (previousClass) {
    container.setAttribute("class", previousClass);
  }

  const staticCanvas = document.createElement("canvas");
  const overlayCanvas = document.createElement("canvas");
  const dataCanvas = rootCanvas;

  const surfaceStates = new Map<PlotSurface, SurfaceState>();
  let lastDimensions: PlotDimensions | null = null;

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

  applyCanvasStyles(staticCanvas, "none");
  applyCanvasStyles(dataCanvas, "none");
  applyCanvasStyles(overlayCanvas, "auto");

  if (!rootParent) {
    throw new Error("Plot canvas must have a parent node");
  }
  rootParent.insertBefore(container, nextSibling);
  container.appendChild(staticCanvas);
  container.appendChild(dataCanvas);
  container.appendChild(overlayCanvas);

  const createHandle = (
    surface: PlotSurface,
    canvas: HTMLCanvasElement
  ): SurfaceHandle => {
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
        ctx.setTransform(dims.devicePixelRatio, 0, 0, dims.devicePixelRatio, 0, 0);
        dirty = true;
      },
    };
  };

  const registerSurface = (surface: PlotSurface, canvas: HTMLCanvasElement) => {
    const handle = createHandle(surface, canvas);
    surfaceStates.set(surface, { handle, canvas });
    if (lastDimensions) {
      handle.resize(lastDimensions);
    }
    return handle;
  };

  registerSurface("static", staticCanvas);
  registerSurface("data", dataCanvas);
  registerSurface("overlay", overlayCanvas);

  const isDataSurface = (surface: PlotSurface) =>
    surface === "data" || surface.startsWith("data:");

  const ensureSurface = (surface: PlotSurface): SurfaceHandle => {
    const existing = surfaceStates.get(surface);
    if (existing) {
      return existing.handle;
    }
    if (!isDataSurface(surface)) {
      throw new Error(`Unknown plot surface "${surface}"`);
    }
    const canvas = document.createElement("canvas");
    applyCanvasStyles(canvas, "none");
    container.insertBefore(canvas, overlayCanvas);
    const handle = registerSurface(surface, canvas);
    return handle;
  };

  const updateBackground = (color: string) => {
    container.style.background = color;
  };

  const resizeAll = (dimensions: PlotDimensions) => {
    lastDimensions = dimensions;
    for (const state of surfaceStates.values()) {
      state.handle.resize(dimensions);
    }
  };

  const destroy = () => {
    for (const state of surfaceStates.values()) {
      if (state.canvas !== dataCanvas) {
        state.canvas.remove();
      }
    }
    if (previousStyle === null) {
      dataCanvas.removeAttribute("style");
    } else {
      dataCanvas.setAttribute("style", previousStyle);
    }
    if (previousClass !== null) {
      dataCanvas.setAttribute("class", previousClass);
    } else {
      dataCanvas.removeAttribute("class");
    }
    container.replaceWith(dataCanvas);
    surfaceStates.clear();
  };

  return {
    getSurface(surface: PlotSurface) {
      return ensureSurface(surface);
    },
    resizeAll,
    markSurface(surface: PlotSurface) {
      const handle = ensureSurface(surface);
      handle.markDirty();
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
