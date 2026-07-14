import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Paperclip, CheckCircle2, ChevronRight, ClipboardList } from 'lucide-react';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { DisputeForm } from '../components/DisputeForm';
import { ConversionsPanel } from '../components/ConversionsPanel';
import { RatingForm } from '../components/RatingForm';
import type { ApplicationDto, EscrowDto } from '@influencex/shared';
import { ApplicationStatus, CollaborationModel, EscrowStatus } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { Input, Textarea } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

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
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
    <div className="p-4 pb-24">
      <PageHeader title={t('nav.applications')} />

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && applications.length === 0 && (
        <EmptyState icon={<ClipboardList size={24} />} title={t('home.empty')} />
      )}

      {applications.map((app) => (
        <Card key={app.id} className="mb-3">
          <div className="flex justify-between items-center gap-2">
            <span className="font-semibold text-ink-900 text-[15px]">{app.campaign?.title ?? app.campaignId}</span>
            <StatusBadge status={app.status} />
          </div>
          {app.escrow && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-ink-400">Escrow</span>
              <span className="font-medium text-ink-800">{t(`escrow.${app.escrow.status.toLowerCase()}`)}</span>
            </div>
          )}

          {/* Kontent topshirish - PRD workflow 8-bosqich: faqat escrow HELD bo'lganda */}
          {app.escrow?.status === EscrowStatus.HELD && !app.contentSubmittedAt && (
            <div className="mt-3">
              {submittingContentFor === app.id ? (
                <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
                  <div className="mb-2">
                    <Input
                      placeholder={t('applications.contentUrlPlaceholder') as string}
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                    />
                  </div>
                  <input ref={contentFileInputRef} type="file" className="hidden" onChange={onContentFileSelected} />
                  <button
                    onClick={() => contentFileInputRef.current?.click()}
                    disabled={uploadingContent}
                    className="tap-scale text-xs font-medium text-accent-600 mb-2 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Paperclip size={13} />
                    {uploadingContent ? t('common.loading') : t('applications.uploadInstead')}
                  </button>
                  <div className="mb-2">
                    <Textarea
                      rows={2}
                      placeholder={t('applications.contentNotePlaceholder') as string}
                      value={contentNote}
                      onChange={(e) => setContentNote(e.target.value)}
                    />
                  </div>
                  {contentError && <p className="text-danger-text text-xs mb-2">{contentError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" full loading={savingContent} onClick={() => submitContent(app.id)}>
                      {t('applications.sendContent')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setSubmittingContentFor(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" full onClick={() => setSubmittingContentFor(app.id)}>
                  {t('applications.submitContent')}
                </Button>
              )}
            </div>
          )}

          {app.contentSubmittedAt && (
            <div className="mt-2 text-xs text-ink-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-success-dot" />
              {t('applications.contentSubmittedOn')} {new Date(app.contentSubmittedAt).toLocaleDateString()}
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

          <div className="flex gap-4 mt-3 pt-3 border-t border-ink-100 items-center">
            <Link
              to={`/campaigns/${app.campaignId}`}
              className="text-accent-600 text-sm font-medium inline-flex items-center gap-0.5"
            >
              Kampaniyani ko'rish
              <ChevronRight size={14} />
            </Link>
            {app.chatThread && (
              <Link
                to={`/chat/${app.chatThread.id}`}
                className="text-accent-600 text-sm font-medium inline-flex items-center gap-0.5"
              >
                {t('nav.chat')}
                <ChevronRight size={14} />
              </Link>
            )}
            {app.escrow && [EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING].includes(app.escrow.status) && (
              <button
                onClick={() => setDisputeForEscrowId(disputeForEscrowId === app.escrow!.id ? null : app.escrow!.id)}
                className="tap-scale text-danger-text text-sm font-medium ml-auto"
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
        </Card>
      ))}
    </div>
  );
}
