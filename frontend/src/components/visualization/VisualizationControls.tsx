import { Hand, ZoomIn } from "lucide-react";

export type InteractionMode = "pan" | "zoom";

export interface VisualizationControlsProps {
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onAutoRange: () => void;
  trueMaxHoldEnabled: boolean;
  onToggleTrueMaxHold: () => void;
  onClearTrueMaxHold: () => void;
  trueMaxHoldControlsDisabled?: boolean;
}

/**
 * Bottom control bar for spectrum visualization.
 * Includes pan/zoom toggle, auto range, and max-hold controls.
 */
export function VisualizationControls({
  interactionMode,
  onInteractionModeChange,
  onAutoRange,
  trueMaxHoldEnabled,
  onToggleTrueMaxHold,
  onClearTrueMaxHold,
  trueMaxHoldControlsDisabled = false,
}: VisualizationControlsProps) {
  const dockClasses = [
    "flex w-full flex-col items-center justify-center gap-3 border-t px-4 py-2 text-[11px] text-viz-text/80 sm:text-xs",
    "bg-viz-bg",
  ].join(" ");

  const dockStyle = {
    borderTopColor: "var(--viz-divider)",
  };

  const actionGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

  const extraGroupClasses =
    "flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs";

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

  const trueMaxHoldToggleClasses = [
    sharedButtonBase,
    trueMaxHoldEnabled ? buttonActiveClasses : buttonDefaultClasses,
    trueMaxHoldControlsDisabled ? "pointer-events-none opacity-50" : "",
  ].join(" ");

  const trueMaxHoldClearClasses = [
    sharedButtonBase,
    buttonDefaultClasses,
    trueMaxHoldControlsDisabled || !trueMaxHoldEnabled
      ? "pointer-events-none opacity-50"
      : "",
  ].join(" ");

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

        <div className={extraGroupClasses}>
          <button
            type="button"
            className={trueMaxHoldToggleClasses}
            onClick={onToggleTrueMaxHold}
            disabled={trueMaxHoldControlsDisabled}
          >
            {trueMaxHoldEnabled
              ? "Disable Actual Max Hold"
              : "Enable Actual Max Hold"}
          </button>
          <button
            type="button"
            className={trueMaxHoldClearClasses}
            onClick={onClearTrueMaxHold}
            disabled={trueMaxHoldControlsDisabled || !trueMaxHoldEnabled}
          >
            Clear Max Hold
          </button>
        </div>
      </div>
    </div>
  );
}
