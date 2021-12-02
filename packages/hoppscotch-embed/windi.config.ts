import { defineConfig } from "windicss/helpers"

export default defineConfig({
  darkMode: "class",
  // https://windicss.org/posts/v30.html#attributify-mode
  attributify: true,
  theme: {
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
      accentContrast: "var(--accent-contrast-color)",
      divider: "var(--divider-color)",
      dividerLight: "var(--divider-light-color)",
      dividerDark: "var(--divider-dark-color)",
      error: "var(--error-color)",
      tooltip: "var(--tooltip-color)",
      popover: "var(--popover-color)",
    },
    extend: {
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
    },
  },
})
