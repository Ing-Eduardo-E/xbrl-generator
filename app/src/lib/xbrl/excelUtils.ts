/**
 * Utilidades compartidas para manipulación segura de celdas ExcelJS.
 *
 * ExcelJS puede devolver objetos complejos (fórmulas, hiperlinks, rich text)
 * en lugar de valores primitivos. Estos helpers garantizan extracción segura.
 */
import type ExcelJS from 'exceljs';

/**
 * Extrae de forma segura el valor numérico de una celda ExcelJS.
 *
 * Problema: `cell.value` puede retornar un objeto fórmula como
 * `{ formula: '=E13+F13', result: 12345 }`. Un cast `as number` en TypeScript
 * no convierte en runtime, y como los objetos son truthy, `|| 0` no ayuda.
 * Resultado: `0 + {formula:'...'}` → `"0[object Object]"`.
 *
 * Esta función maneja todos los tipos posibles de CellValue de ExcelJS.
 */
export function safeNumericValue(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  // Objeto fórmula: { formula: string, result?: CellValue }
  if (typeof v === 'object' && 'result' in v) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === 'number') return r;
    if (typeof r === 'string') {
      const n = Number(r);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }
  return 0;
}
