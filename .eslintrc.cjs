module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
  },
  plugins: [
    "@typescript-eslint",
    "qwik",
    "import",
    "unicorn",
    "security",
    "sonarjs",
    "promise",
    "prettier",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict",
    "plugin:@typescript-eslint/stylistic",
    "plugin:qwik/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:unicorn/recommended",
    "plugin:security/recommended",
    "plugin:sonarjs/recommended",
    "plugin:promise/recommended",
    "plugin:prettier/recommended",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: [
          "./tsconfig.json",
          "./apps/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
      },
      node: true,
    },
    react: {
      version: "detect",
    },
  },
  rules: {
    "prettier/prettier": "error",

    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      { allowNullableBoolean: true },
    ],

    "qwik/valid-lexical-scope": "error",
    "qwik/no-use-visible-task": "warn",
    "qwik/loader-location": "warn",

    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-unresolved": "off",

    "unicorn/prevent-abbreviations": "off",
    "unicorn/filename-case": [
      "error",
      {
        cases: {
          kebabCase: true,
          pascalCase: true,
        },
        ignore: [
          "^\\[.*\\]\\.tsx?$",
          "^index\\.ts$",
          "^global\\.ts$",
          "^vite\\.config\\.ts$",
        ],
      },
    ],
    "unicorn/no-null": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/prefer-top-level-await": "off",
    "unicorn/consistent-function-scoping": "off",

    "security/detect-object-injection": "warn",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-unsafe-regex": "error",

    "sonarjs/no-duplicate-string": [
      "warn",
      { threshold: 5 },
    ],
    "sonarjs/cognitive-complexity": ["warn", 20],

    "promise/always-return": "off",
    "promise/catch-or-return": ["error", { allowFinally: true }],

    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "brace-style": ["error", "1tbs"],
    "no-unused-expressions": "error",
  },
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "sonarjs/no-duplicate-string": "off",
        "max-lines": "off",
        "unicorn/no-null": "off",
      },
    },
    {
      files: ["*.js", "*.cjs", "*.mjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "unicorn/prefer-module": "off",
      },
    },
    {
      files: ["apps/backend/**/*.ts"],
      rules: {
        "qwik/valid-lexical-scope": "off",
        "qwik/no-use-visible-task": "off",
        "qwik/loader-location": "off",
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: [
    "dist",
    "node_modules",
    ".cache",
    "coverage",
    "*.js.map",
    "*.d.ts",
    "build",
    ".terraform",
    "*.generated.ts",
  ],
};
