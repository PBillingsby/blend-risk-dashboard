import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        blend: {
          green: '#6FBF6B',
          'dark-green': '#009959',
          'bg-primary': '#0C0C0C',
          'bg-secondary': '#1A1A1A',
          'bg-tertiary': '#2A2A2A',
          'text-primary': '#F5F5F5',
          'text-secondary': '#A0A0A0',
          'text-tertiary': '#7A7A7A',
          'border': '#2A2A2A',
          'border-secondary': '#333333',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;