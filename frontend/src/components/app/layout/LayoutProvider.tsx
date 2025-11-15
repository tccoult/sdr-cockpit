import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useMediaQuery } from "../../../hooks";
import type { MobileView } from "../../layout/MobileNav";
import { HEADER_HEIGHT, SYSTEM_HEALTH_PANEL_WIDTH, TASK_DRAWER_WIDTH } from "./constants";
import { LayoutContext, type LayoutContextValue } from "./LayoutContext";

const MOBILE_BREAKPOINT = "(max-width: 1023px)";

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

  const [mobileView, setMobileView] = useState<MobileView>("visualization");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true);
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useState(true);
  const [isSystemHealthPanelOpen, setIsSystemHealthPanelOpen] = useState(false);
  const [isSystemHealthPanelPinned, setIsSystemHealthPanelPinned] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileNavOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setIsTaskDrawerOpen(false);
    }
  }, [isMobile]);

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(
    () => setIsMobileNavOpen((prev) => !prev),
    []
  );

  const openTaskDrawer = useCallback(() => setIsTaskDrawerOpen(true), []);
  const closeTaskDrawer = useCallback(() => setIsTaskDrawerOpen(false), []);
  const toggleTaskDrawer = useCallback(
    () => setIsTaskDrawerOpen((prev) => !prev),
    []
  );
  const toggleTaskDrawerPin = useCallback(
    () => setIsTaskDrawerPinned((prev) => !prev),
    []
  );

  const openSystemHealthPanel = useCallback(
    () => setIsSystemHealthPanelOpen(true),
    []
  );
  const closeSystemHealthPanel = useCallback(
    () => setIsSystemHealthPanelOpen(false),
    []
  );
  const toggleSystemHealthPanel = useCallback(
    () => setIsSystemHealthPanelOpen((prev) => !prev),
    []
  );
  const toggleSystemHealthPanelPin = useCallback(
    () => setIsSystemHealthPanelPinned((prev) => !prev),
    []
  );

  const togglePrimaryNavigation = useCallback(() => {
    if (isMobile) {
      setIsMobileNavOpen((prev) => !prev);
      return;
    }

    setIsTaskDrawerOpen((prev) => !prev);
  }, [isMobile]);

  const handleTaskActivated = useCallback(() => {
    if (isMobile) {
      setIsMobileNavOpen(false);
      return;
    }

    if (!isTaskDrawerPinned) {
      setIsTaskDrawerOpen(false);
    }
  }, [isMobile, isTaskDrawerPinned]);

  const mainOffsets = useMemo(() => {
    if (isMobile) {
      return { left: 0, right: 0, top: HEADER_HEIGHT };
    }

    return {
      left:
        isTaskDrawerPinned && isTaskDrawerOpen ? TASK_DRAWER_WIDTH : 0,
      right:
        isSystemHealthPanelPinned && isSystemHealthPanelOpen
          ? SYSTEM_HEALTH_PANEL_WIDTH
          : 0,
      top: HEADER_HEIGHT,
    };
  }, [
    isMobile,
    isSystemHealthPanelOpen,
    isSystemHealthPanelPinned,
    isTaskDrawerOpen,
    isTaskDrawerPinned,
  ]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      isMobile,
      mobileView,
      setMobileView,
      isMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
      isTaskDrawerOpen,
      isTaskDrawerPinned,
      openTaskDrawer,
      closeTaskDrawer,
      toggleTaskDrawer,
      toggleTaskDrawerPin,
      isSystemHealthPanelOpen,
      isSystemHealthPanelPinned,
      openSystemHealthPanel,
      closeSystemHealthPanel,
      toggleSystemHealthPanel,
      toggleSystemHealthPanelPin,
      togglePrimaryNavigation,
      handleTaskActivated,
      mainOffsets,
    }),
    [
      closeMobileNav,
      closeSystemHealthPanel,
      closeTaskDrawer,
      handleTaskActivated,
      isMobile,
      isMobileNavOpen,
      isSystemHealthPanelOpen,
      isSystemHealthPanelPinned,
      isTaskDrawerOpen,
      isTaskDrawerPinned,
      mainOffsets,
      mobileView,
      openMobileNav,
      openSystemHealthPanel,
      openTaskDrawer,
      toggleMobileNav,
      togglePrimaryNavigation,
      toggleSystemHealthPanel,
      toggleSystemHealthPanelPin,
      toggleTaskDrawer,
      toggleTaskDrawerPin,
    ]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

