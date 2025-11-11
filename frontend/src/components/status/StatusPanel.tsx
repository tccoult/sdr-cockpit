import { useState } from "react";
import { DataStreamStatus } from "../../api";
import { BistResult } from "../../types/diagnostics";
import { Task } from "../../types/sdr";
import { HealthStatus } from "../layout/CompactHeader";
import { DiagnosticsTab } from "./DiagnosticsTab";
import { OverviewTab } from "./OverviewTab";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export interface StatusPanelProps {
  dataFps: number;
  renderFps: number;
  totalTasks: number;
  operatorTasks: number;
  selectedTask: Task | null;
  streamStatus: DataStreamStatus;
  streamError: string | null;
  healthStatus: HealthStatus;
  bistResult: BistResult | null;
  className?: string;
}

type TabId = "overview" | "diagnostics";

/**
 * Tabbed status panel showing system overview and diagnostics.
 */
export function StatusPanel({
  dataFps,
  renderFps,
  totalTasks,
  operatorTasks,
  selectedTask,
  streamStatus,
  streamError,
  healthStatus,
  bistResult,
  className,
}: StatusPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm",
        className
      )}
    >
      <div className="sticky top-0 z-10 flex border-b border-border/70 bg-card/95 px-2 py-1 backdrop-blur">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === "diagnostics"}
          onClick={() => setActiveTab("diagnostics")}
        >
          Diagnostics
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto bg-card">
        {activeTab === "overview" && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-150">
            <OverviewTab
              dataFps={dataFps}
              renderFps={renderFps}
              totalTasks={totalTasks}
              operatorTasks={operatorTasks}
              selectedTask={selectedTask}
              streamStatus={streamStatus}
              streamError={streamError}
              healthStatus={healthStatus}
            />
          </div>
        )}
        {activeTab === "diagnostics" && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-150">
            <DiagnosticsTab bistResult={bistResult} />
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 ease-out",
        active
          ? "border-accent/60 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
