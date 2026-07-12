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
// Requests, Fraud Reports. 2026-07-11: mobil ekranlar uchun responsiv qilindi - kichik
// ekranda sidebar ekrandan tashqarida yashiringan, hamburger tugmasi bilan slide-in
// (backdrop bilan), md+ ekranda esa doimiy ko'rinadigan statik panel.
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-gray-200 bg-white
          flex flex-col transition-transform duration-200 ease-in-out
          md:sticky md:top-0 md:h-screen md:w-56 md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 font-bold text-lg border-b border-gray-200 flex items-center justify-between">
          InfluenceX Admin
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-700" aria-label="Yopish">
            ✕
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`block rounded-lg px-3 py-2 text-sm mb-1 ${
                pathname === link.href ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
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
          className="m-2 rounded-lg px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50"
        >
          Chiqish
        </button>
      </aside>
    </>
  );
}
