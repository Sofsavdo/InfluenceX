import { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export function Label({
  children,
  hint,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-[13px] font-semibold text-ink-600" {...rest}>
        {children}
      </label>
      {hint && <span className="text-[11px] text-ink-300">{hint}</span>}
    </div>
  );
}

// 2026-07-14 (UX audit): minimal 44px teginish balandligi (Apple HIG / Material Design
// tavsiyasi) - avvalgi py-2.5 (~40px) mobil ekranlarda barmoq bilan aniq bosishga yetarli
// emas edi. Xato holati uchun alohida "invalid" prop qo'shildi - qizil ramka + qisqa
// tushuntirish matni maydonning tagida darhol ko'rinadi (umumiy xato matni faqat forma
// oxirida bo'lgani uchun uzun formalarda foydalanuvchi qaysi maydon xato ekanini
// darhol bilmasdi).
const fieldBase =
  'w-full min-h-[46px] rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-300 outline-none transition-shadow disabled:bg-ink-50 disabled:text-ink-400';
const fieldOk = 'border-ink-200 focus:border-accent-400 focus:ring-4 focus:ring-accent-100';
const fieldError = 'border-danger-dot focus:border-danger-dot focus:ring-4 focus:ring-danger-bg';

export function Input({ invalid, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`${fieldBase} ${invalid ? fieldError : fieldOk} ${className}`} {...props} />;
}

export function Textarea({
  invalid,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`${fieldBase} min-h-[96px] py-3 resize-y ${invalid ? fieldError : fieldOk} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${fieldBase} ${fieldOk} appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-danger-text mt-1.5">{children}</p>;
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

// Formalarni mantiqiy bo'limlarga ajratish uchun (2026-07-14 UX audit) - uzun, bo'linmagan
// forma o'rniga har bir bo'lim sarlavha + qisqa tavsif bilan ko'rsatiladi.
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="text-[13px] font-bold text-ink-800 uppercase tracking-wide mb-0.5">{title}</h4>
      {description && <p className="text-xs text-ink-400 mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Uzun formalarda "Saqlash" tugmasi pastda ko'zdan yo'qolib qolmasligi uchun -
// ekran tagiga yopishgan panel (Telegram xavfsiz zonasini hisobga oladi).
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] max-w-lg mx-auto">
      {children}
    </div>
  );
}
