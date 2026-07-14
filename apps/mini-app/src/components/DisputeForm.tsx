import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { Textarea } from './ui/Field';
import { Button } from './ui/Button';

interface DisputeFormProps {
  escrowId: string;
  onDone: () => void;
  onCancel: () => void;
}

// PRD v2 §Escrow: "Nizo holatida moderator dalillarni ko'rib chiqadi" - shu forma orqali
// creator/business sabab + ixtiyoriy dalil (screenshot/video) bilan nizo ochadi.
// Ikkalasi ham (Applications.tsx va CampaignApplicants.tsx) shu komponentdan foydalanadi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export function DisputeForm({ escrowId, onDone, onCancel }: DisputeFormProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addEvidence(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'dispute-evidence');
      setEvidenceUrls((prev) => [...prev, url]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (reason.trim().length < 5) {
      setError(t('dispute.reasonTooShort'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/escrow/${escrowId}/dispute`, { reason, evidenceUrls });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-danger-dot/20 bg-danger-bg p-3 mt-3">
      <p className="text-sm font-semibold text-danger-text mb-2 flex items-center gap-1.5">
        <AlertTriangle size={15} />
        {t('dispute.title')}
      </p>
      <Textarea
        rows={3}
        placeholder={t('dispute.reasonPlaceholder') as string}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <input ref={fileInputRef} type="file" className="hidden" onChange={addEvidence} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="tap-scale mt-2 text-xs font-medium text-accent-600 disabled:opacity-50 inline-flex items-center gap-1"
      >
        <Paperclip size={13} />
        {uploading ? t('common.loading') : t('dispute.addEvidence')}
      </button>
      {evidenceUrls.length > 0 && (
        <p className="text-xs text-ink-400 mt-1">{evidenceUrls.length} {t('dispute.filesAttached')}</p>
      )}

      {error && <p className="text-danger-text text-xs mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <Button variant="danger" size="sm" full loading={submitting} onClick={submit}>
          {t('dispute.submit')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
