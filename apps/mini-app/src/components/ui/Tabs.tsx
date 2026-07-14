export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`tap-scale flex-1 min-h-[38px] rounded-lg text-sm font-semibold transition-colors ${
              active ? 'bg-surface text-ink-900 shadow-card' : 'text-ink-500'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
