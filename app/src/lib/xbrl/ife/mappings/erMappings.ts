/**
 * Mapeos ER (Estado de Resultados) para IFE.
 *
 * Hoja4 (310000t) - Estado de resultados por servicios.
 *
 * Columnas por servicio:
 * - E: Acueducto
 * - F: Alcantarillado
 * - G: Aseo
 * - H: Energía Eléctrica
 * - I: Gas
 * - J: GLP
 * - K: XMM
 * - L: Otras actividades
 *
 * @module ife/mappings/erMappings
 */

import type { ESFMapping, ServiceColumnMapping } from '../../types';

/**
 * Columnas de servicios en Hoja4 (ER).
 * Nota: Las columnas son diferentes a ESF (Hoja3).
 */
export const IFE_ER_SERVICE_COLUMNS: ServiceColumnMapping = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  energia: 'H',
  gas: 'I',
  glp: 'J',
  xmm: 'K',
  otras: 'L',
  total: 'M', // No hay columna total explícita
};

/**
 * Mapeos del Estado de Resultados.
 * Filas 14-28 para período actual.
 */
export const IFE_ER_MAPPINGS: ESFMapping[] = [
  // Ingresos de actividades ordinarias (Clase 4)
  {
    row: 14,
    pucPrefixes: ['41'],
    description: 'Ingresos de actividades ordinarias',
    useAbsoluteValue: true,
  },
  // Costo de ventas (Clase 6)
  {
    row: 15,
    pucPrefixes: ['6'],
    description: 'Costo de ventas',
    useAbsoluteValue: true,
  },
  // Ganancia bruta (autosuma: 14 - 15)
  // row: 16 - no mapear, es autosuma

  // Gastos de administración, operación y ventas (Clase 5)
  {
    row: 17,
    pucPrefixes: ['51', '52'],
    description: 'Gastos de administración y ventas',
    useAbsoluteValue: true,
  },
  // Otros ingresos (42)
  {
    row: 18,
    pucPrefixes: ['42'],
    description: 'Otros ingresos',
    useAbsoluteValue: true,
  },
  // Otros gastos (53 excluyendo financieros)
  {
    row: 19,
    pucPrefixes: ['53'],
    excludePrefixes: ['5305'], // Excluir gastos financieros
    description: 'Otros gastos',
    useAbsoluteValue: true,
  },
  // Ganancia (pérdida) por actividades de operación (autosuma)
  // row: 20 - no mapear

  // Ingresos financieros
  {
    row: 21,
    pucPrefixes: ['4210', '4215'],
    description: 'Ingresos financieros',
    useAbsoluteValue: true,
  },
  // Costos financieros
  {
    row: 22,
    pucPrefixes: ['5305'],
    description: 'Costos financieros',
    useAbsoluteValue: true,
  },
  // Otras ganancias (pérdidas)
  {
    row: 23,
    pucPrefixes: ['4295', '5395'],
    description: 'Otras ganancias (pérdidas)',
    useAbsoluteValue: true,
  },
  // Ganancia (pérdida) antes de impuestos (autosuma)
  // row: 24 - no mapear

  // Gasto por impuesto
  {
    row: 25,
    pucPrefixes: ['54'],
    description: 'Gasto (ingreso) por impuesto',
    useAbsoluteValue: true,
  },
  // Ganancia de operaciones continuadas (autosuma)
  // row: 26 - no mapear

  // Ganancia de operaciones discontinuadas
  {
    row: 27,
    pucPrefixes: ['4299', '5399'],
    description: 'Ganancia (pérdida) operaciones discontinuadas',
    useAbsoluteValue: true,
  },
  // Ganancia (pérdida) total (autosuma)
  // row: 28 - no mapear
];

/**
 * Filas que son autosumas en el ER (no llenar directamente).
 */
export const IFE_ER_AUTOSUMA_ROWS = [
  16, // Ganancia bruta
  20, // Ganancia por actividades de operación
  24, // Ganancia antes de impuestos
  26, // Ganancia de operaciones continuadas
  28, // Ganancia (pérdida) total
];
