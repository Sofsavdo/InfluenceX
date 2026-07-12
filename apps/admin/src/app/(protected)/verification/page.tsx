'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface VerificationRequest {
  id: string;
  documentUrl?: string;
  note?: string;
  createdAt: string;
  user: {
    creatorProfile?: { name: string } | null;
    businessProfile?: { companyName: string } | null;
  };
}

// PRD v1: Creator Verification / Business Verification — moderator ko'lda ko'rib chiqadi (MVP)
export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiClient.get<VerificationRequest[]>('/admin/verification-requests').then(setRequests).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function review(id: string, status: 'VERIFIED' | 'REJECTED') {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/verification-requests/${id}`, { status });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verifikatsiya so'rovlari</h1>
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">Kutilayotgan so'rovlar yo'q</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold">
                  {r.user.creatorProfile?.name ?? r.user.businessProfile?.companyName ?? '—'}
                </div>
                {r.documentUrl && (
                  <a href={r.documentUrl} target="_blank" className="text-sm text-blue-600 underline">
                    Hujjatni ko'rish
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, 'VERIFIED')}
                  className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Tasdiqlash
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, 'REJECTED')}
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Rad etish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
