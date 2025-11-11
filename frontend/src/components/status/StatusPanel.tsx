import { useState } from "react";
import { DataStreamStatus } from "../../api";
import { BistResult } from "../../types/diagnostics";
import { Task } from "../../types/sdr";
import { moduleLabel, panelChrome } from "../../styles/panelStyles";
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
    <div className="flex h-full flex-col gap-4 p-4 text-sm">
      <div className={[panelChrome, "flex h-full min-h-0 flex-col overflow-hidden"].join(" ")}>
        {/* Tab Navigation */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-muted/60 px-4 py-3 backdrop-blur-sm">
          <div className={[moduleLabel, "flex-1"].join(" ")}>
            System Console
          </div>
          <div className="inline-flex rounded-md border border-border/60 bg-card/90 p-0.5 shadow-sm">
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
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-card/95">
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
      className={`rounded-sm px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] transition ${
        active
          ? "bg-muted/80 text-foreground shadow-inner"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
