module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    sourceType: "module",
    requireConfigFile: false,
  },
  extends: [
    "@nuxtjs",
    "@nuxtjs/eslint-config-typescript",
    "prettier/prettier",
    "eslint:recommended",
    "plugin:vue/recommended",
    "plugin:prettier/recommended",
    "plugin:nuxt/recommended",
  ],
  ignorePatterns: ["helpers/backend/graphql.ts"],
  plugins: ["vue", "prettier"],
  // add your custom rules here
  rules: {
    semi: [2, "never"],
    "import/named": "off", // because, named import issue with typescript see: https://github.com/typescript-eslint/typescript-eslint/issues/154
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
    "vue/require-default-prop": "warn",
    "vue/require-prop-types": "warn",
    "vue/multi-word-component-names": "off",
    "prettier/prettier": ["warn", { semi: false }],
    "import/no-named-as-default": "off",
    "import/prefer-default-export": "off",
    "import/no-named-as-default-member": "off",
    "import/default": "off",
    "no-undef": "off",
    // localStorage block
    "no-restricted-globals": [
      "error",
      {
        name: "localStorage",
        message:
          "Do not use 'localStorage' directly. Please use localpersistence.ts functions or stores",
      },
    ],
    // window.localStorage block
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.object.property.name='localStorage']",
        message:
          "Do not use 'localStorage' directly. Please use localpersistence.ts functions or stores",
      },
    ],
  },
  globals: {
    $nuxt: true,
  },
}
