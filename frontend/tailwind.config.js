/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wsp: {
          red:      "#ef3427",
          "red-dark": "#c8201a",
          dark:     "#313131",
          "dark-2": "#1e1e1e",
          mid:      "#4a4a4a",
          muted:    "#767676",
          border:   "#d8d8d8",
          "bg-soft":"#f5f4f2",
          "bg-card":"#fafafa",
        },
      },
      fontFamily: {
        display: ["'Barlow Semi Condensed'", "sans-serif"],
        body:    ["'Barlow'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
