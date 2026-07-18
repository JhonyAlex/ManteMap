import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts', './vitest.setup-component.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', '../../packages/validation/src/**/*.test.ts', '../../packages/shared/src/**/*.test.ts', '../../packages/database/src/**/*.test.ts', '../../packages/ui/src/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist', '**/node_modules/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@mantemap/database': path.resolve(__dirname, '../../packages/database/src'),
      '@mantemap/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@mantemap/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@mantemap/validation': path.resolve(__dirname, '../../packages/validation/src'),
    },
  },
});
