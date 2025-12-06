/**
 * Utilidades compartidas para manipulación de archivos Excel.
 *
 * Funciones comunes para leer, escribir y manipular hojas de Excel
 * utilizadas por todas las taxonomías.
 */

import type ExcelJS from 'exceljs';

/**
 * Escribe un valor numérico en una celda, redondeando a entero.
 */
export function writeCellNumber(
  worksheet: ExcelJS.Worksheet,
  cell: string,
  value: number | null | undefined
): void {
  if (value === null || value === undefined) return;
  const excelCell = worksheet.getCell(cell);
  excelCell.value = Math.round(value);
}

/**
 * Escribe un valor de texto en una celda.
 */
export function writeCellText(
  worksheet: ExcelJS.Worksheet,
  cell: string,
  value: string | null | undefined
): void {
  if (value === null || value === undefined) return;
  const excelCell = worksheet.getCell(cell);
  excelCell.value = value;
}

/**
 * Escribe un valor en una celda por fila y columna.
 */
export function writeCellByRowCol(
  worksheet: ExcelJS.Worksheet,
  row: number,
  column: string,
  value: number | string | null | undefined
): void {
  if (value === null || value === undefined) return;
  const cell = `${column}${row}`;
  const excelCell = worksheet.getCell(cell);
  excelCell.value = typeof value === 'number' ? Math.round(value) : value;
}

/**
 * Lee un valor numérico de una celda.
 */
export function readCellNumber(
  worksheet: ExcelJS.Worksheet,
  cell: string
): number {
  const excelCell = worksheet.getCell(cell);
  const value = excelCell.value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Lee un valor de texto de una celda.
 */
export function readCellText(
  worksheet: ExcelJS.Worksheet,
  cell: string
): string {
  const excelCell = worksheet.getCell(cell);
  const value = excelCell.value;
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Obtiene el nombre de columna a partir del índice (1-based).
 * Ej: 1 -> 'A', 26 -> 'Z', 27 -> 'AA'
 */
export function getColumnName(index: number): string {
  let result = '';
  let n = index;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Obtiene el índice de columna a partir del nombre (1-based).
 * Ej: 'A' -> 1, 'Z' -> 26, 'AA' -> 27
 */
export function getColumnIndex(name: string): number {
  let result = 0;
  for (let i = 0; i < name.length; i++) {
    result = result * 26 + (name.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Itera sobre un rango de celdas y aplica una función.
 */
export function forEachCellInRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: string,
  endCol: string,
  callback: (cell: ExcelJS.Cell, row: number, col: string) => void
): void {
  const startColIndex = getColumnIndex(startCol);
  const endColIndex = getColumnIndex(endCol);

  for (let row = startRow; row <= endRow; row++) {
    for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex++) {
      const col = getColumnName(colIndex);
      const cell = worksheet.getCell(`${col}${row}`);
      callback(cell, row, col);
    }
  }
}

/**
 * Copia el formato de una celda a otra.
 */
export function copyCellFormat(
  source: ExcelJS.Cell,
  target: ExcelJS.Cell
): void {
  if (source.style) {
    target.style = { ...source.style };
  }
}

/**
 * Aplica formato de número con separador de miles.
 */
export function applyNumberFormat(
  worksheet: ExcelJS.Worksheet,
  cell: string,
  format = '#,##0'
): void {
  const excelCell = worksheet.getCell(cell);
  excelCell.numFmt = format;
}

/**
 * Verifica si una hoja existe en el workbook.
 */
export function worksheetExists(
  workbook: ExcelJS.Workbook,
  sheetName: string
): boolean {
  return workbook.getWorksheet(sheetName) !== undefined;
}

/**
 * Obtiene una hoja por nombre o índice.
 */
export function getWorksheet(
  workbook: ExcelJS.Workbook,
  nameOrIndex: string | number
): ExcelJS.Worksheet | undefined {
  if (typeof nameOrIndex === 'number') {
    return workbook.getWorksheet(nameOrIndex);
  }
  return workbook.getWorksheet(nameOrIndex);
}

/**
 * Convierte un valor a número, manejando strings con formato.
 */
export function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remover símbolos de moneda, comas, espacios
    const cleaned = value.replace(/[$,\s]/g, '').replace(/\./g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Formatea un número como moneda colombiana.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea un número con separadores de miles.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
