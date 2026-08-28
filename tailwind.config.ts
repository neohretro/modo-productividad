import type { Config } from 'tailwindcss'

/**
 * Tokens del sistema MODO CREADOR - Productividad (ver PLAN.md §3).
 * Negro casi puro + blanco hueso + naranja como único acento activo.
 */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#070707',
          glass: 'rgba(244,243,239,0.04)',
          'glass-strong': 'rgba(244,243,239,0.07)'
        },
        border: 'rgba(244,243,239,0.10)',
        paper: {
          DEFAULT: '#F4F3EF',
          dim: 'rgba(244,243,239,0.55)'
        },
        orange: {
          DEFAULT: '#FF8C00',
          glow: 'rgba(255,140,0,0.18)'
        }
      },
      fontFamily: {
        display: ['"Aptos Display"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Aptos', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '22px',
        chip: '14px'
      },
      backdropBlur: {
        glass: '20px'
      },
      boxShadow: {
        glass: '0 8px 40px rgba(0,0,0,0.45)',
        'orange-glow': '0 0 40px rgba(255,140,0,0.18)'
      },
      transitionTimingFunction: {
        // curvas suaves, sin rebotes (Brand OS 2026)
        modo: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
} satisfies Config
