"""Health (BIT) REST API routes"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from app.models.generated import (
    BitAlert as GenBitAlert,
    BitAlertList,
    BitAlertSeverity,
    BitHealthMetrics,
    BitResult,
    BitStatus,
    BitTestHistory,
    BitTestHistoryPoint,
    TestFailureCount,
)
from app.core.bit_storage import BitStorage

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/bit/results", response_model=BitResult)
async def get_bit_results(request: Request) -> BitResult:
    """Get latest BIT test results with function and hardware trees"""
    storage: BitStorage = request.app.state.bit_storage
    result = storage.latest_result

    if result is None:
        raise HTTPException(status_code=503, detail="No BIT results available yet")

    return result


@router.get("/bit/alerts", response_model=BitAlertList)
async def get_bit_alerts(
    request: Request,
    since: Optional[int] = None,
    limit: int = 50,
) -> BitAlertList:
    """Get recent BIT alerts with optional filtering"""
    storage: BitStorage = request.app.state.bit_storage
    alerts, total_count = storage.get_alerts(since=since, limit=limit)

    return BitAlertList(
        alerts=[
            GenBitAlert(
                id=a.id,
                timestamp=a.timestamp,
                testId=a.test_id,
                testName=a.test_name,
                previousStatus=BitStatus(a.previous_status) if a.previous_status else None,
                newStatus=BitStatus(a.new_status),
                severity=BitAlertSeverity(a.severity),
                message=a.message,
            )
            for a in alerts
        ],
        totalCount=total_count,
    )


@router.get("/bit/metrics", response_model=BitHealthMetrics)
async def get_bit_metrics(request: Request, window_minutes: int = 240) -> BitHealthMetrics:
    """Get health metrics over a time window"""
    storage: BitStorage = request.app.state.bit_storage
    metrics = storage.get_metrics(window_minutes=window_minutes)

    return BitHealthMetrics(
        windowMinutes=metrics.window_minutes,
        snapshotCount=metrics.snapshot_count,
        operationalPercent=metrics.operational_percent,
        degradedMinutes=metrics.degraded_minutes,
        nonOpMinutes=metrics.non_op_minutes,
        failureCount=metrics.failure_count,
        topFailingTests=[
            TestFailureCount(
                testId=t.test_id,
                testName=t.test_name,
                failCount=t.fail_count,
            )
            for t in metrics.top_failing_tests
        ],
    )


@router.get("/bit/history", response_model=BitTestHistory)
async def get_bit_history(
    request: Request,
    test_id: str,
    since: Optional[int] = None,
    until: Optional[int] = None,
) -> BitTestHistory:
    """Get status history for a specific test"""
    storage: BitStorage = request.app.state.bit_storage
    points = storage.get_test_history(test_id=test_id, since=since, until=until)
    test_name = storage.get_test_name(test_id)

    return BitTestHistory(
        testId=test_id,
        testName=test_name,
        points=[
            BitTestHistoryPoint(
                timestamp=p.timestamp,
                status=BitStatus(p.status),
                durationMs=p.duration_ms,
            )
            for p in points
        ],
    )
