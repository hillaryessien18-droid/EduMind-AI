/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        navy: { 900: "#0F1535", 800: "#161D45", 700: "#1E2657" },
        brand: {
          50: "#EEF0FF", 100: "#E0E4FF", 200: "#C7CDFE", 300: "#A5ACFC",
          400: "#8187F8", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA",
        },
        accent: { 500: "#8B5CF6", 600: "#7C3AED" },
        canvas: "#ECEBF7",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        shell: "0 20px 60px -20px rgba(49, 46, 129, 0.18)",
      },
    },
  },
  plugins: [],
};
