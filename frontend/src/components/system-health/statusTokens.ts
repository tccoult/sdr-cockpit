import { BitStatus } from "../../services/api";

export const STATUS_PRIORITY: Record<BitStatus, number> = {
  fail: 3,
  warn: 2,
  ok: 1,
  unknown: 0,
};

export const STATUS_TOKENS: Record<
  BitStatus,
  { dot: string; text: string; badge: string; tint: string }
> = {
  fail: {
    dot: "bg-status-error",
    text: "text-status-error",
    badge: "text-status-error",
    tint: "bg-status-error/10",
  },
  warn: {
    dot: "bg-status-warning",
    text: "text-status-warning",
    badge: "text-status-warning",
    tint: "bg-status-warning/10",
  },
  ok: {
    dot: "bg-status-success",
    text: "text-status-success",
    badge: "text-status-success",
    tint: "bg-status-success/10",
  },
  unknown: {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    badge: "text-muted-foreground",
    tint: "bg-muted/40",
  },
};

export function statusLabel(status: BitStatus) {
  switch (status) {
    case "fail":
      return "Fail";
    case "warn":
      return "Warn";
    case "ok":
      return "Ok";
    default:
      return "Unknown";
  }
}
