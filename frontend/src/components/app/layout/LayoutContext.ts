import { createContext } from "react";

import type { MobileView } from "../../layout/MobileNav";

export interface LayoutContextValue {
  isMobile: boolean;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  isTaskDrawerOpen: boolean;
  isTaskDrawerPinned: boolean;
  openTaskDrawer: () => void;
  closeTaskDrawer: () => void;
  toggleTaskDrawer: () => void;
  toggleTaskDrawerPin: () => void;
  isSystemHealthPanelOpen: boolean;
  isSystemHealthPanelPinned: boolean;
  openSystemHealthPanel: () => void;
  closeSystemHealthPanel: () => void;
  toggleSystemHealthPanel: () => void;
  toggleSystemHealthPanelPin: () => void;
  togglePrimaryNavigation: () => void;
  handleTaskActivated: () => void;
  mainOffsets: { left: number; right: number; top: number };
}

export const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);
