"""SQLite persistence layer for BIT results and alerts"""

import asyncio
import glob
import json
import logging
import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Generator, Optional

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


class BitStorage:
    """SQLite storage for BIT snapshots and alerts"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_dir = Path(settings.bit_db_path)
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.db_dir / "bit_history.db"
        self._test_names: dict[str, str] = {}  # Cache test_id -> name
        self._latest_result: Optional[BitResult] = None
        self._last_rotation_check = time.time()
        self._init_db()
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
                    overall_status TEXT NOT NULL DEFAULT 'unknown',
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
                    message TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp
                    ON bit_alerts(timestamp);
                """
            )
            conn.commit()

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
        """Handle incoming BIT result - cache and store in database"""
        self._latest_result = result
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._store_result, result)

    def _store_result(self, result: BitResult) -> None:
        """Store BIT result in database (sync)"""
        # Check if rotation is needed before writing
        self._check_and_rotate()

        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO bit_snapshots
                    (timestamp, overall_status, summary_total, summary_ok, summary_warn, summary_fail)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    result.timestamp,
                    result.overall_status.value,
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
        # Check if rotation is needed before writing
        self._check_and_rotate()

        with self._get_connection() as conn:
            # Convert enums to strings for storage
            prev_status = alert.previous_status.value if alert.previous_status else None
            new_status = alert.new_status.value
            severity = alert.severity.value

            conn.execute(
                """
                INSERT INTO bit_alerts
                    (timestamp, test_id, test_name, previous_status, new_status,
                     severity, message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.timestamp,
                    alert.test_id,
                    alert.test_name,
                    prev_status,
                    new_status,
                    severity,
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
                        BitStatus(row["previous_status"]) if row["previous_status"] else None
                    ),
                    newStatus=BitStatus(row["new_status"]),
                    severity=BitAlertSeverity(row["severity"]),
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
        """Calculate health metrics over a time window based on overall system status"""
        now = int(time.time() * 1000)
        since = now - (window_minutes * 60 * 1000)

        with self._get_connection() as conn:
            # Get snapshot counts by overall_status (derived from function tree rollup)
            row = conn.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN overall_status = 'ok' THEN 1 ELSE 0 END) as operational,
                    SUM(CASE WHEN overall_status = 'warn' THEN 1 ELSE 0 END) as degraded,
                    SUM(CASE WHEN overall_status = 'fail' THEN 1 ELSE 0 END) as non_op
                FROM bit_snapshots
                WHERE timestamp >= ?
                """,
                (since,),
            ).fetchone()

            total = row["total"] or 0
            operational = row["operational"] or 0
            degraded = row["degraded"] or 0
            non_op = row["non_op"] or 0

            # Calculate percentages and time
            # Assume ~2.5 seconds between snapshots
            snapshot_interval_minutes = 2.5 / 60

            operational_percent = (operational / total * 100) if total > 0 else 100.0
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
                    testId=row["test_id"],
                    testName=self._test_names.get(row["test_id"], row["test_id"]),
                    failCount=row["fail_count"],
                )
                for row in top_failing_rows
            ]

            return BitHealthMetrics(
                windowMinutes=window_minutes,
                snapshotCount=total,
                operationalPercent=round(operational_percent, 2),
                degradedMinutes=round(degraded_minutes, 2),
                nonOpMinutes=round(non_op_minutes, 2),
                failureCount=failure_count,
                topFailingTests=top_failing_tests,
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
                    status=BitStatus(row["status"]),
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
