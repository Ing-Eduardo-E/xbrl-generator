/**
 * Mapeos del Estado de Resultados (ER) para R414.
 *
 * Basado en la plantilla oficial R414Ind_ID20037_2024-12-31.xlsx - Hoja3
 * PUC según Resolución 414 CGN para empresas de servicios públicos.
 *
 * Columnas en Hoja3:
 * - E = Acueducto
 * - F = Alcantarillado
 * - G = Aseo
 * - L = Total
 *
 * PUC Resolución 414 CGN para empresas de servicios públicos:
 * - Clase 4: INGRESOS
 *   - 41: Ingresos fiscales
 *   - 42: Venta de bienes
 *   - 43: Venta de servicios (4321 acueducto, 4322 alcantarillado, 4323 aseo)
 *   - 44: Transferencias y subvenciones
 *   - 47: Operaciones interinstitucionales
 *   - 48: Otros ingresos
 * - Clase 5: GASTOS
 *   - 51: De administración y operación
 *   - 52: De ventas
 *   - 53: Deterioro, depreciaciones, amortizaciones y provisiones
 *   - 54: Transferencias y subvenciones
 *   - 56: De actividades y/o servicios especializados
 *   - 58: Otros gastos
 * - Clase 6: COSTOS DE VENTAS
 *   - 62: Costo de ventas de bienes
 *   - 63: Costo de ventas de servicios
 */

import type { ESFMapping, ServiceColumnMapping } from '../../types';

// ============================================
// CONFIGURACIÓN DE COLUMNAS R414 - ER
// ============================================

/**
 * Columnas de servicio para R414 en Hoja3 (ER).
 */
export const R414_ER_COLUMNS: ServiceColumnMapping = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  total: 'L',
};

// ============================================
// MAPEOS DE ESTADO DE RESULTADOS
// ============================================

/**
 * Mapeos del Estado de Resultados para R414.
 */
export const R414_ER_MAPPINGS: ESFMapping[] = [
  // Fila 14: Ingresos de actividades ordinarias
  // PUC R414: 43 - Venta de servicios (principal para servicios públicos)
  // Incluye: 4321 Acueducto, 4322 Alcantarillado, 4323 Aseo, 4315 Energía, etc.
  {
    row: 14,
    label: 'Ingresos de actividades ordinarias',
    pucPrefixes: ['43'],
  },

  // Fila 15: Costo de ventas
  // PUC R414: 6 - Costos de ventas
  // 62 - Costo de ventas de bienes, 63 - Costo de ventas de servicios
  {
    row: 15,
    label: 'Costo de ventas',
    pucPrefixes: ['6', '62', '63'],
  },

  // Fila 17: Otros ingresos
  // PUC R414: 41 - Ingresos fiscales (contribuciones, tasas)
  // 42 - Venta de bienes, 44 - Transferencias, 47 - Operaciones interinstitucionales
  // 48 - Otros ingresos (excepto ingresos financieros que van en fila 19)
  {
    row: 17,
    label: 'Otros ingresos',
    pucPrefixes: ['41', '42', '44', '47', '48'],
    excludePrefixes: ['4802', '4807', '4808', '4810', '4815'],
  },

  // Fila 18: Gastos de administración, operación y ventas
  // PUC R414: 51 - De administración y operación, 52 - De ventas
  {
    row: 18,
    label: 'Gastos de administración, operación y ventas',
    pucPrefixes: ['51', '52'],
  },

  // Fila 19: Ingresos financieros
  // PUC R414: Subcuentas específicas de 48 - Otros ingresos
  // 4802 - Intereses, 4807 - Rendimientos, 4808 - Utilidad diferencia cambio, 4810 - Dividendos
  // EXCLUIR: 4815 (participación asociadas, va en fila 21)
  {
    row: 19,
    label: 'Ingresos financieros',
    pucPrefixes: ['4802', '4807', '4808', '4810'],
  },

  // Fila 20: Costos financieros
  // PUC R414: 58 - Otros gastos (gastos financieros, diferencia cambio)
  // 5802 - Intereses, 5803 - Comisiones, 5807 - Diferencia cambio
  {
    row: 20,
    label: 'Costos financieros',
    pucPrefixes: ['5802', '5803', '5807'],
  },

  // Fila 21: Pérdida por aplicación del método de participación patrimonial
  // PUC R414: 5815 - Pérdidas MPP (solo pérdidas, NO ganancias 4815)
  // Template label: "Perdida por aplicación del método de participación patrimonial"
  {
    row: 21,
    label: 'Pérdida MPP',
    pucPrefixes: ['5815'],
  },

  // Fila 22: Otros gastos
  // PUC R414: 53 - Deterioro, depreciaciones, amortizaciones y provisiones
  // 54 - Transferencias y subvenciones, 56 - Servicios especializados
  // 58 - Otros gastos (excepto financieros)
  {
    row: 22,
    label: 'Otros gastos',
    pucPrefixes: ['53', '54', '56', '58'],
    excludePrefixes: ['5802', '5803', '5807', '5815', '5410'],
  },

  // Fila 23: Otras ganancias (pérdidas)
  // PUC R414: 4815 - Ganancias por método de participación patrimonial
  // Template label: "Otras ganancias (pérdidas)"
  // Nota: En la fórmula E24=E16+E17-E18+E19-SUM(E20:E22)+E23, +E23 suma las ganancias
  {
    row: 23,
    label: 'Otras ganancias (pérdidas)',
    pucPrefixes: ['4815'],
  },

  // Fila 25: Gasto/Ingreso impuesto a las ganancias corriente
  // PUC R414: 5410 - Impuesto al patrimonio / impuesto sobre la renta
  // En CGN se usa la cuenta 5410 para impuesto diferido, la corriente va en 54
  {
    row: 25,
    label: 'Impuesto a las ganancias corriente',
    pucPrefixes: ['540101'],
  },

  // Fila 26: Gasto/Ingreso impuesto a las ganancias diferido
  // PUC R414: 5410 - Gasto impuesto de renta diferido
  // EXCLUIR: 540101 (impuesto corriente, fila 25)
  {
    row: 26,
    label: 'Impuesto a las ganancias diferido',
    pucPrefixes: ['5410'],
    excludePrefixes: ['540101'],
  },
];
