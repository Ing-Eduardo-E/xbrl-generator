/**
 * Writer CxC R414: Hoja24/25/26 — Cuentas por cobrar por estrato y servicio.
 *
 * Refactorizado: una función paramétrica reemplaza 3 copias cuasi-idénticas.
 * Cada hoja tiene columnas y filas ligeramente diferentes, configuradas
 * en CXC_SHEET_CONFIGS.
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions, UsuariosEstrato } from '../../official/interfaces';
import { safeNumericValue } from '../../excelUtils';
import { writeCellSafe } from '../../shared/excelUtils';

// ─── Tipos de configuración ────────────────────────────────────────────────

interface EstratoConfig {
  fila: number;
  key: string;
  nombre: string;
}

interface CxcSheetConfig {
  sheetName: string;
  serviceKey: keyof UsuariosEstrato;
  sourceCol: string;
  targetCols: { corriente: string; noCorriente: string; total: string; suma: string };
  rangoCols: Array<{ columna: string; porcentaje: number }>;
  adjustmentCol: string;
  estratosResidenciales: EstratoConfig[];
  estratosNoResidenciales: EstratoConfig[];
  distribucionTipica: Array<{ fila: number; porcentaje: number }>;
}

// ─── Distribución de rangos de vencimiento (porcentajes) ───────────────────

const RANGOS_STANDARD: Array<{ columna: string; porcentaje: number }> = [
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

const RANGOS_ASEO: Array<{ columna: string; porcentaje: number }> = [
  { columna: 'H', porcentaje: 0.11 },
  { columna: 'I', porcentaje: 0.09 },
  { columna: 'J', porcentaje: 0.25 },
  { columna: 'K', porcentaje: 0.15 },
  { columna: 'L', porcentaje: 0.20 },
  { columna: 'M', porcentaje: 0.12 },
  { columna: 'N', porcentaje: 0.08 },
  { columna: 'O', porcentaje: 0.00 },
  { columna: 'P', porcentaje: 0.00 },
];

const ESTRATOS_RESIDENCIALES_19: EstratoConfig[] = [
  { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
  { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
  { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
  { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
  { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
  { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' },
];

const ESTRATOS_NO_RESIDENCIALES_25: EstratoConfig[] = [
  { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
  { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
  { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
  { fila: 28, key: 'especial', nombre: 'No residencial especial' },
];

const ESTRATOS_RESIDENCIALES_15: EstratoConfig[] = [
  { fila: 15, key: 'estrato1', nombre: 'Residencial Estrato 1' },
  { fila: 16, key: 'estrato2', nombre: 'Residencial Estrato 2' },
  { fila: 17, key: 'estrato3', nombre: 'Residencial Estrato 3' },
  { fila: 18, key: 'estrato4', nombre: 'Residencial Estrato 4' },
  { fila: 19, key: 'estrato5', nombre: 'Residencial Estrato 5' },
  { fila: 20, key: 'estrato6', nombre: 'Residencial Estrato 6' },
];

const ESTRATOS_NO_RESIDENCIALES_21: EstratoConfig[] = [
  { fila: 21, key: 'industrial', nombre: 'No residencial industrial' },
  { fila: 22, key: 'comercial', nombre: 'No residencial comercial' },
  { fila: 23, key: 'oficial', nombre: 'No residencial oficial' },
  { fila: 24, key: 'especial', nombre: 'No residencial especial' },
];

const DISTRIBUCION_TIPICA: Array<{ porcentaje: number }> = [
  { porcentaje: 0.25 }, { porcentaje: 0.30 }, { porcentaje: 0.20 }, { porcentaje: 0.10 },
  { porcentaje: 0.05 }, { porcentaje: 0.03 }, { porcentaje: 0.02 }, { porcentaje: 0.03 },
  { porcentaje: 0.01 }, { porcentaje: 0.01 },
];

// ─── Configuraciones por hoja ──────────────────────────────────────────────

const CXC_SHEET_CONFIGS: CxcSheetConfig[] = [
  {
    sheetName: 'Hoja24',
    serviceKey: 'acueducto',
    sourceCol: 'I',
    targetCols: { corriente: 'G', noCorriente: 'H', total: 'I', suma: 'S' },
    rangoCols: RANGOS_STANDARD,
    adjustmentCol: 'L',
    estratosResidenciales: ESTRATOS_RESIDENCIALES_19,
    estratosNoResidenciales: ESTRATOS_NO_RESIDENCIALES_25,
    distribucionTipica: ESTRATOS_RESIDENCIALES_19.concat(ESTRATOS_NO_RESIDENCIALES_25).map((e, i) => ({ fila: e.fila, porcentaje: DISTRIBUCION_TIPICA[i].porcentaje })),
  },
  {
    sheetName: 'Hoja25',
    serviceKey: 'alcantarillado',
    sourceCol: 'J',
    targetCols: { corriente: 'G', noCorriente: 'H', total: 'I', suma: 'S' },
    rangoCols: RANGOS_STANDARD,
    adjustmentCol: 'L',
    estratosResidenciales: ESTRATOS_RESIDENCIALES_19,
    estratosNoResidenciales: ESTRATOS_NO_RESIDENCIALES_25,
    distribucionTipica: ESTRATOS_RESIDENCIALES_19.concat(ESTRATOS_NO_RESIDENCIALES_25).map((e, i) => ({ fila: e.fila, porcentaje: DISTRIBUCION_TIPICA[i].porcentaje })),
  },
  {
    sheetName: 'Hoja26',
    serviceKey: 'aseo',
    sourceCol: 'K',
    targetCols: { corriente: 'E', noCorriente: 'F', total: 'G', suma: 'Q' },
    rangoCols: RANGOS_ASEO,
    adjustmentCol: 'J',
    estratosResidenciales: ESTRATOS_RESIDENCIALES_15,
    estratosNoResidenciales: ESTRATOS_NO_RESIDENCIALES_21,
    distribucionTipica: ESTRATOS_RESIDENCIALES_15.concat(ESTRATOS_NO_RESIDENCIALES_21).map((e, i) => ({ fila: e.fila, porcentaje: DISTRIBUCION_TIPICA[i].porcentaje })),
  },
];

// ─── Función paramétrica de escritura CxC ──────────────────────────────────

function writeCxcSheet(
  sheet: ExcelJS.Worksheet,
  sheet2: ExcelJS.Worksheet,
  config: CxcSheetConfig,
  options: TemplateWithDataOptions
): void {
  console.log(`[ExcelJS] Escribiendo datos en ${config.sheetName} (CXC ${config.serviceKey} por estrato)...`);

  // Obtener totales CxC desde Hoja2
  const cxcCorrientes19 = safeNumericValue(sheet2.getCell(`${config.sourceCol}19`));
  const cxcCorrientes20 = safeNumericValue(sheet2.getCell(`${config.sourceCol}20`));
  const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;

  const cxcNoCorrientes43 = safeNumericValue(sheet2.getCell(`${config.sourceCol}43`));
  const cxcNoCorrientes44 = safeNumericValue(sheet2.getCell(`${config.sourceCol}44`));
  const totalCXCNoCorrientes = cxcNoCorrientes43 + cxcNoCorrientes44;

  console.log(`[ExcelJS] ${config.sheetName} - CXC: Corrientes=${totalCXCCorrientes}, NoCorrientes=${totalCXCNoCorrientes}`);

  const todosLosEstratos = [...config.estratosResidenciales, ...config.estratosNoResidenciales];
  const { targetCols, rangoCols, adjustmentCol } = config;

  const writeEstratoRow = (fila: number, valorCorriente: number, valorNoCorriente: number, logInfo?: string) => {
    const totalCXCEstrato = valorCorriente + valorNoCorriente;

    writeCellSafe(sheet, `${targetCols.corriente}${fila}`, valorCorriente);
    writeCellSafe(sheet, `${targetCols.noCorriente}${fila}`, valorNoCorriente);
    writeCellSafe(sheet, `${targetCols.total}${fila}`, totalCXCEstrato);

    let sumaRangos = 0;
    for (const rango of rangoCols) {
      const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
      writeCellSafe(sheet, `${rango.columna}${fila}`, valorRango);
      sumaRangos += valorRango;
    }

    const diferencia = totalCXCEstrato - sumaRangos;
    if (diferencia !== 0) {
      const valorActual = safeNumericValue(sheet.getCell(`${adjustmentCol}${fila}`));
      writeCellSafe(sheet, `${adjustmentCol}${fila}`, valorActual + diferencia);
      sumaRangos = totalCXCEstrato;
    }
    writeCellSafe(sheet, `${targetCols.suma}${fila}`, sumaRangos);

    if (totalCXCEstrato !== 0 && logInfo) {
      console.log(`[ExcelJS] ${config.sheetName} fila ${fila} (${logInfo}): ${targetCols.total}=${totalCXCEstrato}, ${targetCols.suma}=${sumaRangos}`);
    }
  };

  // Distribuir por usuarios reales o tipica
  const usuariosServicio = options.usuariosEstrato?.[config.serviceKey];

  if (usuariosServicio) {
    console.log(`[ExcelJS] ${config.sheetName} - Usando distribución proporcional por usuarios reales`);

    let totalUsuarios = 0;
    for (const estrato of todosLosEstratos) {
      totalUsuarios += Number(usuariosServicio[estrato.key]) || 0;
    }

    console.log(`[ExcelJS] ${config.sheetName} - Total usuarios: ${totalUsuarios}`);

    for (const estrato of todosLosEstratos) {
      const usuarios = Number(usuariosServicio[estrato.key]) || 0;
      let valorCorriente = 0, valorNoCorriente = 0;

      if (usuarios > 0 && totalUsuarios > 0) {
        valorCorriente = Math.round(totalCXCCorrientes * usuarios / totalUsuarios);
        valorNoCorriente = Math.round(totalCXCNoCorrientes * usuarios / totalUsuarios);
      }

      const porcentaje = totalUsuarios > 0 ? (usuarios / totalUsuarios * 100).toFixed(2) : '0.00';
      writeEstratoRow(estrato.fila, valorCorriente, valorNoCorriente, `${estrato.nombre}: usuarios=${usuarios} (${porcentaje}%)`);
    }
  } else {
    console.log(`[ExcelJS] ${config.sheetName} - Sin datos de usuarios, usando distribución típica`);

    for (const dist of config.distribucionTipica) {
      const valorCorriente = Math.round(totalCXCCorrientes * dist.porcentaje);
      const valorNoCorriente = Math.round(totalCXCNoCorrientes * dist.porcentaje);
      writeEstratoRow(dist.fila, valorCorriente, valorNoCorriente);
    }
  }

  console.log(`[ExcelJS] ${config.sheetName} - Total distribuido: ${totalCXCCorrientes + totalCXCNoCorrientes}`);
  console.log(`[ExcelJS] ${config.sheetName} completada.`);
}

// ─── Exportación principal ─────────────────────────────────────────────────

export function writeCxcData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions
): void {
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet2) return;

  for (const config of CXC_SHEET_CONFIGS) {
    const sheet = workbook.getWorksheet(config.sheetName);
    if (!sheet) continue;
    writeCxcSheet(sheet, sheet2, config, options);
  }
}
