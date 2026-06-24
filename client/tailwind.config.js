/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        deva: ['"Noto Sans Devanagari"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.25), 0 10px 40px -10px rgba(99,102,241,0.45)',
        card: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -12px rgba(15,23,42,0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #06B6D4 100%)',
        'mesh': 'radial-gradient(at 0% 0%, rgba(99,102,241,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6,182,212,0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139,92,246,0.15) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
