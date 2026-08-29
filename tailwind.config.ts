import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15131b",
        cream: "#f8f7fb",
        violet: {
          50: "#f5f2ff",
          100: "#ebe4ff",
          200: "#d9ccff",
          300: "#bba3ff",
          400: "#9a72ff",
          500: "#7c3ff2",
          600: "#692bd5",
          700: "#5723ad",
          800: "#49218d",
          900: "#3d1d73"
        }
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(34, 22, 62, .28)",
        glow: "0 12px 30px -12px rgba(124, 63, 242, .45)"
      }
    }
  },
  plugins: [forms]
};

export default config;
