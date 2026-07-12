'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface FraudSignal {
  code: string;
  label: string;
  severity: number;
}

interface FraudReportEntry {
  creator: {
    id: string;
    userId: string;
    name: string;
    followers: number;
    avgViews: number;
    engagementRate: number;
    tier: string;
    verificationStatus: string;
  };
  suspicionScore: number;
  signals: FraudSignal[];
}

// PRD "AI Fraud Detection": moderator uchun shubhali kreator profillari (fake followers,
// fake engagement, engagement pods). Bu YAKUNIY qaror emas - evristika signal, moderator
// profilni qo'lda ko'rib chiqadi (fraud/fraud-detection.service.ts).
export default function FraudPage() {
  const [entries, setEntries] = useState<FraudReportEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<FraudReportEntry[]>('/admin/fraud-signals').then(setEntries).finally(() => setLoading(false));
  }, []);

  function scoreColor(score: number): string {
    if (score >= 60) return 'bg-red-100 text-red-700';
    if (score >= 30) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Fraud signallari</h1>
      <p className="text-sm text-gray-500 mb-6">
        Bu ro'yxat evristikaga asoslangan - yakuniy qaror emas. Har bir profilni tekshirib
        chiqing, kerak bo'lsa Foydalanuvchilar sahifasidan verifikatsiya holatini o'zgartiring.
      </p>
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">Shubhali profil topilmadi</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.creator.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{entry.creator.name}</div>
                  <div className="text-sm text-gray-500">
                    {entry.creator.followers.toLocaleString()} obunachi · {entry.creator.tier} · engagement{' '}
                    {entry.creator.engagementRate.toFixed(1)}% · avg views {entry.creator.avgViews.toLocaleString()}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold shrink-0 ${scoreColor(entry.suspicionScore)}`}>
                  {entry.suspicionScore}/100
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {entry.signals.map((signal) => (
                  <li key={signal.code} className="text-sm text-gray-600">
                    • {signal.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
