/**
 * Modal collection
 * Settings modal and system update wizard
 */

import { X } from 'lucide-react';
import { SettingsMenuItem } from '../settings/SettingsMenu';
import { SystemSettings } from '../settings/SystemSettings';
import { VersionInfo } from '../settings/VersionInfo';
import { SystemUpdateWizard } from '../settings/SystemUpdateWizard';
import { TaskWizard } from '../tasks/TaskWizard';
import { CreateRxTaskParams, CreateTxTaskParams, Task } from '../../api/client';
import { SystemInfo } from '../../types/health';

export interface ModalsProps {
  // Task Wizard
  isTaskWizardOpen: boolean;
  onCloseTaskWizard: () => void;
  onCreateRxTask: (params: CreateRxTaskParams) => Promise<Task>;
  onCreateTxTask: (params: CreateTxTaskParams) => Promise<Task>;

  // Settings Modal
  activeSettingsPanel: SettingsMenuItem | null;
  systemInfo: SystemInfo;
  onCloseSettings: () => void;

  // Update Wizard
  isUpdateWizardOpen: boolean;
  onCloseUpdateWizard: () => void;
}

export function Modals({
  isTaskWizardOpen,
  onCloseTaskWizard,
  onCreateRxTask,
  onCreateTxTask,
  activeSettingsPanel,
  systemInfo,
  onCloseSettings,
  isUpdateWizardOpen,
  onCloseUpdateWizard,
}: ModalsProps) {
  return (
    <>
      {/* Task Wizard */}
      <TaskWizard
        isOpen={isTaskWizardOpen}
        onClose={onCloseTaskWizard}
        onCreateRxTask={onCreateRxTask}
        onCreateTxTask={onCreateTxTask}
      />

      {/* Settings Modal */}
      {activeSettingsPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onCloseSettings}
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150 rounded-sm border border-border/70 bg-card text-foreground shadow-xl shadow-black/20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-4">
              <h2 className="text-lg font-semibold text-foreground">
                {activeSettingsPanel === 'system' ? 'System Settings' : 'Version Info'}
              </h2>
              <button
                type="button"
                onClick={onCloseSettings}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {activeSettingsPanel === 'system' && <SystemSettings />}
              {activeSettingsPanel === 'version' && (
                <VersionInfo
                  versionTree={systemInfo.versionTree}
                  overallVersion={systemInfo.version}
                  buildDate={systemInfo.buildDate}
                  platform={systemInfo.platform}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* System Update Wizard */}
      <SystemUpdateWizard isOpen={isUpdateWizardOpen} onClose={onCloseUpdateWizard} />
    </>
  );
}
