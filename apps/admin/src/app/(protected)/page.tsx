'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';

interface Overview {
  users: number;
  campaigns: number;
  heldEscrows: number;
  openDisputes: number;
}

// PRD v2 §11 MVP KPI: faol kreator/biznes, yakunlangan kampaniyalar, escrow holati, nizolar nisbati
export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    apiClient.get<Overview>('/admin/overview').then(setOverview).catch(() => {});
  }, []);

  const cards = [
    { label: 'Foydalanuvchilar', value: overview?.users },
    { label: 'Kampaniyalar', value: overview?.campaigns },
    { label: 'Muzlatilgan escrow (HELD)', value: overview?.heldEscrows },
    { label: 'Ochiq nizolar', value: overview?.openDisputes },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.value ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
