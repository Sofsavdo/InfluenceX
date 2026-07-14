'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';

interface Overview {
  users: number;
  campaigns: number;
  heldEscrows: number;
  openDisputes: number;
}

// PRD v2 §11 MVP KPI: faol kreator/biznes, yakunlangan kampaniyalar, escrow holati,
// nizolar nisbati. 2026-07-14: kartalar mini-app dizayn tizimi bilan bir xil vizual
// tilga (rounded-2xl, shadow-card, accent brend rangi) o'tkazildi.
export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    apiClient.get<Overview>('/admin/overview').then(setOverview).catch(() => {});
  }, []);

  const cards = [
    { label: 'Foydalanuvchilar', value: overview?.users },
    { label: 'Kampaniyalar', value: overview?.campaigns },
    { label: 'Muzlatilgan escrow (HELD)', value: overview?.heldEscrows, tone: 'warning' as const },
    { label: 'Ochiq nizolar', value: overview?.openDisputes, tone: (overview?.openDisputes ?? 0) > 0 ? 'danger' as const : undefined },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-ink-400 mb-6">Platforma bo'yicha umumiy ko'rsatkichlar</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">{c.label}</div>
            <div
              className={`text-2xl font-extrabold mt-2 ${
                c.tone === 'danger' ? 'text-red-600' : c.tone === 'warning' ? 'text-amber-600' : 'text-ink-900'
              }`}
            >
              {c.value ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
