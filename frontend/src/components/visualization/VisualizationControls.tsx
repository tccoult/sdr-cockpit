import { ChevronDown, Hand, ZoomIn, Play, Pause } from 'lucide-react';
import { useDataSources } from '../../hooks/api/useDataSources';
import { useActiveSource } from '../../hooks/useActiveSource';
import { useState, useRef, useEffect } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toolbarClasses = [
    "flex w-full flex-col items-center justify-center gap-3 border-b px-4 py-2 text-[11px] text-viz-text/80 sm:text-xs",
    "bg-viz-bg",
  ].join(" ");

  const toolbarStyle = {
    borderBottomColor: "var(--viz-divider)",
  };

  const dropdownButtonClasses = [
    'inline-flex items-center gap-2 rounded-sm border px-3 py-1.5',
    'border-viz-border/50 bg-transparent text-viz-text transition',
    'hover:bg-viz-bg/70 hover:border-viz-border',
    'text-[11px] font-medium sm:text-xs',
  ].join(' ');

  const dropdownMenuClasses = [
    'absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md',
    'rounded-md border shadow-lg overflow-hidden z-50',
    'bg-viz-bg border-viz-border',
  ].join(' ');

  const dropdownItemClasses = (isActive: boolean) =>
    [
      'flex items-center justify-between gap-2 px-2.5 py-1 cursor-pointer transition',
      'text-xs border-b border-viz-border/30',
      'hover:bg-viz-bg/70',
      isActive ? 'bg-viz-bg text-viz-text' : 'text-viz-text/80',
    ].join(' ');

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

  const formatFrequency = (hz: number): string => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
    return `${hz} Hz`;
  };

  const formatSampleRate = (hz: number): string => {
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MS/s`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kS/s`;
    return `${hz} S/s`;
  };

  return (
    <div className={toolbarClasses} style={toolbarStyle}>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        {/* Left: Source Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-viz-text/50">Source</span>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className={dropdownButtonClasses}
              onClick={() => setIsOpen(!isOpen)}
              disabled={isLoading}
            >
              <span className="text-viz-text">
                {activeSource ? activeSource.name : 'Select...'}
              </span>
              <ChevronDown size={14} className="text-viz-text/60" />
            </button>

            {isOpen && (
              <div className={dropdownMenuClasses}>
                <div className="max-h-64 overflow-y-auto">
                  {sources.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-viz-text/60">
                      No sources available
                    </div>
                  ) : (
                    sources.map((source) => (
                      <div
                        key={source.id}
                        className={dropdownItemClasses(source.id === activeSource?.id)}
                        onClick={() => {
                          selectSource(source.id);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{source.name}</span>
                            <span
                              className="rounded px-1 py-0.5 text-[9px] font-medium uppercase"
                              style={{
                                backgroundColor: 'var(--viz-border)',
                                color: 'var(--viz-bg)',
                                opacity: 0.6,
                              }}
                            >
                              {source.typeLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-viz-text/40">
                            {formatFrequency(source.centerFrequency)} • {formatSampleRate(source.sampleRate)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                source.status === 'active'
                                  ? 'rgb(var(--color-status-success))'
                                  : source.status === 'error'
                                    ? 'rgb(var(--color-status-error))'
                                    : 'rgb(var(--color-status-stopped))',
                            }}
                            title={source.status}
                          />
                          {source.id === activeSource?.id && (
                            <span className="text-[10px] text-viz-text/60">✓</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Play/Pause Button */}
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
        </div>

        {/* Right: Visualization Controls */}
        <div className="flex flex-wrap items-center gap-3">
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
