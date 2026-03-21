/**
 * Tests E2E para el pipeline IFE de excelRewriter.ts
 *
 * Verifica que el pipeline completo escribe datos financieros correctamente
 * en el template IFE (Informe Financiero Especial) usando rewriteFinancialDataWithExcelJS().
 *
 * También incluye tests de regresión BUG-02: la función customizeXbrlt() debe
 * reemplazar la URL del XSD según el trimestre seleccionado, pero actualmente
 * retorna sin hacerlo (tests DEBEN FALLAR antes del fix en Plan 04).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { rewriteFinancialDataWithExcelJS } from '../official/excelRewriter';
import { customizeXbrlt } from '../official/templateCustomizers';
import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { AccountData, ServiceBalanceData } from '../types';

// Datos de prueba representativos de una empresa de servicios públicos
// Copiados de r414Pipeline.test.ts para consistencia
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
  // Ingresos (clase 4)
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
  // Cuentas padre (isLeaf: false) — deben ser excluidas por el IFE pipeline
  { code: '1', name: 'Activos', value: 0, isLeaf: false, level: 1, class: '1' },
  { code: '11', name: 'Efectivo', value: 0, isLeaf: false, level: 2, class: '1' },
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

// Opciones base para las pruebas IFE Q1
const MOCK_IFE_OPTIONS = {
  niifGroup: 'ife' as const,
  companyId: '20037',
  companyName: 'Empresa de Prueba S.A. E.S.P.',
  reportDate: '2025-03-31',
  nit: '800123456',
  consolidatedAccounts: MOCK_ACCOUNTS,
  serviceBalances: MOCK_SERVICE_BALANCES,
  activeServices: ['acueducto', 'alcantarillado', 'aseo'],
  ifeCompanyData: {
    address: 'Calle 1 #2-3',
    city: 'Bogotá',
    phone: '6011234567',
    email: 'contacto@empresa.com.co',
    employeesStart: 50,
    employeesEnd: 52,
    employeesAverage: 51,
  },
};

describe('IFE Pipeline E2E', () => {
  let templateBuffer: Buffer;

  // Cargar template real una sola vez
  beforeAll(async () => {
    const templatePath = resolve(
      __dirname,
      '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx'
    );
    templateBuffer = await readFile(templatePath);
  }, 30000);

  it('debe escribir datos ESF en Hoja3 para Q1', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, MOCK_IFE_OPTIONS);

    // Leer el resultado con ExcelJS
    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(result as any);

    const hoja3 = resultWorkbook.getWorksheet('Hoja3');
    expect(hoja3).toBeDefined();

    // I15 = columna acueducto, primera fila de datos ESF — debe ser numérico y no cero
    const i15 = hoja3!.getCell('I15').value;
    expect(typeof i15).toBe('number');
    expect(i15).not.toBe(0);
  }, 30000);

  it('debe escribir metadatos en Hoja1 para Q1', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, MOCK_IFE_OPTIONS);

    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(result as any);

    const hoja1 = resultWorkbook.getWorksheet('Hoja1');
    expect(hoja1).toBeDefined();

    // E13 = NIT, E15 = companyName (IFE layout es diferente a R414)
    const e13 = hoja1!.getCell('E13').value;
    expect(e13).toBe('800123456');

    const e15 = hoja1!.getCell('E15').value;
    expect(e15).toBe('Empresa de Prueba S.A. E.S.P.');
  }, 30000);
});

describe('IFE URL Bug — BUG-02', () => {
  let xbrltContent: string;

  // Cargar contenido raw del template .xbrlt
  beforeAll(async () => {
    const xbrltPath = resolve(
      __dirname,
      '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt'
    );
    xbrltContent = await readFile(xbrltPath, 'utf-8');
  }, 30000);

  it('Q1 xbrlt NO debe referenciar SegundoTrimestre XSD [FAILS before BUG-02 fix]', () => {
    // Personalizar para Q1 (PrimerTrimestre)
    const result = customizeXbrlt(
      xbrltContent,
      {
        niifGroup: 'ife',
        companyId: '20037',
        companyName: 'Empresa de Prueba',
        reportDate: '2025-03-31',
      },
      'IFE_PrimerTrimestre_ID20037_2025-03-31'
    );

    // BUG-02: customizeXbrlt retorna sin reemplazar la URL del XSD
    // Por lo tanto este test FALLA antes del fix — el resultado CONTIENE SegundoTrimestre
    expect(result).not.toContain('IFE_PuntoEntradaSegundoTrimestre-2025.xsd');
  });

  it('Q3 xbrlt debe referenciar TercerTrimestre XSD [FAILS before BUG-02 fix]', () => {
    // Personalizar para Q3 (TercerTrimestre)
    const result = customizeXbrlt(
      xbrltContent,
      {
        niifGroup: 'ife',
        companyId: '20037',
        companyName: 'Empresa de Prueba',
        reportDate: '2025-09-30',
      },
      'IFE_TercerTrimestre_ID20037_2025-09-30'
    );

    // BUG-02: URL del XSD no se actualiza — el resultado sigue referenciando SegundoTrimestre
    expect(result).not.toContain('IFE_PuntoEntradaSegundoTrimestre-2025.xsd');
    // Y tampoco contiene la URL correcta para el tercer trimestre
    expect(result).toContain('IFE_PuntoEntradaTercerTrimestre-2025.xsd');
  });
});
