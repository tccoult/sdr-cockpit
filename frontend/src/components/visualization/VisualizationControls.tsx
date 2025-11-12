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
    "h-8 w-16 rounded-md border border-viz-border/40 bg-viz-bg/80 px-2 text-xs font-medium text-viz-text placeholder:text-muted-foreground transition focus:border-cockpit-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/30 sm:h-9 sm:w-20 sm:text-sm",
  ].join(" ");

  const dockClasses = [
    "flex w-full flex-col items-center justify-center gap-3 border-t px-4 py-2 text-[11px] text-viz-text/80 sm:text-xs",
    "bg-viz-bg",
  ].join(" ");

  const dockStyle = {
    borderTopColor: "var(--viz-divider)",
  };

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const rangeLabelClasses = "text-[11px] font-medium text-viz-text/70";

  const dividerClasses = [
    "hidden h-6 w-px sm:block",
    "bg-viz-border/40",
  ].join(" ");

  const sharedButtonBase =
    "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-medium transition sm:text-xs";

  const buttonActiveClasses =
    "border-viz-border bg-viz-bg text-viz-text shadow-sm";

  const buttonDefaultClasses =
    "border-viz-border/50 bg-transparent text-viz-text/70 hover:bg-viz-bg/70 hover:text-viz-text";

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
