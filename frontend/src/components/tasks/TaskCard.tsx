/**
 * TaskCard component - displays a single SDR task with accordion expand/collapse
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
  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={() => onSelect(task.id)}
      style={{
        background: isSelected
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(255, 255, 255, 0.04)',
        borderLeft: `${isSelected ? 4 : 2}px solid ${isSelected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
        borderTop: `1px solid ${isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRight: `1px solid ${isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderBottom: `1px solid ${isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRadius: 8,
        padding: isSelected ? 12 : 10,
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isSelected
          ? '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 0 40px rgba(255, 255, 255, 0.02)'
          : '0 2px 4px rgba(0, 0, 0, 0.2)',
        opacity: isSelected ? 1 : 0.7,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.opacity = '0.85';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.opacity = '0.7';
        }
      }}
    >
      {/* Collapsed View - Always visible */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{getStatusIcon()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontWeight: isSelected ? 600 : 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
                marginTop: 2,
              }}
            >
              {formatFrequency(task.frequency)}
            </div>
          </div>
        </div>

        {statusBadge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '3px 6px',
              borderRadius: 3,
              background: statusColor,
              color: 'white',
              letterSpacing: '0.5px',
              animation:
                task.status === 'live' || task.recording?.isRecording
                  ? 'pulse 2s infinite'
                  : 'none',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {statusBadge}
          </span>
        )}
      </div>

      {/* Expanded View - Only visible when selected */}
      {isSelected && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'expandIn 0.3s ease',
          }}
        >
          {/* Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 12px',
              marginBottom: 12,
              fontSize: 12,
            }}
          >
            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 }}>
                Sample Rate
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {formatSampleRate(task.sampleRate)}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 }}>
                Owner
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {task.ownerName}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 }}>
                Uptime
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {formatDuration(task.uptime)}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 }}>
                FPS
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {task.fps || 0}
              </div>
            </div>
          </div>

          {/* TX Progress bar */}
          {task.playback && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  width: '100%',
                  height: 4,
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: `${task.playback.progress * 100}%`,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.6)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.6)',
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
                marginBottom: 12,
                padding: 8,
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: 4,
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Recording: {task.recording.filename}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {formatFileSize(task.recording.fileSize)} • {formatDuration(task.recording.duration)}
              </div>
            </div>
          )}

          {/* Controls */}
          <div
            style={{
              display: 'flex',
              gap: 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {canControl && task.type === 'rx' && (
              <>
                <button
                  onClick={() => onPause?.(task.id)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  {task.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                </button>

                <button
                  onClick={() => onStop?.(task.id)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  ⏹ Stop
                </button>

                <button
                  onClick={() => onSettings?.(task.id)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  ⚙
                </button>

                {task.recording?.isRecording ? (
                  <button
                    onClick={() => onStopRecording?.(task.id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    ⏹ Stop Rec
                  </button>
                ) : (
                  <button
                    onClick={() => onRecord?.(task.id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
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
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  {task.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                </button>

                <button
                  onClick={() => onStop?.(task.id)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  ⏹ Stop
                </button>

                {task.playback?.isLooping && (
                  <span
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      color: 'rgba(255, 255, 255, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 500,
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
                  padding: '8px 10px',
                  fontSize: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                👁️ View Only
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          @keyframes expandIn {
            from {
              opacity: 0;
              max-height: 0;
            }
            to {
              opacity: 1;
              max-height: 500px;
            }
          }
        `}
      </style>
    </div>
  );
}
