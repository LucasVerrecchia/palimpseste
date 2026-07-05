import { defineConfig } from 'vite';

export default defineConfig({
  // base relative : le build doit être hébergeable n'importe où (itch.io, pages statiques...)
  base: './',
  build: {
    target: 'es2022',
  },
});
