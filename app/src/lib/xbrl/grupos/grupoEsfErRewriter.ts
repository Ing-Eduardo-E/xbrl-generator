/**
 * Reescritura ESF (Hoja2) y ER (Hoja3) con ExcelJS para grupo1, grupo2, grupo3.
 *
 * El ESF usa ESF_CONCEPTS + findESFConceptByPUC (match conceptual XBRL).
 * El ER usa GRUPO_ER_MAPPINGS (match directo por prefijo PUC NIIF).
 * Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo.
 */
import type ExcelJS from 'exceljs';
import type { AccountData, ServiceBalanceData } from '../types';
import { ESF_CONCEPTS, findESFConceptByPUC } from '../taxonomyConfig';
import { SERVICE_COLUMNS, GRUPO_ER_MAPPINGS, GRUPO_ER_COLUMNS } from './mappings';

// ============================================
// HOJA2: ESTADO DE SITUACIÓN FINANCIERA (ESF)
// ============================================

/**
 * Reescribe el ESF (Hoja2) para grupo1/2/3 usando ExcelJS.
 * Usa ESF_CONCEPTS con matching conceptual (findESFConceptByPUC).
 */
export function rewriteGrupoESF(
  workbook: ExcelJS.Workbook,
  consolidatedAccounts: AccountData[],
  serviceBalances: ServiceBalanceData[],
  activeServices: string[],
  accountsByService: Record<string, ServiceBalanceData[]>
): void {
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet2) return;

  console.log('[ExcelJS-Grupo] Escribiendo ESF en Hoja2...');

  for (const concept of ESF_CONCEPTS) {
    if (concept.isTotal) continue;
    if (!concept.pucCode) continue;

    // Calcular total consolidado
    let totalValue = 0;
    for (const account of consolidatedAccounts) {
      if (!account.isLeaf) continue;
      const mapped = findESFConceptByPUC(account.code);
      if (mapped && mapped.concept === concept.concept) {
        totalValue += account.value;
      }
    }

    // Escribir valor total en columna I
    if (totalValue !== 0) {
      const totalCol = SERVICE_COLUMNS.total;
      sheet2.getCell(`${totalCol}${concept.row}`).value = totalValue;
    }

    // Escribir valores por servicio
    for (const service of activeServices) {
      const serviceColumn = SERVICE_COLUMNS[service];
      if (!serviceColumn) continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (!account.isLeaf) continue;
        const mapped = findESFConceptByPUC(account.code);
        if (mapped && mapped.concept === concept.concept) {
          serviceValue += account.value;
        }
      }

      if (serviceValue !== 0) {
        sheet2.getCell(`${serviceColumn}${concept.row}`).value = serviceValue;
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
 * Usa GRUPO_ER_MAPPINGS con matching por prefijo PUC NIIF.
 * Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo.
 */
export function rewriteGrupoER(
  workbook: ExcelJS.Workbook,
  consolidatedAccounts: AccountData[],
  activeServices: string[],
  accountsByService: Record<string, ServiceBalanceData[]>
): void {
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!sheet3) return;

  console.log('[ExcelJS-Grupo] Escribiendo ER en Hoja3...');

  for (const mapping of GRUPO_ER_MAPPINGS) {
    // Calcular total consolidado
    let totalValue = 0;
    for (const account of consolidatedAccounts) {
      if (!account.isLeaf) continue;
      for (const prefix of mapping.pucPrefixes) {
        if (account.code.startsWith(prefix)) {
          totalValue += account.value;
          break;
        }
      }
    }

    // Escribir total en columna I
    const totalCol = GRUPO_ER_COLUMNS.total;
    sheet3.getCell(`${totalCol}${mapping.row}`).value = totalValue;

    // Escribir valores por servicio
    for (const service of activeServices) {
      const serviceColumn = GRUPO_ER_COLUMNS[service];
      if (!serviceColumn) continue;

      let serviceValue = 0;
      const serviceAccounts = accountsByService[service] || [];
      for (const account of serviceAccounts) {
        if (!account.isLeaf) continue;
        for (const prefix of mapping.pucPrefixes) {
          if (account.code.startsWith(prefix)) {
            serviceValue += account.value;
            break;
          }
        }
      }

      sheet3.getCell(`${serviceColumn}${mapping.row}`).value = serviceValue;
    }
  }

  console.log('[ExcelJS-Grupo] Hoja3 (ER) completada.');
}