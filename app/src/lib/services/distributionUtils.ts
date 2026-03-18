/**
 * Utilidades de distribución proporcional con corrección de redondeo.
 *
 * Implementa el algoritmo Largest Remainder Method para garantizar que la suma
 * de los valores distribuidos sea exactamente igual al valor original, y aplica
 * un paso de balanceo contable para que Activos = Pasivos + Patrimonio
 * se cumpla exactamente por servicio.
 *
 * @module services/distributionUtils
 */

interface ServicePercentage {
  name: string;
  percentage: number;
}

interface DistributableAccount {
  service: string;
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

/**
 * Distribuye un valor entero entre servicios usando el método Largest Remainder.
 * Garantiza que la suma de los valores distribuidos sea exactamente igual al original.
 *
 * @param value - Valor entero a distribuir
 * @param services - Array de servicios con sus porcentajes (deben sumar 100)
 * @returns Mapa de nombre de servicio → valor distribuido
 */
export function distributeLargestRemainder(
  value: number,
  services: ServicePercentage[]
): Record<string, number> {
  // Calcular valores fraccionarios y truncados
  const items = services.map((s) => {
    const raw = value * (s.percentage / 100);
    const truncated = Math.trunc(raw);
    return {
      service: s.name,
      raw,
      truncated,
      fraction: Math.abs(raw - truncated),
    };
  });

  const sumTruncated = items.reduce((sum, v) => sum + v.truncated, 0);
  let remaining = value - sumTruncated;

  // Ordenar por parte fraccionaria (mayor fracción primero)
  const sorted = [...items].sort((a, b) => b.fraction - a.fraction);

  const result: Record<string, number> = {};
  for (const item of sorted) {
    if (remaining > 0) {
      result[item.service] = item.truncated + 1;
      remaining--;
    } else if (remaining < 0) {
      result[item.service] = item.truncated - 1;
      remaining++;
    } else {
      result[item.service] = item.truncated;
    }
  }

  return result;
}

/**
 * Ajusta los balances distribuidos para que la ecuación contable
 * Activos = Pasivos + Patrimonio se cumpla exactamente por servicio.
 *
 * Encuentra la cuenta hoja de Patrimonio (clase 3) con mayor valor absoluto
 * y ajusta su valor para absorber la diferencia de redondeo.
 *
 * @param accounts - Array de cuentas distribuidas (se muta in-place)
 * @param serviceNames - Nombres de los servicios a balancear
 */
export function balanceAccountingEquation(
  accounts: DistributableAccount[],
  serviceNames: string[]
): void {
  for (const service of serviceNames) {
    const leafAccounts = accounts.filter(
      (a) => a.service === service && a.isLeaf
    );

    const activos = leafAccounts
      .filter((a) => a.code.startsWith('1'))
      .reduce((s, a) => s + a.value, 0);
    const pasivos = leafAccounts
      .filter((a) => a.code.startsWith('2'))
      .reduce((s, a) => s + a.value, 0);
    const patrimonio = leafAccounts
      .filter((a) => a.code.startsWith('3'))
      .reduce((s, a) => s + a.value, 0);

    const diff = activos - (pasivos + patrimonio);
    if (diff === 0) continue;

    // Buscar la cuenta hoja de patrimonio (clase 3) con mayor |valor|
    const patrimonioCandidates = leafAccounts.filter((a) =>
      a.code.startsWith('3')
    );

    if (patrimonioCandidates.length > 0) {
      const target = patrimonioCandidates.reduce((max, a) =>
        Math.abs(a.value) > Math.abs(max.value) ? a : max,
        patrimonioCandidates[0]
      );
      // El diff es positivo si A > P+Pt → aumentar patrimonio
      // El diff es negativo si A < P+Pt → disminuir patrimonio
      target.value += diff;
    }
  }
}
