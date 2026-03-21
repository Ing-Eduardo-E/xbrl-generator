/**
 * Funciones helper reutilizables para reescritura ExcelJS.
 * Extraídas del patrón R414 para uso compartido entre grupos.
 */
import type ExcelJS from 'exceljs';
import type { ServiceBalanceData, ESFMapping } from '../types';
import { sumByPrefixes } from './pucUtils';

// Re-export matchesPrefixes from the canonical location
export { matchesPrefixes } from './excelUtils';

// ============================================
// HELPERS DE LLENADO FC01 (GASTOS POR SERVICIO)
// ============================================

/**
 * Llena la columna E (Gastos administrativos, clase 5) de una hoja FC01.
 */
export function fillExpenseColumnE(
  worksheet: ExcelJS.Worksheet,
  serviceAccounts: ServiceBalanceData[],
  mappings: ESFMapping[]
): void {
  for (const mapping of mappings) {
    const value = sumByPrefixes(
      serviceAccounts,
      mapping.pucPrefixes,
      mapping.excludePrefixes
    );
    worksheet.getCell(`E${mapping.row}`).value = value;
  }
}

/**
 * Llena la columna F (Costos de ventas, clase 6) de una hoja FC01.
 * Para Aseo: distribución especial 40% fila 72 / 60% fila 74.
 */
export function fillExpenseColumnF(
  worksheet: ExcelJS.Worksheet,
  serviceAccounts: ServiceBalanceData[],
  options: {
    costTargetRow: number;
    isAseo?: boolean;
    aseoDisposalRow?: number;
    zeroRows: number[];
  }
): number {
  const costosVentas = sumByPrefixes(serviceAccounts, ['6']);

  if (options.isAseo && options.aseoDisposalRow) {
    const mantenimiento = Math.round(costosVentas * 0.40);
    const disposicion = costosVentas - mantenimiento;
    worksheet.getCell(`F${options.costTargetRow}`).value = mantenimiento;
    worksheet.getCell(`F${options.aseoDisposalRow}`).value = disposicion;
  } else {
    worksheet.getCell(`F${options.costTargetRow}`).value = costosVentas;
  }

  for (const row of options.zeroRows) {
    worksheet.getCell(`F${row}`).value = 0;
  }

  return costosVentas;
}

/**
 * Calcula la columna G (E + F) para las filas especificadas.
 */
export function calculateColumnG(
  worksheet: ExcelJS.Worksheet,
  rows: number[]
): void {
  for (const row of rows) {
    const valorE = worksheet.getCell(`E${row}`).value as number || 0;
    const valorF = worksheet.getCell(`F${row}`).value as number || 0;
    worksheet.getCell(`G${row}`).value = valorE + valorF;
  }
}

// ============================================
// HELPERS DE CxC (FC03 POR ESTRATO)
// ============================================

export interface EstratoConfig {
  fila: number;
  key: string;
  nombre: string;
}

export interface RangoVencimiento {
  columna: string;
  porcentaje: number;
}

export const ESTRATOS_RESIDENCIALES: EstratoConfig[] = [
  { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
  { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
  { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
  { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
  { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
  { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' },
];

export const ESTRATOS_NO_RESIDENCIALES: EstratoConfig[] = [
  { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
  { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
  { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
  { fila: 28, key: 'especial', nombre: 'No residencial especial' },
];

export const RANGOS_VENCIMIENTO_STANDARD: RangoVencimiento[] = [
  { columna: 'J', porcentaje: 0.11 },
  { columna: 'K', porcentaje: 0.09 },
  { columna: 'L', porcentaje: 0.25 },
  { columna: 'M', porcentaje: 0.15 },
  { columna: 'N', porcentaje: 0.20 },
  { columna: 'O', porcentaje: 0.12 },
  { columna: 'P', porcentaje: 0.08 },
  { columna: 'Q', porcentaje: 0.00 },
  { columna: 'R', porcentaje: 0.00 },
];

export const DISTRIBUCION_TIPICA: Array<{ fila: number; porcentaje: number }> = [
  { fila: 19, porcentaje: 0.25 },
  { fila: 20, porcentaje: 0.30 },
  { fila: 21, porcentaje: 0.20 },
  { fila: 22, porcentaje: 0.10 },
  { fila: 23, porcentaje: 0.05 },
  { fila: 24, porcentaje: 0.03 },
  { fila: 25, porcentaje: 0.02 },
  { fila: 26, porcentaje: 0.03 },
  { fila: 27, porcentaje: 0.01 },
  { fila: 28, porcentaje: 0.01 },
];

/**
 * Distribuye CxC por estrato en una hoja FC03, con rangos de vencimiento.
 */
export function fillCxCByEstrato(
  worksheet: ExcelJS.Worksheet,
  totalCorrientes: number,
  totalNoCorrientes: number,
  estratos: EstratoConfig[],
  rangos: RangoVencimiento[],
  colCorriente: string,
  colNoCorriente: string,
  colTotal: string,
  colSuma: string,
  colAjuste: string,
  usuariosPorEstrato?: Record<string, number>
): void {
  let totalUsuarios = 0;
  if (usuariosPorEstrato) {
    for (const estrato of estratos) {
      totalUsuarios += Number(usuariosPorEstrato[estrato.key]) || 0;
    }
  }

  const usarProporcional = !!usuariosPorEstrato && totalUsuarios > 0;

  for (const estrato of estratos) {
    let valorCorriente = 0;
    let valorNoCorriente = 0;

    if (usarProporcional && usuariosPorEstrato) {
      const usuarios = Number(usuariosPorEstrato[estrato.key]) || 0;
      if (usuarios > 0) {
        valorCorriente = Math.round(totalCorrientes * usuarios / totalUsuarios);
        valorNoCorriente = Math.round(totalNoCorrientes * usuarios / totalUsuarios);
      }
    } else {
      const tipica = DISTRIBUCION_TIPICA.find(d => d.fila === estrato.fila);
      if (tipica) {
        valorCorriente = Math.round(totalCorrientes * tipica.porcentaje);
        valorNoCorriente = Math.round(totalNoCorrientes * tipica.porcentaje);
      }
    }

    worksheet.getCell(`${colCorriente}${estrato.fila}`).value = valorCorriente;
    worksheet.getCell(`${colNoCorriente}${estrato.fila}`).value = valorNoCorriente;
    const totalCXC = valorCorriente + valorNoCorriente;
    worksheet.getCell(`${colTotal}${estrato.fila}`).value = totalCXC;

    let sumaRangos = 0;
    for (const rango of rangos) {
      const valorRango = Math.round(totalCXC * rango.porcentaje);
      worksheet.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
      sumaRangos += valorRango;
    }

    const diferencia = totalCXC - sumaRangos;
    if (diferencia !== 0) {
      const actual = worksheet.getCell(`${colAjuste}${estrato.fila}`).value as number || 0;
      worksheet.getCell(`${colAjuste}${estrato.fila}`).value = actual + diferencia;
    }
    worksheet.getCell(`${colSuma}${estrato.fila}`).value = totalCXC;
  }
}