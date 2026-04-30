const { FlatCompat } = require("@eslint/eslintrc")
const js = require("@eslint/js")
const tsParser = require("@typescript-eslint/parser")
const typescriptEslintPlugin = require("@typescript-eslint/eslint-plugin")
const prettierPlugin = require("eslint-plugin-prettier")
const globals = require("globals")

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

module.exports = [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/*.d.ts",
      "eslint.config.cjs",
      ".prettierrc.cjs",
      "src/bootstrap-code/**",
    ],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ),
  {
    files: ["**/*.ts", "**/*.js"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      ecmaVersion: 2021,
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      semi: [2, "never"],
      "prettier/prettier": ["warn", { semi: false, trailingComma: "es5" }],
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]
