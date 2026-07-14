/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        // 2026-07-14 Dizayn tizimi v2: har bir token CSS custom property orqali
        // aniqlanadi (index.css :root / .dark bloklari) - shu bilan BARCHA mavjud
        // sahifalar (ink-900, bg-surface va h.k. ishlatadigan) hech qanday alohida
        // "dark:" prefiksi qo'shmasdan avtomatik dark mode'ga moslashadi. Bu yagona,
        // markazlashtirilgan manba - rang ikki joyda alohida-alohida yozilmaydi.
        surface: 'var(--surface)',
        canvas: 'var(--canvas)',
        overlay: 'var(--overlay)',
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        ink: {
          50: 'var(--ink-50)',
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
        success: { bg: 'var(--success-bg)', text: 'var(--success-text)', dot: 'var(--success-dot)' },
        warning: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', dot: 'var(--warning-dot)' },
        danger: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', dot: 'var(--danger-dot)' },
        info: { bg: 'var(--info-bg)', text: 'var(--info-text)', dot: 'var(--info-dot)' },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '26px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 18, 27, 0.04), 0 1px 12px rgba(16, 18, 27, 0.05)',
        pop: '0 8px 24px rgba(16, 18, 27, 0.12)',
        modal: '0 16px 48px rgba(0, 0, 0, 0.22)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        overlayIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        toastIn: { from: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        popIn: { from: { opacity: 0, transform: 'scale(0.94)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        fadeIn: 'fadeIn 0.2s ease-out',
        sheetUp: 'sheetUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        overlayIn: 'overlayIn 0.2s ease-out',
        toastIn: 'toastIn 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        popIn: 'popIn 0.16s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
