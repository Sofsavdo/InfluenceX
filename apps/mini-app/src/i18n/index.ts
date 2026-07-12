import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './uz.json';
import ru from './ru.json';
import en from './en.json';
import { getTelegramUser } from '../lib/telegram';

// PRD v2 §4.8: uz-Lotin ustuvor, keyin ru, keyin en. Telegram foydalanuvchi
// tilidan avtomatik aniqlanadi, keyin qo'lda o'zgartirilishi mumkin (Profil ekrani).
const detectedLng = (() => {
  const code = getTelegramUser()?.language_code;
  if (code === 'ru') return 'ru';
  if (code === 'en') return 'en';
  return 'uz';
})();

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: detectedLng,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export default i18n;
