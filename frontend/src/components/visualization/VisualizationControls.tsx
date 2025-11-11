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
    "h-8 w-16 rounded-md border border-border/60 bg-card/80 px-2 text-xs font-medium text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40 sm:h-9 sm:w-20 sm:text-sm",
    isDark ? "placeholder:text-muted-foreground/70" : "placeholder:text-muted-foreground/70",
  ].join(" ");

  const dockClasses =
    "flex w-full flex-col items-center justify-center gap-3 border-t border-border/60 bg-card/90 px-4 py-3 text-[11px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] sm:text-xs dark:border-border/50 dark:bg-card/30";

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] sm:text-xs";

  const rangeGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] sm:text-xs";

  const rangeLabelClasses = "text-[11px] font-semibold text-muted-foreground";

  const dividerClasses = "hidden h-6 w-px bg-border/60 sm:block";

  const sharedButtonBase =
    "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:bg-card/70 hover:text-foreground sm:text-xs dark:border-border/50 dark:bg-card/25";

  const buttonActiveClasses =
    "border-cockpit-accent/60 bg-cockpit-accent/15 text-foreground shadow-[0_0_0_1px_rgba(124,131,255,0.25)]";

  const buttonDefaultClasses = "";

  const modeButtonClasses = (mode: InteractionMode) =>
    [
      sharedButtonBase,
      interactionMode === mode ? buttonActiveClasses : buttonDefaultClasses,
    ].join(" ");

  const autoRangeClasses = [sharedButtonBase, buttonDefaultClasses].join(" ");

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
