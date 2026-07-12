import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';

interface ApplicationWithThread {
  id: string;
  status: string;
  campaign?: { title: string };
  chatThread?: { id: string } | null;
}

// PRD v2 §4.6: Mini App ichidagi chatlar ro'yxati (bottom-nav "Chat" tab).
// Har bir suhbat ACCEPTED zayavka bilan birga avtomatik ochiladi (applications.service.ts).
export default function ChatList() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<ApplicationWithThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApplicationWithThread[]>('/applications/mine')
      .then((apps) => setApplications(apps.filter((a) => a.chatThread)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">{t('nav.chat')}</h1>
      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && applications.length === 0 && (
        <p className="text-tg-hint">
          Suhbat kampaniya zayavkasi qabul qilingandan so'ng ochiladi. "{t('nav.applications')}" bo'limidan holatni
          tekshiring.
        </p>
      )}
      {applications.map((app) => (
        <Link
          key={app.id}
          to={`/chat/${app.chatThread!.id}`}
          className="block rounded-xl border border-tg-secondaryBg p-4 mb-3"
        >
          <div className="font-semibold">{app.campaign?.title}</div>
          <div className="text-xs text-tg-hint mt-1">{app.status}</div>
        </Link>
      ))}
    </div>
  );
}
