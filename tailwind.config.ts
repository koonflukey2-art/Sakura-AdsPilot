import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        muted: 'hsl(var(--muted))',
        primary: 'hsl(var(--primary))',
        border: 'hsl(var(--border))'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(15,23,42,0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
