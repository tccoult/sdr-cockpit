/**
 * API Mode Indicator
 * Shows whether the app is in offline or online mode
 */

import { getApiMode } from '../../api';

export function ApiModeIndicator() {
  const mode = getApiMode();
  const isOnline = mode === 'online';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-black/30 dark:shadow-inner dark:shadow-black/20">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Mode
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isOnline
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
          }`}
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
