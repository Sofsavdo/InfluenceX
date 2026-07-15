import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Phone, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { setWebToken } from '../lib/webSession';
import { Button } from '../components/ui/Button';
import { Label, Input } from '../components/ui/Field';

interface VerifyResult {
  user: { id: string };
  accessToken: string;
}

/**
 * 2026-07-15 (standalone veb-sayt so'rovi): Telegram tashqarisida (oddiy mobil brauzer)
 * ochilganda ko'rsatiladigan kirish sahifasi - telefon raqam -> SMS OTP -> JWT sessiya.
 * Telegram Mini App ICHIDA bu sahifa HECH QACHON ko'rinmaydi (App.tsx faqat
 * initData yo'q va saqlangan veb-sessiya yo'q bo'lgandagina bu yerga yo'naltiradi).
 */
export default function WebLogin() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/request-otp', { phone });
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiClient.post<VerifyResult>('/auth/verify-otp', { phone, code });
      setWebToken(result.accessToken);
      // To'liq qayta yuklash - ilova endi JWT sessiya bilan toza holatdan boshlanadi
      // (App.tsx'dagi barcha bootstrap tekshiruvlari qayta ishlaydi).
      window.location.href = '/';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-8 bg-gradient-to-b from-accent-50 to-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-accent-500 shadow-pop flex items-center justify-center text-white">
          <Sparkles size={28} />
        </div>
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{t('webLogin.title')}</h1>
        <p className="text-ink-400 text-sm max-w-[280px]">
          {step === 'phone' ? t('webLogin.subtitle') : `${t('webLogin.codeSentSubtitle')} ${phone}`}
        </p>
      </div>

      <div className="w-full max-w-xs text-left">
        {step === 'phone' ? (
          <>
            <Label>{t('webLogin.phoneLabel')}</Label>
            <Input
              autoFocus
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('webLogin.phonePlaceholder') as string}
            />
            {error && <p className="text-danger-text text-xs mt-2">{error}</p>}
            <Button
              full
              size="lg"
              className="mt-4"
              icon={<Phone size={16} />}
              loading={submitting}
              disabled={phone.trim().length < 9}
              onClick={sendCode}
            >
              {t('webLogin.sendCode')}
            </Button>
          </>
        ) : (
          <>
            <Label>{t('webLogin.codeLabel')}</Label>
            <Input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center tracking-[0.5em] text-lg font-bold"
            />
            {error && <p className="text-danger-text text-xs mt-2">{error}</p>}
            <Button
              full
              size="lg"
              className="mt-4"
              icon={<ShieldCheck size={16} />}
              loading={submitting}
              disabled={code.length !== 6}
              onClick={verify}
            >
              {t('webLogin.verify')}
            </Button>
            <div className="flex justify-between mt-3">
              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                className="text-xs font-medium text-ink-400"
              >
                {t('webLogin.changeNumber')}
              </button>
              <button onClick={sendCode} disabled={submitting} className="text-xs font-medium text-accent-600">
                {t('webLogin.resend')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
