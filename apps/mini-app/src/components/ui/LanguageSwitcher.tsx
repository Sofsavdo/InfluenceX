import { Check } from 'lucide-react';

// 2026-07-14 (UX audit): avvalgi "til tanlash" UI shunchaki uchta kichik "UZ/RU/EN"
// tugmasi edi (44px'dan kichik, faqat kod, hech qanday vizual ierarxiya) - foydalanuvchi
// buni forma elementi deb ham bilmasligi mumkin edi. Endi har bir til bayroq + to'liq
// (mahalliy) nom + tanlanganda check belgisi bilan, to'liq kenglikdagi, aniq bosiladigan
// qator sifatida ko'rsatiladi.
const LANGUAGES: { code: 'uz' | 'ru' | 'en'; flag: string; native: string; english: string }[] = [
  { code: 'uz', flag: '🇺🇿', native: "O'zbekcha", english: 'Uzbek' },
  { code: 'ru', flag: '🇷🇺', native: 'Русский', english: 'Russian' },
  { code: 'en', flag: '🇬🇧', native: 'English', english: 'English' },
];

export function LanguageSwitcher({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="space-y-2">
      {LANGUAGES.map((lng) => {
        const active = value === lng.code;
        return (
          <button
            key={lng.code}
            type="button"
            onClick={() => onChange(lng.code)}
            className={`tap-scale w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
              active ? 'border-accent-500 bg-accent-50' : 'border-ink-200 bg-white'
            }`}
          >
            <span className="text-2xl leading-none">{lng.flag}</span>
            <span className="flex-1 min-w-0">
              <span className={`block text-sm font-semibold ${active ? 'text-accent-700' : 'text-ink-900'}`}>
                {lng.native}
              </span>
              <span className="block text-xs text-ink-400">{lng.english}</span>
            </span>
            {active && (
              <span className="h-6 w-6 rounded-full bg-accent-500 text-white flex items-center justify-center shrink-0">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// "Gapiradigan tillar" (kreator profili) kabi ko'p-tanlovli holatlar uchun - xuddi shu
// vizual til, lekin bir nechta tanlash mumkin (checkbox xatti-harakati).
export function LanguageMultiSelect({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="space-y-2">
      {LANGUAGES.map((lng) => {
        const active = value.includes(lng.code);
        return (
          <button
            key={lng.code}
            type="button"
            onClick={() => onToggle(lng.code)}
            className={`tap-scale w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
              active ? 'border-accent-500 bg-accent-50' : 'border-ink-200 bg-white'
            }`}
          >
            <span className="text-xl leading-none">{lng.flag}</span>
            <span className={`flex-1 text-sm font-medium ${active ? 'text-accent-700' : 'text-ink-800'}`}>
              {lng.native}
            </span>
            <span
              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                active ? 'bg-accent-500 border-accent-500 text-white' : 'border-ink-300'
              }`}
            >
              {active && <Check size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
