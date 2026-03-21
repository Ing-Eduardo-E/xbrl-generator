/**
 * Dispatcher de reescritura de datos financieros en workbooks Excel con ExcelJS.
 * Archivo reducido: delega la logica heavy a r414DataWriter e ifeDataWriter.
 *
 * DEPENDENCIAS:
 * - ServiceBalanceData, TemplateWithDataOptions: importados desde ./interfaces
 * - writeR414Data: official/r414DataWriter.ts
 * - writeIFEData: official/ifeDataWriter.ts
 * - rewriteGrupoData: ../grupos
 */
import ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from './interfaces';
import type { ServiceBalanceData } from '../types';
import { rewriteGrupoData } from '../grupos';
import { writeCellSafe, buildCodesWithChildren } from '../shared/excelUtils';
import { writeR414Data } from './r414DataWriter';
import { writeIFEData } from './ifeDataWriter';

// ═══════════════════════════════════════════════════════════════════════════

export async function rewriteFinancialDataWithExcelJS(
  xlsxBuffer: Buffer,
  options: TemplateWithDataOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS load() declara Buffer pero su definición de tipos es incompatible con
  // Buffer<ArrayBufferLike> de Node — cast inevitable hasta que ExcelJS actualice sus tipos.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(xlsxBuffer as any);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOJA1: Información general — metadatos de la empresa
  // Se llena SIEMPRE, incluso sin datos financieros.
  // IMPORTANTE: Anteriormente se llenaba con SheetJS (customizeExcelWithData)
  // pero SheetJS destruye la estructura interna del xlsx (elimina sharedStrings.xml,
  // styles.xml, etc.) haciendo que XBRL Express no pueda leer los datos.
  // Ahora se llena exclusivamente con ExcelJS que preserva la estructura al 100%.
  // ═══════════════════════════════════════════════════════════════════════════
  if (options.niifGroup === 'r414') {
    const sheet1 = workbook.getWorksheet('Hoja1');
    if (sheet1) {
      console.log('[ExcelJS] Escribiendo metadatos en Hoja1 (R414)...');
      // C4: ID de empresa para XBRL Express
      writeCellSafe(sheet1, 'C4', options.companyId);
      // E12: Nombre de la entidad
      writeCellSafe(sheet1, 'E12', options.companyName);
      // E13: ID RUPS
      writeCellSafe(sheet1, 'E13', options.companyId);
      // E14: NIT
      if (options.nit) writeCellSafe(sheet1, 'E14', options.nit);
      // E15: Naturaleza EF
      writeCellSafe(sheet1, 'E15', '1. Individual');
      // E16: Naturaleza del negocio
      writeCellSafe(sheet1, 'E16', options.businessNature || 'Prestación de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo');
      // E17: Fecha de inicio de operaciones
      writeCellSafe(sheet1, 'E17', options.startDate || '2005-01-01');
      // E18: Fecha de cierre del período
      writeCellSafe(sheet1, 'E18', options.reportDate);
      // E19: Grado de redondeo
      const roundingLabels: Record<string, string> = {
        '1': '1 - Pesos',
        '2': '2 - Miles de pesos',
        '3': '3 - Millones de pesos',
        '4': '4 - Pesos redondeada a miles',
      };
      writeCellSafe(sheet1, 'E19', roundingLabels[options.roundingDegree || '1'] || '1 - Pesos');
      // E21: ¿Presenta información reexpresada?
      if (options.hasRestatedInfo === 'Sí' || options.hasRestatedInfo === '1. Sí') {
        writeCellSafe(sheet1, 'E21', '1. Sí');
        if (options.restatedPeriod) {
          writeCellSafe(sheet1, 'E22', options.restatedPeriod);
        }
      } else {
        writeCellSafe(sheet1, 'E21', '2. No');
      }
      console.log('[ExcelJS] Hoja1 (R414) completada.');
    }
  } else if (options.niifGroup !== 'ife') {
    // Para grupo1/2/3: llenar metadatos básicos con ExcelJS
    // Cada grupo tiene layout diferente en Hoja1 — coordenadas verificadas contra xlsx reales
    const sheet1 = workbook.getWorksheet('Hoja1');
    if (sheet1) {
      console.log(`[ExcelJS] Escribiendo metadatos en Hoja1 (${options.niifGroup})...`);
      const roundingLabels: Record<string, string> = {
        '1': '1 - Pesos',
        '2': '2 - Miles de pesos',
        '3': '3 - Millones de pesos',
        '4': '4 - Pesos redondeada a miles',
      };
      const rounding = roundingLabels[options.roundingDegree || '1'] || '1 - Pesos';

      writeCellSafe(sheet1, 'C4', options.companyId);

      if (options.niifGroup === 'grupo3') {
        // Grupo 3: usa columna D (no E), rows 12-18
        writeCellSafe(sheet1, 'D12', options.companyName);
        writeCellSafe(sheet1, 'D13', options.companyId);
        if (options.nit) writeCellSafe(sheet1, 'D14', options.nit);
        writeCellSafe(sheet1, 'D17', options.reportDate);
        writeCellSafe(sheet1, 'D18', rounding);
      } else if (options.niifGroup === 'grupo2') {
        // Grupo 2: columna E, tiene fila extra D16 "Descripción naturaleza EF"
        writeCellSafe(sheet1, 'E13', options.companyName);
        writeCellSafe(sheet1, 'E14', options.companyId);
        if (options.nit) writeCellSafe(sheet1, 'E15', options.nit);
        writeCellSafe(sheet1, 'E19', options.reportDate);
        writeCellSafe(sheet1, 'E20', rounding);
      } else {
        // Grupo 1: columna E, rows 13-19
        writeCellSafe(sheet1, 'E13', options.companyName);
        writeCellSafe(sheet1, 'E14', options.companyId);
        if (options.nit) writeCellSafe(sheet1, 'E15', options.nit);
        writeCellSafe(sheet1, 'E18', options.reportDate);
        writeCellSafe(sheet1, 'E19', rounding);
      }
      console.log('[ExcelJS] Hoja1 completada.');
    }
  }

  // Si no hay datos financieros, retornar con solo metadatos
  if (!options.consolidatedAccounts || options.consolidatedAccounts.length === 0) {
    const outputBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(outputBuffer);
  }

  const serviceBalances = options.serviceBalances || [];
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  // Agrupar cuentas por servicio
  const accountsByService: Record<string, ServiceBalanceData[]> = {};
  for (const service of activeServices) {
    accountsByService[service] = (serviceBalances as ServiceBalanceData[]).filter(sb => sb.service === service);
  }

  // Detección dinámica: una cuenta es hoja si su código NO es prefijo de otra cuenta
  const codesWithChildren = buildCodesWithChildren(options.consolidatedAccounts);

  const serviceCodesWithChildren = new Set<string>();
  for (const service of activeServices) {
    const svcAccounts = accountsByService[service] || [];
    for (const account of svcAccounts) {
      for (let i = 1; i < account.code.length; i++) {
        serviceCodesWithChildren.add(account.code.slice(0, i));
      }
    }
  }

  // === DESPACHAR A WRITER DE TAXONOMIA ===

  if (options.niifGroup === 'r414') {
    writeR414Data(workbook, options, { accountsByService, activeServices, codesWithChildren, serviceCodesWithChildren });
  }

  if (options.niifGroup === 'grupo1' || options.niifGroup === 'grupo2' || options.niifGroup === 'grupo3') {
    rewriteGrupoData(workbook, options);
  }

  if (options.niifGroup === 'ife') {
    writeIFEData(workbook, options, { accountsByService, activeServices, codesWithChildren, serviceCodesWithChildren });
  }

  // Escribir el buffer con ExcelJS
  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}
