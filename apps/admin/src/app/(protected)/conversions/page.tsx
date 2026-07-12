'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface AdminConversion {
  id: string;
  type: string;
  amount: string;
  platformFee: string;
  payoutAmount: string;
  status: string;
  confirmedAt: string | null;
  application: { creator: { name: string }; campaign: { title: string; currency: string } };
}

// PRD "CPA (Cost Per Action)": biznes konversiyani tasdiqlagach (CONFIRMED, paidAt=null)
// shu ro'yxatda paydo bo'ladi - moderator/admin Click Business ilovasi orqali kreatorga
// qo'lda pul o'tkazgach, "To'landi deb belgilash" tugmasi bilan yakunlaydi (bir xil
// cheklov Escrow bilan: Click'da avtomatik chiqim API'si yo'q).
export default function ConversionsPage() {
  const [conversions, setConversions] = useState<AdminConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refInputs, setRefInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient
      .get<AdminConversion[]>('/conversions/unpaid')
      .then(setConversions)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markPaid(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiClient.patch(`/conversions/${id}/mark-paid`, {
        payoutReference: refInputs[id] || undefined,
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Konversiyalar (CPA)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Biznes tasdiqlagan, hali to'lanmagan CPA/Hybrid konversiyalar navbati.
      </p>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : conversions.length === 0 ? (
        <p className="text-gray-500">To'lanmagan konversiya yo'q.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Kampaniya</th>
                <th className="p-3">Kreator</th>
                <th className="p-3">Turi</th>
                <th className="p-3">Summa</th>
                <th className="p-3">Komissiya</th>
                <th className="p-3">Chiqim summasi</th>
                <th className="p-3">Tasdiqlangan</th>
                <th className="p-3">Amal</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="p-3">{c.application?.campaign?.title}</td>
                  <td className="p-3">{c.application?.creator?.name}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{c.type}</span>
                  </td>
                  <td className="p-3">
                    {Number(c.amount).toLocaleString()} {c.application?.campaign?.currency}
                  </td>
                  <td className="p-3">{Number(c.platformFee).toLocaleString()}</td>
                  <td className="p-3">{Number(c.payoutAmount).toLocaleString()}</td>
                  <td className="p-3">{c.confirmedAt ? new Date(c.confirmedAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        placeholder="Click tranzaksiya ID (ixtiyoriy)"
                        value={refInputs[c.id] ?? ''}
                        onChange={(ev) => setRefInputs((prev) => ({ ...prev, [c.id]: ev.target.value }))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs w-40"
                      />
                      <button
                        disabled={busyId === c.id}
                        onClick={() => markPaid(c.id)}
                        className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs disabled:opacity-50 whitespace-nowrap"
                      >
                        To'landi deb belgilash
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
