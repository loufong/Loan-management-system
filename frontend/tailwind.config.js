/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Kantumruy Pro"', 'sans-serif'],
        khmer: ['"Kantumruy Pro"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#F0F5FF',
          100: '#E0EBFF',
          200: '#C7D8FE',
          300: '#94B4FB',
          400: '#5F8EF6',
          500: '#0052FF',
          600: '#0040C1',
          700: '#003399',
          800: '#0A2570',
          900: '#0B132B',
          950: '#060B18',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
