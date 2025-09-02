/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  darkMode: "class", // wichtig für Dunkelmodus
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#fc0000ff", // z. B. Ferrari-Rot
          border: "#f3ebebff", // dunkleres Rot für Rahmen
          dark: "#1f1f1f", // Seitenhintergrund
          light: "#2d2d2d", // Panels/Karten
          text: "#e4e4e7", // heller Text
        },
      },
      fontFamily: {
        sans: ["'F1-Regular'", "Arial", "sans-serif"], // Beispiel
      },
    },
  },
  plugins: [],
};
