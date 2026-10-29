import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f2",
          100: "#d8eee2",
          500: "#2f9e6e",
          600: "#23825a",
          700: "#1c6849",
        },
      },
    },
  },
  plugins: [],
};
export default config;
