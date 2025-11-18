import { BitStatus, BitSummary } from "../../services/api";
import { cn } from "@/lib/utils";

import { STATUS_TOKENS, statusLabel } from "./statusTokens";

export function SummaryBanner({ summary }: { summary: BitSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <SummaryChip label="Fail" value={summary.fail} status={"fail"} />
      <SummaryChip label="Warn" value={summary.warn} status={"warn"} />
      <SummaryChip label="Ok" value={summary.ok} status={"ok"} />
      <span className="text-[11px] text-muted-foreground">
        Total tests: {summary.total}
      </span>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: BitStatus;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_TOKENS[status].tint,
        STATUS_TOKENS[status].badge
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: BitStatus }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wide",
        STATUS_TOKENS[status].badge
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
