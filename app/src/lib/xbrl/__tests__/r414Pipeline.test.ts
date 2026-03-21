/**
 * Tests E2E para el pipeline R414 de excelRewriter.ts
 * 
 * Verifica que el pipeline completo escribe datos financieros correctamente
 * en el template R414 usando la función writeCellSafe().
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { rewriteFinancialDataWithExcelJS } from '../official/excelRewriter';
import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { AccountData, ServiceBalanceData } from '../types';

// Datos de prueba representativos de una empresa de servicios públicos
const MOCK_ACCOUNTS: AccountData[] = [
  // Activos corrientes
  { code: '110501', name: 'Caja general', value: 15000000, isLeaf: true, level: 6, class: '1' },
  { code: '111005', name: 'Bancos nacionales', value: 85000000, isLeaf: true, level: 6, class: '1' },
  { code: '113201', name: 'Efectivo restringido', value: 5000000, isLeaf: true, level: 6, class: '1' },
  // PPE
  { code: '160501', name: 'Terrenos', value: 250000000, isLeaf: true, level: 6, class: '1' },
  { code: '164001', name: 'Edificaciones', value: 180000000, isLeaf: true, level: 6, class: '1' },
  { code: '165501', name: 'Maquinaria y equipo', value: 95000000, isLeaf: true, level: 6, class: '1' },
  // Cuentas por cobrar  
  { code: '131801', name: 'CXC servicio acueducto', value: 45000000, isLeaf: true, level: 6, class: '1' },
  { code: '131807', name: 'CXC subsidios', value: 20000000, isLeaf: true, level: 6, class: '1' },
  // Pasivos
  { code: '230501', name: 'CxP proveedores', value: -55000000, isLeaf: true, level: 6, class: '2' },
  { code: '250101', name: 'Provisión litigios', value: -15000000, isLeaf: true, level: 6, class: '2' },
  { code: '210401', name: 'Obligaciones financieras', value: -80000000, isLeaf: true, level: 6, class: '2' },
  // Patrimonio
  { code: '310501', name: 'Capital social', value: -300000000, isLeaf: true, level: 6, class: '3' },
  { code: '312501', name: 'Reservas', value: -50000000, isLeaf: true, level: 6, class: '3' },
  // Ingresos (clase 4 - R414 usa PUC 43 para venta de servicios)
  { code: '432101', name: 'Ingresos servicio acueducto', value: -280000000, isLeaf: true, level: 6, class: '4' },
  { code: '432201', name: 'Ingresos alcantarillado', value: -150000000, isLeaf: true, level: 6, class: '4' },
  // Gastos (clase 5)
  { code: '510101', name: 'Sueldos', value: 45000000, isLeaf: true, level: 6, class: '5' },
  { code: '511001', name: 'Honorarios', value: 12000000, isLeaf: true, level: 6, class: '5' },
  { code: '512001', name: 'Impuestos', value: 8000000, isLeaf: true, level: 6, class: '5' },
  { code: '513501', name: 'Servicios públicos', value: 3000000, isLeaf: true, level: 6, class: '5' },
  { code: '536001', name: 'Depreciación', value: 25000000, isLeaf: true, level: 6, class: '5' },
  { code: '514001', name: 'Mantenimiento', value: 7000000, isLeaf: true, level: 6, class: '5' },
  { code: '580201', name: 'Costos financieros', value: 18000000, isLeaf: true, level: 6, class: '5' },
  // Costos (clase 6)
  { code: '620101', name: 'Costo de ventas', value: 120000000, isLeaf: true, level: 6, class: '6' },
];

// Generar service balances a partir de las cuentas consolidadas
function generateServiceBalances(accounts: AccountData[]): ServiceBalanceData[] {
  const distribution = { acueducto: 0.40, alcantarillado: 0.35, aseo: 0.25 };
  const balances: ServiceBalanceData[] = [];
  for (const acc of accounts) {
    if (!acc.isLeaf) continue;
    for (const [service, pct] of Object.entries(distribution)) {
      balances.push({
        service,
        code: acc.code,
        name: acc.name,
        value: Math.round(acc.value * pct),
        isLeaf: true,
      });
    }
  }
  return balances;
}

const MOCK_SERVICE_BALANCES = generateServiceBalances(MOCK_ACCOUNTS);

describe('R414 Pipeline E2E', () => {
  let templateBuffer: Buffer;

  // Cargar template real una sola vez
  beforeAll(async () => {
    const templatePath = resolve(__dirname, '../../../../public/templates/r414/R414Ind_ID20037_2024-12-31.xlsx');
    templateBuffer = await readFile(templatePath);
  }, 30000);

  it('debe escribir datos ESF en Hoja2 con writeCellSafe', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    // Leer el resultado con ExcelJS
    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(result as any);

    const sheet2 = resultWorkbook.getWorksheet('Hoja2');
    expect(sheet2).toBeDefined();

    // Verificar que columna P (Total) tiene valores  
    // P15 = Efectivo y equivalentes (PUC 11, excluye 1132) = 15M + 85M = 100M
    const p15 = sheet2!.getCell('P15').value;
    expect(p15).toBe(100000000);

    // P16 = Efectivo restringido (PUC 1132) = 5M  
    const p16 = sheet2!.getCell('P16').value;
    expect(p16).toBe(5000000);
  }, 30000);

  it('debe escribir datos ER en Hoja3 con writeCellSafe', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const sheet3 = wb.getWorksheet('Hoja3');
    expect(sheet3).toBeDefined();

    // L14 = Ingresos ordinarios (PUC 41,42,43) — debe existir un valor
    const l14 = sheet3!.getCell('L14').value;
    expect(typeof l14).toBe('number');
    expect(l14).not.toBe(0);
  }, 30000);

  it('debe escribir datos PPE en Hoja7 con writeCellSafe', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const sheet7 = wb.getWorksheet('Hoja7');
    expect(sheet7).toBeDefined();

    // F14 = Terrenos (PUC 1605) = 250M
    const f14 = sheet7!.getCell('F14').value;
    expect(f14).toBe(250000000);
  }, 30000);

  it('debe aplicar numFmt para valores numéricos', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const sheet2 = wb.getWorksheet('Hoja2');
    expect(sheet2).toBeDefined();

    // Verificar que la celda tiene numFmt aplicado
    const p15 = sheet2!.getCell('P15');
    expect(p15.numFmt).toBe('#,##0;(#,##0)');
  }, 30000);

  it('debe limpiar fórmulas compartidas al escribir valores', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);
    const sheet2 = wb.getWorksheet('Hoja2');

    // P15 originalmente tiene fórmula =Hoja7!F53+Hoja7!F58+Hoja7!F59
    // Después de writeCellSafe, debe tener solo un valor numérico (sin fórmula)
    const p15 = sheet2!.getCell('P15');
    const cellModel = p15 as any;
    expect(cellModel.model?.formula).toBeUndefined();
    expect(cellModel.model?.sharedFormula).toBeUndefined();
    expect(p15.value).toBe(100000000);
  }, 30000);

  it('debe escribir gastos FC01 en Hoja16 (Acueducto)', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const sheet16 = wb.getWorksheet('Hoja16');
    expect(sheet16).toBeDefined();

    // E13 = Beneficios a empleados (PUC 5101,5103,5104,5107,5108) para acueducto
    // Valor: 45M * 0.40 (acueducto) = 18M
    const e13 = sheet16!.getCell('E13').value;
    expect(typeof e13).toBe('number');
  }, 30000);

  it('debe retornar solo metadatos si no hay cuentas consolidadas', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      // Sin consolidatedAccounts
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    // Hoja1 debe tener metadatos
    const sheet1 = wb.getWorksheet('Hoja1');
    expect(sheet1!.getCell('E12').value).toBe('Empresa de Prueba S.A. E.S.P.');

    // Hoja2 debe estar vacía (sin datos financieros)
    const sheet2 = wb.getWorksheet('Hoja2');
    const p15 = sheet2!.getCell('P15').value;
    // P15 no debe tener nuestro valor de prueba
    expect(p15).not.toBe(100000000);
  }, 30000);

  it('debe distribuir valores por servicio en columnas I,J,K de Hoja2', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const sheet2 = wb.getWorksheet('Hoja2');
    // I15 = Acueducto (40% de 100M = 40M)
    const i15 = sheet2!.getCell('I15').value as number;
    expect(i15).toBe(40000000);

    // J15 = Alcantarillado (35% de 100M = 35M)
    const j15 = sheet2!.getCell('J15').value as number;
    expect(j15).toBe(35000000);

    // K15 = Aseo (25% de 100M = 25M)
    const k15 = sheet2!.getCell('K15').value as number;
    expect(k15).toBe(25000000);

    // P15 = Total = I15 + J15 + K15
    const p15 = sheet2!.getCell('P15').value as number;
    expect(p15).toBe(i15 + j15 + k15);
  }, 30000);
});
