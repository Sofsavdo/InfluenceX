import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { DisputeForm } from '../components/DisputeForm';
import { ConversionsPanel } from '../components/ConversionsPanel';
import { RatingForm } from '../components/RatingForm';
import type { ApplicationDto, CreatorProfileDto, CampaignDto, EscrowDto } from '@influencex/shared';
import { ApplicationStatus, CollaborationModel, EscrowStatus, PaymentProvider } from '@influencex/shared';

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
export default function CampaignApplicants() {
  const { id } = useParams();
  const { t } = useTranslation();
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
      load();
    } catch (e) {
      setError((e as Error).message);
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
    } finally {
      setActingId(null);
    }
  }

  async function release(escrowId: string) {
    setActingId(escrowId);
    setError(null);
    try {
      await apiClient.post(`/escrow/${escrowId}/release`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function refund(escrowId: string) {
    if (!window.confirm(t('applicants.refundConfirm') as string)) return;
    setActingId(escrowId);
    setError(null);
    try {
      await apiClient.post(`/escrow/${escrowId}/refund`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  const appliedCreatorIds = new Set(applications.map((a) => a.creator.id));

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-1">{t('applicants.title')}</h1>
      <Link to={`/campaigns/${id}`} className="text-tg-link text-sm">
        ← {t('applicants.backToCampaign')}
      </Link>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      {loading && <p className="text-tg-hint mt-4">{t('common.loading')}</p>}
      {!loading && applications.length === 0 && (
        <p className="text-tg-hint mt-4">{t('applicants.empty')}</p>
      )}

      <div className="mt-4 space-y-3">
        {applications.map((app) => {
          const rec = pricing[app.creator.id];
          const escrow = app.escrow;
          return (
            <div key={app.id} className="rounded-xl border border-tg-secondaryBg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{app.creator.name}</p>
                  <p className="text-xs text-tg-hint">
                    {app.creator.followers.toLocaleString()} {t('applicants.followers')} ·{' '}
                    {t('applicants.rating')}: {app.creator.rating.toFixed(1)} · {app.creator.tier}
                  </p>
                </div>
                <span className="text-xs rounded-full bg-tg-secondaryBg px-2 py-1 shrink-0">
                  {t(`applicants.status.${app.status.toLowerCase()}`)}
                </span>
              </div>

              {app.message && <p className="text-sm mt-2">{app.message}</p>}
              {app.proposedPrice != null && (
                <p className="text-sm mt-1 text-tg-hint">
                  {t('applicants.proposedPrice')}: <span className="font-medium">{app.proposedPrice.toLocaleString()}</span>
                </p>
              )}
              {rec && (
                <p className="text-xs mt-1 text-tg-hint">
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
                      className="w-14 h-14 rounded-lg object-cover border border-tg-secondaryBg"
                    />
                  ))}
                </div>
              )}

              {app.status === ApplicationStatus.PENDING && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => act(app.id, ApplicationStatus.ACCEPTED)}
                    disabled={actingId === app.id}
                    className="flex-1 rounded-lg bg-tg-button text-tg-buttonText py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {t('applicants.accept')}
                  </button>
                  <button
                    onClick={() => act(app.id, ApplicationStatus.REJECTED)}
                    disabled={actingId === app.id}
                    className="flex-1 rounded-lg border border-tg-secondaryBg py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {t('applicants.reject')}
                  </button>
                </div>
              )}

              {/* To'lov oqimi - faqat ACCEPTED bo'lganda escrow mavjud bo'ladi */}
              {escrow && (
                <div className="mt-3 rounded-lg bg-tg-secondaryBg/40 p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-tg-hint">Escrow</span>
                    <span className="font-medium">{t(`escrow.${escrow.status.toLowerCase()}`)}</span>
                  </div>

                  {escrow.status === EscrowStatus.AWAITING_DEPOSIT && (
                    <>
                      <button
                        onClick={() => initiateDeposit(escrow.id)}
                        disabled={actingId === escrow.id}
                        className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {t('applicants.startPayment')}
                      </button>
                      {depositCheckoutUrls[escrow.id] && (
                        <a
                          href={depositCheckoutUrls[escrow.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center text-tg-link text-xs mt-2"
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
                          <p className="text-xs text-tg-hint mb-2">
                            ✓ {t('applications.contentSubmittedOn')} {new Date(app.contentSubmittedAt).toLocaleDateString()}
                          </p>
                          {app.contentUrls?.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-tg-link text-xs truncate mb-2"
                            >
                              {url}
                            </a>
                          ))}
                          <button
                            onClick={() => release(escrow.id)}
                            disabled={actingId === escrow.id}
                            className="w-full rounded-lg bg-green-600 text-white py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            {t('applicants.approveAndRelease')}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-tg-hint">{t('applicants.waitingForContent')}</p>
                      )}
                    </>
                  )}

                  {[EscrowStatus.AWAITING_DEPOSIT, EscrowStatus.HELD].includes(escrow.status) && (
                    <button
                      onClick={() => refund(escrow.id)}
                      disabled={actingId === escrow.id}
                      className="w-full rounded-lg border border-tg-secondaryBg py-2 text-sm mt-2 disabled:opacity-50"
                    >
                      {t('applicants.refund')}
                    </button>
                  )}

                  {[EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING].includes(escrow.status) && (
                    <button
                      onClick={() => setDisputeForEscrowId(disputeForEscrowId === escrow.id ? null : escrow.id)}
                      className="w-full text-red-600 text-xs mt-2"
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
            </div>
          );
        })}
      </div>

      {!loading && recommended.filter((m) => !appliedCreatorIds.has(m.creator.id)).length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('applicants.recommendedTitle')}</h2>
          <div className="space-y-2">
            {recommended
              .filter((m) => !appliedCreatorIds.has(m.creator.id))
              .map((m) => (
                <div
                  key={m.creator.id}
                  className="rounded-xl border border-tg-secondaryBg p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-sm">{m.creator.name}</p>
                    <p className="text-xs text-tg-hint">
                      {m.creator.followers.toLocaleString()} {t('applicants.followers')} · {m.creator.tier}
                      {m.creator.country ? ` · ${m.creator.country}` : ''}
                    </p>
                  </div>
                  <span className="text-xs rounded-full bg-tg-button text-tg-buttonText px-2 py-1 shrink-0">
                    {m.score}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
