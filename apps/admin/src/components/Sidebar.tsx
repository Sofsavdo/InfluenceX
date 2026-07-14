'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '../lib/api';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Foydalanuvchilar' },
  { href: '/campaigns', label: 'Kampaniyalar' },
  { href: '/escrow', label: 'Escrow' },
  { href: '/conversions', label: 'Konversiyalar (CPA)' },
  { href: '/disputes', label: 'Nizolar' },
  { href: '/verification', label: 'Verifikatsiya' },
  { href: '/fraud', label: 'Fraud signallari' },
  { href: '/revenue', label: 'Daromad hisobotlari' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// PRD v1 Admin Panel moduli: Users, Campaigns, Payments/Escrow, Disputes, Verification
// Requests, Fraud Reports. 2026-07-11: mobil ekranlar uchun responsiv qilindi.
// 2026-07-14: brend rangi (accent) mini-app dizayn tizimi bilan bir xillashtirildi -
// avvalgi qora/kulrang (gray-900) faol holat endi accent-500 bo'ladi.
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink-900/40 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-ink-100 bg-white
          flex flex-col transition-transform duration-200 ease-in-out
          md:sticky md:top-0 md:h-screen md:w-60 md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-ink-100 flex items-center justify-between">
          <span className="flex items-center gap-2 font-extrabold text-[15px] tracking-tight text-ink-900">
            <span className="h-7 w-7 rounded-lg bg-accent-500 flex items-center justify-center text-white text-xs font-bold">
              IX
            </span>
            InfluenceX Admin
          </span>
          <button onClick={onClose} className="md:hidden text-ink-400 hover:text-ink-700" aria-label="Yopish">
            ✕
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-accent-50 text-accent-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            clearToken();
            router.push('/login');
          }}
          className="m-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left text-red-600 hover:bg-red-50"
        >
          Chiqish
        </button>
      </aside>
    </>
  );
}
