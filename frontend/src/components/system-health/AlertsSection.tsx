import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BitAlert } from "../../services/api";
import { STATUS_TOKENS } from "./statusTokens";
import { formatRelativeTimestamp } from "./utils";
import { cn } from "@/lib/utils";

interface AlertsSectionProps {
  alerts: BitAlert[];
  isMobile?: boolean;
}

const getAlertTone = (severity: BitAlert["severity"]) => {
  switch (severity) {
    case "failed":
      return "fail";
    case "degraded":
      return "warn";
    case "recovered":
      return "ok";
    default:
      return "warn";
  }
};

const getAlertIcon = (severity: BitAlert["severity"]) => {
  switch (severity) {
    case "failed":
      return AlertTriangle;
    case "degraded":
      return AlertCircle;
    case "recovered":
      return CheckCircle2;
    default:
      return AlertCircle;
  }
};

const getLatestTimestamp = (alerts: BitAlert[]) =>
  alerts.reduce((latest, alert) => Math.max(latest, alert.timestamp), 0);

export function AlertsSection({ alerts, isMobile = false }: AlertsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(0);

  const latestTimestamp = useMemo(() => getLatestTimestamp(alerts), [alerts]);
  const unreadCount = useMemo(
    () => alerts.filter((alert) => alert.timestamp > lastReadTimestamp).length,
    [alerts, lastReadTimestamp]
  );

  const visibleAlerts = useMemo(
    () => (isMobile ? alerts.slice(0, 2) : alerts),
    [alerts, isMobile]
  );

  useEffect(() => {
    if (!hasInteracted) {
      setIsExpanded(!isMobile);
    }
  }, [hasInteracted, isMobile]);

  useEffect(() => {
    if (!isExpanded) return;
    if (latestTimestamp > lastReadTimestamp) {
      setLastReadTimestamp(latestTimestamp);
    }
  }, [isExpanded, latestTimestamp, lastReadTimestamp]);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left"
        onClick={() => {
          setHasInteracted(true);
          setIsExpanded((prev) => !prev);
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Alerts
          </span>
          {!isExpanded && unreadCount > 0 && (
            <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
              {unreadCount} new
            </span>
          )}
          {isExpanded && alerts.length > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {alerts.length} recent
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity]",
          isExpanded
            ? "max-h-40 opacity-100 duration-200 ease-out"
            : "max-h-0 opacity-0 duration-150 ease-in"
        )}
      >
        <div
          className={cn(
            "max-h-[120px] overflow-y-auto border-t border-border/60 bg-card/40",
            isMobile && "max-h-[96px]"
          )}
        >
          {visibleAlerts.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              No recent alerts.
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {visibleAlerts.map((alert) => {
                const tone = getAlertTone(alert.severity);
                const Icon = getAlertIcon(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 px-4 py-2 text-xs"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full",
                        STATUS_TOKENS[tone].tint,
                        STATUS_TOKENS[tone].text
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {alert.message}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {formatRelativeTimestamp(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {isMobile && alerts.length > visibleAlerts.length && (
          <div className="border-t border-border/60 bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground">
            Showing {visibleAlerts.length} of {alerts.length} alerts
          </div>
        )}
      </div>
    </div>
  );
}
