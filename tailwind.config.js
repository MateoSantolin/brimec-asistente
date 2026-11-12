/** @type {import('tailwindcss').Config} */
// Paleta y tipografia extraidas de https://brimec.com.ar (variables globales --ast-global-color-*)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brimec: {
          primary: '#0084D6',      // --ast-global-color-0
          'primary-dark': '#0075BE', // --ast-global-color-1
          navy: '#243673',         // --ast-global-color-6
          'navy-deep': '#1A2854',  // derivado para sidebar/gradientes
          soft: '#BFD1FF',         // --ast-global-color-8
          surface: '#F5F7F9',      // --ast-global-color-4
          'surface-alt': '#FBFCFF',// --ast-global-color-7
          ink: '#333333',          // --ast-global-color-3
          border: '#E2E2E2',
          steel: '#8A95A5',        // gris acero del logo (brida)
        },
        estado: {
          pendiente: '#64748B',
          corte: '#0EA5E9',
          mecanizado: '#0084D6',
          tratamiento: '#7C3AED',
          calidad: '#D97706',
          finalizado: '#059669',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(36,54,115,.06), 0 8px 24px -12px rgba(36,54,115,.18)',
        float: '0 12px 40px -12px rgba(36,54,115,.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-left': {
          '0%': { opacity: '0', transform: 'translateX(14px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(0,132,214,.55)' },
          '70%': { boxShadow: '0 0 0 14px rgba(0,132,214,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0,132,214,0)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '.45' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        'bar-grow': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .3s ease both',
        'slide-left': 'slide-left .3s cubic-bezier(.22,1,.36,1) both',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'bounce-dot': 'bounce-dot 1.2s ease-in-out infinite',
        'bar-grow': 'bar-grow .6s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
