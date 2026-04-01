import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin"
import prettierPlugin from "eslint-plugin-prettier"
import globals from "globals"

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/*.d.ts",
      "vite.config.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptEslintPlugin.configs.recommended.rules,
      "prettier/prettier": "warn",
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
