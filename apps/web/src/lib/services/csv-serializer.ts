/**
 * RFC 4180 CSV serializer with formula-injection prevention.
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "CSV" section — pure serializer, no I/O.
 */

// ---------------------------------------------------------------------------
// Formula-injection escape
// ---------------------------------------------------------------------------

/** Characters that, when trimmed-leading, trigger formula-injection escape. */
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escape a single cell value to prevent CSV formula injection.
 *
 * Rules:
 * - If the original value starts with `\t` or `\r` (control characters), prefix with `'`.
 * - Otherwise, if the trimmed value starts with `=`, `+`, `-`, or `@`, prefix with `'`.
 * - The prefix is always added to the ORIGINAL value (whitespace is preserved).
 */
export function escapeFormulaInjection(value: string): string {
  if (value.length === 0) return value;

  // Control characters are checked on the original value (trimStart would strip them)
  if (value[0] === '\t' || value[0] === '\r') {
    return "'" + value;
  }

  // Formula prefixes are checked on the trimmed value
  const trimmed = value.trimStart();
  if (trimmed.length > 0 && (trimmed[0] === '=' || trimmed[0] === '+' || trimmed[0] === '-' || trimmed[0] === '@')) {
    return "'" + value;
  }

  return value;
}

// ---------------------------------------------------------------------------
// CSV serializer
// ---------------------------------------------------------------------------

/**
 * Serialize columns and rows into an RFC 4180 compliant CSV string.
 *
 * Rules applied:
 * - All fields are quoted with double quotes (`"`).
 * - Embedded double quotes are doubled (`""`).
 * - Rows are separated by CRLF (`\r\n`).
 * - Null/undefined values are serialized as empty string.
 * - All field values pass through formula-injection escape before quoting.
 *
 * @param columns - header column names
 * @param rows    - array of row arrays (each row matches column order)
 * @returns the CSV string
 */
export function toCsv(columns: string[], rows: (string | null | undefined)[][]): string {
  const header = columns.map(quoteField).join(',');

  if (rows.length === 0) return header;

  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell == null ? '' : String(cell);
          return quoteField(escapeFormulaInjection(str));
        })
        .join(',')
    )
    .join('\r\n');

  return header + '\r\n' + body;
}

/**
 * Quote a field value per RFC 4180: wrap in double quotes, double any embedded quotes.
 */
function quoteField(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}
