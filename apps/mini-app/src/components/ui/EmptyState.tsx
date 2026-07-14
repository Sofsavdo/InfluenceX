import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fadeIn">
      <div className="h-14 w-14 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-400 mb-4">
        {icon ?? <Inbox size={26} />}
      </div>
      <p className="font-semibold text-ink-800">{title}</p>
      {subtitle && <p className="text-sm text-ink-400 mt-1 max-w-[240px]">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
