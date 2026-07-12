'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface AdminCampaign {
  id: string;
  title: string;
  status: string;
  collaborationModel: string;
  budget: string;
  currency: string;
  business: { companyName: string };
  applications: { id: string }[];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<AdminCampaign[]>('/admin/campaigns').then(setCampaigns).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Kampaniyalar</h1>
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Sarlavha</th>
                <th className="p-3">Biznes</th>
                <th className="p-3">Model</th>
                <th className="p-3">Byudjet</th>
                <th className="p-3">Zayavkalar</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{c.business?.companyName}</td>
                  <td className="p-3">{c.collaborationModel}</td>
                  <td className="p-3">{Number(c.budget).toLocaleString()} {c.currency}</td>
                  <td className="p-3">{c.applications?.length ?? 0}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{c.status}</span>
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
