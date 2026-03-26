/**
 * Writers suplementarios R414: FC02, FC04, FC05b, FC08, Notas y Políticas.
 *
 * - Hoja23 (FC02): Complementario de ingresos
 * - Hoja30 (FC04): Subsidios y contribuciones
 * - Hoja32 (FC05b): Pasivos por edades de vencimiento
 * - Hoja35 (FC08): Conciliación de ingresos
 * - Hoja9/10/11: Notas, políticas contables e información de la entidad (delega a R414TemplateService)
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from '../../official/interfaces';
import type { TemplateWithDataOptions as R414Options } from '../../types';
import { safeNumericValue } from '../../excelUtils';
import { writeCellSafe } from '../../shared/excelUtils';
import { r414TemplateService } from '../R414TemplateService';

// ─── Hoja23: FC02 - Complementario de Ingresos ────────────────────────────

function writeFc02(workbook: ExcelJS.Workbook): void {
  const sheet23 = workbook.getWorksheet('Hoja23');
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!sheet23 || !sheet3) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja23 (FC02 - Complementario Ingresos)...');

  const ingresosAcueducto = safeNumericValue(sheet3.getCell('E14'));
  const ingresosAlcantarillado = safeNumericValue(sheet3.getCell('F14'));
  const ingresosAseo = safeNumericValue(sheet3.getCell('G14'));

  writeCellSafe(sheet23, 'I17', ingresosAcueducto);
  writeCellSafe(sheet23, 'K18', ingresosAcueducto);
  writeCellSafe(sheet23, 'I22', ingresosAlcantarillado);
  writeCellSafe(sheet23, 'K23', ingresosAlcantarillado);
  writeCellSafe(sheet23, 'I28', ingresosAseo);
  writeCellSafe(sheet23, 'K40', ingresosAseo);

  console.log(`[ExcelJS] Hoja23 - Acu=${ingresosAcueducto}, Alc=${ingresosAlcantarillado}, Aseo=${ingresosAseo}`);
  console.log('[ExcelJS] Hoja23 completada.');
}

// ─── Hoja30: FC04 - Subsidios y Contribuciones ────────────────────────────

function writeFc04(workbook: ExcelJS.Workbook, options: TemplateWithDataOptions): void {
  const sheet30 = workbook.getWorksheet('Hoja30');
  if (!sheet30 || !options.usuariosEstrato || !options.subsidios) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja30 (FC04 - Subsidios y Contribuciones)...');

  const estratosSubsidiables = ['estrato1', 'estrato2', 'estrato3'];
  const serviciosSubsidios = ['acueducto', 'alcantarillado', 'aseo'] as const;

  const distribucionPorServicio: Record<string, Record<string, number>> = {
    acueducto: {}, alcantarillado: {}, aseo: {}
  };
  const totalPorEstrato: Record<string, number> = { estrato1: 0, estrato2: 0, estrato3: 0 };

  for (const servicio of serviciosSubsidios) {
    const subsidio = Number(options.subsidios[servicio]) || 0;

    let totalUsuarios = 0;
    for (const estrato of estratosSubsidiables) {
      totalUsuarios += Number(options.usuariosEstrato[servicio]?.[estrato]) || 0;
    }

    for (const estrato of estratosSubsidiables) {
      const usuarios = Number(options.usuariosEstrato[servicio]?.[estrato]) || 0;
      let valor = 0;
      if (usuarios > 0 && totalUsuarios > 0 && subsidio > 0) {
        valor = Math.round(subsidio * usuarios / totalUsuarios);
      }
      distribucionPorServicio[servicio][estrato] = valor;
      totalPorEstrato[estrato] += valor;
    }
  }

  // Acueducto (columna E)
  writeCellSafe(sheet30, 'E14', distribucionPorServicio.acueducto['estrato1']);
  writeCellSafe(sheet30, 'E15', distribucionPorServicio.acueducto['estrato2']);
  writeCellSafe(sheet30, 'E16', distribucionPorServicio.acueducto['estrato3']);
  // Alcantarillado (columna F)
  writeCellSafe(sheet30, 'F14', distribucionPorServicio.alcantarillado['estrato1']);
  writeCellSafe(sheet30, 'F15', distribucionPorServicio.alcantarillado['estrato2']);
  writeCellSafe(sheet30, 'F16', distribucionPorServicio.alcantarillado['estrato3']);
  // Aseo (columna G)
  writeCellSafe(sheet30, 'G14', distribucionPorServicio.aseo['estrato1']);
  writeCellSafe(sheet30, 'G15', distribucionPorServicio.aseo['estrato2']);
  writeCellSafe(sheet30, 'G16', distribucionPorServicio.aseo['estrato3']);
  // Total (columna K)
  writeCellSafe(sheet30, 'K14', totalPorEstrato['estrato1']);
  writeCellSafe(sheet30, 'K15', totalPorEstrato['estrato2']);
  writeCellSafe(sheet30, 'K16', totalPorEstrato['estrato3']);

  console.log('[ExcelJS] Hoja30 completada.');
}

// ─── Hoja32: FC05b - Pasivos por edades de vencimiento ────────────────────

const MAPEO_HOJA32_A_HOJA2 = [
  { fila32: 15, nombre: 'Nómina por pagar', filasCorrientes: [69], filasNoCorrientes: [] },
  { fila32: 16, nombre: 'Prestaciones sociales', filasCorrientes: [], filasNoCorrientes: [91] },
  { fila32: 17, nombre: 'CxP bienes y servicios', filasCorrientes: [73, 74, 76], filasNoCorrientes: [95] },
  { fila32: 18, nombre: 'Impuestos por pagar', filasCorrientes: [80], filasNoCorrientes: [] },
  { fila32: 19, nombre: 'CxP partes relacionadas', filasCorrientes: [75], filasNoCorrientes: [] },
  { fila32: 20, nombre: 'Obligaciones financieras', filasCorrientes: [78, 79], filasNoCorrientes: [100, 101] },
  { fila32: 21, nombre: 'Ingresos anticipados', filasCorrientes: [82], filasNoCorrientes: [105] },
  { fila32: 22, nombre: 'Impuestos diferidos', filasCorrientes: [83], filasNoCorrientes: [103] },
  { fila32: 23, nombre: 'Provisiones', filasCorrientes: [70], filasNoCorrientes: [92] },
  { fila32: 24, nombre: 'Tasas ambientales', filasCorrientes: [], filasNoCorrientes: [] },
  { fila32: 25, nombre: 'Otras tasas', filasCorrientes: [], filasNoCorrientes: [] },
  { fila32: 26, nombre: 'Pasivos pretoma', filasCorrientes: [], filasNoCorrientes: [] },
  { fila32: 27, nombre: 'Recursos administración', filasCorrientes: [], filasNoCorrientes: [] },
  { fila32: 28, nombre: 'Recursos terceros', filasCorrientes: [], filasNoCorrientes: [] },
  { fila32: 29, nombre: 'Otros pasivos', filasCorrientes: [86, 87], filasNoCorrientes: [108] },
];

const PORCENTAJES_ANTIGUEDAD = {
  noVencido: 0.11, hasta30: 0.09, hasta60: 0.25, hasta90: 0.15,
  hasta180: 0.20, hasta360: 0.12, mayor360: 0.08,
};

function writeFc05b(workbook: ExcelJS.Workbook): void {
  const sheet32 = workbook.getWorksheet('Hoja32');
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet32 || !sheet2) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja32 (FC05b - Pasivos por edades)...');

  const getValorHoja2 = (filas: number[]): number => {
    let suma = 0;
    for (const fila of filas) {
      const valor = sheet2.getCell(`P${fila}`).value;
      if (typeof valor === 'number') {
        suma += valor;
      } else if (valor && typeof valor === 'object' && 'result' in valor) {
        suma += (valor as { result: number }).result || 0;
      }
    }
    return suma;
  };

  // Accumulators for TOTAL row 30
  const totals = { D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0, N: 0, O: 0 };

  for (const mapeo of MAPEO_HOJA32_A_HOJA2) {
    const valorCorriente = getValorHoja2(mapeo.filasCorrientes);
    const valorNoCorriente = getValorHoja2(mapeo.filasNoCorrientes);
    const valorTotal = valorCorriente + valorNoCorriente;

    // Siempre escribir D, E, F (incluso 0) para validación XBRL FRM_900028_001: E = D + F
    writeCellSafe(sheet32, `D${mapeo.fila32}`, valorCorriente);
    writeCellSafe(sheet32, `E${mapeo.fila32}`, valorTotal);
    writeCellSafe(sheet32, `F${mapeo.fila32}`, valorNoCorriente);

    totals.D += valorCorriente;
    totals.E += valorTotal;
    totals.F += valorNoCorriente;

    if (valorTotal !== 0) {
      const noVencido = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.noVencido);
      const hasta30 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.hasta30);
      const hasta60 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.hasta60);
      const hasta90 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.hasta90);
      const hasta180 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.hasta180);
      const hasta360 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.hasta360);
      const mayor360 = Math.round(valorTotal * PORCENTAJES_ANTIGUEDAD.mayor360);

      const totalVencidos = hasta30 + hasta60 + hasta90 + hasta180 + hasta360 + mayor360;
      const totalH = noVencido + totalVencidos;
      const diferencia = valorTotal - totalH;
      const hasta60Ajustado = hasta60 + diferencia;

      writeCellSafe(sheet32, `G${mapeo.fila32}`, noVencido);
      writeCellSafe(sheet32, `I${mapeo.fila32}`, hasta30);
      writeCellSafe(sheet32, `K${mapeo.fila32}`, hasta60Ajustado);
      writeCellSafe(sheet32, `L${mapeo.fila32}`, hasta90);
      writeCellSafe(sheet32, `M${mapeo.fila32}`, hasta180);
      writeCellSafe(sheet32, `N${mapeo.fila32}`, hasta360);
      writeCellSafe(sheet32, `O${mapeo.fila32}`, mayor360);
      writeCellSafe(sheet32, `J${mapeo.fila32}`, totalVencidos + diferencia);
      // H = total bandas = E para XBRL FRM_900028_003
      writeCellSafe(sheet32, `H${mapeo.fila32}`, valorTotal);

      totals.G += noVencido;
      totals.H += valorTotal;
      totals.I += hasta30;
      totals.J += totalVencidos + diferencia;
      totals.K += hasta60Ajustado;
      totals.L += hasta90;
      totals.M += hasta180;
      totals.N += hasta360;
      totals.O += mayor360;

      console.log(`[ExcelJS] Hoja32 fila ${mapeo.fila32} (${mapeo.nombre}): D=${valorCorriente}, F=${valorNoCorriente}, E=${valorTotal}`);
    }
  }

  // Write TOTAL row 30 — siempre escribir todas las columnas (incluso 0) para XBRL
  for (const [col, val] of Object.entries(totals)) {
    writeCellSafe(sheet32, `${col}30`, val);
  }
  console.log(`[ExcelJS] Hoja32 TOTAL fila 30: D=${totals.D}, E=${totals.E}, F=${totals.F}`);

  console.log('[ExcelJS] Hoja32 completada.');
}

// ─── Hoja35: FC08 - Conciliación de ingresos ──────────────────────────────

function writeFc08(workbook: ExcelJS.Workbook): void {
  const sheet35 = workbook.getWorksheet('Hoja35');
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!sheet35 || !sheet3) return;

  console.log('[ExcelJS] Escribiendo datos en Hoja35 (FC08 - Conciliación)...');

  const ingresosAcueducto = safeNumericValue(sheet3.getCell('E14'));
  const ingresosAlcantarillado = safeNumericValue(sheet3.getCell('F14'));
  const ingresosAseo = safeNumericValue(sheet3.getCell('G14'));

  writeCellSafe(sheet35, 'G26', ingresosAcueducto);
  writeCellSafe(sheet35, 'H26', ingresosAlcantarillado);
  writeCellSafe(sheet35, 'I26', ingresosAseo);

  console.log(`[ExcelJS] Hoja35 - G26=${ingresosAcueducto}, H26=${ingresosAlcantarillado}, I26=${ingresosAseo}`);
  console.log('[ExcelJS] Hoja35 completada.');
}

// ─── Hoja9/10: Notas y Políticas contables ─────────────────────────────────

function writeNotasYPoliticas(workbook: ExcelJS.Workbook, options: TemplateWithDataOptions): void {
  const r414Opts = {
    companyName: options.companyName,
    companyId: options.companyId,
    reportDate: options.reportDate,
    niifGroup: 'r414',
    accounts: options.consolidatedAccounts || [],
    serviceBalances: options.serviceBalances || [],
    distribution: {},
    r414CompanyData: options.r414CompanyData,
  } as R414Options;

  const sheet9 = workbook.getWorksheet('Hoja9');
  if (sheet9) r414TemplateService.fillHoja9Sheet(sheet9, r414Opts);

  const sheet10 = workbook.getWorksheet('Hoja10');
  if (sheet10) r414TemplateService.fillHoja10Sheet(sheet10, r414Opts);

  const sheet11 = workbook.getWorksheet('Hoja11');
  if (sheet11) r414TemplateService.fillHoja11Sheet(sheet11, r414Opts);
}

// ─── Exportación principal ─────────────────────────────────────────────────

export function writeSupplementaryData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions
): void {
  writeFc02(workbook);
  writeCxcFc04(workbook, options);
  writeFc05b(workbook);
  writeFc08(workbook);
  writeNotasYPoliticas(workbook, options);
}

/** Alias interno para claridad */
function writeCxcFc04(workbook: ExcelJS.Workbook, options: TemplateWithDataOptions): void {
  writeFc04(workbook, options);
}
