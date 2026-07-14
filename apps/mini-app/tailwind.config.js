/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Telegram tema o'zgaruvchilariga moslashtirilgan (light/dark avtomatik) -
        // Mini App Telegram ichida native ko'rinishi uchun saqlab qolinadi.
        tg: {
          bg: 'var(--tg-theme-bg-color, #ffffff)',
          text: 'var(--tg-theme-text-color, #0f1115)',
          hint: 'var(--tg-theme-hint-color, #8b8f97)',
          link: 'var(--tg-theme-link-color, #2481cc)',
          button: 'var(--tg-theme-button-color, #2481cc)',
          buttonText: 'var(--tg-theme-button-text-color, #ffffff)',
          secondaryBg: 'var(--tg-theme-secondary-bg-color, #f4f4f5)',
        },
        // 2026-07-14 dizayn tizimi: "zamonaviy minimalist" (Stripe/Linear uslubi) -
        // brend rangi (accent) + neytral shkala. Hardcoded emas, Tailwind orqali
        // markazlashtirilgan - shu bilan barcha sahifalarda bir xillik ta'minlanadi.
        accent: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#b9d1ff',
          300: '#8bb2ff',
          400: '#5c8eff',
          500: '#3366ff',
          600: '#254deb',
          700: '#1c3bc7',
          800: '#1a329e',
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
        success: { bg: '#e8f7ee', text: '#0f8a3c', dot: '#22c55e' },
        warning: { bg: '#fff6e5', text: '#a65f00', dot: '#f59e0b' },
        danger: { bg: '#fdeced', text: '#c81e3a', dot: '#ef4444' },
        info: { bg: '#eef4ff', text: '#2354d6', dot: '#3366ff' },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 18, 27, 0.04), 0 1px 12px rgba(16, 18, 27, 0.05)',
        pop: '0 8px 24px rgba(16, 18, 27, 0.12)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        fadeIn: 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
