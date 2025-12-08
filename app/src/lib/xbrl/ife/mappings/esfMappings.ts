/**
 * Mapeos ESF (Estado de Situación Financiera) para IFE.
 *
 * Hoja3 (210000t) - Estado de situación financiera por servicios.
 *
 * Estructura del formulario según imagen oficial:
 * - Filas 12-85: Estado de situación financiera por servicio
 * - Columnas I-P: Servicios (Acueducto, Alcantarillado, Aseo, Energía, Gas, GLP, XMM, Otras)
 * - Columna Q: Total (suma de I-P)
 *
 * FILAS DE AUTOSUMA (NO MAPEAR - Excel calcula automáticamente):
 * 12, 13, 14, 17, 18, 23, 26, 32, 33, 38, 39, 44, 47, 51, 52, 53, 54, 55, 64, 65, 74, 75, 76, 84, 85
 *
 * ============================================================================
 * IMPORTANTE: Este mapeo usa códigos PUC según Resolución 414 CGN
 * para empresas de servicios públicos domiciliarios.
 * 
 * Estructura PUC CGN Resolución 414:
 * - Clase 1: ACTIVO
 *   - 11: Efectivo y equivalentes al efectivo
 *   - 12: Inversiones e instrumentos derivados
 *   - 13: Cuentas por cobrar
 *   - 14: Préstamos por cobrar
 *   - 15: Inventarios
 *   - 16: Propiedades, planta y equipo (NETO)
 *   - 17: Bienes de uso público e históricos y culturales
 *   - 18: Recursos naturales no renovables
 *   - 19: Otros activos
 * - Clase 2: PASIVO
 *   - 21: Emisión y colocación de títulos de deuda
 *   - 22: Préstamos por pagar
 *   - 23: Cuentas por pagar
 *   - 24: Beneficios a empleados
 *   - 25: Provisiones
 *   - 26: Otros pasivos
 *   - 27: Pasivos por impuestos
 * - Clase 3: PATRIMONIO
 *   - 31: Patrimonio de las empresas
 *   - 32: Resultados
 * ============================================================================
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
  total: 'Q',
};

// =====================================================
// ACTIVOS CORRIENTES (Filas 15-31)
// Autosumas: 14, 17, 18, 23, 26, 32
// =====================================================
export const IFE_ESF_ACTIVOS_CORRIENTES: ESFMapping[] = [
  // Fila 15: Efectivo y equivalentes al efectivo
  // CGN 11 - Efectivo y equivalentes (excepto restringido 1132)
  {
    row: 15,
    pucPrefixes: ['11'],
    excludePrefixes: ['1132'],
    description: 'Efectivo y equivalentes al efectivo',
  },
  // Fila 16: Efectivo de uso restringido corrientes
  // CGN 1132 - Efectivo de uso restringido
  {
    row: 16,
    pucPrefixes: ['1132'],
    description: 'Efectivo de uso restringido corrientes',
  },

  // --- SECCIÓN CxC CORRIENTES (Filas 17-26) ---
  // Fila 17: AUTOSUMA - CxC y otras CxC corrientes [Resumen]
  // Fila 18: AUTOSUMA - CxC prestación servicios públicos corrientes [Resumen]
  
  // Fila 19: CxC servicios públicos (sin subsidios ni aprovechamiento)
  // CGN 1318 - Prestación de servicios (131801-131806 son los servicios)
  {
    row: 19,
    pucPrefixes: ['131801', '131802', '131803', '131804', '131805', '131806'],
    description: 'CxC servicios públicos corrientes (sin subsidios)',
  },

  // Fila 20: CxC por subsidios corrientes
  // CGN 131807-131812 - Subsidios por tipo de servicio
  {
    row: 20,
    pucPrefixes: ['131807', '131808', '131809', '131810', '131811', '131812'],
    description: 'CxC por subsidios corrientes',
  },

  // Fila 21: CxC al Ministerio de Minas por subsidios
  // Subcuenta específica - normalmente vacío
  // No mapear por defecto

  // Fila 22: CxC por aprovechamiento corrientes
  // CGN 138424 - Aprovechamiento (reciclaje)
  {
    row: 22,
    pucPrefixes: ['138424'],
    description: 'CxC por aprovechamiento corrientes',
  },

  // Fila 23: AUTOSUMA - Total CxC servicios públicos corrientes

  // Fila 24: CxC por venta de bienes corrientes
  // CGN 1316 - Venta de bienes
  {
    row: 24,
    pucPrefixes: ['1316'],
    description: 'CxC por venta de bienes corrientes',
  },

  // Fila 25: Otras cuentas por cobrar corrientes
  // CGN: 1311, 1317, 1319, 1322, 1324, 1333, 1384, 1385, 1387
  // Excluir: cuentas ya mapeadas arriba y deterioro (1386, 1388)
  {
    row: 25,
    pucPrefixes: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'],
    excludePrefixes: ['138401', '138414', '138424'],
    description: 'Otras cuentas por cobrar corrientes',
  },

  // Fila 26: AUTOSUMA - Total CxC y otras cuentas por cobrar corrientes

  // Fila 27: Inventarios corrientes
  // CGN 15 - Inventarios (excepto deterioro 1580)
  {
    row: 27,
    pucPrefixes: ['15'],
    excludePrefixes: ['1580'],
    description: 'Inventarios corrientes',
  },

  // Fila 28: Inversiones corrientes
  // CGN 12 - Inversiones e instrumentos derivados (excepto deterioro 1280)
  {
    row: 28,
    pucPrefixes: ['12'],
    excludePrefixes: ['1280'],
    description: 'Inversiones corrientes',
  },

  // Fila 29: Anticipo de impuestos
  // NO MAPEAR - ya incluido en otras CxC

  // Fila 30: Otros activos financieros corrientes
  // CGN 19 - Otros activos (parte financiera)
  {
    row: 30,
    pucPrefixes: ['19'],
    description: 'Otros activos financieros corrientes',
  },

  // Fila 31: Otros activos no financieros corrientes
  // CGN 17 - Bienes de uso público, 18 - Recursos naturales
  {
    row: 31,
    pucPrefixes: ['17', '18'],
    description: 'Otros activos no financieros corrientes',
  },

  // Fila 32: AUTOSUMA - Activos corrientes totales
];

// =====================================================
// ACTIVOS NO CORRIENTES (Filas 34-50)
// Autosumas: 33, 38, 39, 44, 47, 51, 52
// =====================================================
export const IFE_ESF_ACTIVOS_NO_CORRIENTES: ESFMapping[] = [
  // Fila 33: AUTOSUMA - Activos no corrientes [resumen]
  
  // Fila 34: Propiedades, planta y equipo
  // CGN 16 - Propiedades, planta y equipo (NETO incluye depreciación)
  {
    row: 34,
    pucPrefixes: ['16'],
    description: 'Propiedades, planta y equipo',
  },

  // Fila 35: Propiedades de inversión
  // Normalmente vacío para servicios públicos - no mapear

  // Fila 36: Activos intangibles (distintos de plusvalía)
  // CGN: Parte de 19 que sean intangibles, o si existe subcuenta específica
  // En CGN los intangibles pueden estar en 1970-1975
  {
    row: 36,
    pucPrefixes: ['1970', '1971', '1972', '1973', '1974', '1975'],
    description: 'Activos intangibles',
  },

  // Fila 37: Inversiones no corrientes
  // CGN 1230, 1233, 1227 - Inversiones en asociadas, negocios conjuntos, controladas
  {
    row: 37,
    pucPrefixes: ['1227', '1230', '1233'],
    description: 'Inversiones no corrientes (método participación)',
  },

  // --- SECCIÓN CxC NO CORRIENTES (Filas 38-47) ---
  // Fila 38: AUTOSUMA - CxC y otras CxC no corrientes [Resumen]
  // Fila 39: AUTOSUMA - CxC prestación servicios públicos no corrientes [Resumen]
  
  // Fila 40-46: CxC no corrientes - normalmente vacío para servicios públicos
  
  // Fila 47: AUTOSUMA - Total CxC y otras CxC no corrientes

  // Fila 48: Inventarios no corrientes
  // Raro en servicios públicos - no mapear

  // Fila 49: Otros activos financieros no corrientes
  // CGN 14 - Préstamos por cobrar LP
  {
    row: 49,
    pucPrefixes: ['14'],
    description: 'Otros activos financieros no corrientes (préstamos LP)',
  },

  // Fila 50: Otros activos no financieros no corrientes
  // No mapear por defecto

  // Fila 51: AUTOSUMA - Activos no corrientes totales
  // Fila 52: AUTOSUMA - Total de activos
];

// =====================================================
// PASIVOS CORRIENTES (Filas 56-63)
// Autosumas: 53, 54, 55, 64
// Códigos según PUC CGN Resolución 414
// =====================================================
export const IFE_ESF_PASIVOS_CORRIENTES: ESFMapping[] = [
  // Fila 53: AUTOSUMA - Patrimonio y pasivos [resumen]
  // Fila 54: AUTOSUMA - Pasivos [resumen]
  // Fila 55: AUTOSUMA - Pasivos corrientes [resumen]

  // Fila 56: Provisiones Corrientes
  // CGN 25 - Provisiones
  {
    row: 56,
    pucPrefixes: ['25'],
    description: 'Provisiones corrientes',
    useAbsoluteValue: true,
  },

  // Fila 57: Cuentas por pagar y otras cuentas por pagar corrientes
  // CGN 23 - Cuentas por pagar
  {
    row: 57,
    pucPrefixes: ['23'],
    description: 'Cuentas por pagar corrientes',
    useAbsoluteValue: true,
  },

  // Fila 58: Cuentas por pagar para la adquisición de bienes corrientes
  // Ya incluido en fila 57 - no mapear para evitar duplicar

  // Fila 59: Cuentas por pagar para la adquisición de servicios corrientes
  // Ya incluido en fila 57 - no mapear para evitar duplicar

  // Fila 60: Obligaciones financieras corrientes
  // CGN 21 - Emisión de títulos + 22 - Préstamos por pagar
  {
    row: 60,
    pucPrefixes: ['21', '22'],
    description: 'Obligaciones financieras corrientes',
    useAbsoluteValue: true,
  },

  // Fila 61: Obligaciones laborales corrientes
  // CGN 24 - Beneficios a empleados
  {
    row: 61,
    pucPrefixes: ['24'],
    description: 'Obligaciones laborales corrientes',
    useAbsoluteValue: true,
  },

  // Fila 62: Pasivo por impuestos corrientes
  // CGN 27 - Pasivos por impuestos
  {
    row: 62,
    pucPrefixes: ['27'],
    description: 'Pasivo por impuestos corrientes',
    useAbsoluteValue: true,
  },

  // Fila 63: Otros pasivos corrientes
  // CGN 26 - Otros pasivos
  {
    row: 63,
    pucPrefixes: ['26'],
    description: 'Otros pasivos corrientes',
    useAbsoluteValue: true,
  },

  // Fila 64: AUTOSUMA - Pasivos corrientes totales
];

// =====================================================
// PASIVOS NO CORRIENTES (Filas 66-73)
// Autosumas: 65, 74, 75
// =====================================================
export const IFE_ESF_PASIVOS_NO_CORRIENTES: ESFMapping[] = [
  // Fila 65: AUTOSUMA - Pasivos no corrientes [resumen]
  
  // En el PUC CGN no hay separación corriente/no corriente por código.
  // La clasificación se hace por análisis de vencimientos.
  // Para empresas de servicios públicos, normalmente todo es corriente.
  // Las filas 66-73 se dejan sin mapear para que el usuario complete
  // manualmente si tiene pasivos de largo plazo.

  // Fila 66: Provisiones no Corrientes
  // Fila 67: CxP no corrientes
  // Fila 68: CxP adquisición bienes no corrientes
  // Fila 69: CxP adquisición servicios no corrientes
  // Fila 70: Obligaciones financieras no corrientes
  // Fila 71: Obligaciones laborales no corrientes
  // Fila 72: Pasivo por impuestos no corriente
  // Fila 73: Otros pasivos no corrientes
  
  // Fila 74: AUTOSUMA - Total de pasivos no corrientes
  // Fila 75: AUTOSUMA - Total pasivos
];

// =====================================================
// PATRIMONIO (Filas 77-83)
// Autosumas: 76 (resumen), 84, 85
// Códigos según PUC CGN Resolución 414
// =====================================================
export const IFE_ESF_PATRIMONIO: ESFMapping[] = [
  // Fila 77: Capital
  // CGN 3105 - Capital fiscal/social
  {
    row: 77,
    pucPrefixes: ['3105'],
    description: 'Capital',
    useAbsoluteValue: true,
  },

  // Fila 78: Inversión suplementaria al capital asignado
  // CGN 3109 - Capital fiscal - Loss adicional
  {
    row: 78,
    pucPrefixes: ['3109'],
    description: 'Inversión suplementaria al capital asignado',
    useAbsoluteValue: true,
  },

  // Fila 79: Otras participaciones en el patrimonio
  // CGN 3125 - Patrimonio institucional incorporado
  {
    row: 79,
    pucPrefixes: ['3125', '3110'],
    description: 'Otras participaciones en el patrimonio',
    useAbsoluteValue: true,
  },

  // Fila 80: Superávit por revaluación
  // CGN 3115 - Ganancias o pérdidas por aplicación método participación
  // + 3120 - Ganancias o pérdidas por instrumentos financieros
  {
    row: 80,
    pucPrefixes: ['3115', '3120'],
    description: 'Superávit por revaluación',
    useAbsoluteValue: true,
  },

  // Fila 81: Otras Reservas
  // CGN 3130 - Reservas
  {
    row: 81,
    pucPrefixes: ['3130'],
    description: 'Otras Reservas',
    useAbsoluteValue: true,
  },

  // Fila 82: Ganancias acumuladas
  // CGN 32 - Resultados (3205 acumulados + 3210 del ejercicio)
  // NO usar valor absoluto - las pérdidas acumuladas son negativas
  // El formato de celda mostrará negativos entre paréntesis
  {
    row: 82,
    pucPrefixes: ['32'],
    description: 'Ganancias acumuladas',
    useAbsoluteValue: false,
  },

  // Fila 83: Efectos por adopción NIF
  // CGN 3145 - Impacto por transición NICSP
  {
    row: 83,
    pucPrefixes: ['3145'],
    description: 'Efectos por adopción NIF',
    useAbsoluteValue: true,
  },

  // Fila 84: AUTOSUMA - Patrimonio total
  // Fila 85: AUTOSUMA - Total de patrimonio y pasivos
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
 * Según la estructura del formulario IFE 210000t.
 */
export const IFE_ESF_AUTOSUMA_ROWS = [
  12, // Estado de situación financiera por servicio [partidas]
  13, // Activos [resumen]
  14, // Activos corrientes [resumen]
  17, // CxC por cobrar y otras cuentas por cobrar corrientes [Resumen]
  18, // CxC por prestación de servicios públicos corrientes [Resumen]
  23, // Total cuentas comerciales por cobrar por prestación de servicios públicos corrientes
  26, // Total cuentas comerciales por cobrar y otras cuentas por cobrar corrientes
  32, // Activos corrientes totales
  33, // Activos no corrientes [resumen]
  38, // CxC por cobrar y otras cuentas por cobrar no corrientes [Resumen]
  39, // CxC por prestación de servicios públicos no corrientes [Resumen]
  44, // Total cuentas comerciales por cobrar por prestación de servicios públicos no corrientes
  47, // Total cuentas comerciales por cobrar y otras cuentas por cobrar no corrientes
  51, // Activos no corrientes totales
  52, // Total de activos
  53, // Patrimonio y pasivos [resumen]
  54, // Pasivos [resumen]
  55, // Pasivos corrientes [resumen]
  64, // Pasivos corrientes totales
  65, // Pasivos no corrientes [resumen]
  74, // Total de pasivos no corrientes
  75, // Total pasivos
  76, // Patrimonio [resumen]
  84, // Patrimonio total
  85, // Total de patrimonio y pasivos
];
