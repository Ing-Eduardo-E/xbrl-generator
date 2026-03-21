/**
 * Reescritura ESF (Hoja2) y ER (Hoja3) con ExcelJS para grupo1, grupo2, grupo3.
 *
 * El ESF usa ESF_CONCEPTS + findESFConceptByPUC (match conceptual XBRL).
 * El ER usa mappings per-grupo (match directo por prefijo PUC NIIF).
 * Columnas ESF (Hoja2): I=Acu, J=Alc, K=Aseo (Total es fórmula en plantilla).
 * Columnas ER (Hoja3): varían por grupo — pasadas como parámetro.
 */
import type ExcelJS from 'exceljs';
import type { AccountData, ServiceBalanceData } from '../types';
import type { ESFMapping } from '../types';
import { ESF_CONCEPTS, findESFConceptByPUC } from '../taxonomyConfig';
import { matchesPrefixes } from '../shared/excelUtils';
import { SERVICE_COLUMNS } from './mappings';

// ============================================
// HOJA2: ESTADO DE SITUACIÓN FINANCIERA (ESF)
// ============================================

/**
 * Reescribe el ESF (Hoja2) para grupo1/2/3 usando ExcelJS.
 * Usa ESF_CONCEPTS con matching conceptual (findESFConceptByPUC).
 * esfRowMap traduce ESF_CONCEPTS.row al row real del template (0 = skip).
 */
export function rewriteGrupoESF(
  workbook: ExcelJS.Workbook,
  consolidatedAccounts: AccountData[],
  serviceBalances: ServiceBalanceData[],
  activeServices: string[],
  accountsByService: Record<string, ServiceBalanceData[]>,
  codesWithChildren: Set<string> = new Set(),
  esfRowMap: Record<number, number> = {}
): void {
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet2) return;

  console.log('[ExcelJS-Grupo] Escribiendo ESF en Hoja2...');

  for (const concept of ESF_CONCEPTS) {
    if (concept.isTotal) continue;
    if (!concept.pucCode) continue;

    // Resolver row real del template (override si existe, sino default)
    const actualRow = esfRowMap[concept.row] ?? concept.row;
    if (actualRow === 0) continue; // Concepto sin fila en este template

    // Total es fórmula en las plantillas — no se escribe.
    // Solo escribir valores por servicio en sus columnas correspondientes.
    for (const service of activeServices) {
      const serviceColumn = SERVICE_COLUMNS[service];
      if (!serviceColumn) continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (codesWithChildren.has(account.code)) continue;
        const mapped = findESFConceptByPUC(account.code);
        if (mapped && mapped.concept === concept.concept) {
          serviceValue += account.value;
        }
      }

      if (serviceValue !== 0) {
        sheet2.getCell(`${serviceColumn}${actualRow}`).value = serviceValue;
      }
    }
  }

  console.log('[ExcelJS-Grupo] Hoja2 (ESF) completada.');
}

// ============================================
// HOJA3: ESTADO DE RESULTADOS (ER)
// ============================================

/**
 * Reescribe el ER (Hoja3) para grupo1/2/3 usando ExcelJS.
 * Columnas y filas varían por grupo — se reciben como parámetro.
 */
export function rewriteGrupoER(
  workbook: ExcelJS.Workbook,
  consolidatedAccounts: AccountData[],
  activeServices: string[],
  accountsByService: Record<string, ServiceBalanceData[]>,
  codesWithChildren: Set<string> = new Set(),
  erColumns: Record<string, string> = {},
  erMappings: ESFMapping[] = []
): void {
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!sheet3) return;

  console.log('[ExcelJS-Grupo] Escribiendo ER en Hoja3...');

  for (const mapping of erMappings) {
    // Total es fórmula en las plantillas — no se escribe.
    // Solo escribir valores por servicio en sus columnas correspondientes.
    for (const service of activeServices) {
      const serviceColumn = erColumns[service];
      if (!serviceColumn) continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (codesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          serviceValue += account.value;
        }
      }

      sheet3.getCell(`${serviceColumn}${mapping.row}`).value = serviceValue;
    }
  }

  console.log('[ExcelJS-Grupo] Hoja3 (ER) completada.');
}