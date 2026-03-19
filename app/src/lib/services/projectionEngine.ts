import type { ParsedAccount } from "@/lib/services/excelParser";
import { classifyAccount, type AccountBehavior } from "./accountClassification";

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

function deepCloneAccounts(accounts: ParsedAccount[]): ParsedAccount[] {
  return accounts.map(acc => ({ ...acc }));
}

// Recalcula los valores de cuentas no hoja sumando todas las hojas descendientes
function recalculateParentAccounts(accounts: ParsedAccount[]): void {
  const sorted = [...accounts].sort((a, b) => b.code.length - a.code.length);
  for (const acc of sorted) {
    if (!acc.isLeaf) {
      const sum = accounts
        .filter(child => child.isLeaf && child.code.startsWith(acc.code) && child.code.length > acc.code.length)
        .reduce((total, child) => total + child.value, 0);
      acc.value = sum;
    }
  }
}

// Calcula el Resultado del Ejercicio proyectado y lo inyecta en la cuenta 37 (Patrimonio)
// Regla PUC: Resultado = Ingresos(4) - Gastos(5) - Costos(6)
// Esto afecta directamente al Patrimonio del período
function injectIncomeStatementResult(
  projected: ParsedAccount[],
  originalAccounts: ParsedAccount[],
  _percentage: number
): { adjustedCode: string | null; adjustmentAmount: number } {
  const leafs = projected.filter(a => a.isLeaf);

  // Calcular Resultado del Ejercicio del trimestre proyectado
  const ingresos = leafs.filter(a => a.code.startsWith('4')).reduce((s, a) => s + a.value, 0);
  const gastos = leafs.filter(a => a.code.startsWith('5')).reduce((s, a) => s + a.value, 0);
  const costos = leafs.filter(a => a.code.startsWith('6')).reduce((s, a) => s + a.value, 0);
  const resultadoTrimestral = ingresos - gastos - costos;

  // Calcular Resultado del Ejercicio original (anual) desde cuentas originales
  const origLeafs = originalAccounts.filter(a => a.isLeaf);
  const ingresosOrig = origLeafs.filter(a => a.code.startsWith('4')).reduce((s, a) => s + a.value, 0);
  const gastosOrig = origLeafs.filter(a => a.code.startsWith('5')).reduce((s, a) => s + a.value, 0);
  const costosOrig = origLeafs.filter(a => a.code.startsWith('6')).reduce((s, a) => s + a.value, 0);
  const resultadoAnual = ingresosOrig - gastosOrig - costosOrig;

  // La diferencia que debemos ajustar en Patrimonio
  const ajustePatrimonio = resultadoTrimestral - resultadoAnual;
  if (ajustePatrimonio === 0) {
    return { adjustedCode: null, adjustmentAmount: 0 };
  }

  // Buscar cuenta hoja 37xx (Resultado del ejercicio) para inyectar la diferencia
  let targetAccount = leafs.find(a => a.code.startsWith('37') && a.isLeaf);

  // Fallback: buscar cualquier hoja clase 3 que sea dinámica
  if (!targetAccount) {
    targetAccount = leafs.find(a => a.code.startsWith('3') && a.isLeaf);
  }

  if (targetAccount) {
    targetAccount.value = Math.round(targetAccount.value + ajustePatrimonio);
    recalculateParentAccounts(projected);
    return { adjustedCode: targetAccount.code, adjustmentAmount: ajustePatrimonio };
  }

  return { adjustedCode: null, adjustmentAmount: 0 };
}

// Ajusta el balance residual para cumplir Activos = Pasivos + Patrimonio
// Solo corrige diferencias de redondeo después de inyectar el resultado del ejercicio
function balanceResidualDifference(
  accounts: ParsedAccount[],
  classificationMap: Map<string, AccountBehavior>
): { adjustedCode: string | null; adjustmentAmount: number } {
  const leafs = accounts.filter(a => a.isLeaf);
  const totalActivos = leafs.filter(a => a.code.startsWith('1')).reduce((s, a) => s + a.value, 0);
  const totalPasivos = leafs.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.value, 0);
  const totalPatrimonio = leafs.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.value, 0);
  const difference = totalActivos - (totalPasivos + totalPatrimonio);

  if (difference === 0) {
    return { adjustedCode: null, adjustmentAmount: 0 };
  }

  // Buscar la mejor cuenta dinámica para hacer el ajuste residual
  let adjustedCode: string | null = null;
  let adjustmentAmount = 0;

  if (difference > 0) {
    // Activos > P+Pt: aumentar un pasivo/patrimonio dinámico
    const candidates = leafs.filter(a =>
      (a.code.startsWith('2') || a.code.startsWith('3')) &&
      classificationMap.get(a.code) === 'dynamic'
    );
    if (candidates.length > 0) {
      const target = candidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, candidates[0]);
      target.value = Math.round(target.value + difference);
      adjustedCode = target.code;
      adjustmentAmount = difference;
    } else {
      // Fallback: reducir un activo dinámico
      const activoCandidates = leafs.filter(a => a.code.startsWith('1') && classificationMap.get(a.code) === 'dynamic');
      if (activoCandidates.length > 0) {
        const target = activoCandidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, activoCandidates[0]);
        target.value = Math.round(target.value - difference);
        adjustedCode = target.code;
        adjustmentAmount = -difference;
      }
    }
  } else {
    // Activos < P+Pt: reducir un pasivo/patrimonio dinámico
    const candidates = leafs.filter(a =>
      (a.code.startsWith('2') || a.code.startsWith('3')) &&
      classificationMap.get(a.code) === 'dynamic'
    );
    if (candidates.length > 0) {
      const target = candidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, candidates[0]);
      target.value = Math.round(target.value + difference); // difference es negativo → resta
      adjustedCode = target.code;
      adjustmentAmount = difference;
    } else {
      // Fallback: aumentar un activo dinámico
      const activoCandidates = leafs.filter(a => a.code.startsWith('1') && classificationMap.get(a.code) === 'dynamic');
      if (activoCandidates.length > 0) {
        const target = activoCandidates.reduce((max, a) => Math.abs(a.value) > Math.abs(max.value) ? a : max, activoCandidates[0]);
        target.value = Math.round(target.value - difference); // difference negativo → suma
        adjustedCode = target.code;
        adjustmentAmount = -difference;
      }
    }
  }

  if (adjustedCode) {
    recalculateParentAccounts(accounts);
  }
  return { adjustedCode, adjustmentAmount };
}

export function projectQuarterly(accounts: ParsedAccount[], config: ProjectionConfig): QuarterlyProjection[] {
  const classificationMap = new Map<string, AccountBehavior>();
  for (const acc of accounts) {
    classificationMap.set(acc.code, classifyAccount(acc.code));
  }

  const projections: QuarterlyProjection[] = [];

  for (const q of QUARTERS) {
    const percentage = config.percentages[q.percentKey];

    // 1. Deep clone
    const projected = deepCloneAccounts(accounts);

    // 2. Proyectar valores dinámicos según porcentaje
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

    // 4. Inyectar Resultado del Ejercicio en Patrimonio
    // El ER proyectado (Ingresos-Gastos-Costos al X%) difiere del anual,
    // esa diferencia debe reflejarse en Patrimonio para mantener la ecuación contable
    let adjustedCode: string | null = null;
    let adjustmentAmount = 0;

    if (percentage !== 100) {
      const erResult = injectIncomeStatementResult(projected, accounts, percentage);
      adjustedCode = erResult.adjustedCode;
      adjustmentAmount = erResult.adjustmentAmount;

      // 5. Ajuste residual por redondeo (debería ser mínimo después del paso 4)
      const residual = balanceResidualDifference(projected, classificationMap);
      if (residual.adjustedCode && !adjustedCode) {
        adjustedCode = residual.adjustedCode;
        adjustmentAmount = residual.adjustmentAmount;
      }
    }

    // 6. Calcular totales usando solo hojas
    const leafs = projected.filter(a => a.isLeaf);
    const activos = leafs.filter(a => a.code.startsWith('1')).reduce((sum, a) => sum + a.value, 0);
    const pasivos = leafs.filter(a => a.code.startsWith('2')).reduce((sum, a) => sum + a.value, 0);
    const patrimonio = leafs.filter(a => a.code.startsWith('3')).reduce((sum, a) => sum + a.value, 0);
    const ingresos = leafs.filter(a => a.code.startsWith('4')).reduce((sum, a) => sum + a.value, 0);
    const gastos = leafs.filter(a => a.code.startsWith('5')).reduce((sum, a) => sum + a.value, 0);
    const costos = leafs.filter(a => a.code.startsWith('6')).reduce((sum, a) => sum + a.value, 0);

    // 7. Validación de balance
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