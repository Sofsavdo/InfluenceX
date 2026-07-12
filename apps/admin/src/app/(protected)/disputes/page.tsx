'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface AdminDispute {
  id: string;
  reason: string;
  status: string;
  escrowId: string;
  createdAt: string;
  escrow: { application: { creator: { name: string }; campaign: { title: string; business: { companyName: string } } } };
}

// PRD: "Nizo holatida moderator dalillarni ko'rib chiqadi" — resolve tugmalari
// apps/api POST /escrow/:id/dispute/resolve (JwtAuthGuard + MODERATOR/ADMIN) ga chaqiradi
export default function DisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiClient.get<AdminDispute[]>('/admin/disputes').then(setDisputes).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function resolve(escrowId: string, resolution: 'RESOLVED_CREATOR' | 'RESOLVED_BUSINESS') {
    setBusyId(escrowId);
    try {
      await apiClient.patch(`/escrow/${escrowId}/dispute/resolve`, { resolution });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nizolar</h1>
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : disputes.length === 0 ? (
        <p className="text-gray-500">Hozircha nizolar yo'q</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{d.escrow?.application?.campaign?.title}</div>
                  <div className="text-sm text-gray-500">
                    {d.escrow?.application?.campaign?.business?.companyName} vs {d.escrow?.application?.creator?.name}
                  </div>
                </div>
                <span className="rounded-full bg-yellow-100 text-yellow-800 px-2 py-1 text-xs">{d.status}</span>
              </div>
              <p className="text-sm mt-2">{d.reason}</p>
              {d.status === 'OPEN' || d.status === 'UNDER_REVIEW' ? (
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={busyId === d.escrowId}
                    onClick={() => resolve(d.escrowId, 'RESOLVED_CREATOR')}
                    className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Kreator foydasiga
                  </button>
                  <button
                    disabled={busyId === d.escrowId}
                    onClick={() => resolve(d.escrowId, 'RESOLVED_BUSINESS')}
                    className="rounded-lg bg-gray-700 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Biznes foydasiga (refund)
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
