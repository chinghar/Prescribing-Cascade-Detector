import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        // Base font is set to 18px on <html>; these are relative to that.
        base: ["1rem", "1.6"],
        lg: ["1.25rem", "1.6"],
        xl: ["1.5rem", "1.5"],
        "2xl": ["1.875rem", "1.4"],
      },
      colors: {
        // AAA contrast (>=7:1) against a white background at these weights,
        // verified with a manual contrast check — see README accessibility notes.
        ink: "#111111",
        "ink-muted": "#3f3f3f",
        brand: "#0b3d91",
        "brand-dark": "#062a66",
        surface: "#ffffff",
        "surface-alt": "#f4f6f9",
        border: "#5c6470",
        danger: "#7a1f1f",
      },
    },
  },
};

export default config;
