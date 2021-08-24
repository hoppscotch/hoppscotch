import { defineConfig } from "windicss/helpers"

export default defineConfig({
  dark: "class",
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: "var(--primary-color)",
        primaryLight: "var(--primary-light-color)",
        primaryDark: "var(--primary-dark-color)",
        secondary: "var(--secondary-color)",
        secondaryLight: "var(--secondary-light-color)",
        accent: "var(--accent-color)",
        divider: "var(--divider-color)",
        error: "var(--error-color)",
        tooltip: "var(--tooltip-color)",
      },
    },
    fontFamily: {
      sans: "var(--font-sans)",
      mono: "var(--font-mono)",
      icon: "var(--font-icon)",
    },
  },
})
