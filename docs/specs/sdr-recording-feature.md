# SDR IQ Recording Feature Specification

## Overview

This document specifies the design for an SDR IQ recording feature that allows users to record data from receive (RX) tasks, manage recordings, and download recorded data as TAR archives.

## Goals

1. **Record IQ data** from RX tasks with start/stop control
2. **Track recording state** including duration, size, and file count
3. **Automatic cleanup** when recordings are abandoned (lease expiration)
4. **Disk management** with configurable limits
5. **Download artifacts** including recordings and BIT database files
6. **Shared visibility** - all users can see recording status on tasks

## Non-Goals (for initial implementation)

- Real IQ data capture (will use dummy file generation)
- Multi-user recording ownership conflicts (first user to record owns it)
- BIT alert toast notifications (noted for future enhancement)

---

## Architecture

### Lease-Based Recording System

Recordings use a lease-based lifecycle to handle client disconnects gracefully:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Recording Lifecycle                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client: POST /api/tasks/{task_id}/record                       │
│    → Backend creates recording, returns recording_id            │
│    → Recording state: "recording"                               │
│    → Lease TTL: 10 seconds                                      │
│                                                                 │
│  Client: POST /api/recordings/{id}/renew (every ~5 seconds)     │
│    → Backend extends lease                                      │
│    → If client stops renewing, lease expires                    │
│                                                                 │
│  Client: DELETE /api/recordings/{id}                            │
│    → If recording: stops recording, state → "completed"         │
│    → If completed: state → "pending_delete" (5s undo window)    │
│                                                                 │
│  Backend: Periodic lease check (every 2-3 seconds)              │
│    → Expired leases → stop recording, state → "completed"       │
│                                                                 │
│  Backend: Periodic disk check (every 5-10 seconds)              │
│    → If limits exceeded → stop ALL active recordings            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recording States

| State | Description |
|-------|-------------|
| `recording` | Actively writing files, lease active |
| `completed` | Stopped (manually or lease expired), files intact |
| `pending_delete` | Marked for deletion, 5-second undo window |

---

## Backend Design

### New Settings

Add to `backend/app/config/settings.py`:

```python
# Data storage (shared base path for BIT and recordings)
sdr_data_path: str = "/tmp/sdr_cockpit"

# Recording-specific settings
recording_lease_ttl_seconds: int = 10
recording_max_total_size_gb: float = 10.0
recording_max_disk_percent: float = 80.0
```

Environment variables:
- `SDR_DATA_PATH` - Base path for all persistent data
- `SDR_RECORDING_LEASE_TTL_SECONDS` - Lease timeout (default: 10)
- `SDR_RECORDING_MAX_TOTAL_SIZE_GB` - Max total recording storage (default: 10)
- `SDR_RECORDING_MAX_DISK_PERCENT` - Max disk usage percentage (default: 80)

### Storage Structure

```
{SDR_DATA_PATH}/
├── bit/
│   ├── bit_history.db
│   └── bit_history_*.db           # Rotated databases
└── recordings/
    ├── {recording_id}/            # UUID-based directory
    │   ├── metadata.json          # Recording metadata
    │   ├── chunk_001.bin          # Data files
    │   ├── chunk_002.bin
    │   └── ...
    └── {recording_id}/
        └── ...
```

**metadata.json structure:**
```json
{
  "recording_id": "uuid",
  "task_id": "uuid",
  "task_name": "MyTask",
  "started_at": "2024-01-15T12:00:00Z",
  "stopped_at": "2024-01-15T12:15:23Z",
  "duration_seconds": 923,
  "total_size_bytes": 1234567890,
  "file_count": 45,
  "status": "completed"
}
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       RecordingManager                          │
│  Singleton managing all recording state and lifecycle           │
├─────────────────────────────────────────────────────────────────┤
│  recordings: Dict[recording_id, RecordingState]                 │
│  task_recordings: Dict[task_id, recording_id]  # active only    │
│  pending_deletes: Dict[recording_id, delete_scheduled_at]       │
├─────────────────────────────────────────────────────────────────┤
│  start(task_id, task_name) → RecordingInfo                      │
│  stop(recording_id) → RecordingInfo                             │
│  renew(recording_id) → lease_expires_at                         │
│  delete(recording_id) → schedules deletion                      │
│  cancel_delete(recording_id) → restores from pending            │
│  get(recording_id) → RecordingInfo                              │
│  get_all() → List[RecordingInfo]                                │
│  get_for_task(task_id) → RecordingInfo | None                   │
│  is_task_recording(task_id) → bool                              │
├─────────────────────────────────────────────────────────────────┤
│  Background tasks:                                              │
│  - check_expired_leases() - every 2-3 seconds                   │
│  - check_disk_limits() - every 5-10 seconds                     │
│  - cleanup_pending_deletes() - every 1 second                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RecorderInterface (ABC)                      │
│  Abstract interface for recording implementations               │
├─────────────────────────────────────────────────────────────────┤
│  start(output_dir: Path) → None                                 │
│  stop() → RecordingStats                                        │
│  get_stats() → RecordingStats { duration, size, file_count }    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DummyRecorder                              │
│  Mock implementation for testing/demo                           │
├─────────────────────────────────────────────────────────────────┤
│  - Spawns background thread on start()                          │
│  - Writes ~100KB dummy file every second                        │
│  - Tracks duration, total bytes, file count                     │
│  - Thread stops on stop() call                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

#### Recording Management

```
POST /api/tasks/{task_id}/record
  Description: Start recording on a task
  Request: (none)
  Response: RecordingInfo
  Errors:
    - 404: Task not found
    - 400: Task is not RX type
    - 409: Task already being recorded
    - 507: Disk limit exceeded

GET /api/recordings
  Description: List all recordings (active and completed)
  Response: List[RecordingInfo]

GET /api/recordings/{recording_id}
  Description: Get single recording details
  Response: RecordingInfo
  Errors:
    - 404: Recording not found

POST /api/recordings/{recording_id}/renew
  Description: Renew recording lease
  Response: { lease_expires_at: datetime }
  Errors:
    - 404: Recording not found
    - 400: Recording is not active

DELETE /api/recordings/{recording_id}
  Description: Stop recording (if active) or delete (if completed)
  Response: RecordingInfo with updated status
  Errors:
    - 404: Recording not found

POST /api/recordings/{recording_id}/restore
  Description: Cancel pending deletion (undo delete)
  Response: RecordingInfo
  Errors:
    - 404: Recording not found
    - 400: Recording is not pending deletion

GET /api/recordings/{recording_id}/download
  Description: Download recording as streaming TAR
  Response: StreamingResponse (application/x-tar)
  Headers: Content-Disposition: attachment; filename="{task_name}_{timestamp}.tar"
  Errors:
    - 404: Recording not found
    - 400: Recording is still active
```

#### BIT Download

```
GET /api/health/bit/download
  Description: Download BIT database files as streaming TAR
  Response: StreamingResponse (application/x-tar)
  Headers: Content-Disposition: attachment; filename="bit_{timestamp}.tar"
```

### OpenAPI Schema Additions

Add to `api/schemas/`:

```yaml
# recordings.yaml
RecordingStatus:
  type: string
  enum:
    - recording
    - completed
    - pending_delete

RecordingInfo:
  type: object
  required:
    - id
    - taskId
    - taskName
    - status
    - startedAt
    - duration
    - size
    - fileCount
  properties:
    id:
      type: string
      description: Unique recording identifier
    taskId:
      type: string
      description: ID of the task being recorded
    taskName:
      type: string
      description: Name of the task being recorded
    status:
      $ref: '#/RecordingStatus'
    startedAt:
      type: integer
      format: int64
      description: Unix timestamp (ms) when recording started
    stoppedAt:
      type: integer
      format: int64
      nullable: true
      description: Unix timestamp (ms) when recording stopped
    duration:
      type: number
      description: Recording duration in seconds
    size:
      type: integer
      format: int64
      description: Total size in bytes
    fileCount:
      type: integer
      description: Number of files in recording
    leaseExpiresAt:
      type: integer
      format: int64
      nullable: true
      description: Unix timestamp (ms) when lease expires (active only)
    deleteScheduledAt:
      type: integer
      format: int64
      nullable: true
      description: Unix timestamp (ms) when deletion will occur (pending_delete only)

DiskUsageInfo:
  type: object
  required:
    - usedBytes
    - maxBytes
    - usedPercent
    - maxPercent
  properties:
    usedBytes:
      type: integer
      format: int64
    maxBytes:
      type: integer
      format: int64
    usedPercent:
      type: number
    maxPercent:
      type: number
```

### Task Integration

When a task is deleted:
1. If task has an active recording → stop the recording first
2. Then delete the task
3. Completed recordings for that task remain downloadable

Update task model to include recording reference:
```yaml
Task:
  properties:
    # ... existing fields ...
    activeRecordingId:
      type: string
      nullable: true
      description: ID of active recording (if any)
```

---

## Frontend Design

### Downloads Modal

Primary UI for browsing and downloading artifacts.

**Location:** Opened via header icon (folder icon)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Downloads                                              [✕]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BIT Database                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📦 4 database files · 156 MB               [Download]    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Recordings                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ MyTask · Jan 15, 12:00                                 │  │
│  │    1.2 GB · 15:23 · 45 files        [Download] [🗑️]       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ✓ TestTask · Jan 14, 15:30                               │  │
│  │    890 MB · 10:45 · 32 files        [Download] [🗑️]       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ⏳ ScanTask · Deleting...                    [Undo]       │  │
│  │    Will be deleted in 4s                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  No completed recordings yet.                                   │  (empty state)
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│  Disk: 2.9 GB / 10 GB ████████░░░░░░░░░░░░ 29%                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
- Completed recording: checkmark icon, download + delete buttons
- Pending delete: hourglass icon, undo button, countdown timer
- Empty state: "No completed recordings yet."

### Header Icon

Add folder icon to header, next to settings gear.

```
┌─────────────────────────────────────────────────────────────────┐
│  SDR Cockpit                                      [📁] [⚙️]    │
└─────────────────────────────────────────────────────────────────┘
```

- Click opens Downloads modal
- No badge/indicator needed (only completed recordings shown in modal)

### Task Card Updates

When a task has an active recording, show recording info in expanded card:

```
┌─ MyTask ────────────────────────────────────────┐
│  ⏺ 915.0 MHz · RX                       REC    │
│  Owner: You · Uptime: 5:23                      │
├─────────────────────────────────────────────────┤
│  📹 Recording: 2:34 · 823 MB                    │
│                                                 │
│  [⏸ Pause]  [■ Stop]  [⏹ Stop Recording]       │
└─────────────────────────────────────────────────┘
```

**Recording display:**
- Duration (updating in real-time via polling)
- Size (formatted: KB, MB, GB)
- "REC" badge in header when recording

**When another user is recording:**
- Show recording status (duration, size)
- Hide "Stop Recording" button (only owner can stop via lease)
- Could show "Recording by: [owner]" if we track that

### Toast Notifications

Show toast when recording completes (manual stop or lease expiration):

```
┌──────────────────────────────────────────────────┐
│  ✓ Recording completed                           │
│    MyTask · 1.2 GB · 15:23                       │
│                                     [Download]   │
└──────────────────────────────────────────────────┘
```

- Auto-dismiss after 5 seconds
- Click "Download" → starts download immediately
- Click elsewhere on toast → opens Downloads modal

**Error toast (disk limit):**
```
┌──────────────────────────────────────────────────┐
│  ⚠ Recording stopped                             │
│    Disk limit reached · 892 MB saved             │
│                                        [View]    │
└──────────────────────────────────────────────────┘
```

### Mobile Support

**Hamburger menu:**
```
┌─ Menu ──────────────────┐
│  📋 Tasks               │
│  💚 Health              │
│  📁 Downloads           │
│  ⚙️ Settings            │
└─────────────────────────┘
```

- "Downloads" opens full-screen Downloads modal
- Same layout as desktop, responsive

### React State & Hooks

**New hooks:**

```typescript
// useRecordings.ts
interface UseRecordingsResult {
  recordings: RecordingInfo[];
  activeRecordings: RecordingInfo[];
  completedRecordings: RecordingInfo[];
  diskUsage: DiskUsageInfo;
  isLoading: boolean;
  startRecording: (taskId: string) => Promise<RecordingInfo>;
  stopRecording: (recordingId: string) => Promise<void>;
  deleteRecording: (recordingId: string) => Promise<void>;
  restoreRecording: (recordingId: string) => Promise<void>;
  downloadRecording: (recordingId: string) => void;
  downloadBit: () => void;
}

// useRecordingLease.ts
// Manages lease renewal for active recording
interface UseRecordingLeaseResult {
  renewLease: () => Promise<void>;
  isRenewing: boolean;
  leaseError: Error | null;
}
```

**Recording lease management:**
- When recording starts, begin interval (every 5 seconds)
- Call POST /api/recordings/{id}/renew
- If renew fails (404 or 400), recording was stopped externally → update UI
- On component unmount, call stop (best effort)

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Add new settings (SDR_DATA_PATH, recording limits)
2. Migrate BIT storage to use new base path
3. Create RecorderInterface and DummyRecorder
4. Create RecordingManager with start/stop/get
5. Add recording API endpoints (start, stop, list, get)
6. Add lease renewal endpoint and expiration checking

### Phase 2: Backend Downloads
1. Implement streaming TAR response for recordings
2. Implement streaming TAR response for BIT database
3. Add disk usage calculation endpoint
4. Add delete/restore endpoints with undo timer

### Phase 3: Frontend Recording Control
1. Update Task model with activeRecordingId
2. Update TaskCard to show recording status
3. Add recording controls (start/stop) to TaskCard
4. Implement lease renewal hook
5. Add recording status polling

### Phase 4: Frontend Downloads UI
1. Create Downloads modal component
2. Add header icon with modal trigger
3. Implement recording list with download/delete actions
4. Implement BIT download section
5. Add disk usage display
6. Implement undo delete with countdown

### Phase 5: Notifications & Polish
1. Add toast notification system (if not exists)
2. Recording complete toast with download button
3. Error toasts for disk limit, lease expiration
4. Mobile hamburger menu integration
5. Empty states and loading states

---

## Future Enhancements

1. **BIT alert toast notifications** - Show toast when new BIT alert detected, click opens BIT drawer
2. **Recording ownership display** - Show who started the recording
3. **Recording notes/tags** - Allow users to annotate recordings
4. **Bulk operations** - Select multiple recordings for download/delete
5. **Recording playback** - Play back recorded IQ data through visualization
6. **Real IQ capture** - Replace DummyRecorder with actual SDR integration

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Session tracking approach | Lease-based with TTL, no session IDs needed |
| Recording on disconnect | Lease expires, recording stops automatically |
| Where to show downloads | Header icon → Downloads modal |
| Active recordings in downloads | No, only completed recordings |
| Delete confirmation | Undo-based (5 second window) |
| Multiple recordings per task | One at a time (409 if already recording) |
| Task deletion with recording | Stop recording, then delete task |
