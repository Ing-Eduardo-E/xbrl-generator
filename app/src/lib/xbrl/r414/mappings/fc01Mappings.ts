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
  // PUC: 5101/5201 Sueldos, 5103/5203 Contribuciones, 5104/5204 Aportes, 5107/5207 Prestaciones, 5108/5208 Diversos
  {
    row: 13,
    label: 'Beneficios a empleados',
    pucPrefixes: ['5101', '5103', '5104', '5107', '5108', '5201', '5203', '5204', '5207', '5208'],
  },

  // Fila 14: Honorarios
  // PUC: 5110/5210 Honorarios
  {
    row: 14,
    label: 'Honorarios',
    pucPrefixes: ['5110', '5210'],
  },

  // Fila 15: Impuestos, Tasas y Contribuciones
  // PUC: 5120/5220 Impuestos, contribuciones y tasas
  {
    row: 15,
    label: 'Impuestos, tasas y contribuciones',
    pucPrefixes: ['5120', '5220'],
  },

  // Fila 16: Generales
  // PUC: 5111/5211 Generales
  {
    row: 16,
    label: 'Generales',
    pucPrefixes: ['5111', '5211'],
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
  // PUC: 5115/5215 Arrendamientos, 5124/5224 Arrendamiento operativo
  {
    row: 25,
    label: 'Arrendamientos',
    pucPrefixes: ['5115', '5124', '5215', '5224'],
  },

  // Fila 27: Comisiones
  // PUC: 5125/5225 Comisiones
  {
    row: 27,
    label: 'Comisiones',
    pucPrefixes: ['5125', '5225'],
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
  // PUC: 5195/5295 Gastos diversos, 5895 Otros gastos, 56 Servicios especializados
  // Incluye clase 56 y transferencias 54 no mapeadas en otras filas
  {
    row: 31,
    label: 'Gastos diversos',
    pucPrefixes: ['5195', '5295', '5895', '56', '54'],
    excludePrefixes: ['540101', '5410', '5423'],
  },

  // Fila 32: Donaciones
  // PUC: 5423 Donaciones
  {
    row: 32,
    label: 'Donaciones',
    pucPrefixes: ['5423'],
  },

  // Nota: Fila 33 es FÓRMULA =SUM(E27:E32) (subtotal "Otros gastos"), NO se debe escribir.
  // 4815 (Ganancias MPP) NO pertenece al FC01 (es ingreso clase 4, no gasto).

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
  // PUC: 5140/5240 Mantenimiento, 5145/5245 Reparaciones
  {
    row: 72,
    label: 'Mantenimiento y reparaciones',
    pucPrefixes: ['5140', '5145', '5240', '5245'],
  },

  // Fila 77: Servicios públicos
  // PUC: 5135/5235 Servicios públicos
  {
    row: 77,
    label: 'Servicios públicos',
    pucPrefixes: ['5135', '5235'],
  },

  // Fila 80: Seguros
  // PUC: 5130/5230 Seguros
  {
    row: 80,
    label: 'Seguros',
    pucPrefixes: ['5130', '5230'],
  },

  // Fila 81: Órdenes y contratos por otros servicios
  // PUC: 5150/5250 Servicios, 5155/5255 Aseo, vigilancia y otros
  {
    row: 81,
    label: 'Otros servicios',
    pucPrefixes: ['5150', '5155', '5250', '5255'],
  },
];

/**
 * Filas con datos en FC01 (para calcular columna G = E+F).
 * - standard: Hoja16 (Acueducto) y Hoja17 (Alcantarillado)
 * - aseo: Hoja18 (Aseo) — incluye fila 74 (Disposición final)
 */
export const R414_FC01_DATA_ROWS = {
  standard: [
    13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 34, 35,
    72, 77, 80, 81,
  ],
  aseo: [
    13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 34, 35,
    72, 74, 77, 80, 81,
  ],
};

/**
 * Filas que deben tener valor 0 en columna F.
 * - standard: Hoja16/17 (costos van en F72 solamente)
 * - aseo: Hoja18 (costos van en F72 40% y F74 60%, F73 = 0)
 */
export const R414_FC01_ZERO_F_ROWS = {
  standard: [
    13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32,
    34, 35, 77, 80, 81,
  ],
  aseo: [
    13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32,
    34, 35, 73, 77, 80, 81,
  ],
};
