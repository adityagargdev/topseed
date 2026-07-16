/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // accent palette — kept as literals for Tailwind utilities like ring-*, shadow-*
        pink:   { 400: '#f472b6', 500: '#ec4899', 600: '#db2777' },
        violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        sky:    { 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9' },
        indigo: { 400: '#818cf8', 500: '#5b7cff', 600: '#4f46e5' },
        cyan:   { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
      },
      fontFamily: {
        sans:    ['Sora', 'ui-sans-serif', 'system-ui'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['Sora', 'ui-sans-serif'],
      },
      backgroundSize: {
        '400': '400% 400%',
      },
      animation: {
        'grad-shift': 'gradShift 5s ease infinite',
        'blob1':      'blobDrift1 25s ease-in-out infinite',
        'blob2':      'blobDrift2 30s ease-in-out infinite',
        'blob3':      'blobDrift3 20s ease-in-out infinite',
        'ticker':     'ticker 35s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        gradShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        blobDrift1: {
          '0%':   { transform: 'translate(0,0) scale(1)' },
          '33%':  { transform: 'translate(-60px,40px) scale(1.08)' },
          '66%':  { transform: 'translate(40px,-30px) scale(0.95)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        blobDrift2: {
          '0%':   { transform: 'translate(0,0) scale(1)' },
          '40%':  { transform: 'translate(50px,-45px) scale(1.1)' },
          '80%':  { transform: 'translate(-35px,30px) scale(0.92)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        blobDrift3: {
          '0%':   { transform: 'translate(0,0) scale(1)' },
          '35%':  { transform: 'translate(-45px,35px) scale(0.95)' },
          '70%':  { transform: 'translate(55px,-25px) scale(1.06)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
