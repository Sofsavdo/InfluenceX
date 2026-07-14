import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, Calendar, Handshake, Film, CheckCircle2, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CampaignDto } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { useTelegramMainButton, useTelegramBackButton } from '../lib/telegramUI';

type UserRole = 'CREATOR' | 'BUSINESS' | 'ADMIN' | 'MODERATOR';

interface MeResponse {
  role: UserRole;
  businessProfile?: {
    id: string;
  } | null;
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-semibold text-ink-900 text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// PRD v2 §4.3: kampaniya tafsilotlari.
// - Kreator uchun: "Zayavka berish" formasi.
// - Kampaniya egasi biznes uchun: forma o'rniga "Zayavkalarni ko'rish" havolasi.
//   Qabul/rad qilish CampaignApplicants.tsx sahifasida amalga oshiriladi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/holatlar o'zgarmagan.
export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (id) {
      apiClient
        .get<CampaignDto>(`/campaigns/${id}`)
        .then(setCampaign)
        .catch(() => setCampaign(null));
    }

    apiClient
      .get<MeResponse>('/users/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, [id]);

  async function submitApplication() {
    if (!id || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post('/applications', {
        campaignId: id,
        message: message.trim() || undefined,
      });

      setApplied(true);
    } finally {
      setSubmitting(false);
    }
  }

  const isOwner = campaign != null && me?.role === 'BUSINESS' && me.businessProfile?.id === campaign.businessId;
  const canApply = campaign != null && me?.role === 'CREATOR' && !isOwner && !applied;

  useTelegramBackButton();
  useTelegramMainButton({
    text: t('home.apply') as string,
    onClick: submitApplication,
    visible: canApply,
    disabled: submitting,
    loading: submitting,
  });

  if (!campaign) {
    return (
      <div className="p-4 pb-24">
        <Skeleton className="h-7 w-2/3 mb-3" />
        <Skeleton className="h-4 w-full mb-1.5" />
        <Skeleton className="h-4 w-4/5 mb-6" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <PageHeader back title={campaign.title} />

      <p className="text-sm text-ink-500 leading-relaxed -mt-3 mb-5 break-words">{campaign.description}</p>

      <Card className="grid grid-cols-2 gap-y-5 gap-x-3">
        <DetailStat
          icon={<Wallet size={16} />}
          label={t('home.budget')}
          value={`${campaign.budget.toLocaleString()} ${campaign.currency}`}
        />
        <DetailStat
          icon={<Calendar size={16} />}
          label={t('home.deadline')}
          value={new Date(campaign.deadline).toLocaleDateString()}
        />
        <DetailStat icon={<Handshake size={16} />} label="Hamkorlik modeli" value={campaign.collaborationModel} />
        <DetailStat icon={<Film size={16} />} label="Kontent turi" value={campaign.contentType} />
      </Card>

      {isOwner ? (
        <Button full size="lg" icon={<Users size={18} />} className="mt-6" onClick={() => navigate(`/campaigns/${id}/applicants`)}>
          {t('applicants.viewApplicants')}
        </Button>
      ) : canApply ? (
        <div className="mt-6">
          <Textarea
            placeholder="Qisqa xabar (ixtiyoriy)"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button full size="lg" className="mt-3" loading={submitting} onClick={submitApplication}>
            {t('home.apply')}
          </Button>
        </div>
      ) : applied ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-success-text">
          <CheckCircle2 size={32} />
          <p className="font-semibold">Zayavka yuborildi</p>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-ink-400">
          Bu kampaniyaga faqat kreator profilidan zayavka yuborish mumkin.
        </p>
      )}
    </div>
  );
}
