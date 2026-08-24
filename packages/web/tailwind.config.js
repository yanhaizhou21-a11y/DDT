/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F6F4EE',
        ink: {
          DEFAULT: '#232019',
          soft: '#6B6455',
        },
        ledger: {
          blue: '#2F4858',
          hover: '#233744',
          light: '#E5EBF0',
        },
        stamp: {
          red: '#A83A34',
          light: '#F8EAE9',
        },
        rule: '#DDD7C7',
        card: '#FFFDF8',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
