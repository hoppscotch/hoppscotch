import { defineConfig } from "windicss/helpers"

export default defineConfig({
  theme: {
    container: {
      center: true,
    },
    extend: {
      inset: {
        upperPrimaryStickyFold: "var(--upper-primary-sticky-fold)",
        upperSecondaryStickyFold: "var(--upper-secondary-sticky-fold)",
        upperTertiaryStickyFold: "var(--upper-tertiary-sticky-fold)",
        lowerPrimaryStickyFold: "var(--lower-primary-sticky-fold)",
        lowerSecondaryStickyFold: "var(--lower-secondary-sticky-fold)",
        sidebarPrimaryStickyFold: "var(--sidebar-primary-sticky-fold)",
        sidebarSecondaryStickyFold: "var(--sidebar-secondary-sticky-fold)",
      },
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
        gradientFrom: "var(--gradient-from-color)",
        gradientVia: "var(--gradient-via-color)",
        gradientTo: "var(--gradient-to-color)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
        icon: "var(--font-icon)",
      },
      cursor: {
        nsResize: "ns-resize",
      },
    },
  },
})
