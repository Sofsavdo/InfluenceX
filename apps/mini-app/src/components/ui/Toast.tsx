import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * 2026-07-14: ilgari muvaffaqiyat/xato holatlari uchun umumiy toast/snackbar
 * tizimi yo'q edi (sahifalar orasida xato ko'rsatish bir xil emas edi - ba'zi
 * joyda matn, ba'zi joyda hech narsa). Endi useToast() orqali istalgan
 * komponentdan chaqiriladigan yagona, izchil tizim.
 */
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<{ show: (tone: ToastTone, message: string) => void } | null>(null);

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success-dot shrink-0" />,
  error: <AlertCircle size={18} className="text-danger-dot shrink-0" />,
  info: <Info size={18} className="text-info-dot shrink-0" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, tone, message }]);
      window.setTimeout(() => remove(id), 3200);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed top-0 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pointer-events-none">
          {items.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto w-full max-w-lg flex items-start gap-2.5 rounded-xl bg-surface border border-ink-100 shadow-modal px-3.5 py-3 animate-toastIn"
            >
              {ICONS[t.tone]}
              <p className="flex-1 text-sm font-medium text-ink-800">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-ink-300 shrink-0" aria-label="Yopish">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() faqat <ToastProvider> ichida ishlatiladi');
  return {
    success: (message: string) => ctx.show('success', message),
    error: (message: string) => ctx.show('error', message),
    info: (message: string) => ctx.show('info', message),
  };
}
