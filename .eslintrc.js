module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    parser: "@babel/eslint-parser",
    sourceType: "module",
    requireConfigFile: false,
  },
  extends: [
    "@nuxtjs",
    "prettier/prettier",
    "eslint:recommended",
    "plugin:vue/recommended",
    "plugin:prettier/recommended",
    "plugin:nuxt/recommended",
  ],
  plugins: ["vue", "prettier"],
  // add your custom rules here
  rules: {
    semi: [2, "never"],
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "vue/max-attributes-per-line": "off",
    "vue/component-name-in-template-casing": ["error", "PascalCase"],
    "vue/html-self-closing": [
      "error",
      {
        html: {
          normal: "never",
          void: "always",
        },
      },
    ],
    "vue/singleline-html-element-content-newline": "off",
    "vue/multiline-html-element-content-newline": "off",
    "prettier/prettier": ["error", { semi: false }],
  },
  globals: {
    $nuxt: true,
  },
}
