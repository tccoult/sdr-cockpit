/**
 * TaskCard component - displays a single SDR task with controls
 */

import { Task } from '../../types/sdr';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  onSettings?: (taskId: string) => void;
  onRecord?: (taskId: string) => void;
  onStopRecording?: (taskId: string) => void;
}

export function TaskCard({
  task,
  isSelected,
  onSelect,
  onPause,
  onStop,
  onSettings,
  onRecord,
  onStopRecording,
}: TaskCardProps) {
  const canControl = task.owner === 'self';

  // Determine status color and icon
  const getStatusColor = () => {
    if (task.recording?.isRecording) return '#f44336'; // Red for recording
    if (task.status === 'live') return '#4caf50'; // Green
    if (task.status === 'transmitting') return '#ff9800'; // Orange
    if (task.status === 'paused') return '#ffc107'; // Amber
    return '#9e9e9e'; // Gray for stopped
  };

  const getStatusIcon = () => {
    if (task.status === 'live') return '🟢';
    if (task.status === 'transmitting') return '🟠';
    if (task.status === 'paused') return '⚪';
    return '⚫';
  };

  const getStatusBadge = () => {
    if (task.recording?.isRecording) return 'REC';
    if (task.status === 'live') return 'LIVE';
    if (task.status === 'transmitting') return 'TX';
    if (task.status === 'paused') return 'PAUSED';
    return null;
  };

  const getAccentColor = () => {
    if (task.type === 'tx') return '#ff9800'; // Orange for TX
    if (task.owner === 'external') return '#7c4dff'; // Purple for external
    return '#00e5ff'; // Cyan for own RX
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFrequency = (freq: number): string => {
    if (freq >= 1e9) return `${(freq / 1e9).toFixed(3)} GHz`;
    if (freq >= 1e6) return `${(freq / 1e6).toFixed(3)} MHz`;
    if (freq >= 1e3) return `${(freq / 1e3).toFixed(3)} kHz`;
    return `${freq.toFixed(0)} Hz`;
  };

  const formatSampleRate = (rate: number): string => {
    if (rate >= 1e6) return `${(rate / 1e6).toFixed(1)} MSPS`;
    if (rate >= 1e3) return `${(rate / 1e3).toFixed(1)} kSPS`;
    return `${rate.toFixed(0)} SPS`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const statusColor = getStatusColor();
  const accentColor = getAccentColor();
  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={() => onSelect(task.id)}
      style={{
        background: isSelected
          ? 'rgba(30, 30, 45, 0.9)'
          : 'rgba(20, 20, 30, 0.6)',
        border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected
          ? `0 4px 16px rgba(0, 0, 0, 0.4), 0 0 20px ${accentColor}20`
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(25, 25, 38, 0.8)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(20, 20, 30, 0.6)';
        }
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{getStatusIcon()}</span>
          <span
            style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {task.name}
          </span>
        </div>

        {statusBadge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 4,
              background: statusColor,
              color: 'white',
              letterSpacing: '0.5px',
              animation:
                task.status === 'live' || task.recording?.isRecording
                  ? 'pulse 2s infinite'
                  : 'none',
            }}
          >
            {statusBadge}
          </span>
        )}
      </div>

      {/* Frequency and sample rate */}
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: 6,
        }}
      >
        {formatFrequency(task.frequency)} • {formatSampleRate(task.sampleRate)}
      </div>

      {/* Owner and uptime */}
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: isSelected ? 10 : 0,
        }}
      >
        {task.ownerName} • {formatDuration(task.uptime)}
        {task.fps && ` • ${task.fps} FPS`}
      </div>

      {/* TX Progress bar */}
      {task.playback && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <div
            style={{
              width: '100%',
              height: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${task.playback.progress * 100}%`,
                height: '100%',
                background: accentColor,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: 4,
            }}
          >
            {task.playback.filename} • {Math.round(task.playback.progress * 100)}%
          </div>
        </div>
      )}

      {/* Recording info */}
      {task.recording?.isRecording && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: 4,
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          Recording: {task.recording.filename} (
          {formatFileSize(task.recording.fileSize)})
        </div>
      )}

      {/* Controls (only show when selected) */}
      {isSelected && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking buttons
        >
          {canControl && task.type === 'rx' && (
            <>
              <button
                onClick={() => onPause?.(task.id)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(255, 193, 7, 0.2)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 193, 7, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 193, 7, 0.2)';
                }}
              >
                {task.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>

              <button
                onClick={() => onStop?.(task.id)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.4)',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                }}
              >
                ⏹ Stop
              </button>

              <button
                onClick={() => onSettings?.(task.id)}
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(0, 229, 255, 0.2)',
                  border: '1px solid rgba(0, 229, 255, 0.4)',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)';
                }}
              >
                ⚙
              </button>

              {task.recording?.isRecording ? (
                <button
                  onClick={() => onStopRecording?.(task.id)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: 'rgba(244, 67, 54, 0.3)',
                    border: '1px solid rgba(244, 67, 54, 0.5)',
                    borderRadius: 4,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)';
                  }}
                >
                  ⏹ Stop Rec
                </button>
              ) : (
                <button
                  onClick={() => onRecord?.(task.id)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid rgba(244, 67, 54, 0.4)',
                    borderRadius: 4,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                  }}
                >
                  🎙️ Record
                </button>
              )}
            </>
          )}

          {canControl && task.type === 'tx' && (
            <>
              <button
                onClick={() => onPause?.(task.id)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(255, 193, 7, 0.2)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 193, 7, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 193, 7, 0.2)';
                }}
              >
                {task.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>

              <button
                onClick={() => onStop?.(task.id)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.4)',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                }}
              >
                ⏹ Stop
              </button>

              {task.playback?.isLooping && (
                <span
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: 'rgba(124, 77, 255, 0.2)',
                    border: '1px solid rgba(124, 77, 255, 0.4)',
                    borderRadius: 4,
                    color: 'white',
                  }}
                >
                  🔁 Loop
                </span>
              )}
            </>
          )}

          {!canControl && (
            <div
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: 12,
                background: 'rgba(124, 77, 255, 0.2)',
                border: '1px solid rgba(124, 77, 255, 0.4)',
                borderRadius: 4,
                color: 'white',
                textAlign: 'center',
              }}
            >
              👁️ View Only
            </div>
          )}
        </div>
      )}

      {/* Pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}
      </style>
    </div>
  );
}
