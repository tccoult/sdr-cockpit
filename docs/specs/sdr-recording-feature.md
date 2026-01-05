# SDR Recording Feature Specification

## Overview

This document specifies a server-owned SDR IQ recording feature that allows users to start/stop recordings on RX tasks, manage completed recordings, and download artifacts as TAR archives.

Recordings are owned by the backend once started. Client disconnects or background tabs do not stop a recording. Disk usage limits protect the system.

## Goals

1. **Record IQ data** from RX tasks with start/stop control
2. **Track recording state** including duration, size, and file count
3. **Disk management** with configurable limits and automatic stop
4. **Download artifacts** including recordings and BIT database files
5. **Shared visibility** - all users can see and control recordings on tasks

## Non-Goals (initial implementation)

- Real IQ data capture (use dummy file generation)
- Per-user recording ownership or auth enforcement
- Recording playback in the UI
- Toast notifications (documented as future enhancement)

---

## Architecture

### Server-Owned Recording Lifecycle

Recordings continue on the server until explicitly stopped or forced by limits.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Recording Lifecycle                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client: POST /api/tasks/{task_id}/record                       │
│    → Backend creates recording, returns Task                    │
│    → Task.recording includes ActiveRecordingInfo summary        │
│    → Recording state: "recording"                               │
│                                                                 │
│  Client: DELETE /api/tasks/{task_id}/record                     │
│    → Stops recording, state → "completed"                       │
│                                                                 │
│  Client: DELETE /api/recordings/{id}                            │
│    → If completed: state → "pending_delete" (5s undo window)    │
│                                                                 │
│  Backend: Periodic disk check (every 5-10 seconds)              │
│    → If limits exceeded → stop ALL active recordings            │
│                                                                 │
│  Backend: Pending delete cleanup (every 1 second)               │
│    → If undo window expires → delete files + metadata           │
│                                                                 │
│  Backend: Optional max duration check (disabled by default)     │
│    → If exceeded → stop recording                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recording States

| State | Description |
|-------|-------------|
| `recording` | Actively writing files |
| `completed` | Stopped (manual, disk limit, or duration limit) |
| `pending_delete` | Marked for deletion, 5-second undo window |

### Stop Reasons

Add a stop reason to explain why a recording ended:

- `user_stop` - explicit stop
- `disk_limit` - disk limit reached
- `max_duration` - optional max duration reached
- `task_deleted` - task deleted while recording

---

## Backend Design

### Settings

Add to `backend/app/config/settings.py`:

```python
# Data storage (shared base path for BIT and recordings)
sdr_data_path: str = "/tmp/sdr_cockpit"

# Recording limits (recordings only)
recording_max_total_size_gb: float = 10.0
recording_max_disk_percent: float = 80.0

# Optional safety valve (0 disables)
recording_max_duration_seconds: int = 0
```

Environment variables:
- `SDR_DATA_PATH` - Base path for all persistent data
- `SDR_RECORDING_MAX_TOTAL_SIZE_GB` - Max total recording storage (default: 10)
- `SDR_RECORDING_MAX_DISK_PERCENT` - Max disk usage percentage (default: 80)
- `SDR_RECORDING_MAX_DURATION_SECONDS` - Optional max duration (default: 0)

### Storage Structure

```
{SDR_DATA_PATH}/
├── bit/
│   ├── bit_history.db
│   └── bit_history_*.db
└── recordings/
    ├── {recording_id}/
    │   ├── metadata.json
    │   ├── chunk_001.bin
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
  "status": "completed",
  "stop_reason": "user_stop"
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
│  start(task_id, task_name) → RecordingDetail                    │
│  stop_for_task(task_id, reason) → RecordingDetail               │
│  delete(recording_id) → schedules deletion                      │
│  cancel_delete(recording_id) → restores from pending            │
│  get(recording_id) → RecordingDetail                            │
│  get_all() → List[RecordingDetail]                              │
│  get_for_task(task_id) → RecordingDetail | None                 │
│  is_task_recording(task_id) → bool                              │
├─────────────────────────────────────────────────────────────────┤
│  Background tasks:                                              │
│  - check_disk_limits() - every 5-10 seconds                     │
│  - cleanup_pending_deletes() - every 1 second                   │
│  - check_max_duration() - every 5-10 seconds                    │
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

### Disk Usage and Limits

- Limits apply to recordings only, not BIT database files.
- `usedBytes` = size of `{SDR_DATA_PATH}/recordings`
- `usedPercent` = disk usage percent from the filesystem containing `SDR_DATA_PATH`
- `maxBytes` = min(
  - `recording_max_total_size_gb` in bytes
  - `recording_max_disk_percent` of total disk size
)
- `maxPercent` = `recording_max_disk_percent` (reported to the UI)
- When limits exceeded:
  - Stop all active recordings
  - Set stop_reason to `disk_limit`
  - Return 507 from new start attempts

### Startup Recovery

On startup:
1. Scan `{SDR_DATA_PATH}/recordings/*/metadata.json`
2. Load completed and pending_delete recordings
3. If metadata says `recording`, mark as `completed` with `stop_reason = "task_deleted"` (orphaned at shutdown) and `stopped_at = now`
4. If pending_delete window expired, delete files

---

## API Endpoints

### Recording Management

```
POST /api/tasks/{task_id}/record
  Description: Start recording on a task
  Response: Task (with recording summary)
  Errors:
    - 404: Task not found
    - 400: Task is not RX type
    - 400: Task status is stopped
    - 409: Task already being recorded
    - 507: Disk limit exceeded
  Notes:
    - Allowed when task status is `live` or `paused`

DELETE /api/tasks/{task_id}/record
  Description: Stop active recording on a task
  Response: Task (recording cleared)
  Errors:
    - 404: Task not found
    - 400: Task is not recording
  Notes:
    - Stopping does not delete files; use recordings API to delete

GET /api/recordings
  Description: List recordings (completed + pending_delete by default)
  Query: includeActive=true to include active recordings
  Response: List[RecordingDetail]
  Notes:
    - Default sort: most recent first (startedAt desc)

GET /api/recordings/{recording_id}
  Description: Get single recording details
  Response: RecordingDetail
  Errors:
    - 404: Recording not found

DELETE /api/recordings/{recording_id}
  Description: Delete completed recording (moves to pending_delete)
  Response: RecordingDetail with updated status
  Errors:
    - 404: Recording not found
    - 400: Recording is still active
  Notes:
    - Stop active recordings via `DELETE /api/tasks/{task_id}/record`

POST /api/recordings/{recording_id}/restore
  Description: Cancel pending deletion (undo delete)
  Response: RecordingDetail
  Errors:
    - 404: Recording not found
    - 400: Recording is not pending deletion

GET /api/recordings/{recording_id}/download
  Description: Download recording as streaming TAR
  Response: StreamingResponse (application/x-tar)
  Headers: Content-Disposition: attachment; filename="{task_name}_{timestamp}.tar"
  Notes:
    - Archive the full recording directory contents (metadata + chunks)
  Errors:
    - 404: Recording not found
    - 400: Recording is still active or pending deletion

GET /api/recordings/disk-usage
  Description: Current disk usage and limits for recordings
  Response: DiskUsageInfo
```

### Client Data Flow Summary

- Task list (`GET /api/tasks`) is the source of active recording status and stats.
- Start/stop recording uses `/api/tasks/{task_id}/record` and expects a Task response.
- Downloads modal uses `GET /api/recordings` (completed/pending) and `GET /api/recordings/disk-usage`.
- Active recordings do not appear in the downloads list unless `includeActive=true`.

### BIT Download

```
GET /api/health/bit/download
  Description: Download BIT database files as streaming TAR
  Response: StreamingResponse (application/x-tar)
  Headers: Content-Disposition: attachment; filename="bit_{timestamp}.tar"
  Notes:
    - Use a temporary snapshot to avoid packaging a live SQLite file
    - Delete snapshots after streaming; remove stale snapshots on startup
```

---

## OpenAPI Schema Additions

Add to `api/schemas/`:

```yaml
# recordings.yaml
RecordingStatus:
  type: string
  enum:
    - recording
    - completed
    - pending_delete

RecordingStopReason:
  type: string
  enum:
    - user_stop
    - disk_limit
    - max_duration
    - task_deleted

ActiveRecordingInfo:
  type: object
  required:
    - id
    - filename
    - duration
    - size
    - isRecording
  properties:
    id:
      type: string
    filename:
      type: string
    duration:
      type: number
      description: Recording duration in seconds
    size:
      type: integer
      format: int64
      description: Total size in bytes
    isRecording:
      type: boolean

RecordingDetail:
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
    taskId:
      type: string
    taskName:
      type: string
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
    size:
      type: integer
      format: int64
    fileCount:
      type: integer
    stopReason:
      allOf:
        - $ref: '#/RecordingStopReason'
      description: Reason recording stopped (completed only)
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

Update task schema:
```yaml
Task:
  properties:
    # ... existing fields ...
    owner:
      $ref: '#/TaskOwner'
    ownerName:
      type: string
    recording:
      anyOf:
        - $ref: './recordings.yaml#/ActiveRecordingInfo'
        - type: 'null'
```

Update `TaskOwner` enum:
```yaml
TaskOwner:
  type: string
  enum:
    - user
    - system
  description: Owner domain (user-managed vs system-managed)
```

---

## Task Integration and Ownership Rules

- `TaskOwner.user` = user-managed task (created by UI/API)
- `TaskOwner.system` = system-managed task (created by external process)
  - Backend assigns `user` for tasks created via `/api/tasks`

Task controls:
- Pause/resume/stop/delete: **user tasks only**
- System tasks are read-only in the UI and rejected by backend for stop/delete

Recording controls:
- Start/stop recordings: **any client** on any RX task
- Start allowed when task status is `live` or `paused`
- Start blocked when task status is `stopped` (or task deleted)
- Delete recordings: completed recordings only (via recordings API)
- Stop active recordings via task endpoint (`DELETE /api/tasks/{task_id}/record`)
- Recording lifecycle is independent of task ownership

When a task is deleted:
1. If task has an active recording → stop the recording first (`stop_reason = task_deleted`)
2. Then delete the task

---

## Frontend Design

### Downloads Modal

Primary UI for browsing and downloading artifacts. Use the shared dialog/modal pattern.

**Location:** Opened via header icon (folder/download icon)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Downloads                                              [x]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BIT Database                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4 database files · 156 MB                 [Download]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Recordings                                                     │
│  Active recordings are shown in Tasks                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Completed · MyTask · Jan 15, 12:00                       │  │
│  │  1.2 GB · 15:23 · 45 files        [Download] [Delete]     │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Completed · TestTask · Jan 14, 15:30                     │  │
│  │  890 MB · 10:45 · 32 files        [Download] [Delete]     │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Deleting...                              [Undo]          │  │
│  │  Will be deleted in 4s                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  No completed recordings yet.                                   │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│  Recordings: 2.9 GB / 10 GB ████████░░░░░░░░  Disk 29%          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
- Completed recording: download + delete buttons
- Pending delete: undo button, countdown timer
- Empty state: "No completed recordings yet."
- Active recordings are not listed; show a short info row with active count and point users to Tasks.

### Header Icon

Add a Downloads icon next to settings (same button styling as Settings):

```
┌─────────────────────────────────────────────────────────────────┐
│  SDR Cockpit                                      [Downloads]   │
└─────────────────────────────────────────────────────────────────┘
```

- Click opens Downloads modal
- No badge/indicator needed

### Task Card Updates

When a task has an active recording, show recording info in expanded card:

```
┌─ MyTask ────────────────────────────────────────┐
│  915.0 MHz · RX                       REC       │
│  Owner: You · Uptime: 5:23                      │
├─────────────────────────────────────────────────┤
│  Recording: 2:34 · 823 MB                       │
│                                                 │
│  [Pause] [Stop Task] [Stop Recording]           │
└─────────────────────────────────────────────────┘
```

Recording controls:
- Always visible for RX tasks (any client)
- Task controls (pause/stop/delete) only for `TaskOwner.user`
- Recording row shows duration and size (no filename)
- Visually distinguish "Stop Task" vs "Stop Recording" to avoid confusion
- If task controls are locked, keep recording controls enabled and explain the read-only task state
- Disable or hide "Start Recording" when task status is `stopped`

### Mobile Support

**Hamburger menu:**
```
┌─ Menu ──────────────────┐
│  Tasks                  │
│  Health                 │
│  Downloads              │
│  Settings               │
└─────────────────────────┘
```

- "Downloads" opens the same modal (full-screen on mobile)

### Toast Notifications (Future Enhancement)

Recommendation (not required for v1):
- Add a toast system (Radix Toast or Sonner)
- Placement: top-right on desktop, bottom-center on mobile
- Use for recording complete and disk limit notifications
- Include action buttons (Download, View)

---

## React State and Hooks

**New hooks:**

```typescript
// useRecordings.ts
interface UseRecordingsResult {
  recordings: RecordingDetail[];
  activeRecordings: RecordingDetail[];
  completedRecordings: RecordingDetail[];
  diskUsage: DiskUsageInfo | null;
  isLoading: boolean;
  startRecording: (taskId: string) => Promise<Task>;
  stopRecording: (taskId: string) => Promise<Task>;
  deleteRecording: (recordingId: string) => Promise<RecordingDetail>;
  restoreRecording: (recordingId: string) => Promise<RecordingDetail>;
  downloadRecording: (recordingId: string) => void;
  downloadBit: () => void;
}
```

Notes:
- start/stop map to `/api/tasks/{task_id}/record`
- delete/restore/download map to `/api/recordings/*`
- activeRecordings derived from the tasks list (unless includeActive is requested)

Polling:
- Tasks list: existing cadence (for active recording stats)
- Recordings list: every 2-3 seconds (completed/pending)
- Disk usage: every 5-10 seconds

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Add new settings and migrate BIT storage to `{SDR_DATA_PATH}/bit`
2. Create RecorderInterface and DummyRecorder
3. Create RecordingManager with start/stop/get/list
4. Add recording API endpoints (start, stop, list, get)
5. Add stop reason tracking and startup recovery

### Phase 2: Backend Downloads and Limits
1. Implement streaming TAR response for recordings
2. Implement streaming TAR response for BIT database (snapshot)
3. Add disk usage calculation endpoint
4. Add delete/restore endpoints with undo timer
5. Enforce disk limits in background

### Phase 3: Frontend Recording Control
1. Update TaskOwner enum to `user|system` in generated types
2. Update TaskCard and ActiveTaskPanel to allow recording controls for all RX tasks
3. Keep task controls restricted to user tasks
4. Add recording status display (duration, size)

### Phase 4: Frontend Downloads UI
1. Create Downloads modal component (Dialog-based)
2. Add header icon and mobile menu entry
3. Implement recording list with download/delete actions
4. Implement BIT download section
5. Add disk usage display
6. Implement undo delete with countdown

### Phase 5: Polish
1. Empty and loading states
2. Error handling for disk limit and missing recordings
3. Optional toast system (future enhancement)

---

## Future Enhancements

1. **Toast notifications** - add a toast system as described above
2. **Recording notes/tags** - annotate recordings for later search
3. **Bulk operations** - select multiple recordings for download/delete
4. **Recording playback** - play back recorded IQ data through visualization
5. **Real IQ capture** - replace DummyRecorder with actual SDR integration

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Recording ownership | No per-user ownership; any client can control recordings |
| Client disconnect handling | Recording continues; server-owned lifecycle |
| Where to show downloads | Header icon → Downloads modal |
| Active recordings in downloads | No, only completed/pending delete (show active count note) |
| Delete confirmation | Undo-based (5 second window) |
| Multiple recordings per task | One at a time (409 if already recording) |
| Task deletion with recording | Stop recording first, then delete task |
| Task ownership semantics | `user` (UI-managed) vs `system` (external) |
