/**
 * Utilidades de fechas para taxonomías XBRL.
 * Centraliza la lógica de rangos trimestrales que anteriormente estaba
 * hardcodeada en IFETemplateService.
 */

import type { IFETrimestre } from '../types';

export interface TrimestrePeriod {
  trimestre: IFETrimestre;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  prevEndDate: string; // Fin del período anterior (para contexto instant)
  label: string;     // 'T1 2025', 'T2 2025', etc.
}

/**
 * Obtiene el rango de fechas para un trimestre específico.
 */
export function getTrimestreDateRange(
  year: number | string,
  trimestre: IFETrimestre
): { startDate: string; endDate: string; prevEndDate: string } {
  const y = typeof year === 'string' ? parseInt(year, 10) : year;
  switch (trimestre) {
    case '1T':
      return {
        startDate: `${y}-01-01`,
        endDate: `${y}-03-31`,
        prevEndDate: `${y - 1}-12-31`,
      };
    case '2T':
      return {
        startDate: `${y}-04-01`,
        endDate: `${y}-06-30`,
        prevEndDate: `${y}-03-31`,
      };
    case '3T':
      return {
        startDate: `${y}-07-01`,
        endDate: `${y}-09-30`,
        prevEndDate: `${y}-06-30`,
      };
    case '4T':
      return {
        startDate: `${y}-10-01`,
        endDate: `${y}-12-31`,
        prevEndDate: `${y}-09-30`,
      };
  }
}

/**
 * Genera los 4 períodos trimestrales de un año fiscal.
 *
 * @example
 * const periods = generateFiscalYearTrimesters(2025);
 * // [
 * //   { trimestre: '1T', startDate: '2025-01-01', endDate: '2025-03-31', label: 'T1 2025' },
 * //   { trimestre: '2T', startDate: '2025-04-01', endDate: '2025-06-30', label: 'T2 2025' },
 * //   { trimestre: '3T', startDate: '2025-07-01', endDate: '2025-09-30', label: 'T3 2025' },
 * //   { trimestre: '4T', startDate: '2025-10-01', endDate: '2025-12-31', label: 'T4 2025' },
 * // ]
 */
export function generateFiscalYearTrimesters(year: number | string): TrimestrePeriod[] {
  const trimesters: IFETrimestre[] = ['1T', '2T', '3T', '4T'];
  const y = typeof year === 'string' ? parseInt(year, 10) : year;
  return trimesters.map(t => ({
    trimestre: t,
    ...getTrimestreDateRange(y, t),
    label: `${t} ${y}`,
  }));
}
