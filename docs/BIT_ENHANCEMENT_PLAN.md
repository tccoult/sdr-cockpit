# BIT Panel Enhancement Plan

## Overview

Enhance the BIT/health panel with persistent storage, alert logging, and analytics metrics to provide operators with better situational awareness of system health over time.

## Architecture

### Backend Structure

```
backend/app/
├── api/routes/
│   └── health.py          # REST endpoints (existing + new)
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
              ├──> BitStorage.handle_result() - persists snapshot + tests
              │
              └──> AlertManager.handle_result() - detects state changes
                        │
                        └──> publishes to EventBus (Topic.BIT_ALERT)
                                  │
                                  └──> BitStorage.handle_alert() - persists alert
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
    message TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0     -- 0=unread, 1=read
);
CREATE INDEX idx_alerts_timestamp ON bit_alerts(timestamp);
CREATE INDEX idx_alerts_unacknowledged ON bit_alerts(acknowledged, timestamp);
```

## API Endpoints

### GET /api/health/bit/alerts

Returns recent alerts.

Query params:
- `since`: Unix timestamp ms (default: 4 hours ago)
- `limit`: Max alerts (default: 50)
- `unacknowledged_only`: Boolean (default: false)

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
      "message": "IF Output Linearity test failed",
      "acknowledged": false
    }
  ],
  "totalCount": 5,
  "unacknowledgedCount": 2
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

### POST /api/health/bit/alerts/acknowledge

Mark alerts as acknowledged.

Body:
```json
{
  "alertIds": [1, 2, 3]
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

### Phase 1: Backend Foundation
- EventBus with Topic StrEnum
- SQLite schema and BitStorage
- AlertManager with debouncing
- MockBitSubscriber
- Wire up in app lifespan
- New API endpoints

### Phase 2: Frontend
- MetricsSummary component
- AlertsSection component
- SystemHealthPanel layout updates
- useHealthData hook updates
- AlertHistoryModal

### Phase 3: Polish
- Backend tests
- Run checks, fix issues
- Documentation updates
