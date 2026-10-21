import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      'src/components/game.tsx',
      'src/features/auth/auth-form.tsx',
      'src/features/room/room-app.tsx',
    ],
    // Preserve full document navigation at Auth and legacy/room session boundaries.
    // These pages initialize their account state from the server on navigation.
    rules: { '@next/next/no-location-assign-relative-destination': 'off' },
  },
  globalIgnores([
    '.next/**',
    '.cache/**',
    'out/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),
]);
