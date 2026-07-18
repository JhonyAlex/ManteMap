// @vitest-environment jsdom
/**
 * Tests for packages/ui/src/index.ts exports.
 *
 * Verifies that Card, Progress, Skeleton and their sub-components
 * are properly exported from the package barrel.
 *
 * Tasks: openspec/changes/phase-9-dashboard-reports/tasks.md
 *   1.7 Export Card, Progress, Skeleton from packages/ui/src/index.ts
 */

import { describe, it, expect } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Progress,
  Skeleton,
} from './index';

describe('packages/ui exports', () => {
  it('exports Card and sub-components', () => {
    expect(Card).toBeDefined();
    expect(CardHeader).toBeDefined();
    expect(CardTitle).toBeDefined();
    expect(CardContent).toBeDefined();
    expect(CardFooter).toBeDefined();
  });

  it('exports Progress', () => {
    expect(Progress).toBeDefined();
  });

  it('exports Skeleton', () => {
    expect(Skeleton).toBeDefined();
  });
});
