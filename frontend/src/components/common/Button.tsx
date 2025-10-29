/**
 * Reusable Button component with multiple variants and sizes
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { colors, borderRadius, animation } from '../../constants/theme';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: colors.interactive.active,
    border: `1px solid ${colors.border.strong}`,
  },
  secondary: {
    background: colors.interactive.default,
    border: `1px solid ${colors.border.secondary}`,
  },
  subtle: {
    background: colors.interactive.subtle,
    border: `1px solid ${colors.border.tertiary}`,
  },
  icon: {
    background: colors.interactive.default,
    border: `1px solid ${colors.border.secondary}`,
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: 12,
  },
  md: {
    padding: '8px 16px',
    fontSize: 13,
  },
  lg: {
    padding: '10px 20px',
    fontSize: 14,
  },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  fullWidth = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    color: colors.text.primary,
    borderRadius: borderRadius.lg,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all ${animation.normal} ${animation.easing.standard}`,
    fontWeight: 500,
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : variant === 'icon' ? 32 : 'auto',
    ...variantStyles[variant],
    ...(variant !== 'icon' && sizeStyles[size]),
    ...style,
  };

  return (
    <button
      disabled={disabled}
      style={baseStyle}
      className={`button button-${variant} button-${size}`}
      {...props}
    >
      {children}
    </button>
  );
}
