/**
 * Shared class name presets for cockpit panels.
 * Ensures consistent 2px rounding, subtle borders, and inset sheen across components.
 */
export const panelChrome =
  "rounded-sm border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-slate-900/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

export const panelChromeMuted =
  "rounded-sm border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800/50";

export const panelSurface =
  "rounded-xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

export const panelSubtle =
  "rounded-lg border border-border/50 bg-muted/50 shadow-sm dark:border-white/5 dark:bg-white/5";
