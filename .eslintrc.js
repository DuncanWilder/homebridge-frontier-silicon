module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "commonjs",
  },
  rules: {
    // Possible Errors
    "no-console": "warn",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

    // Best Practices
    curly: "error",
    eqeqeq: "error",
    "no-var": "error",
    "prefer-const": "error",

    // ES6 - Non-formatting rules only
    "no-duplicate-imports": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      env: {
        node: true,
      },
      rules: {
        "no-console": "off", // Allow console.log in tests
        "object-shorthand": "off", // Allow function constructors for mocking
      },
    },
  ],
};
