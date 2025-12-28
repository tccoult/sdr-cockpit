import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { BitHealthMetrics } from "../../services/api";
import { STATUS_TOKENS } from "./statusTokens";
import { cn } from "@/lib/utils";

interface MetricsSummaryProps {
  metrics: BitHealthMetrics;
}

const formatNumber = (value: number, decimals = 1) => {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0$/, "");
};

const formatMinutes = (value: number) => `${formatNumber(value)}m`;
const formatWholeMinutes = (value: number) => `${Math.round(value)}m`;

export function MetricsSummary({ metrics }: MetricsSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topFailingTests = useMemo(
    () => metrics.topFailingTests.slice(0, 3),
    [metrics.topFailingTests]
  );
  const operationalMinutes = Math.max(
    0,
    metrics.windowMinutes - metrics.degradedMinutes - metrics.nonOpMinutes
  );
  const statusTone =
    metrics.nonOpMinutes > 0 ? "fail" : metrics.degradedMinutes > 0 ? "warn" : "ok";

  return (
    <div className="border-t border-border/70">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              STATUS_TOKENS[statusTone].dot
            )}
          />
          <span className="whitespace-nowrap text-foreground">
            Operational {formatWholeMinutes(operationalMinutes)}/
            {formatWholeMinutes(metrics.windowMinutes)}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center text-xs font-medium text-muted-foreground transition hover:text-foreground"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label="Toggle metrics details"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "overflow-hidden border-t border-border/60 bg-muted/40 transition-[max-height,opacity]",
          isExpanded
            ? "max-h-40 opacity-100 duration-200 ease-out"
            : "max-h-0 opacity-0 duration-150 ease-in"
        )}
      >
        <div className="px-4 pb-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Window minutes
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {formatNumber(metrics.windowMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Degraded minutes
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {formatMinutes(metrics.degradedMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Non-op minutes
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {formatMinutes(metrics.nonOpMinutes)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Total test failures
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {metrics.failureCount}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Top failing tests
            </span>
            {topFailingTests.length === 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                No failing tests in the selected window.
              </p>
            ) : (
              <div className="mt-1 space-y-1 text-[11px]">
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
    </div>
  );
}
