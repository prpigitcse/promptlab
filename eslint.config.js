import js from "@eslint/js";

export default [
  {
    files: ["js/**/*.js"],
    ignores: ["js/**/*.min.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        localStorage: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        Event: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "no-console": "warn",
      semi: ["error", "always"],
      quotes: ["error", "double"],
      indent: ["error", 2],
      "no-multiple-empty-lines": ["error", { max: 2 }],
      "eol-last": ["error", "always"],
    },
  },
];
