module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#17151D",
          "accent-1": "#1B1E2A",
          "accent-2": "#24273F",
          "accent-3": "#2E334E",
          green: "#1DB954",
          "green-dark": "#019836",
          red: "#FF0000",
          "red-dark": "#DF0000",
          yellow: "#c4c400",
          "yellow-dark": "#b1b100",
        },
      },

      fontFamily: {
        cascadia: ["Cascadia Code", "monospace"],
      },
    },
  },
  plugins: [],
};
