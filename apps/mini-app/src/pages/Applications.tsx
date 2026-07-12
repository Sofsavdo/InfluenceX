import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { DisputeForm } from '../components/DisputeForm';
import { ConversionsPanel } from '../components/ConversionsPanel';
import { RatingForm } from '../components/RatingForm';
import type { ApplicationDto, EscrowDto } from '@influencex/shared';
import { ApplicationStatus, CollaborationModel, EscrowStatus } from '@influencex/shared';

type ApplicationWithEscrow = ApplicationDto & {
  escrow?: EscrowDto | null;
  campaign?: {
    title: string;
    collaborationModel?: CollaborationModel;
    currency?: string;
    business?: { userId: string; companyName: string };
  };
  chatThread?: { id: string } | null;
};

// PRD v2 §Creator Dashboard: "Applications" sahifasi — kreatorning barcha zayavkalari + escrow
// holati. 2026-07-11: to'liq to'lov oqimi UI'ga ulandi - kontent topshirish (PRD workflow
// 8-bosqich) va nizo ochish shu yerda.
export default function Applications() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<ApplicationWithEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingContentFor, setSubmittingContentFor] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState('');
  const [contentNote, setContentNote] = useState('');
  const [uploadingContent, setUploadingContent] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [disputeForEscrowId, setDisputeForEscrowId] = useState<string | null>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<ApplicationWithEscrow[]>('/applications/mine')
      .then(setApplications)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onContentFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingContent(true);
    setContentError(null);
    try {
      const url = await uploadFile(file, 'content-submission');
      setContentUrl(url);
    } catch (err) {
      setContentError((err as Error).message);
    } finally {
      setUploadingContent(false);
    }
  }

  async function submitContent(applicationId: string) {
    if (!contentUrl.trim()) {
      setContentError(t('applications.contentUrlRequired'));
      return;
    }
    setSavingContent(true);
    setContentError(null);
    try {
      await apiClient.post(`/applications/${applicationId}/submit-content`, {
        contentUrls: [contentUrl.trim()],
        note: contentNote || undefined,
      });
      setSubmittingContentFor(null);
      setContentUrl('');
      setContentNote('');
      load();
    } catch (err) {
      setContentError((err as Error).message);
    } finally {
      setSavingContent(false);
    }
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">{t('nav.applications')}</h1>
      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && applications.length === 0 && <p className="text-tg-hint">{t('home.empty')}</p>}
      {applications.map((app) => (
        <div key={app.id} className="rounded-xl border border-tg-secondaryBg p-4 mb-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{app.campaign?.title ?? app.campaignId}</span>
            <span className="text-xs rounded-full bg-tg-secondaryBg px-2 py-1">{app.status}</span>
          </div>
          {app.escrow && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-tg-hint">Escrow</span>
              <span className="font-medium">{t(`escrow.${app.escrow.status.toLowerCase()}`)}</span>
            </div>
          )}

          {/* Kontent topshirish - PRD workflow 8-bosqich: faqat escrow HELD bo'lganda */}
          {app.escrow?.status === EscrowStatus.HELD && !app.contentSubmittedAt && (
            <div className="mt-3">
              {submittingContentFor === app.id ? (
                <div className="rounded-lg border border-tg-secondaryBg p-3">
                  <input
                    className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm mb-2"
                    placeholder={t('applications.contentUrlPlaceholder') as string}
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                  />
                  <input ref={contentFileInputRef} type="file" className="hidden" onChange={onContentFileSelected} />
                  <button
                    onClick={() => contentFileInputRef.current?.click()}
                    disabled={uploadingContent}
                    className="text-xs text-tg-link mb-2 disabled:opacity-50"
                  >
                    {uploadingContent ? t('common.loading') : `📎 ${t('applications.uploadInstead')}`}
                  </button>
                  <textarea
                    className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm mb-2"
                    rows={2}
                    placeholder={t('applications.contentNotePlaceholder') as string}
                    value={contentNote}
                    onChange={(e) => setContentNote(e.target.value)}
                  />
                  {contentError && <p className="text-red-600 text-xs mb-2">{contentError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitContent(app.id)}
                      disabled={savingContent}
                      className="flex-1 rounded-lg bg-tg-button text-tg-buttonText py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {t('applications.sendContent')}
                    </button>
                    <button
                      onClick={() => setSubmittingContentFor(null)}
                      className="rounded-lg border border-tg-secondaryBg px-4 py-2 text-sm"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSubmittingContentFor(app.id)}
                  className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2 text-sm font-semibold"
                >
                  {t('applications.submitContent')}
                </button>
              )}
            </div>
          )}

          {app.contentSubmittedAt && (
            <div className="mt-2 text-xs text-tg-hint">
              ✓ {t('applications.contentSubmittedOn')} {new Date(app.contentSubmittedAt).toLocaleDateString()}
            </div>
          )}

          {/* PRD "CPA"/"Hybrid": kreator o'z konversiyalari va kutilayotgan to'lovlarini kuzatadi */}
          {app.status === ApplicationStatus.ACCEPTED &&
            app.campaign?.collaborationModel &&
            (app.campaign.collaborationModel === CollaborationModel.CPA ||
              app.campaign.collaborationModel === CollaborationModel.HYBRID) && (
              <ConversionsPanel
                applicationId={app.id}
                currency={app.campaign.currency ?? 'UZS'}
                isBusiness={false}
              />
            )}

          <div className="flex gap-3 mt-2 items-center">
            <Link to={`/campaigns/${app.campaignId}`} className="text-tg-link text-sm">
              Kampaniyani ko'rish →
            </Link>
            {app.chatThread && (
              <Link to={`/chat/${app.chatThread.id}`} className="text-tg-link text-sm">
                {t('nav.chat')} →
              </Link>
            )}
            {app.escrow && [EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING].includes(app.escrow.status) && (
              <button
                onClick={() => setDisputeForEscrowId(disputeForEscrowId === app.escrow!.id ? null : app.escrow!.id)}
                className="text-red-600 text-sm ml-auto"
              >
                {t('dispute.raise')}
              </button>
            )}
          </div>

          {app.escrow && disputeForEscrowId === app.escrow.id && (
            <DisputeForm
              escrowId={app.escrow.id}
              onCancel={() => setDisputeForEscrowId(null)}
              onDone={() => {
                setDisputeForEscrowId(null);
                load();
              }}
            />
          )}

          {/* PRD "Reputation System" - hamkorlik yakunlangach (RELEASED) kreator biznesni
              baholaydi (2026-07-12 qo'shildi, avval bu UI umuman yo'q edi). */}
          {app.escrow?.status === EscrowStatus.RELEASED && app.campaign?.business && (
            <RatingForm
              campaignId={app.campaignId}
              targetUserId={app.campaign.business.userId}
              onDone={() => {}}
            />
          )}
        </div>
      ))}
    </div>
  );
}
