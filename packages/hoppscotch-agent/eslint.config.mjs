import pluginVue from "eslint-plugin-vue"
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"

export default defineConfigWithVueTs(
  {
    ignores: [
      "**/*.d.ts",
      "dist/**",
      "node_modules/**",
      "src-tauri/**",
    ],
  },
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.ts", "**/*.js", "**/*.vue"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: {
          jsx: false,
        },
      },
    },
    rules: {
      semi: [2, "never"],
      "no-console": "off",
      "no-debugger": process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
      "prettier/prettier":
        process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
      "vue/multi-word-component-names": "off",
      "vue/no-side-effects-in-computed-properties": "off",
      "@typescript-eslint/no-unused-vars": [
        process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
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
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-undef": "off",
    },
  }
)
