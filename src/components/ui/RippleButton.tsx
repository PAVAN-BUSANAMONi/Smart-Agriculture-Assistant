import React, { useRef, useCallback } from 'react';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export function RippleButton({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  className = '',
  onClick,
  disabled,
  ...props
}: RippleButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const createRipple = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = btnRef.current;
      if (!btn || disabled) return;

      const rect = btn.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      const ripple = document.createElement('span');
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - radius}px`;
      ripple.style.top = `${e.clientY - rect.top - radius}px`;
      ripple.className = 'ripple-effect';

      const existingRipple = btn.querySelector('.ripple-effect');
      if (existingRipple) existingRipple.remove();

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      onClick?.(e);
    },
    [onClick, disabled]
  );

  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-emerald-700 border-none',
    secondary:
      'bg-white/80 dark:bg-slate-800/80 backdrop-blur text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-700',
    ghost:
      'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-slate-800/60 border-none shadow-none',
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:from-rose-600 hover:to-red-700 border-none',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  const glowClass = glow
    ? 'after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500 after:bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,transparent_70%)] after:pointer-events-none'
    : '';

  return (
    <button
      ref={btnRef}
      onClick={createRipple}
      disabled={disabled}
      className={`
        relative overflow-hidden font-semibold
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]
        disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0
        will-change-transform
        ${variants[variant]} ${sizes[size]} ${glowClass} ${className}
      `.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
