import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Label, Input, Textarea, Select, FormSection } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

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
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
  // 2026-07-14 (UX audit): avval majburiy maydonlar bo'sh bo'lganda tugma shunchaki
  // "kulrang" (disabled) bo'lardi - foydalanuvchi NIMA yetishmayotganini bilmasdi.
  // Endi tugma doim bosiladigan, lekin bo'sh majburiy maydon bo'lsa xato matni +
  // qizil ramka (invalid) ko'rsatiladi (Profile.tsx'dagi bilan bir xil naqsh).
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!title.trim() || !description.trim() || !budget || !deadline) {
      setFormError(t('common.error') as string);
      return;
    }
    setFormError(null);
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
      <PageHeader back title={t('createCampaign.title')} />

      <Card className="mb-4">
        <h3 className="font-semibold text-ink-900 mb-1 flex items-center gap-1.5">
          <Sparkles size={16} className="text-accent-500" />
          {t('createCampaign.aiTitle')}
        </h3>
        <p className="text-xs text-ink-400 mb-3">{t('createCampaign.aiHint')}</p>
        <div className="mb-2">
          <Textarea
            rows={3}
            placeholder={t('createCampaign.productPlaceholder') as string}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
          />
        </div>
        {aiError && <p className="text-xs text-danger-text mb-2">{aiError}</p>}
        <Button
          variant="secondary"
          full
          icon={<Sparkles size={16} />}
          loading={generating}
          disabled={productDescription.trim().length < 10}
          onClick={generateBrief}
        >
          {t('createCampaign.generateBrief')}
        </Button>
      </Card>

      <Card>
        <FormSection title="Asosiy ma'lumotlar">
          <div>
            <Label>{t('createCampaign.titleField')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              invalid={!title.trim() && Boolean(formError)}
            />
          </div>
          <div>
            <Label>{t('createCampaign.descriptionField')}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              invalid={!description.trim() && Boolean(formError)}
            />
          </div>
          <div>
            <Label>{t('createCampaign.objectiveField')}</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
        </FormSection>

        <FormSection title="Kontent va hamkorlik">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kontent turi</Label>
              <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                {['REEL', 'STORY', 'POST', 'UGC_VIDEO', 'PRODUCT_REVIEW'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Hamkorlik modeli</Label>
              <Select value={collaborationModel} onChange={(e) => setCollaborationModel(e.target.value)}>
                {['FIXED', 'BARTER', 'CPA', 'HYBRID'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {isBarterModel && (
            <div className="rounded-xl border border-dashed border-ink-200 p-3">
              <p className="text-xs text-ink-500">{t('createCampaign.barterHint')}</p>
            </div>
          )}

          {isPureCpaModel && (
            <div className="rounded-xl border border-warning-dot/30 bg-warning-bg p-3">
              <p className="text-xs text-warning-text">{t('createCampaign.pureCpaWarning')}</p>
              <button
                type="button"
                onClick={() => setCollaborationModel('HYBRID')}
                className="tap-scale mt-2 text-xs font-semibold text-warning-text underline"
              >
                {t('createCampaign.switchToHybrid')}
              </button>
            </div>
          )}
        </FormSection>

        {isCpaModel && (
          <FormSection title="CPA sozlamalari" description={t('createCampaign.cpaHint') as string}>
            <div>
              <Label>{t('createCampaign.cpaRateField')}</Label>
              <Input
                inputMode="numeric"
                type="number"
                value={cpaRate}
                onChange={(e) => setCpaRate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('createCampaign.landingUrlField')}</Label>
              <Input type="url" value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} />
            </div>
          </FormSection>
        )}

        <FormSection title="Byudjet va muddat">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('home.budget')}</Label>
              <Input
                inputMode="numeric"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                invalid={!budget && Boolean(formError)}
              />
            </div>
            <div>
              <Label>{t('createCampaign.creatorsCount')}</Label>
              <Input
                inputMode="numeric"
                type="number"
                min={1}
                value={creatorsCount}
                onChange={(e) => setCreatorsCount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t('home.deadline')}</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              invalid={!deadline && Boolean(formError)}
            />
          </div>
        </FormSection>

        {formError && <p className="text-danger-text text-xs mb-3">{formError}</p>}

        <Button full size="lg" loading={submitting} disabled={submitting} onClick={submitCampaign}>
          {t('createCampaign.submit')}
        </Button>
      </Card>
    </div>
  );
}
