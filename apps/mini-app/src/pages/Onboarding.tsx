import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { UserRole } from '@influencex/shared';

// PRD v2 §2: Telegram orqali avtomatik autentifikatsiya qilingach, foydalanuvchi
// rolini (Creator/Business) tanlaydigan qisqa onboarding wizard.
export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function choose(role: UserRole) {
    setSubmitting(true);
    try {
      if (role === UserRole.CREATOR) {
        await apiClient.put('/users/me/creator-profile', { name: '' });
      } else {
        await apiClient.put('/users/me/business-profile', { companyName: '' });
      }
      navigate('/profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-6">
      <h1 className="text-2xl font-bold">{t('onboarding.welcome')}</h1>
      <p className="text-tg-hint">{t('onboarding.chooseRole')}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          disabled={submitting}
          onClick={() => choose(UserRole.CREATOR)}
          className="rounded-lg bg-tg-button text-tg-buttonText py-3 font-semibold"
        >
          {t('onboarding.creator')}
        </button>
        <button
          disabled={submitting}
          onClick={() => choose(UserRole.BUSINESS)}
          className="rounded-lg border border-tg-button text-tg-link py-3 font-semibold"
        >
          {t('onboarding.business')}
        </button>
      </div>
    </div>
  );
}
