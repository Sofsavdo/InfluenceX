import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramWebApp } from './telegram';

/**
 * 2026-07-14 (to'liq UX/UI qayta qurish): "bir qo'l bilan ishlatish" talabiga javoban -
 * har bir sahifaning asosiy harakati (Yuborish, Saqlash, Ariza qoldirish...) endi
 * Telegramning NATIV MainButton'iga bog'lanadi. Bu tugma ekranning eng pastida,
 * bosh barmoq bilan har doim yetadigan hududda joylashadi va Telegram'ning o'z
 * animatsiyasi/rangi bilan ishlaydi - foydalanuvchiga sahifa ichidagi qo'shimcha
 * tugmani qidirish shart bo'lmaydi.
 *
 * Ilova Telegram tashqarisida (brauzerda) ochilganda MainButton mavjud bo'lmaydi -
 * bu holatda chaqiruvchi komponent odatdagi sahifa-ichi tugmasini ko'rsatishda
 * davom etishi kerak (fallback allaqachon har bir sahifada saqlanadi).
 */
export function useTelegramMainButton(options: {
  text: string;
  onClick: () => void;
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { text, onClick, visible = true, disabled = false, loading = false } = options;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return undefined;
    const handler = () => onClickRef.current();
    webApp.MainButton.setText(text);
    webApp.MainButton.onClick(handler);
    return () => webApp.MainButton.offClick(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return undefined;
    if (visible) {
      webApp.MainButton.show();
      if (disabled) webApp.MainButton.disable();
      else webApp.MainButton.enable();
      if (loading) webApp.MainButton.showProgress(true);
      else webApp.MainButton.hideProgress();
    } else {
      webApp.MainButton.hide();
    }
    return () => {
      webApp.MainButton.hide();
    };
  }, [visible, disabled, loading]);

  return Boolean(getTelegramWebApp());
}

/** Ichki sahifalarda Telegram'ning nativ "Orqaga" tugmasi (header'dagi qo'lda chizilgan chevron o'rniga). */
export function useTelegramBackButton(enabled = true) {
  const navigate = useNavigate();
  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp || !enabled) return undefined;
    const handler = () => navigate(-1);
    webApp.BackButton.show();
    webApp.BackButton.onClick(handler);
    return () => {
      webApp.BackButton.offClick(handler);
      webApp.BackButton.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getTelegramWebApp()?.HapticFeedback.impactOccurred(style);
}

export function hapticNotify(type: 'error' | 'success' | 'warning') {
  getTelegramWebApp()?.HapticFeedback.notificationOccurred(type);
}
