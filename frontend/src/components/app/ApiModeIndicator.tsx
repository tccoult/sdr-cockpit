/**
 * API Mode Indicator
 * Shows whether the app is in offline or online mode
 */

import { getApiMode } from '../../api';
import { themeColors, hexToRgba } from '../../styles/themeColors';
import { panelChrome } from '../../styles/panelStyles';

export function ApiModeIndicator() {
  const mode = getApiMode();
  const isOnline = mode === 'online';

  const dotColor = isOnline ? themeColors.status.success : themeColors.status.warning;
  const dotShadow = `0 0 8px ${hexToRgba(dotColor, 0.5)}`;

  return (
    <div className={[panelChrome, 'p-3 dark:bg-black/30'].join(' ')}>
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Mode
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: dotColor,
            boxShadow: dotShadow,
          }}
        />
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {isOnline ? 'Online' : 'Offline'}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {isOnline ? 'Connected to backend' : 'Demo mode'}
      </p>
    </div>
  );
}
