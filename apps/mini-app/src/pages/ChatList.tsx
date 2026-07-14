import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';

interface ApplicationWithThread {
  id: string;
  status: string;
  campaign?: { title: string };
  chatThread?: { id: string } | null;
}

// PRD v2 §4.6: Mini App ichidagi chatlar ro'yxati (bottom-nav "Chat" tab).
// Har bir suhbat ACCEPTED zayavka bilan birga avtomatik ochiladi (applications.service.ts).
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
    <div className="p-4 pb-24">
      <PageHeader title={t('nav.chat')} />

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && applications.length === 0 && (
        <EmptyState
          icon={<MessageCircle size={24} />}
          title={t('nav.chat')}
          subtitle={`Suhbat kampaniya zayavkasi qabul qilingandan so'ng ochiladi. "${t('nav.applications')}" bo'limidan holatni tekshiring.`}
        />
      )}

      {applications.map((app) => (
        <Link key={app.id} to={`/chat/${app.chatThread!.id}`} className="block mb-3">
          <Card interactive className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-ink-900 text-[15px] truncate">{app.campaign?.title}</div>
              <div className="mt-1.5">
                <StatusBadge status={app.status} />
              </div>
            </div>
            <ChevronRight size={18} className="text-ink-300 shrink-0" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
