import { X } from "lucide-react";
import type { ReactNode } from "react";

import { DisplaySettings } from "../settings/DisplaySettings";
import type { SettingsMenuItem } from "../settings/SettingsMenu";
import { SystemSettings } from "../settings/SystemSettings";
import { VersionInfo } from "../settings/VersionInfo";
import type { SystemInfo } from "../../types/diagnostics";

interface SettingsOverlayProps {
  activePanel: SettingsMenuItem | null;
  onClose: () => void;
  systemInfo: SystemInfo | null;
  isLoading?: boolean;
  error?: ReactNode;
}

export function SettingsOverlay({
  activePanel,
  onClose,
  systemInfo,
  isLoading = false,
  error,
}: SettingsOverlayProps) {
  if (!activePanel) {
    return null;
  }

  let content: ReactNode = null;

  if (activePanel === "system") {
    content = <SystemSettings />;
  } else if (activePanel === "display") {
    content = <DisplaySettings />;
  } else if (activePanel === "version") {
    content = systemInfo ? (
      <VersionInfo
        versionTree={systemInfo.versionTree}
        overallVersion={systemInfo.version}
        buildDate={systemInfo.buildDate}
        platform={systemInfo.platform}
      />
    ) : (
      <SettingsFallback isLoading={isLoading} error={error} />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150 rounded-sm border border-border/70 bg-card text-foreground shadow-xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-border/70 p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {getPanelTitle(activePanel)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {activePanel === "version" && !systemInfo ? (
            <SettingsFallback isLoading={isLoading} error={error} />
          ) : (
            content
          )}
        </div>
      </div>
    </>
  );
}

function getPanelTitle(panel: SettingsMenuItem): string {
  switch (panel) {
    case "system":
      return "System Settings";
    case "display":
      return "Display Settings";
    case "version":
      return "Version Info";
    default:
      return "Settings";
  }
}

interface SettingsFallbackProps {
  isLoading?: boolean;
  error?: ReactNode;
}

function SettingsFallback({ isLoading = false, error }: SettingsFallbackProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        Loading system information…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-status-error">
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
      No system information available.
    </div>
  );
}
