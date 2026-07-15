import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Sparkles, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { DisputeForm } from '../components/DisputeForm';
import { ConversionsPanel } from '../components/ConversionsPanel';
import { RatingForm } from '../components/RatingForm';
import type { ApplicationDto, CreatorProfileDto, CampaignDto, EscrowDto } from '@influencex/shared';
import { ApplicationStatus, CollaborationModel, EscrowStatus, PaymentProvider } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useTelegramBackButton } from '../lib/telegramUI';

type ApplicationWithCreator = ApplicationDto & { creator: CreatorProfileDto; escrow?: EscrowDto | null };

interface PricingRecommendation {
  currency: 'UZS';
  min: number;
  recommended: number;
  max: number;
}

interface CreatorMatch {
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    followers: number;
    tier: string;
    country: string | null;
    creatorScore: number;
    // 2026-07-15 (raqobatchi tahlili - Collabstr): tavsiya etilgan kreator kartasi
    // avval FAQAT ma'lumot edi - hech qanday harakat tugmasi yo'q edi (foydali mos kelish
    // topilsa ham, biznes hech narsa qila olmasdi). Endi Telegram orqali bog'lanish mumkin.
    socialLinks?: Record<string, string> | null;
  };
  score: number;
}

interface DepositIntentResult {
  checkoutUrl: string;
  providerReference: string;
}

// PRD v2 §4.3 / Business Dashboard "Applications": biznes o'z kampaniyasiga kelgan
// zayavkalarni ko'rib chiqadi, qabul/rad qiladi, TO'LOVNI BOSHLAYDI, ISHNI TASDIQLAYDI
// (2026-07-11 - avval bu to'liq to'lov oqimi UI'da umuman yo'q edi, faqat backend API bor edi).
// AI Pricing Engine va AI Creator Matching ham shu ekranga ulangan.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function CampaignApplicants() {
  const { id } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [applications, setApplications] = useState<ApplicationWithCreator[]>([]);
  const [pricing, setPricing] = useState<Record<string, PricingRecommendation>>({});
  const [recommended, setRecommended] = useState<CreatorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositCheckoutUrls, setDepositCheckoutUrls] = useState<Record<string, string>>({});
  const [disputeForEscrowId, setDisputeForEscrowId] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Record<string, { mediaUrl: string }[]>>({});
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  useTelegramBackButton();

  function load() {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiClient.get<CampaignDto>(`/campaigns/${id}`),
      apiClient.get<ApplicationWithCreator[]>(`/applications/campaign/${id}`),
      apiClient.get<CreatorMatch[]>(`/campaigns/${id}/recommended-creators?limit=10`).catch(() => []),
    ])
      .then(([campaignData, apps, matches]) => {
        setCampaign(campaignData);
        setApplications(apps);
        setRecommended(matches);

        // Har bir zayavkachi uchun AI narx tavsiyasini parallel yuklaymiz -
        // biznes taklif qilingan narxni bozor tavsiyasi bilan solishtira oladi.
        Promise.all(
          apps.map((app) =>
            apiClient
              .get<PricingRecommendation>(
                `/pricing/recommend/${app.creator.id}?contentType=${campaignData.contentType}&collaborationModel=${campaignData.collaborationModel}`,
              )
              .then((rec) => [app.creator.id, rec] as const)
              .catch(() => null),
          ),
        ).then((results) => {
          const map: Record<string, PricingRecommendation> = {};
          for (const r of results) {
            if (r) map[r[0]] = r[1];
          }
          setPricing(map);
        });

        // Zayavkachining portfolio namunalari - biznes ishni ko'rib chiqishdan oldin baholaydi.
        Promise.all(
          apps.map((app) =>
            apiClient
              .get<{ mediaUrl: string }[]>(`/portfolio/creator/${app.creator.id}`)
              .then((items) => [app.creator.id, items.slice(0, 3)] as const)
              .catch(() => null),
          ),
        ).then((results) => {
          const map: Record<string, { mediaUrl: string }[]> = {};
          for (const r of results) {
            if (r) map[r[0]] = r[1];
          }
          setPortfolios(map);
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function act(applicationId: string, status: ApplicationStatus) {
    setActingId(applicationId);
    setError(null);
    try {
      await apiClient.patch(`/applications/${applicationId}/status`, { status });
      toast.success(t(`applicants.status.${status.toLowerCase()}`) as string);
      load();
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  // Hozircha faqat Click haqiqiy hamkor (README/PRODUCTION_READINESS_REPORT.md'da qayd
  // etilgan) - shuning uchun provayder tanlovi standart CLICK, Payme/Uzum ulanganda
  // shu yerga tanlov qo'shiladi.
  async function initiateDeposit(escrowId: string) {
    setActingId(escrowId);
    setError(null);
    try {
      const result = await apiClient.post<DepositIntentResult>(`/escrow/${escrowId}/deposit-intent`, {
        provider: PaymentProvider.CLICK,
      });
      setDepositCheckoutUrls((prev) => ({ ...prev, [escrowId]: result.checkoutUrl }));
      window.open(result.checkoutUrl, '_blank');
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function release(escrowId: string) {
    setActingId(escrowId);
    setError(null);
    try {
      await apiClient.post(`/escrow/${escrowId}/release`);
      toast.success(t('applicants.approveAndRelease') as string);
      load();
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function refund(escrowId: string) {
    setActingId(escrowId);
    setError(null);
    try {
      await apiClient.post(`/escrow/${escrowId}/refund`);
      toast.success(t('applicants.refund') as string);
      load();
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setActingId(null);
      setConfirmTarget(null);
    }
  }

  const appliedCreatorIds = new Set(applications.map((a) => a.creator.id));

  return (
    <div className="p-4 pb-24">
      <PageHeader back title={t('applicants.title')} />

      {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && applications.length === 0 && (
        <EmptyState icon={<Users size={24} />} title={t('applicants.empty')} />
      )}

      <div className="space-y-3">
        {applications.map((app) => {
          const rec = pricing[app.creator.id];
          const escrow = app.escrow;
          return (
            <Card key={app.id}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900 text-[15px]">{app.creator.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {app.creator.followers.toLocaleString()} {t('applicants.followers')} ·{' '}
                    {t('applicants.rating')}: {app.creator.rating.toFixed(1)} · {app.creator.tier}
                  </p>
                </div>
                <Badge tone="neutral" className="shrink-0">
                  {t(`applicants.status.${app.status.toLowerCase()}`)}
                </Badge>
              </div>

              {app.message && <p className="text-sm text-ink-700 mt-2 break-words">{app.message}</p>}
              {app.proposedPrice != null && (
                <p className="text-sm mt-1 text-ink-400">
                  {t('applicants.proposedPrice')}:{' '}
                  <span className="font-medium text-ink-800">{app.proposedPrice.toLocaleString()}</span>
                </p>
              )}
              {rec && (
                <p className="text-xs mt-1 text-ink-400">
                  {t('applicants.aiPrice')}: {rec.min.toLocaleString()} - {rec.max.toLocaleString()} {rec.currency}
                </p>
              )}

              {portfolios[app.creator.id] && portfolios[app.creator.id].length > 0 && (
                <div className="flex gap-2 mt-2">
                  {portfolios[app.creator.id].map((p, i) => (
                    <img
                      key={i}
                      src={p.mediaUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-ink-100"
                    />
                  ))}
                </div>
              )}

              {app.status === ApplicationStatus.PENDING && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" full loading={actingId === app.id} onClick={() => act(app.id, ApplicationStatus.ACCEPTED)}>
                    {t('applicants.accept')}
                  </Button>
                  <Button
                    size="sm"
                    full
                    variant="secondary"
                    disabled={actingId === app.id}
                    onClick={() => act(app.id, ApplicationStatus.REJECTED)}
                  >
                    {t('applicants.reject')}
                  </Button>
                </div>
              )}

              {/* To'lov oqimi - faqat ACCEPTED bo'lganda escrow mavjud bo'ladi */}
              {escrow && (
                <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-ink-400">Escrow</span>
                    <span className="font-medium text-ink-800">{t(`escrow.${escrow.status.toLowerCase()}`)}</span>
                  </div>

                  {escrow.status === EscrowStatus.AWAITING_DEPOSIT && (
                    <>
                      <Button size="sm" full loading={actingId === escrow.id} onClick={() => initiateDeposit(escrow.id)}>
                        {t('applicants.startPayment')}
                      </Button>
                      {depositCheckoutUrls[escrow.id] && (
                        <a
                          href={depositCheckoutUrls[escrow.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center text-accent-600 text-xs mt-2"
                        >
                          {t('applicants.openCheckoutAgain')}
                        </a>
                      )}
                    </>
                  )}

                  {escrow.status === EscrowStatus.HELD && (
                    <>
                      {app.contentSubmittedAt ? (
                        <>
                          <p className="text-xs text-ink-400 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-success-dot" />
                            {t('applications.contentSubmittedOn')} {new Date(app.contentSubmittedAt).toLocaleDateString()}
                          </p>
                          {app.contentUrls?.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-accent-600 text-xs truncate mb-2"
                            >
                              {url}
                            </a>
                          ))}
                          <Button size="sm" full loading={actingId === escrow.id} onClick={() => release(escrow.id)}>
                            {t('applicants.approveAndRelease')}
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-ink-400">{t('applicants.waitingForContent')}</p>
                      )}
                    </>
                  )}

                  {[EscrowStatus.AWAITING_DEPOSIT, EscrowStatus.HELD].includes(escrow.status) && (
                    <Button
                      size="sm"
                      full
                      variant="secondary"
                      className="mt-2"
                      loading={actingId === escrow.id}
                      onClick={() => setConfirmTarget(escrow.id)}
                    >
                      {t('applicants.refund')}
                    </Button>
                  )}

                  {[EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING].includes(escrow.status) && (
                    <button
                      onClick={() => setDisputeForEscrowId(disputeForEscrowId === escrow.id ? null : escrow.id)}
                      className="tap-scale w-full text-danger-text text-xs mt-2 font-medium"
                    >
                      {t('dispute.raise')}
                    </button>
                  )}

                  {disputeForEscrowId === escrow.id && (
                    <DisputeForm
                      escrowId={escrow.id}
                      onCancel={() => setDisputeForEscrowId(null)}
                      onDone={() => {
                        setDisputeForEscrowId(null);
                        load();
                      }}
                    />
                  )}

                  {/* PRD "Reputation System" - hamkorlik yakunlangach (RELEASED) biznes
                      kreatorni baholaydi (2026-07-12 qo'shildi, avval bu UI umuman yo'q edi). */}
                  {escrow.status === EscrowStatus.RELEASED && campaign && (
                    <RatingForm campaignId={campaign.id} targetUserId={app.creator.userId} onDone={() => {}} />
                  )}
                </div>
              )}

              {/* PRD "CPA"/"Hybrid": zayavka qabul qilingach, biznes haqiqiy konversiyalarni qayd etadi */}
              {app.status === ApplicationStatus.ACCEPTED &&
                campaign &&
                (campaign.collaborationModel === CollaborationModel.CPA ||
                  campaign.collaborationModel === CollaborationModel.HYBRID) && (
                  <ConversionsPanel applicationId={app.id} currency={campaign.currency} isBusiness />
                )}
            </Card>
          );
        })}
      </div>

      {!loading && recommended.filter((m) => !appliedCreatorIds.has(m.creator.id)).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2 flex items-center gap-1.5">
            <Sparkles size={13} className="text-accent-500" />
            {t('applicants.recommendedTitle')}
          </h2>
          <div className="space-y-2">
            {recommended
              .filter((m) => !appliedCreatorIds.has(m.creator.id))
              .map((m) => (
                <Card key={m.creator.id}>
                  <div className="flex justify-between items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm text-ink-900">{m.creator.name}</p>
                      <p className="text-xs text-ink-400 mt-0.5 truncate">
                        {m.creator.followers.toLocaleString()} {t('applicants.followers')} · {m.creator.tier}
                        {m.creator.country ? ` · ${m.creator.country}` : ''}
                      </p>
                    </div>
                    <Badge tone="info" className="shrink-0">
                      {m.score}%
                    </Badge>
                  </div>
                  {m.creator.socialLinks?.TELEGRAM ? (
                    <a
                      href={`https://t.me/${m.creator.socialLinks.TELEGRAM.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tap-scale mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-accent-50 text-accent-700 text-xs font-semibold py-2"
                    >
                      {t('applicants.contactTelegram')}
                    </a>
                  ) : (
                    <p className="mt-2.5 text-center text-xs text-ink-300">{t('applicants.noContactInfo')}</p>
                  )}
                </Card>
              ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && refund(confirmTarget)}
        title={t('applicants.refund') as string}
        description={t('applicants.refundConfirm') as string}
        confirmLabel={t('applicants.refund') as string}
        cancelLabel={t('common.cancel') as string}
        tone="danger"
        loading={actingId === confirmTarget}
      />
    </div>
  );
}
