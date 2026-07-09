import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F7F4",
        surfaceRaised: "#FFFFFF",
        ink: "#1B1D1F",
        muted: "#6B6F76",
        line: "#E4E4E1",
        accent: {
          DEFAULT: "#0E7C66",
          hover: "#0B6553",
          soft: "#E4F2EE",
        },
        note: {
          DEFAULT: "#B7791F",
          soft: "#FBF1DF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
