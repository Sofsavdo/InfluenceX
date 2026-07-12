import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { UserRole, PaymentProvider, SubscriptionPlan, SUBSCRIPTION_PLAN_LIMITS, Language } from '@influencex/shared';

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

// PRD v2 §4.8: til tanlovi shu yerda; PRD v1 Creator/Business Dashboard "Settings"ga mos
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

  if (!me) return <p className="p-4 text-tg-hint">{t('common.loading')}</p>;

  const photoUrl = me.creatorProfile?.avatarUrl || me.businessProfile?.logoUrl;
  const verificationStatus = me.creatorProfile?.verificationStatus ?? me.businessProfile?.verificationStatus ?? 'UNVERIFIED';

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">{t('nav.profile')}</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPhotoSelected}
      />
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="w-16 h-16 rounded-full bg-tg-secondaryBg overflow-hidden shrink-0 disabled:opacity-50"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-xs text-tg-hint">
              {t('profile.choosePhoto')}
            </span>
          )}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="text-sm text-tg-link disabled:opacity-50"
        >
          {uploadingPhoto ? t('profile.uploading') : t('profile.changePhoto')}
        </button>
      </div>
      {photoError && <p className="text-red-600 text-xs mb-3">{photoError}</p>}

      {me.creatorProfile && (
        <>
          <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
            <div className="flex justify-between items-start">
              <h2 className="font-semibold">{me.creatorProfile.name || t('profile.nameMissing')}</h2>
              <button onClick={() => setEditingCreator((v) => !v)} className="text-xs text-tg-link shrink-0">
                {editingCreator ? t('common.cancel') : t('profile.editProfile')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
              <div>
                <div className="font-bold">{me.creatorProfile.followers}</div>
                <div className="text-tg-hint">{t('profile.followers')}</div>
              </div>
              <div>
                <div className="font-bold">{me.creatorProfile.rating.toFixed(1)}</div>
                <div className="text-tg-hint">{t('profile.rating')}</div>
              </div>
              <div>
                <div className="font-bold">{me.creatorProfile.creatorScore}</div>
                <div className="text-tg-hint">{t('profile.creatorScore')}</div>
              </div>
            </div>

            {!editingCreator && (me.creatorProfile.country || (me.creatorProfile.categories ?? []).length > 0) && (
              <p className="text-xs text-tg-hint mt-3">
                {[me.creatorProfile.city, me.creatorProfile.country].filter(Boolean).join(', ')}
                {(me.creatorProfile.categories ?? []).length > 0
                  ? ` · ${(me.creatorProfile.categories ?? []).join(', ')}`
                  : ''}
              </p>
            )}

            {editingCreator && (
              <div className="mt-4 space-y-2 border-t border-tg-secondaryBg pt-3">
                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder={t('profile.nameField') as string}
                  value={crName}
                  onChange={(e) => setCrName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                    placeholder={t('profile.countryField') as string}
                    value={crCountry}
                    onChange={(e) => setCrCountry(e.target.value)}
                  />
                  <input
                    className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                    placeholder={t('profile.cityField') as string}
                    value={crCity}
                    onChange={(e) => setCrCity(e.target.value)}
                  />
                </div>

                <div>
                  <p className="text-xs text-tg-hint mb-1">{t('profile.languagesField')}</p>
                  <div className="flex gap-2">
                    {ALL_LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          crLanguages.includes(lang) ? 'bg-tg-button text-tg-buttonText' : 'border-tg-secondaryBg'
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder={t('profile.categoriesField') as string}
                  value={crCategories}
                  onChange={(e) => setCrCategories(e.target.value)}
                />

                <p className="text-xs text-tg-hint pt-1">{t('profile.socialLinksField')}</p>
                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder="Instagram"
                  value={crInstagram}
                  onChange={(e) => setCrInstagram(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder="TikTok"
                  value={crTiktok}
                  onChange={(e) => setCrTiktok(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder="YouTube"
                  value={crYoutube}
                  onChange={(e) => setCrYoutube(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                  placeholder="Telegram"
                  value={crTelegram}
                  onChange={(e) => setCrTelegram(e.target.value)}
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                    placeholder={t('profile.followers') as string}
                    value={crFollowers}
                    onChange={(e) => setCrFollowers(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                    placeholder={t('profile.avgViewsField') as string}
                    value={crAvgViews}
                    onChange={(e) => setCrAvgViews(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                    placeholder={t('profile.engagementRateField') as string}
                    value={crEngagementRate}
                    onChange={(e) => setCrEngagementRate(e.target.value)}
                  />
                </div>

                {creatorInfoError && <p className="text-red-600 text-xs">{creatorInfoError}</p>}

                <button
                  onClick={saveCreatorInfo}
                  disabled={savingCreatorInfo || !crName.trim()}
                  className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {savingCreatorInfo ? t('common.loading') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <Link
              to="/portfolio"
              className="rounded-xl border border-tg-secondaryBg p-3 text-xs font-semibold text-tg-link text-center"
            >
              {t('portfolio.manageLink')}
            </Link>
            <Link
              to="/earnings"
              className="rounded-xl border border-tg-secondaryBg p-3 text-xs font-semibold text-tg-link text-center"
            >
              {t('earnings.title')}
            </Link>
            <Link
              to="/analytics/creator"
              className="rounded-xl border border-tg-secondaryBg p-3 text-xs font-semibold text-tg-link text-center"
            >
              {t('analytics.title')}
            </Link>
          </div>

          {pricingRec && (
            <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
              <h3 className="font-semibold mb-1">{t('profile.aiPriceTitle')}</h3>
              <p className="text-2xl font-bold">
                {pricingRec.min.toLocaleString()} - {pricingRec.max.toLocaleString()}{' '}
                <span className="text-sm font-normal text-tg-hint">{pricingRec.currency}</span>
              </p>
              <p className="text-xs text-tg-hint mt-1">{pricingRec.note}</p>
            </div>
          )}

          <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
            <h3 className="font-semibold mb-1">{t('profile.payoutTitle')}</h3>
            <p className="text-xs text-tg-hint mb-3">{t('profile.payoutHint')}</p>

            <div className="flex gap-2 mb-3">
              {Object.values(PaymentProvider).map((p) => (
                <button
                  key={p}
                  onClick={() => setPayoutProvider(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    payoutProvider === p ? 'bg-tg-button text-tg-buttonText' : 'border-tg-secondaryBg'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <input
              className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm mb-3"
              placeholder={t('profile.payoutAccountPlaceholder') as string}
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
            />

            <button
              onClick={savePayout}
              disabled={savingPayout || !payoutProvider || !payoutAccount}
              className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {payoutSaved ? '✓' : t('common.save')}
            </button>
          </div>

          <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
            <h3 className="font-semibold mb-1">{t('featured.creatorTitle')}</h3>
            <p className="text-xs text-tg-hint mb-3">{t('featured.creatorHint')}</p>
            {me.creatorProfile.isFeatured &&
            me.creatorProfile.featuredUntil &&
            new Date(me.creatorProfile.featuredUntil) > new Date() ? (
              <p className="text-sm text-yellow-600 font-medium">
                ⭐ {t('featured.activeUntil')} {new Date(me.creatorProfile.featuredUntil).toLocaleDateString()}
              </p>
            ) : (
              <button
                onClick={promoteProfile}
                disabled={promotingProfile}
                className="w-full rounded-lg border border-yellow-400 text-yellow-700 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {promotingProfile ? t('common.loading') : `⭐ ${t('featured.promoteProfile')}`}
              </button>
            )}
          </div>
        </>
      )}

      {me.businessProfile && (
        <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
          <div className="flex justify-between items-start">
            <h2 className="font-semibold">{me.businessProfile.companyName || t('profile.nameMissing')}</h2>
            <button onClick={() => setEditingBusiness((v) => !v)} className="text-xs text-tg-link shrink-0">
              {editingBusiness ? t('common.cancel') : t('profile.editProfile')}
            </button>
          </div>
          <div className="mt-2 text-sm text-tg-hint">
            {t('profile.businessScore')}: <strong>{me.businessProfile.businessScore}</strong>
          </div>
          {!editingBusiness && me.businessProfile.description && (
            <p className="text-xs text-tg-hint mt-2">{me.businessProfile.description}</p>
          )}

          {editingBusiness && (
            <div className="mt-3 space-y-2 border-t border-tg-secondaryBg pt-3">
              <input
                className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                placeholder={t('profile.companyNameField') as string}
                value={bizCompanyName}
                onChange={(e) => setBizCompanyName(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                rows={2}
                placeholder={t('profile.descriptionFieldBiz') as string}
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                placeholder={t('profile.industryField') as string}
                value={bizIndustry}
                onChange={(e) => setBizIndustry(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                placeholder={t('profile.websiteField') as string}
                value={bizWebsite}
                onChange={(e) => setBizWebsite(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
                placeholder={t('profile.contactPersonField') as string}
                value={bizContactPerson}
                onChange={(e) => setBizContactPerson(e.target.value)}
              />
              {businessInfoError && <p className="text-red-600 text-xs">{businessInfoError}</p>}
              <button
                onClick={saveBusinessInfo}
                disabled={savingBusinessInfo || !bizCompanyName.trim()}
                className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {savingBusinessInfo ? t('common.loading') : t('common.save')}
              </button>
            </div>
          )}

          <Link
            to="/campaigns/new"
            className="mt-3 block text-center rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold"
          >
            {t('createCampaign.title')}
          </Link>
          <Link
            to="/campaigns/mine"
            className="mt-2 block text-center rounded-lg border border-tg-secondaryBg py-2.5 text-sm font-semibold text-tg-link"
          >
            {t('myCampaigns.title')}
          </Link>
          <Link
            to="/payments"
            className="mt-2 block text-center rounded-lg border border-tg-secondaryBg py-2.5 text-sm font-semibold text-tg-link"
          >
            {t('payments.title')}
          </Link>
          <Link
            to="/analytics/business"
            className="mt-2 block text-center rounded-lg border border-tg-secondaryBg py-2.5 text-sm font-semibold text-tg-link"
          >
            {t('analytics.title')}
          </Link>
        </div>
      )}

      {me.businessProfile && (
        <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
          <h3 className="font-semibold mb-1">{t('subscription.title')}</h3>
          <p className="text-xs text-tg-hint mb-3">{t('subscription.hint')}</p>
          <div className="space-y-2">
            {Object.values(SubscriptionPlan).map((plan: SubscriptionPlan) => {
              const limit = SUBSCRIPTION_PLAN_LIMITS[plan];
              const active = me.businessProfile?.subscriptionPlan === plan;
              return (
                <button
                  key={plan}
                  onClick={() => changePlan(plan)}
                  disabled={savingPlan || active}
                  className={`w-full flex justify-between items-center rounded-lg border px-3 py-2.5 text-sm disabled:opacity-70 ${
                    active ? 'border-tg-button bg-tg-button/10 font-semibold' : 'border-tg-secondaryBg'
                  }`}
                >
                  <span>{t(`subscription.plan.${plan.toLowerCase()}`)}</span>
                  <span className="text-xs text-tg-hint">
                    {limit === null ? t('subscription.unlimited') : `${limit} ${t('subscription.campaignsSuffix')}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-tg-secondaryBg p-4 mb-4">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-semibold">{t('profile.verification')}</h3>
          <span
            className={`text-xs rounded-full px-2 py-1 ${
              verificationStatus === 'VERIFIED'
                ? 'bg-green-100 text-green-700'
                : verificationStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-tg-secondaryBg text-tg-hint'
            }`}
          >
            {t(`profile.verificationStatus.${verificationStatus.toLowerCase()}`)}
          </span>
        </div>
        {verificationStatus === 'UNVERIFIED' && (
          <>
            <p className="text-xs text-tg-hint mb-3">{t('profile.verificationHint')}</p>
            <input
              ref={verificationFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={submitVerification}
            />
            <button
              onClick={() => verificationFileInputRef.current?.click()}
              disabled={submittingVerification}
              className="w-full rounded-lg border border-tg-secondaryBg py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {submittingVerification ? t('common.loading') : t('profile.requestVerification')}
            </button>
            {verificationError && <p className="text-red-600 text-xs mt-2">{verificationError}</p>}
          </>
        )}
      </div>

      <div className="rounded-xl border border-tg-secondaryBg p-4">
        <h3 className="font-semibold mb-2">Til / Язык / Language</h3>
        <div className="flex gap-2">
          {['uz', 'ru', 'en'].map((lng) => (
            <button
              key={lng}
              onClick={() => i18n.changeLanguage(lng)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                i18n.language === lng ? 'bg-tg-button text-tg-buttonText' : 'border-tg-secondaryBg'
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
