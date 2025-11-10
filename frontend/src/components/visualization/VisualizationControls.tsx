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
      ? "border-white/15 bg-[#0E1018] text-slate-100 placeholder:text-slate-500 focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/30"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/40",
  ].join(" ");

  const dockClasses = [
    "flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 text-[11px] sm:text-sm",
    isDark
      ? "border-white/10 bg-[#0E1018]/80 text-slate-200"
      : "border-slate-300 bg-[#F5F6F8]/70 text-slate-600",
  ].join(" ");

  const actionGroupClasses = "flex items-center gap-2";

  const modeButtonClasses = (mode: InteractionMode) =>
    [
      "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition sm:text-sm",
      interactionMode === mode
        ? isDark
          ? "border-[#7C83FF]/60 bg-[#7C83FF]/20 text-white shadow-sm"
          : "border-[#7C83FF]/60 bg-white text-slate-900 shadow-sm"
        : isDark
        ? "border-white/15 bg-transparent text-slate-300 hover:border-white/30"
        : "border-slate-300 bg-white/80 text-slate-600 hover:border-slate-400 hover:bg-white",
    ].join(" ");

  const autoRangeClasses = [
    "rounded-md border px-3 py-1 text-xs font-semibold tracking-wide transition sm:text-sm",
    isDark
      ? "border-[#7C83FF]/40 bg-[#7C83FF]/15 text-white hover:bg-[#7C83FF]/25"
      : "border-[#7C83FF]/30 bg-white text-slate-800 hover:bg-[#7C83FF]/10",
  ].join(" ");

  return (
    <div className={dockClasses}>
      <div className={actionGroupClasses}>
        <div className="hidden items-center gap-2 lg:flex">
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
        </div>

        <button
          type="button"
          className={autoRangeClasses}
          onClick={onAutoRange}
        >
          Auto Range
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-medium">
        <div className="flex items-center gap-1">
          <label
            htmlFor="min-db-ctrl"
            className="text-[10px] uppercase tracking-wide sm:text-xs"
          >
            Min
          </label>
          <input
            id="min-db-ctrl"
            type="number"
            value={minDb}
            onChange={(event) => onMinDbChange(Number(event.target.value))}
            className={inputClasses}
          />
        </div>

        <div className="flex items-center gap-1">
          <label
            htmlFor="max-db-ctrl"
            className="text-[10px] uppercase tracking-wide sm:text-xs"
          >
            Max
          </label>
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
  );
}
