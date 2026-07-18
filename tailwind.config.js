/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fundo — tons de pergaminho / papel envelhecido
        parchment: {
          DEFAULT: '#F9F6F0',
          light: '#FFFDF9',
          dark: '#EFE8DA',
          aged: '#EFEBE0', // usado na caixa de Termos de Locação (efeito documento antigo)
        },
        // Madeira — usada em cards, headers, molduras
        wood: {
          50: '#F5EFE6',
          100: '#E8DBC5',
          200: '#D3BB94',
          300: '#B8935F',
          400: '#8B6239',
          500: '#6B4A2C', // madeira principal
          600: '#523823',
          700: '#3E2A1A',
          800: '#2C1D11', // texto marrom escuro principal
          900: '#1A110A',
        },
        // Verde musgo — destaque primário (ações, links, badges)
        moss: {
          50: '#EEF1EA',
          100: '#D6DDC9',
          200: '#B3C29B',
          300: '#8CA46E',
          400: '#6C8750',
          500: '#4F6B39', // musgo principal
          600: '#3D5329',
          700: '#2E3E1F',
          800: '#202B16',
          900: '#141A0D',
        },
        // Terracota — destaque secundário (alertas, CTAs de aluguel)
        terracotta: {
          50: '#FBEFE9',
          100: '#F3D3C3',
          200: '#E7AC8B',
          300: '#D9825A',
          400: '#C6613A',
          500: '#B04A28', // terracota principal
          600: '#8C3A20',
          700: '#6A2C18',
          800: '#481E10',
          900: '#2B1209',
        },
      },
      fontFamily: {
        // Serifada clássica — títulos, headers, nomes de livros
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        // Sans-serif — corpo de texto, UI, formulários
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': "url('/src/assets/paper-texture.png')",
      },
      boxShadow: {
        shelf: '0 4px 12px -2px rgba(44, 29, 17, 0.15), 0 2px 4px -1px rgba(44, 29, 17, 0.1)',
        embossed: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(44,29,17,0.15)',
      },
      borderRadius: {
        book: '2px 6px 6px 2px', // lombada de livro
      },
    },
  },
  plugins: [],
};
