/**
 * Utilidades para el Plan Único de Cuentas (PUC) de Colombia.
 *
 * El PUC es el sistema de codificación contable estándar en Colombia.
 * Estas funciones ayudan a clasificar y procesar cuentas PUC.
 */

import type { AccountData, ServiceBalanceData } from '../types';

// ============================================
// CONSTANTES DE CLASIFICACIÓN PUC
// ============================================

/**
 * Clases contables según el PUC colombiano.
 * El primer dígito del código determina la clase.
 */
export const PUC_CLASSES = {
  '1': 'Activos',
  '2': 'Pasivos',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Gastos',
  '6': 'Costos de Ventas',
  '7': 'Costos de Producción',
  '8': 'Cuentas de Orden Deudoras',
  '9': 'Cuentas de Orden Acreedoras',
} as const;

/**
 * Niveles jerárquicos del PUC según longitud del código.
 */
export const PUC_LEVELS = {
  1: 'Clase',
  2: 'Grupo',
  4: 'Cuenta',
  6: 'Subcuenta',
  7: 'Auxiliar',
} as const;

// ============================================
// FUNCIONES DE CLASIFICACIÓN
// ============================================

/**
 * Obtiene la clase contable de una cuenta por su código.
 */
export function getAccountClass(code: string): string {
  const firstDigit = code.charAt(0);
  return PUC_CLASSES[firstDigit as keyof typeof PUC_CLASSES] || 'Desconocido';
}

/**
 * Obtiene el primer dígito (clase) del código PUC.
 */
export function getClassDigit(code: string): string {
  return code.charAt(0);
}

/**
 * Obtiene el nivel jerárquico de una cuenta por la longitud del código.
 */
export function getAccountLevel(code: string): number {
  const length = code.length;
  if (length === 1) return 1;
  if (length === 2) return 2;
  if (length <= 4) return 3;
  if (length <= 6) return 4;
  return 5;
}

/**
 * Obtiene el nombre del nivel jerárquico.
 */
export function getAccountLevelName(code: string): string {
  const length = code.length;
  if (length === 1) return 'Clase';
  if (length === 2) return 'Grupo';
  if (length <= 4) return 'Cuenta';
  if (length <= 6) return 'Subcuenta';
  return 'Auxiliar';
}

/**
 * Verifica si una cuenta es de activos.
 */
export function isAsset(code: string): boolean {
  return code.startsWith('1');
}

/**
 * Verifica si una cuenta es de pasivos.
 */
export function isLiability(code: string): boolean {
  return code.startsWith('2');
}

/**
 * Verifica si una cuenta es de patrimonio.
 */
export function isEquity(code: string): boolean {
  return code.startsWith('3');
}

/**
 * Verifica si una cuenta es de ingresos.
 */
export function isIncome(code: string): boolean {
  return code.startsWith('4');
}

/**
 * Verifica si una cuenta es de gastos.
 */
export function isExpense(code: string): boolean {
  return code.startsWith('5');
}

/**
 * Verifica si una cuenta es de costos.
 */
export function isCost(code: string): boolean {
  return code.startsWith('6') || code.startsWith('7');
}

// ============================================
// FUNCIONES DE SUMA Y AGREGACIÓN
// ============================================

/**
 * Suma valores de cuentas que coinciden con los prefijos dados.
 * Solo suma cuentas hoja (isLeaf = true) para evitar doble conteo.
 */
export function sumByPrefixes(
  accounts: AccountData[],
  prefixes: string[],
  excludePrefixes: string[] = [],
  useAbsoluteValue = false
): number {
  let total = 0;

  for (const account of accounts) {
    // Solo procesar cuentas hoja
    if (!account.isLeaf) continue;

    // Verificar si coincide con algún prefijo
    const matchesPrefix = prefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );

    // Verificar si debe excluirse
    const isExcluded = excludePrefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );

    if (matchesPrefix && !isExcluded) {
      total += useAbsoluteValue ? Math.abs(account.value) : account.value;
    }
  }

  return Math.round(total);
}

/**
 * Suma valores de cuentas de un servicio específico.
 */
export function sumServiceByPrefixes(
  serviceBalances: ServiceBalanceData[],
  service: string,
  prefixes: string[],
  excludePrefixes: string[] = [],
  useAbsoluteValue = false
): number {
  let total = 0;

  for (const balance of serviceBalances) {
    if (balance.service !== service) continue;
    if (!balance.isLeaf) continue;

    const matchesPrefix = prefixes.some((prefix) =>
      balance.code.startsWith(prefix)
    );

    const isExcluded = excludePrefixes.some((prefix) =>
      balance.code.startsWith(prefix)
    );

    if (matchesPrefix && !isExcluded) {
      total += useAbsoluteValue ? Math.abs(balance.value) : balance.value;
    }
  }

  return Math.round(total);
}

/**
 * Calcula totales por clase contable.
 */
export function calculateTotalsByClass(
  accounts: AccountData[]
): Record<string, number> {
  const totals: Record<string, number> = {
    activos: 0,
    pasivos: 0,
    patrimonio: 0,
    ingresos: 0,
    gastos: 0,
    costos: 0,
  };

  for (const account of accounts) {
    if (!account.isLeaf) continue;

    const classDigit = getClassDigit(account.code);
    switch (classDigit) {
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
      case '7':
        totals.costos += account.value;
        break;
    }
  }

  // Redondear todos los totales
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key]);
  }

  return totals;
}

/**
 * Valida la ecuación contable: Activos = Pasivos + Patrimonio.
 */
export function validateAccountingEquation(
  accounts: AccountData[],
  tolerance = 1000
): { isValid: boolean; difference: number } {
  const totals = calculateTotalsByClass(accounts);
  const difference = totals.activos - (totals.pasivos + totals.patrimonio);
  return {
    isValid: Math.abs(difference) <= tolerance,
    difference,
  };
}

// ============================================
// FUNCIONES DE FILTRADO
// ============================================

/**
 * Filtra cuentas por clase.
 */
export function filterByClass(
  accounts: AccountData[],
  classDigit: string
): AccountData[] {
  return accounts.filter((account) => account.code.startsWith(classDigit));
}

/**
 * Filtra solo cuentas hoja.
 */
export function filterLeafAccounts(accounts: AccountData[]): AccountData[] {
  return accounts.filter((account) => account.isLeaf);
}

/**
 * Filtra cuentas por prefijo.
 */
export function filterByPrefix(
  accounts: AccountData[],
  prefix: string
): AccountData[] {
  return accounts.filter((account) => account.code.startsWith(prefix));
}

/**
 * Agrupa cuentas por servicio.
 */
export function groupByService(
  serviceBalances: ServiceBalanceData[]
): Record<string, ServiceBalanceData[]> {
  const grouped: Record<string, ServiceBalanceData[]> = {};

  for (const balance of serviceBalances) {
    if (!grouped[balance.service]) {
      grouped[balance.service] = [];
    }
    grouped[balance.service].push(balance);
  }

  return grouped;
}

// ============================================
// FUNCIONES DE LIMPIEZA
// ============================================

/**
 * Limpia un código PUC removiendo puntos, espacios y caracteres especiales.
 */
export function cleanPucCode(code: string): string {
  return code.replace(/[.\s-]/g, '').trim();
}

/**
 * Valida si un código PUC tiene formato correcto.
 */
export function isValidPucCode(code: string): boolean {
  const cleaned = cleanPucCode(code);
  // Debe ser numérico y tener entre 1 y 10 dígitos
  return /^\d{1,10}$/.test(cleaned);
}

/**
 * Obtiene el código padre de una cuenta.
 */
export function getParentCode(code: string): string | null {
  if (code.length <= 1) return null;
  if (code.length <= 2) return code.charAt(0);
  if (code.length <= 4) return code.substring(0, 2);
  if (code.length <= 6) return code.substring(0, 4);
  return code.substring(0, 6);
}
