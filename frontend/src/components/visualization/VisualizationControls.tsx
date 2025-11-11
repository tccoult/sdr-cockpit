import { Hand, ZoomIn } from "lucide-react";

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

  const inputClasses = [
    "h-8 w-16 rounded-md border border-border/60 bg-card px-2 text-xs font-semibold text-foreground shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40 sm:h-9 sm:w-20 sm:text-sm",
  ].join(" ");

  const dockClasses =
    "mt-4 flex w-full flex-col items-center justify-center gap-4 rounded-lg border border-border/60 bg-card/95 px-4 py-3 text-[11px] shadow-sm sm:flex-row sm:justify-between sm:text-xs";

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeLabelClasses = "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground";

  const dividerClasses = "hidden h-8 w-px bg-border/60 sm:block";

  const sharedButtonBase =
    "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground sm:text-xs";

  const buttonActiveClasses =
    "border-cockpit-accent/60 bg-cockpit-accent/15 text-foreground shadow-inner";

  const modeButtonClasses = (mode: InteractionMode) =>
    [
      sharedButtonBase,
      interactionMode === mode ? buttonActiveClasses : "",
    ].join(" ");

  const autoRangeClasses = [
    "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground sm:text-xs",
  ].join(" ");

  return (
    <div className={dockClasses}>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-4 text-center sm:justify-start sm:gap-5">
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
