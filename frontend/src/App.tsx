import { useState, useEffect, useRef } from 'react';
import { SpectrumView } from './components/visualization/SpectrumView';
import { MockFFTGenerator, dispatchFFTData } from './utils/mockDataGenerator';
import { PLASMA } from './utils/colorMaps';

function App() {
  // SDR parameters - fixed for demo
  const centerFreq = 915e6; // 915 MHz
  const sampleRate = 2.4e6; // 2.4 MHz
  const colorMap = PLASMA;
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

      {/* Spectrum view */}
      <SpectrumView
        centerFreq={centerFreq}
        sampleRate={sampleRate}
        colorMap={colorMap}
      />
    </div>
  );
}

export default App;
