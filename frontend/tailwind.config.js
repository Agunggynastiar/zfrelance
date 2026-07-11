/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 400:'#48be8a', 500:'#25a26e', 700:'#156849', 900:'#0d3320' },
        dark:  { 600:'#1e3326', 700:'#17261c', 800:'#111a15', 900:'#0a0f0d' }
      },
      fontFamily: { display:['Inter','sans-serif'], mono:['JetBrains Mono','monospace'] }
    },
  },
  plugins: [],
}