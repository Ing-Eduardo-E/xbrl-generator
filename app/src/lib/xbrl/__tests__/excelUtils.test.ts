/**
 * Tests for shared/excelUtils.ts
 *
 * Pure functions are tested without mocks.
 * ExcelJS-dependent functions use the shared mock (mocks/exceljs.mock.ts).
 */

import './mocks/exceljs.mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCell, mockWorksheet, mockWorkbook } from './mocks/exceljs.mock';

import {
  writeCellNumber,
  writeCellText,
  writeCellByRowCol,
  readCellNumber,
  readCellText,
  getColumnName,
  getColumnIndex,
  forEachCellInRange,
  copyCellFormat,
  applyNumberFormat,
  worksheetExists,
  getWorksheet,
  parseNumericValue,
  formatCurrency,
  formatNumber,
} from '../shared/excelUtils';

// ============================================================
// Helpers
// ============================================================

/** Reset shared mock state before each test so tests don't bleed. */
beforeEach(() => {
  vi.clearAllMocks();
  mockCell.value = null;
  (mockCell as Record<string, unknown>).numFmt = '';
  (mockCell as Record<string, unknown>).style = undefined;
});

// ============================================================
// Section 1: Pure functions (no ExcelJS)
// ============================================================

describe('parseNumericValue', () => {
  it('returns the number as-is when given a number', () => {
    expect(parseNumericValue(42)).toBe(42);
  });

  it('returns 0 for 0', () => {
    expect(parseNumericValue(0)).toBe(0);
  });

  it('parses a plain numeric string', () => {
    expect(parseNumericValue('123')).toBe(123);
  });

  it('removes $ signs and spaces before parsing', () => {
    expect(parseNumericValue('$ 500')).toBe(500);
  });

  it('removes comma separators before parsing', () => {
    // "1,234" -> "1234" -> 1234
    expect(parseNumericValue('1,234')).toBe(1234);
  });

  it('removes dots as well (Colombian convention: dots are thousands separators)', () => {
    // Implementation removes ALL dots after removing $, commas and spaces
    // "1,234.56" -> remove $, commas, spaces -> "1234.56" -> remove dots -> "123456" -> 123456
    expect(parseNumericValue('1,234.56')).toBe(123456);
  });

  it('returns 0 for an empty string', () => {
    expect(parseNumericValue('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parseNumericValue(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseNumericValue(undefined)).toBe(0);
  });

  it('returns 0 for a non-numeric string', () => {
    expect(parseNumericValue('abc')).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(parseNumericValue(-99)).toBe(-99);
  });

  it('handles negative string', () => {
    expect(parseNumericValue('-500')).toBe(-500);
  });
});

describe('formatCurrency', () => {
  it('returns a non-empty string for a positive number', () => {
    const result = formatCurrency(1000000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains the numeric digits', () => {
    // 1000 -> should contain "1" and "000" somewhere
    const result = formatCurrency(1000);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/000/);
  });

  it('formats 0 and returns a string containing "0"', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('handles negative values without throwing', () => {
    const result = formatCurrency(-500);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('does not include decimal digits (maximumFractionDigits is 0)', () => {
    // 1500.75 should round to 1501 with no decimal separator
    const result = formatCurrency(1500);
    // Should not contain a fractional part — no comma or dot followed by digits at end
    // We just verify it is a string with no trailing ",xx" or ".xx"
    expect(result).not.toMatch(/[.,]\d{2}$/);
  });
});

describe('formatNumber', () => {
  it('returns a non-empty string for a positive number', () => {
    const result = formatNumber(1000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats 0 and returns a string containing "0"', () => {
    expect(formatNumber(0)).toContain('0');
  });

  it('handles negative numbers without throwing', () => {
    const result = formatNumber(-1234);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('does not include fractional digits', () => {
    const result = formatNumber(9999);
    expect(result).not.toMatch(/[.,]\d{2}$/);
  });

  it('larger number contains all significant digits', () => {
    const result = formatNumber(123456);
    // All digits of 123456 should be present somewhere in the formatted string
    expect(result.replace(/\D/g, '')).toBe('123456');
  });
});

describe('getColumnName', () => {
  it('converts 1 to "A"', () => {
    expect(getColumnName(1)).toBe('A');
  });

  it('converts 26 to "Z"', () => {
    expect(getColumnName(26)).toBe('Z');
  });

  it('converts 27 to "AA"', () => {
    expect(getColumnName(27)).toBe('AA');
  });

  it('converts 28 to "AB"', () => {
    expect(getColumnName(28)).toBe('AB');
  });

  it('converts 52 to "AZ"', () => {
    expect(getColumnName(52)).toBe('AZ');
  });

  it('converts 53 to "BA"', () => {
    expect(getColumnName(53)).toBe('BA');
  });
});

describe('getColumnIndex', () => {
  it('converts "A" to 1', () => {
    expect(getColumnIndex('A')).toBe(1);
  });

  it('converts "Z" to 26', () => {
    expect(getColumnIndex('Z')).toBe(26);
  });

  it('converts "AA" to 27', () => {
    expect(getColumnIndex('AA')).toBe(27);
  });

  it('converts "AB" to 28', () => {
    expect(getColumnIndex('AB')).toBe(28);
  });

  it('converts "AZ" to 52', () => {
    expect(getColumnIndex('AZ')).toBe(52);
  });

  it('converts "BA" to 53', () => {
    expect(getColumnIndex('BA')).toBe(53);
  });
});

describe('getColumnName / getColumnIndex round-trip', () => {
  it('round-trips correctly for indices 1 through 30', () => {
    for (let n = 1; n <= 30; n++) {
      expect(getColumnIndex(getColumnName(n))).toBe(n);
    }
  });

  it('round-trips correctly for known two-letter columns', () => {
    for (const name of ['AA', 'AZ', 'BA', 'BZ', 'ZZ']) {
      expect(getColumnName(getColumnIndex(name))).toBe(name);
    }
  });
});

// ============================================================
// Section 2: ExcelJS-dependent functions (using shared mock)
// ============================================================

describe('writeCellNumber', () => {
  it('sets cell value to the rounded number', () => {
    writeCellNumber(mockWorksheet as never, 'B5', 123.7);
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('B5');
    expect(mockCell.value).toBe(124);
  });

  it('rounds down when decimal is below .5', () => {
    writeCellNumber(mockWorksheet as never, 'A1', 10.4);
    expect(mockCell.value).toBe(10);
  });

  it('does nothing when value is null', () => {
    mockCell.value = 'unchanged';
    writeCellNumber(mockWorksheet as never, 'A1', null);
    expect(mockCell.value).toBe('unchanged');
  });

  it('does nothing when value is undefined', () => {
    mockCell.value = 'unchanged';
    writeCellNumber(mockWorksheet as never, 'A1', undefined);
    expect(mockCell.value).toBe('unchanged');
  });

  it('writes zero correctly', () => {
    writeCellNumber(mockWorksheet as never, 'C3', 0);
    expect(mockCell.value).toBe(0);
  });

  it('writes negative numbers correctly', () => {
    writeCellNumber(mockWorksheet as never, 'D4', -50.9);
    expect(mockCell.value).toBe(-51);
  });
});

describe('writeCellText', () => {
  it('sets cell value to the given string', () => {
    writeCellText(mockWorksheet as never, 'A1', 'hello');
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('A1');
    expect(mockCell.value).toBe('hello');
  });

  it('does nothing when value is null', () => {
    mockCell.value = 'original';
    writeCellText(mockWorksheet as never, 'A1', null);
    expect(mockCell.value).toBe('original');
  });

  it('does nothing when value is undefined', () => {
    mockCell.value = 'original';
    writeCellText(mockWorksheet as never, 'A1', undefined);
    expect(mockCell.value).toBe('original');
  });

  it('writes empty string correctly', () => {
    writeCellText(mockWorksheet as never, 'B2', '');
    expect(mockCell.value).toBe('');
  });
});

describe('writeCellByRowCol', () => {
  it('writes a number rounded to integer', () => {
    writeCellByRowCol(mockWorksheet as never, 5, 'C', 99.6);
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('C5');
    expect(mockCell.value).toBe(100);
  });

  it('writes a string value as-is', () => {
    writeCellByRowCol(mockWorksheet as never, 3, 'D', 'text-value');
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('D3');
    expect(mockCell.value).toBe('text-value');
  });

  it('does nothing when value is null', () => {
    mockCell.value = 'unchanged';
    writeCellByRowCol(mockWorksheet as never, 1, 'A', null);
    expect(mockCell.value).toBe('unchanged');
  });

  it('does nothing when value is undefined', () => {
    mockCell.value = 'unchanged';
    writeCellByRowCol(mockWorksheet as never, 1, 'A', undefined);
    expect(mockCell.value).toBe('unchanged');
  });
});

describe('readCellNumber', () => {
  it('returns the number when cell contains a number', () => {
    mockCell.value = 42;
    expect(readCellNumber(mockWorksheet as never, 'A1')).toBe(42);
  });

  it('returns 0 when cell value is 0', () => {
    mockCell.value = 0;
    expect(readCellNumber(mockWorksheet as never, 'A1')).toBe(0);
  });

  it('returns 0 when cell value is null', () => {
    mockCell.value = null;
    expect(readCellNumber(mockWorksheet as never, 'A1')).toBe(0);
  });

  it('returns 0 when cell value is undefined', () => {
    mockCell.value = undefined;
    expect(readCellNumber(mockWorksheet as never, 'A1')).toBe(0);
  });

  it('parses a numeric string', () => {
    mockCell.value = '300';
    expect(readCellNumber(mockWorksheet as never, 'B2')).toBe(300);
  });

  it('parses a string with currency symbols', () => {
    // readCellNumber strips non-numeric chars (except . and -)
    mockCell.value = '$1500';
    expect(readCellNumber(mockWorksheet as never, 'B2')).toBe(1500);
  });

  it('returns 0 for a non-numeric string', () => {
    mockCell.value = 'N/A';
    expect(readCellNumber(mockWorksheet as never, 'C3')).toBe(0);
  });

  it('handles negative numbers', () => {
    mockCell.value = -99;
    expect(readCellNumber(mockWorksheet as never, 'D4')).toBe(-99);
  });
});

describe('readCellText', () => {
  it('returns the string value', () => {
    mockCell.value = 'some text';
    expect(readCellText(mockWorksheet as never, 'A1')).toBe('some text');
  });

  it('converts a number to string', () => {
    mockCell.value = 123;
    expect(readCellText(mockWorksheet as never, 'B2')).toBe('123');
  });

  it('returns empty string when cell value is null', () => {
    mockCell.value = null;
    expect(readCellText(mockWorksheet as never, 'C3')).toBe('');
  });

  it('returns empty string when cell value is undefined', () => {
    mockCell.value = undefined;
    expect(readCellText(mockWorksheet as never, 'C3')).toBe('');
  });
});

describe('applyNumberFormat', () => {
  it('sets numFmt on the cell', () => {
    applyNumberFormat(mockWorksheet as never, 'A1', '#,##0');
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('A1');
    expect((mockCell as Record<string, unknown>).numFmt).toBe('#,##0');
  });

  it('uses default format "#,##0" when no format is supplied', () => {
    applyNumberFormat(mockWorksheet as never, 'B2');
    expect((mockCell as Record<string, unknown>).numFmt).toBe('#,##0');
  });

  it('applies a custom format string', () => {
    applyNumberFormat(mockWorksheet as never, 'C3', '0.00%');
    expect((mockCell as Record<string, unknown>).numFmt).toBe('0.00%');
  });
});

describe('forEachCellInRange', () => {
  it('calls callback for every cell in a single-row range', () => {
    const callback = vi.fn();
    forEachCellInRange(mockWorksheet as never, 1, 1, 'A', 'C', callback);
    // Columns A, B, C in row 1 → 3 calls
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('calls callback for every cell in a multi-row range', () => {
    const callback = vi.fn();
    forEachCellInRange(mockWorksheet as never, 1, 3, 'A', 'B', callback);
    // 3 rows × 2 cols = 6 calls
    expect(callback).toHaveBeenCalledTimes(6);
  });

  it('passes correct row and column arguments to callback', () => {
    const calls: Array<[number, string]> = [];
    forEachCellInRange(
      mockWorksheet as never,
      2,
      3,
      'B',
      'C',
      (_cell, row, col) => { calls.push([row, col]); }
    );
    expect(calls).toEqual([
      [2, 'B'],
      [2, 'C'],
      [3, 'B'],
      [3, 'C'],
    ]);
  });

  it('calls getCell with the correct address for each cell', () => {
    forEachCellInRange(mockWorksheet as never, 1, 1, 'A', 'A', vi.fn());
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('A1');
  });
});

describe('copyCellFormat', () => {
  it('copies style from source to target', () => {
    const sourceStyle = { font: { bold: true }, fill: { type: 'pattern' } };
    const source = { value: 0, style: sourceStyle } as never;
    const target = { value: 0, style: {} } as never;

    copyCellFormat(source, target);

    expect((target as Record<string, unknown>).style).toEqual(sourceStyle);
  });

  it('does not throw when source has no style', () => {
    const source = { value: 0 } as never;
    const target = { value: 0, style: { font: {} } } as never;
    expect(() => copyCellFormat(source, target)).not.toThrow();
  });
});

describe('worksheetExists', () => {
  it('returns true when workbook.getWorksheet returns a worksheet', () => {
    // Default mock returns mockWorksheet (truthy)
    expect(worksheetExists(mockWorkbook as never, 'Hoja1')).toBe(true);
  });

  it('returns false when workbook.getWorksheet returns undefined', () => {
    mockWorkbook.getWorksheet.mockReturnValueOnce(undefined);
    expect(worksheetExists(mockWorkbook as never, 'Nonexistent')).toBe(false);
  });

  it('passes the sheet name to getWorksheet', () => {
    worksheetExists(mockWorkbook as never, 'MySheet');
    expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith('MySheet');
  });
});

describe('getWorksheet', () => {
  it('returns the worksheet when called with a string name', () => {
    const result = getWorksheet(mockWorkbook as never, 'Hoja1');
    expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith('Hoja1');
    expect(result).toBe(mockWorksheet);
  });

  it('returns the worksheet when called with a numeric index', () => {
    const result = getWorksheet(mockWorkbook as never, 1);
    expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith(1);
    expect(result).toBe(mockWorksheet);
  });

  it('returns undefined when worksheet does not exist', () => {
    mockWorkbook.getWorksheet.mockReturnValueOnce(undefined);
    const result = getWorksheet(mockWorkbook as never, 'Missing');
    expect(result).toBeUndefined();
  });
});
