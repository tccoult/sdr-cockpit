/**
 * Visualization panel
 * Displays visualization for the active data source
 */

import { useState, useCallback, useEffect } from 'react';
import { useActiveSource } from '../../hooks/useActiveSource';
import { useSourceStream } from '../../hooks/useSourceStream';
import { VisualizationView } from './VisualizationView';
import { VisualizationControls, InteractionMode } from './VisualizationControls';
import { ColorMap } from '../../utils/colorMaps';
import { useTasks } from '../../hooks';

export interface VisualizationPanelProps {
  colorMap: ColorMap;
  onRenderFpsChange: (fps: number) => void;
  onDataFpsChange: (fps: number) => void;
}

export function VisualizationPanel({
  colorMap,
  onRenderFpsChange,
  onDataFpsChange,
}: VisualizationPanelProps) {
  const { activeSource } = useActiveSource();

  // Pause state - managed here
  const [isPaused, setIsPaused] = useState(false);

  const { fps, streamStatus, streamError } = useSourceStream({
    sourceId: activeSource?.id ?? null,
    enabled: !!activeSource && !isPaused,
  });

  // Get parent task to access visualizationMode
  const { tasks } = useTasks();
  const parentTask = tasks.find(t => activeSource?.parentTaskId === t.id);

  // Visualization control state (managed here so controls work even without a source)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('pan');
  const [isMaxHoldEnabled, setIsMaxHoldEnabled] = useState(false);
  const [autoRangeKey, setAutoRangeKey] = useState(0);
  const [maxHoldClearKey, setMaxHoldClearKey] = useState(0);

  const handleAutoRange = useCallback(() => {
    setAutoRangeKey(k => k + 1);
  }, []);

  const handleToggleMaxHold = useCallback(() => {
    setIsMaxHoldEnabled(prev => !prev);
    setMaxHoldClearKey(k => k + 1);
  }, []);

  const handleClearMaxHold = useCallback(() => {
    setMaxHoldClearKey(k => k + 1);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Auto-unpause when switching sources
  useEffect(() => {
    setIsPaused(false);
  }, [activeSource?.id]);

  // Propagate data FPS changes to parent
  useEffect(() => {
    onDataFpsChange(fps);
  }, [fps, onDataFpsChange]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <VisualizationControls
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        onAutoRange={handleAutoRange}
        maxHoldEnabled={isMaxHoldEnabled}
        onToggleMaxHold={handleToggleMaxHold}
        onClearMaxHold={handleClearMaxHold}
        maxHoldControlsDisabled={!activeSource}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />

      {!activeSource ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-viz-text/60">
          <div className="text-4xl">📊</div>
          <div>
            <p className="text-lg font-medium text-viz-text">No Source Selected</p>
            <p className="mt-1 text-sm text-viz-text/50">
              Choose a data source from the dropdown above
            </p>
          </div>
        </div>
      ) : (
        <VisualizationView
          taskId={activeSource.id}
          centerFreq={activeSource.centerFrequency}
          sampleRate={activeSource.sampleRate}
          colorMap={colorMap}
          visualizationMode={parentTask?.visualizationMode ?? undefined}
          dataError={streamError || undefined}
          isConnecting={streamStatus === 'connecting'}
          onRenderFpsChange={onRenderFpsChange}
          interactionMode={interactionMode}
          isMaxHoldEnabled={isMaxHoldEnabled}
          autoRangeKey={autoRangeKey}
          maxHoldClearKey={maxHoldClearKey}
        />
      )}
    </div>
  );
}
