// vitest.setup.ts — load .env from monorepo root BEFORE any test runs
import { loadEnvConfig } from '@next/env';
import { resolve } from 'node:path';

// process.cwd() is apps/web when vitest runs from that package
const rootDir = resolve(process.cwd(), '../../');
loadEnvConfig(rootDir);
