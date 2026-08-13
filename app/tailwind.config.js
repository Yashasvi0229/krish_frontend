/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary blue per spec section 2.1
        primary: {
          DEFAULT: '#1F4E79',
          50: '#EDF2F7',
          100: '#D6E3EE',
          200: '#AFC7DD',
          300: '#87ABCC',
          400: '#5F8EBB',
          500: '#3872AA',
          600: '#1F4E79',
          700: '#183E60',
          800: '#122E48',
          900: '#0C1F30',
        },
        // Accent lighter blue
        accent: {
          DEFAULT: '#3B82C4',
          light: '#5A9BD4',
        },
        // Status colors per spec section 2.3
        success: '#16A34A',
        warning: '#EAB308',
        error: '#DC2626',
        flagged: '#F97316',
        processing: '#2563EB',
        draft: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Per spec 2.1
        h1: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        small: ['12px', { lineHeight: '16px' }],
      },
      spacing: {
        // 4px/8px grid per spec
        '18': '4.5rem', // 72px for action bar
        '16': '4rem', // 64px for topnav
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
