import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Camera,
  Pencil,
  Images,
  Wallet,
  BarChart3,
  Sparkles,
  Star,
  Briefcase,
  ClipboardList,
  CreditCard,
  ShieldCheck,
  Globe,
  Plus,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { UserRole, PaymentProvider, SubscriptionPlan, SUBSCRIPTION_PLAN_LIMITS, Language } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/ui/StatCard';
import { Label, Input, Textarea, FormSection, StickyActionBar } from '../components/ui/Field';
import { LanguageSwitcher, LanguageMultiSelect } from '../components/ui/LanguageSwitcher';
import { Skeleton } from '../components/ui/Skeleton';

interface PricingRecommendation {
  currency: 'UZS';
  min: number;
  recommended: number;
  max: number;
  note: string;
}

interface MeResponse {
  id: string;
  role: UserRole;
  language: string;
  creatorProfile?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    country?: string | null;
    city?: string | null;
    languages?: Language[];
    categories?: string[];
    socialLinks?: Record<string, string>;
    followers: number;
    avgViews?: number;
    engagementRate?: number;
    rating: number;
    creatorScore: number;
    payoutProvider?: PaymentProvider | null;
    payoutAccount?: string | null;
    verificationStatus?: string;
    isFeatured?: boolean;
    featuredUntil?: string | null;
  } | null;
  businessProfile?: {
    companyName: string;
    logoUrl?: string | null;
    description?: string | null;
    industry?: string | null;
    website?: string | null;
    contactPerson?: string | null;
    businessScore: number;
    verificationStatus?: string;
    subscriptionPlan?: SubscriptionPlan;
  } | null;
}

const ALL_LANGUAGES = Object.values(Language);

const VERIFICATION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  UNVERIFIED: 'neutral',
};

// Toggle-chip - tillar/to'lov provayderi/obuna reja/interfeys tili kabi bir nechta
// variantdan bittasini tanlashda ishlatiladigan kichik yordamchi komponent
// (dizayn tizimi accent/ink tokenlariga mos).
function Chip({ active, children, onClick, disabled }: { active: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tap-scale px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
        active ? 'bg-accent-500 text-white border-accent-500' : 'border-ink-200 text-ink-600'
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="font-semibold text-ink-900 mb-1 flex items-center gap-1.5">
      {icon}
      {children}
    </h3>
  );
}

// PRD v2 §4.8: til tanlovi shu yerda; PRD v1 Creator/Business Dashboard "Settings"ga mos
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function Profile() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [payoutProvider, setPayoutProvider] = useState<PaymentProvider | ''>('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationFileInputRef = useRef<HTMLInputElement>(null);
  const [pricingRec, setPricingRec] = useState<PricingRecommendation | null>(null);
  const [promotingProfile, setPromotingProfile] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // PRD "Creator Profiles" (Name/Country/City/Languages/Categories/Social links/Followers/
  // Average views/Engagement rate) - 2026-07-12 qo'shildi. Avval bu maydonlarni tahrirlash
  // uchun UI umuman yo'q edi: onboarding kreator profilini BO'SH ism bilan yaratardi
  // (Onboarding.tsx: `{ name: '' }`) va Profile.tsx faqat avatar/to'lov rekvizitlarini
  // saqlashga ruxsat berardi - ismini, obunachilar sonini, mamlakatini hech qachon
  // kiritolmasdi. Bu real ishlatishda foydalanuvchi "ro'yxatdan o'tib qadamda to'xtab
  // qolishi"ga olib kelardi (backend DTO/endpoint to'liq tayyor edi, faqat frontend forma
  // yo'q edi).
  const [editingCreator, setEditingCreator] = useState(false);
  const [crName, setCrName] = useState('');
  const [crCountry, setCrCountry] = useState('');
  const [crCity, setCrCity] = useState('');
  const [crLanguages, setCrLanguages] = useState<Language[]>([]);
  const [crCategories, setCrCategories] = useState(''); // vergul bilan ajratilgan matn
  const [crInstagram, setCrInstagram] = useState('');
  const [crTiktok, setCrTiktok] = useState('');
  const [crYoutube, setCrYoutube] = useState('');
  const [crTelegram, setCrTelegram] = useState('');
  const [crFollowers, setCrFollowers] = useState('');
  const [crAvgViews, setCrAvgViews] = useState('');
  const [crEngagementRate, setCrEngagementRate] = useState('');
  const [savingCreatorInfo, setSavingCreatorInfo] = useState(false);
  const [creatorInfoError, setCreatorInfoError] = useState<string | null>(null);

  const [editingBusiness, setEditingBusiness] = useState(false);
  const [bizCompanyName, setBizCompanyName] = useState('');
  const [bizDescription, setBizDescription] = useState('');
  const [bizIndustry, setBizIndustry] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizContactPerson, setBizContactPerson] = useState('');
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [businessInfoError, setBusinessInfoError] = useState<string | null>(null);

  function load() {
    apiClient.get<MeResponse>('/users/me').then((data) => {
      setMe(data);
      setPayoutProvider(data.creatorProfile?.payoutProvider ?? '');
      setPayoutAccount(data.creatorProfile?.payoutAccount ?? '');

      if (data.creatorProfile) {
        setCrName(data.creatorProfile.name ?? '');
        setCrCountry(data.creatorProfile.country ?? '');
        setCrCity(data.creatorProfile.city ?? '');
        setCrLanguages(data.creatorProfile.languages ?? []);
        setCrCategories((data.creatorProfile.categories ?? []).join(', '));
        const links = data.creatorProfile.socialLinks ?? {};
        setCrInstagram(links.INSTAGRAM ?? '');
        setCrTiktok(links.TIKTOK ?? '');
        setCrYoutube(links.YOUTUBE ?? '');
        setCrTelegram(links.TELEGRAM ?? '');
        setCrFollowers(String(data.creatorProfile.followers ?? 0));
        setCrAvgViews(String(data.creatorProfile.avgViews ?? 0));
        setCrEngagementRate(String(data.creatorProfile.engagementRate ?? 0));
        // Ism hali kiritilmagan bo'lsa (onboarding'dan keyingi bo'sh holat) - forma
        // avtomatik ochiq holda ko'rsatiladi, foydalanuvchi "to'xtab qolmasin".
        if (!data.creatorProfile.name) setEditingCreator(true);
      }

      if (data.businessProfile) {
        setBizCompanyName(data.businessProfile.companyName ?? '');
        setBizDescription(data.businessProfile.description ?? '');
        setBizIndustry(data.businessProfile.industry ?? '');
        setBizWebsite(data.businessProfile.website ?? '');
        setBizContactPerson(data.businessProfile.contactPerson ?? '');
        if (!data.businessProfile.companyName) setEditingBusiness(true);
      }

      if (data.creatorProfile?.id) {
        apiClient
          .get<PricingRecommendation>(`/pricing/recommend/${data.creatorProfile.id}`)
          .then(setPricingRec)
          .catch(() => setPricingRec(null));
      }
    });
  }

  useEffect(load, []);

  function toggleLanguage(lang: Language) {
    setCrLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  }

  async function saveCreatorInfo() {
    if (!crName.trim()) {
      setCreatorInfoError(t('profile.nameRequired'));
      return;
    }
    setSavingCreatorInfo(true);
    setCreatorInfoError(null);
    try {
      const socialLinks: Record<string, string> = {};
      if (crInstagram.trim()) socialLinks.INSTAGRAM = crInstagram.trim();
      if (crTiktok.trim()) socialLinks.TIKTOK = crTiktok.trim();
      if (crYoutube.trim()) socialLinks.YOUTUBE = crYoutube.trim();
      if (crTelegram.trim()) socialLinks.TELEGRAM = crTelegram.trim();

      await apiClient.put('/users/me/creator-profile', {
        name: crName.trim(),
        country: crCountry.trim() || undefined,
        city: crCity.trim() || undefined,
        languages: crLanguages,
        categories: crCategories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        socialLinks,
        followers: crFollowers ? Number(crFollowers) : 0,
        avgViews: crAvgViews ? Number(crAvgViews) : 0,
        engagementRate: crEngagementRate ? Number(crEngagementRate) : 0,
        payoutProvider: payoutProvider || undefined,
        payoutAccount: payoutAccount || undefined,
      });
      setEditingCreator(false);
      load();
    } catch (err) {
      setCreatorInfoError((err as Error).message);
    } finally {
      setSavingCreatorInfo(false);
    }
  }

  async function saveBusinessInfo() {
    if (!bizCompanyName.trim()) {
      setBusinessInfoError(t('profile.companyNameRequired'));
      return;
    }
    setSavingBusinessInfo(true);
    setBusinessInfoError(null);
    try {
      await apiClient.put('/users/me/business-profile', {
        companyName: bizCompanyName.trim(),
        description: bizDescription.trim() || undefined,
        industry: bizIndustry.trim() || undefined,
        website: bizWebsite.trim() || undefined,
        contactPerson: bizContactPerson.trim() || undefined,
      });
      setEditingBusiness(false);
      load();
    } catch (err) {
      setBusinessInfoError((err as Error).message);
    } finally {
      setSavingBusinessInfo(false);
    }
  }

  // PRD v2 §4.5: InfluenceX kreatorga hamkorlik haqini shu rekvizitlar orqali to'laydi
  // (o'z pudratchisiga xarajat sifatida) - escrow "release" shu maydonlarsiz ishlamaydi.
  async function savePayout() {
    if (!me?.creatorProfile || !payoutProvider || !payoutAccount) return;
    setSavingPayout(true);
    try {
      await apiClient.put('/users/me/creator-profile', {
        name: me.creatorProfile.name,
        payoutProvider,
        payoutAccount,
      });
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 2000);
    } finally {
      setSavingPayout(false);
    }
  }

  // Rasm S3'ga to'g'ridan-to'g'ri yuklanadi (lib/upload.ts), so'ng qaytgan publicUrl
  // creatorProfile.avatarUrl / businessProfile.logoUrl sifatida saqlanadi.
  async function onPhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !me) return;

    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      if (me.creatorProfile) {
        const avatarUrl = await uploadFile(file, 'avatar');
        await apiClient.put('/users/me/creator-profile', { name: me.creatorProfile.name, avatarUrl });
      } else if (me.businessProfile) {
        const logoUrl = await uploadFile(file, 'logo');
        await apiClient.put('/users/me/business-profile', {
          companyName: me.businessProfile.companyName,
          logoUrl,
        });
      }
      load();
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // PRD "Featured Placement": "Creators can promote profiles" - biznes zayavkachini
  // ko'rib chiqishda yoki AI Matching orqali tavsiya etilganda ko'rinishi oshadi.
  async function promoteProfile() {
    setPromotingProfile(true);
    try {
      await apiClient.post('/users/me/promote-profile', { days: 7 });
      load();
    } finally {
      setPromotingProfile(false);
    }
  }

  // PRD "Subscription Plans": Starter/Growth/Pro - faol kampaniyalar limitini belgilaydi
  // (campaigns.service.ts#updateStatus da haqiqatan tekshiriladi).
  async function changePlan(plan: SubscriptionPlan) {
    setSavingPlan(true);
    try {
      await apiClient.put('/users/me/subscription-plan', { plan });
      load();
    } finally {
      setSavingPlan(false);
    }
  }

  // PRD "Verification": hujjat (ixtiyoriy) S3'ga yuklanadi, so'ng moderator
  // Admin Panel -> "Verifikatsiya" sahifasida ko'rib chiqadi (users.service.ts#submitVerificationRequest).
  async function submitVerification(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setVerificationError(null);
    setSubmittingVerification(true);
    try {
      const documentUrl = file ? await uploadFile(file, 'verification-document') : undefined;
      await apiClient.post('/users/me/verification-request', { documentUrl });
      load();
    } catch (err) {
      setVerificationError((err as Error).message);
    } finally {
      setSubmittingVerification(false);
    }
  }

  if (!me) {
    return (
      <div className="p-4 pb-24">
        <Skeleton className="h-6 w-1/3 mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const photoUrl = me.creatorProfile?.avatarUrl || me.businessProfile?.logoUrl;
  const displayName = me.creatorProfile?.name || me.businessProfile?.companyName;
  const verificationStatus = me.creatorProfile?.verificationStatus ?? me.businessProfile?.verificationStatus ?? 'UNVERIFIED';

  return (
    <div className="p-4 pb-24">
      <PageHeader title={t('nav.profile')} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPhotoSelected}
      />
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="tap-scale relative shrink-0 disabled:opacity-50"
          aria-label={t('profile.changePhoto') as string}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <Avatar name={displayName} size={64} />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-accent-500 text-white flex items-center justify-center border-2 border-white">
            <Camera size={12} />
          </span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="tap-scale text-sm font-medium text-accent-600 disabled:opacity-50"
        >
          {uploadingPhoto ? t('profile.uploading') : t('profile.changePhoto')}
        </button>
      </div>
      {photoError && <p className="text-danger-text text-xs mb-3">{photoError}</p>}

      <Card>
        <SectionTitle icon={<Globe size={16} className="text-accent-500" />}>Til / Язык / Language</SectionTitle>
        <p className="text-xs text-ink-400 mb-3">Ilova interfeysi tili / Язык интерфейса / Interface language</p>
        <LanguageSwitcher value={i18n.language} onChange={(code) => i18n.changeLanguage(code)} />
      </Card>

      {me.creatorProfile && (
        <>
          <Card className="mb-4">
            <div className="flex justify-between items-start">
              <h2 className="font-semibold text-ink-900 text-[15px]">
                {me.creatorProfile.name || t('profile.nameMissing')}
              </h2>
              <button
                onClick={() => setEditingCreator((v) => !v)}
                className="tap-scale text-xs font-medium text-accent-600 shrink-0 inline-flex items-center gap-1"
              >
                {editingCreator ? t('common.cancel') : (
                  <>
                    <Pencil size={12} />
                    {t('profile.editProfile')}
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <StatCard label={t('profile.followers')} value={me.creatorProfile.followers} />
              <StatCard label={t('profile.rating')} value={me.creatorProfile.rating.toFixed(1)} />
              <StatCard label={t('profile.creatorScore')} value={me.creatorProfile.creatorScore} tone="accent" />
            </div>

            {!editingCreator && (me.creatorProfile.country || (me.creatorProfile.categories ?? []).length > 0) && (
              <p className="text-xs text-ink-400 mt-3">
                {[me.creatorProfile.city, me.creatorProfile.country].filter(Boolean).join(', ')}
                {(me.creatorProfile.categories ?? []).length > 0
                  ? ` · ${(me.creatorProfile.categories ?? []).join(', ')}`
                  : ''}
              </p>
            )}

            {editingCreator && (
              <div className="mt-5 border-t border-ink-100 pt-5">
                <FormSection title={t('profile.nameField') as string}>
                  <div>
                    <Label>{t('profile.nameField')}</Label>
                    <Input value={crName} onChange={(e) => setCrName(e.target.value)} invalid={!crName.trim() && Boolean(creatorInfoError)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t('profile.countryField')}</Label>
                      <Input value={crCountry} onChange={(e) => setCrCountry(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('profile.cityField')}</Label>
                      <Input value={crCity} onChange={(e) => setCrCity(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>{t('profile.categoriesField')}</Label>
                    <Input value={crCategories} onChange={(e) => setCrCategories(e.target.value)} placeholder="fashion, tech, food..." />
                  </div>
                </FormSection>

                <FormSection title={t('profile.languagesField') as string}>
                  <LanguageMultiSelect
                    value={crLanguages}
                    onToggle={(code) => toggleLanguage(code as Language)}
                  />
                </FormSection>

                <FormSection title={t('profile.socialLinksField') as string}>
                  <Input placeholder="Instagram" value={crInstagram} onChange={(e) => setCrInstagram(e.target.value)} />
                  <Input placeholder="TikTok" value={crTiktok} onChange={(e) => setCrTiktok(e.target.value)} />
                  <Input placeholder="YouTube" value={crYoutube} onChange={(e) => setCrYoutube(e.target.value)} />
                  <Input placeholder="Telegram" value={crTelegram} onChange={(e) => setCrTelegram(e.target.value)} />
                </FormSection>

                <FormSection title={t('profile.followers') as string}>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>{t('profile.followers')}</Label>
                      <Input inputMode="numeric" type="number" min={0} value={crFollowers} onChange={(e) => setCrFollowers(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('profile.avgViewsField')}</Label>
                      <Input inputMode="numeric" type="number" min={0} value={crAvgViews} onChange={(e) => setCrAvgViews(e.target.value)} />
                    </div>
                    <div>
                      <Label hint="%">{t('profile.engagementRateField')}</Label>
                      <Input
                        inputMode="decimal"
                        type="number"
                        min={0}
                        max={100}
                        value={crEngagementRate}
                        onChange={(e) => setCrEngagementRate(e.target.value)}
                      />
                    </div>
                  </div>
                </FormSection>

                {creatorInfoError && <p className="text-danger-text text-xs mb-3">{creatorInfoError}</p>}

                <Button full size="lg" loading={savingCreatorInfo} disabled={!crName.trim()} onClick={saveCreatorInfo}>
                  {t('common.save')}
                </Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <Link to="/portfolio">
              <Card interactive className="text-center">
                <Images size={18} className="text-accent-600 mx-auto mb-1" />
                <span className="text-xs font-semibold text-ink-800">{t('portfolio.manageLink')}</span>
              </Card>
            </Link>
            <Link to="/earnings">
              <Card interactive className="text-center">
                <Wallet size={18} className="text-accent-600 mx-auto mb-1" />
                <span className="text-xs font-semibold text-ink-800">{t('earnings.title')}</span>
              </Card>
            </Link>
            <Link to="/analytics/creator">
              <Card interactive className="text-center">
                <BarChart3 size={18} className="text-accent-600 mx-auto mb-1" />
                <span className="text-xs font-semibold text-ink-800">{t('analytics.title')}</span>
              </Card>
            </Link>
          </div>

          {pricingRec && (
            <Card className="mb-4">
              <SectionTitle icon={<Sparkles size={16} className="text-accent-500" />}>
                {t('profile.aiPriceTitle')}
              </SectionTitle>
              <p className="text-2xl font-extrabold text-ink-900 tracking-tight mt-1">
                {pricingRec.min.toLocaleString()} - {pricingRec.max.toLocaleString()}{' '}
                <span className="text-sm font-normal text-ink-400">{pricingRec.currency}</span>
              </p>
              <p className="text-xs text-ink-400 mt-1">{pricingRec.note}</p>
            </Card>
          )}

          <Card className="mb-4">
            <SectionTitle icon={<Wallet size={16} className="text-accent-500" />}>
              {t('profile.payoutTitle')}
            </SectionTitle>
            <p className="text-xs text-ink-400 mb-3">{t('profile.payoutHint')}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {Object.values(PaymentProvider).map((p) => (
                <Chip key={p} active={payoutProvider === p} onClick={() => setPayoutProvider(p)}>
                  {p}
                </Chip>
              ))}
            </div>

            <div className="mb-3">
              <Input
                placeholder={t('profile.payoutAccountPlaceholder') as string}
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
              />
            </div>

            <Button
              full
              loading={savingPayout}
              disabled={!payoutProvider || !payoutAccount}
              onClick={savePayout}
            >
              {payoutSaved ? <Check size={16} /> : t('common.save')}
            </Button>
          </Card>

          <Card className="mb-4">
            <SectionTitle icon={<Star size={16} className="text-warning-dot" />}>
              {t('featured.creatorTitle')}
            </SectionTitle>
            <p className="text-xs text-ink-400 mb-3">{t('featured.creatorHint')}</p>
            {me.creatorProfile.isFeatured &&
            me.creatorProfile.featuredUntil &&
            new Date(me.creatorProfile.featuredUntil) > new Date() ? (
              <p className="text-sm text-warning-text font-medium flex items-center gap-1.5">
                <Star size={14} className="fill-warning-dot text-warning-dot" />
                {t('featured.activeUntil')} {new Date(me.creatorProfile.featuredUntil).toLocaleDateString()}
              </p>
            ) : (
              <Button
                full
                variant="secondary"
                icon={<Star size={16} />}
                loading={promotingProfile}
                onClick={promoteProfile}
              >
                {t('featured.promoteProfile')}
              </Button>
            )}
          </Card>
        </>
      )}

      {me.businessProfile && (
        <Card className="mb-4">
          <div className="flex justify-between items-start">
            <h2 className="font-semibold text-ink-900 text-[15px]">
              {me.businessProfile.companyName || t('profile.nameMissing')}
            </h2>
            <button
              onClick={() => setEditingBusiness((v) => !v)}
              className="tap-scale text-xs font-medium text-accent-600 shrink-0 inline-flex items-center gap-1"
            >
              {editingBusiness ? t('common.cancel') : (
                <>
                  <Pencil size={12} />
                  {t('profile.editProfile')}
                </>
              )}
            </button>
          </div>
          <div className="mt-2 text-sm text-ink-400">
            {t('profile.businessScore')}: <strong className="text-ink-800">{me.businessProfile.businessScore}</strong>
          </div>
          {!editingBusiness && me.businessProfile.description && (
            <p className="text-xs text-ink-400 mt-2">{me.businessProfile.description}</p>
          )}

          {editingBusiness && (
            <div className="mt-4 border-t border-ink-100 pt-5">
              <FormSection title={t('profile.companyNameField') as string}>
                <div>
                  <Label>{t('profile.companyNameField')}</Label>
                  <Input value={bizCompanyName} onChange={(e) => setBizCompanyName(e.target.value)} invalid={!bizCompanyName.trim() && Boolean(businessInfoError)} />
                </div>
                <div>
                  <Label>{t('profile.descriptionFieldBiz')}</Label>
                  <Textarea rows={3} value={bizDescription} onChange={(e) => setBizDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('profile.industryField')}</Label>
                    <Input value={bizIndustry} onChange={(e) => setBizIndustry(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('profile.contactPersonField')}</Label>
                    <Input value={bizContactPerson} onChange={(e) => setBizContactPerson(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t('profile.websiteField')}</Label>
                  <Input type="url" value={bizWebsite} onChange={(e) => setBizWebsite(e.target.value)} placeholder="https://" />
                </div>
              </FormSection>
              {businessInfoError && <p className="text-danger-text text-xs mb-3">{businessInfoError}</p>}
              <Button full size="lg" loading={savingBusinessInfo} disabled={!bizCompanyName.trim()} onClick={saveBusinessInfo}>
                {t('common.save')}
              </Button>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <Link to="/campaigns/new">
              <Button full icon={<Plus size={16} />}>
                {t('createCampaign.title')}
              </Button>
            </Link>
            <Link to="/campaigns/mine">
              <Button full variant="secondary" icon={<ClipboardList size={16} />}>
                {t('myCampaigns.title')}
              </Button>
            </Link>
            <Link to="/payments">
              <Button full variant="secondary" icon={<CreditCard size={16} />}>
                {t('payments.title')}
              </Button>
            </Link>
            <Link to="/analytics/business">
              <Button full variant="secondary" icon={<BarChart3 size={16} />}>
                {t('analytics.title')}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {me.businessProfile && (
        <Card className="mb-4">
          <SectionTitle icon={<Briefcase size={16} className="text-accent-500" />}>
            {t('subscription.title')}
          </SectionTitle>
          <p className="text-xs text-ink-400 mb-3">{t('subscription.hint')}</p>
          <div className="space-y-2">
            {Object.values(SubscriptionPlan).map((plan: SubscriptionPlan) => {
              const limit = SUBSCRIPTION_PLAN_LIMITS[plan];
              const active = me.businessProfile?.subscriptionPlan === plan;
              return (
                <button
                  key={plan}
                  onClick={() => changePlan(plan)}
                  disabled={savingPlan || active}
                  className={`tap-scale w-full flex justify-between items-center rounded-xl border px-3.5 py-2.5 text-sm disabled:opacity-70 ${
                    active ? 'border-accent-500 bg-accent-50 font-semibold text-ink-900' : 'border-ink-200 text-ink-700'
                  }`}
                >
                  <span>{t(`subscription.plan.${plan.toLowerCase()}`)}</span>
                  <span className="text-xs text-ink-400">
                    {limit === null ? t('subscription.unlimited') : `${limit} ${t('subscription.campaignsSuffix')}`}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <SectionTitle icon={<ShieldCheck size={16} className="text-accent-500" />}>
            {t('profile.verification')}
          </SectionTitle>
          <Badge tone={VERIFICATION_TONE[verificationStatus] ?? 'neutral'} dot>
            {t(`profile.verificationStatus.${verificationStatus.toLowerCase()}`)}
          </Badge>
        </div>
        {verificationStatus === 'UNVERIFIED' && (
          <>
            <p className="text-xs text-ink-400 mb-3">{t('profile.verificationHint')}</p>
            <input
              ref={verificationFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={submitVerification}
            />
            <Button
              full
              variant="secondary"
              loading={submittingVerification}
              onClick={() => verificationFileInputRef.current?.click()}
            >
              {t('profile.requestVerification')}
            </Button>
            {verificationError && <p className="text-danger-text text-xs mt-2">{verificationError}</p>}
          </>
        )}
      </Card>

    </div>
  );
}
