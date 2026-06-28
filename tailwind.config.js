/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bloom: {
          primary: '#4DB6AC',
          surface: '#E0F2F1',
          light: '#B2DFDB',
          dark: '#00796B',
          darker: '#00695C',
          white: '#FFFFFF',
          text: '#1A1A1A',
          muted: '#6B7280',
          amber: '#F59E0B',
          red: '#EF4444',
        },
      },
    },
  },
  plugins: [],
};
