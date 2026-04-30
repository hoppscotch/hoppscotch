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
      "static/**",
      "src/api/generated/**",
      "**/*.d.ts",
      "types/**",
      "dist/**",
      "node_modules/**",
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
      "import/named": "off",
      "no-console": "off",
      "no-debugger": process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
      "prettier/prettier":
        process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
      "vue/multi-word-component-names": "off",
      "vue/no-side-effects-in-computed-properties": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "@typescript-eslint/no-unused-vars": [
        process.env.HOPP_LINT_FOR_PROD === "true" ? "error" : "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "import/default": "off",
      "no-undef": "off",
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message:
            "Do not use 'localStorage' directly. Please use the PersistenceService",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.property.name='localStorage']",
          message:
            "Do not use 'localStorage' directly. Please use the PersistenceService",
        },
      ],
    },
  }
)
