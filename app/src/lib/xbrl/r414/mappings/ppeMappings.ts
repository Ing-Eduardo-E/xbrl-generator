/**
 * Mapeos de Propiedad, Planta y Equipo (PPE) e Intangibles para R414.
 *
 * Basado en la plantilla oficial R414Ind_ID20037_2024-12-31.xlsx - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios.
 *
 * Columna: F (consolidado)
 *
 * Filas de autosuma (dejar vacías): 16, 22, 29, 31, 34
 * Filas 32-33: Depreciación y Deterioro deben ser valores POSITIVOS (Math.abs)
 */

import type { ESFMapping } from '../../types';

// ============================================
// MAPEOS DE PPE (PROPIEDAD, PLANTA Y EQUIPO)
// ============================================

/**
 * Mapeos de PPE para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 */
export const R414_PPE_MAPPINGS: ESFMapping[] = [
  // ====== PPE General (filas 14-21) ======

  // Fila 14: Terrenos en términos brutos
  // PUC R414: 1605 - Terrenos
  {
    row: 14,
    label: 'Terrenos',
    pucPrefixes: ['1605'],
  },

  // Fila 15: Edificios en términos brutos
  // PUC R414: 1640 - Edificaciones
  {
    row: 15,
    label: 'Edificaciones',
    pucPrefixes: ['1640'],
  },

  // Fila 16: Terrenos y edificios (AUTOSUMA - NO LLENAR)

  // Fila 17: Maquinaria en términos brutos
  // PUC R414: 1655 - Maquinaria y equipo
  {
    row: 17,
    label: 'Maquinaria y equipo',
    pucPrefixes: ['1655'],
  },

  // Fila 18: Vehículos en términos brutos
  // PUC R414: 1675 - Equipos de transporte, tracción y elevación
  {
    row: 18,
    label: 'Vehículos / Equipos de transporte',
    pucPrefixes: ['1675'],
  },

  // Fila 19: Enseres y accesorios en términos brutos
  // PUC R414: 1665 - Muebles, enseres y equipo de oficina
  {
    row: 19,
    label: 'Muebles, enseres y equipo de oficina',
    pucPrefixes: ['1665'],
  },

  // Fila 20: Equipo de oficina en términos brutos
  // PUC R414: 1670 - Equipos de comunicación y computación
  {
    row: 20,
    label: 'Equipos de comunicación y computación',
    pucPrefixes: ['1670'],
  },

  // Fila 21: Construcciones en proceso en términos brutos
  // PUC R414: 1615 - Construcciones en curso
  {
    row: 21,
    label: 'Construcciones en curso',
    pucPrefixes: ['1615'],
  },

  // Fila 22: PPE General subtotal (AUTOSUMA - NO LLENAR)

  // ====== Infraestructura de servicios (filas 23-28) ======

  // Fila 23: Vías en términos brutos
  // PUC R414: No hay cuenta específica de vías - se llena con 0 si la sección tiene valores
  {
    row: 23,
    label: 'Vías',
    pucPrefixes: [],
  },

  // Fila 24: Ductos en términos brutos
  // PUC R414: 1645 - Plantas, ductos y túneles (parcial)
  {
    row: 24,
    label: 'Ductos',
    pucPrefixes: ['164502', '164503', '164504'],
  },

  // Fila 25: Plantas en términos brutos
  // PUC R414: 1645 - Plantas (parcial)
  {
    row: 25,
    label: 'Plantas',
    pucPrefixes: ['164501'],
  },

  // Fila 26: Redes y cables en términos brutos
  // PUC R414: 1650 - Redes, líneas y cables
  {
    row: 26,
    label: 'Redes, líneas y cables',
    pucPrefixes: ['1650'],
  },

  // Fila 27: Relleno sanitario en términos brutos
  // PUC R414: No hay cuenta específica - se llena con 0 si la sección tiene valores
  {
    row: 27,
    label: 'Relleno sanitario',
    pucPrefixes: [],
  },

  // Fila 28: Activos para generación de energía en términos brutos
  // PUC R414: 1646 - Plantas de generación de energía
  {
    row: 28,
    label: 'Activos para generación de energía',
    pucPrefixes: ['1646'],
  },

  // Fila 29: Información especial PPE (AUTOSUMA - NO LLENAR)

  // Fila 30: Otras propiedades, planta y equipo en términos brutos
  // PUC R414: Otras cuentas del grupo 16 no mapeadas arriba
  // 1610 - Semovientes, 1660 - Equipos varios, 1680 - Bienes de arte y cultura
  {
    row: 30,
    label: 'Otras PPE',
    pucPrefixes: ['1610', '1660', '1680', '1690'],
  },

  // Fila 31: PPE Importe en libros bruto (AUTOSUMA - NO LLENAR)

  // Fila 32: Depreciación acumulada PPE (VALOR POSITIVO)
  // PUC R414: 1685 - Depreciación acumulada (CR) - almacenado como negativo
  {
    row: 32,
    label: 'Depreciación acumulada PPE',
    pucPrefixes: ['1685'],
    useAbsoluteValue: true,
  },

  // Fila 33: Deterioro de valor acumulado PPE (VALOR POSITIVO)
  // PUC R414: 1695 - Deterioro acumulado de propiedades, planta y equipo (CR)
  {
    row: 33,
    label: 'Deterioro acumulado PPE',
    pucPrefixes: ['1695'],
    useAbsoluteValue: true,
  },

  // Fila 34: PPE Total (AUTOSUMA - NO LLENAR)
];

// ============================================
// MAPEOS DE ACTIVOS INTANGIBLES Y PLUSVALÍA
// ============================================

/**
 * Mapeos de Activos Intangibles y Plusvalía para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 *
 * Filas de autosuma (dejar vacías): 44, 48
 * Filas 46-47: Amortización y Deterioro deben ser valores POSITIVOS (Math.abs)
 * Fórmula F48 = F44 + F45 - F46 - F47
 */
export const R414_INTANGIBLES_MAPPINGS: ESFMapping[] = [
  // ====== Activos intangibles distintos de la plusvalía (filas 37-43) ======

  // Fila 37: Marcas comerciales en términos brutos
  // PUC R414: 197002 - Marcas
  {
    row: 37,
    label: 'Marcas comerciales',
    pucPrefixes: ['197002'],
  },

  // Fila 38: Activos intangibles para exploración y evaluación en términos brutos
  // PUC R414: No hay cuenta específica - se llena con 0 si la sección tiene valores
  {
    row: 38,
    label: 'Activos intangibles exploración y evaluación',
    pucPrefixes: [],
  },

  // Fila 39: Programas de computador en términos brutos
  // PUC R414: 197008 - Softwares
  {
    row: 39,
    label: 'Programas de computador / Software',
    pucPrefixes: ['197008'],
  },

  // Fila 40: Licencias y franquicias en términos brutos
  // PUC R414: 197007 - Licencias, 197004 - Concesiones y franquicias
  {
    row: 40,
    label: 'Licencias y franquicias',
    pucPrefixes: ['197007', '197004'],
  },

  // Fila 41: Derechos de propiedad intelectual, patentes y otros derechos
  // PUC R414: 197003 - Patentes, 197005 - Derechos
  {
    row: 41,
    label: 'Patentes y derechos',
    pucPrefixes: ['197003', '197005'],
  },

  // Fila 42: Activos intangibles en desarrollo en términos brutos
  // PUC R414: 197010 - Activos intangibles en fase de desarrollo
  {
    row: 42,
    label: 'Activos intangibles en desarrollo',
    pucPrefixes: ['197010'],
  },

  // Fila 43: Otros activos intangibles en términos brutos
  // PUC R414: 197090 - Otros activos intangibles, 197012 - Activos en concesión
  {
    row: 43,
    label: 'Otros activos intangibles',
    pucPrefixes: ['197090', '197012'],
  },

  // Fila 44: Total activos intangibles distintos de plusvalía (AUTOSUMA - NO LLENAR)

  // ====== Plusvalía y ajustes (filas 45-47) ======

  // Fila 45: Plusvalía en términos brutos
  // PUC R414: 197001 - Plusvalía
  {
    row: 45,
    label: 'Plusvalía',
    pucPrefixes: ['197001'],
  },

  // Fila 46: Amortización acumulada activos intangibles y plusvalía (VALOR POSITIVO)
  // PUC R414: 1975 - Amortización acumulada de activos intangibles (CR)
  {
    row: 46,
    label: 'Amortización acumulada intangibles',
    pucPrefixes: ['1975'],
    useAbsoluteValue: true,
  },

  // Fila 47: Deterioro de valor acumulado activos intangibles y plusvalía (VALOR POSITIVO)
  // PUC R414: 1976 - Deterioro acumulado de activos intangibles (CR)
  {
    row: 47,
    label: 'Deterioro acumulado intangibles',
    pucPrefixes: ['1976'],
    useAbsoluteValue: true,
  },

  // Fila 48: Total activos intangibles y plusvalía (AUTOSUMA = F44+F45-F46-F47 - NO LLENAR)
];

// ============================================
// MAPEOS DE EFECTIVO Y EQUIVALENTES
// ============================================

/**
 * Mapeos de Efectivo y Equivalentes al Efectivo para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 *
 * Filas de autosuma (dejar vacías): 53, 58, 60
 * Fórmula F53 = F51 + F52
 * Fórmula F58 = SUMA(F55:F57)
 * Fórmula F60 = F53 + F58 + F59
 */
export const R414_EFECTIVO_MAPPINGS: ESFMapping[] = [
  // ====== Efectivo (filas 51-53) ======

  // Fila 51: Efectivo en caja
  // PUC R414: 1105 - Caja
  {
    row: 51,
    label: 'Efectivo en caja',
    pucPrefixes: ['1105'],
  },

  // Fila 52: Saldos en bancos
  // PUC R414: 1110 - Depósitos en instituciones financieras, 1120 - Fondos en tránsito
  {
    row: 52,
    label: 'Saldos en bancos',
    pucPrefixes: ['1110', '1120'],
  },

  // Fila 53: Total efectivo (AUTOSUMA = F51+F52 - NO LLENAR)

  // ====== Equivalentes al efectivo (filas 55-58) ======

  // Fila 55: Depósitos a corto plazo, clasificados como equivalentes al efectivo
  // PUC R414: 113301 - Certificados de depósito de ahorro a término (CDT)
  {
    row: 55,
    label: 'Depósitos a corto plazo (CDT)',
    pucPrefixes: ['113301'],
  },

  // Fila 56: Inversiones a corto plazo, clasificadas como equivalentes al efectivo
  // PUC R414: 113305 - Compromisos reventa inversiones, 113307 - Bonos y títulos
  {
    row: 56,
    label: 'Inversiones a corto plazo',
    pucPrefixes: ['113305', '113307'],
  },

  // Fila 57: Otros acuerdos bancarios, clasificados como equivalentes al efectivo
  // PUC R414: 113302 - Fondos vendidos, 113303 - Overnight, 113304, 113306, 113390
  {
    row: 57,
    label: 'Otros acuerdos bancarios',
    pucPrefixes: ['113302', '113303', '113304', '113306', '113390'],
  },

  // Fila 58: Total equivalentes al efectivo (AUTOSUMA = SUMA(F55:F57) - NO LLENAR)

  // ====== Otro efectivo y total (filas 59-60) ======

  // Fila 59: Otro efectivo y equivalentes al efectivo
  // PUC R414: 1132 - Efectivo de uso restringido
  {
    row: 59,
    label: 'Otro efectivo y equivalentes',
    pucPrefixes: ['1132'],
  },

  // Fila 60: Total efectivo y equivalentes al efectivo (AUTOSUMA = F53+F58+F59 - NO LLENAR)
];

// ============================================
// MAPEOS DE PROVISIONES
// ============================================

/**
 * Mapeos de Clases de Otras Provisiones para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 *
 * Filas de autosuma (dejar vacías): 65, 69, 73
 * Fórmula F65 = F63 + F64
 * Fórmula F69 = F67 + F68
 * Fórmula F73 = F71 + F72
 *
 * Nota: En R414 las provisiones no están subdivididas por corriente/no corriente
 * en cuentas separadas. Se mapea el total a la fila "corriente" por defecto.
 */
export const R414_PROVISIONES_MAPPINGS: ESFMapping[] = [
  // ====== Provisiones por litigios y demandas (filas 63-65) ======

  // Fila 63: Provisiones por litigios y demandas no corriente
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  {
    row: 63,
    label: 'Litigios y demandas no corriente',
    pucPrefixes: [],
  },

  // Fila 64: Provisiones por litigios y demandas corriente
  // PUC R414: 2701 - Litigios y demandas (total)
  {
    row: 64,
    label: 'Litigios y demandas corriente',
    pucPrefixes: ['2701'],
  },

  // Fila 65: Total de Provisiones por litigios y demandas (AUTOSUMA = F63+F64 - NO LLENAR)

  // ====== Provisiones por contratos onerosos (filas 67-69) ======

  // Fila 67: Provisión por contratos onerosos no corriente
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  {
    row: 67,
    label: 'Contratos onerosos no corriente',
    pucPrefixes: [],
  },

  // Fila 68: Provisión corriente por contratos onerosos
  // PUC R414: 279018 - Contratos onerosos
  {
    row: 68,
    label: 'Contratos onerosos corriente',
    pucPrefixes: ['279018'],
  },

  // Fila 69: Total de provisiones por contratos onerosos (AUTOSUMA = F67+F68 - NO LLENAR)

  // ====== Provisiones por desmantelamiento y rehabilitación (filas 71-73) ======

  // Fila 71: Provisión no corriente para costos de desmantelamiento
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  {
    row: 71,
    label: 'Desmantelamiento no corriente',
    pucPrefixes: [],
  },

  // Fila 72: Provisión corriente para costos de desmantelamiento
  // PUC R414: 279020 - Desmantelamientos
  {
    row: 72,
    label: 'Desmantelamiento corriente',
    pucPrefixes: ['279020'],
  },

  // Fila 73: Total de provisiones por desmantelamiento (AUTOSUMA = F71+F72 - NO LLENAR)
];

/**
 * Mapeos de Otras Provisiones para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 *
 * Fila de autosuma (dejar vacía): 77
 * Fórmula F77 = F75 + F76
 */
export const R414_OTRAS_PROVISIONES_MAPPINGS: ESFMapping[] = [
  // ====== Otras provisiones (filas 75-77) ======

  // Fila 75: Otras provisiones no corrientes
  // PUC R414: No hay subdivisión corriente/no corriente - se llena con 0 si la sección tiene valores
  {
    row: 75,
    label: 'Otras provisiones no corrientes',
    pucPrefixes: [],
  },

  // Fila 76: Otras provisiones corrientes
  // PUC R414: 2707 - Garantías, 2790 - Provisiones diversas (excepto contratos onerosos y desmantelamiento)
  {
    row: 76,
    label: 'Otras provisiones corrientes',
    pucPrefixes: ['2707', '2790'],
    excludePrefixes: ['279018', '279020'],
  },

  // Fila 77: Total otras provisiones (AUTOSUMA = F75+F76 - NO LLENAR)
];

// ============================================
// MAPEOS DE BENEFICIOS A EMPLEADOS
// ============================================

/**
 * Mapeos de Beneficios a Empleados para R414.
 * Hoja7 (800100) - Notas - Subclasificaciones.
 *
 * Fila de autosuma (dejar vacía): 83
 * Fórmula F83 = SUMA(F79:F82)
 */
export const R414_BENEFICIOS_EMPLEADOS_MAPPINGS: ESFMapping[] = [
  // ====== Beneficios a Empleados (filas 79-83) ======

  // Fila 79: Beneficios a Empleados a corto plazo
  // PUC R414: 2511 - Beneficios a los empleados a corto plazo
  {
    row: 79,
    label: 'Beneficios a empleados corto plazo',
    pucPrefixes: ['2511'],
  },

  // Fila 80: Beneficios a Empleados a largo plazo
  // PUC R414: 2512 - Beneficios a los empleados a largo plazo
  {
    row: 80,
    label: 'Beneficios a empleados largo plazo',
    pucPrefixes: ['2512'],
  },

  // Fila 81: Beneficios por terminación del vínculo laboral o contractual
  // PUC R414: 2513 - Beneficios por terminación del vínculo laboral o contractual
  {
    row: 81,
    label: 'Beneficios terminación vínculo',
    pucPrefixes: ['2513'],
  },

  // Fila 82: Beneficios posempleo
  // PUC R414: 2514 - Beneficios posempleo pensiones, 2515 - Otros beneficios posempleo
  {
    row: 82,
    label: 'Beneficios posempleo',
    pucPrefixes: ['2514', '2515'],
  },

  // Fila 83: Total Beneficios a empleados (AUTOSUMA = SUMA(F79:F82) - NO LLENAR)
];
