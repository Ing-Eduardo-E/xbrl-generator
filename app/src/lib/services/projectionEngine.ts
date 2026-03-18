import type { ParsedAccount } from "@/lib/services/excelParser";
import { classifyAccount, type AccountBehavior } from "./accountClassification";
import { calculateTotalsByClass, validateAccountingEquation } from "@/lib/xbrl/shared/pucUtils";
import type { AccountData } from "@/lib/xbrl/types";

export interface ProjectionConfig {
  percentages: { q1: number; q2: number; q3: number; q4: number };
  year: number;
}

export const DEFAULT_PERCENTAGES = { q1: 15, q2: 30, q3: 75, q4: 100 };

export interface BalanceValidation {
  activos: number;
  pasivos: number;
  patrimonio: number;
  difference: number;
  adjustedAccount: string | null;
  adjustmentAmount: number;
}

export interface QuarterlyProjection {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  percentage: number;
  accounts: ParsedAccount[];
  totals: { activos: number; pasivos: number; patrimonio: number; ingresos: number; gastos: number; costos: number };
  balanceValidation: BalanceValidation;
}

const QUARTERS = [
  { key: 'Q1' as const, label: (year: number) => `1er Trimestre ${year}`, percentKey: 'q1' as const },
  { key: 'Q2' as const, label: (year: number) => `2do Trimestre ${year}`, percentKey: 'q2' as const },
  { key: 'Q3' as const, label: (year: number) => `3er Trimestre ${year}`, percentKey: 'q3' as const },
  { key: 'Q4' as const, label: (year: number) => `4to Trimestre ${year}`, percentKey: 'q4' as const },
];

// Profunda copia de cuentas
function deepCloneAccounts(accounts: ParsedAccount[]): ParsedAccount[] {
  return accounts.map(acc => ({ ...acc }));
}

// Recalcula los valores de cuentas no hoja sumando todas las hojas descendientes
function recalculateParentAccounts(accounts: ParsedAccount[]): void {
  // Ordenar por longitud de código descendente (más profundo primero)
  const sorted = [...accounts].sort((a, b) => b.code.length - a.code.length);
  const codeToAccount = new Map(accounts.map(acc => [acc.code, acc]));
  for (const acc of sorted) {
    if (!acc.isLeaf) {
      // Sumar todas las hojas descendientes
      const sum = accounts
        .filter(child => child.isLeaf && child.code.startsWith(acc.code) && child.code.length > acc.code.length)
        .reduce((total, child) => total + child.value, 0);
      acc.value = sum;
    }
  }
}

// Ajusta el balance para cumplir Activos = Pasivos + Patrimonio
export function balanceAccountingEquation(accounts: ParsedAccount[], classificationMap: Map<string, AccountBehavior>): { adjustedCode: string | null; adjustmentAmount: number } {
  // Solo hojas
  const leafs = accounts.filter(a => a.isLeaf);
  const activos = leafs.filter(a => a.code.startsWith('1'));
  const pasivos = leafs.filter(a => a.code.startsWith('2'));
  const patrimonio = leafs.filter(a => a.code.startsWith('3'));
  const totalActivos = activos.reduce((sum, a) => sum + a.value, 0);
  const totalPasivos = pasivos.reduce((sum, a) => sum + a.value, 0);
  const totalPatrimonio = patrimonio.reduce((sum, a) => sum + a.value, 0);
  const difference = totalActivos - (totalPasivos + totalPatrimonio);
  if (difference === 0) {
    return { adjustedCode: null, adjustmentAmount: 0 };
  }
  let adjustedCode: string | null = null;
  let adjustmentAmount = 0;
  if (difference > 0) {
    // Activos demasiado altos: buscar hoja dinámica en clase 1 con mayor valor absoluto
    const candidates = activos.filter(a => classificationMap.get(a.code) === 'dynamic');
    if (candidates.length > 0) {
      const target = candidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, candidates[0]);
      target.value = Math.round(target.value - difference);
      adjustedCode = target.code;
      adjustmentAmount = -difference;
    }
  } else {
    // Activos demasiado bajos: buscar hoja dinámica en clase 2 o 3 con mayor valor absoluto
    const candidates = leafs.filter(a => (a.code.startsWith('2') || a.code.startsWith('3')) && classificationMap.get(a.code) === 'dynamic');
    if (candidates.length > 0) {
      const target = candidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, candidates[0]);
      target.value = Math.round(target.value + Math.abs(difference));
      adjustedCode = target.code;
      adjustmentAmount = Math.abs(difference);
    }
  }
  // Recalcular padres
  recalculateParentAccounts(accounts);
  // Verificar que la ecuación ahora cuadra
  const leafs2 = accounts.filter(a => a.isLeaf);
  const totalActivos2 = leafs2.filter(a => a.code.startsWith('1')).reduce((sum, a) => sum + a.value, 0);
  const totalPasivos2 = leafs2.filter(a => a.code.startsWith('2')).reduce((sum, a) => sum + a.value, 0);
  const totalPatrimonio2 = leafs2.filter(a => a.code.startsWith('3')).reduce((sum, a) => sum + a.value, 0);
  const diff2 = totalActivos2 - (totalPasivos2 + totalPatrimonio2);
  if (diff2 !== 0) {
    throw new Error('No se pudo balancear la ecuación contable.');
  }
  return { adjustedCode, adjustmentAmount };
}

export function projectQuarterly(accounts: ParsedAccount[], config: ProjectionConfig): QuarterlyProjection[] {
  // Precalcular mapa de clasificación para eficiencia
  const classificationMap = new Map<string, AccountBehavior>();
  for (const acc of accounts) {
    classificationMap.set(acc.code, classifyAccount(acc.code));
  }
  const projections: QuarterlyProjection[] = [];
  for (const q of QUARTERS) {
    const percentage = config.percentages[q.percentKey];
    // 1. Deep clone
    const projected = deepCloneAccounts(accounts);
    // 2. Proyectar valores
    for (const acc of projected) {
      const behavior = classificationMap.get(acc.code) || 'static';
      if (behavior === 'dynamic') {
        acc.value = Math.round(accounts.find(a => a.code === acc.code)!.value * percentage / 100);
      } else {
        acc.value = accounts.find(a => a.code === acc.code)!.value;
      }
    }
    // 3. Recalcular padres
    recalculateParentAccounts(projected);
    // 4. Balancear ecuación contable (excepto Q4, que debe ser exacto)
    let adjustedCode: string | null = null;
    let adjustmentAmount = 0;
    if (percentage !== 100) {
      const balanceResult = balanceAccountingEquation(projected, classificationMap);
      adjustedCode = balanceResult.adjustedCode;
      adjustmentAmount = balanceResult.adjustmentAmount;
    }
    // 5. Calcular totales usando solo hojas
    const leafs = projected.filter(a => a.isLeaf);
    const activos = leafs.filter(a => a.code.startsWith('1')).reduce((sum, a) => sum + a.value, 0);
    const pasivos = leafs.filter(a => a.code.startsWith('2')).reduce((sum, a) => sum + a.value, 0);
    const patrimonio = leafs.filter(a => a.code.startsWith('3')).reduce((sum, a) => sum + a.value, 0);
    const ingresos = leafs.filter(a => a.code.startsWith('4')).reduce((sum, a) => sum + a.value, 0);
    const gastos = leafs.filter(a => a.code.startsWith('5')).reduce((sum, a) => sum + a.value, 0);
    const costos = leafs.filter(a => a.code.startsWith('6')).reduce((sum, a) => sum + a.value, 0);
    // 6. Validación de balance
    const difference = activos - (pasivos + patrimonio);
    const balanceValidation: BalanceValidation = {
      activos,
      pasivos,
      patrimonio,
      difference,
      adjustedAccount: adjustedCode,
      adjustmentAmount,
    };
    projections.push({
      quarter: q.key,
      label: q.label(config.year),
      percentage,
      accounts: projected,
      totals: { activos, pasivos, patrimonio, ingresos, gastos, costos },
      balanceValidation,
    });
  }
  return projections;
}