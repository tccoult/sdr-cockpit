import { Hand, ZoomIn } from "lucide-react";
import { useTheme } from "../app/useTheme";
import { Button } from "../common/Button";

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
    "h-7 w-14 rounded-md border px-1.5 text-xs transition focus:outline-none focus-visible:ring-2 sm:h-8 sm:w-20 sm:px-2",
    "border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-500 focus:border-cockpit-accent focus-visible:ring-cockpit-accent/40",
    "dark:border-white/20 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/40 dark:focus-visible:ring-white/40",
  ].join(" ");

  return (
    <div
      className={[
        "flex flex-wrap items-center justify-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] backdrop-blur-sm transition-all duration-150 sm:gap-3 sm:px-3 sm:py-2 sm:text-xs",
        isDark
          ? "border-white/10 bg-white/5 shadow-lg shadow-black/30"
          : "border-slate-200 bg-white/80 shadow-lg shadow-slate-300/40",
      ].join(" ")}
    >
      {/* Action Buttons: Interaction Mode + Auto Range */}
      <div className="flex items-center gap-2">
        {/* Pan/Zoom toggle - hidden on mobile (touch controls work natively) */}
        <div className="hidden items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={() => onInteractionModeChange("pan")}
            className={[
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
              interactionMode === "pan"
                ? "border-cockpit-accent/50 bg-cockpit-accent/10 text-slate-900 shadow-sm dark:border-white/40 dark:bg-cockpit-accent/20 dark:text-white"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-slate-800",
            ].join(" ")}
            title="Pan mode - Click and drag to pan"
          >
            <Hand size={14} />
            <span>Pan</span>
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/20" />

          <button
            type="button"
            onClick={() => onInteractionModeChange("zoom")}
            className={[
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
              interactionMode === "zoom"
                ? "border-cockpit-accent/50 bg-cockpit-accent/10 text-slate-900 shadow-sm dark:border-white/40 dark:bg-cockpit-accent/20 dark:text-white"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-slate-800",
            ].join(" ")}
            title="Zoom mode - Click and drag to zoom to range"
          >
            <ZoomIn size={14} />
            <span>Zoom</span>
          </button>
        </div>

        <Button size="sm" variant="subtle" onClick={onAutoRange}>
          Auto Range
        </Button>
      </div>

      {/* Divider - hidden on mobile */}
      <div className="hidden h-6 w-px bg-slate-200 dark:bg-white/20 lg:block" />

      {/* dB Input Controls */}
      <div className="flex flex-wrap items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1">
          <label htmlFor="min-db-ctrl" className="text-[10px] sm:text-xs">
            Min:
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
          <label htmlFor="max-db-ctrl" className="text-[10px] sm:text-xs">
            Max:
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
