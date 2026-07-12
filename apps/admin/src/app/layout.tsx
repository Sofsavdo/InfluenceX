import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InfluenceX Admin',
  description: 'InfluenceX Admin Panel — foydalanuvchilar, kampaniyalar, escrow, nizolar boshqaruvi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
