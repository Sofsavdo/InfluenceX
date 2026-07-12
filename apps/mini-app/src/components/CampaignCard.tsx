import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignDto } from '@influencex/shared';

export function CampaignCard({ campaign }: { campaign: CampaignDto }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="block rounded-xl border border-tg-secondaryBg bg-tg-secondaryBg/40 p-4 mb-3"
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-base flex items-center gap-1">
          {campaign.isFeatured && <span title={t('myCampaigns.featured')}>⭐</span>}
          {campaign.title}
        </h3>
        <span className="text-xs rounded-full bg-tg-button text-tg-buttonText px-2 py-1 whitespace-nowrap">
          {campaign.contentType}
        </span>
      </div>
      <p className="text-sm text-tg-hint mt-1 line-clamp-2">{campaign.description}</p>
      <div className="flex justify-between text-sm mt-3">
        <span>
          {t('home.budget')}: <strong>{campaign.budget.toLocaleString()} {campaign.currency}</strong>
        </span>
        <span className="text-tg-hint">
          {t('home.deadline')}: {new Date(campaign.deadline).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
