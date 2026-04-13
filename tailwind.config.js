/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:   '#ff771c',
          'orange-hover': '#e85f00',
          'orange-light': '#fff0e6',
          offwhite: '#f5ede0',
          black:    '#161311',
          blue:     '#546877',
          'blue-light': '#e8edf0',
        }
      }
    },
  },
  plugins: [],
}
