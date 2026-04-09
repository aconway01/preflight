/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        'ca-base':      '#0D1120',
        'ca-surface':   '#141926',
        'ca-surface-2': '#1C2333',
        'ca-border':    '#2A3347',

        // Text
        'ca-text':          '#E2E4EA',
        'ca-text-secondary':'#8B90A0',
        'ca-text-muted':    '#555F75',

        // Brand
        'ca-navy': '#1B2A4A',
        'ca-gold':  '#B8963E',

        // Verdict / status
        'ca-within':  '#4ADE80',
        'ca-marginal':'#FBBF24',
        'ca-below':   '#FB923C',
        'ca-hazard':  '#F87171',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['1.5rem',   { fontWeight: '600', lineHeight: '1.3' }],
        'title':   ['1.125rem', { fontWeight: '600', lineHeight: '1.4' }],
        'body':    ['1rem',     { fontWeight: '400', lineHeight: '1.6' }],
        'label':   ['0.875rem', { fontWeight: '500', lineHeight: '1.5' }],
        'small':   ['0.75rem',  { fontWeight: '400', lineHeight: '1.5' }],
        'mono':    ['0.875rem', { fontWeight: '400', lineHeight: '1.5' }],
      },
      spacing: {
        // 8pt grid tokens
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
      },
    },
  },
  plugins: [],
}
