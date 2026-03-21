/**
 * Writer FC01 R414: Gastos por servicio (Hoja16/17/18) y consolidados (Hoja22).
 *
 * Refactorizado: una sola función paramétrica reemplaza las 3 copias duplicadas
 * del código original (Hoja16 Acueducto, Hoja17 Alcantarillado, Hoja18 Aseo).
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from '../../official/interfaces';
import { R414_FC01_GASTOS_MAPPINGS, R414_FC01_DATA_ROWS, R414_FC01_ZERO_F_ROWS } from '../mappings';
import { safeNumericValue } from '../../excelUtils';
import { writeCellSafe, matchesPrefixes, type DataWriterContext } from '../../shared/excelUtils';

// ─── Configuración por servicio ────────────────────────────────────────────

interface CostDistributionSingle { type: 'single'; row: number }
interface CostDistributionSplit { type: 'split'; items: Array<{ row: number; percentage: number }> }
type CostDistribution = CostDistributionSingle | CostDistributionSplit;

interface ServiceExpenseConfig {
  sheetName: string;
  serviceKey: string;
  costDistribution: CostDistribution;
  zeroFRows: number[];
  dataRows: number[];
}

const SERVICE_CONFIGS: ServiceExpenseConfig[] = [
  {
    sheetName: 'Hoja16',
    serviceKey: 'acueducto',
    costDistribution: { type: 'single', row: 72 },
    zeroFRows: R414_FC01_ZERO_F_ROWS.standard,
    dataRows: R414_FC01_DATA_ROWS.standard,
  },
  {
    sheetName: 'Hoja17',
    serviceKey: 'alcantarillado',
    costDistribution: { type: 'single', row: 72 },
    zeroFRows: R414_FC01_ZERO_F_ROWS.standard,
    dataRows: R414_FC01_DATA_ROWS.standard,
  },
  {
    sheetName: 'Hoja18',
    serviceKey: 'aseo',
    costDistribution: { type: 'split', items: [{ row: 72, percentage: 0.40 }, { row: 74, percentage: 0.60 }] },
    zeroFRows: R414_FC01_ZERO_F_ROWS.aseo,
    dataRows: R414_FC01_DATA_ROWS.aseo,
  },
];

// ─── Función paramétrica de escritura ──────────────────────────────────────

function writeServiceSheetExpenses(
  sheet: ExcelJS.Worksheet,
  config: ServiceExpenseConfig,
  serviceAccounts: Array<{ code: string; value: number }>,
  serviceCodesWithChildren: Set<string>
): void {
  console.log(`[ExcelJS] Escribiendo datos en ${config.sheetName} (Gastos ${config.serviceKey})...`);

  const sumByPrefixes = (prefixes: string[], excludePrefixes?: string[]): number => {
    let total = 0;
    for (const account of serviceAccounts) {
      if (serviceCodesWithChildren.has(account.code)) continue;
      if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
        total += account.value;
      }
    }
    return total;
  };

  // Columna E: gastos administrativos por categoría
  for (const mapping of R414_FC01_GASTOS_MAPPINGS) {
    const value = sumByPrefixes(mapping.pucPrefixes, mapping.excludePrefixes);
    // Fila 33 (Ganancias MPP) se invierte el signo
    const cellValue = mapping.row === 33 ? (value !== 0 ? -value : 0) : value;
    writeCellSafe(sheet, `E${mapping.row}`, cellValue);
    if (cellValue !== 0) {
      console.log(`[ExcelJS] ${config.sheetName}!E${mapping.row} = ${cellValue}`);
    }
  }

  // Columna F: costos de ventas (clase 6)
  const costosVentasTotal = sumByPrefixes(['6']);

  if (config.costDistribution.type === 'single') {
    writeCellSafe(sheet, `F${config.costDistribution.row}`, costosVentasTotal);
    console.log(`[ExcelJS] ${config.sheetName}!F${config.costDistribution.row} (Costos ventas) = ${costosVentasTotal}`);
  } else {
    let asignado = 0;
    for (let i = 0; i < config.costDistribution.items.length; i++) {
      const item = config.costDistribution.items[i];
      // El último item se calcula como residuo para evitar errores de redondeo
      const valor = i === config.costDistribution.items.length - 1
        ? costosVentasTotal - asignado
        : Math.round(costosVentasTotal * item.percentage);
      writeCellSafe(sheet, `F${item.row}`, valor);
      console.log(`[ExcelJS] ${config.sheetName}!F${item.row} (${Math.round(item.percentage * 100)}%) = ${valor}`);
      asignado += valor;
    }
  }

  // Filas con F=0 (las que no tienen costos de ventas)
  for (const row of config.zeroFRows) {
    writeCellSafe(sheet, `F${row}`, 0);
  }

  // Columna G: E + F
  for (const row of config.dataRows) {
    const valorE = safeNumericValue(sheet.getCell(`E${row}`));
    const valorF = safeNumericValue(sheet.getCell(`F${row}`));
    writeCellSafe(sheet, `G${row}`, valorE + valorF);
  }
  console.log(`[ExcelJS] ${config.sheetName} - Columna G (E+F) calculada para ${config.dataRows.length} filas`);

  // Verificación de totales
  const totalGastosAdmin = sumByPrefixes(['51', '52']);
  const totalOtrosGastos = sumByPrefixes(['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
  const totalCostosFinancieros = sumByPrefixes(['5802', '5803', '5807']);
  console.log(`[ExcelJS] ${config.sheetName} - Verificación: admin=${totalGastosAdmin}, otros=${totalOtrosGastos}, financieros=${totalCostosFinancieros}, costos=${costosVentasTotal}`);
  console.log(`[ExcelJS] ${config.sheetName} completada.`);
}

// ─── Hoja22: Consolidados ──────────────────────────────────────────────────

const HOJA22_ROW_MAPPING: Array<{ origen: number; destino: number }> = [
  { origen: 13, destino: 14 }, { origen: 14, destino: 15 }, { origen: 15, destino: 16 },
  { origen: 16, destino: 17 }, { origen: 17, destino: 18 }, { origen: 18, destino: 19 },
  { origen: 19, destino: 20 }, { origen: 21, destino: 22 }, { origen: 22, destino: 23 },
  { origen: 23, destino: 24 }, { origen: 25, destino: 26 }, { origen: 27, destino: 28 },
  { origen: 28, destino: 29 }, { origen: 29, destino: 30 }, { origen: 30, destino: 31 },
  { origen: 31, destino: 32 }, { origen: 32, destino: 33 }, { origen: 34, destino: 35 },
  { origen: 35, destino: 36 }, { origen: 72, destino: 73 }, { origen: 74, destino: 75 },
  { origen: 77, destino: 78 }, { origen: 80, destino: 81 }, { origen: 81, destino: 82 },
];

function writeConsolidatedExpenses(
  workbook: ExcelJS.Workbook
): void {
  const sheet16 = workbook.getWorksheet('Hoja16');
  const sheet17 = workbook.getWorksheet('Hoja17');
  const sheet18 = workbook.getWorksheet('Hoja18');
  const sheet22 = workbook.getWorksheet('Hoja22');

  if (!sheet22 || !sheet16 || !sheet17 || !sheet18) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja22 (Gastos Consolidados)...');

  let totalE = 0, totalF = 0;
  for (const { origen, destino } of HOJA22_ROW_MAPPING) {
    const e16 = safeNumericValue(sheet16.getCell(`E${origen}`));
    const e17 = safeNumericValue(sheet17.getCell(`E${origen}`));
    const e18 = safeNumericValue(sheet18.getCell(`E${origen}`));
    const sumaE = e16 + e17 + e18;

    const f16 = safeNumericValue(sheet16.getCell(`F${origen}`));
    const f17 = safeNumericValue(sheet17.getCell(`F${origen}`));
    const f18 = safeNumericValue(sheet18.getCell(`F${origen}`));
    const sumaF = f16 + f17 + f18;

    writeCellSafe(sheet22, `E${destino}`, sumaE);
    writeCellSafe(sheet22, `F${destino}`, sumaF);
    writeCellSafe(sheet22, `G${destino}`, sumaE + sumaF);
    writeCellSafe(sheet22, `K${destino}`, sumaE);
    writeCellSafe(sheet22, `L${destino}`, sumaF);
    writeCellSafe(sheet22, `M${destino}`, sumaE + sumaF);

    totalE += sumaE;
    totalF += sumaF;

    if (sumaE !== 0 || sumaF !== 0) {
      console.log(`[ExcelJS] Hoja22 fila ${destino}: E=${sumaE}, F=${sumaF}, G=${sumaE + sumaF}`);
    }
  }

  console.log(`[ExcelJS] Hoja22 - Totales: E=${totalE}, F=${totalF}, G=${totalE + totalF}`);
  console.log('[ExcelJS] Hoja22 completada.');
}

// ─── Exportación principal ─────────────────────────────────────────────────

export function writeServiceExpensesData(
  workbook: ExcelJS.Workbook,
  _options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { accountsByService, serviceCodesWithChildren } = ctx;

  for (const config of SERVICE_CONFIGS) {
    const sheet = workbook.getWorksheet(config.sheetName);
    if (!sheet) continue;
    const serviceAccounts = accountsByService[config.serviceKey] || [];
    writeServiceSheetExpenses(sheet, config, serviceAccounts, serviceCodesWithChildren);
  }

  writeConsolidatedExpenses(workbook);
}
