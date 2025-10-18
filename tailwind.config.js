module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        "soft-md": "0 18px 40px -20px rgba(14, 165, 233, 0.45)",
        "soft-lg": "0 28px 80px -30px rgba(14, 165, 233, 0.35)",
      },
      backgroundImage: {
        "radial-sky": "radial-gradient(circle at 50% 120%, rgba(56, 189, 248, 0.1), rgba(59, 130, 246, 0))",
      },
    },
    container: {
      center: true,
    },
  },
  plugins: [],
};
