/**
 * Source-based visualization panel
 * Combines source toolbar and visualization view using data sources
 */

import { useState, useCallback } from 'react';
import { useActiveSource } from '../../hooks/useActiveSource';
import { useSourceStream } from '../../hooks/useSourceStream';
import { SourceToolbar } from './SourceToolbar';
import { VisualizationView } from './VisualizationView';
import { ColorMap } from '../../utils/colorMaps';
import { InteractionMode } from './VisualizationControls';
import { useTasks } from '../../hooks';

export interface SourceVisualizationPanelProps {
  colorMap: ColorMap;
  onRenderFpsChange: (fps: number) => void;
}

export function SourceVisualizationPanel({
  colorMap,
  onRenderFpsChange,
}: SourceVisualizationPanelProps) {
  const { activeSource } = useActiveSource();
  const { streamStatus, streamError } = useSourceStream({
    sourceId: activeSource?.id ?? null,
    enabled: !!activeSource,
  });

  // Get parent task to access visualizationMode
  const { tasks } = useTasks();
  const parentTask = tasks.find(t => activeSource?.parentTaskId === t.id);

  // Visualization controls state
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('pan');
  const [maxHoldEnabled, setMaxHoldEnabled] = useState(false);
  const [autoRangeKey, setAutoRangeKey] = useState(0);
  const [maxHoldClearKey, setMaxHoldClearKey] = useState(0);

  const handleAutoRange = useCallback(() => {
    setAutoRangeKey((k) => k + 1);
  }, []);

  const handleToggleMaxHold = useCallback(() => {
    setMaxHoldEnabled((prev) => !prev);
  }, []);

  const handleClearMaxHold = useCallback(() => {
    setMaxHoldClearKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <SourceToolbar
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        onAutoRange={handleAutoRange}
        maxHoldEnabled={maxHoldEnabled}
        onToggleMaxHold={handleToggleMaxHold}
        onClearMaxHold={handleClearMaxHold}
        maxHoldControlsDisabled={!activeSource}
      />

      {activeSource ? (
        <div className="flex-1 overflow-hidden">
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
            isMaxHoldEnabled={maxHoldEnabled}
            autoRangeKey={autoRangeKey}
            maxHoldClearKey={maxHoldClearKey}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-viz-text/60">
          <div className="text-4xl">📊</div>
          <div>
            <p className="text-lg font-medium text-viz-text">No Source Selected</p>
            <p className="mt-1 text-sm text-viz-text/50">
              Choose a data source from the dropdown above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
