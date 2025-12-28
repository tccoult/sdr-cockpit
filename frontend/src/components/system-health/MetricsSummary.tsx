import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { BitHealthMetrics } from "../../services/api";
import { STATUS_TOKENS } from "./statusTokens";
import { cn } from "@/lib/utils";

interface MetricsSummaryProps {
  metrics: BitHealthMetrics;
  isMobile?: boolean;
}

const formatNumber = (value: number, decimals = 1) => {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0$/, "");
};

const formatMinutes = (value: number) => `${formatNumber(value)}m`;

export function MetricsSummary({ metrics, isMobile = false }: MetricsSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topFailingTests = useMemo(
    () => metrics.topFailingTests.slice(0, isMobile ? 2 : 3),
    [metrics.topFailingTests, isMobile]
  );

  return (
    <div className="border-t border-border/70">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Uptime"
            value={`${formatNumber(metrics.operationalPercent)}%`}
            tone="ok"
          />
          <MetricPill
            label="Failures"
            value={`${metrics.failureCount}`}
            tone="fail"
          />
          <MetricPill
            label="Degraded"
            value={formatMinutes(metrics.degradedMinutes)}
            tone="warn"
          />
          <MetricPill
            label="Non-op"
            value={formatMinutes(metrics.nonOpMinutes)}
            tone="fail"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          Details
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
              Snapshot count
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {metrics.snapshotCount}
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

interface MetricPillProps {
  label: string;
  value: string;
  tone: "ok" | "warn" | "fail";
}

function MetricPill({ label, value, tone }: MetricPillProps) {
  const tokens = STATUS_TOKENS[tone];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
        tokens.tint,
        tokens.text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
