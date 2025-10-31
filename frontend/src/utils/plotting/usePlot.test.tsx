import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlot } from "./usePlot";
import type {
  PlotInstanceInternal,
  TraceData1D,
  TraceHandle1D,
} from "./types";
import { Trace1DType, CursorStyle } from "./types";

const baseConfig = {
  axes: {
    x: { label: "X", range: { min: 0, max: 1 } },
    y: { label: "Y", range: { min: 0, max: 1 } },
  },
} as const;

const sampleData: TraceData1D = {
  x: new Float32Array([0, 1]),
  y: new Float32Array([10, 20]),
};

function createMockCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "width", {
    value: width,
    writable: true,
  });
  Object.defineProperty(canvas, "height", {
    value: height,
    writable: true,
  });
  Object.defineProperty(canvas, "style", {
    value: { width: `${width}px`, height: `${height}px` },
    writable: true,
  });
  canvas.getBoundingClientRect = vi
    .fn()
    .mockReturnValue({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
    });

  const ctx = {
    canvas,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    fillText: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    get font() {
      return "";
    },
    set font(_: string) {},
    get textBaseline() {
      return "alphabetic";
    },
    set textBaseline(_: string) {},
    get textAlign() {
      return "left";
    },
    set textAlign(_: string) {},
    get lineWidth() {
      return 1;
    },
    set lineWidth(_: number) {},
    get strokeStyle() {
      return "#fff";
    },
    set strokeStyle(_: string) {},
    get fillStyle() {
      return "#000";
    },
    set fillStyle(_: string) {},
    get imageSmoothingEnabled() {
      return true;
    },
    set imageSmoothingEnabled(_: boolean) {},
    get globalAlpha() {
      return 1;
    },
    set globalAlpha(_: number) {},
  };

  vi.spyOn(canvas, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  );

  return canvas;
}

function attachCanvas(
  plot: PlotInstanceInternal,
  canvas: HTMLCanvasElement
) {
  (plot.canvasRef as unknown as { current: HTMLCanvasElement | null }).current =
    canvas;
}

describe("usePlot", () => {
  it("returns a stable instance across re-renders with identical config", () => {
    const { result, rerender } = renderHook(
      ({ cfg }) => usePlot(cfg),
      { initialProps: { cfg: baseConfig } }
    );

    const firstInstance = result.current;
    rerender({ cfg: baseConfig });
    expect(result.current).toBe(firstInstance);
  });

  it("creates, updates, and removes 1D traces", () => {
    const { result } = renderHook(() => usePlot(baseConfig));
    const plot = result.current as PlotInstanceInternal;
    expect(plot.__debug?.traceCount).toBe(0);

    let traceId: string | undefined;
    let handle!: TraceHandle1D;
    act(() => {
      handle = plot.addTrace1D({
        type: Trace1DType.Line,
        color: "#ff00ff",
      });
    });

    expect(plot.__debug?.traceCount).toBe(1);
    traceId = plot.__debug?.traceIds[0];
    expect(traceId).toBeDefined();

    act(() => {
      handle.update(sampleData);
    });

    expect(plot.__debug?.getTraceData(traceId!)).toEqual(sampleData);

    act(() => {
      handle.setVisible(false);
      handle.setConfig({ lineWidth: 2 });
    });

    act(() => {
      handle.remove();
    });

    expect(plot.__debug?.traceCount).toBe(0);
    expect(() => handle.update(sampleData)).toThrowError(
      /has been removed/
    );
  });

  it("clears traces via clearTraces()", () => {
    const { result } = renderHook(() => usePlot(baseConfig));
    const plot = result.current as PlotInstanceInternal;

    let handleA!: TraceHandle1D;
    let handleB!: TraceHandle1D;
    act(() => {
      handleA = plot.addTrace1D({
        type: Trace1DType.Line,
        color: "#ff0000",
      });
      handleB = plot.addTrace1D({
        type: Trace1DType.Line,
        color: "#00ff00",
      });
    });

    expect(plot.__debug?.traceCount).toBe(2);

    act(() => {
      plot.clearTraces();
    });

    expect(plot.__debug?.traceCount).toBe(0);
    expect(() => handleA.update(sampleData)).toThrowError(/removed/);
    expect(() => handleB.update(sampleData)).toThrowError(/removed/);
  });

  it("updates axis ranges", () => {
    const { result } = renderHook(() => usePlot(baseConfig));
    const plot = result.current;

    act(() => {
      plot.setAxisRange("x", -5, 5);
    });

    expect(plot.getAxisRange("x")).toEqual({ min: -5, max: 5 });
  });

  it("supports wheel zoom interactions", () => {
    const config = {
      axes: {
        x: { label: "X", range: { min: 0, max: 10 } },
        y: { label: "Y", range: { min: -5, max: 5 } },
      },
      interactions: {
        zoom: "x",
        pan: "x",
      },
    } as const;

    const { result } = renderHook(() => usePlot(config));
    const plot = result.current as PlotInstanceInternal;
    const canvas = createMockCanvas(800, 400);

    act(() => {
      attachCanvas(plot, canvas);
      plot.requestRender();
      plot.__debug?.flush?.();
    });

    const initialRange = plot.getAxisRange("x");

    act(() => {
      plot.__debug?.simulateWheel?.({
        clientX: 400,
        clientY: 200,
        deltaY: -1,
      });
      plot.__debug?.flush?.();
    });

    const zoomedRange = plot.getAxisRange("x");
    expect(zoomedRange.max - zoomedRange.min).toBeLessThan(
      initialRange.max - initialRange.min
    );
  });

  it("supports pointer pan interactions", () => {
    const config = {
      axes: {
        x: { label: "X", range: { min: 0, max: 10 } },
        y: { label: "Y", range: { min: -5, max: 5 } },
      },
      interactions: {
        pan: "x",
      },
    } as const;

    const { result } = renderHook(() => usePlot(config));
    const plot = result.current as PlotInstanceInternal;
    const canvas = createMockCanvas(800, 400);

    act(() => {
      attachCanvas(plot, canvas);
      plot.requestRender();
      plot.__debug?.flush?.();
    });

    const initialRange = plot.getAxisRange("x");
    const panListener = vi.fn();

    act(() => {
      plot.onPan(panListener);
    });

    act(() => {
      plot.__debug?.simulatePointerDown?.({ clientX: 400, clientY: 200, pointerId: 3 });
      plot.__debug?.simulatePointerMove?.({ clientX: 420, clientY: 200, pointerId: 3 });
      plot.__debug?.simulatePointerUp?.({ clientX: 420, clientY: 200, pointerId: 3 });
      plot.__debug?.flush?.();
    });

    const pannedRange = plot.getAxisRange("x");
    expect(pannedRange.min).not.toBe(initialRange.min);
    expect(panListener).toHaveBeenCalled();
  });

  it("snaps cursor to nearest data point when enabled", () => {
    const config = {
      axes: {
        x: { label: "X", range: { min: 0, max: 1 } },
        y: { label: "Y", range: { min: -1, max: 1 } },
      },
      interactions: {
        cursor: {
          style: CursorStyle.Crosshair,
          snap: true,
        },
      },
    } as const;

    const { result } = renderHook(() => usePlot(config));
    const plot = result.current as PlotInstanceInternal;
    const canvas = createMockCanvas(800, 400);

    act(() => {
      attachCanvas(plot, canvas);
      plot.requestRender();
      plot.__debug?.flush?.();
    });

    let trace!: TraceHandle1D;
    act(() => {
      trace = plot.addTrace1D({
        type: Trace1DType.Line,
        color: "#ff00ff",
      });
      trace.update({
        x: new Float32Array([0, 0.5, 1]),
        y: new Float32Array([0, 0.5, 0]),
      });
    });

    const cursorListener = vi.fn();
    act(() => {
      plot.onCursor(cursorListener);
    });

    act(() => {
      plot.__debug?.simulatePointerDown?.({ clientX: 400, clientY: 200, pointerId: 1 });
      plot.__debug?.flush?.();
      plot.__debug?.simulatePointerMove?.({ clientX: 410, clientY: 180, pointerId: 1 });
      plot.__debug?.flush?.();
    });

    expect(cursorListener).toHaveBeenCalled();
    const lastCursorCall =
      cursorListener.mock.calls[cursorListener.mock.calls.length - 1]?.[0];

    const cursorInfo = plot.__debug?.getCursorInfo?.();
    expect(cursorInfo).not.toBeNull();
    expect(cursorInfo?.snapped).not.toBeNull();
    expect(cursorInfo?.snapped?.x).toBeCloseTo(0.5, 2);
    expect(cursorInfo?.snapped?.y).toBeCloseTo(0.5, 2);
    expect(lastCursorCall?.snapped?.x).toBeCloseTo(0.5, 2);
    expect(lastCursorCall?.snapped?.y).toBeCloseTo(0.5, 2);

    act(() => {
      plot.__debug?.simulatePointerUp?.({ clientX: 410, clientY: 180, pointerId: 1 });
      plot.__debug?.flush?.();
    });
  });

  it("uses configured cursor style and render callback", () => {
    const renderSpy = vi.fn();
    const config = {
      axes: {
        x: { label: "X", range: { min: 0, max: 10 } },
        y: { label: "Y", range: { min: 0, max: 10 } },
      },
      interactions: {
        cursor: {
          style: CursorStyle.Vertical,
          snap: false,
        },
      },
      cursor: {
        render: renderSpy,
      },
    } as const;

    const { result } = renderHook(() => usePlot(config));
    const plot = result.current as PlotInstanceInternal;
    const canvas = createMockCanvas(800, 400);

    act(() => {
      attachCanvas(plot, canvas);
      plot.requestRender();
      plot.__debug?.flush?.();
    });

    act(() => {
      plot.__debug?.simulatePointerMove?.({ clientX: 400, clientY: 200, pointerId: 5 });
      plot.__debug?.flush?.();
    });

    expect(renderSpy).toHaveBeenCalled();
    const args = renderSpy.mock.calls[renderSpy.mock.calls.length - 1]?.[0];
    expect(args.style).toBe(CursorStyle.Vertical);
    expect(typeof args.renderDefault).toBe("function");
    expect(args.renderDefault).not.toBe(renderSpy);
  });

  it("performs box selection zoom when enabled", () => {
    const config = {
      axes: {
        x: { label: "X", range: { min: 0, max: 10 } },
        y: { label: "Y", range: { min: -5, max: 5 } },
      },
      interactions: {
        zoom: "x",
        boxSelect: true,
      },
    } as const;

    const { result } = renderHook(() => usePlot(config));
    const plot = result.current as PlotInstanceInternal;
    const canvas = createMockCanvas(800, 400);

    act(() => {
      attachCanvas(plot, canvas);
      plot.requestRender();
      plot.__debug?.flush?.();
    });

    const initialRange = plot.getAxisRange("x");
    const zoomListener = vi.fn();

    act(() => {
      plot.onZoom(zoomListener);
    });

    act(() => {
      plot.__debug?.simulatePointerDown?.({ clientX: 200, clientY: 200, shiftKey: true, pointerId: 2 });
      plot.__debug?.simulatePointerMove?.({ clientX: 400, clientY: 220, shiftKey: true, pointerId: 2 });
      plot.__debug?.simulatePointerUp?.({ clientX: 400, clientY: 220, shiftKey: true, pointerId: 2 });
      plot.__debug?.flush?.();
    });

    const zoomedRange = plot.getAxisRange("x");
    expect(zoomedRange.max - zoomedRange.min).toBeLessThan(
      initialRange.max - initialRange.min
    );
    expect(zoomListener).toHaveBeenCalled();
  });
});
