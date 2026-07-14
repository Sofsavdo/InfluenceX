import { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Label({ children, ...rest }: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide" {...rest}>
      {children}
    </label>
  );
}

const fieldBase =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-shadow focus:border-accent-400 focus:ring-4 focus:ring-accent-100 disabled:bg-ink-50 disabled:text-ink-400';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldBase} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} min-h-[96px] resize-y`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldBase} {...props} />;
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
