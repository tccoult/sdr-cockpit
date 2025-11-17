/**
 * Desktop visualization view
 * Shows spectrum visualization
 */

import { VisualizationPanel } from '../visualization/VisualizationPanel';
import { ColorMap } from '../../utils/colorMaps';

export interface DesktopViewProps {
  colorMap: ColorMap;
  onRenderFpsChange: (fps: number) => void;
  onDataFpsChange: (fps: number) => void;
}

export function DesktopView({
  colorMap,
  onRenderFpsChange,
  onDataFpsChange,
}: DesktopViewProps) {
  return (
    <div className="flex h-full w-full flex-col p-2">
      <VisualizationPanel
        colorMap={colorMap}
        onRenderFpsChange={onRenderFpsChange}
        onDataFpsChange={onDataFpsChange}
      />
    </div>
  );
}
