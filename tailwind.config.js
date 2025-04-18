/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          neon: {
            blue: '#00f2ff',
            pink: '#ff00ff',
            red: '#ff0033',
          },
          dark: {
            900: '#121212',
            800: '#1a1a1a',
            700: '#242424',
            600: '#2d2d2d',
          },
        },
        boxShadow: {
          'neon-blue': '0 0 10px #00f2ff, 0 0 20px rgba(0, 242, 255, 0.3)',
          'neon-pink': '0 0 10px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)',
          'neon-red': '0 0 10px #ff0033, 0 0 20px rgba(255, 0, 51, 0.3)',
        },
      },
    },
    plugins: [],
  }