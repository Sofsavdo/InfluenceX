import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Eye, Heart, Users, Star, MessageCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CreatorProfileDto, CreatorPackageDto } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useTelegramBackButton, haptic } from '../lib/telegramUI';

interface PortfolioItem {
  id: string;
  mediaUrl: string;
  caption?: string | null;
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

// PRD "Discovery" (Collabstr individual creator page tahlilidan keyin, 2026-07-15):
// biznes kreatorning to'liq profilini, narx menyusini va ishlarini ko'radi, so'ng
// to'g'ridan-to'g'ri Telegram orqali bog'lanadi. Barcha uchta endpoint PUBLIC.
//
// 2026-07-15 (kech, tuzatish): avval bog'lanish tugmasi FAQAT sahifaning eng
// pastida (paketlar + portfoliodan keyin) edi - uzun profilda buni topish uchun
// pastgacha skroll qilish kerak edi. Collabstr'da "Send Message" har doim ekranning
// yuqori qismida, ism/statistika bilan bir joyda ko'rinadi. Endi xuddi shu tugma
// statistikadan keyin HAM takrorlanadi - birinchi ekranda ko'rish/skroll qilmasdan
// harakat qilish mumkin, pastdagi asl tugma esa portfoliodan keyin tabiiy yakun
// sifatida qoladi. Reyting endi ism yonida ko'rinadi (avval umuman ko'rsatilmasdi).
export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [creator, setCreator] = useState<CreatorProfileDto | null>(null);
  const [packages, setPackages] = useState<CreatorPackageDto[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Bu sahifa doim oldinga navigatsiya orqali ochiladi (BrowseCreators kartasidan) -
  // pastki navigatsiya ildizi emas, shuning uchun Telegram orqaga tugmasi kerak
  // (hooks qoidalariga ko'ra shartsiz, komponent boshida chaqiriladi).
  useTelegramBackButton();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    Promise.all([
      apiClient.get<CreatorProfileDto>(`/creators/${id}`),
      apiClient.get<CreatorPackageDto[]>(`/creators/${id}/packages`),
      apiClient.get<PortfolioItem[]>(`/portfolio/creator/${id}`),
    ])
      .then(([creatorData, packagesData, portfolioData]) => {
        setCreator(creatorData);
        setPackages(packagesData);
        setPortfolio(portfolioData);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="p-4 pb-24">
        <EmptyState icon={<Users size={24} />} title={t('creatorProfile.notFoundTitle')} />
      </div>
    );
  }

  const telegramHandle = creator.socialLinks?.TELEGRAM;
  const activePackages = packages.filter((p) => p.active);
  const locationLine = [creator.city, creator.country].filter(Boolean).join(', ');

  const ContactButton = ({ compact = false }: { compact?: boolean }) =>
    telegramHandle ? (
      <a
        href={`https://t.me/${telegramHandle.replace(/^@/, '')}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => haptic('light')}
        className={`tap-scale flex items-center justify-center gap-1.5 w-full min-h-[46px] rounded-xl bg-accent-500 text-white font-semibold text-sm shadow-card ${compact ? 'mb-5' : ''}`}
      >
        <MessageCircle size={16} />
        {t('applicants.contactTelegram')}
      </a>
    ) : compact ? null : (
      <p className="text-center text-xs text-ink-300">{t('applicants.noContactInfo')}</p>
    );

  return (
    <div className="p-4 pb-24">
      <PageHeader back title="" />

      <div className="flex items-center gap-3 mb-4">
        <Avatar name={creator.name} src={creator.avatarUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-ink-900 truncate">{creator.name}</h1>
            {creator.verificationStatus === 'VERIFIED' && (
              <Badge tone="success" dot>
                {t('profile.verificationStatus.verified')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {locationLine && (
              <p className="text-xs text-ink-400 inline-flex items-center gap-1">
                <MapPin size={12} />
                {locationLine}
              </p>
            )}
            {creator.rating > 0 && (
              <p className="text-xs text-ink-500 inline-flex items-center gap-0.5 font-semibold">
                <Star size={12} className="fill-warning-dot text-warning-dot" />
                {creator.rating.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard
          label={t('applicants.followers')}
          icon={<Users size={16} />}
          value={creator.followers.toLocaleString()}
        />
        <StatCard label={t('profile.avgViewsField')} icon={<Eye size={16} />} value={creator.avgViews.toLocaleString()} />
        <StatCard
          label={t('profile.engagementRateField')}
          icon={<Heart size={16} />}
          value={`${creator.engagementRate}%`}
        />
      </div>

      {/* Birinchi ekranda ko'rinadigan asosiy harakat - pastgacha skroll shart emas. */}
      <ContactButton compact />

      {creator.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {creator.categories.map((cat) => (
            <Badge key={cat} tone="neutral">
              {cat}
            </Badge>
          ))}
        </div>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
        {t('creatorProfile.servicesTitle')}
      </h2>
      {activePackages.length === 0 ? (
        <p className="text-sm text-ink-400 mb-5">{t('creatorProfile.noServices')}</p>
      ) : (
        <div className="space-y-2.5 mb-5">
          {activePackages.map((pkg) => (
            <Card key={pkg.id}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900 text-[15px] truncate">{pkg.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {pkg.platform} · {pkg.contentType}
                  </p>
                  {pkg.description && <p className="text-xs text-ink-500 mt-1.5 break-words">{pkg.description}</p>}
                  {pkg.deliveryDays != null && (
                    <p className="text-xs text-ink-300 mt-1.5">
                      {t('creatorProfile.deliveryDays', { days: pkg.deliveryDays })}
                    </p>
                  )}
                </div>
                <p className="text-base font-extrabold text-accent-600 shrink-0">
                  {pkg.price.toLocaleString()} {pkg.currency}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {portfolio.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">{t('portfolio.title')}</h2>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {portfolio.map((item) =>
              isVideo(item.mediaUrl) ? (
                <video key={item.id} src={item.mediaUrl} className="w-full aspect-square object-cover rounded-xl" controls />
              ) : (
                <img
                  key={item.id}
                  src={item.mediaUrl}
                  alt={item.caption ?? ''}
                  className="w-full aspect-square object-cover rounded-xl"
                />
              ),
            )}
          </div>
        </>
      )}

      <ContactButton />
    </div>
  );
}
