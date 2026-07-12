import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    { to: '/', key: 'home', icon: '🏠' },
    isBusiness
      ? { to: '/campaigns/mine', key: 'myCampaignsTab', icon: '📋' }
      : { to: '/applications', key: 'applications', icon: '📋' },
    { to: '/chat', key: 'chat', icon: '💬' },
    { to: '/profile', key: 'profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-tg-secondaryBg bg-tg-bg py-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs ${isActive ? 'text-tg-link font-semibold' : 'text-tg-hint'}`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          {t(`nav.${tab.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
