/**
 * Desktop visualization view
 * Shows source-based spectrum visualization
 */

import { SourceVisualizationPanel } from '../visualization/SourceVisualizationPanel';
import { ColorMap } from '../../utils/colorMaps';

export interface DesktopViewProps {
  colorMap: ColorMap;
  onRenderFpsChange: (fps: number) => void;
}

export function DesktopView({
  colorMap,
  onRenderFpsChange,
}: DesktopViewProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <SourceVisualizationPanel
        colorMap={colorMap}
        onRenderFpsChange={onRenderFpsChange}
      />
    </div>
  );
}
