/**
 * Writer de estados financieros R414: ESF (Hoja2) y ER (Hoja3).
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from '../../official/interfaces';
import { R414_ESF_MAPPINGS, R414_SERVICE_COLUMNS, R414_ER_MAPPINGS } from '../mappings';
import { writeCellSafe, matchesPrefixes, type DataWriterContext } from '../../shared/excelUtils';

export function writeEsfData(
  workbook: ExcelJS.Workbook,
  _options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { accountsByService, activeServices, serviceCodesWithChildren } = ctx;

  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet2) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja2...');

  for (const mapping of R414_ESF_MAPPINGS) {
    // Write service columns and accumulate total from services
    let totalFromServices = 0;

    const serviceColumnMap = R414_SERVICE_COLUMNS as unknown as Record<string, string | undefined>;
    for (const service of activeServices) {
      const serviceColumn = serviceColumnMap[service];
      if (!serviceColumn || serviceColumn === 'P') continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          serviceValue += account.value;
        }
      }

      if (serviceValue !== 0) {
        writeCellSafe(sheet2, `${serviceColumn}${mapping.row}`, serviceValue);
        console.log(`[ExcelJS] Hoja2!${serviceColumn}${mapping.row} = ${serviceValue}`);
      }
      totalFromServices += serviceValue;
    }

    // P = sum of all service columns (ensures XBRL validation FRM_210000_005a passes)
    if (totalFromServices !== 0) {
      writeCellSafe(sheet2, `P${mapping.row}`, totalFromServices);
      console.log(`[ExcelJS] Hoja2!P${mapping.row} = ${totalFromServices} (sum of services)`);
    }
  }
}

export function writeErData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { accountsByService, activeServices, codesWithChildren, serviceCodesWithChildren } = ctx;

  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!sheet3) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja3...');

  for (const mapping of R414_ER_MAPPINGS) {
    // Write service columns and accumulate total from services
    let totalFromServices = 0;

    const erServiceColumns: Record<string, string> = {
      acueducto: 'E',
      alcantarillado: 'F',
      aseo: 'G'
    };

    for (const service of activeServices) {
      const serviceColumn = erServiceColumns[service];
      if (!serviceColumn) continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          serviceValue += account.value;
        }
      }

      writeCellSafe(sheet3, `${serviceColumn}${mapping.row}`, serviceValue);
      if (serviceValue !== 0) {
        console.log(`[ExcelJS] Hoja3!${serviceColumn}${mapping.row} = ${serviceValue}`);
      }
      totalFromServices += serviceValue;
    }

    // L = sum of all service columns (ensures XBRL validation consistency)
    writeCellSafe(sheet3, `L${mapping.row}`, totalFromServices);
    if (totalFromServices !== 0) {
      console.log(`[ExcelJS] Hoja3!L${mapping.row} = ${totalFromServices} (sum of services)`);
    }
  }

  // DEBUG: Verificar cuentas Hoja3.E18 vs Hoja16
  const acueductoAccounts3 = accountsByService['acueducto'] || [];
  let suma51 = 0, suma52 = 0;
  for (const account of acueductoAccounts3) {
    if (serviceCodesWithChildren.has(account.code)) continue;
    if (account.code.startsWith('51')) suma51 += account.value;
    if (account.code.startsWith('52')) suma52 += account.value;
  }
  console.log(`[ExcelJS] Hoja3 - DEBUG Acueducto: cuenta 51 = ${suma51}, cuenta 52 = ${suma52}, total = ${suma51 + suma52}`);
}
