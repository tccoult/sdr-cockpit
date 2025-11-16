/**
 * Keyboard shortcuts hook
 * Handles ESC key for closing modals and unpinned drawers
 */

import { useEffect } from 'react';
import { SettingsMenuItem } from '../components/settings/SettingsMenu';

export interface KeyboardShortcutsProps {
  activeSettingsPanel: SettingsMenuItem | null;
  setActiveSettingsPanel: (value: SettingsMenuItem | null) => void;
  isUpdateWizardOpen: boolean;
  setIsUpdateWizardOpen: (value: boolean) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (value: boolean) => void;
  isHealthPanelOpen: boolean;
  setIsHealthPanelOpen: (value: boolean) => void;
  isHealthPanelPinned: boolean;
  isTaskDrawerOpen: boolean;
  setIsTaskDrawerOpen: (value: boolean) => void;
  isTaskDrawerPinned: boolean;
}

export function useKeyboardShortcuts(props: KeyboardShortcutsProps) {
  const {
    activeSettingsPanel,
    setActiveSettingsPanel,
    isUpdateWizardOpen,
    setIsUpdateWizardOpen,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isHealthPanelOpen,
    setIsHealthPanelOpen,
    isHealthPanelPinned,
    isTaskDrawerOpen,
    setIsTaskDrawerOpen,
    isTaskDrawerPinned,
  } = props;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSettingsPanel) {
          setActiveSettingsPanel(null);
        } else if (isUpdateWizardOpen) {
          setIsUpdateWizardOpen(false);
        } else if (isMobileNavOpen) {
          setIsMobileNavOpen(false);
        } else if (!isHealthPanelPinned && isHealthPanelOpen) {
          setIsHealthPanelOpen(false);
        } else if (!isTaskDrawerPinned && isTaskDrawerOpen) {
          setIsTaskDrawerOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [
    activeSettingsPanel,
    setActiveSettingsPanel,
    isUpdateWizardOpen,
    setIsUpdateWizardOpen,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isHealthPanelOpen,
    setIsHealthPanelOpen,
    isHealthPanelPinned,
    isTaskDrawerOpen,
    setIsTaskDrawerOpen,
    isTaskDrawerPinned,
  ]);
}
