/**
 * Source-based visualization panel
 * Combines source selector and visualization view using data sources
 */

import { useActiveSource } from '../../hooks/useActiveSource';
import { useSourceStream } from '../../hooks/useSourceStream';
import { SourceSelector } from './SourceSelector';
import { VisualizationView } from './VisualizationView';
import { ColorMap } from '../../utils/colorMaps';

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

  return (
    <div className="flex h-full w-full flex-col">
      <SourceSelector />

      {activeSource ? (
        <div className="flex-1">
          <VisualizationView
            taskId={activeSource.id} // Use source ID as key for event scoping
            centerFreq={activeSource.centerFrequency}
            sampleRate={activeSource.sampleRate}
            colorMap={colorMap}
            dataError={streamError || undefined}
            isConnecting={streamStatus === 'connecting'}
            onRenderFpsChange={onRenderFpsChange}
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
