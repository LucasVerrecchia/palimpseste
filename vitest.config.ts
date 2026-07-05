import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La logique métier est en fonctions pures : pas besoin de DOM pour la tester.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
