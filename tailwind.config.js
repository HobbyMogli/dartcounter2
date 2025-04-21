import { colors } from './src/styles/theme/colors'; // Import the SSOT

/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: colors.primary,
          success: colors.success,
          warning: colors.warning,
          error: colors.error,
          neon: colors.neon,
          dark: colors.dark,
          darts: colors.darts
        },
        boxShadowColor: {
          'neon-blue': colors.neon.blue,
          'neon-pink': colors.neon.pink,
          'neon-red': colors.neon.red,
          'neon-lime': colors.neon.lime,
          'neon-orange': colors.neon.orange,
        },
        boxShadow: {
          'neon-blue-inactive': `0 0 8px ${colors.neon.blue}66`,
          'neon-blue-active': `0 0 15px ${colors.neon.blue}, 0 0 30px ${colors.neon.blue}80`,
          'neon-pink': `0 0 10px ${colors.neon.pink}, 0 0 20px ${colors.neon.pink}4D`,
          'neon-red': `0 0 10px ${colors.neon.red}, 0 0 20px ${colors.neon.red}4D`,
          'inset-neon-blue': `inset 0 0 8px 0 ${colors.neon.blue}`,
          'inset-darts-double': `inset 0 0 12px 0 ${colors.darts.double}`,
          'inset-darts-triple': `inset 0 0 16px 0 ${colors.darts.triple}`,
        },
        textShadow: {
          DEFAULT: '0 2px 5px rgba(0, 0, 0, 0.5)',
          'glow-blue': `0 0 8px ${colors.neon.blue}`,
        },
      },
    },
    plugins: [
      require('tailwindcss-textshadow')
    ],
  }