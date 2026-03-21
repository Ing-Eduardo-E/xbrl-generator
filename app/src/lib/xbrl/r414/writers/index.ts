/**
 * Orquestador de escritura de datos R414.
 *
 * Reemplaza el monolítico official/r414DataWriter.ts.
 * Cada sección del reporte está en su propio módulo writer.
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from '../../official/interfaces';
import type { DataWriterContext } from '../../shared/excelUtils';
import { writeEsfData, writeErData } from './writeFinancialStmts';
import { writeNotesData } from './writeNotesData';
import { writeServiceExpensesData } from './writeServiceExpenses';
import { writeCxcData } from './writeCxcData';
import { writeSupplementaryData } from './writeSupplementary';

export function writeR414Data(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  // Hoja2: Estado de Situación Financiera
  writeEsfData(workbook, options, ctx);

  // Hoja3: Estado de Resultados
  writeErData(workbook, options, ctx);

  // Hoja7: Notas (PPE, Intangibles, Efectivo, Provisiones, Beneficios)
  writeNotesData(workbook, options, ctx);

  // Hoja16/17/18: Gastos por servicio + Hoja22: Consolidados
  writeServiceExpensesData(workbook, options, ctx);

  // Hoja24/25/26: CxC por estrato
  writeCxcData(workbook, options);

  // Hoja23 FC02, Hoja30 FC04, Hoja32 FC05b, Hoja35 FC08, Hoja9/10 Notas
  writeSupplementaryData(workbook, options);
}
