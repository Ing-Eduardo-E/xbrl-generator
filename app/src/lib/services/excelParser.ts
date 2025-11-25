import * as XLSX from 'xlsx';
import { getAccountClass, getAccountLevel } from '@/lib/utils';

export interface ParsedAccount {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

export interface ParsedBalance {
  accounts: ParsedAccount[];
  totals: {
    activos: number;
    pasivos: number;
    patrimonio: number;
    ingresos: number;
    gastos: number;
    costos: number;
  };
  fileName: string;
}

/**
 * Parse Excel file from base64 string
 */
export async function parseExcelFile(
  base64Data: string,
  fileName: string
): Promise<ParsedBalance> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Read workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet or "Consolidado" sheet
    const sheetName =
      workbook.SheetNames.find((name) =>
        name.toLowerCase().includes('consolidado')
      ) || workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('No se encontró ninguna hoja en el archivo Excel');
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`No se pudo leer la hoja: ${sheetName}`);
    }

    // Convert sheet to JSON
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (rawData.length === 0) {
      throw new Error('El archivo Excel está vacío');
    }

    // Parse accounts
    const accounts = parseAccounts(rawData);

    // Calculate totals
    const totals = calculateTotals(accounts);

    return {
      accounts,
      totals,
      fileName,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al procesar el archivo Excel: ${error.message}`);
    }
    throw new Error('Error desconocido al procesar el archivo Excel');
  }
}

/**
 * Parse raw Excel data into structured accounts
 */
function parseAccounts(rawData: Record<string, unknown>[]): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];

  // Detect column names (flexible matching)
  const firstRow = rawData[0];
  const codeColumn = findColumn(firstRow, ['codigo', 'código', 'code', 'cuenta']);
  const nameColumn = findColumn(firstRow, [
    'denominacion',
    'denominación',
    'nombre',
    'name',
    'descripcion',
  ]);
  const valueColumn = findColumn(firstRow, ['total', 'valor', 'value', 'saldo']);

  if (!codeColumn || !nameColumn || !valueColumn) {
    throw new Error(
      `No se encontraron las columnas requeridas. Encontradas: ${Object.keys(firstRow).join(', ')}`
    );
  }

  for (const row of rawData) {
    const codeRaw = row[codeColumn];
    const nameRaw = row[nameColumn];
    const valueRaw = row[valueColumn];

    // Skip empty rows
    if (!codeRaw || !nameRaw) continue;

    // Clean and parse code
    const code = cleanPUCCode(String(codeRaw));
    if (!code || code.length === 0) continue;

    // Parse name
    const name = String(nameRaw).trim();
    if (!name) continue;

    // Parse value
    const value = parseValue(valueRaw);

    // Get account metadata
    const level = getAccountLevel(code);
    const accountClass = getAccountClass(code);

    accounts.push({
      code,
      name,
      value,
      isLeaf: false, // Will be determined later
      level,
      class: accountClass,
    });
  }

  // Determine leaf accounts (accounts without children)
  markLeafAccounts(accounts);

  return accounts;
}

/**
 * Find column name in first row (case-insensitive, flexible matching)
 */
function findColumn(
  row: Record<string, unknown>,
  possibleNames: string[]
): string | undefined {
  const columns = Object.keys(row);

  for (const possibleName of possibleNames) {
    const found = columns.find((col) =>
      col.toLowerCase().includes(possibleName.toLowerCase())
    );
    if (found) return found;
  }

  return undefined;
}

/**
 * Clean PUC code: remove dots, spaces, and non-numeric characters
 */
function cleanPUCCode(code: string): string {
  return code.replace(/[.\s-]/g, '').trim();
}

/**
 * Parse value: remove currency symbols, commas, and convert to number
 */
function parseValue(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);

  if (typeof value === 'string') {
    // Remove currency symbols, commas, and spaces
    const cleaned = value.replace(/[$,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }

  return 0;
}

/**
 * Mark accounts that are leaf accounts (no children)
 */
function markLeafAccounts(accounts: ParsedAccount[]): void {
  // Sort by code length (longer codes are children of shorter codes)
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  for (let i = 0; i < sorted.length; i++) {
    const account = sorted[i];
    if (!account) continue;

    // Check if there's any account that starts with this code
    const hasChildren = sorted.some(
      (other) =>
        other.code !== account.code &&
        other.code.startsWith(account.code) &&
        other.code.length > account.code.length
    );

    account.isLeaf = !hasChildren;
  }
}

/**
 * Calculate totals by account class (only leaf accounts)
 */
function calculateTotals(accounts: ParsedAccount[]) {
  const leafAccounts = accounts.filter((a) => a.isLeaf);

  const totals = {
    activos: 0,
    pasivos: 0,
    patrimonio: 0,
    ingresos: 0,
    gastos: 0,
    costos: 0,
  };

  for (const account of leafAccounts) {
    const firstDigit = account.code[0];

    switch (firstDigit) {
      case '1':
        totals.activos += account.value;
        break;
      case '2':
        totals.pasivos += account.value;
        break;
      case '3':
        totals.patrimonio += account.value;
        break;
      case '4':
        totals.ingresos += account.value;
        break;
      case '5':
        totals.gastos += account.value;
        break;
      case '6':
        totals.costos += account.value;
        break;
    }
  }

  return totals;
}
