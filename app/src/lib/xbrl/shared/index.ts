/**
 * Índice de exportaciones del módulo shared.
 *
 * Este módulo contiene utilidades compartidas por todas las taxonomías.
 */

// Clase base para procesadores de taxonomía
export { BaseTemplateService } from './baseTemplateService';

// Utilidades de Excel
export {
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
} from './excelUtils';

// Utilidades de PUC
export {
  PUC_CLASSES,
  PUC_LEVELS,
  getAccountClass,
  getClassDigit,
  getAccountLevel,
  getAccountLevelName,
  isAsset,
  isLiability,
  isEquity,
  isIncome,
  isExpense,
  isCost,
  sumByPrefixes,
  sumServiceByPrefixes,
  calculateTotalsByClass,
  validateAccountingEquation,
  filterByClass,
  filterLeafAccounts,
  filterByPrefix,
  groupByService,
  cleanPucCode,
  isValidPucCode,
  getParentCode,
} from './pucUtils';

export * from './dateUtils';

// Helpers de reescritura ExcelJS (compartidos entre R414 y grupos NIIF)
export {
  matchesPrefixes,
  sumAccountsByPrefixes,
  fillExpenseColumnE,
  fillExpenseColumnF,
  calculateColumnG,
  fillCxCByEstrato,
  ESTRATOS_RESIDENCIALES,
  ESTRATOS_NO_RESIDENCIALES,
  RANGOS_VENCIMIENTO_STANDARD,
  DISTRIBUCION_TIPICA,
} from './rewriterHelpers';
export type { EstratoConfig, RangoVencimiento } from './rewriterHelpers';
