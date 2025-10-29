/**
 * Reusable Modal component with backdrop
 */

import { ReactNode } from 'react';
import { colors, borderRadius, shadows, zIndex } from '../../constants/theme';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = 500,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: colors.overlay.heavy,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex.modal,
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.background.modal,
          border: `1px solid ${colors.border.tertiary}`,
          borderRadius: borderRadius.xxl,
          padding: 24,
          maxWidth,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: shadows.xl,
        }}
      >
        {children}
      </div>
    </div>
  );
}
