'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface RevenueTransaction {
  date: string;
  type: 'escrow' | 'conversion';
  campaignTitle: string;
  model: string;
  grossAmount: number;
  platformFee: number;
}

interface RevenueReport {
  currency: string;
  totalRevenue: number;
  totalGrossVolume: number;
  revenueByModel: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  transactions: RevenueTransaction[];
}

// PRD Admin Panel "Revenue Reports" - InfluenceX'ning haqiqiy komissiya daromadi
// (platformFee), yalpi tranzaksiya hajmidan (amount) ajratilgan holda. Faqat
// yakunlangan pul harakatlari (RELEASED escrow, to'langan konversiyalar) hisoblanadi.
export default function RevenuePage() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<RevenueReport>('/admin/revenue').then(setReport).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;
  if (!report) return null;

  const months = Object.keys(report.monthlyRevenue).sort();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daromad hisobotlari</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Jami komissiya daromadi</p>
          <p className="text-2xl font-bold">
            {report.totalRevenue.toLocaleString()} <span className="text-sm font-normal">{report.currency}</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Jami yalpi tranzaksiya hajmi</p>
          <p className="text-2xl font-bold">
            {report.totalGrossVolume.toLocaleString()} <span className="text-sm font-normal">{report.currency}</span>
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">Model bo'yicha daromad</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(report.revenueByModel).map(([model, amount]) => (
          <div key={model} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <div className="text-lg font-bold">{amount.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{model}</div>
          </div>
        ))}
      </div>

      {months.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-2">Oylik daromad</h2>
          <div className="flex gap-3 mb-6 overflow-x-auto">
            {months.map((m) => (
              <div key={m} className="rounded-xl border border-gray-200 bg-white p-3 text-center shrink-0 min-w-[100px]">
                <div className="text-base font-bold">{report.monthlyRevenue[m].toLocaleString()}</div>
                <div className="text-xs text-gray-500">{m}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mb-2">So'nggi tranzaksiyalar</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Sana</th>
              <th className="p-3">Kampaniya</th>
              <th className="p-3">Turi</th>
              <th className="p-3">Model</th>
              <th className="p-3">Yalpi summa</th>
              <th className="p-3">Komissiya</th>
            </tr>
          </thead>
          <tbody>
            {report.transactions.map((tx, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="p-3">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="p-3">{tx.campaignTitle}</td>
                <td className="p-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{tx.type}</span>
                </td>
                <td className="p-3">{tx.model}</td>
                <td className="p-3">{tx.grossAmount.toLocaleString()}</td>
                <td className="p-3 font-semibold">{tx.platformFee.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
