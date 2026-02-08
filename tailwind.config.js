/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        cream: '#FDFCF8',
        'primary-black': '#1A1A1A',
        'accent-sage': '#E6F0EB',
        'accent-muted': '#F3F4F6',
      }
    },
  },
  plugins: [],
}
