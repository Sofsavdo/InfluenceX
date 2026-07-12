'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface AdminEscrow {
  id: string;
  amount: string;
  currency: string;
  platformFee: string;
  payoutAmount: string;
  status: string;
  application: { creator: { name: string }; campaign: { title: string } };
}

// PRD v2 §4.5: Escrow ledger — moderator/admin har bir escrow holatini kuzatib boradi.
// RELEASE_PENDING qatorlar uchun "Qo'lda to'lovni tasdiqlash" tugmasi ko'rinadi - Click'da
// avtomatik chiqim API'si yo'qligi sababli (click.provider.ts), moderator kreatorga Click
// Business ilovasi orqali qo'lda pul o'tkazgach, shu yerda tasdiqlaydi
// (PATCH /escrow/:id/confirm-manual-payout -> RELEASE_PENDING -> RELEASED).
export default function EscrowPage() {
  const [escrows, setEscrows] = useState<AdminEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refInputs, setRefInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get<AdminEscrow[]>('/admin/escrows').then(setEscrows).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function confirmManualPayout(escrowId: string) {
    setBusyId(escrowId);
    setError(null);
    try {
      await apiClient.patch(`/escrow/${escrowId}/confirm-manual-payout`, {
        payoutReference: refInputs[escrowId] || undefined,
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
      <h1 className="text-2xl font-bold mb-6">Escrow</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Kampaniya</th>
                <th className="p-3">Kreator</th>
                <th className="p-3">Summa</th>
                <th className="p-3">Komissiya</th>
                <th className="p-3">Chiqim summasi</th>
                <th className="p-3">Status</th>
                <th className="p-3">Amal</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="p-3">{e.application?.campaign?.title}</td>
                  <td className="p-3">{e.application?.creator?.name}</td>
                  <td className="p-3">{Number(e.amount).toLocaleString()} {e.currency}</td>
                  <td className="p-3">{Number(e.platformFee).toLocaleString()}</td>
                  <td className="p-3">{Number(e.payoutAmount).toLocaleString()}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{e.status}</span>
                  </td>
                  <td className="p-3">
                    {e.status === 'RELEASE_PENDING' ? (
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Click tranzaksiya ID (ixtiyoriy)"
                          value={refInputs[e.id] ?? ''}
                          onChange={(ev) => setRefInputs((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs w-40"
                        />
                        <button
                          disabled={busyId === e.id}
                          onClick={() => confirmManualPayout(e.id)}
                          className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs disabled:opacity-50 whitespace-nowrap"
                        >
                          Qo'lda to'lovni tasdiqlash
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
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
