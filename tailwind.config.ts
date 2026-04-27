import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   '#EE2D24',
        secondary: '#002B5B',
        success:   '#059669',
        warning:   '#D97706',
        info:      '#0EA5E9',
      },
      fontFamily: {
        sans:    ['Sarabun', 'sans-serif'],
        display: ['Kanit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
