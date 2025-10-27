/**
 * Color map selector component with preview
 */

import { ColorMap, COLOR_MAPS, buildColorLUT } from '../../utils/colorMaps';
import { useEffect, useRef } from 'react';

interface ColorMapSelectorProps {
  selectedColorMap: ColorMap;
  onColorMapChange: (colorMap: ColorMap) => void;
}

export function ColorMapSelector({
  selectedColorMap,
  onColorMapChange,
}: ColorMapSelectorProps) {
  return (
    <div
      style={{
        background: 'rgba(20, 20, 30, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 16,
        color: 'white',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 500 }}>
        Color Scheme
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {COLOR_MAPS.map((colorMap) => (
          <ColorMapOption
            key={colorMap.id}
            colorMap={colorMap}
            isSelected={colorMap.id === selectedColorMap.id}
            onSelect={() => onColorMapChange(colorMap)}
          />
        ))}
      </div>
    </div>
  );
}

interface ColorMapOptionProps {
  colorMap: ColorMap;
  isSelected: boolean;
  onSelect: () => void;
}

function ColorMapOption({ colorMap, isSelected, onSelect }: ColorMapOptionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw color map preview
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lut = buildColorLUT(colorMap);
    const width = canvas.width;
    const height = canvas.height;

    // Draw horizontal gradient
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      const colorIdx = Math.floor((x / width) * 255);
      const r = lut[colorIdx * 4];
      const g = lut[colorIdx * 4 + 1];
      const b = lut[colorIdx * 4 + 2];

      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [colorMap]);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 8,
        background: isSelected
          ? 'rgba(0, 229, 255, 0.2)'
          : 'rgba(30, 30, 40, 0.5)',
        border: isSelected
          ? '2px solid rgba(0, 229, 255, 0.8)'
          : '2px solid transparent',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(40, 40, 50, 0.8)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(30, 30, 40, 0.5)';
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={120}
        height={20}
        style={{
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      />
      <span style={{ fontSize: 14, flex: 1 }}>{colorMap.name}</span>
      {isSelected && (
        <span style={{ fontSize: 12, color: 'rgba(0, 229, 255, 1)' }}>✓</span>
      )}
    </div>
  );
}
