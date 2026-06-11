import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#2A9D8F',
          deep: '#1E7268',
        },
        orange: {
          DEFAULT: '#F97316',
        },
        dark: '#3A372F',
        line: '#EFEDE8',
      },
      borderRadius: {
        btn: '10px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
