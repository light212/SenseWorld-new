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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ['SF Pro Display', 'Helvetica Neue', 'Helvetica', 'Arial', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
export default config;
