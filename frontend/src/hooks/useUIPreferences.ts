/**
 * UI preferences with localStorage persistence
 * Manages drawer/panel state for task drawer and health panel
 */

import { useLocalStorage } from './useLocalStorage';

export interface UIPreferences {
  // Task Drawer
  isTaskDrawerOpen: boolean;
  setIsTaskDrawerOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  isTaskDrawerPinned: boolean;
  setIsTaskDrawerPinned: (value: boolean | ((prev: boolean) => boolean)) => void;

  // Health Panel
  isHealthPanelOpen: boolean;
  setIsHealthPanelOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  isHealthPanelPinned: boolean;
  setIsHealthPanelPinned: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function useUIPreferences(): UIPreferences {
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useLocalStorage('taskDrawerOpen', true);
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useLocalStorage('taskDrawerPinned', true);
  const [isHealthPanelOpen, setIsHealthPanelOpen] = useLocalStorage('healthPanelOpen', false);
  const [isHealthPanelPinned, setIsHealthPanelPinned] = useLocalStorage('healthPanelPinned', false);

  return {
    isTaskDrawerOpen,
    setIsTaskDrawerOpen,
    isTaskDrawerPinned,
    setIsTaskDrawerPinned,
    isHealthPanelOpen,
    setIsHealthPanelOpen,
    isHealthPanelPinned,
    setIsHealthPanelPinned,
  };
}
