'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';

interface AdminUser {
  id: string;
  role: string;
  telegramUsername?: string;
  email?: string;
  creatorProfile?: { name: string; creatorScore: number } | null;
  businessProfile?: { companyName: string; businessScore: number } | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<AdminUser[]>('/admin/users').then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Foydalanuvchilar</h1>
      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Ism / Kompaniya</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Telegram</th>
                <th className="p-3">Score</th>
                <th className="p-3">Ro'yxatdan o'tgan</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-3">{u.creatorProfile?.name ?? u.businessProfile?.companyName ?? '—'}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.telegramUsername ? `@${u.telegramUsername}` : u.email ?? '—'}</td>
                  <td className="p-3">{u.creatorProfile?.creatorScore ?? u.businessProfile?.businessScore ?? '—'}</td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
