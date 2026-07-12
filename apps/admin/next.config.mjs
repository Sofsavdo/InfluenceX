/** @type {import('next').NextConfig} */
const nextConfig = {
  // Admin panel — Mini App emas, to'liq brauzer/desktop uchun (PRD v2 §2)
  transpilePackages: ['@influencex/shared'],
  // Docker/Railway uchun - standalone output faqat runtime uchun kerakli fayllarni
  // (.next/standalone) yig'adi, image hajmini sezilarli kichraytiradi (2026-07-11).
  output: 'standalone',
};
export default nextConfig;
