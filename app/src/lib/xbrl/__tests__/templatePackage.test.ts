/**
 * Tests for generateOfficialTemplatePackageWithData() ZIP shape and data-presence.
 *
 * TEST-01: IFE ZIP shape — 5 files, IFE-prefixed filenames, README.txt present
 * TEST-02: R414 xlsx loadable by ExcelJS, Hoja1 preserved, Hoja2 P15 non-zero
 * TEST-03: R414 ZIP shape — 5 files with correct extensions (.xbrlt, .xml, .xlsx, .xbrl, README.txt)
 *
 * These tests establish a regression baseline proving the ZIP assembly pipeline works,
 * covering preserveOriginalStructure() which previously had zero test coverage.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { generateOfficialTemplatePackageWithData } from '../officialTemplateService';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import type { AccountData, ServiceBalanceData } from '../types';
import type { OfficialTemplatePackage } from '../official/interfaces';

// ---------------------------------------------------------------------------
// Test data — copied from r414Pipeline.test.ts (all isLeaf: true)
// ---------------------------------------------------------------------------

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
];

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

// ---------------------------------------------------------------------------
// R414 ZIP Shape (TEST-02, TEST-03)
// ---------------------------------------------------------------------------

describe('generateOfficialTemplatePackageWithData — R414 ZIP Shape (TEST-02, TEST-03)', () => {
  let pkg: OfficialTemplatePackage;
  let zip: JSZip;
  let fileNames: string[];
  let wb: ExcelJS.Workbook;

  beforeAll(async () => {
    pkg = await generateOfficialTemplatePackageWithData({
      niifGroup: 'r414',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2024-12-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const zipBuffer = Buffer.from(pkg.fileData, 'base64');
    zip = await JSZip.loadAsync(zipBuffer);
    fileNames = Object.keys(zip.files);

    // Load the xlsx entry into ExcelJS for data-presence tests
    const xlsxEntry = fileNames.find(f => f.endsWith('.xlsx'));
    if (xlsxEntry) {
      const xlsxBuffer = await zip.files[xlsxEntry].async('nodebuffer');
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load(xlsxBuffer as unknown as Buffer);
    }
  }, 30000);

  it('ZIP must contain .xbrlt file (TEST-03)', () => {
    expect(fileNames.some(f => f.endsWith('.xbrlt'))).toBe(true);
  });

  it('ZIP must contain .xml file (TEST-03)', () => {
    expect(fileNames.some(f => f.endsWith('.xml'))).toBe(true);
  });

  it('ZIP must contain .xlsx file (TEST-03)', () => {
    expect(fileNames.some(f => f.endsWith('.xlsx'))).toBe(true);
  });

  it('ZIP must contain .xbrl file (TEST-03)', () => {
    expect(fileNames.some(f => f.endsWith('.xbrl'))).toBe(true);
  });

  it('ZIP must contain README.txt (TEST-03)', () => {
    expect(fileNames).toContain('README.txt');
  });

  it('ZIP must contain exactly 5 files (TEST-03)', () => {
    expect(fileNames).toHaveLength(5);
  });

  it('xlsx must be loadable by ExcelJS without error (TEST-02)', () => {
    expect(wb).toBeDefined();
  });

  it('xlsx must contain Hoja1 worksheet — preserveOriginalStructure preserved sheet names (TEST-02)', () => {
    expect(wb.getWorksheet('Hoja1')).toBeDefined();
  });

  it('Hoja2 cell P15 must be a non-zero number — ESF data was written (TEST-02)', () => {
    const ws = wb.getWorksheet('Hoja2');
    expect(ws).toBeDefined();
    const val = ws!.getCell('P15').value;
    expect(typeof val).toBe('number');
    expect(val).not.toBe(0);
  });

  it('package fileName must match expected R414 pattern (TEST-03)', () => {
    // outputPrefix for r414 is 'R414_Individual' per TEMPLATE_PATHS
    expect(pkg.fileName).toBe('R414_Individual_ID20037_2024-12-31.zip');
  });

  it('package mimeType must be application/zip (TEST-03)', () => {
    expect(pkg.mimeType).toBe('application/zip');
  });
});

// ---------------------------------------------------------------------------
// IFE ZIP Shape (TEST-01)
// ---------------------------------------------------------------------------

describe('generateOfficialTemplatePackageWithData — IFE ZIP Shape (TEST-01)', () => {
  let ifePkg: OfficialTemplatePackage;
  let ifeFileNames: string[];

  beforeAll(async () => {
    ifePkg = await generateOfficialTemplatePackageWithData({
      niifGroup: 'ife',
      companyId: '20037',
      companyName: 'Empresa de Prueba S.A. E.S.P.',
      reportDate: '2025-03-31',
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const zipBuffer = Buffer.from(ifePkg.fileData, 'base64');
    const zip = await JSZip.loadAsync(zipBuffer);
    ifeFileNames = Object.keys(zip.files);
  }, 30000);

  it('IFE ZIP must contain exactly 5 files (TEST-01)', () => {
    expect(ifeFileNames).toHaveLength(5);
  });

  it('IFE ZIP entries (except README.txt) must start with IFE_ prefix (TEST-01)', () => {
    const nonReadme = ifeFileNames.filter(f => f !== 'README.txt');
    expect(nonReadme.every(f => f.startsWith('IFE_'))).toBe(true);
  });

  it('IFE ZIP must contain README.txt (TEST-01)', () => {
    expect(ifeFileNames).toContain('README.txt');
  });

  it('IFE package fileName must match IFE pattern for Q1 2025 (TEST-01)', () => {
    // outputPrefix for ife is 'IFE' per TEMPLATE_PATHS
    expect(ifePkg.fileName).toBe('IFE_ID20037_2025-03-31.zip');
  });

  it('IFE package mimeType must be application/zip (TEST-01)', () => {
    expect(ifePkg.mimeType).toBe('application/zip');
  });
});
