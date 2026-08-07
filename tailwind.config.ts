import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      /**
       * Colors
       * Uses CSS variables + Tailwind alpha system
       * Enables: bg-primary/90, text-secondary/70, etc.
       */
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",

        popover: "hsl(var(--popover) / <alpha-value>)",
        "popover-foreground": "hsl(var(--popover-foreground) / <alpha-value>)",

        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",

        secondary: "hsl(var(--secondary) / <alpha-value>)",
        "secondary-foreground":
          "hsl(var(--secondary-foreground) / <alpha-value>)",

        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",

        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--accent-foreground) / <alpha-value>)",

        destructive: "hsl(var(--destructive) / <alpha-value>)",
        "destructive-foreground":
          "hsl(var(--destructive-foreground) / <alpha-value>)",

        success: "hsl(var(--success) / <alpha-value>)",
        "success-foreground": "hsl(var(--success-foreground) / <alpha-value>)",

        warning: "hsl(var(--warning) / <alpha-value>)",
        "warning-foreground": "hsl(var(--warning-foreground) / <alpha-value>)",

        info: "hsl(var(--info) / <alpha-value>)",
        "info-foreground": "hsl(var(--info-foreground) / <alpha-value>)",

        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground":
            "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":
            "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        epm: {
          icon: "hsl(var(--epm-icon) / <alpha-value>)",
          circle: "hsl(var(--epm-circle) / <alpha-value>)",
          background: {
            start: "hsl(var(--epm-background-start) / <alpha-value>)",
            middle: "hsl(var(--epm-background-middle) / <alpha-value>)",
            end: "hsl(var(--epm-background-end) / <alpha-value>)",
          },

          gradient: {
            start: "hsl(var(--epm-gradient-start) / <alpha-value>)",
            middle: "hsl(var(--epm-gradient-middle) / <alpha-value>)",
            end: "hsl(var(--epm-gradient-end) / <alpha-value>)",
          },
        },

        login: {
          circle: "hsl(var(--login-circle) / <alpha-value>)",
          "right-panel-1": "hsl(222 47% 11% / <alpha-value>)",
          "right-panel-2": "hsl(221 65% 13% / <alpha-value>)",
          "right-panel-3": "hsl(221 72% 11% / <alpha-value>)",
          "right-panel-4": "hsl(222 70% 15% / <alpha-value>)",
          "right-panel-5": "hsl(220 92% 5% / <alpha-value>)",
        },
      },

      /**
       * Radius
       */
      borderRadius: {
        theme: "var(--radius)",
      },

      /**
       * Fonts
       */
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
} satisfies Config;

export default config;
