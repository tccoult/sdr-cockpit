"""SQLite persistence layer for BIT results and alerts with rollup metrics tracking"""

import asyncio
import glob
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
    """SQLite storage for BIT snapshots, alerts, and rollup metrics"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_dir = Path(settings.bit_db_path)
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.db_dir / "bit_history.db"
        self._test_names: dict[str, str] = {}  # Cache test_id -> name
        self._latest_result: Optional[BitResult] = None
        self._last_rotation_check_monotonic = time.monotonic()
        self._last_snapshot_ts_ms: Optional[int] = None
        self._last_snapshot_status: Optional[int] = None
        self._last_snapshot_mono_ms: Optional[float] = None
        self._last_test_status: dict[str, int] = {}

        self._init_db()
        self._load_last_snapshot_state()
        self._load_test_names()

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
                CREATE TABLE IF NOT EXISTS bit_tests (
                    test_id TEXT PRIMARY KEY,
                    test_name TEXT NOT NULL
                );

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

                CREATE TABLE IF NOT EXISTS bit_metrics_rollups (
                    bucket_start INTEGER NOT NULL,
                    bucket_ms INTEGER NOT NULL,
                    ok_ms INTEGER NOT NULL DEFAULT 0,
                    warn_ms INTEGER NOT NULL DEFAULT 0,
                    fail_ms INTEGER NOT NULL DEFAULT 0,
                    sample_count INTEGER NOT NULL DEFAULT 0,
                    fail_alert_count INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (bucket_start, bucket_ms)
                );
                CREATE INDEX IF NOT EXISTS idx_metrics_rollups_bucket
                    ON bit_metrics_rollups(bucket_start);

                CREATE TABLE IF NOT EXISTS bit_test_rollups (
                    bucket_start INTEGER NOT NULL,
                    bucket_ms INTEGER NOT NULL,
                    test_id TEXT NOT NULL,
                    ok_ms INTEGER NOT NULL DEFAULT 0,
                    warn_ms INTEGER NOT NULL DEFAULT 0,
                    fail_ms INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (bucket_start, bucket_ms, test_id)
                );
                CREATE INDEX IF NOT EXISTS idx_test_rollups_bucket
                    ON bit_test_rollups(bucket_start);
                """
            )
            conn.commit()

    def _load_last_snapshot_state(self) -> None:
        """Load latest snapshot state to seed rollup attribution"""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT id, timestamp, overall_status FROM bit_snapshots ORDER BY timestamp DESC LIMIT 1"
            ).fetchone()
            if row is None:
                return

            self._last_snapshot_ts_ms = row["timestamp"]
            self._last_snapshot_status = row["overall_status"]
            self._last_snapshot_mono_ms = time.monotonic() * 1000

            test_rows = conn.execute(
                "SELECT test_id, status FROM bit_test_results WHERE snapshot_id = ?",
                (row["id"],),
            ).fetchall()
            for test_row in test_rows:
                self._last_test_status[test_row["test_id"]] = test_row["status"]

    def _load_test_names(self) -> None:
        """Load persisted test names"""
        with self._get_connection() as conn:
            rows = conn.execute("SELECT test_id, test_name FROM bit_tests").fetchall()
            for row in rows:
                self._test_names[row["test_id"]] = row["test_name"]

    def _should_rotate(self) -> bool:
        """Check if database should be rotated based on time or size"""
        if not self.db_path.exists():
            return False

        # Check rotation interval
        rotation_interval_seconds = self.settings.bit_rotation_hours * 3600
        time_since_check = time.monotonic() - self._last_rotation_check_monotonic
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
        self._last_rotation_check_monotonic = time.monotonic()

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

        snapshot_status = STATUS_INT[result.overall_status]
        now_mono_ms = time.monotonic() * 1000
        current_test_status = {test.id: STATUS_INT[test.status] for test in result.tests}

        with self._get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO bit_snapshots (timestamp, overall_status) VALUES (?, ?)",
                (result.timestamp, snapshot_status),
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

            for test in result.tests:
                conn.execute(
                    """
                    INSERT INTO bit_tests (test_id, test_name)
                    VALUES (?, ?)
                    ON CONFLICT(test_id) DO UPDATE SET test_name = excluded.test_name
                    """,
                    (test.id, test.name),
                )

            self._update_rollups(conn, result.timestamp, now_mono_ms)
            conn.commit()

        self._last_snapshot_ts_ms = result.timestamp
        self._last_snapshot_status = snapshot_status
        self._last_snapshot_mono_ms = now_mono_ms
        self._last_test_status = current_test_status

    async def handle_alert(self, alert: BitAlert) -> None:
        """Handle incoming alert - track in memory and store in database"""
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

            if alert.severity == BitAlertSeverity.failed:
                self._increment_failure_alert_count(conn, alert.timestamp)
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
        """Calculate health metrics from rollup tables"""
        now = (
            self._latest_result.timestamp
            if self._latest_result is not None
            else int(time.time() * 1000)
        )
        since = now - (window_minutes * 60 * 1000)
        bucket_ms = self.settings.bit_rollup_bucket_ms
        bucket_floor = since - (since % bucket_ms)

        with self._get_connection() as conn:
            row = conn.execute(
                """
                SELECT
                    COALESCE(SUM(ok_ms), 0) as ok_ms,
                    COALESCE(SUM(warn_ms), 0) as warn_ms,
                    COALESCE(SUM(fail_ms), 0) as fail_ms,
                    COALESCE(SUM(sample_count), 0) as sample_count,
                    COALESCE(SUM(fail_alert_count), 0) as fail_alert_count
                FROM bit_metrics_rollups
                WHERE bucket_start >= ? AND bucket_start <= ?
                """,
                (bucket_floor, now),
            ).fetchone()

        ok_ms = row["ok_ms"]
        warn_ms = row["warn_ms"]
        fail_ms = row["fail_ms"]
        total_ms = ok_ms + warn_ms + fail_ms

        operational_percent = (ok_ms / total_ms * 100) if total_ms > 0 else 100.0
        degraded_minutes = warn_ms / 60000
        non_op_minutes = fail_ms / 60000
        snapshot_count = row["sample_count"]
        failure_count = row["fail_alert_count"]

        top_failing_tests = self._get_top_failing_tests(bucket_floor)

        return BitHealthMetrics(
            windowMinutes=window_minutes,
            snapshotCount=snapshot_count,
            operationalPercent=round(operational_percent, 2),
            degradedMinutes=round(degraded_minutes, 2),
            nonOpMinutes=round(non_op_minutes, 2),
            failureCount=failure_count,
            topFailingTests=top_failing_tests,
        )

    def _get_top_failing_tests(self, bucket_floor: int) -> list[TestFailureCount]:
        """Get top failing tests from rollup durations"""
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT
                    r.test_id,
                    COALESCE(SUM(r.fail_ms), 0) as fail_ms,
                    COALESCE(t.test_name, r.test_id) as test_name
                FROM bit_test_rollups r
                LEFT JOIN bit_tests t ON t.test_id = r.test_id
                WHERE r.bucket_start >= ?
                GROUP BY r.test_id
                HAVING fail_ms > 0
                ORDER BY fail_ms DESC
                LIMIT ?
                """,
                (bucket_floor, self.settings.bit_top_failing_tests),
            ).fetchall()

            return [
                TestFailureCount(
                    testId=row["test_id"],
                    testName=row["test_name"],
                    failMinutes=round(row["fail_ms"] / 60000, 2),
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

            # Delete old rollups
            cursor = conn.execute(
                "DELETE FROM bit_metrics_rollups WHERE bucket_start < ?", (cutoff,)
            )
            metrics_deleted = cursor.rowcount
            cursor = conn.execute("DELETE FROM bit_test_rollups WHERE bucket_start < ?", (cutoff,))
            test_rollups_deleted = cursor.rowcount

            conn.commit()

            if snapshots_deleted > 0 or alerts_deleted > 0 or metrics_deleted > 0:
                logger.info(
                    "Cleaned up "
                    f"{snapshots_deleted} snapshots, {alerts_deleted} alerts, "
                    f"{metrics_deleted} metrics buckets, {test_rollups_deleted} test rollups"
                )

            return snapshots_deleted + alerts_deleted + metrics_deleted + test_rollups_deleted

    def _update_rollups(
        self,
        conn: sqlite3.Connection,
        current_ts_ms: int,
        current_mono_ms: float,
    ) -> None:
        """Update rollup tables using time-weighted durations."""
        self._increment_sample_count(conn, current_ts_ms)

        if (
            self._last_snapshot_ts_ms is None
            or self._last_snapshot_status is None
            or self._last_snapshot_mono_ms is None
        ):
            return

        event_delta = current_ts_ms - self._last_snapshot_ts_ms
        mono_delta = current_mono_ms - self._last_snapshot_mono_ms

        if event_delta < -self.settings.bit_clock_backward_jump_ms:
            logger.warning("BIT clock moved backward; skipping rollup attribution")
            return
        if event_delta > self.settings.bit_clock_forward_jump_ms:
            logger.warning("BIT clock jumped forward; skipping rollup attribution")
            return
        if event_delta <= 0:
            logger.warning("BIT timestamp did not advance; skipping rollup attribution")
            return
        if mono_delta <= 0:
            logger.warning("Monotonic clock moved backward; skipping rollup attribution")
            return

        if self._last_snapshot_status in (
            STATUS_INT[BitStatus.ok],
            STATUS_INT[BitStatus.warn],
            STATUS_INT[BitStatus.fail],
        ):
            self._attribute_duration(
                conn,
                self._last_snapshot_ts_ms,
                current_ts_ms,
                self._last_snapshot_status,
                None,
            )

        for test_id, last_status in self._last_test_status.items():
            if last_status not in (
                STATUS_INT[BitStatus.ok],
                STATUS_INT[BitStatus.warn],
                STATUS_INT[BitStatus.fail],
            ):
                continue
            self._attribute_duration(
                conn, self._last_snapshot_ts_ms, current_ts_ms, last_status, test_id
            )

    def _attribute_duration(
        self,
        conn: sqlite3.Connection,
        start_ms: int,
        end_ms: int,
        status_int: int,
        test_id: Optional[str],
    ) -> None:
        """Attribute time duration to rollup buckets."""
        if end_ms <= start_ms:
            return

        bucket_ms = self.settings.bit_rollup_bucket_ms
        current = start_ms
        while current < end_ms:
            bucket_start = current - (current % bucket_ms)
            bucket_end = bucket_start + bucket_ms
            segment_end = min(end_ms, bucket_end)
            duration_ms = segment_end - current
            if duration_ms <= 0:
                break

            if test_id is None:
                self._upsert_metrics_rollup(conn, bucket_start, duration_ms, status_int)
            else:
                self._upsert_test_rollup(conn, bucket_start, duration_ms, status_int, test_id)

            current = segment_end

    def _upsert_metrics_rollup(
        self, conn: sqlite3.Connection, bucket_start: int, duration_ms: int, status_int: int
    ) -> None:
        ok_ms = duration_ms if status_int == STATUS_INT[BitStatus.ok] else 0
        warn_ms = duration_ms if status_int == STATUS_INT[BitStatus.warn] else 0
        fail_ms = duration_ms if status_int == STATUS_INT[BitStatus.fail] else 0
        conn.execute(
            """
            INSERT INTO bit_metrics_rollups (bucket_start, bucket_ms, ok_ms, warn_ms, fail_ms)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(bucket_start, bucket_ms) DO UPDATE SET
                ok_ms = ok_ms + excluded.ok_ms,
                warn_ms = warn_ms + excluded.warn_ms,
                fail_ms = fail_ms + excluded.fail_ms
            """,
            (bucket_start, self.settings.bit_rollup_bucket_ms, ok_ms, warn_ms, fail_ms),
        )

    def _upsert_test_rollup(
        self,
        conn: sqlite3.Connection,
        bucket_start: int,
        duration_ms: int,
        status_int: int,
        test_id: str,
    ) -> None:
        ok_ms = duration_ms if status_int == STATUS_INT[BitStatus.ok] else 0
        warn_ms = duration_ms if status_int == STATUS_INT[BitStatus.warn] else 0
        fail_ms = duration_ms if status_int == STATUS_INT[BitStatus.fail] else 0
        conn.execute(
            """
            INSERT INTO bit_test_rollups (bucket_start, bucket_ms, test_id, ok_ms, warn_ms, fail_ms)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(bucket_start, bucket_ms, test_id) DO UPDATE SET
                ok_ms = ok_ms + excluded.ok_ms,
                warn_ms = warn_ms + excluded.warn_ms,
                fail_ms = fail_ms + excluded.fail_ms
            """,
            (
                bucket_start,
                self.settings.bit_rollup_bucket_ms,
                test_id,
                ok_ms,
                warn_ms,
                fail_ms,
            ),
        )

    def _increment_sample_count(self, conn: sqlite3.Connection, timestamp_ms: int) -> None:
        bucket_ms = self.settings.bit_rollup_bucket_ms
        bucket_start = timestamp_ms - (timestamp_ms % bucket_ms)
        conn.execute(
            """
            INSERT INTO bit_metrics_rollups (bucket_start, bucket_ms, sample_count)
            VALUES (?, ?, 1)
            ON CONFLICT(bucket_start, bucket_ms) DO UPDATE SET
                sample_count = sample_count + 1
            """,
            (bucket_start, bucket_ms),
        )

    def _increment_failure_alert_count(self, conn: sqlite3.Connection, timestamp_ms: int) -> None:
        bucket_ms = self.settings.bit_rollup_bucket_ms
        bucket_start = timestamp_ms - (timestamp_ms % bucket_ms)
        conn.execute(
            """
            INSERT INTO bit_metrics_rollups (bucket_start, bucket_ms, fail_alert_count)
            VALUES (?, ?, 1)
            ON CONFLICT(bucket_start, bucket_ms) DO UPDATE SET
                fail_alert_count = fail_alert_count + 1
            """,
            (bucket_start, bucket_ms),
        )
