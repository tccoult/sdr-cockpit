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
      ? "border-white/20 bg-[#E1018] text-slate-100 placeholder:text-slate-500 focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/20"
      : "border-border/70 bg-card text-foreground placeholder:text-muted-foreground focus:border-[#7C83FF]/60 focus-visible:ring-[#7C83FF]/30",
  ].join(" ");

  const dockClasses = [
    "flex w-full flex-col items-center justify-center gap-3 border-t border-transparent px-4 py-2 text-[11px] sm:text-xs",
    isDark
      ? "bg-viz-bg-dark text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      : "bg-viz-bg-light text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  ].join(" ");

  const dockStyle = {
    borderTopColor: isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.08)",
  };

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeLabelClasses = [
    "text-[11px] font-medium",
    isDark ? "text-slate-200" : "text-slate-600",
  ].join(" ");

  const dividerClasses = [
    "hidden h-6 w-px sm:block",
    isDark ? "bg-white/10" : "bg-black/10",
  ].join(" ");

  const sharedButtonBase =
    "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-medium transition sm:text-xs";

  const buttonActiveClasses = "border-border bg-card text-foreground shadow-sm";

  const buttonDefaultClasses =
    "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground";

  const modeButtonClasses = (mode: InteractionMode) =>
    [
      sharedButtonBase,
      interactionMode === mode ? buttonActiveClasses : buttonDefaultClasses,
    ].join(" ");

  const autoRangeClasses = [sharedButtonBase, buttonDefaultClasses].join(" ");

  return (
    <div className={dockClasses} style={dockStyle}>
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
            <label htmlFor="min-db-ctrl" className={rangeLabelClasses}>
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

          <div className="flex items-center gap-2">
            <label htmlFor="max-db-ctrl" className={rangeLabelClasses}>
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
    </div>
  );
}
