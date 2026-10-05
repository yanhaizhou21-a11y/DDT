/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="kinetic"]'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-tint': 'var(--paper-tint)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          muted: 'var(--ink-muted)',
        },
        ledger: {
          blue: 'var(--ledger-blue)',
          hover: 'var(--ledger-hover)',
          light: 'var(--ledger-light)',
        },
        stamp: {
          red: 'var(--stamp-red)',
          light: 'var(--stamp-light)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          light: 'var(--rule-light)',
        },
        card: {
          DEFAULT: 'var(--card)',
          surface: 'var(--card-surface)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          light: 'var(--gold-light)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        'neo-accent': '#FF6B6B',
        'neo-secondary': '#FFD93D',
        'neo-muted': '#C4B5FD',
        'swiss-accent': '#FF3000',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        neo: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        swiss: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        card: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        lift: '0 6px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'neo-sm': '4px 4px 0px 0px #000000',
        'neo-md': '8px 8px 0px 0px #000000',
        'neo-lg': '12px 12px 0px 0px #000000',
        'neo-xl': '16px 16px 0px 0px #000000',
      },
    },
  },
  plugins: [],
}

