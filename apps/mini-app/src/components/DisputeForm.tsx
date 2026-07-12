import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';

interface DisputeFormProps {
  escrowId: string;
  onDone: () => void;
  onCancel: () => void;
}

// PRD v2 §Escrow: "Nizo holatida moderator dalillarni ko'rib chiqadi" - shu forma orqali
// creator/business sabab + ixtiyoriy dalil (screenshot/video) bilan nizo ochadi.
// Ikkalasi ham (Applications.tsx va CampaignApplicants.tsx) shu komponentdan foydalanadi.
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 mt-2">
      <p className="text-sm font-semibold text-red-700 mb-2">{t('dispute.title')}</p>
      <textarea
        className="w-full rounded-lg border border-tg-secondaryBg p-2 text-sm"
        rows={3}
        placeholder={t('dispute.reasonPlaceholder') as string}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <input ref={fileInputRef} type="file" className="hidden" onChange={addEvidence} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mt-2 text-xs text-tg-link disabled:opacity-50"
      >
        {uploading ? t('common.loading') : `📎 ${t('dispute.addEvidence')}`}
      </button>
      {evidenceUrls.length > 0 && (
        <p className="text-xs text-tg-hint mt-1">{evidenceUrls.length} {t('dispute.filesAttached')}</p>
      )}

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t('dispute.submit')}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-tg-secondaryBg px-4 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
