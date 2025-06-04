module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#000000",
          "accent-1": "#181819",
          "accent-2": "#313134",
          "accent-3": "#494A4F",
          "gray-1": "#D5D5DA",
          "gray-2": "#C2C1C0",
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
