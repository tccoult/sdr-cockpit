/**
 * FFT frequency domain display using Recharts
 * Shows real-time spectrum with zoom/pan capabilities
 */

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { FFTData, FrequencyRange } from '../../types/sdr';

interface FFTDisplayProps {
  width: number;
  height: number;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  accentColor?: string;
}

export function FFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  accentColor = '#00e5ff',
}: FFTDisplayProps) {
  const [currentFFT, setCurrentFFT] = useState<FFTData | null>(null);
  const [zoomArea, setZoomArea] = useState<{ x1: number; x2: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Listen for FFT data updates
  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      setCurrentFFT(customEvent.detail);
    };

    window.addEventListener('fft-data', handleFFTData);
    return () => {
      window.removeEventListener('fft-data', handleFFTData);
    };
  }, []);

  // Convert FFT data to chart data format
  const chartData = useMemo(() => {
    if (!currentFFT) return [];

    const { centerFreq, sampleRate, bins } = currentFFT;
    const { startFreq, endFreq } = frequencyRange;
    const binWidth = sampleRate / bins.length;

    const data: { freq: number; power: number }[] = [];

    // Calculate which bins to display
    const startBin = Math.max(0, Math.floor((startFreq - centerFreq + sampleRate / 2) / binWidth));
    const endBin = Math.min(bins.length, Math.ceil((endFreq - centerFreq + sampleRate / 2) / binWidth));

    // Sample bins for display (limit to ~1000 points for performance)
    const step = Math.max(1, Math.floor((endBin - startBin) / 1000));

    for (let i = startBin; i < endBin; i += step) {
      const freq = centerFreq - sampleRate / 2 + i * binWidth;
      const power = bins[i];
      data.push({ freq, power });
    }

    return data;
  }, [currentFFT, frequencyRange]);

  /**
   * Handle mouse down to start zoom selection
   */
  const handleMouseDown = (e: { activeLabel?: string | number }) => {
    if (!e || !e.activeLabel) return;
    const label = typeof e.activeLabel === 'string' ? parseFloat(e.activeLabel) : e.activeLabel;
    setIsSelecting(true);
    setZoomArea({ x1: label, x2: label });
  };

  /**
   * Handle mouse move during zoom selection
   */
  const handleMouseMove = (e: { activeLabel?: string | number }) => {
    if (!isSelecting || !zoomArea || !e || !e.activeLabel) return;
    const label = typeof e.activeLabel === 'string' ? parseFloat(e.activeLabel) : e.activeLabel;
    setZoomArea({ ...zoomArea, x2: label });
  };

  /**
   * Handle mouse up to complete zoom
   */
  const handleMouseUp = () => {
    if (!isSelecting || !zoomArea || !onFrequencyRangeChange) {
      setIsSelecting(false);
      setZoomArea(null);
      return;
    }

    const { x1, x2 } = zoomArea;
    const newStartFreq = Math.min(x1, x2);
    const newEndFreq = Math.max(x1, x2);

    // Only zoom if selection is significant
    if (newEndFreq - newStartFreq > 1000) {
      onFrequencyRangeChange({
        startFreq: newStartFreq,
        endFreq: newEndFreq,
      });
    }

    setIsSelecting(false);
    setZoomArea(null);
  };

  /**
   * Handle wheel for zoom
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!onFrequencyRangeChange) return;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const { startFreq, endFreq } = frequencyRange;
    const centerFreq = (startFreq + endFreq) / 2;
    const span = (endFreq - startFreq) / 2;
    const newSpan = span * zoomFactor;

    onFrequencyRangeChange({
      startFreq: centerFreq - newSpan,
      endFreq: centerFreq + newSpan,
    });
  };

  /**
   * Format frequency for axis
   */
  const formatFrequency = (freq: number): string => {
    if (Math.abs(freq) >= 1e9) return `${(freq / 1e9).toFixed(2)}G`;
    if (Math.abs(freq) >= 1e6) return `${(freq / 1e6).toFixed(1)}M`;
    if (Math.abs(freq) >= 1e3) return `${(freq / 1e3).toFixed(1)}k`;
    return `${freq.toFixed(0)}`;
  };

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { freq: number; power: number } }> }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(20, 20, 30, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          padding: '8px 12px',
          color: 'white',
          fontSize: 12,
        }}
      >
        <div>
          <strong>Frequency:</strong> {formatFrequencyLong(data.freq)}
        </div>
        <div>
          <strong>Power:</strong> {data.power.toFixed(1)} dB
        </div>
      </div>
    );
  };

  const formatFrequencyLong = (freq: number): string => {
    if (Math.abs(freq) >= 1e9) return `${(freq / 1e9).toFixed(6)} GHz`;
    if (Math.abs(freq) >= 1e6) return `${(freq / 1e6).toFixed(3)} MHz`;
    if (Math.abs(freq) >= 1e3) return `${(freq / 1e3).toFixed(3)} kHz`;
    return `${freq.toFixed(0)} Hz`;
  };

  return (
    <div
      style={{
        width,
        height,
        background: 'rgba(10, 10, 15, 0.8)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
      onWheel={handleWheel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="freq"
            type="number"
            domain={[frequencyRange.startFreq, frequencyRange.endFreq]}
            tickFormatter={formatFrequency}
            stroke="rgba(255, 255, 255, 0.6)"
            style={{ fontSize: 12 }}
          />
          <YAxis
            domain={[minDb, maxDb]}
            stroke="rgba(255, 255, 255, 0.6)"
            style={{ fontSize: 12 }}
            label={{ value: 'Power (dB)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255, 255, 255, 0.6)' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="power"
            stroke={accentColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {zoomArea && (
            <ReferenceArea
              x1={zoomArea.x1}
              x2={zoomArea.x2}
              strokeOpacity={0.3}
              fill={accentColor}
              fillOpacity={0.2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
