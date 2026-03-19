/**
 * Servicio de conversión de plantillas Excel planas a formato XBRL.
 * 
 * Convierte archivos Excel con formato simple (CODIGO, NOMBRE, SALDO)
 * de cuentas PUC padre-hijo al formato de plantilla estándar que el
 * generador XBRL puede procesar.
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getAccountClass, getAccountLevel } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

export interface DetectedFormat {
  sheetName: string;
  codeColumn: string;
  nameColumn: string;
  valueColumn: string;
  totalRows: number;
  hasHeader: boolean;
}

export interface AnalyzedAccount {
  code: string;
  name: string;
  value: number;
  level: number;
  class: string;
  className: string;
  isLeaf: boolean;
  children: string[];
  parentCode: string | null;
  calculatedChildrenSum: number;
  hasDiscrepancy: boolean;
}

export interface AnalysisResult {
  format: DetectedFormat;
  accounts: AnalyzedAccount[];
  stats: {
    totalAccounts: number;
    leafAccounts: number;
    parentAccounts: number;
    classes: { code: string; name: string; total: number; count: number }[];
    maxDepth: number;
  };
  validation: {
    activosTotal: number;
    pasivosTotal: number;
    patrimonioTotal: number;
    ingresosTotal: number;
    gastosTotal: number;
    costosTotal: number;
    ecuacionPatrimonial: { isValid: boolean; diff: number };
    ecuacionResultados: { isValid: boolean; diff: number };
  };
}

export interface MappingEntry {
  sourceCode: string;
  sourceName: string;
  sourceValue: number;
  targetSheet: string;
  targetRow: number;
  targetLabel: string;
  status: 'mapped' | 'unmapped' | 'partial';
}

export interface MappingResult {
  entries: MappingEntry[];
  coverage: {
    totalSource: number;
    mapped: number;
    unmapped: number;
    coveragePercent: number;
  };
}

export interface TransformResult {
  templateData: Record<string, Record<number, number>>;
  distributedByService: {
    service: string;
    accounts: { code: string; name: string; value: number }[];
  }[];
  totals: { service: string; activos: number; pasivos: number; patrimonio: number; ingresos: number; gastos: number; costos: number }[];
}

export interface ValidationResult {
  checks: ValidationCheck[];
  allPassed: boolean;
  outputReady: boolean;
}

export interface ValidationCheck {
  id: string;
  label: string;
  category: 'accounting' | 'completeness' | 'consistency';
  passed: boolean;
  expected?: number;
  actual?: number;
  message: string;
}

// ============================================
// CONSTANTES
// ============================================

const CLASS_NAMES: Record<string, string> = {
  '1': 'Activos',
  '2': 'Pasivos',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Gastos',
  '6': 'Costos de Ventas',
  '7': 'Costos de Transformación',
  '8': 'Cuentas de Orden Deudoras',
  '9': 'Cuentas de Orden Acreedoras',
};

const COLUMN_PATTERNS = {
  code: ['codigo', 'código', 'code', 'cuenta', 'cta', 'cod'],
  name: ['nombre', 'denominacion', 'denominación', 'descripcion', 'descripción', 'name', 'concepto'],
  value: ['saldo', 'total', 'valor', 'value', 'monto', 'importe', 'saldo final'],
};

// ============================================
// AGENTE 1: ANALIZADOR
// ============================================

export function analyzeExcel(base64Data: string, _fileName: string): AnalysisResult {
  const buffer = Buffer.from(base64Data, 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No se encontró ninguna hoja en el archivo');

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error('No se pudo leer la hoja');

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  if (rawData.length === 0) throw new Error('El archivo está vacío');

  // Detect columns
  const format = detectFormat(rawData, sheetName);

  // Parse accounts
  const accounts = parseAndAnalyzeAccounts(rawData, format);

  // Build stats
  const stats = buildStats(accounts);

  // Validate
  const validation = validateEquations(accounts);

  return { format, accounts, stats, validation };
}

function detectFormat(rawData: Record<string, unknown>[], sheetName: string): DetectedFormat {
  const firstRow = rawData[0];
  if (!firstRow) throw new Error('No hay datos en la primera fila');

  const columns = Object.keys(firstRow);

  const codeColumn = findColumnMatch(columns, COLUMN_PATTERNS.code);
  const nameColumn = findColumnMatch(columns, COLUMN_PATTERNS.name);
  const valueColumn = findColumnMatch(columns, COLUMN_PATTERNS.value);

  if (!codeColumn || !nameColumn || !valueColumn) {
    throw new Error(
      'No se detectaron las columnas requeridas (CODIGO, NOMBRE, SALDO). ' +
      'Columnas encontradas: ' + columns.join(', ')
    );
  }

  return {
    sheetName,
    codeColumn,
    nameColumn,
    valueColumn,
    totalRows: rawData.length,
    hasHeader: true,
  };
}

function findColumnMatch(columns: string[], patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    const found = columns.find(col =>
      col.toLowerCase().replace(/[^a-záéíóúñ]/gi, '').includes(pattern.replace(/[^a-záéíóúñ]/gi, ''))
    );
    if (found) return found;
  }
  return undefined;
}

function parseAndAnalyzeAccounts(
  rawData: Record<string, unknown>[],
  format: DetectedFormat
): AnalyzedAccount[] {
  const accounts: AnalyzedAccount[] = [];

  for (const row of rawData) {
    const codeRaw = row[format.codeColumn];
    const nameRaw = row[format.nameColumn];
    const valueRaw = row[format.valueColumn];

    if (!codeRaw && !nameRaw) continue;

    const code = cleanPUCCode(String(codeRaw || ''));
    if (!code || code.length === 0) continue;

    const name = String(nameRaw || '').trim();
    const value = parseNumericValue(valueRaw);
    const level = getAccountLevel(code);
    const accountClass = getAccountClass(code);
    const className = CLASS_NAMES[code.charAt(0)] || 'Desconocido';

    accounts.push({
      code,
      name,
      value,
      level,
      class: accountClass,
      className,
      isLeaf: false,
      children: [],
      parentCode: null,
      calculatedChildrenSum: 0,
      hasDiscrepancy: false,
    });
  }

  // Sort by code
  accounts.sort((a, b) => a.code.localeCompare(b.code));

  // Build parent-child relationships and mark leaves
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]!;

    // Find parent: longest code that is a prefix of this code and shorter
    let bestParent: AnalyzedAccount | null = null;
    for (const candidate of accounts) {
      if (candidate.code.length < account.code.length &&
          account.code.startsWith(candidate.code)) {
        if (!bestParent || candidate.code.length > bestParent.code.length) {
          bestParent = candidate;
        }
      }
    }
    if (bestParent) {
      account.parentCode = bestParent.code;
      bestParent.children.push(account.code);
    }
  }

  // Mark leaves and calculate discrepancies
  for (const account of accounts) {
    account.isLeaf = account.children.length === 0;

    if (!account.isLeaf) {
      const childrenSum = accounts
        .filter(a => account.children.includes(a.code))
        .reduce((sum, a) => sum + a.value, 0);
      account.calculatedChildrenSum = Math.round(childrenSum * 100) / 100;
      account.hasDiscrepancy = Math.abs(account.value - account.calculatedChildrenSum) > 1;
    }
  }

  return accounts;
}

function cleanPUCCode(code: string): string {
  return code.replace(/[.\s\-]/g, '').trim();
}

function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function buildStats(accounts: AnalyzedAccount[]) {
  const leafAccounts = accounts.filter(a => a.isLeaf);
  const parentAccounts = accounts.filter(a => !a.isLeaf);

  const classMap = new Map<string, { name: string; total: number; count: number }>();
  for (const a of accounts) {
    const classCode = a.code.charAt(0);
    if (a.code.length <= 2 && !classMap.has(classCode)) {
      classMap.set(classCode, { name: a.className, total: a.value, count: 0 });
    }
    if (a.isLeaf) {
      const entry = classMap.get(classCode);
      if (entry) entry.count++;
    }
  }

  const classes = Array.from(classMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    total: data.total,
    count: data.count,
  }));

  const maxDepth = Math.max(...accounts.map(a => a.code.length));

  return {
    totalAccounts: accounts.length,
    leafAccounts: leafAccounts.length,
    parentAccounts: parentAccounts.length,
    classes,
    maxDepth,
  };
}

function sumLeafByPrefix(accounts: AnalyzedAccount[], prefix: string): number {
  return accounts
    .filter(a => a.isLeaf && a.code.startsWith(prefix))
    .reduce((sum, a) => sum + a.value, 0);
}

function validateEquations(accounts: AnalyzedAccount[]) {
  const activos = sumLeafByPrefix(accounts, '1');
  const pasivos = sumLeafByPrefix(accounts, '2');
  const patrimonio = sumLeafByPrefix(accounts, '3');
  const ingresos = sumLeafByPrefix(accounts, '4');
  const gastos = sumLeafByPrefix(accounts, '5');
  const costos = sumLeafByPrefix(accounts, '6');

  const patrimonialDiff = activos - (pasivos + patrimonio);
  const resultadosDiff = ingresos - gastos - costos;

  return {
    activosTotal: activos,
    pasivosTotal: pasivos,
    patrimonioTotal: patrimonio,
    ingresosTotal: ingresos,
    gastosTotal: gastos,
    costosTotal: costos,
    ecuacionPatrimonial: {
      isValid: Math.abs(patrimonialDiff) < 2,
      diff: patrimonialDiff,
    },
    ecuacionResultados: {
      isValid: Math.abs(resultadosDiff) < 2,
      diff: resultadosDiff,
    },
  };
}

// ============================================
// AGENTE 2: MAPEADOR
// ============================================

import {
  R414_ESF_MAPPINGS,
  R414_ER_MAPPINGS,
} from '@/lib/xbrl/r414/mappings';

export function mapToTemplate(
  accounts: AnalyzedAccount[],
  _targetTaxonomy: string
): MappingResult {
  const entries: MappingEntry[] = [];
  const mappedCodes = new Set<string>();

  // ESF Mappings (Hoja2)
  for (const mapping of R414_ESF_MAPPINGS) {
    const matchedAccounts = accounts.filter(a =>
      a.isLeaf &&
      mapping.pucPrefixes.some(prefix => a.code.startsWith(prefix)) &&
      !(mapping.excludePrefixes || []).some(excl => a.code.startsWith(excl))
    );

    const totalValue = matchedAccounts.reduce((sum, a) => {
      const val = mapping.useAbsoluteValue ? Math.abs(a.value) : a.value;
      return sum + val;
    }, 0);

    for (const a of matchedAccounts) {
      mappedCodes.add(a.code);
    }

    entries.push({
      sourceCode: mapping.pucPrefixes.join(', '),
      sourceName: mapping.label || mapping.description || ('Fila ' + mapping.row),
      sourceValue: Math.round(totalValue),
      targetSheet: 'Hoja2 (ESF)',
      targetRow: mapping.row,
      targetLabel: mapping.label || mapping.description || '',
      status: totalValue !== 0 ? 'mapped' : 'partial',
    });
  }

  // ER Mappings (Hoja3)
  for (const mapping of R414_ER_MAPPINGS) {
    const matchedAccounts = accounts.filter(a =>
      a.isLeaf &&
      mapping.pucPrefixes.some(prefix => a.code.startsWith(prefix)) &&
      !(mapping.excludePrefixes || []).some(excl => a.code.startsWith(excl))
    );

    const totalValue = matchedAccounts.reduce((sum, a) => {
      const val = mapping.useAbsoluteValue ? Math.abs(a.value) : a.value;
      return sum + val;
    }, 0);

    for (const a of matchedAccounts) {
      mappedCodes.add(a.code);
    }

    entries.push({
      sourceCode: mapping.pucPrefixes.join(', '),
      sourceName: mapping.label || mapping.description || ('Fila ' + mapping.row),
      sourceValue: Math.round(totalValue),
      targetSheet: 'Hoja3 (ER)',
      targetRow: mapping.row,
      targetLabel: mapping.label || mapping.description || '',
      status: totalValue !== 0 ? 'mapped' : 'partial',
    });
  }

  // Check unmapped leaf accounts
  const leafAccounts = accounts.filter(a => a.isLeaf);
  for (const a of leafAccounts) {
    if (!mappedCodes.has(a.code)) {
      entries.push({
        sourceCode: a.code,
        sourceName: a.name,
        sourceValue: Math.round(a.value),
        targetSheet: '-',
        targetRow: 0,
        targetLabel: 'Sin mapeo en taxonomía destino',
        status: 'unmapped',
      });
    }
  }

  return {
    entries,
    coverage: {
      totalSource: leafAccounts.length,
      mapped: mappedCodes.size,
      unmapped: leafAccounts.length - mappedCodes.size,
      coveragePercent: leafAccounts.length > 0
        ? Math.round((mappedCodes.size / leafAccounts.length) * 100)
        : 0,
    },
  };
}

// ============================================
// AGENTE 3: TRANSFORMADOR
// ============================================

export function transformData(
  accounts: AnalyzedAccount[],
  servicePercentages: { acueducto: number; alcantarillado: number; aseo: number }
): TransformResult {
  const leafAccounts = accounts.filter(a => a.isLeaf);

  const services = ['acueducto', 'alcantarillado', 'aseo'] as const;
  const distributedByService = services.map(service => ({
    service,
    accounts: leafAccounts.map(a => ({
      code: a.code,
      name: a.name,
      value: Math.round(a.value * (servicePercentages[service] / 100)),
    })),
  }));

  const totals = services.map(service => {
    const pct = servicePercentages[service] / 100;
    return {
      service,
      activos: Math.round(sumLeafByPrefix(accounts, '1') * pct),
      pasivos: Math.round(sumLeafByPrefix(accounts, '2') * pct),
      patrimonio: Math.round(sumLeafByPrefix(accounts, '3') * pct),
      ingresos: Math.round(sumLeafByPrefix(accounts, '4') * pct),
      gastos: Math.round(sumLeafByPrefix(accounts, '5') * pct),
      costos: Math.round(sumLeafByPrefix(accounts, '6') * pct),
    };
  });

  // Build template data structure
  const templateData: Record<string, Record<number, number>> = {};

  for (const mapping of R414_ESF_MAPPINGS) {
    const totalValue = leafAccounts
      .filter(a =>
        mapping.pucPrefixes.some(prefix => a.code.startsWith(prefix)) &&
        !(mapping.excludePrefixes || []).some(excl => a.code.startsWith(excl))
      )
      .reduce((sum, a) => {
        const val = mapping.useAbsoluteValue ? Math.abs(a.value) : a.value;
        return sum + val;
      }, 0);

    if (!templateData['Hoja2']) templateData['Hoja2'] = {};
    templateData['Hoja2'][mapping.row] = Math.round(totalValue);
  }

  for (const mapping of R414_ER_MAPPINGS) {
    const totalValue = leafAccounts
      .filter(a =>
        mapping.pucPrefixes.some(prefix => a.code.startsWith(prefix)) &&
        !(mapping.excludePrefixes || []).some(excl => a.code.startsWith(excl))
      )
      .reduce((sum, a) => {
        const val = mapping.useAbsoluteValue ? Math.abs(a.value) : a.value;
        return sum + val;
      }, 0);

    if (!templateData['Hoja3']) templateData['Hoja3'] = {};
    templateData['Hoja3'][mapping.row] = Math.round(totalValue);
  }

  return { templateData, distributedByService, totals };
}

// ============================================
// AGENTE 4: VALIDADOR
// ============================================

export function validateTransformation(
  original: AnalysisResult,
  transform: TransformResult
): ValidationResult {
  const checks: ValidationCheck[] = [];

  // Check 1: Ecuación patrimonial
  const { validation } = original;
  checks.push({
    id: 'eq-patrimonial',
    label: 'Ecuación Patrimonial',
    category: 'accounting',
    passed: validation.ecuacionPatrimonial.isValid,
    expected: validation.activosTotal,
    actual: validation.pasivosTotal + validation.patrimonioTotal,
    message: validation.ecuacionPatrimonial.isValid
      ? 'Activos = Pasivos + Patrimonio ✓'
      : 'Diferencia de $' + Math.abs(validation.ecuacionPatrimonial.diff).toLocaleString('es-CO'),
  });

  // Check 2: Ecuación de resultados
  checks.push({
    id: 'eq-resultados',
    label: 'Ecuación de Resultados',
    category: 'accounting',
    passed: validation.ecuacionResultados.isValid,
    expected: validation.ingresosTotal,
    actual: validation.gastosTotal + validation.costosTotal,
    message: validation.ecuacionResultados.isValid
      ? 'Resultado verificado ✓'
      : 'Diferencia de $' + Math.abs(validation.ecuacionResultados.diff).toLocaleString('es-CO'),
  });

  // Check 3: Distribución suma 100%
  const totalPct = transform.totals.reduce((sum, t) => {
    const actPct = validation.activosTotal > 0 ? (t.activos / validation.activosTotal) * 100 : 0;
    return sum + actPct;
  }, 0);
  checks.push({
    id: 'dist-100',
    label: 'Distribución al 100%',
    category: 'consistency',
    passed: Math.abs(totalPct - 100) < 2,
    expected: 100,
    actual: Math.round(totalPct),
    message: Math.abs(totalPct - 100) < 2
      ? 'Porcentajes suman 100% ✓'
      : 'Los porcentajes no suman 100%',
  });

  // Check 4: No hay cuentas sin clasificar
  const unclassified = original.accounts.filter(a => a.class === 'Desconocido');
  checks.push({
    id: 'no-unclassified',
    label: 'Todas las cuentas clasificadas',
    category: 'completeness',
    passed: unclassified.length === 0,
    message: unclassified.length === 0
      ? 'Todas las cuentas tienen clase PUC válida ✓'
      : unclassified.length + ' cuentas sin clasificar',
  });

  // Check 5: Valores en plantilla no vacíos
  const filledRows = Object.values(transform.templateData).reduce(
    (sum, sheet) => sum + Object.keys(sheet).length, 0
  );
  checks.push({
    id: 'template-filled',
    label: 'Plantilla con datos',
    category: 'completeness',
    passed: filledRows > 0,
    message: filledRows > 0
      ? filledRows + ' filas de plantilla con datos ✓'
      : 'No se mapearon datos a la plantilla',
  });

  // Check 6: Consistencia de totales padre-hijo
  const discrepancies = original.accounts.filter(a => a.hasDiscrepancy);
  checks.push({
    id: 'parent-child-consistent',
    label: 'Consistencia padre-hijo',
    category: 'consistency',
    passed: discrepancies.length === 0,
    message: discrepancies.length === 0
      ? 'Todos los totales padre coinciden con suma de hijos ✓'
      : discrepancies.length + ' cuentas padre con discrepancia',
  });

  return {
    checks,
    allPassed: checks.every(c => c.passed),
    outputReady: checks.filter(c => c.category === 'accounting').every(c => c.passed),
  };
}

// ============================================
// GENERADOR DE EXCEL DE SALIDA
// ============================================

export function generateConvertedTemplate(
  analysis: AnalysisResult,
  _transform: TransformResult
): string {
  // Leer la plantilla oficial XBRL como base
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'Plantilla_XBRL.xlsx');
  const templateBuffer = fs.readFileSync(templatePath);
  const wb = XLSX.read(templateBuffer, { type: 'buffer' });

  const sheetName = wb.SheetNames[0]; // "Hoja1"
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('No se encontró la hoja en la plantilla XBRL');

  // Construir mapa de código → valor desde las cuentas analizadas
  const accountMap = new Map<string, number>();
  for (const a of analysis.accounts) {
    accountMap.set(a.code, a.value);
  }

  // Recorrer las filas de la plantilla y rellenar valores
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:C1');

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const codeCell = ws[XLSX.utils.encode_cell({ r: row, c: 0 })];
    if (!codeCell) continue;

    const code = String(codeCell.v).trim();
    const value = accountMap.get(code);

    if (value !== undefined) {
      const totalCellRef = XLSX.utils.encode_cell({ r: row, c: 2 });
      ws[totalCellRef] = { t: 'n', v: Math.round(value) };
    }
  }

  const buffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return buffer;
}
