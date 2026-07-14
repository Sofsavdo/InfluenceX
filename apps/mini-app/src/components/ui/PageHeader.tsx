import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-start gap-2">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="tap-scale h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center text-ink-600 shrink-0 mt-0.5"
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
