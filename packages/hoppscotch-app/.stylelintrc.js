module.exports = {
  ignoreFiles: ["/**/*.vue"],
  customSyntax: "postcss-html",
  extends: [
    "stylelint-config-standard",
    "stylelint-config-prettier",
    "stylelint-config-standard-scss",
    "stylelint-config-recommended-vue",
  ],
  defaultSeverity: "warning",
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "extends",
          "apply",
          "variants",
          "responsive",
          "screen",
          "mixin",
          "include",
        ],
      },
    ],
    "declaration-block-trailing-semicolon": null,
    "no-descending-specificity": null,
    "selector-class-pattern": null,
    "selector-id-pattern": null,
  },
}
