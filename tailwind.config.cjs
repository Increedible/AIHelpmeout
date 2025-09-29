/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // we toggle .dark on <html>
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // central palette — tweak once, changes everywhere
        brand: {
          bg: 'var(--brand-bg)',
          panel: 'var(--brand-panel)',
          border: 'var(--brand-border)',
          text: 'var(--brand-text)',
          muted: 'var(--brand-muted)',
          primary: 'var(--brand-primary)',
          error: 'var(--brand-error)'
        }
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)'
      },
      borderRadius: {
        xl2: '1rem'
      }
    }
  },
  plugins: []
};
