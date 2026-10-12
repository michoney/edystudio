/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        schibsted: ['"Schibsted Grotesk"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        noto: ['"Noto Sans"', 'sans-serif'],
        fustat: ['Fustat', 'sans-serif'],
      },
      letterSpacing: {
        navlogo: '-0.06em',
        navlink: '-0.0125em',
        headline: '-0.06em',
        subhead: '-0.02em',
      },
    },
  },
  plugins: [],
};
