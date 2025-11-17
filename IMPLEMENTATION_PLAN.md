# Data Source Visualization Decoupling - Implementation Plan

## Overview

Decouple task management from visualization by introducing a generic **Data Source** model. This allows:
- Viewing any data source (task outputs, detectors, demodulators, external streams)
- Fast source switching for visualization
- Independent task lifecycle management
- Efficient backend multiplexing (serialize once, fan out to many clients)

---

## Backend Architecture

### Core Concept: Source Discovery vs Attachment

**Discovery/Registration:**
- Sources are registered as "available" in the system
- Registration != data production
- Sources can exist without any clients connected

**Attachment:**
- At least 1 WebSocket client subscribes to a source
- Backend attaches to underlying data provider (SDR service, detector, etc.)
- Starts data production and serialization
- Auto-detach when last client disconnects

**Lifecycle:**
```
Source Registered → Available for subscription
    ↓ (first client subscribes)
Source Attached → Backend connects to data provider, starts producing
    ↓ (clients subscribe/unsubscribe)
Clients come and go → Data multiplexed to all subscribers
    ↓ (last client unsubscribes)
Source Detached → Backend disconnects from provider, stops producing
    ↓ (still registered, can re-attach later)
Source Unregistered → Removed from system
```

### Components

**1. DataSource (Abstract Base)**
- Represents any source that can produce spectral/RF data
- Manages subscriber queues (one per WebSocket client)
- Handles attach/detach lifecycle
- Serializes data once, fans out to all subscribers
- Non-blocking publish (backpressure handling)

**2. SourceManager (Global Registry)**
- Registry of all available sources
- Handles client subscription/unsubscription
- Auto-starts sources on first subscriber
- Auto-stops sources on last unsubscribe
- Thread-safe access to source registry

**3. Concrete Source Types**
- `TaskDataSource` - Raw IQ from RX tasks
- Future: `DetectorSource`, `DemodulatorSource`, etc.

### Data Flow

```
TaskDataSource._produce_loop()
    ↓
Compute FFT (once)
    ↓
Serialize + Compress (once)
    ↓
publish(serialized_bytes)
    ↓
Fan out to all subscriber queues (non-blocking)
    ↓
WebSocket handlers pump queues to clients
```

### Key Design Decisions

**Queue Management:**
- Size: ~5 frames
- Behavior when full: Drop old frames, push new to head (FIFO with overflow)
- Destroyed on client disconnect
- No persistent storage of old frames

**Serialization:**
- One-shot: Serialize once per batch, send same bytes to all clients
- No repeated serialization/compression work

**Backpressure:**
- Slow clients don't block fast ones
- Queue overflow = drop old frames for that client only

**Auto-cleanup:**
- Sources detach when no subscribers (stops data production)
- Sources stay registered (can re-attach later)
- Task deletion unregisters associated sources

### API Endpoints

```
GET /api/sources
Response: [{ id, name, type, centerFrequency, sampleRate, status, ... }]

WS /ws/sources/{source_id}/data
Streams binary protobuf data to client
```

### Test Data Migration

**Migrate existing test data generation to use the new source model:**
- Current: Mock data generator directly tied to task WebSocket endpoints
- New: Test data sources that follow the same discovery → attachment flow

**Implementation:**
- When a task is created in the UI, automatically register a corresponding test data source
- Source is registered (discoverable) but not attached (not producing data yet)
- When first client subscribes via WebSocket, source attaches and starts generating test data
- When last client disconnects, source detaches and stops generating
- Full exercise of the discovery → attachment → multiplexing → detachment lifecycle

**Benefits:**
- Test the entire new architecture without real SDR hardware
- Validate multiplexing efficiency (one generator, many clients)
- Ensure backpressure and queue management work correctly

### Configuration

- Move from env variables to `config.yaml`
- Include queue sizes, compression settings, etc.

---

## Frontend Architecture

### Core Changes

**1. Decouple Visualization from Task Selection**
- Remove "active task" concept from task roster
- Task selection != visualization source
- URL: `?source=<sourceId>` (simple ID, not descriptive)

**2. Add Source Selector Toolbar**
```
┌────────────────────────────────────────────────┐
│ 🎯 [Source Dropdown ▾]  [Pan] [Reset] [Max]   │ ← Viz toolbar
├────────────────────────────────────────────────┤
│                                                │
│          FFT Visualization                     │
│                                                │
└────────────────────────────────────────────────┘
```

**Toolbar Contents:**
- Source selector dropdown (left)
- Visualization controls (pan/zoom/reset/max-hold)
- Combined = all viz config in one place

**Source Dropdown:**
- Searchable/filterable list (consider `cmdk` library)
- Fuzzy search on name, type, frequency
- Flat list with type badges
- Shows: icon, name, type badge, frequency, status
- Optional: Keyboard shortcut (Ctrl+K) for power users

**3. Task Roster UI Improvements**
- Slimmer task cards (collapsed by default)
- Click to expand/collapse (like BIT tests panel)
- Only one expanded at a time
- Expanded view shows: full details + controls (pause/resume/stop/record)
- No "active task" highlighting

### New Hooks

```typescript
// Replace useTaskParams()
useActiveSource() // Reads ?source= from URL, returns sourceId

// Replace useDataStream()
useSourceStream(sourceId) // Connects to /ws/sources/{id}/data

// New
useDataSources() // Fetches all available sources from /api/sources
```

### Data Model

```typescript
interface DataSource {
  id: string;              // e.g., "a1b2c3d4" (simple UUID/hash)
  name: string;            // e.g., "Beacon RX - Raw IQ"
  type: string;            // "raw" | "detector" | "demod" | "external"
  typeLabel: string;       // "Raw" | "Det" | "Demod" | "Ext"
  centerFrequency: number;
  sampleRate: number;
  status: 'active' | 'idle';
  parentTaskId?: string;   // If this is a task output
}
```

---

## Implementation Steps

### Phase 1: Backend Foundation
1. Create `DataSource` base class with subscriber management
2. Create `SourceManager` singleton
3. Implement `MockTaskDataSource` (migrate test data generator to source model)
4. Update task creation to auto-register test data source (discovery)
5. Update task deletion to unregister test data source
6. Add `GET /api/sources` endpoint
7. Update WebSocket endpoint: `/ws/sources/{source_id}/data`
8. Verify attachment/detachment lifecycle with test sources

### Phase 2: Frontend Decoupling
1. Create `useDataSources()` hook
2. Create `useActiveSource()` hook (URL-based source selection)
3. Create `useSourceStream()` hook (replace `useDataStream`)
4. Add source selector toolbar component
5. Update `VisualizationView` to use source instead of task
6. Update URL routing to use `?source=` instead of `?task=`

### Phase 3: Task Roster UI
1. Redesign task cards (slimmer, collapsible)
2. Implement expand/collapse behavior (one at a time)
3. Move task controls into expanded view
4. Remove "active task" selection/highlighting

### Phase 4: Polish
1. Add fuzzy search to source dropdown
2. Add keyboard shortcuts (optional)
3. Migrate config to YAML
4. Add source status indicators (active/idle/error)

---

## Future Enhancements (Out of Scope)

- Detector/demodulator source types
- Automatic source discovery from SDR backend
- Orphaned task cleanup
- Multi-panel visualization (multiple sources simultaneously)
- Source metadata customization

---

## Open Questions

- [ ] Exact queue size (5? 10? configurable?)
- [ ] Task orphan cleanup strategy (timeout? manual?)
- [ ] Source ID format (UUID? short hash? sequential?)
- [ ] YAML config structure
