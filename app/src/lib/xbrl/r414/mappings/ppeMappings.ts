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
