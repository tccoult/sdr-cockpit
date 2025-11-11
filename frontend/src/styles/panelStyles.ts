/**
 * Shared class name presets for cockpit panels.
 * Ensures consistent 2px rounding, subtle borders, and inset sheen across components.
 */
export const panelChrome =
  "rounded-lg border border-border/60 bg-card/95 shadow-[0_10px_25px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.55)]";

export const panelChromeMuted =
  "rounded-lg border border-border/50 bg-muted/80 backdrop-blur-sm";

export const moduleLabel =
  "text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground";

export const dataLabel =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

export const dataValue =
  "text-sm font-semibold text-foreground";
