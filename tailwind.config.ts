import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        basalt: "#0F0E0C",
        bone: "#E9E3D6",
        ash: "#A9A397",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Georgia", "serif"],
      },
      letterSpacing: {
        label: "0.2em",
        wide2: "0.34em",
      },
    },
  },
  plugins: [],
} satisfies Config;
