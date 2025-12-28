import { Hand, ZoomIn, Play, Pause } from 'lucide-react';
import { useDataSources } from '../../hooks/api/useDataSources';
import { useActiveSource } from '../../hooks/useActiveSource';
import { SourceSelector } from './SourceSelector';

export type InteractionMode = "pan" | "zoom";

export interface VisualizationControlsProps {
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onAutoRange: () => void;
  maxHoldEnabled: boolean;
  onToggleMaxHold: () => void;
  onClearMaxHold: () => void;
  maxHoldControlsDisabled?: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
}

/**
 * Top toolbar for spectrum visualization.
 * Includes source selector, pan/zoom toggle, auto range, and max-hold controls.
 */
export function VisualizationControls({
  interactionMode,
  onInteractionModeChange,
  onAutoRange,
  maxHoldEnabled,
  onToggleMaxHold,
  onClearMaxHold,
  maxHoldControlsDisabled = false,
  isPaused,
  onTogglePause,
}: VisualizationControlsProps) {
  const { sources, isLoading } = useDataSources();
  const { activeSource, selectSource } = useActiveSource();

  const toolbarClasses = [
    "flex w-full flex-col items-center justify-center gap-3 border-b px-4 py-2 text-xs text-viz-text/80",
    "bg-viz-bg",
  ].join(" ");

  const toolbarStyle = {
    borderBottomColor: "var(--viz-divider)",
  };

  const sharedButtonBase =
    "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition";

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

  const maxHoldToggleClasses = [
    sharedButtonBase,
    maxHoldEnabled ? buttonActiveClasses : buttonDefaultClasses,
    maxHoldControlsDisabled ? "pointer-events-none opacity-50" : "",
  ].join(" ");

  const maxHoldClearClasses = [
    sharedButtonBase,
    buttonDefaultClasses,
    maxHoldControlsDisabled || !maxHoldEnabled
      ? "pointer-events-none opacity-50"
      : "",
  ].join(" ");

  return (
    <div className={toolbarClasses} style={toolbarStyle}>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        {/* Left: Source Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-viz-text/50">Source</span>
          <SourceSelector
            sources={sources}
            activeSource={activeSource}
            isLoading={isLoading}
            onSelect={selectSource}
          />
        </div>

        {/* Right: All Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Playback Control */}
          <button
            type="button"
            className={[
              sharedButtonBase,
              isPaused ? buttonDefaultClasses : buttonActiveClasses,
              !activeSource ? "pointer-events-none opacity-50" : "",
            ].join(" ")}
            onClick={onTogglePause}
            disabled={!activeSource}
            title={isPaused ? "Resume streaming" : "Pause streaming"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? "Play" : "Pause"}</span>
          </button>

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

          <button
            type="button"
            className={maxHoldToggleClasses}
            onClick={onToggleMaxHold}
            disabled={maxHoldControlsDisabled}
          >
            Max Hold
          </button>
          <button
            type="button"
            className={maxHoldClearClasses}
            onClick={onClearMaxHold}
            disabled={maxHoldControlsDisabled || !maxHoldEnabled}
          >
            Clear Max Hold
          </button>
        </div>
      </div>
    </div>
  );
}
