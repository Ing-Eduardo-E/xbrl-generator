/**
 * Barrel de re-exports del módulo oficial XBRL.
 * Orden: tipos/constantes primero, luego funciones que los consumen.
 *
 * NOTA: excelDataFiller.ts define localmente ServiceBalanceData, AccountData,
 * TemplateCustomization y TemplateWithDataOptions (copias del monolito).
 * Para evitar conflictos de re-export, solo exponemos la función pública de ese módulo.
 */
export * from './interfaces';
export * from './templatePaths';
export * from './fileLoaders';
export { customizeExcelWithData } from './excelDataFiller';
export { rewriteFinancialDataWithExcelJS } from './excelRewriter';
export * from './templateCustomizers';
