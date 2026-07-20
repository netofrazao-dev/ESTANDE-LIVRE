/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pergaminho: {
          DEFAULT: '#F9F6F0',
          dark: '#F0EBDF',
          darker: '#E8E1D0',
        },
        cafe: {
          DEFAULT: '#3E2723',
          light: '#5D4037',
          soft: '#795548',
        },
        musgo: {
          DEFAULT: '#5A6E4A',
          dark: '#3F4E33',
          light: '#8AA070',
        },
        terracota: {
          DEFAULT: '#B85C3E',
          dark: '#8F4530',
          light: '#D07A5C',
        },
        sepia: {
          DEFAULT: '#8B6F47',
          light: '#B8956A',
          dark: '#5C4A2E',
        },
        pergaminho_ink: '#2A1E1B',
      },
      fontFamily: {
        display: ['Playfair Display', 'Merriweather', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2' }],
        'eyebrow': ['0.75rem', { lineHeight: '1', letterSpacing: '0.25em' }],
      },
      boxShadow: {
        'book': '0 1px 2px rgba(62,39,35,0.08), 0 4px 12px rgba(62,39,35,0.06)',
        'book-hover': '0 8px 16px rgba(62,39,35,0.12), 0 20px 40px rgba(62,39,35,0.10)',
        'shelf': 'inset 0 -2px 0 rgba(139,111,71,0.2)',
        'card': '0 1px 3px rgba(62,39,35,0.08)',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      animation: {
        'shelf-rise': 'shelfRise 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up': 'fadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        'stamp': 'stamp 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shelfRise: {
          '0%': { transform: 'translateY(0)', boxShadow: '0 1px 2px rgba(62,39,35,0.08)' },
          '100%': { transform: 'translateY(-6px)', boxShadow: '0 20px 40px rgba(62,39,35,0.15)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        stamp: {
          '0%': { transform: 'scale(0.8) rotate(-8deg)', opacity: 0 },
          '100%': { transform: 'scale(1) rotate(-4deg)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
