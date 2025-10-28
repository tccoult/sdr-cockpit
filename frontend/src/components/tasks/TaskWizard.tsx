/**
 * TaskWizard component - modal for creating new tasks
 */

import { useState } from 'react';
import { CreateRxTaskParams, CreateTxTaskParams } from '../../types/sdr';

type TaskMode = 'select' | 'rx' | 'tx';

interface TaskWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRxTask: (params: CreateRxTaskParams) => void;
  onCreateTxTask: (params: CreateTxTaskParams) => void;
}

export function TaskWizard({
  isOpen,
  onClose,
  onCreateRxTask,
  onCreateTxTask,
}: TaskWizardProps) {
  const [mode, setMode] = useState<TaskMode>('select');

  // RX form state
  const [rxName, setRxName] = useState('');
  const [rxFrequency, setRxFrequency] = useState('915.0');
  const [rxFreqUnit, setRxFreqUnit] = useState<'Hz' | 'kHz' | 'MHz' | 'GHz'>('MHz');
  const [rxSampleRate, setRxSampleRate] = useState('2.4');
  const [rxBandwidth, setRxBandwidth] = useState('2.0');
  const [rxFftSize, setRxFftSize] = useState('2048');

  // TX form state
  const [txName, setTxName] = useState('');
  const [txFile, setTxFile] = useState<File | null>(null);
  const [txFrequency, setTxFrequency] = useState('');
  const [txUseOriginalFreq, setTxUseOriginalFreq] = useState(true);
  const [txLoop, setTxLoop] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset form
    setMode('select');
    setRxName('');
    setRxFrequency('915.0');
    setTxName('');
    setTxFile(null);
    onClose();
  };

  const handleCreateRx = () => {
    const freqMultiplier = {
      Hz: 1,
      kHz: 1e3,
      MHz: 1e6,
      GHz: 1e9,
    }[rxFreqUnit];

    onCreateRxTask({
      name: rxName || 'Untitled RX Task',
      frequency: parseFloat(rxFrequency) * freqMultiplier,
      sampleRate: parseFloat(rxSampleRate) * 1e6, // MSPS
      bandwidth: parseFloat(rxBandwidth) * 1e6, // MHz
      fftSize: parseInt(rxFftSize),
    });
    handleClose();
  };

  const handleCreateTx = () => {
    if (!txFile) return;

    onCreateTxTask({
      name: txName || txFile.name,
      file: txFile,
      frequency: txUseOriginalFreq ? undefined : parseFloat(txFrequency) * 1e6,
      loop: txLoop,
    });
    handleClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTxFile(file);
      if (!txName) {
        setTxName(file.name.replace('.sigmf', ''));
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(20, 20, 30, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          padding: 24,
          maxWidth: 500,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {mode === 'select' && (
          <>
            <h2 style={{ margin: '0 0 20px 0', color: 'white', fontSize: 22 }}>
              Create New Task
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => setMode('rx')}
                style={{
                  padding: 20,
                  background: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.3)';
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>📡 Receive Signal</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Monitor and analyze RF signals
                </div>
              </button>

              <button
                onClick={() => setMode('tx')}
                style={{
                  padding: 20,
                  background: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 152, 0, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 152, 0, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.3)';
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>📤 Transmit File</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Playback a SigMF recording
                </div>
              </button>
            </div>

            <button
              onClick={handleClose}
              style={{
                marginTop: 20,
                width: '100%',
                padding: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 6,
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {mode === 'rx' && (
          <>
            <h2 style={{ margin: '0 0 20px 0', color: 'white', fontSize: 22 }}>
              Create Receive Task
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={rxName}
                  onChange={(e) => setRxName(e.target.value)}
                  placeholder="ISM Band Monitor"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 30, 40, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Frequency
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={rxFrequency}
                    onChange={(e) => setRxFrequency(e.target.value)}
                    step="0.001"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'rgba(30, 30, 40, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 14,
                    }}
                  />
                  <select
                    value={rxFreqUnit}
                    onChange={(e) => setRxFreqUnit(e.target.value as 'Hz' | 'kHz' | 'MHz' | 'GHz')}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(30, 30, 40, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 14,
                    }}
                  >
                    <option value="Hz">Hz</option>
                    <option value="kHz">kHz</option>
                    <option value="MHz">MHz</option>
                    <option value="GHz">GHz</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Sample Rate (MSPS)
                  </label>
                  <input
                    type="number"
                    value={rxSampleRate}
                    onChange={(e) => setRxSampleRate(e.target.value)}
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(30, 30, 40, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Bandwidth (MHz)
                  </label>
                  <input
                    type="number"
                    value={rxBandwidth}
                    onChange={(e) => setRxBandwidth(e.target.value)}
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(30, 30, 40, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                  FFT Size
                </label>
                <select
                  value={rxFftSize}
                  onChange={(e) => setRxFftSize(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 30, 40, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'white',
                    fontSize: 14,
                  }}
                >
                  <option value="1024">1024</option>
                  <option value="2048">2048</option>
                  <option value="4096">4096</option>
                  <option value="8192">8192</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setMode('select')}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateRx}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: 'rgba(0, 229, 255, 0.3)',
                    border: '1px solid rgba(0, 229, 255, 0.5)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Create Task
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'tx' && (
          <>
            <h2 style={{ margin: '0 0 20px 0', color: 'white', fontSize: 22 }}>
              Transmit SigMF File
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  placeholder="TX Playback"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 30, 40, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                  SigMF File
                </label>
                <div
                  style={{
                    border: '2px dashed rgba(255, 152, 0, 0.4)',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center',
                    background: 'rgba(255, 152, 0, 0.05)',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".sigmf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {txFile ? (
                    <div>
                      <div style={{ fontSize: 16, marginBottom: 6 }}>✓ {txFile.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
                        {(txFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      <div style={{ fontSize: 16, marginBottom: 6 }}>Drop file or click to browse</div>
                      <div style={{ fontSize: 12 }}>SigMF files only</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={txUseOriginalFreq}
                      onChange={(e) => setTxUseOriginalFreq(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                      Use original frequency
                    </span>
                  </label>
                </div>

                {!txUseOriginalFreq && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                      Override Frequency (MHz)
                    </label>
                    <input
                      type="number"
                      value={txFrequency}
                      onChange={(e) => setTxFrequency(e.target.value)}
                      step="0.001"
                      placeholder="433.920"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(30, 30, 40, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 14,
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={txLoop}
                    onChange={(e) => setTxLoop(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Loop playback
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setMode('select')}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateTx}
                  disabled={!txFile}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: txFile ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: txFile ? '1px solid rgba(255, 152, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: txFile ? 'white' : 'rgba(255, 255, 255, 0.4)',
                    cursor: txFile ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Start TX
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
