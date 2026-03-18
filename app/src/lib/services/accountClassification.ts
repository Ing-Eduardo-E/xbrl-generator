// Clasificación de cuentas PUC: estáticas vs dinámicas
import type { ParsedAccount } from "@/lib/services/excelParser";

export type AccountBehavior = 'static' | 'dynamic';

interface ClassificationRule {
  prefix: string;
  behavior: AccountBehavior;
}

// Reglas ordenadas de más específico a menos específico
export const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Estáticas específicas
  { prefix: '1132', behavior: 'static' },
  { prefix: '1227', behavior: 'static' },
  { prefix: '1230', behavior: 'static' },
  { prefix: '1233', behavior: 'static' },
  { prefix: '14', behavior: 'static' },
  { prefix: '16', behavior: 'static' },
  { prefix: '17', behavior: 'static' },
  { prefix: '18', behavior: 'static' },
  { prefix: '1970', behavior: 'static' },
  { prefix: '1971', behavior: 'static' },
  { prefix: '1972', behavior: 'static' },
  { prefix: '1973', behavior: 'static' },
  { prefix: '1974', behavior: 'static' },
  { prefix: '1975', behavior: 'static' },
  { prefix: '21', behavior: 'static' },
  { prefix: '25', behavior: 'static' },
  { prefix: '31', behavior: 'static' },
  { prefix: '32', behavior: 'static' },
  { prefix: '33', behavior: 'static' },
  { prefix: '34', behavior: 'static' },
  { prefix: '35', behavior: 'static' },
  { prefix: '36', behavior: 'static' },
  { prefix: '38', behavior: 'static' },
  { prefix: '8', behavior: 'static' },
  { prefix: '9', behavior: 'static' },
  // Dinámicas (excepto las ya cubiertas por reglas anteriores)
  { prefix: '11', behavior: 'dynamic' },
  { prefix: '12', behavior: 'dynamic' },
  { prefix: '13', behavior: 'dynamic' },
  { prefix: '15', behavior: 'dynamic' },
  { prefix: '19', behavior: 'dynamic' },
  { prefix: '22', behavior: 'dynamic' },
  { prefix: '23', behavior: 'dynamic' },
  { prefix: '24', behavior: 'dynamic' },
  { prefix: '26', behavior: 'dynamic' },
  { prefix: '27', behavior: 'dynamic' },
  { prefix: '37', behavior: 'dynamic' },
  { prefix: '4', behavior: 'dynamic' },
  { prefix: '5', behavior: 'dynamic' },
  { prefix: '6', behavior: 'dynamic' },
];

// Clasifica una cuenta por su código PUC
export function classifyAccount(code: string): AccountBehavior {
  for (const rule of CLASSIFICATION_RULES) {
    if (code.startsWith(rule.prefix)) {
      return rule.behavior;
    }
  }
  return 'static'; // Por defecto
}

// Separa un arreglo de cuentas en estáticas y dinámicas, y calcula resumen
export function partitionAccounts(accounts: ParsedAccount[]): {
  static: ParsedAccount[];
  dynamic: ParsedAccount[];
  summary: { totalStatic: number; totalDynamic: number; staticPercent: number; dynamicPercent: number };
} {
  const staticArr: ParsedAccount[] = [];
  const dynamicArr: ParsedAccount[] = [];
  let totalStatic = 0;
  let totalDynamic = 0;
  for (const acc of accounts) {
    const behavior = classifyAccount(acc.code);
    if (behavior === 'static') {
      staticArr.push(acc);
      totalStatic += acc.value;
    } else {
      dynamicArr.push(acc);
      totalDynamic += acc.value;
    }
  }
  const total = totalStatic + totalDynamic;
  const staticPercent = total === 0 ? 0 : Math.round((totalStatic / total) * 10000) / 100;
  const dynamicPercent = total === 0 ? 0 : Math.round((totalDynamic / total) * 10000) / 100;
  return {
    static: staticArr,
    dynamic: dynamicArr,
    summary: {
      totalStatic,
      totalDynamic,
      staticPercent,
      dynamicPercent,
    },
  };
}