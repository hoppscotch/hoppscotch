import { Config } from "tailwindcss"
import { theme } from "tailwindcss/defaultConfig"

export default {
  content: [],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: "var(--primary-color)",
        primaryLight: "var(--primary-light-color)",
        primaryDark: "var(--primary-dark-color)",
        primaryContrast: "var(--primary-contrast-color)",
        secondary: "var(--secondary-color)",
        secondaryLight: "var(--secondary-light-color)",
        secondaryDark: "var(--secondary-dark-color)",
        accent: "var(--accent-color)",
        accentLight: "var(--accent-light-color)",
        accentDark: "var(--accent-dark-color)",
        accentContrast: "var(--accent-contrast-color)",
        divider: "var(--divider-color)",
        dividerLight: "var(--divider-light-color)",
        dividerDark: "var(--divider-dark-color)",
        bannerInfo: "var(--banner-info-color)",
        bannerWarning: "var(--banner-warning-color)",
        bannerError: "var(--banner-error-color)",
        tooltip: "var(--tooltip-color)",
        popover: "var(--popover-color)",
        gradientFrom: "var(--gradient-from-color)",
        gradientVia: "var(--gradient-via-color)",
        gradientTo: "var(--gradient-to-color)",
        dark: {
          50: "#4a4a4a",
          100: "#3c3c3c",
          200: "#323232",
          300: "#2d2d2d",
          400: "#222222",
          500: "#1f1f1f",
          600: "#1c1c1e",
          700: "#1b1b1b",
          800: "#181818",
          900: "#0f0f0f",
        },
        light: {
          50: "#fdfdfd",
        },
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        tiny: "var(--font-size-tiny)",
        body: "var(--font-size-body)",
      },
      lineHeight: {
        body: "var(--line-height-body)",
      },
      cursor: {
        nsResize: "ns-resize",
        grab: "grab",
        grabbing: "grabbing",
      },
      spacing: {
        0.25: "0.0625rem",
        0.75: "0.1875rem",
        20: "5rem",
        26: "6.5rem",
        46: "11.5rem",
      },
      minWidth: {
        4: "1rem",
        5: "1.25rem",
        20: "5rem",
        46: "11.5rem",
      },
      minHeight: {
        5: "1.25rem",
        46: "11.5rem",
      },
      maxWidth: {
        "1/2": "50%",
        "1/3": "33%",
        "3/4": "75%",
        46: "11.5rem",
      },
      maxHeight: {
        46: "11.5rem",
        sm: "24rem",
        md: "28rem",
        lg: "32rem",
      },
      backgroundOpacity: {
        15: "0.15",
      },
      screens: {
        "<sm": { max: "640px" },
      },
    },
  },
} satisfies Config
