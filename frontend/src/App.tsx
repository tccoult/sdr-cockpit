import { useState, useEffect, useRef } from 'react';
import { SpectrumView } from './components/visualization/SpectrumView';
import { ColorMapSelector } from './components/controls/ColorMapSelector';
import { MockFFTGenerator, dispatchFFTData } from './utils/mockDataGenerator';
import { DEFAULT_COLOR_MAP, ColorMap } from './utils/colorMaps';

function App() {
  // SDR parameters
  const [centerFreq, setCenterFreq] = useState(915e6); // 915 MHz
  const [sampleRate, setSampleRate] = useState(2.4e6); // 2.4 MHz
  const [colorMap, setColorMap] = useState<ColorMap>(DEFAULT_COLOR_MAP);
  const [isRunning, setIsRunning] = useState(true);
  const [fps, setFps] = useState(0);

  // Mock data generator
  const generatorRef = useRef<MockFFTGenerator | null>(null);
  const intervalRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // Initialize mock data generator
  useEffect(() => {
    generatorRef.current = new MockFFTGenerator(centerFreq, sampleRate, 2048);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update generator parameters when they change
  useEffect(() => {
    if (generatorRef.current) {
      generatorRef.current.setCenterFreq(centerFreq);
      generatorRef.current.setSampleRate(sampleRate);
    }
  }, [centerFreq, sampleRate]);

  // Start/stop FFT data generation
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Generate FFT data at ~30 FPS
    intervalRef.current = window.setInterval(() => {
      if (generatorRef.current) {
        const fftData = generatorRef.current.generateFFT();
        dispatchFFTData(fftData);

        // Update FPS counter
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }
      }
    }, 1000 / 30); // 30 FPS

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>
            SDR Cockpit
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)' }}>
            Software Defined Radio Spectrum Analyzer
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
            }}
          >
            <strong>{fps}</strong> FPS
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              background: isRunning ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 255, 100, 0.8)',
              color: 'white',
            }}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Left side - Spectrum view */}
        <div style={{ flex: 1, minWidth: 800 }}>
          <SpectrumView
            centerFreq={centerFreq}
            sampleRate={sampleRate}
            colorMap={colorMap}
          />
        </div>

        {/* Right side - Controls */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Frequency controls */}
          <div
            style={{
              background: 'rgba(20, 20, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 500 }}>
              Tuning
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Center Frequency (MHz)
                </label>
                <input
                  type="number"
                  value={(centerFreq / 1e6).toFixed(3)}
                  onChange={(e) => setCenterFreq(Number(e.target.value) * 1e6)}
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(30, 30, 40, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Sample Rate (MHz)
                </label>
                <input
                  type="number"
                  value={(sampleRate / 1e6).toFixed(3)}
                  onChange={(e) => setSampleRate(Number(e.target.value) * 1e6)}
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(30, 30, 40, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Preset frequencies */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Presets
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={() => setCenterFreq(433.92e6)}
                    style={{
                      background: 'rgba(124, 77, 255, 0.3)',
                      border: '1px solid rgba(124, 77, 255, 0.5)',
                      color: 'white',
                      fontSize: 12,
                      padding: '6px 12px',
                    }}
                  >
                    433.92 MHz (ISM)
                  </button>
                  <button
                    onClick={() => setCenterFreq(915e6)}
                    style={{
                      background: 'rgba(124, 77, 255, 0.3)',
                      border: '1px solid rgba(124, 77, 255, 0.5)',
                      color: 'white',
                      fontSize: 12,
                      padding: '6px 12px',
                    }}
                  >
                    915 MHz (ISM)
                  </button>
                  <button
                    onClick={() => setCenterFreq(2.45e9)}
                    style={{
                      background: 'rgba(124, 77, 255, 0.3)',
                      border: '1px solid rgba(124, 77, 255, 0.5)',
                      color: 'white',
                      fontSize: 12,
                      padding: '6px 12px',
                    }}
                  >
                    2.45 GHz (WiFi)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color map selector */}
          <ColorMapSelector
            selectedColorMap={colorMap}
            onColorMapChange={setColorMap}
          />

          {/* Info */}
          <div
            style={{
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: 8,
              padding: 12,
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.6,
            }}
          >
            <strong>Demo Mode</strong>
            <br />
            Displaying simulated RF spectrum data. This is a mockup of the real-time FFT and waterfall display that will show live SDR data.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
