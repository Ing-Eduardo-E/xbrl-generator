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
 * ============================================================================
 * IMPORTANTE: Este mapeo usa códigos PUC según Resolución 414 CGN
 * 
 * Estructura PUC CGN para Resultados:
 * - Clase 4: INGRESOS
 *   - 41: Ingresos fiscales
 *   - 42: Venta de bienes
 *   - 43: Venta de servicios (principal para servicios públicos)
 *   - 44: Transferencias y subvenciones
 *   - 48: Otros ingresos
 * - Clase 5: GASTOS
 *   - 51: De administración
 *   - 52: De ventas
 *   - 53: Deterioro, depreciaciones, amortizaciones
 *   - 54: Provisiones
 *   - 56: Actividades y/o servicios complementarios
 *   - 58: Otros gastos
 * - Clase 6: COSTOS
 *   - 62: Costo de venta de bienes
 *   - 63: Costo de venta de servicios (principal para servicios públicos)
 * ============================================================================
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
  total: 'M', // Columna de totales
};

/**
 * Mapeos del Estado de Resultados.
 * Filas 14-28 para período actual.
 * Códigos según PUC CGN Resolución 414.
 */
export const IFE_ER_MAPPINGS: ESFMapping[] = [
  // Fila 14: Ingresos de actividades ordinarias
  // CGN 43 - Venta de servicios (principal para SPD)
  // + 42 - Venta de bienes + 41 - Ingresos fiscales
  {
    row: 14,
    pucPrefixes: ['41', '42', '43'],
    description: 'Ingresos de actividades ordinarias',
    useAbsoluteValue: true,
  },
  
  // Fila 15: Costo de ventas
  // CGN 62 - Costo venta bienes + 63 - Costo venta servicios
  {
    row: 15,
    pucPrefixes: ['62', '63'],
    description: 'Costo de ventas',
    useAbsoluteValue: true,
  },
  // Fila 16: Ganancia bruta (autosuma: 14 - 15) - NO MAPEAR

  // Fila 17: Gastos de administración, operación y ventas
  // CGN 51 - Administración + 52 - Ventas + 56 - Complementarios
  {
    row: 17,
    pucPrefixes: ['51', '52', '56'],
    description: 'Gastos de administración y ventas',
    useAbsoluteValue: true,
  },
  
  // Fila 18: Otros ingresos
  // CGN 44 - Transferencias + 48 - Otros ingresos
  {
    row: 18,
    pucPrefixes: ['44', '48'],
    description: 'Otros ingresos',
    useAbsoluteValue: true,
  },
  
  // Fila 19: Otros gastos
  // CGN 53 - Deterioro/depreciación + 58 - Otros gastos
  // Excluir costos financieros si están en subcuenta específica
  {
    row: 19,
    pucPrefixes: ['53', '58'],
    description: 'Otros gastos',
    useAbsoluteValue: true,
  },
  // Fila 20: Ganancia por actividades de operación (autosuma) - NO MAPEAR

  // Fila 21: Ingresos financieros
  // CGN 4802 - Financieros o subcuentas específicas de 48
  {
    row: 21,
    pucPrefixes: ['4802', '4803'],
    description: 'Ingresos financieros',
    useAbsoluteValue: true,
  },
  
  // Fila 22: Costos financieros
  // CGN 5802, 5803 - Costos financieros
  {
    row: 22,
    pucPrefixes: ['5802', '5803'],
    description: 'Costos financieros',
    useAbsoluteValue: true,
  },
  
  // Fila 23: Otras ganancias (pérdidas)
  // CGN 4808 - Ganancias método participación, otros de 48
  {
    row: 23,
    pucPrefixes: ['4808', '5808'],
    description: 'Otras ganancias (pérdidas)',
    useAbsoluteValue: true,
  },
  // Fila 24: Ganancia antes de impuestos (autosuma) - NO MAPEAR

  // Fila 25: Gasto por impuesto
  // CGN 54 - Provisión para impuesto de renta
  {
    row: 25,
    pucPrefixes: ['54'],
    description: 'Gasto (ingreso) por impuesto',
    useAbsoluteValue: true,
  },
  // Fila 26: Ganancia de operaciones continuadas (autosuma) - NO MAPEAR

  // Fila 27: Ganancia de operaciones discontinuadas
  // CGN 59 - Cierre de ingresos/gastos/costos
  {
    row: 27,
    pucPrefixes: ['59'],
    description: 'Ganancia (pérdida) operaciones discontinuadas',
    useAbsoluteValue: true,
  },
  // Fila 28: Ganancia (pérdida) total (autosuma) - NO MAPEAR
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
