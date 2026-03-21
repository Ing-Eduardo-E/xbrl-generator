/**
 * Reescritura de hojas FC (formularios complementarios) con ExcelJS
 * para grupo1, grupo2, grupo3.
 *
 * FC01: Gastos por servicio (acueducto, alcantarillado, aseo, consolidado)
 * FC02: Complementario de ingresos
 * FC03: CxC por estrato (grupo1/grupo2 solamente)
 * FC05b: Pasivos por edades de vencimiento (grupo1 solamente)
 * FC08: Conciliación de ingresos (grupo1 solamente)
 */
import type ExcelJS from 'exceljs';
import type { ServiceBalanceData } from '../types';
import type { UsuariosEstrato } from '../official/interfaces';
import { safeNumericValue } from '../excelUtils';
import {
  fillExpenseColumnE,
  fillExpenseColumnF,
  calculateColumnG,
  sumAccountsByPrefixes,
  fillCxCByEstrato,
  ESTRATOS_RESIDENCIALES,
  ESTRATOS_NO_RESIDENCIALES,
  RANGOS_VENCIMIENTO_STANDARD,
} from '../shared/rewriterHelpers';
import {
  GRUPO_FC01_EXPENSE_MAPPINGS,
  GRUPO_FC01_DATA_ROWS,
  GRUPO_FC01_ZERO_F_ROWS,
  type GrupoConfig,
} from './mappings';

// ============================================
// FC01: GASTOS POR SERVICIO
// ============================================

/**
 * Reescribe las hojas FC01 (gastos por servicio) para grupo1/2/3.
 */
export function rewriteGrupoFC01(
  workbook: ExcelJS.Workbook,
  accountsByService: Record<string, ServiceBalanceData[]>,
  activeServices: string[],
  config: GrupoConfig
): void {
  const serviceSheetMap: Array<{ service: string; sheetName: string; isAseo: boolean }> = [
    { service: 'acueducto', sheetName: config.fc01AcuSheet, isAseo: false },
    { service: 'alcantarillado', sheetName: config.fc01AlcSheet, isAseo: false },
    { service: 'aseo', sheetName: config.fc01AseoSheet, isAseo: true },
  ];

  for (const { service, sheetName, isAseo } of serviceSheetMap) {
    if (!activeServices.includes(service)) continue;
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    console.log(`[ExcelJS-Grupo] Escribiendo FC01 ${service} en ${sheetName}...`);

    const serviceAccounts = accountsByService[service] || [];

    // Columna E: Gastos (clase 5)
    fillExpenseColumnE(sheet, serviceAccounts, GRUPO_FC01_EXPENSE_MAPPINGS);

    // Columna F: Costos de ventas (clase 6)
    fillExpenseColumnF(sheet, serviceAccounts, {
      costTargetRow: config.fc01CostRow,
      isAseo,
      aseoDisposalRow: config.fc01AseoDisposalRow ?? undefined,
      zeroRows: GRUPO_FC01_ZERO_F_ROWS,
    });

    // Columna G: Total (E + F)
    calculateColumnG(sheet, GRUPO_FC01_DATA_ROWS);

    console.log(`[ExcelJS-Grupo] FC01 ${service} completado.`);
  }

  // FC01 Consolidado
  rewriteGrupoFC01Consolidado(workbook, accountsByService, activeServices, config);
}

/**
 * Reescribe la hoja FC01 consolidada (suma de todos los servicios).
 */
function rewriteGrupoFC01Consolidado(
  workbook: ExcelJS.Workbook,
  accountsByService: Record<string, ServiceBalanceData[]>,
  activeServices: string[],
  config: GrupoConfig
): void {
  const sheetConsolidado = workbook.getWorksheet(config.fc01ConsolidadoSheet);
  if (!sheetConsolidado) return;

  console.log(`[ExcelJS-Grupo] Escribiendo FC01 consolidado en ${config.fc01ConsolidadoSheet}...`);

  for (const mapping of GRUPO_FC01_EXPENSE_MAPPINGS) {
    let totalValue = 0;
    for (const service of activeServices) {
      const serviceAccounts = accountsByService[service] || [];
      totalValue += sumAccountsByPrefixes(serviceAccounts, mapping.pucPrefixes, mapping.excludePrefixes);
    }
    sheetConsolidado.getCell(`E${mapping.row}`).value = totalValue;
  }

  // Costos de ventas consolidados
  let costosConsolidados = 0;
  for (const service of activeServices) {
    const serviceAccounts = accountsByService[service] || [];
    costosConsolidados += sumAccountsByPrefixes(serviceAccounts, ['6']);
  }
  sheetConsolidado.getCell(`F${config.fc01CostRow}`).value = costosConsolidados;

  for (const row of GRUPO_FC01_ZERO_F_ROWS) {
    sheetConsolidado.getCell(`F${row}`).value = 0;
  }

  calculateColumnG(sheetConsolidado, GRUPO_FC01_DATA_ROWS);

  console.log(`[ExcelJS-Grupo] FC01 consolidado completado.`);
}

// ============================================
// FC02: COMPLEMENTARIO DE INGRESOS
// ============================================

/**
 * Reescribe la hoja FC02 para grupo1/2/3.
 * Copia ingresos por servicio desde Hoja3 (ER).
 */
export function rewriteGrupoFC02(
  workbook: ExcelJS.Workbook,
  config: GrupoConfig
): void {
  const fc02 = workbook.getWorksheet(config.fc02Sheet);
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!fc02 || !sheet3) return;

  console.log(`[ExcelJS-Grupo] Escribiendo FC02 en ${config.fc02Sheet}...`);

  // Ingresos por servicio desde Hoja3 fila 15 (Ingresos actividades ordinarias)
  const ingAcu = safeNumericValue(sheet3.getCell('J15'));
  const ingAlc = safeNumericValue(sheet3.getCell('K15'));
  const ingAseo = safeNumericValue(sheet3.getCell('L15'));

  // FC02 - Acueducto (fila 18, subtotal en fila 18)
  fc02.getCell('I17').value = ingAcu;
  fc02.getCell('K18').value = ingAcu;

  // FC02 - Alcantarillado (fila 22-23)
  fc02.getCell('I22').value = ingAlc;
  fc02.getCell('K23').value = ingAlc;

  // FC02 - Aseo (fila 28, subtotal en fila 35)
  fc02.getCell('I28').value = ingAseo;
  fc02.getCell('K40').value = ingAseo;

  console.log(`[ExcelJS-Grupo] FC02 completado: Acu=${ingAcu}, Alc=${ingAlc}, Aseo=${ingAseo}`);
}

// ============================================
// FC03: CxC POR ESTRATO (grupo1/grupo2 only)
// ============================================

/**
 * Reescribe las hojas FC03 (CxC por estrato) para grupo1/grupo2.
 * Grupo3 NO tiene FC03.
 */
export function rewriteGrupoFC03(
  workbook: ExcelJS.Workbook,
  config: GrupoConfig,
  usuariosEstrato?: UsuariosEstrato
): void {
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (!sheet2) return;

  // FC03-1: CxC Acueducto
  if (config.fc03AcuSheet) {
    const fc03Acu = workbook.getWorksheet(config.fc03AcuSheet);
    if (fc03Acu) {
      console.log(`[ExcelJS-Grupo] Escribiendo FC03 Acueducto en ${config.fc03AcuSheet}...`);

      const cxcCorr = safeNumericValue(sheet2.getCell('J17')) +
                       safeNumericValue(sheet2.getCell('J18'));
      const cxcNoCorr = safeNumericValue(sheet2.getCell('J32'));

      const todosEstratos = [...ESTRATOS_RESIDENCIALES, ...ESTRATOS_NO_RESIDENCIALES];
      fillCxCByEstrato(
        fc03Acu, cxcCorr, cxcNoCorr, todosEstratos,
        RANGOS_VENCIMIENTO_STANDARD,
        'G', 'H', 'I', 'S', 'L',
        usuariosEstrato?.acueducto
      );
      console.log(`[ExcelJS-Grupo] FC03 Acueducto completado.`);
    }
  }

  // FC03-2: CxC Alcantarillado
  if (config.fc03AlcSheet) {
    const fc03Alc = workbook.getWorksheet(config.fc03AlcSheet);
    if (fc03Alc) {
      console.log(`[ExcelJS-Grupo] Escribiendo FC03 Alcantarillado en ${config.fc03AlcSheet}...`);

      const cxcCorr = safeNumericValue(sheet2.getCell('K17')) +
                       safeNumericValue(sheet2.getCell('K18'));
      const cxcNoCorr = safeNumericValue(sheet2.getCell('K32'));

      const todosEstratos = [...ESTRATOS_RESIDENCIALES, ...ESTRATOS_NO_RESIDENCIALES];
      fillCxCByEstrato(
        fc03Alc, cxcCorr, cxcNoCorr, todosEstratos,
        RANGOS_VENCIMIENTO_STANDARD,
        'G', 'H', 'I', 'S', 'L',
        usuariosEstrato?.alcantarillado
      );
      console.log(`[ExcelJS-Grupo] FC03 Alcantarillado completado.`);
    }
  }

  // FC03-3: CxC Aseo (diferente layout: columnas E/F/G, rangos H-P, suma Q)
  if (config.fc03AseoSheet) {
    const fc03Aseo = workbook.getWorksheet(config.fc03AseoSheet);
    if (fc03Aseo) {
      console.log(`[ExcelJS-Grupo] Escribiendo FC03 Aseo en ${config.fc03AseoSheet}...`);

      const cxcCorr = safeNumericValue(sheet2.getCell('L17')) +
                       safeNumericValue(sheet2.getCell('L18'));
      const cxcNoCorr = safeNumericValue(sheet2.getCell('L32'));

      // Aseo usa filas 15-24 en lugar de 19-28
      const estratosAseo = [
        { fila: 15, key: 'estrato1', nombre: 'Estrato 1' },
        { fila: 16, key: 'estrato2', nombre: 'Estrato 2' },
        { fila: 17, key: 'estrato3', nombre: 'Estrato 3' },
        { fila: 18, key: 'estrato4', nombre: 'Estrato 4' },
        { fila: 19, key: 'estrato5', nombre: 'Estrato 5' },
        { fila: 20, key: 'estrato6', nombre: 'Estrato 6' },
        { fila: 21, key: 'industrial', nombre: 'Industrial' },
        { fila: 22, key: 'comercial', nombre: 'Comercial' },
        { fila: 23, key: 'oficial', nombre: 'Oficial' },
        { fila: 24, key: 'especial', nombre: 'Especial' },
      ];

      const rangosAseo = [
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

      fillCxCByEstrato(
        fc03Aseo, cxcCorr, cxcNoCorr, estratosAseo,
        rangosAseo,
        'E', 'F', 'G', 'Q', 'J',
        usuariosEstrato?.aseo
      );
      console.log(`[ExcelJS-Grupo] FC03 Aseo completado.`);
    }
  }
}

// ============================================
// FC05b: PASIVOS POR EDADES (grupo1 only)
// ============================================

const FC05B_PAYABLES_MAPPING = [
  { row: 15, pucPrefixes: ['2505', '2510'], label: 'Nómina por pagar' },
  { row: 16, pucPrefixes: ['2515', '2520'], label: 'Prestaciones sociales' },
  { row: 17, pucPrefixes: ['2205', '2210', '22'], label: 'Cuentas comerciales por pagar' },
  { row: 18, pucPrefixes: ['24'], label: 'Impuestos por pagar' },
  { row: 19, pucPrefixes: ['23'], label: 'CxP partes relacionadas' },
  { row: 20, pucPrefixes: ['21'], label: 'Obligaciones financieras' },
  { row: 21, pucPrefixes: ['27'], label: 'Ingresos diferidos' },
  { row: 22, pucPrefixes: ['2404', '2408'], label: 'Pasivos impuesto diferido' },
  { row: 23, pucPrefixes: ['26'], label: 'Provisiones' },
  { row: 29, pucPrefixes: ['28'], label: 'Otros pasivos' },
];

const PORCENTAJES_ANTIGUEDAD = {
  noVencido: 0.11, hasta30: 0.09, hasta60: 0.25,
  hasta90: 0.15, hasta180: 0.20, hasta360: 0.12, mayor360: 0.08,
};

/**
 * Reescribe la hoja FC05b (pasivos por edades) para grupo1.
 */
export function rewriteGrupoFC05b(
  workbook: ExcelJS.Workbook,
  consolidatedAccounts: Array<{ code: string; value: number; isLeaf: boolean }>,
  config: GrupoConfig
): void {
  if (!config.fc05bSheet) return;
  const sheet = workbook.getWorksheet(config.fc05bSheet);
  if (!sheet) return;

  console.log(`[ExcelJS-Grupo] Escribiendo FC05b en ${config.fc05bSheet}...`);

  for (const mapping of FC05B_PAYABLES_MAPPING) {
    let valorTotal = 0;
    for (const account of consolidatedAccounts) {
      if (!account.isLeaf) continue;
      for (const prefix of mapping.pucPrefixes) {
        if (account.code.startsWith(prefix)) {
          valorTotal += account.value;
          break;
        }
      }
    }

    if (valorTotal === 0) continue;

    // Escribir valor total
    sheet.getCell(`E${mapping.row}`).value = valorTotal;

    // Distribuir por antigüedad
    const p = PORCENTAJES_ANTIGUEDAD;
    const noVencido = Math.round(valorTotal * p.noVencido);
    const hasta30 = Math.round(valorTotal * p.hasta30);
    const hasta60 = Math.round(valorTotal * p.hasta60);
    const hasta90 = Math.round(valorTotal * p.hasta90);
    const hasta180 = Math.round(valorTotal * p.hasta180);
    const hasta360 = Math.round(valorTotal * p.hasta360);
    const mayor360 = Math.round(valorTotal * p.mayor360);

    const totalDistribuido = noVencido + hasta30 + hasta60 + hasta90 + hasta180 + hasta360 + mayor360;
    const ajuste = valorTotal - totalDistribuido;

    sheet.getCell(`G${mapping.row}`).value = noVencido;
    sheet.getCell(`I${mapping.row}`).value = hasta30;
    sheet.getCell(`K${mapping.row}`).value = hasta60 + ajuste;
    sheet.getCell(`L${mapping.row}`).value = hasta90;
    sheet.getCell(`M${mapping.row}`).value = hasta180;
    sheet.getCell(`N${mapping.row}`).value = hasta360;
    sheet.getCell(`O${mapping.row}`).value = mayor360;
    sheet.getCell(`H${mapping.row}`).value = valorTotal;
  }

  console.log(`[ExcelJS-Grupo] FC05b completado.`);
}

// ============================================
// FC08: CONCILIACIÓN DE INGRESOS (grupo1 only)
// ============================================

/**
 * Reescribe la hoja FC08 (conciliación de ingresos) para grupo1.
 */
export function rewriteGrupoFC08(
  workbook: ExcelJS.Workbook,
  config: GrupoConfig
): void {
  if (!config.fc08Sheet) return;
  const fc08 = workbook.getWorksheet(config.fc08Sheet);
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (!fc08 || !sheet3) return;

  console.log(`[ExcelJS-Grupo] Escribiendo FC08 en ${config.fc08Sheet}...`);

  // Copiar ingresos por servicio desde Hoja3 fila 15
  const ingAcu = safeNumericValue(sheet3.getCell('J15'));
  const ingAlc = safeNumericValue(sheet3.getCell('K15'));
  const ingAseo = safeNumericValue(sheet3.getCell('L15'));

  fc08.getCell('G26').value = ingAcu;
  fc08.getCell('H26').value = ingAlc;
  fc08.getCell('I26').value = ingAseo;

  console.log(`[ExcelJS-Grupo] FC08 completado: Acu=${ingAcu}, Alc=${ingAlc}, Aseo=${ingAseo}`);
}