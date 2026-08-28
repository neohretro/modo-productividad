import type { Config } from 'tailwindcss'

/**
 * Tokens del sistema MODO CREADOR - Productividad (ver PLAN.md §3 + tokens.css).
 * Los valores viven en CSS custom properties y cambian con el tema (claro/oscuro).
 * Acento naranja = único color de marca. Soft UI: muy redondeado, sombras suaves.
 */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/renderer/index.html', './src/renderer/mini.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          glass: 'var(--ink-glass)',
          'glass-strong': 'var(--ink-glass-strong)'
        },
        border: {
          DEFAULT: 'var(--border)',
          hi: 'var(--border-hi)'
        },
        paper: {
          DEFAULT: 'var(--paper)',
          dim: 'var(--paper-dim)'
        },
        frost: 'var(--frost)',
        orange: {
          DEFAULT: 'var(--orange)',
          soft: 'var(--orange-soft)',
          glow: 'var(--orange-glow)'
        },
        onaccent: 'var(--on-accent)'
      },
      fontFamily: {
        display: ['"Aptos Display"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Aptos', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '26px',
        chip: '16px',
        pill: '999px'
      },
      transitionTimingFunction: {
        modo: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
} satisfies Config
