import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Colombian Pesos
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date to Colombian format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Get PUC account class from code
 */
export function getAccountClass(code: string): string {
  const firstDigit = code[0];
  const classes: Record<string, string> = {
    '1': 'Activos',
    '2': 'Pasivos',
    '3': 'Patrimonio',
    '4': 'Ingresos',
    '5': 'Gastos',
    '6': 'Costos',
    '7': 'Costos de Producción',
    '8': 'Cuentas de Orden Deudoras',
    '9': 'Cuentas de Orden Acreedoras',
  };
  return classes[firstDigit] || 'Desconocido';
}

/**
 * Get PUC account level from code length
 */
export function getAccountLevel(code: string): number {
  const length = code.length;
  if (length === 1) return 1; // Clase
  if (length === 2) return 2; // Grupo
  if (length === 4) return 3; // Cuenta
  if (length === 6) return 4; // Subcuenta
  return 5; // Auxiliar (7+)
}

/**
 * Validate that distribution percentages sum to 100
 */
export function validateDistribution(
  acueducto: number,
  alcantarillado: number,
  aseo: number
): { isValid: boolean; total: number; message?: string } {
  const total = acueducto + alcantarillado + aseo;
  const isValid = Math.abs(total - 100) < 0.01;

  return {
    isValid,
    total,
    message: isValid ? undefined : `La suma es ${total}%, debe ser 100%`,
  };
}
