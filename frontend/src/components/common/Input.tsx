/**
 * Reusable Input component with consistent styling
 */

import { InputHTMLAttributes } from 'react';
import { colors, borderRadius, typography } from '../../constants/theme';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export function Input({
  fullWidth = false,
  style,
  ...props
}: InputProps) {
  const baseStyle: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: '10px 12px',
    background: colors.background.input,
    border: `1px solid ${colors.border.tertiary}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    ...style,
  };

  return (
    <input
      style={baseStyle}
      className="input"
      {...props}
    />
  );
}
