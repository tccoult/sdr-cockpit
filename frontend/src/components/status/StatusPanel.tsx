import { useState } from "react";
import { DataStreamStatus } from "../../api";
import { BistResult } from "../../types/diagnostics";
import { Task } from "../../types/sdr";
import { HealthStatus } from "../layout/CompactHeader";
import { panelSurface } from "../../styles/panelStyles";
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
    <div className={`${panelSurface} flex h-full flex-col overflow-hidden`}>
      {/* Tab Navigation - Sticky */}
      <div className="sticky top-0 z-10 flex gap-2 border-b border-border/40 bg-card/80 px-3 pb-2 pt-3 backdrop-blur-sm dark:border-white/5 dark:bg-slate-900/40">
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
      <div className="flex-1 overflow-y-auto px-2 pb-3">
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
      aria-pressed={active}
      className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        active
          ? "bg-accent/10 text-foreground shadow-sm ring-accent/60 dark:bg-white/15 dark:text-white"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
