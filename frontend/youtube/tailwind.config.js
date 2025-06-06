/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "youtube-dark": "#0f0f0f",
        "youtube-dark-secondary": "#222222",
        "youtube-dark-tertiary": "#121212",
        "youtube-gray-primary": "#f1f1f1",
        "youtube-gray-secondary": "#aaa",
        "youtube-gray-border": "#303030",
        "youtube-red": "#FF0000",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
