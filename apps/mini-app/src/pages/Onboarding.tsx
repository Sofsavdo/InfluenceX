import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Video, Briefcase, ChevronLeft } from 'lucide-react';
import { apiClient } from '../api/client';
import { UserRole, Language } from '@influencex/shared';
import { Button } from '../components/ui/Button';
import { Label, Input, FormSection } from '../components/ui/Field';
import { LanguageMultiSelect } from '../components/ui/LanguageSwitcher';
import { useTelegramMainButton } from '../lib/telegramUI';
import { haptic, hapticNotify } from '../lib/telegramUI';

// PRD v2 §2: Telegram orqali avtomatik autentifikatsiya qilingach, foydalanuvchi
// rolini (Creator/Business) tanlaydigan va asosiy profil ma'lumotlarini kiritadigan
// qisqa onboarding wizard.
//
// 2026-07-14 (to'liq UX/UI qayta qurish - ikkinchi bosqich): AVVAL bu ekran shunchaki
// ikkita tugma edi - qaysi birini bossa ham, backend'ga BO'SH ism/kompaniya nomi
// (`name: ''` / `companyName: ''`) yuborilib, foydalanuvchi to'g'ridan-to'g'ri
// Profil sahifasiga otardi. Bu "ro'yhatdan o'tish formasi" umuman yo'q degani edi -
// aynan shu narsa foydalanuvchi tomonidan aniq belgilangan bo'shliq edi. Endi rol
// tanlangach, minimal-friction 2-qadamli forma ko'rsatiladi (faqat ism/kompaniya nomi
// majburiy - qolgan hamma narsa ixtiyoriy va Profil sahifasida keyinroq to'ldirilishi
// mumkin), so'ng foydalanuvchi to'g'ridan-to'g'ri Bosh sahifaga (kampaniyalarni
// ko'rish/yaratish) yo'naltiriladi - Profilga emas, chunki asosiy maqsad "pul
// ishlash/kampaniya topish" bo'lib, profilni yanada boyitish ikkinchi darajali.
type Step = 'role' | 'creator-form' | 'business-form';

const detectedLanguage = (): Language => {
  const code = (navigator.language || 'uz').slice(0, 2);
  if (code === 'ru') return Language.RU;
  if (code === 'en') return Language.EN;
  return Language.UZ;
};

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kreator forma maydonlari
  const [crName, setCrName] = useState('');
  const [crCountry, setCrCountry] = useState('');
  const [crCity, setCrCity] = useState('');
  const [crCategories, setCrCategories] = useState('');
  const [crLanguages, setCrLanguages] = useState<Language[]>([detectedLanguage()]);

  // Biznes forma maydonlari
  const [bizCompanyName, setBizCompanyName] = useState('');
  const [bizIndustry, setBizIndustry] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');

  function toggleLanguage(code: string) {
    haptic('light');
    setCrLanguages((prev) =>
      prev.includes(code as Language) ? prev.filter((l) => l !== code) : [...prev, code as Language],
    );
  }

  async function submitCreator() {
    if (!crName.trim()) {
      setError(t('profile.nameRequired') as string);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.put('/users/me/creator-profile', {
        name: crName.trim(),
        country: crCountry.trim() || undefined,
        city: crCity.trim() || undefined,
        languages: crLanguages,
        categories: crCategories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });
      hapticNotify('success');
      navigate('/', { replace: true });
    } catch (e) {
      hapticNotify('error');
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBusiness() {
    if (!bizCompanyName.trim()) {
      setError(t('profile.companyNameRequired') as string);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.put('/users/me/business-profile', {
        companyName: bizCompanyName.trim(),
        industry: bizIndustry.trim() || undefined,
        website: bizWebsite.trim() || undefined,
      });
      hapticNotify('success');
      navigate('/', { replace: true });
    } catch (e) {
      hapticNotify('error');
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function pickRole(role: UserRole) {
    haptic('light');
    setError(null);
    setStep(role === UserRole.CREATOR ? 'creator-form' : 'business-form');
  }

  // Har bir qadamning o'z asosiy harakati Telegram nativ MainButton'iga ulanadi -
  // barcha uchta holat uchun HAM chaqiriladi (Hooks qoidasi - shartli emas), faqat
  // matn/onClick/visible joriy qadamga qarab o'zgaradi.
  useTelegramMainButton({
    text: t('onboarding.creator') as string,
    onClick: () => pickRole(UserRole.CREATOR),
    visible: step === 'role',
  });
  useTelegramMainButton({
    text: t('onboarding.continue') as string,
    onClick: submitCreator,
    visible: step === 'creator-form',
    disabled: !crName.trim(),
    loading: submitting,
  });
  useTelegramMainButton({
    text: t('onboarding.continue') as string,
    onClick: submitBusiness,
    visible: step === 'business-form',
    disabled: !bizCompanyName.trim(),
    loading: submitting,
  });

  if (step === 'role') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-8 bg-gradient-to-b from-accent-50 to-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-accent-500 shadow-pop flex items-center justify-center text-white">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{t('onboarding.welcome')}</h1>
          <p className="text-ink-400 text-sm max-w-[260px]">{t('onboarding.chooseRole')}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" full icon={<Video size={18} />} onClick={() => pickRole(UserRole.CREATOR)}>
            {t('onboarding.creator')}
          </Button>
          <Button
            size="lg"
            full
            variant="secondary"
            icon={<Briefcase size={18} />}
            onClick={() => pickRole(UserRole.BUSINESS)}
          >
            {t('onboarding.business')}
          </Button>
        </div>
      </div>
    );
  }

  const isCreator = step === 'creator-form';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => {
            haptic('light');
            setStep('role');
          }}
          aria-label={t('onboarding.back') as string}
          className="tap-scale h-9 w-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-600 shrink-0"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-ink-900">
            {t(isCreator ? 'onboarding.creatorFormTitle' : 'onboarding.businessFormTitle')}
          </h1>
          <p className="text-xs text-ink-400">
            {t(isCreator ? 'onboarding.creatorFormSubtitle' : 'onboarding.businessFormSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isCreator ? (
          <>
            <FormSection title={t('profile.nameField') as string}>
              <Input
                autoFocus
                value={crName}
                onChange={(e) => setCrName(e.target.value)}
                invalid={!crName.trim() && Boolean(error)}
                placeholder={t('profile.nameField') as string}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('profile.countryField')}</Label>
                  <Input value={crCountry} onChange={(e) => setCrCountry(e.target.value)} />
                </div>
                <div>
                  <Label>{t('profile.cityField')}</Label>
                  <Input value={crCity} onChange={(e) => setCrCity(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t('profile.categoriesField')}</Label>
                <Input value={crCategories} onChange={(e) => setCrCategories(e.target.value)} placeholder="fashion, tech, food..." />
              </div>
            </FormSection>

            <FormSection title={t('profile.languagesField') as string}>
              <LanguageMultiSelect value={crLanguages} onToggle={toggleLanguage} />
            </FormSection>
          </>
        ) : (
          <FormSection title={t('profile.companyNameField') as string}>
            <Input
              autoFocus
              value={bizCompanyName}
              onChange={(e) => setBizCompanyName(e.target.value)}
              invalid={!bizCompanyName.trim() && Boolean(error)}
              placeholder={t('profile.companyNameField') as string}
            />
            <div>
              <Label>{t('profile.industryField')}</Label>
              <Input value={bizIndustry} onChange={(e) => setBizIndustry(e.target.value)} />
            </div>
            <div>
              <Label>{t('profile.websiteField')}</Label>
              <Input type="url" value={bizWebsite} onChange={(e) => setBizWebsite(e.target.value)} placeholder="https://" />
            </div>
          </FormSection>
        )}

        {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

        {/* Telegram tashqarisida (brauzerda) MainButton mavjud emas - shu holat uchun
            sahifa ichida ham zaxira tugma ko'rsatiladi. */}
        <Button
          full
          size="lg"
          loading={submitting}
          disabled={isCreator ? !crName.trim() : !bizCompanyName.trim()}
          onClick={isCreator ? submitCreator : submitBusiness}
        >
          {t('onboarding.continue')}
        </Button>
      </div>
    </div>
  );
}
