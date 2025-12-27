"""SQLite persistence layer for BIT results and alerts with in-memory metrics tracking"""

import asyncio
import glob
import logging
import os
import sqlite3
import time
from collections import deque
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Deque, Generator, Optional, Tuple

from app.config.settings import Settings
from app.models.generated import (
    BitAlert,
    BitAlertSeverity,
    BitHealthMetrics,
    BitResult,
    BitStatus,
    BitTestHistoryPoint,
    TestFailureCount,
)

logger = logging.getLogger(__name__)

# Retention period in milliseconds (7 days)
RETENTION_MS = 7 * 24 * 60 * 60 * 1000

# Max window for in-memory metrics (24 hours in ms)
MAX_METRICS_WINDOW_MS = 24 * 60 * 60 * 1000

# Snapshot interval for time calculations (seconds)
SNAPSHOT_INTERVAL_SECONDS = 2.5

# Status integer mappings (more efficient than strings in DB)
STATUS_INT = {
    BitStatus.unknown: 0,
    BitStatus.ok: 1,
    BitStatus.warn: 2,
    BitStatus.fail: 3,
}
INT_STATUS = {v: k for k, v in STATUS_INT.items()}

# Severity integer mappings
SEVERITY_INT = {
    BitAlertSeverity.recovered: 0,
    BitAlertSeverity.degraded: 1,
    BitAlertSeverity.failed: 2,
}
INT_SEVERITY = {v: k for k, v in SEVERITY_INT.items()}


class BitStorage:
    """SQLite storage for BIT snapshots and alerts with in-memory metrics"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_dir = Path(settings.bit_db_path)
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.db_dir / "bit_history.db"
        self._test_names: dict[str, str] = {}  # Cache test_id -> name
        self._latest_result: Optional[BitResult] = None
        self._last_rotation_check = time.time()

        # In-memory metrics tracking: deque of (timestamp_ms, status_int)
        self._status_history: Deque[Tuple[int, int]] = deque()
        # Track failure alerts count in memory too
        self._alert_timestamps: Deque[int] = deque()  # timestamps of 'failed' alerts

        self._init_db()
        self._load_recent_history()

        logger.info(
            f"BIT database initialized at {self.db_path} "
            f"(rotation: {settings.bit_rotation_hours}h, "
            f"max size: {settings.bit_max_file_size_mb}MB, "
            f"max files: {settings.bit_max_files})"
        )

    @property
    def latest_result(self) -> Optional[BitResult]:
        """Get the latest BIT result (if any)"""
        return self._latest_result

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
                    overall_status INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp
                    ON bit_snapshots(timestamp);

                CREATE TABLE IF NOT EXISTS bit_test_results (
                    id INTEGER PRIMARY KEY,
                    snapshot_id INTEGER NOT NULL,
                    test_id TEXT NOT NULL,
                    status INTEGER NOT NULL,
                    duration_ms INTEGER,
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
                    previous_status INTEGER,
                    new_status INTEGER NOT NULL,
                    severity INTEGER NOT NULL,
                    message TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp
                    ON bit_alerts(timestamp);
                """
            )
            conn.commit()

    def _load_recent_history(self) -> None:
        """Load recent history from DB to initialize in-memory state"""
        now = int(time.time() * 1000)
        since = now - MAX_METRICS_WINDOW_MS

        with self._get_connection() as conn:
            # Load snapshot status history
            rows = conn.execute(
                "SELECT timestamp, overall_status FROM bit_snapshots WHERE timestamp >= ? ORDER BY timestamp",
                (since,),
            ).fetchall()

            for row in rows:
                self._status_history.append((row["timestamp"], row["overall_status"]))

            # Load failure alert timestamps
            alert_rows = conn.execute(
                "SELECT timestamp FROM bit_alerts WHERE timestamp >= ? AND severity = ?",
                (since, SEVERITY_INT[BitAlertSeverity.failed]),
            ).fetchall()

            for row in alert_rows:
                self._alert_timestamps.append(row["timestamp"])

            # Load test names
            name_rows = conn.execute(
                """
                SELECT DISTINCT r.test_id, r.test_id as name
                FROM bit_test_results r
                JOIN bit_snapshots s ON r.snapshot_id = s.id
                WHERE s.timestamp >= ?
                """,
                (since,),
            ).fetchall()

            for row in name_rows:
                self._test_names[row["test_id"]] = row["name"]

        logger.info(
            f"Loaded {len(self._status_history)} snapshots and "
            f"{len(self._alert_timestamps)} failure alerts from history"
        )

    def _expire_old_entries(self, now_ms: int) -> None:
        """Remove entries older than max window from in-memory tracking"""
        cutoff = now_ms - MAX_METRICS_WINDOW_MS

        while self._status_history and self._status_history[0][0] < cutoff:
            self._status_history.popleft()

        while self._alert_timestamps and self._alert_timestamps[0] < cutoff:
            self._alert_timestamps.popleft()

    def _should_rotate(self) -> bool:
        """Check if database should be rotated based on time or size"""
        if not self.db_path.exists():
            return False

        # Check rotation interval
        rotation_interval_seconds = self.settings.bit_rotation_hours * 3600
        time_since_check = time.time() - self._last_rotation_check
        if time_since_check >= rotation_interval_seconds:
            logger.info(
                f"Rotation triggered by time: {time_since_check:.0f}s >= {rotation_interval_seconds}s"
            )
            return True

        # Check file size
        file_size_mb = self.db_path.stat().st_size / (1024 * 1024)
        if file_size_mb >= self.settings.bit_max_file_size_mb:
            logger.info(
                f"Rotation triggered by size: {file_size_mb:.1f}MB >= {self.settings.bit_max_file_size_mb}MB"
            )
            return True

        return False

    def _rotate_database(self) -> None:
        """Rotate current database to timestamped file and create new one"""
        if not self.db_path.exists():
            logger.debug("No database file to rotate")
            return

        # Generate timestamped filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        rotated_path = self.db_dir / f"bit_history_{timestamp}.db"

        # Rename current database
        self.db_path.rename(rotated_path)
        logger.info(f"Rotated database to {rotated_path}")

        # Create new database
        self._init_db()

        # Update rotation timestamp
        self._last_rotation_check = time.time()

        # Clean up old rotated files
        self._cleanup_old_rotations()

    def _cleanup_old_rotations(self) -> None:
        """Remove old rotated database files beyond max_files limit"""
        # Find all rotated database files (timestamped only, not the active db)
        pattern = str(self.db_dir / "bit_history_[0-9]*.db")
        rotated_files = sorted(glob.glob(pattern), reverse=True)

        # Keep only max_files most recent
        files_to_delete = rotated_files[self.settings.bit_max_files :]
        for file_path in files_to_delete:
            try:
                os.remove(file_path)
                logger.info(f"Removed old rotated database: {file_path}")
            except OSError as e:
                logger.error(f"Failed to remove {file_path}: {e}")

    def _check_and_rotate(self) -> None:
        """Check if rotation is needed and perform it"""
        if self._should_rotate():
            self._rotate_database()

    async def handle_result(self, result: BitResult) -> None:
        """Handle incoming BIT result - cache, track in memory, and store in database"""
        self._latest_result = result

        # Update in-memory tracking
        status_int = STATUS_INT[result.overall_status]
        self._status_history.append((result.timestamp, status_int))
        self._expire_old_entries(result.timestamp)

        # Cache test names
        for test in result.tests:
            self._test_names[test.id] = test.name

        # Store in DB asynchronously
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._store_result, result)

    def _store_result(self, result: BitResult) -> None:
        """Store BIT result in database (sync)"""
        # Check if rotation is needed before writing
        self._check_and_rotate()

        with self._get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO bit_snapshots (timestamp, overall_status) VALUES (?, ?)",
                (result.timestamp, STATUS_INT[result.overall_status]),
            )
            snapshot_id = cursor.lastrowid

            for test in result.tests:
                conn.execute(
                    """
                    INSERT INTO bit_test_results (snapshot_id, test_id, status, duration_ms)
                    VALUES (?, ?, ?, ?)
                    """,
                    (snapshot_id, test.id, STATUS_INT[test.status], test.duration_ms),
                )

            conn.commit()

    async def handle_alert(self, alert: BitAlert) -> None:
        """Handle incoming alert - track in memory and store in database"""
        # Track failure alerts in memory
        if alert.severity == BitAlertSeverity.failed:
            self._alert_timestamps.append(alert.timestamp)
            self._expire_old_entries(alert.timestamp)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._store_alert, alert)

    def _store_alert(self, alert: BitAlert) -> None:
        """Store alert in database (sync)"""
        # Check if rotation is needed before writing
        self._check_and_rotate()

        with self._get_connection() as conn:
            prev_status = STATUS_INT[alert.previous_status] if alert.previous_status else None

            conn.execute(
                """
                INSERT INTO bit_alerts
                    (timestamp, test_id, test_name, previous_status, new_status, severity, message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.timestamp,
                    alert.test_id,
                    alert.test_name,
                    prev_status,
                    STATUS_INT[alert.new_status],
                    SEVERITY_INT[alert.severity],
                    alert.message,
                ),
            )
            conn.commit()

    def get_alerts(
        self,
        since: Optional[int] = None,
        limit: int = 50,
    ) -> tuple[list[BitAlert], int]:
        """
        Get alerts with optional filtering.

        Returns: (alerts, total_count)
        """
        if since is None:
            since = int(time.time() * 1000) - (4 * 60 * 60 * 1000)  # 4 hours ago

        with self._get_connection() as conn:
            # Get alerts
            rows = conn.execute(
                """
                SELECT id, timestamp, test_id, test_name, previous_status,
                       new_status, severity, message
                FROM bit_alerts
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (since, limit),
            ).fetchall()

            alerts = [
                BitAlert(
                    id=row["id"],
                    timestamp=row["timestamp"],
                    testId=row["test_id"],
                    testName=row["test_name"],
                    previousStatus=(
                        INT_STATUS[row["previous_status"]]
                        if row["previous_status"] is not None
                        else None
                    ),
                    newStatus=INT_STATUS[row["new_status"]],
                    severity=INT_SEVERITY[row["severity"]],
                    message=row["message"],
                )
                for row in rows
            ]

            # Get total count
            total_count = conn.execute(
                "SELECT COUNT(*) FROM bit_alerts WHERE timestamp >= ?", (since,)
            ).fetchone()[0]

            return alerts, total_count

    def get_metrics(self, window_minutes: int = 240) -> BitHealthMetrics:
        """Calculate health metrics from in-memory tracking"""
        now = int(time.time() * 1000)
        since = now - (window_minutes * 60 * 1000)

        # Count from in-memory status history
        operational = 0
        degraded = 0
        non_op = 0

        for timestamp, status_int in self._status_history:
            if timestamp >= since:
                if status_int == STATUS_INT[BitStatus.ok]:
                    operational += 1
                elif status_int == STATUS_INT[BitStatus.warn]:
                    degraded += 1
                elif status_int == STATUS_INT[BitStatus.fail]:
                    non_op += 1

        total = operational + degraded + non_op

        # Calculate percentages and time
        snapshot_interval_minutes = SNAPSHOT_INTERVAL_SECONDS / 60
        operational_percent = (operational / total * 100) if total > 0 else 100.0
        degraded_minutes = degraded * snapshot_interval_minutes
        non_op_minutes = non_op * snapshot_interval_minutes

        # Count failure alerts from in-memory tracking
        failure_count = sum(1 for ts in self._alert_timestamps if ts >= since)

        # Top failing tests still needs DB query (complex aggregation)
        top_failing_tests = self._get_top_failing_tests(since)

        return BitHealthMetrics(
            windowMinutes=window_minutes,
            snapshotCount=total,
            operationalPercent=round(operational_percent, 2),
            degradedMinutes=round(degraded_minutes, 2),
            nonOpMinutes=round(non_op_minutes, 2),
            failureCount=failure_count,
            topFailingTests=top_failing_tests,
        )

    def _get_top_failing_tests(self, since: int) -> list[TestFailureCount]:
        """Get top failing tests from DB (still needs aggregation query)"""
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT test_id, COUNT(*) as fail_count
                FROM bit_test_results
                WHERE snapshot_id IN (
                    SELECT id FROM bit_snapshots WHERE timestamp >= ?
                )
                AND status = ?
                GROUP BY test_id
                ORDER BY fail_count DESC
                LIMIT 5
                """,
                (since, STATUS_INT[BitStatus.fail]),
            ).fetchall()

            return [
                TestFailureCount(
                    testId=row["test_id"],
                    testName=self._test_names.get(row["test_id"], row["test_id"]),
                    failCount=row["fail_count"],
                )
                for row in rows
            ]

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
                    status=INT_STATUS[row["status"]],
                    durationMs=row["duration_ms"],
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
