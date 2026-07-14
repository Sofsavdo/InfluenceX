import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Video, Briefcase } from 'lucide-react';
import { apiClient } from '../api/client';
import { UserRole } from '@influencex/shared';
import { Button } from '../components/ui/Button';

// PRD v2 §2: Telegram orqali avtomatik autentifikatsiya qilingach, foydalanuvchi
// rolini (Creator/Business) tanlaydigan qisqa onboarding wizard.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq o'zgarmagan.
export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<UserRole | null>(null);

  async function choose(role: UserRole) {
    setSubmitting(role);
    try {
      if (role === UserRole.CREATOR) {
        await apiClient.put('/users/me/creator-profile', { name: '' });
      } else {
        await apiClient.put('/users/me/business-profile', { companyName: '' });
      }
      navigate('/profile');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-8 bg-gradient-to-b from-accent-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-accent-500 shadow-pop flex items-center justify-center text-white">
          <Sparkles size={28} />
        </div>
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{t('onboarding.welcome')}</h1>
        <p className="text-ink-400 text-sm max-w-[260px]">{t('onboarding.chooseRole')}</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          full
          icon={<Video size={18} />}
          loading={submitting === UserRole.CREATOR}
          disabled={submitting !== null}
          onClick={() => choose(UserRole.CREATOR)}
        >
          {t('onboarding.creator')}
        </Button>
        <Button
          size="lg"
          full
          variant="secondary"
          icon={<Briefcase size={18} />}
          loading={submitting === UserRole.BUSINESS}
          disabled={submitting !== null}
          onClick={() => choose(UserRole.BUSINESS)}
        >
          {t('onboarding.business')}
        </Button>
      </div>
    </div>
  );
}
