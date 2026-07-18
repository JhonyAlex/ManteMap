// @vitest-environment jsdom
/**
 * Tests for cell-renderer utility.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — renders field values by type
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "type-to-cell renderer (mirrors field-registry pattern for display)"
 *
 * Acceptance criteria:
 *   - SHORT_TEXT renders as plain text
 *   - NUMBER renders with locale formatting
 *   - BOOLEAN renders as "Yes" / "No"
 *   - DATE renders as formatted date string
 *   - DATETIME renders as formatted datetime string
 *   - CURRENCY renders with unit prefix
 *   - Unknown/null values render as dash "—"
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderCellValue } from '../cell-renderer';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderCellValue', () => {
  describe('SHORT_TEXT', () => {
    it('renders text value as plain string', () => {
      const { container } = render(<>{renderCellValue('SHORT_TEXT', 'Industrial Pump')}</>);
      expect(container.textContent).toBe('Industrial Pump');
    });

    it('renders empty string as dash', () => {
      const { container } = render(<>{renderCellValue('SHORT_TEXT', '')}</>);
      expect(container.textContent).toBe('—');
    });
  });

  describe('NUMBER', () => {
    it('renders number with locale formatting', () => {
      const { container } = render(<>{renderCellValue('NUMBER', 1234567)}</>);
      // Locale formatting adds separators — verify it's not raw "1234567"
      expect(container.textContent).not.toBe('1234567');
      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('234');
    });

    it('renders zero as 0', () => {
      const { container } = render(<>{renderCellValue('NUMBER', 0)}</>);
      expect(container.textContent).toContain('0');
    });

    it('renders null as dash', () => {
      const { container } = render(<>{renderCellValue('NUMBER', null)}</>);
      expect(container.textContent).toBe('—');
    });
  });

  describe('DECIMAL', () => {
    it('renders decimal number with locale formatting', () => {
      const { container } = render(<>{renderCellValue('DECIMAL', 1234.56)}</>);
      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('234');
    });
  });

  describe('CURRENCY', () => {
    it('renders currency value', () => {
      const { container } = render(<>{renderCellValue('CURRENCY', 99.99)}</>);
      expect(container.textContent).toContain('99');
    });
  });

  describe('BOOLEAN', () => {
    it('renders true as "Yes"', () => {
      const { container } = render(<>{renderCellValue('BOOLEAN', true)}</>);
      expect(container.textContent).toBe('Yes');
    });

    it('renders false as "No"', () => {
      const { container } = render(<>{renderCellValue('BOOLEAN', false)}</>);
      expect(container.textContent).toBe('No');
    });

    it('renders null as dash', () => {
      const { container } = render(<>{renderCellValue('BOOLEAN', null)}</>);
      expect(container.textContent).toBe('—');
    });
  });

  describe('DATE', () => {
    it('renders date string as formatted date', () => {
      const { container } = render(<>{renderCellValue('DATE', '2026-07-15')}</>);
      // Should contain year, month, day in some locale format
      expect(container.textContent).toContain('2026');
    });

    it('renders null as dash', () => {
      const { container } = render(<>{renderCellValue('DATE', null)}</>);
      expect(container.textContent).toBe('—');
    });
  });

  describe('DATETIME', () => {
    it('renders datetime string as formatted datetime', () => {
      const { container } = render(<>{renderCellValue('DATETIME', '2026-07-15T10:30:00')}</>);
      expect(container.textContent).toContain('2026');
    });
  });

  describe('SELECT', () => {
    it('renders select value as plain text', () => {
      const { container } = render(<>{renderCellValue('SELECT', 'active')}</>);
      expect(container.textContent).toBe('active');
    });
  });

  describe('URL', () => {
    it('renders URL as a link', () => {
      render(<>{renderCellValue('URL', 'https://example.com')}</>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('https://example.com');
    });
  });

  describe('EMAIL', () => {
    it('renders email as a mailto link', () => {
      render(<>{renderCellValue('EMAIL', 'test@example.com')}</>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    });
  });

  describe('null / undefined', () => {
    it('renders null as dash for any type', () => {
      const { container } = render(<>{renderCellValue('SHORT_TEXT', null)}</>);
      expect(container.textContent).toBe('—');
    });

    it('renders undefined as dash', () => {
      const { container } = render(<>{renderCellValue('SHORT_TEXT', undefined)}</>);
      expect(container.textContent).toBe('—');
    });
  });

  describe('MULTI_SELECT', () => {
    it('renders array values as comma-separated text', () => {
      const { container } = render(<>{renderCellValue('MULTI_SELECT', ['tag1', 'tag2'])}</>);
      expect(container.textContent).toContain('tag1');
      expect(container.textContent).toContain('tag2');
    });
  });
});
