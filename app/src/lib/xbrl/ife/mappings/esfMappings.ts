/**
 * Mapeos ESF (Estado de Situación Financiera) para IFE.
 *
 * Hoja3 (210000t) - Estado de situación financiera por servicios.
 * IFE tiene una estructura más simple que R414.
 *
 * Columnas por servicio:
 * - I: Acueducto
 * - J: Alcantarillado
 * - K: Aseo
 * - L: Energía Eléctrica
 * - M: Gas
 * - N: GLP
 * - O: XMM
 * - P: Otras actividades
 *
 * @module ife/mappings/esfMappings
 */

import type { ESFMapping, ServiceColumnMapping } from '../../types';

/**
 * Columnas de servicios en Hoja3 (ESF).
 */
export const IFE_ESF_SERVICE_COLUMNS: ServiceColumnMapping = {
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  energia: 'L',
  gas: 'M',
  glp: 'N',
  xmm: 'O',
  otras: 'P',
  total: 'Q', // IFE no tiene columna total explícita
};

/**
 * Mapeos de Activos Corrientes.
 *
 * PUC Clase 11 - Disponible:
 * - 1105: Caja
 * - 1110: Bancos
 * - 1115: Remesas en tránsito
 * - 1120: Cuentas de ahorro
 * - 1125: Fondos
 * - 1195: Efectivo restringido (uso restringido)
 */
export const IFE_ESF_ACTIVOS_CORRIENTES: ESFMapping[] = [
  // Efectivo y equivalentes al efectivo (todo el disponible excepto restringido)
  {
    row: 15,
    pucPrefixes: ['11'],
    excludePrefixes: ['1195'], // Excluir efectivo de uso restringido
    description: 'Efectivo y equivalentes al efectivo',
  },
  // Efectivo de uso restringido corriente
  {
    row: 16,
    pucPrefixes: ['1195'],
    description: 'Efectivo de uso restringido corriente',
  },
  // CxC servicios públicos corrientes (no vencidas)
  {
    row: 19,
    pucPrefixes: ['130505', '130510', '130515'], // CxC servicios públicos específicos
    description: 'CxC servicios públicos no vencidas',
  },
  // CxC servicios públicos corrientes (vencidas)
  {
    row: 20,
    pucPrefixes: ['130520', '130525', '130530'], // CxC servicios públicos vencidas
    description: 'CxC servicios públicos vencidas',
  },
  // Total CxC servicios públicos corrientes
  {
    row: 23,
    pucPrefixes: ['1305'],
    description: 'Total CxC servicios públicos corrientes',
  },
  // CxC otras corrientes
  {
    row: 24,
    pucPrefixes: ['1310'],
    description: 'CxC otras corrientes',
  },
  // Otras cuentas por cobrar corrientes
  {
    row: 25,
    pucPrefixes: ['1315', '1320', '1325', '1330', '1335'],
    excludePrefixes: ['1399'],
    description: 'Otras cuentas por cobrar corrientes',
  },
  // Total CxC corrientes
  {
    row: 26,
    pucPrefixes: ['13'],
    excludePrefixes: ['1399'],
    description: 'Total CxC corrientes',
  },
  // Inventarios corrientes
  {
    row: 27,
    pucPrefixes: ['14'],
    description: 'Inventarios corrientes',
  },
  // Inversiones corrientes
  {
    row: 28,
    pucPrefixes: ['12'],
    description: 'Inversiones corrientes',
  },
  // Anticipo de impuestos
  {
    row: 29,
    pucPrefixes: ['1705'],
    description: 'Anticipo de impuestos',
  },
  // Otros activos financieros corrientes
  {
    row: 30,
    pucPrefixes: ['1805'],
    description: 'Otros activos financieros corrientes',
  },
  // Otros activos no financieros corrientes
  {
    row: 31,
    pucPrefixes: ['19'],
    description: 'Otros activos no financieros corrientes',
  },
  // Total activos corrientes (calculado, no mapear directamente)
  // {
  //   row: 32,
  //   pucPrefixes: [], // Autosuma
  //   description: 'Total activos corrientes',
  // },
];

/**
 * Mapeos de Activos No Corrientes.
 */
export const IFE_ESF_ACTIVOS_NO_CORRIENTES: ESFMapping[] = [
  // Propiedades, planta y equipo
  {
    row: 34,
    pucPrefixes: ['15'],
    excludePrefixes: ['1592', '1597', '1599'], // Excluir depreciación y deterioro
    description: 'Propiedades, planta y equipo',
  },
  // Propiedades de inversión
  {
    row: 35,
    pucPrefixes: ['1505'], // Subcuenta específica
    description: 'Propiedades de inversión',
  },
  // Activos intangibles
  {
    row: 36,
    pucPrefixes: ['16'],
    excludePrefixes: ['1698'], // Excluir plusvalía
    description: 'Activos intangibles',
  },
  // Inversiones no corrientes
  {
    row: 37,
    pucPrefixes: ['1205', '1210'],
    description: 'Inversiones no corrientes',
  },
  // CxC no corrientes (varias subcuentas)
  {
    row: 44,
    pucPrefixes: ['1340', '1345', '1350'],
    description: 'Total CxC no corrientes',
  },
  // Inventarios no corrientes
  {
    row: 48,
    pucPrefixes: ['1450'],
    description: 'Inventarios no corrientes',
  },
  // Otros activos financieros no corrientes
  {
    row: 49,
    pucPrefixes: ['1810'],
    description: 'Otros activos financieros no corrientes',
  },
  // Otros activos no financieros no corrientes
  {
    row: 50,
    pucPrefixes: ['1895'],
    description: 'Otros activos no financieros no corrientes',
  },
  // Total activos no corrientes (autosuma)
  // row: 51
];

/**
 * Mapeos de Pasivos Corrientes.
 */
export const IFE_ESF_PASIVOS_CORRIENTES: ESFMapping[] = [
  // Provisiones corrientes
  {
    row: 56,
    pucPrefixes: ['26'],
    description: 'Provisiones corrientes',
  },
  // Cuentas por pagar corrientes
  {
    row: 57,
    pucPrefixes: ['22', '23'],
    description: 'Cuentas por pagar corrientes',
    useAbsoluteValue: true,
  },
  // Obligaciones financieras corrientes
  {
    row: 60,
    pucPrefixes: ['21'],
    excludePrefixes: ['2105'], // Excluir no corrientes
    description: 'Obligaciones financieras corrientes',
    useAbsoluteValue: true,
  },
  // Obligaciones laborales corrientes
  {
    row: 61,
    pucPrefixes: ['25'],
    excludePrefixes: ['2510'], // Excluir no corrientes
    description: 'Obligaciones laborales corrientes',
    useAbsoluteValue: true,
  },
  // Pasivo por impuestos corrientes
  {
    row: 62,
    pucPrefixes: ['24'],
    description: 'Pasivo por impuestos corrientes',
    useAbsoluteValue: true,
  },
  // Otros pasivos corrientes
  {
    row: 63,
    pucPrefixes: ['28'],
    description: 'Otros pasivos corrientes',
    useAbsoluteValue: true,
  },
  // Total pasivos corrientes (autosuma row 64)
];

/**
 * Mapeos de Pasivos No Corrientes.
 */
export const IFE_ESF_PASIVOS_NO_CORRIENTES: ESFMapping[] = [
  // Provisiones no corrientes
  {
    row: 66,
    pucPrefixes: ['2605'],
    description: 'Provisiones no corrientes',
    useAbsoluteValue: true,
  },
  // Cuentas por pagar no corrientes
  {
    row: 67,
    pucPrefixes: ['2210'],
    description: 'Cuentas por pagar no corrientes',
    useAbsoluteValue: true,
  },
  // Obligaciones financieras no corrientes
  {
    row: 70,
    pucPrefixes: ['2105'],
    description: 'Obligaciones financieras no corrientes',
    useAbsoluteValue: true,
  },
  // Obligaciones laborales no corrientes
  {
    row: 71,
    pucPrefixes: ['2510'],
    description: 'Obligaciones laborales no corrientes',
    useAbsoluteValue: true,
  },
  // Pasivo por impuestos diferidos
  {
    row: 72,
    pucPrefixes: ['2715'],
    description: 'Pasivo por impuestos diferidos',
    useAbsoluteValue: true,
  },
  // Otros pasivos no corrientes
  {
    row: 73,
    pucPrefixes: ['2805'],
    description: 'Otros pasivos no corrientes',
    useAbsoluteValue: true,
  },
  // Total pasivos no corrientes (autosuma row 74)
];

/**
 * Mapeos de Patrimonio.
 */
export const IFE_ESF_PATRIMONIO: ESFMapping[] = [
  // Capital
  {
    row: 77,
    pucPrefixes: ['31'],
    description: 'Capital',
    useAbsoluteValue: true,
  },
  // Inversión suplementaria
  {
    row: 78,
    pucPrefixes: ['32'],
    description: 'Prima de emisión / Inversión suplementaria',
    useAbsoluteValue: true,
  },
  // Otras participaciones
  {
    row: 79,
    pucPrefixes: ['35'],
    description: 'Participaciones no controladoras',
    useAbsoluteValue: true,
  },
  // Superávit por revaluación
  {
    row: 80,
    pucPrefixes: ['34'],
    description: 'Superávit por revaluación',
    useAbsoluteValue: true,
  },
  // Otras reservas
  {
    row: 81,
    pucPrefixes: ['33'],
    description: 'Otras reservas',
    useAbsoluteValue: true,
  },
  // Ganancias acumuladas
  {
    row: 82,
    pucPrefixes: ['36', '37'],
    description: 'Ganancias acumuladas',
    useAbsoluteValue: true,
  },
  // Efectos por adopción NIF (subcuenta de ganancias acumuladas)
  {
    row: 83,
    pucPrefixes: ['3705'],
    description: 'Efectos por adopción NIIF',
    useAbsoluteValue: true,
  },
  // Total patrimonio (autosuma row 84)
];

/**
 * Todos los mapeos ESF combinados.
 */
export const IFE_ESF_MAPPINGS: ESFMapping[] = [
  ...IFE_ESF_ACTIVOS_CORRIENTES,
  ...IFE_ESF_ACTIVOS_NO_CORRIENTES,
  ...IFE_ESF_PASIVOS_CORRIENTES,
  ...IFE_ESF_PASIVOS_NO_CORRIENTES,
  ...IFE_ESF_PATRIMONIO,
];

/**
 * Filas que son autosumas (no llenar directamente).
 */
export const IFE_ESF_AUTOSUMA_ROWS = [
  32, // Total activos corrientes
  51, // Total activos no corrientes
  52, // Total activos
  64, // Total pasivos corrientes
  74, // Total pasivos no corrientes
  75, // Total pasivos
  84, // Total patrimonio
  85, // Total patrimonio y pasivos
];
