import { useState, useEffect, useRef } from 'react';
import { SpectrumView } from './components/visualization/SpectrumView';
import { TaskSidebar } from './components/tasks/TaskSidebar';
import { TaskWizard } from './components/tasks/TaskWizard';
import { MockFFTGenerator, dispatchFFTData } from './utils/mockDataGenerator';
import { PLASMA } from './utils/colorMaps';
import { Task, CreateRxTaskParams, CreateTxTaskParams } from './types/sdr';
import {
  generateDemoTasks,
  createMockRxTask,
  createMockTxTask,
  updateTaskUptime,
  updateTxProgress,
  updateRecording,
  toggleTaskPause,
  startRecording,
  stopRecording,
} from './utils/mockTaskGenerator';

function App() {
  const colorMap = PLASMA;

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // FPS tracking
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // Mock data generators (one per task)
  const generatorsRef = useRef<Map<string, MockFFTGenerator>>(new Map());
  const intervalRef = useRef<number | null>(null);

  // Initialize with demo tasks
  useEffect(() => {
    // Simulate discovery delay
    setTimeout(() => {
      const demoTasks = generateDemoTasks();
      setTasks(demoTasks);
      setIsDiscovering(false);

      // Auto-select first task
      if (demoTasks.length > 0) {
        setSelectedTaskId(demoTasks[0].id);
      }
    }, 1500);
  }, []);

  // Get selected task
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Create/update FFT generator for selected task
  useEffect(() => {
    if (!selectedTask) return;

    if (!generatorsRef.current.has(selectedTask.id)) {
      const generator = new MockFFTGenerator(
        selectedTask.frequency,
        selectedTask.sampleRate,
        selectedTask.fftSize || 2048
      );
      generatorsRef.current.set(selectedTask.id, generator);
    }
  }, [selectedTask]);

  // FFT data generation loop
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (!selectedTask || selectedTask.status === 'paused') return;

      const generator = generatorsRef.current.get(selectedTask.id);
      if (generator) {
        const fftData = generator.generateFFT();
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
  }, [selectedTask]);

  // Update task uptimes and recordings
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          let updatedTask = updateTaskUptime(task);

          // Update TX progress
          if (task.type === 'tx' && task.status === 'transmitting') {
            updatedTask = updateTxProgress(updatedTask, 1); // 1 second
          }

          // Update recording
          if (task.recording?.isRecording) {
            updatedTask = updateRecording(updatedTask, 1); // 1 second
          }

          return updatedTask;
        })
      );
    }, 1000);

    return () => clearInterval(updateInterval);
  }, []);

  // Task handlers
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCreateRxTask = (params: CreateRxTaskParams) => {
    const newTask = createMockRxTask(params);
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const handleCreateTxTask = (params: CreateTxTaskParams) => {
    const newTask = createMockTxTask({
      name: params.name,
      frequency: params.frequency || 433.92e6,
      loop: params.loop,
      filename: params.file.name,
    });
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const handlePauseTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? toggleTaskPause(task) : task))
    );
  };

  const handleStopTask = (taskId: string) => {
    // Remove task
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    // Remove generator
    generatorsRef.current.delete(taskId);

    // If this was the selected task, select another
    if (taskId === selectedTaskId) {
      const remainingTasks = tasks.filter((t) => t.id !== taskId);
      setSelectedTaskId(remainingTasks.length > 0 ? remainingTasks[0].id : null);
    }
  };

  const handleRecordTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? startRecording(task) : task))
    );
  };

  const handleStopRecording = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? stopRecording(task) : task))
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#0a0a0f',
        color: 'white',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Task Sidebar */}
      <TaskSidebar
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        isDiscovering={isDiscovering}
        onSelectTask={handleSelectTask}
        onCreateTask={() => setIsWizardOpen(true)}
        onPauseTask={handlePauseTask}
        onStopTask={handleStopTask}
        onRecordTask={handleRecordTask}
        onStopRecording={handleStopRecording}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
              SDR Cockpit
            </h1>
            {selectedTask && (
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>
                {selectedTask.name} - {formatFrequency(selectedTask.frequency)}
              </p>
            )}
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background:
                  selectedTask?.status === 'live' || selectedTask?.status === 'transmitting'
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(158, 158, 158, 0.1)',
                border:
                  selectedTask?.status === 'live' || selectedTask?.status === 'transmitting'
                    ? '1px solid rgba(76, 175, 80, 0.3)'
                    : '1px solid rgba(158, 158, 158, 0.3)',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    selectedTask?.status === 'live' || selectedTask?.status === 'transmitting'
                      ? '#4caf50'
                      : '#9e9e9e',
                  animation:
                    selectedTask?.status === 'live' || selectedTask?.status === 'transmitting'
                      ? 'pulse 2s infinite'
                      : 'none',
                }}
              />
              <span>
                {selectedTask?.status === 'live' && 'Live'}
                {selectedTask?.status === 'transmitting' && 'Transmitting'}
                {selectedTask?.status === 'paused' && 'Paused'}
                {!selectedTask && 'No Task Selected'}
              </span>
            </div>
          </div>
        </div>

        {/* Spectrum display area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflow: 'auto',
          }}
        >
          {selectedTask ? (
            <div
              style={{
                width: '100%',
                maxWidth: 1400,
                animation: 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <SpectrumView
                centerFreq={selectedTask.frequency}
                sampleRate={selectedTask.sampleRate}
                colorMap={colorMap}
              />
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: 60,
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>📡</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                No Task Selected
              </div>
              <div style={{ fontSize: 14, marginBottom: 30, opacity: 0.8 }}>
                Select a task from the sidebar to view spectrum
              </div>
              <button
                onClick={() => setIsWizardOpen(true)}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'rgba(0, 229, 255, 0.2)',
                  border: '1px solid rgba(0, 229, 255, 0.4)',
                  borderRadius: 8,
                  color: '#00e5ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)';
                }}
              >
                + Create New Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Wizard Modal */}
      <TaskWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateRxTask={handleCreateRxTask}
        onCreateTxTask={handleCreateTxTask}
      />

      {/* Global styles */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            overflow: hidden;
          }

          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}
      </style>
    </div>
  );
}

function formatFrequency(freq: number): string {
  if (freq >= 1e9) return `${(freq / 1e9).toFixed(3)} GHz`;
  if (freq >= 1e6) return `${(freq / 1e6).toFixed(3)} MHz`;
  if (freq >= 1e3) return `${(freq / 1e3).toFixed(3)} kHz`;
  return `${freq.toFixed(0)} Hz`;
}

export default App;
