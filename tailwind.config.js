/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#9e001f",
        "primary-container": "#c8102e",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffdad8",
        "secondary": "#ba0037",
        "secondary-container": "#e70648",
        "on-secondary": "#ffffff",
        "tertiary": "#00517d",
        "tertiary-container": "#006aa1",
        "tertiary-fixed": "#cce5ff",
        "on-tertiary-fixed-variant": "#004b73",
        "background": "#f9f9ff",
        "surface": "#f9f9ff",
        "surface-dim": "#cfdaf2",
        "surface-bright": "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff",
        "surface-container": "#e7eeff",
        "surface-container-high": "#dee8ff",
        "surface-container-highest": "#d8e3fb",
        "on-surface": "#111c2d",
        "on-surface-variant": "#5c403f",
        "outline": "#906f6e",
        "outline-variant": "#e5bdbb",
        "error": "#ba1a1a",
        "error-container": "#ffdad6"
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        "headline-lg": ["Montserrat", "sans-serif"],
        "headline-md": ["Montserrat", "sans-serif"],
        "headline-sm": ["Montserrat", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-lg": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"]
      }
    }
  },
  plugins: [],
}
