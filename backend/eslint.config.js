const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "uploads/**",
      "logs/**",
      "server.log",
      "server.err",
      "eslint-results.json",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },

    rules: {
      // ---- enforced by project convention ----
      // All logging must go through utils/logger (winston), never console.
      "no-console": "error",
      // Deliberately warn (not error) so set-but-unused is visible during
      // development without failing CI; underscore-prefixed args are allowed
      // for Express/the lambda middleware signatures that require the arity.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-useless-escape": "error",
      eqeqeq: ["error", "always"],

      // ---- unreachable / dead code ----
      "no-unreachable": "error",
      "no-unused-expressions": "error",
      "no-unused-labels": "error",

      // ---- duplicate declarations / mistakes ----
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-dupe-class-members": "error",
      "no-duplicate-case": "error",
      "no-fallthrough": "error",
      "no-empty": ["error", { allowEmptyCatch: false }], // empty catch = swallowed errors
      "no-extra-boolean-cast": "error",
      "no-self-assign": "error",
      "no-shadow-restricted-names": "error",

      // ---- unsafe patterns ----
      "no-throw-literal": "error",
      "no-useless-catch": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-prototype-builtins": "error",

      // ---- async / await problems ----
      "no-async-promise-executor": "error",
      "no-return-await": "error",
    },
  },
];