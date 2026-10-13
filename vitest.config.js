import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // packages/quox-glyph uses node:test; it runs via `npm run test:node`.
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/quox-glyph/**'],
  },
});
