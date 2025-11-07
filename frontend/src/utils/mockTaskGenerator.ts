/**
 * Mock task generator for demo mode
 * Creates realistic-looking SDR tasks with various states
 */

import { Task, TaskType, TaskStatus, TaskOwner, VisualizationMode } from '../types/sdr';

let taskIdCounter = 1;

/**
 * Generate a collection of demo tasks
 */
export function generateDemoTasks(): Task[] {
  const now = Date.now();

  return [
    // Active RX task owned by user
    {
      id: `task-${taskIdCounter++}`,
      name: 'ISM Band Monitor',
      type: TaskType.RX,
      frequency: 915e6, // 915 MHz
      sampleRate: 2.4e6, // 2.4 MSPS
      bandwidth: 2e6,
      fftSize: 2048,
      owner: TaskOwner.SELF,
      ownerName: 'You',
      status: TaskStatus.LIVE,
      uptime: 923, // 15:23
      createdAt: now - 923000,
      fps: 30,
      visualizationMode: VisualizationMode.FFT_WATERFALL,
    },

    // External RX task (ADS-B receiver)
    {
      id: `task-${taskIdCounter++}`,
      name: 'ADS-B Receiver',
      type: TaskType.RX,
      frequency: 1090e6, // 1090 MHz
      sampleRate: 5e6, // 5 MSPS
      bandwidth: 2e6,
      fftSize: 4096,
      owner: TaskOwner.EXTERNAL,
      ownerName: 'Python Script',
      status: TaskStatus.LIVE,
      uptime: 9910, // 02:45:10
      createdAt: now - 9910000,
      fps: 25,
      visualizationMode: VisualizationMode.FFT_WATERFALL,
    },

    // TX task with playback
    {
      id: `task-${taskIdCounter++}`,
      name: 'Test Signal TX',
      type: TaskType.TX,
      frequency: 433.92e6, // 433.92 MHz
      sampleRate: 1e6, // 1 MSPS
      bandwidth: 1e6,
      owner: TaskOwner.SELF,
      ownerName: 'You',
      status: TaskStatus.TRANSMITTING,
      uptime: 42,
      createdAt: now - 42000,
      visualizationMode: VisualizationMode.FFT_ONLY,
      playback: {
        filename: 'recording_01.sigmf',
        progress: 0.65,
        isLooping: true,
        duration: 120, // 2 minutes
      },
    },

    // RX task with recording
    {
      id: `task-${taskIdCounter++}`,
      name: 'Ham Radio Monitor',
      type: TaskType.RX,
      frequency: 145.5e6, // 145.5 MHz
      sampleRate: 1e6, // 1 MSPS
      bandwidth: 1e6,
      fftSize: 2048,
      owner: TaskOwner.SELF,
      ownerName: 'You',
      status: TaskStatus.LIVE,
      uptime: 245,
      createdAt: now - 245000,
      fps: 30,
      visualizationMode: VisualizationMode.FFT_WATERFALL,
      recording: {
        filename: 'ham_recording_2025-10-27.sigmf',
        duration: 245,
        fileSize: 125e6, // 125 MB
        isRecording: true,
      },
    },

    // Paused external task
    {
      id: `task-${taskIdCounter++}`,
      name: 'Weather Satellite',
      type: TaskType.RX,
      frequency: 137.5e6, // 137.5 MHz
      sampleRate: 1e6,
      bandwidth: 500e3,
      fftSize: 2048,
      owner: TaskOwner.EXTERNAL,
      ownerName: "John's Script",
      status: TaskStatus.PAUSED,
      uptime: 135,
      createdAt: now - 135000,
      fps: 0,
      visualizationMode: VisualizationMode.FFT_ONLY,
    },

    // Spectrogram test task
    {
      id: `task-${taskIdCounter++}`,
      name: 'Spectrogram Test',
      type: TaskType.RX,
      frequency: 2.45e9, // 2.45 GHz
      sampleRate: 10e6, // 10 MSPS
      bandwidth: 10e6,
      fftSize: 1024,
      owner: TaskOwner.EXTERNAL,
      ownerName: 'Test Generator',
      status: TaskStatus.LIVE,
      uptime: 60,
      createdAt: now - 60000,
      fps: 30,
      visualizationMode: VisualizationMode.SPECTROGRAM,
    },
  ];
}

/**
 * Create a single mock RX task
 */
export function createMockRxTask(params: {
  name: string;
  frequency: number;
  sampleRate: number;
  bandwidth: number;
  fftSize: number;
}): Task {
  return {
    id: `task-${taskIdCounter++}`,
    name: params.name,
    type: TaskType.RX,
    frequency: params.frequency,
    sampleRate: params.sampleRate,
    bandwidth: params.bandwidth,
    fftSize: params.fftSize,
    owner: TaskOwner.SELF,
    ownerName: 'You',
    status: TaskStatus.LIVE,
    uptime: 0,
    createdAt: Date.now(),
    fps: 30,
    visualizationMode: VisualizationMode.FFT_WATERFALL, // Default to fft-waterfall for new tasks
  };
}

/**
 * Create a single mock TX task
 */
export function createMockTxTask(params: {
  name: string;
  frequency: number;
  loop: boolean;
  filename: string;
}): Task {
  return {
    id: `task-${taskIdCounter++}`,
    name: params.name,
    type: TaskType.TX,
    frequency: params.frequency,
    sampleRate: 1e6,
    bandwidth: 1e6,
    owner: TaskOwner.SELF,
    ownerName: 'You',
    status: TaskStatus.TRANSMITTING,
    uptime: 0,
    createdAt: Date.now(),
    visualizationMode: VisualizationMode.FFT_ONLY, // TX tasks default to fft-only
    playback: {
      filename: params.filename,
      progress: 0,
      isLooping: params.loop,
      duration: 60, // Default 1 minute
    },
  };
}

/**
 * Update task uptime (call this periodically)
 */
export function updateTaskUptime(task: Task): Task {
  const elapsed = Math.floor((Date.now() - task.createdAt) / 1000);
  return {
    ...task,
    uptime: elapsed,
  };
}

/**
 * Update TX playback progress
 */
export function updateTxProgress(task: Task, deltaTime: number): Task {
  if (task.type !== 'tx' || !task.playback) return task;

  let newProgress = task.playback.progress + deltaTime / task.playback.duration;

  // Handle looping
  if (newProgress >= 1.0) {
    if (task.playback.isLooping) {
      newProgress = newProgress % 1.0;
    } else {
      newProgress = 1.0;
      // Task should be stopped, but we'll just cap it here
    }
  }

  return {
    ...task,
    playback: {
      ...task.playback,
      progress: newProgress,
    },
  };
}

/**
 * Toggle task pause state
 */
export function toggleTaskPause(task: Task): Task {
  if (task.owner !== TaskOwner.SELF) return task;

  return {
    ...task,
    status: task.status === TaskStatus.PAUSED ? TaskStatus.LIVE : TaskStatus.PAUSED,
    fps: task.status === TaskStatus.PAUSED ? 30 : 0,
  };
}

/**
 * Start recording on a task
 */
export function startRecording(task: Task): Task {
  if (task.type !== TaskType.RX || task.owner !== TaskOwner.SELF) return task;

  return {
    ...task,
    recording: {
      filename: `recording_${new Date().toISOString().split('T')[0]}.sigmf`,
      duration: 0,
      fileSize: 0,
      isRecording: true,
    },
  };
}

/**
 * Stop recording on a task
 */
export function stopRecording(task: Task): Task {
  if (!task.recording) return task;

  return {
    ...task,
    recording: undefined,
  };
}

/**
 * Update recording duration and file size
 */
export function updateRecording(task: Task, deltaTime: number): Task {
  if (!task.recording?.isRecording) return task;

  const newDuration = task.recording.duration + deltaTime;
  const bytesPerSecond = (task.sampleRate * 2 * 2) / 8; // I/Q, float32 = 2 bytes per sample * 2 channels
  const newFileSize = Math.floor(newDuration * bytesPerSecond);

  return {
    ...task,
    recording: {
      ...task.recording,
      duration: newDuration,
      fileSize: newFileSize,
    },
  };
}
