// type
console.log("tailwind.config.ts")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      inset: {
        "upper-primary-sticky-fold": "var(--upper-primary-sticky-fold)",
        "upper-secondary-sticky-fold": "var(--upper-secondary-sticky-fold)",
        "upper-tertiary-sticky-fold": "var(--upper-tertiary-sticky-fold)",
        "upper-mobile-primary-sticky-fold":
          "var(--upper-mobile-primary-sticky-fold)",
        "upper-mobile-secondary-sticky-fold":
          "var(--upper-mobile-secondary-sticky-fold)",
        "upper-mobile-sticky-fold": "var(--upper-mobile-sticky-fold)",
        "upper-mobile-tertiary-sticky-fold":
          "var(--upper-mobile-tertiary-sticky-fold)",
        "lower-primary-sticky-fold": "var(--lower-primary-sticky-fold)",
        "lower-secondary-sticky-fold": "var(--lower-secondary-sticky-fold)",
        "lower-tertiary-sticky-fold": "var(--lower-tertiary-sticky-fold)",
        "sidebar-primary-sticky-fold": "var(--sidebar-primary-sticky-fold)",
        "sidebar-secondary-sticky-fold": "var(--line-height-body)",
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
      padding: {
        0.75: "0.1875rem",
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
}
