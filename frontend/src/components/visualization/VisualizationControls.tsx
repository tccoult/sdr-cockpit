import { Hand, ZoomIn } from "lucide-react";
import { useTheme } from "../app/useTheme";

export type InteractionMode = "pan" | "zoom";

export interface VisualizationControlsProps {
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  minDb: number;
  maxDb: number;
  onMinDbChange: (value: number) => void;
  onMaxDbChange: (value: number) => void;
  onAutoRange: () => void;
}

/**
 * Bottom control bar for spectrum visualization.
 * Includes pan/zoom toggle, dB range controls, and settings.
 */
export function VisualizationControls({
  interactionMode,
  onInteractionModeChange,
  minDb,
  maxDb,
  onMinDbChange,
  onMaxDbChange,
  onAutoRange,
}: VisualizationControlsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const inputClasses = [
    "h-8 w-16 rounded-md border px-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 sm:h-9 sm:w-20 sm:text-sm",
    isDark
      ? "border-white/15 bg-[#0E1018] text-slate-100 placeholder:text-slate-500 focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/20"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/30",
  ].join(" ");

  const dockClasses = [
    "flex flex-col items-center gap-3 border-t px-4 py-2 text-[11px] sm:text-xs",
    isDark
      ? "border-white/10 bg-viz-ctrl-dark text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      : "border-black/10 bg-viz-ctrl-light text-slate-600 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]",
  ].join(" ");

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-2 sm:gap-3";

  const rangeGroupClasses =
    "flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-semibold uppercase tracking-wide text-[10px] sm:text-xs";

  const dividerClasses = [
    "hidden h-6 w-px sm:block",
    isDark ? "bg-white/10" : "bg-black/10",
  ].join(" ");

  const modeButtonClasses = (mode: InteractionMode) =>
    [
      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold tracking-tight transition sm:text-xs",
      interactionMode === mode
        ? isDark
          ? "border-slate-500 bg-slate-700 text-white shadow-sm"
          : "border-slate-300 bg-slate-200 text-slate-900 shadow-sm"
        : isDark
        ? "border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/5 hover:text-white"
        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
    ].join(" ");

  const autoRangeClasses = [
    "rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition sm:text-xs",
    isDark
      ? "border-[#7C83FF]/50 bg-[#7C83FF]/20 text-white hover:bg-[#7C83FF]/30"
      : "border-[#7C83FF]/40 bg-white text-slate-800 hover:bg-[#7C83FF]/10",
  ].join(" ");

  return (
    <div className={dockClasses}>
      <div className="flex flex-wrap items-center justify-center gap-4 text-center sm:gap-5">
        <div className={actionGroupClasses}>
          <button
            type="button"
            onClick={() => onInteractionModeChange("pan")}
            className={modeButtonClasses("pan")}
            title="Pan mode - Click and drag to pan"
          >
            <Hand size={14} />
            <span>Pan</span>
          </button>

          <button
            type="button"
            onClick={() => onInteractionModeChange("zoom")}
            className={modeButtonClasses("zoom")}
            title="Zoom mode - Click and drag to zoom to range"
          >
            <ZoomIn size={14} />
            <span>Zoom</span>
          </button>

          <button
            type="button"
            className={autoRangeClasses}
            onClick={onAutoRange}
          >
            Auto Range
          </button>
        </div>

        <div className={dividerClasses} aria-hidden="true" />

        <div className={rangeGroupClasses}>
          <div className="flex items-center gap-2">
            <label htmlFor="min-db-ctrl">Min</label>
            <input
              id="min-db-ctrl"
              type="number"
              value={minDb}
              onChange={(event) => onMinDbChange(Number(event.target.value))}
              className={inputClasses}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="max-db-ctrl">Max</label>
            <input
              id="max-db-ctrl"
              type="number"
              value={maxDb}
              onChange={(event) => onMaxDbChange(Number(event.target.value))}
              className={inputClasses}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
