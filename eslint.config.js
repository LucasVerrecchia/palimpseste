// ESLint 9 (flat config) — remplace l'ancien .eslintrc mentionné dans la spec ;
// même rôle, format moderne. Décision documentée dans docs/architecture.md.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Les fichiers de config à la racine et les scripts d'outillage ne sont
    // pas dans le project TS strict.
    files: ['*.js', '*.ts', 'tools/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Scripts d'outillage : environnement Node.
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: { URL: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
  prettier,
);
