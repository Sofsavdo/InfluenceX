import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface ProductItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  externalUrl: string;
  cpaRate: number;
  contentType: string;
  visibleToCreators: boolean;
  linkedCampaignId?: string | null;
}

const CONTENT_TYPES = ['REEL', 'STORY', 'POST', 'UGC_VIDEO', 'PRODUCT_REVIEW'];

// PRD kelajak reja "Shop Integrations" - YENGIL versiya (2026-07-12, "biznes uchun do'kon
// qursak, mahsulot blogerga ko'rinsin/ko'rinmasin deb belgilasa CPA orqali ishlaydi" strategiya
// suhbatidan keyin qo'shildi). MUHIM: bu TO'LIQ onlayn do'kon EMAS - checkout/inventar/domain
// yo'q. Mahsulot ro'yxati + "blogerlarga ko'rinsin" tugmasi, yoqilganda avtomatik CPA
// kampaniyaga aylanadi (mavjud campaigns/applications/conversions infratuzilmasidan
// qayta foydalanadi - products.service.ts#setVisibility).
export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [cpaRate, setCpaRate] = useState('');
  const [contentType, setContentType] = useState('REEL');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<ProductItem[]>('/products/mine')
      .then(setProducts)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createProduct() {
    setCreating(true);
    setFormError(null);
    try {
      await apiClient.post('/products', {
        name,
        description: description || undefined,
        price: Number(price),
        externalUrl,
        cpaRate: Number(cpaRate),
        contentType,
      });
      setName('');
      setDescription('');
      setPrice('');
      setExternalUrl('');
      setCpaRate('');
      setContentType('REEL');
      setShowForm(false);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleVisibility(product: ProductItem) {
    setSavingId(product.id);
    setError(null);
    try {
      await apiClient.patch(`/products/${product.id}/visibility`, { visible: !product.visibleToCreators });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function remove(product: ProductItem) {
    if (!window.confirm(t('products.deleteConfirm') as string)) return;
    setSavingId(product.id);
    setError(null);
    try {
      await apiClient.delete(`/products/${product.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-4 pb-20">
      <Link to="/campaigns/mine" className="text-tg-link text-sm">
        ← {t('myCampaigns.title')}
      </Link>
      <h1 className="text-xl font-bold mt-1 mb-1">{t('products.title')}</h1>
      <p className="text-xs text-tg-hint mb-4">{t('products.hint')}</p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded-lg border border-tg-button text-tg-link py-2 text-sm font-semibold mb-4"
      >
        {showForm ? t('common.cancel') : t('products.addNew')}
      </button>

      {showForm && (
        <div className="rounded-xl border border-tg-secondaryBg p-4 space-y-2 mb-4">
          <input
            className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            placeholder={t('products.nameField') as string}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            rows={2}
            placeholder={t('products.descriptionField') as string}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
              placeholder={t('products.priceField') as string}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="number"
              className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
              placeholder={t('products.cpaRateField') as string}
              value={cpaRate}
              onChange={(e) => setCpaRate(e.target.value)}
            />
          </div>
          <input
            type="url"
            className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            placeholder={t('products.externalUrlField') as string}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
          />
          <p className="text-xs text-tg-hint">{t('products.externalUrlHint')}</p>
          <select
            className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <button
            onClick={createProduct}
            disabled={creating || !name || !price || !externalUrl || !cpaRate}
            className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? t('common.loading') : t('products.create')}
          </button>
        </div>
      )}

      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && products.length === 0 && !showForm && <p className="text-tg-hint">{t('products.empty')}</p>}

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-tg-secondaryBg p-4">
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold">{p.name}</span>
              <span
                className={`text-xs rounded-full px-2 py-1 shrink-0 ${
                  p.visibleToCreators ? 'bg-green-100 text-green-700' : 'bg-tg-secondaryBg'
                }`}
              >
                {p.visibleToCreators ? t('products.visible') : t('products.hidden')}
              </span>
            </div>
            {p.description && <p className="text-xs text-tg-hint mt-1">{p.description}</p>}
            <p className="text-xs mt-2">
              {t('products.priceField')}: {p.price.toLocaleString()} {p.currency} · {t('products.cpaRateField')}:{' '}
              {p.cpaRate.toLocaleString()} {p.currency}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => toggleVisibility(p)}
                disabled={savingId === p.id}
                className="rounded-lg bg-tg-button text-tg-buttonText px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {p.visibleToCreators ? t('products.makeHidden') : t('products.makeVisible')}
              </button>
              {p.linkedCampaignId && (
                <Link
                  to={`/campaigns/${p.linkedCampaignId}/applicants`}
                  className="rounded-lg border border-tg-secondaryBg px-3 py-1.5 text-xs"
                >
                  {t('applicants.viewApplicants')}
                </Link>
              )}
              <button
                onClick={() => remove(p)}
                disabled={savingId === p.id}
                className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
