import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'accent';
}) {
  return (
    <div
      className={`rounded-2xl p-4 border shadow-card ${
        tone === 'accent' ? 'bg-accent-500 border-accent-500 text-white' : 'bg-surface border-ink-100 text-ink-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone === 'accent' ? 'text-white/80' : 'text-ink-400'}`}>
          {label}
        </span>
        {icon && <span className={tone === 'accent' ? 'text-white/80' : 'text-ink-300'}>{icon}</span>}
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
