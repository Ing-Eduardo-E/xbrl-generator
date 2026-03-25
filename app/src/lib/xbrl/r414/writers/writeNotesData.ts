/**
 * Writer de notas contables R414: Hoja7 (PPE, Intangibles, Efectivo, Provisiones).
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from '../../official/interfaces';
import {
  R414_PPE_MAPPINGS,
  R414_INTANGIBLES_MAPPINGS,
  R414_EFECTIVO_MAPPINGS,
  R414_PROVISIONES_MAPPINGS,
  R414_OTRAS_PROVISIONES_MAPPINGS,
  R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
} from '../mappings';
import { writeCellSafe, matchesPrefixes, type DataWriterContext } from '../../shared/excelUtils';

export function writeNotesData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { codesWithChildren, activeServices, accountsByService, serviceCodesWithChildren } = ctx;

  const sheet7 = workbook.getWorksheet('Hoja7');
  if (!sheet7) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja7...');

  const consolidatedAccounts = options.consolidatedAccounts || [];

  // Helper: si hay al menos un valor != 0, llena con 0 las celdas vacías de la sección
  const processSectionWithZeroFill = (
    mappings: Array<{ row: number; label?: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }>,
    sectionName: string,
    allRowsInSection: number[]
  ) => {
    const rowValues: Map<number, number> = new Map();
    let hasAnyValue = false;

    for (const mapping of mappings) {
      let totalValue = 0;
      for (const account of consolidatedAccounts) {
        if (codesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          totalValue += account.value;
        }
      }

      if (mapping.useAbsoluteValue) {
        totalValue = Math.abs(totalValue);
      }

      rowValues.set(mapping.row, totalValue);
      if (totalValue !== 0) {
        hasAnyValue = true;
      }
    }

    if (hasAnyValue) {
      for (const row of allRowsInSection) {
        const value = rowValues.get(row) ?? 0;
        writeCellSafe(sheet7, `F${row}`, value);
        if (value !== 0) {
          console.log(`[ExcelJS] Hoja7!F${row} = ${value}`);
        }
      }
      console.log(`[ExcelJS] Hoja7 - Sección ${sectionName}: ${allRowsInSection.length} filas escritas (con zero-fill)`);
    } else {
      console.log(`[ExcelJS] Hoja7 - Sección ${sectionName}: sin datos, omitida`);
    }
  };

  // PPE (filas 14-33, sin autosumas 16/22/29/31/34)
  processSectionWithZeroFill(
    R414_PPE_MAPPINGS,
    'PPE',
    [14, 15, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 32, 33]
  );

  // F34 = Total PPE neto desde cuentas distribuidas por servicio
  // Debe coincidir exactamente con Hoja2 P34 (validación cruzada XBRL)
  {
    let ppeTotalFromServices = 0;
    for (const service of activeServices) {
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (account.code.startsWith('16')) {
          ppeTotalFromServices += account.value;
        }
      }
    }
    if (ppeTotalFromServices !== 0) {
      writeCellSafe(sheet7, 'F34', ppeTotalFromServices);
      console.log(`[ExcelJS] Hoja7!F34 = ${ppeTotalFromServices} (PPE neto = Hoja2 P34)`);
    }
  }

  // Intangibles (filas 37-47, sin autosumas 44/48)
  processSectionWithZeroFill(
    R414_INTANGIBLES_MAPPINGS,
    'Intangibles',
    [37, 38, 39, 40, 41, 42, 43, 45, 46, 47]
  );

  // F48 = Total Intangibles neto desde cuentas distribuidas por servicio
  // Debe coincidir exactamente con Hoja2 P59 (validación cruzada XBRL)
  {
    let intangiblesTotalFromServices = 0;
    for (const service of activeServices) {
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (account.code.startsWith('1970') || account.code.startsWith('1975') || account.code.startsWith('1976')) {
          intangiblesTotalFromServices += account.value;
        }
      }
    }
    if (intangiblesTotalFromServices !== 0) {
      writeCellSafe(sheet7, 'F48', intangiblesTotalFromServices);
      console.log(`[ExcelJS] Hoja7!F48 = ${intangiblesTotalFromServices} (Intangibles neto = Hoja2 P59)`);
    }
  }

  // Efectivo (filas 51-60)
  processSectionWithZeroFill(
    R414_EFECTIVO_MAPPINGS,
    'Efectivo',
    [51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
  );

  // Provisiones (filas 63-73)
  processSectionWithZeroFill(
    R414_PROVISIONES_MAPPINGS,
    'Provisiones',
    [63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73]
  );

  // Otras Provisiones (filas 75-77)
  processSectionWithZeroFill(
    R414_OTRAS_PROVISIONES_MAPPINGS,
    'Otras Provisiones',
    [75, 76, 77]
  );

  // Beneficios a Empleados (filas 79-83)
  processSectionWithZeroFill(
    R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
    'Beneficios Empleados',
    [79, 80, 81, 82, 83]
  );
}
