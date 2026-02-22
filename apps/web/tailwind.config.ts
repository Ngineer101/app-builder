import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A0F",
          900: "#0B1020",
          800: "#101a33",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
