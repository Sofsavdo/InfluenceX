import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Calendar, Wallet } from 'lucide-react';
import type { CampaignDto } from '@influencex/shared';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

const CONTENT_TYPE_LABEL: Record<string, string> = {
  REEL: 'Reel',
  STORY: 'Story',
  POST: 'Post',
  UGC_VIDEO: 'UGC Video',
  PRODUCT_REVIEW: 'Review',
  VOICE_REVIEW: 'Voice',
  SHORT_VIDEO: 'Short',
  LONG_VIDEO: 'Long',
  YOUTUBE_INTEGRATION: 'YouTube',
};

export function CampaignCard({ campaign }: { campaign: CampaignDto }) {
  const { t } = useTranslation();
  return (
    <Link to={`/campaigns/${campaign.id}`} className="block mb-3">
      <Card interactive>
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-semibold text-[15px] text-ink-900 leading-snug flex items-center gap-1.5">
            {campaign.isFeatured && <Star size={14} className="text-warning-dot fill-warning-dot shrink-0" />}
            {campaign.title}
          </h3>
          <Badge tone="info" className="shrink-0">
            {CONTENT_TYPE_LABEL[campaign.contentType] ?? campaign.contentType}
          </Badge>
        </div>
        <p className="text-sm text-ink-400 mt-1.5 line-clamp-2 leading-relaxed">{campaign.description}</p>
        <div className="flex items-center justify-between text-sm mt-3.5 pt-3 border-t border-ink-100">
          <span className="flex items-center gap-1.5 font-semibold text-ink-900">
            <Wallet size={14} className="text-accent-500" />
            {campaign.budget.toLocaleString()} {campaign.currency}
          </span>
          <span className="flex items-center gap-1.5 text-ink-400 text-xs">
            <Calendar size={13} />
            {new Date(campaign.deadline).toLocaleDateString()}
          </span>
        </div>
      </Card>
    </Link>
  );
}
