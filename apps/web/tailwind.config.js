/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F1F0EA",
        ink: "#10201C",
        moss: "#2F5D50",
        signal: "#E24B26",
        tag: "#F2C14E",
        line: "#D3D7CB",
        muted: "#6B7A72",
      },
      fontFamily: {
        sans: ["Instrument Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["Martian Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        lift: "0 1px 0 0 rgba(16,32,28,0.08), 0 12px 32px -20px rgba(16,32,28,0.35)",
      },
    },
  },
  plugins: [],
};
