import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Users, Search, Star, X } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CreatorDiscoveryDto } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { haptic } from '../lib/telegramUI';

const QUICK_CATEGORIES = ['fashion', 'beauty', 'tech', 'food', 'fitness', 'travel', 'gaming', 'lifestyle'];

function CardSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-2xl bg-ink-100" />
          <div className="h-3 w-3/4 rounded bg-ink-100 mt-2" />
          <div className="h-3 w-1/2 rounded bg-ink-100 mt-1.5" />
        </div>
      ))}
    </div>
  );
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// PRD "Discovery" (Collabstr "Search Creators" tahlilidan keyin, 2026-07-15,
// qayta ishlangan 2026-07-15 kech): dastlabki versiya gorizontal ro'yxat kartalari
// edi - bu Collabstr'ning rasm-markazli 2 ustunli grid tajribasidan tubdan farq
// qilardi va shuning uchun "Collabstr'ga o'xshamayapti" degan haqli tanqidga sabab
// bo'lgan asosiy vizual farqlardan biri edi. Endi: katta profil rasmli 2 ustunli
// grid, tezkor kategoriya chiplari (erkin matn maydoni o'rniga/qo'shimcha), va
// natijalar soni - Collabstr'ning "Search Creators" sahifasidagi asosiy naqshlar.
export default function BrowseCreators() {
  const { t } = useTranslation();
  const [creators, setCreators] = useState<CreatorDiscoveryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [showFollowersInput, setShowFollowersInput] = useState(false);

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

  function pickCategory(cat: string) {
    haptic('light');
    setCategory((prev) => (prev === cat ? '' : cat));
  }

  const hasFilters = Boolean(category || minFollowers);

  return (
    <div className="p-4 pb-24">
      <PageHeader title={t('browseCreators.title')} />
      <p className="text-sm text-ink-400 -mt-3 mb-4">{t('browseCreators.subtitle')}</p>

      {/* Tezkor kategoriya chiplari - Collabstr uslubi: erkin matn kiritish o'rniga
          bir marta bosib filtrlash, mobil'da qidiruv klaviaturasini ochish shart emas. */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-4 px-4 no-scrollbar">
        {QUICK_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => pickCategory(cat)}
              className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap border ${
                active
                  ? 'bg-accent-500 border-accent-500 text-white'
                  : 'bg-surface border-ink-100 text-ink-600'
              }`}
            >
              {t(`browseCreators.categories.${cat}`)}
            </button>
          );
        })}
        <button
          onClick={() => setShowFollowersInput((v) => !v)}
          className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap border ${
            minFollowers ? 'bg-accent-500 border-accent-500 text-white' : 'bg-surface border-ink-100 text-ink-600'
          }`}
        >
          {t('browseCreators.minFollowersPlaceholder')}
        </button>
      </div>

      {showFollowersInput && (
        <div className="mb-3">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            autoFocus
            placeholder={t('browseCreators.minFollowersPlaceholder') as string}
            value={minFollowers}
            onChange={(e) => setMinFollowers(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-ink-400">
          {loading ? ' ' : t('browseCreators.resultsCount', { count: creators.length })}
        </p>
        {hasFilters && (
          <button
            onClick={() => {
              haptic('light');
              setCategory('');
              setMinFollowers('');
              setShowFollowersInput(false);
            }}
            className="tap-scale inline-flex items-center gap-1 text-xs font-semibold text-accent-600"
          >
            <X size={13} />
            {t('browseCreators.clearFilters')}
          </button>
        )}
      </div>

      {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

      {loading && <CardSkeletonGrid />}

      {!loading && creators.length === 0 && (
        <EmptyState icon={<Search size={24} />} title={t('browseCreators.empty')} />
      )}

      <div className="grid grid-cols-2 gap-3">
        {creators.map((creator) => (
          <Link
            key={creator.id}
            to={`/creators/${creator.id}`}
            onClick={() => haptic('light')}
            className="tap-scale block rounded-2xl overflow-hidden bg-surface border border-ink-100 shadow-card"
          >
            <div className="relative aspect-[4/5] bg-ink-100">
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-accent-100 text-accent-700 font-bold text-3xl">
                  {(creator.name || '?').trim().charAt(0).toUpperCase()}
                </div>
              )}
              {creator.verificationStatus === 'VERIFIED' && (
                <span className="absolute top-2 left-2">
                  <Badge tone="success" dot>
                    {t('profile.verificationStatus.verified')}
                  </Badge>
                </span>
              )}
              {creator.startingPrice && (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/65 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
                  {t('browseCreators.startingPrice', {
                    amount: creator.startingPrice.amount.toLocaleString(),
                    currency: creator.startingPrice.currency,
                  })}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="truncate font-semibold text-ink-900 text-[13.5px]">{creator.name}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] text-ink-400 inline-flex items-center gap-1">
                  <Users size={11} />
                  {formatFollowers(creator.followers)}
                </p>
                {creator.rating > 0 && (
                  <p className="text-[11px] text-ink-500 inline-flex items-center gap-0.5 font-medium">
                    <Star size={11} className="fill-warning-dot text-warning-dot" />
                    {creator.rating.toFixed(1)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
