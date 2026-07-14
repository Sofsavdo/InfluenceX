import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Package, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Input, Textarea, Select } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

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
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
    <div className="p-4 pb-24">
      <PageHeader back title={t('products.title')} subtitle={t('products.hint')} />

      {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

      <Button
        variant="secondary"
        full
        icon={<Plus size={16} />}
        className="mb-4"
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? t('common.cancel') : t('products.addNew')}
      </Button>

      {showForm && (
        <Card className="space-y-2 mb-4">
          <Input
            placeholder={t('products.nameField') as string}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            rows={2}
            placeholder={t('products.descriptionField') as string}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t('products.priceField') as string}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder={t('products.cpaRateField') as string}
              value={cpaRate}
              onChange={(e) => setCpaRate(e.target.value)}
            />
          </div>
          <Input
            type="url"
            placeholder={t('products.externalUrlField') as string}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
          />
          <p className="text-xs text-ink-400">{t('products.externalUrlHint')}</p>
          <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          {formError && <p className="text-xs text-danger-text">{formError}</p>}
          <Button
            full
            loading={creating}
            disabled={!name || !price || !externalUrl || !cpaRate}
            onClick={createProduct}
          >
            {t('products.create')}
          </Button>
        </Card>
      )}

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}
      {!loading && products.length === 0 && !showForm && (
        <EmptyState icon={<Package size={24} />} title={t('products.empty')} />
      )}

      <div className="space-y-3">
        {products.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold text-ink-900 text-[15px]">{p.name}</span>
              <Badge tone={p.visibleToCreators ? 'success' : 'neutral'} className="shrink-0">
                {p.visibleToCreators ? t('products.visible') : t('products.hidden')}
              </Badge>
            </div>
            {p.description && <p className="text-xs text-ink-400 mt-1 break-words">{p.description}</p>}
            <p className="text-xs text-ink-600 mt-2">
              {t('products.priceField')}: {p.price.toLocaleString()} {p.currency} · {t('products.cpaRateField')}:{' '}
              {p.cpaRate.toLocaleString()} {p.currency}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" loading={savingId === p.id} onClick={() => toggleVisibility(p)}>
                {p.visibleToCreators ? t('products.makeHidden') : t('products.makeVisible')}
              </Button>
              {p.linkedCampaignId && (
                <Link to={`/campaigns/${p.linkedCampaignId}/applicants`}>
                  <Button size="sm" variant="secondary">
                    {t('applicants.viewApplicants')}
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                disabled={savingId === p.id}
                onClick={() => remove(p)}
              >
                {t('common.delete')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
