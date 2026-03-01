import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...typescriptPlugin.configs.recommended.rules,

      // React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Import sorting
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",

      // Prevent nested ternary operators for better readability
      "no-nested-ternary": "error",

      // Disable TypeScript comment and any rules for generated API client files
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Custom rules to enforce using internationalized navigation
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Please use Link from '@/lib/i18n/navigation' instead of 'next/link' for internationalization support.",
            },
            {
              name: "next/router",
              message:
                "Please use router from '@/lib/i18n/navigation' instead of 'next/router' for internationalization support.",
            },
            {
              name: "@/lib/api/client",
              message:
                "Please use functions from '@/lib/api/api-wrapper' instead of importing directly from '@/lib/api/client'. The api-wrapper provides a cleaner interface and better error handling.",
            },
          ],
          patterns: [
            {
              group: ["next/navigation"],
              importNames: ["redirect", "usePathname", "useRouter"],
              message:
                "Please use redirect, usePathname, useRouter from '@/lib/i18n/navigation' instead of 'next/navigation' for internationalization support.",
            },
          ],
        },
      ],

      // Common JavaScript rules
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
];

export default eslintConfig;