import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CreatorDiscoveryDto } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Field';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { haptic } from '../lib/telegramUI';

// PRD "Discovery" (Collabstr "Search Creators" tahlilidan keyin, 2026-07-15):
// biznes kreatorlarni ko'zdan kechirib, narx menyusiga qarab tanlaydigan sahifa.
// Backend GET /creators - PUBLIC (auth shart emas, lekin apiClient headerlarni
// avtomatik qo'shadi, bu zararsiz).
export default function BrowseCreators() {
  const { t } = useTranslation();
  const [creators, setCreators] = useState<CreatorDiscoveryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [minFollowers, setMinFollowers] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category.trim()) params.set('category', category.trim());
    if (minFollowers.trim()) params.set('minFollowers', minFollowers.trim());

    // Kichik debounce - foydalanuvchi yozayotganda har harfda so'rov yubormaslik uchun.
    const handle = setTimeout(() => {
      apiClient
        .get<CreatorDiscoveryDto[]>(`/creators${params.toString() ? `?${params.toString()}` : ''}`)
        .then(setCreators)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [category, minFollowers]);

  return (
    <div className="p-4 pb-24">
      <PageHeader title={t('browseCreators.title')} />

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Input
          placeholder={t('browseCreators.categoryPlaceholder') as string}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={t('browseCreators.minFollowersPlaceholder') as string}
          value={minFollowers}
          onChange={(e) => setMinFollowers(e.target.value)}
        />
      </div>

      {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && creators.length === 0 && (
        <EmptyState icon={<Search size={24} />} title={t('browseCreators.empty')} />
      )}

      <div className="space-y-3">
        {creators.map((creator) => (
          <Link key={creator.id} to={`/creators/${creator.id}`} className="block" onClick={() => haptic('light')}>
            <Card interactive>
              <div className="flex items-center gap-3">
                <Avatar name={creator.name} src={creator.avatarUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-ink-900 text-[15px]">{creator.name}</p>
                    {creator.verificationStatus === 'VERIFIED' && (
                      <Badge tone="success" dot>
                        {t('profile.verificationStatus.verified')}
                      </Badge>
                    )}
                  </div>
                  {creator.categories.length > 0 && (
                    <p className="text-xs text-ink-400 mt-0.5 truncate">{creator.categories.join(', ')}</p>
                  )}
                  <p className="text-xs text-ink-500 mt-1 inline-flex items-center gap-1">
                    <Users size={12} />
                    {creator.followers.toLocaleString()} {t('applicants.followers')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {creator.startingPrice ? (
                    <p className="font-bold text-accent-600 text-sm">
                      {t('browseCreators.startingPrice', {
                        amount: creator.startingPrice.amount.toLocaleString(),
                        currency: creator.startingPrice.currency,
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-300">{t('browseCreators.noPrice')}</p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
