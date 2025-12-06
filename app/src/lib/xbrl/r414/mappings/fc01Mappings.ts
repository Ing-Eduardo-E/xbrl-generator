/**
 * Mapeos de FC01 - Gastos por Servicio para R414.
 *
 * Basado en la plantilla oficial R414Ind_ID20037_2024-12-31.xlsx
 * - Hoja16 (900017a): Gastos Acueducto
 * - Hoja17 (900017b): Gastos Alcantarillado
 * - Hoja18 (900017c): Gastos Aseo
 * - Hoja22 (900017g): Gastos Total Servicios
 *
 * Columnas:
 * - E = Gastos administrativos (clase 5)
 * - F = Gastos operativos / Costos de ventas (clase 6)
 * - G = Autosuma E+F (no tocar)
 *
 * PUC según Resolución 414 CGN:
 * - Clase 5: GASTOS (51 Admin, 52 Ventas, 53-58 Otros)
 * - Clase 6: COSTOS DE VENTAS
 */

import type { ESFMapping } from '../../types';

// ============================================
// MAPEOS DE GASTOS FC01 (Columna E)
// ============================================

/**
 * Mapeos de gastos para FC01.
 * Se usan para Hoja16, 17, 18 y 22.
 */
export const R414_FC01_GASTOS_MAPPINGS: ESFMapping[] = [
  // Fila 13: Beneficios a empleados
  // PUC: 5101 Sueldos, 5103 Contribuciones, 5104 Aportes, 5107 Prestaciones, 5108 Diversos
  {
    row: 13,
    label: 'Beneficios a empleados',
    pucPrefixes: ['5101', '5103', '5104', '5107', '5108'],
  },

  // Fila 14: Honorarios
  // PUC: 5110 Honorarios
  {
    row: 14,
    label: 'Honorarios',
    pucPrefixes: ['5110'],
  },

  // Fila 15: Impuestos, Tasas y Contribuciones
  // PUC: 5120 Impuestos, contribuciones y tasas
  {
    row: 15,
    label: 'Impuestos, tasas y contribuciones',
    pucPrefixes: ['5120'],
  },

  // Fila 16: Generales
  // PUC: 5111 Generales
  {
    row: 16,
    label: 'Generales',
    pucPrefixes: ['5111'],
  },

  // Fila 17: Deterioro
  // PUC: 5350 Deterioro de activos
  {
    row: 17,
    label: 'Deterioro',
    pucPrefixes: ['5350'],
  },

  // Fila 18: Depreciación
  // PUC: 5360 Depreciación
  {
    row: 18,
    label: 'Depreciación',
    pucPrefixes: ['5360'],
  },

  // Fila 19: Amortización
  // PUC: 5365 Amortización
  {
    row: 19,
    label: 'Amortización',
    pucPrefixes: ['5365'],
  },

  // Fila 21: Litigios y demandas (dentro de Provisiones)
  // PUC: 537001, 537002 Litigios y demandas
  {
    row: 21,
    label: 'Litigios y demandas',
    pucPrefixes: ['537001', '537002'],
  },

  // Fila 22: Garantías
  // PUC: 537003 Garantías
  {
    row: 22,
    label: 'Garantías',
    pucPrefixes: ['537003'],
  },

  // Fila 23: Provisiones diversas
  // PUC: 5370 (excepto 537001, 537002, 537003)
  {
    row: 23,
    label: 'Provisiones diversas',
    pucPrefixes: ['5370'],
    excludePrefixes: ['537001', '537002', '537003'],
  },

  // Fila 25: Arrendamientos
  // PUC: 5115 Arrendamientos, 5124 Arrendamiento operativo
  {
    row: 25,
    label: 'Arrendamientos',
    pucPrefixes: ['5115', '5124'],
  },

  // Fila 27: Comisiones
  // PUC: 5125 Comisiones
  {
    row: 27,
    label: 'Comisiones',
    pucPrefixes: ['5125'],
  },

  // Fila 28: Ajuste por diferencia en cambio
  // PUC: 5807 Diferencia en cambio
  {
    row: 28,
    label: 'Diferencia en cambio',
    pucPrefixes: ['5807'],
  },

  // Fila 29: Financieros (Costos financieros)
  // PUC: 5802 Intereses, 5803 Comisiones financieras
  {
    row: 29,
    label: 'Financieros',
    pucPrefixes: ['5802', '5803'],
  },

  // Fila 30: Pérdidas por método de participación patrimonial
  // PUC: 5815 Pérdidas MPP
  {
    row: 30,
    label: 'Pérdidas MPP',
    pucPrefixes: ['5815'],
  },

  // Fila 31: Gastos diversos
  // PUC: 5195 Gastos diversos, 5895 Otros gastos
  {
    row: 31,
    label: 'Gastos diversos',
    pucPrefixes: ['5195', '5895'],
  },

  // Fila 32: Donaciones
  // PUC: 5423 Donaciones
  {
    row: 32,
    label: 'Donaciones',
    pucPrefixes: ['5423'],
  },

  // Fila 33: Ganancias por MPP (se muestra como negativo)
  // PUC: 4815 Ganancias por método participación patrimonial
  // Nota: Se invierte el signo al escribir
  {
    row: 33,
    label: 'Ganancias MPP',
    pucPrefixes: ['4815'],
  },

  // Fila 34: Impuesto a las ganancias corrientes
  // PUC: 540101 Impuesto de renta corriente
  {
    row: 34,
    label: 'Impuesto ganancias corriente',
    pucPrefixes: ['540101'],
  },

  // Fila 35: Impuesto a las ganancias diferido
  // PUC: 5410 (excepto 540101)
  {
    row: 35,
    label: 'Impuesto ganancias diferido',
    pucPrefixes: ['5410'],
    excludePrefixes: ['540101'],
  },

  // Fila 72: Órdenes y contratos de mantenimiento
  // PUC: 5140 Mantenimiento, 5145 Reparaciones
  {
    row: 72,
    label: 'Mantenimiento y reparaciones',
    pucPrefixes: ['5140', '5145'],
  },

  // Fila 77: Servicios públicos
  // PUC: 5135 Servicios públicos
  {
    row: 77,
    label: 'Servicios públicos',
    pucPrefixes: ['5135'],
  },

  // Fila 80: Seguros
  // PUC: 5130 Seguros
  {
    row: 80,
    label: 'Seguros',
    pucPrefixes: ['5130'],
  },

  // Fila 81: Órdenes y contratos por otros servicios
  // PUC: 5150 Servicios, 5155 Aseo, vigilancia y otros
  {
    row: 81,
    label: 'Otros servicios',
    pucPrefixes: ['5150', '5155'],
  },
];

/**
 * Filas con datos en FC01 (para limpiar columna F y calcular columna G).
 */
export const R414_FC01_DATA_ROWS = [
  13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  72, 77, 80, 81,
];

/**
 * Filas que deben tener valor 0 en columna F (excepto fila 72 para costos de ventas).
 */
export const R414_FC01_ZERO_F_ROWS = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 77, 80, 81,
];
