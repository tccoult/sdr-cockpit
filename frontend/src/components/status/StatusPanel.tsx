import { useState } from "react";
import { DataStreamStatus } from "../../api";
import { BistResult } from "../../types/diagnostics";
import { Task } from "../../types/sdr";
import { HealthStatus } from "../layout/CompactHeader";
import { DiagnosticsTab } from "./DiagnosticsTab";
import { OverviewTab } from "./OverviewTab";

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
}: StatusPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="flex h-full flex-col bg-muted/40 text-foreground dark:bg-muted/15">
      {/* Tab Navigation - Sticky */}
      <div className="sticky top-0 z-10 flex border-b border-border/60 bg-muted/70 backdrop-blur-md dark:border-border/50 dark:bg-muted/20">
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
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
      className={`flex-1 border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-150 ease-in-out ${
        active
          ? "border-border/60 bg-card/90 text-foreground shadow-[inset_0_-2px_0_rgba(124,131,255,0.35)]"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
