import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "420px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        camera: "0 24px 70px rgba(0, 0, 0, 0.4)",
        inset: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
      keyframes: {
        "film-wind": {
          "0%": { transform: "translateX(-18%) rotate(-2deg)" },
          "45%": { transform: "translateX(10%) rotate(2deg)" },
          "100%": { transform: "translateX(0%) rotate(0deg)" },
        },
        "shutter-flash": {
          "0%, 100%": { opacity: "0" },
          "16%": { opacity: "0.75" },
        },
      },
      animation: {
        "film-wind": "film-wind 720ms cubic-bezier(.2,.8,.2,1)",
        "shutter-flash": "shutter-flash 520ms ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
