import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ClipboardList, MessageCircle, User } from 'lucide-react';
import { apiClient } from '../api/client';

type UserRole = 'CREATOR' | 'BUSINESS' | 'ADMIN' | 'MODERATOR';

interface MeRoleResponse {
  role: UserRole;
}

// PRD v2 §4.3: pastdan tab-navigatsiya (Bosh sahifa / Kampaniyalar / Chat / Profil)
//
// 2026-07-12 audit tuzatishi: "Zayavkalar" (Applications) tabi avval HAR IKKALA rol uchun
// bir xil /applications'ga olib borardi. Bu sahifa (Applications.tsx) faqat kreatorning
// o'z zayavkalarini ko'rsatadi (applications.service.ts#findMineAsCreator - biznes uchun
// har doim bo'sh massiv qaytaradi). Natijada biznes foydalanuvchi bu tabni bosganda doim
// bo'sh sahifa ko'rar edi - bu chalkash "o'lik" UI edi (biznesning haqiqiy ekvivalenti
// "Mening kampaniyalarim" Profile.tsx orqaligina yetib borish mumkin bo'lgan alohida
// sahifa edi). Endi rol aniqlanadi va biznes uchun bu tab to'g'ridan-to'g'ri
// /campaigns/mine'ga olib boradi.
// 2026-07-14: dizayn tizimi - lucide ikonkalari, faol holat uchun accent rang + tepada chiziq.
export function BottomNav() {
  const { t } = useTranslation();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    apiClient
      .get<MeRoleResponse>('/users/me')
      .then((me) => setRole(me.role))
      .catch(() => setRole(null));
  }, []);

  const isBusiness = role === 'BUSINESS';

  const tabs = [
    { to: '/', key: 'home', Icon: Home },
    isBusiness
      ? { to: '/campaigns/mine', key: 'myCampaignsTab', Icon: ClipboardList }
      : { to: '/applications', key: 'applications', Icon: ClipboardList },
    { to: '/chat', key: 'chat', Icon: MessageCircle },
    { to: '/profile', key: 'profile', Icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-ink-100 bg-white/95 backdrop-blur pt-1.5 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around max-w-lg mx-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `tap-scale relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-[11px] font-medium ${
              isActive ? 'text-accent-600' : 'text-ink-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-accent-500" />}
              <tab.Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
              {t(`nav.${tab.key}`)}
            </>
          )}
        </NavLink>
      ))}
      </div>
    </nav>
  );
}
