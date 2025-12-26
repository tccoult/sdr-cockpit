# BIT Panel Enhancement Plan

## Overview

Enhance the BIT/health panel with persistent storage, alert logging, and analytics metrics to provide operators with better situational awareness of system health over time.

## Current State

- **Frontend**: 3-view panel (Tests, Function Tree, Hardware Tree) with real-time status display
- **Backend**: Generates random test data on each request (no persistence)
- **Polling**: 3-second refresh interval
- **Data Model**: 7 atomic tests rolled up into Function and Hardware hierarchies

## Proposed Enhancements

### 1. SQLite Persistence Layer

Add SQLite database to store BIT history, enabling time-series analysis and alert generation.

**Database Schema:**

```sql
-- Store each BIT result snapshot
CREATE TABLE bit_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,  -- Unix ms
    summary_total INTEGER NOT NULL,
    summary_ok INTEGER NOT NULL,
    summary_warn INTEGER NOT NULL,
    summary_fail INTEGER NOT NULL
);

-- Store individual test results per snapshot
CREATE TABLE bit_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    test_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- ok, warn, fail, unknown
    duration_ms INTEGER,
    metrics_json TEXT,  -- JSON blob for metrics
    FOREIGN KEY (snapshot_id) REFERENCES bit_snapshots(id)
);
CREATE INDEX idx_test_results_test_id ON bit_test_results(test_id);
CREATE INDEX idx_test_results_snapshot ON bit_test_results(snapshot_id);

-- Store status transition events (alerts)
CREATE TABLE bit_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,  -- Unix ms
    test_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    previous_status TEXT,  -- null if first observation
    new_status TEXT NOT NULL,
    severity TEXT NOT NULL,  -- 'degraded' (ok->warn), 'failed' (ok/warn->fail), 'recovered' (fail/warn->ok)
    message TEXT NOT NULL
);
CREATE INDEX idx_alerts_timestamp ON bit_alerts(timestamp);
CREATE INDEX idx_alerts_test_id ON bit_alerts(test_id);
```

**Backend Components:**

- `backend/app/db/bit_storage.py` - SQLite connection and CRUD operations
- `backend/app/services/bit_service.py` - Business logic: alert detection, metrics calculation
- Database file: `data/bit_history.db` (configurable via settings)

---

### 2. Alert Log System

Track status transitions and surface them as alerts in the UI.

**Alert Types:**

| Severity   | Trigger                          | Example Message                                      |
|------------|----------------------------------|------------------------------------------------------|
| `failed`   | Status changed to `fail`         | "IF Output Linearity test failed at 14:32:05"        |
| `degraded` | Status changed to `warn`         | "Clock PLL Discipline degraded to warning at 14:30:12"|
| `recovered`| Status changed from fail/warn to `ok` | "GPS Holdover Stability recovered at 14:35:00" |

**API Endpoints:**

```yaml
GET /api/health/bit/alerts
  Query params:
    - since: Unix timestamp (ms) - optional, default last 4 hours
    - limit: number of alerts to return (default 50)
    - test_id: filter by test ID (optional)
    - severity: filter by severity (optional)
  Response: BitAlertList
```

**Frontend Component:**

- New `AlertsView` component as a 4th tab in SystemHealthPanel
- Shows chronological list of alerts with severity icons
- Click alert to navigate to related test
- Optional: toast notifications for new alerts

---

### 3. Analytics Metrics

Calculate and display health metrics over configurable time windows.

**Metrics to Track:**

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Uptime % | Time in fully operational state | `(ok_duration / total_duration) * 100` |
| Degraded Time | Total time spent in degraded (warn) state | Sum of warn durations |
| Non-Op Time | Total time in non-operational (fail) state | Sum of fail durations |
| MTBF | Mean Time Between Failures | Average time between fail events |
| Most Failing Tests | Tests with highest failure counts | Count failures per test_id |
| Failure Rate | Failures per hour | `fail_count / hours` |

**API Endpoints:**

```yaml
GET /api/health/bit/metrics
  Query params:
    - window: time window in minutes (default 240 = 4 hours)
  Response: BitMetricsResponse

GET /api/health/bit/history
  Query params:
    - test_id: required
    - since: Unix timestamp (ms) - optional
    - until: Unix timestamp (ms) - optional
  Response: BitTestHistory (for future time-series graphs)
```

**Frontend Component:**

- New `MetricsSummary` component at top of SystemHealthPanel
- Compact display: "98.5% uptime | 2 failures today | Top issue: IF Output Linearity"
- Expandable for detailed breakdown
- Time window selector (1h, 4h, 24h, 7d)

---

### 4. Mock ZMQ Subscriber (Placeholder)

Since actual ZMQ rollup messages are proprietary, create a mock subscriber that simulates receiving BIT updates.

**Implementation:**

```python
# backend/app/services/bit_subscriber.py

class MockBitSubscriber:
    """Mock ZMQ subscriber that generates BIT updates every 2-3 seconds"""

    def __init__(self, callback: Callable[[BitResult], None]):
        self.callback = callback
        self._running = False

    async def start(self):
        """Start generating mock BIT updates"""
        self._running = True
        while self._running:
            result = generate_mock_bit_result()  # From existing logic
            self.callback(result)
            await asyncio.sleep(random.uniform(2, 3))

    def stop(self):
        self._running = False

# In production, this would be replaced with actual ZMQ subscriber:
# class ZmqBitSubscriber:
#     def __init__(self, endpoint: str, callback):
#         self.context = zmq.asyncio.Context()
#         self.socket = self.context.socket(zmq.SUB)
#         self.socket.connect(endpoint)
#         ...
```

**Lifecycle:**

- Start subscriber on app startup via FastAPI lifespan
- Subscriber writes to SQLite and triggers alert detection
- Frontend continues polling API (or use WebSocket for push updates)

---

### 5. Enhanced UI Layout

**Proposed Panel Layout:**

```
┌─────────────────────────────────────────┐
│ [Metrics Summary Bar]                    │
│ 98.5% uptime │ 2 fails today │ ▾ More   │
├─────────────────────────────────────────┤
│ [Tests] [Function] [Hardware] [Alerts]  │
├─────────────────────────────────────────┤
│                                         │
│  (Selected View Content)                │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Alert Badge:**

- Show unread alert count on Alerts tab: `Alerts (3)`
- Clear badge when user views alerts

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Create SQLite schema and storage layer
2. Add BitService with alert detection logic
3. Implement mock ZMQ subscriber
4. Add `/api/health/bit/alerts` endpoint
5. Add `/api/health/bit/metrics` endpoint
6. Add `/api/health/bit/history` endpoint (for future use)
7. Update OpenAPI schema with new types

### Phase 2: Frontend - Alerts
1. Add `BitAlert` types to OpenAPI schema
2. Create `AlertsView` component
3. Add 4th tab to SystemHealthPanel
4. Implement alert API calls in useHealthData hook

### Phase 3: Frontend - Metrics
1. Add `BitMetrics` types to OpenAPI schema
2. Create `MetricsSummary` component
3. Add metrics display to panel header
4. Add time window selector

### Phase 4: Polish & Future Prep
1. Add test coverage for new backend logic
2. Consider WebSocket push for real-time alerts
3. Prepare data structure for future time-series graphs
4. Add right-click context menu placeholder for tests

---

## New OpenAPI Schema Types

```yaml
# api/schemas/health.yaml (additions)

BitAlert:
  type: object
  required: [id, timestamp, testId, testName, newStatus, severity, message]
  properties:
    id: { type: integer }
    timestamp: { type: integer, description: "Unix timestamp ms" }
    testId: { type: string }
    testName: { type: string }
    previousStatus: { $ref: '#/BitStatus' }
    newStatus: { $ref: '#/BitStatus' }
    severity:
      type: string
      enum: [failed, degraded, recovered]
    message: { type: string }

BitAlertList:
  type: object
  required: [alerts, totalCount]
  properties:
    alerts: { type: array, items: { $ref: '#/BitAlert' } }
    totalCount: { type: integer }

BitHealthMetrics:
  type: object
  required: [windowMinutes, uptimePercent, degradedMinutes, nonOpMinutes, failureCount, topFailingTests]
  properties:
    windowMinutes: { type: integer }
    uptimePercent: { type: number }
    degradedMinutes: { type: number }
    nonOpMinutes: { type: number }
    failureCount: { type: integer }
    topFailingTests:
      type: array
      items:
        type: object
        properties:
          testId: { type: string }
          testName: { type: string }
          failCount: { type: integer }

BitTestHistoryPoint:
  type: object
  required: [timestamp, status]
  properties:
    timestamp: { type: integer }
    status: { $ref: '#/BitStatus' }
    durationMs: { type: integer }
    metricsJson: { type: string }

BitTestHistory:
  type: object
  required: [testId, testName, points]
  properties:
    testId: { type: string }
    testName: { type: string }
    points: { type: array, items: { $ref: '#/BitTestHistoryPoint' } }
```

---

## File Structure (New Files)

```
backend/
├── app/
│   ├── db/
│   │   └── bit_storage.py      # SQLite operations
│   ├── services/
│   │   ├── bit_service.py      # Alert detection, metrics calc
│   │   └── bit_subscriber.py   # Mock ZMQ subscriber
│   └── api/routes/
│       └── health.py           # (modify) Add new endpoints
├── data/
│   └── .gitkeep                # SQLite DB goes here
└── tests/
    ├── test_bit_storage.py
    └── test_bit_service.py

frontend/
└── src/
    ├── components/system-health/
    │   ├── AlertsView.tsx      # New component
    │   └── MetricsSummary.tsx  # New component
    └── hooks/
        └── useHealthData.ts    # (modify) Add alert/metrics fetching
```

---

## Open Questions for Discussion

1. **Retention Policy**: How long should we keep BIT history? 7 days? 30 days? Configurable?

2. **Alert Deduplication**: If a test flaps between warn/fail rapidly, should we debounce alerts?

3. **Real-time Updates**: Should alerts push via WebSocket, or is polling sufficient?

4. **UI Placement**: Should metrics summary be always visible, or collapsed by default?

5. **Time Window Presets**: Which windows make most sense? (1h, 4h, 24h, 7d?)

6. **Graph Interactions**: For future time-series graphs, what granularity? (per-minute, per-snapshot?)

---

## Summary

This enhancement adds:
- **Persistence**: SQLite storage for BIT history
- **Alerts**: Status transition logging with chronological display
- **Metrics**: Uptime %, failure counts, top failing tests
- **Foundation**: Mock ZMQ subscriber ready for production integration
- **Future-ready**: Data model supports time-series graphs

The implementation is modular and can be delivered in phases, with each phase providing immediate value.
