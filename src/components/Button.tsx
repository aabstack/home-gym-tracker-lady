import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent font-semibold',
  secondary: 'bg-raised text-text font-medium',
  ghost: 'bg-transparent text-text font-medium',
  danger: 'bg-danger text-bg font-semibold',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Full-width 56px primary action. */
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  block,
  className = '',
  type,
  ...rest
}: ButtonProps) {
  const size = block ? 'h-14 w-full text-[17px]' : 'min-h-12 px-4';
  return (
    <button
      type={type ?? 'button'}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl ${size} ${VARIANTS[variant]} transition-opacity active:opacity-70 disabled:opacity-40 ${className}`}
      {...rest}
    />
  );
}
