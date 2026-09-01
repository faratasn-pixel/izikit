import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.prisma/**',
      '**/generated/**',
      '**/next-env.d.ts',
      // Examples are illustrative only; copied into projects then restyled.
      // Excluded from lint and typecheck so they don't have to satisfy
      // strict workspace tsconfig (e.g. they reference `@/lib/...` aliases
      // that only exist inside the frontend workspace).
      'examples/**',
      // Bundled reference skill — provider examples + docs, not production
      // code. Same rationale as examples/**: illustrative for forkers.
      '.claude/skills/izisaas-payments-handler/**',
      // Passenger bootstrap entrypoint (PlanetHoster N0C). Plain CommonJS by
      // necessity — Passenger runs `node app.js` with no ESM loader. Not
      // application code; linting it against the workspace ESM rules is noise.
      'app.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.config.{js,mjs,ts}', '**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
