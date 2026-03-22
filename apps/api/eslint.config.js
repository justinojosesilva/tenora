import { baseConfig } from "@tenora/eslint-config/base";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Regras específicas da api aqui se necessário
    },
  },
];
