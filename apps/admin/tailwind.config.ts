import type { Config } from 'tailwindcss';

// 2026-07-14: mini-app bilan bir xil brend rang tokenlari (mobil ilova va admin
// panel bir xil mahsulot ekanini vizual tasdiqlash uchun). Admin panel doim desktop/
// staff tomonidan ishlatiladi - shuning uchun bu yerda faqat light-mode qiymatlar
// kifoya (mini-app'dagi kabi CSS-o'zgaruvchili dark mode qatlami shart emas).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#b9d1ff',
          400: '#5c8eff',
          500: '#3366ff',
          600: '#254deb',
          700: '#1c3bc7',
          900: '#1a2f7d',
        },
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b9c1',
          400: '#91929e',
          500: '#71727e',
          600: '#585a66',
          700: '#454651',
          800: '#2e2f38',
          900: '#191a20',
        },
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(16, 18, 27, 0.04), 0 1px 12px rgba(16, 18, 27, 0.05)',
      },
    },
  },
  plugins: [],
};
export default config;
