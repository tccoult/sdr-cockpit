# BIT Panel Enhancement Plan

## Overview

Enhance the BIT/health panel with persistent storage, alert logging, and analytics metrics to provide operators with better situational awareness of system health over time.

## Current Status

- **Phase 1 (Backend Foundation)**: ✅ COMPLETE
- **Phase 2 (Frontend)**: 🔄 IN PROGRESS
- **Phase 3 (Polish)**: ⏳ PENDING

## Architecture

### Backend Structure

```
backend/app/
├── api/routes/
│   └── health.py          # REST endpoints (4 endpoints)
├── core/
│   ├── event_bus.py       # Central pub/sub for internal events
│   └── bit_storage.py     # SQLite persistence layer
└── handlers/
    ├── bit_subscriber.py  # Mock ZMQ subscriber (adapter)
    └── alert_manager.py   # Alert detection and creation
```

### Event Flow

```
MockBitSubscriber (handlers/)
    │
    └──> publishes to EventBus (Topic.BIT_RESULT)
              │
              ├──> BitStorage.handle_result() - caches & persists snapshot + tests
              │
              └──> AlertManager.handle_result() - detects state changes
                        │
                        └──> publishes to EventBus (Topic.BIT_ALERT)
                                  │
                                  └──> BitStorage.handle_alert() - persists alert
```

### Initialization (FastAPI Lifespan)

All components are instantiated and wired in `main.py` lifespan context manager:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create instances
    event_bus = EventBus()
    bit_storage = BitStorage()
    alert_manager = AlertManager()
    bit_subscriber = MockBitSubscriber()

    # Wire event subscriptions
    event_bus.subscribe(Topic.BIT_RESULT, bit_storage.handle_result)
    event_bus.subscribe(Topic.BIT_ALERT, bit_storage.handle_alert)
    event_bus.subscribe(Topic.BIT_RESULT, alert_manager.handle_result)
    alert_manager.set_event_bus(event_bus)
    bit_subscriber.set_event_bus(event_bus)

    # Store in app.state for route access
    app.state.bit_storage = bit_storage
    ...
```

### Event Bus

Simple topic-based pub/sub with typed topics:

```python
from enum import StrEnum

class Topic(StrEnum):
    BIT_RESULT = "bit.result"
    BIT_ALERT = "bit.alert"
```

## Database Schema

SQLite with Postgres-compatible SQL. 7-day retention with daily rotation.

```sql
-- BIT result snapshots (one per update, every 2-3 seconds)
CREATE TABLE bit_snapshots (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER NOT NULL,        -- Unix ms
    summary_total INTEGER NOT NULL,
    summary_ok INTEGER NOT NULL,
    summary_warn INTEGER NOT NULL,
    summary_fail INTEGER NOT NULL
);
CREATE INDEX idx_snapshots_timestamp ON bit_snapshots(timestamp);

-- Individual test results per snapshot
CREATE TABLE bit_test_results (
    id INTEGER PRIMARY KEY,
    snapshot_id INTEGER NOT NULL,
    test_id TEXT NOT NULL,
    status TEXT NOT NULL,              -- ok, warn, fail, unknown
    duration_ms INTEGER,
    metrics_json TEXT,                 -- JSON blob for metrics
    FOREIGN KEY (snapshot_id) REFERENCES bit_snapshots(id) ON DELETE CASCADE
);
CREATE INDEX idx_test_results_snapshot ON bit_test_results(snapshot_id);
CREATE INDEX idx_test_results_test_status ON bit_test_results(test_id, status);

-- Status transition alerts
CREATE TABLE bit_alerts (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER NOT NULL,        -- Unix ms
    test_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    previous_status TEXT,              -- null if first observation
    new_status TEXT NOT NULL,
    severity TEXT NOT NULL,            -- failed, degraded, recovered
    message TEXT NOT NULL
);
CREATE INDEX idx_alerts_timestamp ON bit_alerts(timestamp);
```

## API Endpoints

### GET /api/health/bit/results

Returns the latest BIT result with all tests and trees.

Response: Full `BitResult` object with `tests`, `functionTree`, `hardwareTree`, and `summary`.

### GET /api/health/bit/alerts

Returns recent alerts. Frontend uses time-based filtering to avoid duplication (no acknowledgment state).

Query params:
- `since`: Unix timestamp ms (default: 4 hours ago)
- `limit`: Max alerts (default: 50)

Response:
```json
{
  "alerts": [
    {
      "id": 1,
      "timestamp": 1703520000000,
      "testId": "rf-if-linearity",
      "testName": "IF Output Linearity",
      "previousStatus": "ok",
      "newStatus": "fail",
      "severity": "failed",
      "message": "IF Output Linearity test failed"
    }
  ],
  "totalCount": 5
}
```

### GET /api/health/bit/metrics

Returns health metrics over a time window.

Query params:
- `window_minutes`: Time window (default: 240 = 4 hours)

Response:
```json
{
  "windowMinutes": 240,
  "snapshotCount": 4800,
  "uptimePercent": 98.5,
  "degradedMinutes": 12.5,
  "nonOpMinutes": 2.3,
  "failureCount": 3,
  "topFailingTests": [
    {"testId": "rf-if-linearity", "testName": "IF Output Linearity", "failCount": 2},
    {"testId": "clock-discipline", "testName": "Clock PLL Discipline", "failCount": 1}
  ]
}
```

### GET /api/health/bit/history

Returns test history for time-series visualization (future use).

Query params:
- `test_id`: Required
- `since`: Unix timestamp ms
- `until`: Unix timestamp ms

Response:
```json
{
  "testId": "rf-if-linearity",
  "testName": "IF Output Linearity",
  "points": [
    {"timestamp": 1703520000000, "status": "ok", "durationMs": 850},
    {"timestamp": 1703520003000, "status": "warn", "durationMs": 920}
  ]
}
```

## Frontend Components

### Panel Layout

```
┌─────────────────────────────────────────┐
│ [MetricsSummary] ← Fixed 48px           │
│ 98.5% uptime │ 2 fails │ ▾ Details      │
├─────────────────────────────────────────┤
│ ▼ Alerts (2 new) ← Collapsible          │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ IF Output failed 2m ago          │ │  Max 120px when expanded
│ │ ⚡ Clock degraded 5m ago            │ │  Own scroll if overflow
│ │ [View full history]                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [Tests] [Function] [Hardware]           │ ← Fixed 40px
├─────────────────────────────────────────┤
│                                         │
│  Tab content (scrolls independently)    │  flex-1
│                                         │
└─────────────────────────────────────────┘
```

### New Components

- `MetricsSummary.tsx` - Compact metrics bar with expandable details
- `AlertsSection.tsx` - Collapsible recent alerts with badge
- `AlertHistoryModal.tsx` - Full alert log (opened via "View full history")

### Scrolling Behavior

- MetricsSummary: Fixed height, never scrolls
- AlertsSection: Max height 120px when expanded, internal scroll
- Tab bar: Fixed height
- Tab content: Takes remaining space, scrolls independently

## Alert Logic

### Severity Types

| Severity | Trigger | Message Template |
|----------|---------|------------------|
| `failed` | Any status → `fail` | "{test_name} test failed" |
| `degraded` | `ok` → `warn` | "{test_name} degraded to warning" |
| `recovered` | `fail` or `warn` → `ok` | "{test_name} recovered" |

### Debouncing

30-second window per test. If a test flaps within the window, only the final state change generates an alert.

## Metrics Calculation

Metrics are calculated from snapshot summaries (efficient - no join to test_results):

- **Uptime %**: `snapshots where summary_fail == 0 / total snapshots * 100`
- **Degraded minutes**: `snapshots where summary_warn > 0 and summary_fail == 0 * interval`
- **Non-op minutes**: `snapshots where summary_fail > 0 * interval`
- **Failure count**: Count of `failed` severity alerts in window

Top failing tests requires test_results join but uses covering index.

## Data Retention

- 7-day retention
- Daily rotation: Archive/delete snapshots older than 7 days
- Cleanup runs on app startup and daily via background task

## Implementation Phases

### Phase 1: Backend Foundation ✅ COMPLETE

- [x] EventBus with Topic StrEnum (`app/core/event_bus.py`)
- [x] SQLite schema and BitStorage (`app/core/bit_storage.py`)
- [x] AlertManager with 30s debouncing (`app/handlers/alert_manager.py`)
- [x] MockBitSubscriber generates realistic BIT data (`app/handlers/bit_subscriber.py`)
- [x] Wire up in app lifespan using `app.state` (no global singletons)
- [x] API endpoints: `/bit/results`, `/bit/alerts`, `/bit/metrics`, `/bit/history`
- [x] Generated types used for API responses (no manual route models)

### Phase 2: Frontend 🔄 IN PROGRESS

Remaining tasks:

1. **MetricsSummary component** (`frontend/src/components/health/MetricsSummary.tsx`)
   - Display uptime %, failure count, degraded/non-op minutes
   - Fetch from `GET /api/health/bit/metrics`
   - Expandable/collapsible details
   - Compact fixed-height bar (48px)

2. **AlertsSection component** (`frontend/src/components/health/AlertsSection.tsx`)
   - Display recent alerts with severity icons
   - Fetch from `GET /api/health/bit/alerts?since=<30s_ago>` for polling
   - Initial load: `since=<1hr_ago>`
   - Frontend deduplication by alert ID
   - Collapsible, max 120px height with internal scroll
   - Badge showing count of recent alerts

3. **useHealthData hook updates** (`frontend/src/hooks/useHealthData.ts`)
   - Add metrics fetching (optional, lower frequency than BIT results)
   - Add alerts fetching with time-based pagination
   - Track `lastAlertTimestamp` for incremental fetching

4. **SystemHealthPanel layout** (`frontend/src/components/health/SystemHealthPanel.tsx`)
   - Integrate MetricsSummary at top
   - Integrate AlertsSection below metrics
   - Adjust flex layout for remaining tab content

5. **AlertHistoryModal** (optional, lower priority)
   - Full alert log with filtering
   - Opened via "View full history" link in AlertsSection

### Phase 3: Polish ⏳ PENDING

- [x] Backend unit tests for core modules
- [ ] Frontend tests for new components
- [ ] Run full check suite
- [ ] Final documentation updates
