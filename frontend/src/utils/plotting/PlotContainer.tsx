import {
  Children,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { LayoutDirection, type AxisRange, type CursorInfo } from "./types";
import type { PlotRuntime } from "./core";
import { PlotSyncContext, type PlotSyncContextValue } from "./PlotSyncContext";

interface RegisteredPlot {
  runtime: PlotRuntime;
  unsubscribeZoom?: () => void;
  unsubscribePan?: () => void;
  unsubscribeCursor?: () => void;
}

export interface PlotContainerProps {
  layout: LayoutDirection;
  sizes?: number[];
  gap?: number;
  syncZoom?: false | "x" | "y" | "both";
  syncCursor?: boolean;
  children: ReactNode;
}

function shouldSyncAxis(axis: "x" | "y", mode: PlotContainerProps["syncZoom"]): boolean {
  if (!mode) {
    return false;
  }
  if (mode === "both") {
    return true;
  }
  return mode === axis;
}

function applySizeStyle(
  layout: LayoutDirection,
  index: number,
  sizes?: number[]
): CSSProperties {
  if (!sizes || sizes.length <= index) {
    return layout === LayoutDirection.Vertical
      ? { flex: 1 }
      : layout === LayoutDirection.Horizontal
      ? { flex: 1 }
      : {};
  }

  const value = sizes[index];
  if (!Number.isFinite(value) || value <= 0) {
    return {};
  }

  if (layout === LayoutDirection.Vertical) {
    return { flex: "0 0 auto", height: value };
  }
  if (layout === LayoutDirection.Horizontal) {
    return { flex: "0 0 auto", width: value };
  }
  return { minHeight: value };
}

export function PlotContainer({
  layout,
  sizes,
  gap = 8,
  syncZoom = false,
  syncCursor = false,
  children,
}: PlotContainerProps) {
  const plotsRef = useRef<RegisteredPlot[]>([]);

  const broadcastAxis = useCallback(
    (source: PlotRuntime, axis: "x" | "y", range: AxisRange) => {
      plotsRef.current.forEach((entry) => {
        if (entry.runtime === source) return;
        entry.runtime.setAxisRange(axis, range.min, range.max);
      });
    },
    []
  );

  const broadcastCursor = useCallback(
    (source: PlotRuntime, info: CursorInfo | null) => {
      plotsRef.current.forEach((entry) => {
        if (entry.runtime === source) return;
        entry.runtime.setCursorPosition(
          info ? { x: info.x ?? info.snapped?.x ?? null, y: info.y ?? info.snapped?.y ?? null } : null
        );
      });
    },
    []
  );

  const registerPlot = useCallback(
    (runtime: PlotRuntime) => {
      const entry: RegisteredPlot = { runtime };
      plotsRef.current.push(entry);

      const syncX = shouldSyncAxis("x", syncZoom);
      const syncY = shouldSyncAxis("y", syncZoom);

      if (syncX || syncY) {
        const handleAxis = (axis: "x" | "y", range: AxisRange) => {
          if ((axis === "x" && syncX) || (axis === "y" && syncY)) {
            broadcastAxis(runtime, axis, range);
          }
        };
        entry.unsubscribeZoom = runtime.onZoom(handleAxis);
        entry.unsubscribePan = runtime.onPan(handleAxis);
      }

      if (syncCursor) {
        entry.unsubscribeCursor = runtime.onCursor((info) => {
          broadcastCursor(runtime, info);
        });
      }

      return () => {
        plotsRef.current = plotsRef.current.filter((item) => item !== entry);
        entry.unsubscribeZoom?.();
        entry.unsubscribePan?.();
        entry.unsubscribeCursor?.();
      };
    },
    [broadcastAxis, broadcastCursor, syncZoom, syncCursor]
  );

  const contextValue = useMemo<PlotSyncContextValue>(
    () => ({ registerPlot }),
    [registerPlot]
  );

  const containerStyle: CSSProperties = useMemo(() => {
    switch (layout) {
      case LayoutDirection.Horizontal:
        return {
          display: "flex",
          flexDirection: "row",
          gap,
          width: "100%",
        };
      case LayoutDirection.Grid:
        return {
          display: "grid",
          gap,
          gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
          width: "100%",
        };
      default:
        return {
          display: "flex",
          flexDirection: "column",
          gap,
          width: "100%",
        };
    }
  }, [layout, gap]);

  const childrenArray = Children.toArray(children);

  return (
    <PlotSyncContext.Provider value={contextValue}>
      <div style={containerStyle}>
        {childrenArray.map((child, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              ...applySizeStyle(layout, index, sizes),
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </PlotSyncContext.Provider>
  );
}

