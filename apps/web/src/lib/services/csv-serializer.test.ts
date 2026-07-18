import { describe, expect, it } from 'vitest';

// Import production code — RED until GREEN
import { escapeFormulaInjection, toCsv } from './csv-serializer';

// ---------------------------------------------------------------------------
// escapeFormulaInjection
// ---------------------------------------------------------------------------
describe('escapeFormulaInjection', () => {
  it('prefixes fields starting with = with a single quote', () => {
    expect(escapeFormulaInjection("=cmd|'/C calc'!A1")).toBe("'=cmd|'/C calc'!A1");
  });

  it('prefixes fields starting with + with a single quote', () => {
    expect(escapeFormulaInjection('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
  });

  it('prefixes fields starting with - with a single quote', () => {
    expect(escapeFormulaInjection('-1+1')).toBe("'-1+1");
  });

  it('prefixes fields starting with @ with a single quote', () => {
    expect(escapeFormulaInjection('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('prefixes fields starting with tab character', () => {
    expect(escapeFormulaInjection('\tdata')).toBe("'\tdata");
  });

  it('prefixes fields starting with carriage return', () => {
    expect(escapeFormulaInjection('\rdata')).toBe("'\rdata");
  });

  it('trims whitespace before checking for dangerous prefixes', () => {
    expect(escapeFormulaInjection('  =cmd')).toBe("'  =cmd");
  });

  it('does NOT prefix safe fields', () => {
    expect(escapeFormulaInjection('normal text')).toBe('normal text');
  });

  it('does NOT prefix fields with dangerous char in middle', () => {
    expect(escapeFormulaInjection('a=b')).toBe('a=b');
  });

  it('handles empty string', () => {
    expect(escapeFormulaInjection('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// toCsv
// ---------------------------------------------------------------------------
describe('toCsv', () => {
  it('produces RFC 4180 compliant output with CRLF line endings', () => {
    const columns = ['Name', 'Value'];
    const rows = [['Pump A', '100']];

    const result = toCsv(columns, rows);

    expect(result).toBe('"Name","Value"\r\n"Pump A","100"');
  });

  it('quotes all fields', () => {
    const columns = ['Name'];
    const rows = [['Simple']];

    const result = toCsv(columns, rows);

    expect(result).toBe('"Name"\r\n"Simple"');
  });

  it('doubles embedded quotes', () => {
    const columns = ['Name'];
    const rows = [['Say "hello"']];

    const result = toCsv(columns, rows);

    expect(result).toBe('"Name"\r\n"Say ""hello"""');
  });

  it('handles multiple rows', () => {
    const columns = ['A', 'B'];
    const rows = [
      ['1', '2'],
      ['3', '4'],
    ];

    const result = toCsv(columns, rows);

    expect(result).toBe('"A","B"\r\n"1","2"\r\n"3","4"');
  });

  it('handles empty rows array', () => {
    const columns = ['Name', 'Value'];

    const result = toCsv(columns, []);

    expect(result).toBe('"Name","Value"');
  });

  it('escapes formula injection in all fields', () => {
    const columns = ['Name'];
    const rows: string[][] = [['=cmd|"/C calc"']];

    const result = toCsv(columns, rows);

    expect(result).toBe('"Name"\r\n"\'=cmd|""/C calc"""');
  });

  it('handles null/undefined values as empty strings', () => {
    const columns = ['A', 'B'];
    const rows = [['hello', null as unknown as string]];

    const result = toCsv(columns, rows);

    expect(result).toBe('"A","B"\r\n"hello",""');
  });

  it('converts non-string values to strings', () => {
    const columns = ['Count'];
    const rows = [[42 as unknown as string]];

    const result = toCsv(columns, rows);

    expect(result).toBe('"Count"\r\n"42"');
  });
});
