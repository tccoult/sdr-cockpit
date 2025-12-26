"""SQLite persistence layer for BIT results and alerts"""

import asyncio
import json
import logging
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Generator, Optional

from app.core.event_bus import Topic, event_bus
from app.models.generated import BitResult

logger = logging.getLogger(__name__)

# Retention period in milliseconds (7 days)
RETENTION_MS = 7 * 24 * 60 * 60 * 1000

# Default database path
DEFAULT_DB_PATH = Path(__file__).parent.parent.parent / "data" / "bit_history.db"


@dataclass
class BitAlert:
    """Alert generated from BIT status transitions"""

    id: int
    timestamp: int  # Unix ms
    test_id: str
    test_name: str
    previous_status: Optional[str]
    new_status: str
    severity: str  # failed, degraded, recovered
    message: str
    acknowledged: bool = False


@dataclass
class TestFailureCount:
    """Count of failures for a specific test"""

    test_id: str
    test_name: str
    fail_count: int


@dataclass
class BitHealthMetrics:
    """Health metrics over a time window"""

    window_minutes: int
    snapshot_count: int
    uptime_percent: float
    degraded_minutes: float
    non_op_minutes: float
    failure_count: int
    top_failing_tests: list[TestFailureCount]


@dataclass
class BitTestHistoryPoint:
    """Single point in test history"""

    timestamp: int
    status: str
    duration_ms: Optional[int]


class BitStorage:
    """SQLite storage for BIT snapshots and alerts"""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._test_names: dict[str, str] = {}  # Cache test_id -> name
        self._init_db()

    @contextmanager
    def _get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Get a database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Initialize database schema"""
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS bit_snapshots (
                    id INTEGER PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    summary_total INTEGER NOT NULL,
                    summary_ok INTEGER NOT NULL,
                    summary_warn INTEGER NOT NULL,
                    summary_fail INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp
                    ON bit_snapshots(timestamp);

                CREATE TABLE IF NOT EXISTS bit_test_results (
                    id INTEGER PRIMARY KEY,
                    snapshot_id INTEGER NOT NULL,
                    test_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    duration_ms INTEGER,
                    metrics_json TEXT,
                    FOREIGN KEY (snapshot_id) REFERENCES bit_snapshots(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_test_results_snapshot
                    ON bit_test_results(snapshot_id);
                CREATE INDEX IF NOT EXISTS idx_test_results_test_status
                    ON bit_test_results(test_id, status);

                CREATE TABLE IF NOT EXISTS bit_alerts (
                    id INTEGER PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    test_id TEXT NOT NULL,
                    test_name TEXT NOT NULL,
                    previous_status TEXT,
                    new_status TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp
                    ON bit_alerts(timestamp);
                CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged
                    ON bit_alerts(acknowledged, timestamp);
                """
            )
            conn.commit()
        logger.info(f"Initialized BIT database at {self.db_path}")

    async def handle_result(self, result: BitResult) -> None:
        """Handle incoming BIT result - store snapshot and test results"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._store_result, result)

    def _store_result(self, result: BitResult) -> None:
        """Store BIT result in database (sync)"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO bit_snapshots
                    (timestamp, summary_total, summary_ok, summary_warn, summary_fail)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    result.timestamp,
                    result.summary.total,
                    result.summary.ok,
                    result.summary.warn,
                    result.summary.fail,
                ),
            )
            snapshot_id = cursor.lastrowid

            for test in result.tests:
                metrics_json = None
                if test.metrics:
                    metrics_json = json.dumps(test.metrics.model_dump())

                conn.execute(
                    """
                    INSERT INTO bit_test_results
                        (snapshot_id, test_id, status, duration_ms, metrics_json)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (snapshot_id, test.id, test.status.value, test.duration_ms, metrics_json),
                )

                # Cache test name for alert generation
                self._test_names[test.id] = test.name

            conn.commit()

    async def handle_alert(self, alert: BitAlert) -> None:
        """Handle incoming alert - store in database"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._store_alert, alert)

    def _store_alert(self, alert: BitAlert) -> None:
        """Store alert in database (sync)"""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO bit_alerts
                    (timestamp, test_id, test_name, previous_status, new_status,
                     severity, message, acknowledged)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.timestamp,
                    alert.test_id,
                    alert.test_name,
                    alert.previous_status,
                    alert.new_status,
                    alert.severity,
                    alert.message,
                    1 if alert.acknowledged else 0,
                ),
            )
            conn.commit()

    def get_alerts(
        self,
        since: Optional[int] = None,
        limit: int = 50,
        unacknowledged_only: bool = False,
    ) -> tuple[list[BitAlert], int, int]:
        """
        Get alerts with optional filtering.

        Returns: (alerts, total_count, unacknowledged_count)
        """
        if since is None:
            since = int(time.time() * 1000) - (4 * 60 * 60 * 1000)  # 4 hours ago

        with self._get_connection() as conn:
            # Build query
            where_clause = "WHERE timestamp >= ?"
            params: list = [since]

            if unacknowledged_only:
                where_clause += " AND acknowledged = 0"

            # Get alerts
            rows = conn.execute(
                f"""
                SELECT id, timestamp, test_id, test_name, previous_status,
                       new_status, severity, message, acknowledged
                FROM bit_alerts
                {where_clause}
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (*params, limit),
            ).fetchall()

            alerts = [
                BitAlert(
                    id=row["id"],
                    timestamp=row["timestamp"],
                    test_id=row["test_id"],
                    test_name=row["test_name"],
                    previous_status=row["previous_status"],
                    new_status=row["new_status"],
                    severity=row["severity"],
                    message=row["message"],
                    acknowledged=bool(row["acknowledged"]),
                )
                for row in rows
            ]

            # Get counts
            total_count = conn.execute(
                "SELECT COUNT(*) FROM bit_alerts WHERE timestamp >= ?", (since,)
            ).fetchone()[0]

            unack_count = conn.execute(
                "SELECT COUNT(*) FROM bit_alerts WHERE timestamp >= ? AND acknowledged = 0",
                (since,),
            ).fetchone()[0]

            return alerts, total_count, unack_count

    def acknowledge_alerts(self, alert_ids: list[int]) -> int:
        """Mark alerts as acknowledged. Returns count of updated rows."""
        if not alert_ids:
            return 0

        placeholders = ",".join("?" * len(alert_ids))
        with self._get_connection() as conn:
            cursor = conn.execute(
                f"UPDATE bit_alerts SET acknowledged = 1 WHERE id IN ({placeholders})",
                alert_ids,
            )
            conn.commit()
            return cursor.rowcount

    def get_metrics(self, window_minutes: int = 240) -> BitHealthMetrics:
        """Calculate health metrics over a time window"""
        now = int(time.time() * 1000)
        since = now - (window_minutes * 60 * 1000)

        with self._get_connection() as conn:
            # Get snapshot counts by status
            row = conn.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN summary_fail = 0 AND summary_warn = 0 THEN 1 ELSE 0 END) as fully_ok,
                    SUM(CASE WHEN summary_fail = 0 AND summary_warn > 0 THEN 1 ELSE 0 END) as degraded,
                    SUM(CASE WHEN summary_fail > 0 THEN 1 ELSE 0 END) as non_op
                FROM bit_snapshots
                WHERE timestamp >= ?
                """,
                (since,),
            ).fetchone()

            total = row["total"] or 0
            fully_ok = row["fully_ok"] or 0
            degraded = row["degraded"] or 0
            non_op = row["non_op"] or 0

            # Calculate percentages and time
            # Assume ~2.5 seconds between snapshots
            snapshot_interval_minutes = 2.5 / 60

            uptime_percent = (fully_ok / total * 100) if total > 0 else 100.0
            degraded_minutes = degraded * snapshot_interval_minutes
            non_op_minutes = non_op * snapshot_interval_minutes

            # Count failure alerts
            failure_count = conn.execute(
                "SELECT COUNT(*) FROM bit_alerts WHERE timestamp >= ? AND severity = 'failed'",
                (since,),
            ).fetchone()[0]

            # Get top failing tests
            top_failing_rows = conn.execute(
                """
                SELECT test_id, COUNT(*) as fail_count
                FROM bit_test_results
                WHERE snapshot_id IN (
                    SELECT id FROM bit_snapshots WHERE timestamp >= ?
                )
                AND status = 'fail'
                GROUP BY test_id
                ORDER BY fail_count DESC
                LIMIT 5
                """,
                (since,),
            ).fetchall()

            top_failing_tests = [
                TestFailureCount(
                    test_id=row["test_id"],
                    test_name=self._test_names.get(row["test_id"], row["test_id"]),
                    fail_count=row["fail_count"],
                )
                for row in top_failing_rows
            ]

            return BitHealthMetrics(
                window_minutes=window_minutes,
                snapshot_count=total,
                uptime_percent=round(uptime_percent, 2),
                degraded_minutes=round(degraded_minutes, 2),
                non_op_minutes=round(non_op_minutes, 2),
                failure_count=failure_count,
                top_failing_tests=top_failing_tests,
            )

    def get_test_history(
        self, test_id: str, since: Optional[int] = None, until: Optional[int] = None
    ) -> list[BitTestHistoryPoint]:
        """Get status history for a specific test"""
        now = int(time.time() * 1000)
        if since is None:
            since = now - (4 * 60 * 60 * 1000)  # 4 hours ago
        if until is None:
            until = now

        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT s.timestamp, r.status, r.duration_ms
                FROM bit_test_results r
                JOIN bit_snapshots s ON r.snapshot_id = s.id
                WHERE r.test_id = ?
                AND s.timestamp >= ? AND s.timestamp <= ?
                ORDER BY s.timestamp ASC
                """,
                (test_id, since, until),
            ).fetchall()

            return [
                BitTestHistoryPoint(
                    timestamp=row["timestamp"],
                    status=row["status"],
                    duration_ms=row["duration_ms"],
                )
                for row in rows
            ]

    def get_test_name(self, test_id: str) -> str:
        """Get cached test name or return test_id"""
        return self._test_names.get(test_id, test_id)

    async def cleanup_old_data(self) -> int:
        """Remove data older than retention period. Returns rows deleted."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._cleanup_old_data)

    def _cleanup_old_data(self) -> int:
        """Remove old data (sync)"""
        cutoff = int(time.time() * 1000) - RETENTION_MS

        with self._get_connection() as conn:
            # Delete old snapshots (cascades to test_results)
            cursor = conn.execute("DELETE FROM bit_snapshots WHERE timestamp < ?", (cutoff,))
            snapshots_deleted = cursor.rowcount

            # Delete old alerts
            cursor = conn.execute("DELETE FROM bit_alerts WHERE timestamp < ?", (cutoff,))
            alerts_deleted = cursor.rowcount

            conn.commit()

            if snapshots_deleted > 0 or alerts_deleted > 0:
                logger.info(f"Cleaned up {snapshots_deleted} snapshots and {alerts_deleted} alerts")

            return snapshots_deleted + alerts_deleted


# Module-level storage instance (initialized in app startup)
bit_storage: Optional[BitStorage] = None


def get_bit_storage() -> BitStorage:
    """Get the bit storage instance"""
    if bit_storage is None:
        raise RuntimeError("BitStorage not initialized")
    return bit_storage


async def init_bit_storage(db_path: Optional[Path] = None) -> BitStorage:
    """Initialize the bit storage and subscribe to events"""
    global bit_storage
    bit_storage = BitStorage(db_path)

    # Subscribe to events
    event_bus.subscribe(Topic.BIT_RESULT, bit_storage.handle_result)
    event_bus.subscribe(Topic.BIT_ALERT, bit_storage.handle_alert)

    # Run initial cleanup
    await bit_storage.cleanup_old_data()

    logger.info("BitStorage initialized and subscribed to events")
    return bit_storage
