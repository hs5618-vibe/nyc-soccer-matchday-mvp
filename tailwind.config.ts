import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#10141C",
          "black-deep": "#0A0D12",
          green: {
            50: "#EBF9F3",
            100: "#CCF2E0",
            400: "#40CF8A",
            500: "#00BF63",
            600: "#00A254",
            700: "#008A47",
            DEFAULT: "#00BF63",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;