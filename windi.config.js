import { defineConfig } from "windicss/helpers"

export default defineConfig({
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
        secondaryDark: "var(--secondary-dark-color)",
        accent: "var(--accent-color)",
        accentLight: "var(--accent-light-color)",
        accentDark: "var(--accent-dark-color)",
        divider: "var(--divider-color)",
        dividerLight: "var(--divider-light-color)",
        dividerDark: "var(--divider-dark-color)",
        error: "var(--error-color)",
        tooltip: "var(--tooltip-color)",
        gradientFrom: "var(--gradient-from-color)",
        gradientVia: "var(--gradient-via-color)",
        gradientTo: "var(--gradient-to-color)",
      },
    },
    fontFamily: {
      sans: "var(--font-sans)",
      mono: "var(--font-mono)",
      icon: "var(--font-icon)",
    },
  },
})
