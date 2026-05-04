/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'itv-bg': '#0f172a',    // Fondo azul oscuro
        'itv-card': '#1e293b',  // Gris/azul para tarjetas
        'itv-blue': '#3b82f6',  // Azul botones
      },
    },
  },
  plugins: [],
}