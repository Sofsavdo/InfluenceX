import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * 2026-07-14: markazlashgan modal/bottom-sheet primitive'lari. Ilgari loyihada
 * hech qanday Modal komponenti yo'q edi - destruktiv harakatlar (o'chirish,
 * bekor qilish) uchun brauzerning o'z `window.confirm()` dialogi ishlatilgan,
 * bu Telegram WebView ichida notekis va "arzon" ko'rinadi hamda mavzu
 * (light/dark) yoki brendga mos kelmaydi.
 */
function Overlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-overlay animate-overlayIn"
      onClick={onClose}
      aria-hidden
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <>
      <Overlay onClose={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 max-w-lg mx-auto -translate-y-1/2 animate-popIn">
        <div className="rounded-2xl bg-surface shadow-modal p-5 max-h-[80vh] overflow-y-auto">
          {title && (
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold text-ink-900 pr-4">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Yopish"
                className="tap-scale h-8 w-8 shrink-0 rounded-full bg-ink-100 flex items-center justify-center text-ink-600"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

/**
 * Bosh barmoq bilan bir qo'lda ishlatish uchun - ekranning pastidan chiqadigan
 * varaq (native Telegram/iOS action sheet uslubida). Filtrlar, tanlov ro'yxatlari
 * va boshqa "pastdan chiquvchi" UI uchun Modal o'rniga shu ishlatiladi.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <>
      <Overlay onClose={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto animate-sheetUp">
        <div className="rounded-t-3xl bg-surface shadow-modal px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[85vh] overflow-y-auto">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink-200" />
          {title && <h3 className="text-base font-bold text-ink-900 mb-3">{title}</h3>}
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'danger' | 'accent';
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="text-sm text-ink-500 mb-5">{description}</p>}
      <div className="flex gap-2.5">
        <button
          onClick={onClose}
          className="tap-scale flex-1 min-h-[46px] rounded-xl bg-ink-100 text-ink-800 font-semibold text-sm"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`tap-scale flex-1 min-h-[46px] rounded-xl text-white font-semibold text-sm disabled:opacity-60 ${
            tone === 'danger' ? 'bg-danger-dot' : 'bg-accent-500'
          }`}
        >
          {loading ? '...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
