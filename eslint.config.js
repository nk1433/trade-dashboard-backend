const importPluginImport = (await import("eslint-plugin-import")).default;

export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules", "dist", "build"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module"
    },
    plugins: {
      import: importPluginImport
    },
    rules: {
      "no-console": "off",
      "eqeqeq": "error",
      "curly": "error",
      "no-return-await": "error",
      "consistent-return": "warn",
      "no-var": "error",
      "prefer-const": "warn",
      "no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true
        }
      ],
      "import/no-unresolved": "error",
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal"],
          "newlines-between": "always"
        }
      ],
      "semi": ["error", "always"],
      "quotes": ["error", "double", { avoidEscape: true }],
      "indent": ["error", 2, { SwitchCase: 1 }]
    }
  }
];