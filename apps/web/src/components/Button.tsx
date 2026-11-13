import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export default function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<Variant, string> = {
    primary: 'bg-[var(--accent-cyan)] text-black hover:opacity-90',
    secondary: 'bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)] hover:border-[var(--accent-cyan)]',
    ghost: 'text-[var(--muted)] hover:text-[var(--fg)]',
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
