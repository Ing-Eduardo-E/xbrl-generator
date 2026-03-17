/**
 * Utilidades para derivar opciones de generación trimestral
 * a partir de un conjunto de opciones base anuales.
 */

import type { TemplateWithDataOptions } from '../types';
import { generateFiscalYearTrimesters } from './dateUtils';

/**
 * Genera un array de 4 TemplateWithDataOptions (uno por trimestre)
 * a partir de las opciones base del template anual.
 *
 * Las opciones resultantes comparten todos los datos financieros y de empresa
 * del template base, pero con fechas y trimestre actualizados para cada período.
 *
 * @param baseOptions - Opciones del template base (niifGroup debe ser 'ife')
 * @param year - Año fiscal a derivar (ej: 2025)
 * @returns Array de 4 opciones, una por cada trimestre
 */
export function generateQuarterlyOptions(
  baseOptions: TemplateWithDataOptions,
  year: number | string
): TemplateWithDataOptions[] {
  const periods = generateFiscalYearTrimesters(year);
  return periods.map(period => ({
    ...baseOptions,
    niifGroup: 'ife' as const,
    reportDate: period.endDate,
    startDate: period.startDate,
    trimestre: period.trimestre,
  }));
}
