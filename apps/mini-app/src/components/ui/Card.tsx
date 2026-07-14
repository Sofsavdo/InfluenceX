import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, interactive = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-ink-100 bg-white shadow-card p-4 ${interactive ? 'tap-scale cursor-pointer hover:border-accent-200 hover:shadow-pop transition-all' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
