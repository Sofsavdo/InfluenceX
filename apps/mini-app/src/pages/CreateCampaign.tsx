import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';

interface BriefResult {
  title: string;
  description: string;
  objective: string;
  suggestedContentType: string;
  suggestedCollaborationModel: string;
  suggestedBudgetRangeUzs: { min: number; max: number };
  creatorRequirements: { minFollowers?: number; categories?: string[]; languages?: string[] };
}

// PRD (asl PRD "AI Brief Generator" + Business Dashboard "Create Campaign"):
// biznes mahsulotini tavsiflaydi -> AI brif yaratadi -> biznes tahrirlab kampaniya sifatida saqlaydi.
export default function CreateCampaign() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [productDescription, setProductDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [contentType, setContentType] = useState('REEL');
  const [collaborationModel, setCollaborationModel] = useState('FIXED');
  const [budget, setBudget] = useState('');
  const [creatorsCount, setCreatorsCount] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [cpaRate, setCpaRate] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCpaModel = collaborationModel === 'CPA' || collaborationModel === 'HYBRID';
  const isBarterModel = collaborationModel === 'BARTER';
  // 2026-07-12, CPA atributsiya strategiya suhbatidan keyin qo'shildi: sof CPA'da butun
  // to'lov konversiya sonini KIM aytishiga bog'liq (odatda biznesning o'zi) - agar biznes
  // mahsulotni tashqi platformada (masalan Uzum) sotib, webhook/Telegram bot orqali
  // avtomatik tasdiqlashni ulamasa, bu blogerga nisbatan adolatsiz bo'lishi mumkin (biznes
  // sonini kamaytirib ko'rsatishi mumkin). Shuning uchun sof CPA (HYBRID emas) tanlanganda
  // ogohlantirish ko'rsatiladi - Hybrid'ga o'tishni yoki webhook ulashni tavsiya qiladi.
  const isPureCpaModel = collaborationModel === 'CPA';

  async function generateBrief() {
    if (productDescription.trim().length < 10) return;
    setGenerating(true);
    setAiError(null);
    try {
      const brief = await apiClient.post<BriefResult>('/ai/brief', { productDescription });
      setTitle(brief.title);
      setDescription(brief.description);
      setObjective(brief.objective);
      setContentType(brief.suggestedContentType);
      setCollaborationModel(brief.suggestedCollaborationModel);
      if (brief.suggestedBudgetRangeUzs?.min) {
        setBudget(String(brief.suggestedBudgetRangeUzs.min));
      }
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function submitCampaign() {
    setSubmitting(true);
    try {
      await apiClient.post('/campaigns', {
        title,
        description,
        productOrService: productDescription,
        objective,
        contentType,
        collaborationModel,
        budget: Number(budget),
        creatorsCount: Number(creatorsCount),
        deadline: new Date(deadline).toISOString(),
        cpaRate: isCpaModel && cpaRate ? Number(cpaRate) : undefined,
        landingUrl: isCpaModel && landingUrl ? landingUrl : undefined,
      });
      // 2026-07-12 audit tuzatishi: yangi kampaniya har doim DRAFT holatida yaratiladi
      // (campaigns.service.ts#create) - ommaviy feed ("/") faqat PUBLISHED kampaniyalarni
      // ko'rsatadi, shuning uchun avval biznes kampaniyani yaratgach uni HECH QAYERDA
      // ko'rmasdi va "ishladimi yoki yo'qmi" bilmasdi. Endi "Mening kampaniyalarim"ga
      // yo'naltiradi - shu yerda e'lon qilish (Publish) tugmasi bor (MyCampaigns.tsx).
      navigate('/campaigns/mine');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4">{t('createCampaign.title')}</h1>

      <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
        <h3 className="font-semibold mb-1">{t('createCampaign.aiTitle')}</h3>
        <p className="text-xs text-tg-hint mb-3">{t('createCampaign.aiHint')}</p>
        <textarea
          className="w-full rounded-lg border border-tg-secondaryBg p-3 text-sm mb-2"
          rows={3}
          placeholder={t('createCampaign.productPlaceholder') as string}
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
        />
        {aiError && <p className="text-xs text-red-600 mb-2">{aiError}</p>}
        <button
          onClick={generateBrief}
          disabled={generating || productDescription.trim().length < 10}
          className="w-full rounded-lg border border-tg-button text-tg-link py-2 text-sm font-semibold disabled:opacity-50"
        >
          {generating ? t('common.loading') : t('createCampaign.generateBrief')}
        </button>
      </div>

      <div className="rounded-xl border border-tg-secondaryBg p-4 space-y-3">
        <input
          className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          placeholder={t('createCampaign.titleField') as string}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          rows={3}
          placeholder={t('createCampaign.descriptionField') as string}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          placeholder={t('createCampaign.objectiveField') as string}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            {['REEL', 'STORY', 'POST', 'UGC_VIDEO', 'PRODUCT_REVIEW'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            value={collaborationModel}
            onChange={(e) => setCollaborationModel(e.target.value)}
          >
            {['FIXED', 'BARTER', 'CPA', 'HYBRID'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {isBarterModel && (
          <div className="rounded-lg border border-dashed border-tg-secondaryBg p-3">
            <p className="text-xs text-tg-hint">{t('createCampaign.barterHint')}</p>
          </div>
        )}

        {isPureCpaModel && (
          <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3">
            <p className="text-xs text-yellow-800">{t('createCampaign.pureCpaWarning')}</p>
            <button
              type="button"
              onClick={() => setCollaborationModel('HYBRID')}
              className="mt-2 text-xs font-semibold text-yellow-900 underline"
            >
              {t('createCampaign.switchToHybrid')}
            </button>
          </div>
        )}

        {isCpaModel && (
          <div className="rounded-lg border border-dashed border-tg-secondaryBg p-3 space-y-2">
            <p className="text-xs text-tg-hint">{t('createCampaign.cpaHint')}</p>
            <input
              type="number"
              className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
              placeholder={t('createCampaign.cpaRateField') as string}
              value={cpaRate}
              onChange={(e) => setCpaRate(e.target.value)}
            />
            <input
              type="url"
              className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
              placeholder={t('createCampaign.landingUrlField') as string}
              value={landingUrl}
              onChange={(e) => setLandingUrl(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            placeholder={t('home.budget') as string}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            placeholder={t('createCampaign.creatorsCount') as string}
            value={creatorsCount}
            onChange={(e) => setCreatorsCount(e.target.value)}
          />
        </div>

        <input
          type="date"
          className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <button
          onClick={submitCampaign}
          disabled={submitting || !title || !description || !budget || !deadline}
          className="w-full rounded-lg bg-tg-button text-tg-buttonText py-3 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? t('common.loading') : t('createCampaign.submit')}
        </button>
      </div>
    </div>
  );
}
