/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#9a4600",
        "primary-container": "#b45309",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffedd5",
        "primary-fixed": "#fde68a",
        "primary-fixed-dim": "#fcd34d",
        "on-primary-fixed": "#451a03",
        secondary: "#785900",
        "secondary-container": "#a17700",
        "on-secondary": "#ffffff",
        "secondary-fixed": "#fef3c7",
        "secondary-fixed-dim": "#fde68a",
        tertiary: "#8c3b1a",
        "tertiary-container": "#a84b26",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffede5",
        background: "#fdfbf7",
        surface: "#fdfbf7",
        "surface-container": "#f5f0e8",
        "surface-container-low": "#faf6ef",
        "surface-container-high": "#eee8dc",
        "surface-container-highest": "#e7dfd1",
        "surface-container-lowest": "#ffffff",
        "surface-bright": "#fdfbf7",
        "surface-dim": "#dfd8cc",
        "on-surface": "#1f1b16",
        "on-surface-variant": "#52463a",
        "outline-variant": "#d6cbbd",
        outline: "#847667",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a"
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        display: ["Geist", "sans-serif"]
      }
    },
  },
  plugins: [],
}

