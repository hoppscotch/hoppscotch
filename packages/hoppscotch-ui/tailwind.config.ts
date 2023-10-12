import { Config } from "tailwindcss"

export default {
  content: ["**/*.vue"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      inset: {
        upperPrimaryStickyFold: "var(--upper-primary-sticky-fold)",
        upperSecondaryStickyFold: "var(--upper-secondary-sticky-fold)",
        upperTertiaryStickyFold: "var(--upper-tertiary-sticky-fold)",
        upperFourthStickyFold: "var(--upper-fourth-sticky-fold)",
        upperMobilePrimaryStickyFold: "var(--upper-mobile-primary-sticky-fold)",
        upperMobileSecondaryStickyFold:
          "var(--upper-mobile-secondary-sticky-fold)",
        upperMobileStickyFold: "var(--upper-mobile-sticky-fold)",
        upperMobileTertiaryStickyFold:
          "var(--upper-mobile-tertiary-sticky-fold)",
        lowerPrimaryStickyFold: "var(--lower-primary-sticky-fold)",
        lowerSecondaryStickyFold: "var(--lower-secondary-sticky-fold)",
        lowerTertiaryStickyFold: "var(--lower-tertiary-sticky-fold)",
        lowerFourthStickyFold: "var(--lower-fourth-sticky-fold)",
        sidebarPrimaryStickyFold: "var(--sidebar-primary-sticky-fold)",
        sidebarSecondaryStickyFold: "var(--line-height-body)",
      },
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
        error: "var(--error-color)",
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
        icon: "var(--font-icon)",
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
      height: {
        0.25: "0.0625rem",
        46: "11.5rem",
      },
      width: {
        0.25: "0.0625rem",
        46: "11.5rem",
      },
      minWidth: {
        4: "1rem",
        5: "1.25rem",
      },
      minHeight: {
        5: "1.25rem",
      },
      maxHeight: {
        46: "11.5rem",
      },
    },
    screens: {
      "2xl": { min: "1535px" },
      xl: { min: "1279px" },
      lg: { min: "1023px" },
      md: { min: "767px" },
      sm: { min: "639px" },
      "<2xl": { max: "1535px" },
      "<xl": { max: "1279px" },
      "<lg": { max: "1023px" },
      "<md": { max: "767px" },
      "<sm": { max: "639px" },
    },
  },
} satisfies Config
