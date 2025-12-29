import { useMemo } from "react";

import { BitHealthMetrics } from "../../services/api";
import { cn } from "@/lib/utils";

interface MetricsSummaryProps {
  metrics: BitHealthMetrics;
  isExpanded: boolean;
}

const formatNumber = (value: number, decimals = 1) => {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0$/, "");
};

const formatMinutes = (value: number) => `${formatNumber(value)}m`;
const formatWholeMinutes = (value: number) => `${Math.round(value)}m`;

export function MetricsSummary({ metrics, isExpanded }: MetricsSummaryProps) {
  const topFailingTests = useMemo(
    () => metrics.topFailingTests.slice(0, 3),
    [metrics.topFailingTests]
  );

  return (
    <div
      className={cn(
        "overflow-hidden transition-[max-height,opacity]",
        isExpanded
          ? "max-h-80 opacity-100 duration-200 ease-out"
          : "max-h-0 opacity-0 duration-150 ease-in"
      )}
    >
      <div
        className={cn(
          "border-t border-border/70 bg-muted/40 px-4 pb-3 pt-2 text-xs text-muted-foreground"
        )}
      >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Window minutes
            </span>
            <span className="text-xs font-semibold text-foreground">
              {formatWholeMinutes(metrics.windowMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Degraded minutes
            </span>
            <span className="text-xs font-semibold text-foreground">
              {formatMinutes(metrics.degradedMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Non-op minutes
            </span>
            <span className="text-xs font-semibold text-foreground">
              {formatMinutes(metrics.nonOpMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Total test failures
            </span>
            <span className="text-xs font-semibold text-foreground">
              {metrics.failureCount}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Top failing tests
            </span>
            {topFailingTests.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No failing tests in the selected window.
              </p>
            ) : (
              <div className="mt-1 space-y-1 text-xs">
                {topFailingTests.map((test) => (
                  <div
                    key={test.testId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-foreground">
                      {test.testName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatMinutes(test.failMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
