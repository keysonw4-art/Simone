import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/** Strict checks for shared backend packages and their local scripts. */
export const serverConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
