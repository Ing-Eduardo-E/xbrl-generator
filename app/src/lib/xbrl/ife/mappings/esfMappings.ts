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
 * PUC Colombiano - Estructura de Clases:
 * - Clase 1: ACTIVO
 *   - 11: Disponible (Efectivo)
 *   - 12: Inversiones
 *   - 13: Deudores (CxC)
 *   - 14: Inventarios
 *   - 15: Propiedades, Planta y Equipo
 *   - 16: Intangibles
 *   - 17: Diferidos
 *   - 18: Otros Activos
 *   - 19: Valorizaciones
 * - Clase 2: PASIVO
 *   - 21: Obligaciones Financieras
 *   - 22: Proveedores
 *   - 23: Cuentas por Pagar
 *   - 24: Impuestos
 *   - 25: Obligaciones Laborales
 *   - 26: Provisiones (Pasivo)
 *   - 27: Diferidos (Pasivo)
 *   - 28: Otros Pasivos
 *   - 29: Bonos y papeles comerciales
 * - Clase 3: PATRIMONIO
 *   - 31: Capital Social
 *   - 32: Superávit de Capital
 *   - 33: Reservas
 *   - 34: Revalorización del Patrimonio
 *   - 35: Dividendos
 *   - 36: Resultados del Ejercicio
 *   - 37: Resultados de Ejercicios Anteriores
 *   - 38: Superávit por Valorizaciones
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
// Autosumas: 14 (Activos corrientes resumen), 17, 18, 23, 26, 32
// =====================================================
export const IFE_ESF_ACTIVOS_CORRIENTES: ESFMapping[] = [
  // Fila 15: Efectivo y equivalentes al efectivo
  // PUC 11 - Disponible (excepto restringido 1195)
  {
    row: 15,
    pucPrefixes: ['11'],
    excludePrefixes: ['1195'],
    description: 'Efectivo y equivalentes al efectivo',
  },
  // Fila 16: Efectivo de uso restringido corrientes
  // PUC 1195 - Efectivo restringido
  {
    row: 16,
    pucPrefixes: ['1195'],
    description: 'Efectivo de uso restringido corrientes',
  },

  // --- CxC por prestación de servicios públicos corrientes ---
  // Fila 19: CxC servicios públicos (sin subsidios ni aprovechamiento)
  // PUC 1305 - Clientes
  {
    row: 19,
    pucPrefixes: ['1305'],
    description: 'CxC servicios públicos corrientes (sin subsidios)',
  },
  // Fila 20: CxC por subsidios corrientes
  // Subcuentas específicas de subsidios - normalmente vacío
  // No mapear por defecto

  // Fila 21: CxC al Ministerio de Minas por subsidios
  // Subcuenta específica - normalmente vacío
  // No mapear por defecto

  // Fila 22: CxC por aprovechamiento corrientes
  // Subcuenta específica - normalmente vacío
  // No mapear por defecto

  // Fila 23: AUTOSUMA - Total CxC servicios públicos corrientes

  // Fila 24: CxC por venta de bienes corrientes
  // PUC 1310 - Cuentas corrientes comerciales
  {
    row: 24,
    pucPrefixes: ['1310'],
    description: 'CxC por venta de bienes corrientes',
  },

  // Fila 25: Otras cuentas por cobrar corrientes
  // PUC 13XX (excepto 1305, 1310 y provisiones 1399)
  {
    row: 25,
    pucPrefixes: ['1315', '1320', '1325', '1328', '1330', '1335', '1340', '1345', '1350', '1355', '1360', '1365', '1370', '1380', '1390'],
    excludePrefixes: ['1399'],
    description: 'Otras cuentas por cobrar corrientes',
  },

  // Fila 26: AUTOSUMA - Total CxC y otras cuentas por cobrar corrientes

  // Fila 27: Inventarios corrientes
  // PUC 14 - Inventarios
  {
    row: 27,
    pucPrefixes: ['14'],
    description: 'Inventarios corrientes',
  },

  // Fila 28: Inversiones corrientes
  // PUC 12 - Inversiones (corto plazo)
  {
    row: 28,
    pucPrefixes: ['12'],
    description: 'Inversiones corrientes',
  },

  // Fila 29: Anticipo de impuestos
  // PUC 1355 - Anticipo de impuestos y contribuciones
  {
    row: 29,
    pucPrefixes: ['1355'],
    description: 'Anticipo de impuestos',
  },

  // Fila 30: Otros activos financieros corrientes
  // PUC 18 - Otros activos (parte corriente)
  {
    row: 30,
    pucPrefixes: ['18'],
    description: 'Otros activos financieros corrientes',
  },

  // Fila 31: Otros activos no financieros corrientes
  // PUC 17 - Diferidos
  {
    row: 31,
    pucPrefixes: ['17'],
    description: 'Otros activos no financieros corrientes',
  },

  // Fila 32: AUTOSUMA - Activos corrientes totales
];

// =====================================================
// ACTIVOS NO CORRIENTES (Filas 34-50)
// Autosumas: 33 (resumen), 38, 39, 44, 47, 51
// =====================================================
export const IFE_ESF_ACTIVOS_NO_CORRIENTES: ESFMapping[] = [
  // Fila 34: Propiedades, planta y equipo
  // PUC 15 - Propiedades, Planta y Equipo (NETO)
  {
    row: 34,
    pucPrefixes: ['15'],
    description: 'Propiedades, planta y equipo',
  },

  // Fila 35: Propiedades de inversión
  // Normalmente vacío para servicios públicos
  // No mapear por defecto

  // Fila 36: Activos intangibles (distintos de plusvalía)
  // PUC 16 - Intangibles (NETO)
  {
    row: 36,
    pucPrefixes: ['16'],
    description: 'Activos intangibles',
  },

  // Fila 37: Inversiones no corrientes
  // Subcuentas específicas de inversiones LP
  // No mapear por defecto (evitar duplicar con fila 28)

  // --- CxC no corrientes ---
  // Filas 40-43: CxC no corrientes (detalle)
  // Normalmente vacías para empresas de servicios públicos
  // Fila 40: CxC servicios públicos no corrientes
  // Fila 41: CxC subsidios no corrientes
  // Fila 42: CxC Ministerio de Minas no corrientes
  // Fila 43: CxC aprovechamiento no corrientes
  // Fila 44: AUTOSUMA - Total CxC servicios públicos no corrientes

  // Fila 45: CxC venta de bienes no corrientes
  // Fila 46: Otras CxC no corrientes
  // Fila 47: AUTOSUMA - Total CxC y otras cuentas por cobrar no corrientes

  // Fila 48: Inventarios no corrientes
  // Raro en servicios públicos - no mapear

  // Fila 49: Otros activos financieros no corrientes
  // PUC 19 - Valorizaciones
  {
    row: 49,
    pucPrefixes: ['19'],
    description: 'Otros activos financieros no corrientes (valorizaciones)',
  },

  // Fila 50: Otros activos no financieros no corrientes
  // No mapear por defecto

  // Fila 51: AUTOSUMA - Activos no corrientes totales
  // Fila 52: AUTOSUMA - Total de activos
];

// =====================================================
// PASIVOS CORRIENTES (Filas 56-63)
// Autosumas: 53, 54, 55 (resúmenes), 64
// =====================================================
export const IFE_ESF_PASIVOS_CORRIENTES: ESFMapping[] = [
  // Fila 56: Provisiones Corrientes
  // PUC 26 - Pasivos estimados y provisiones
  {
    row: 56,
    pucPrefixes: ['26'],
    description: 'Provisiones corrientes',
    useAbsoluteValue: true,
  },

  // Fila 57: Cuentas por pagar y otras cuentas por pagar corrientes
  // PUC 22 - Proveedores + 23 - Cuentas por pagar
  {
    row: 57,
    pucPrefixes: ['22', '23'],
    description: 'Cuentas por pagar corrientes',
    useAbsoluteValue: true,
  },

  // Fila 58: Cuentas por pagar para la adquisición de bienes corrientes
  // Subcuenta específica - normalmente incluido en 57
  // No mapear por defecto (evitar duplicar)

  // Fila 59: Cuentas por pagar para la adquisición de servicios corrientes
  // Subcuenta específica - normalmente incluido en 57
  // No mapear por defecto (evitar duplicar)

  // Fila 60: Obligaciones financieras corrientes
  // PUC 21 - Obligaciones financieras (corto plazo)
  {
    row: 60,
    pucPrefixes: ['21'],
    description: 'Obligaciones financieras corrientes',
    useAbsoluteValue: true,
  },

  // Fila 61: Obligaciones laborales corrientes
  // PUC 25 - Obligaciones laborales
  {
    row: 61,
    pucPrefixes: ['25'],
    description: 'Obligaciones laborales corrientes',
    useAbsoluteValue: true,
  },

  // Fila 62: Pasivo por impuestos corrientes, corriente
  // PUC 24 - Impuestos, gravámenes y tasas
  {
    row: 62,
    pucPrefixes: ['24'],
    description: 'Pasivo por impuestos corrientes',
    useAbsoluteValue: true,
  },

  // Fila 63: Otros pasivos corrientes
  // PUC 27 - Diferidos + 28 - Otros pasivos + 29 - Bonos
  {
    row: 63,
    pucPrefixes: ['27', '28', '29'],
    description: 'Otros pasivos corrientes',
    useAbsoluteValue: true,
  },

  // Fila 64: AUTOSUMA - Pasivos corrientes totales
];

// =====================================================
// PASIVOS NO CORRIENTES (Filas 66-73)
// Autosumas: 65 (resumen), 74, 75
// =====================================================
export const IFE_ESF_PASIVOS_NO_CORRIENTES: ESFMapping[] = [
  // En el PUC colombiano estándar no hay separación corriente/no corriente
  // por código. La clasificación se hace por análisis de vencimientos.
  // Para empresas de servicios públicos, normalmente todo es corriente.

  // Fila 66: Provisiones no Corrientes
  // Fila 67: CxP no corrientes
  // Fila 68: CxP adquisición bienes no corrientes
  // Fila 69: CxP adquisición servicios no corrientes
  // Fila 70: Obligaciones financieras no corrientes
  // Fila 71: Obligaciones laborales no corrientes
  // Fila 72: Pasivo por impuestos corrientes, no corriente
  // Fila 73: Otros pasivos no corrientes

  // NO MAPEAR - dejar que el usuario complete manualmente si tiene LP
  // Fila 74: AUTOSUMA - Total de pasivos no corrientes
  // Fila 75: AUTOSUMA - Total pasivos
];

// =====================================================
// PATRIMONIO (Filas 77-83)
// Autosumas: 76 (resumen), 84, 85
// =====================================================
export const IFE_ESF_PATRIMONIO: ESFMapping[] = [
  // Fila 77: Capital
  // PUC 31 - Capital social
  {
    row: 77,
    pucPrefixes: ['31'],
    description: 'Capital',
    useAbsoluteValue: true,
  },

  // Fila 78: Inversión suplementaria al capital asignado
  // PUC 32 - Superávit de capital
  {
    row: 78,
    pucPrefixes: ['32'],
    description: 'Inversión suplementaria al capital asignado',
    useAbsoluteValue: true,
  },

  // Fila 79: Otras participaciones en el patrimonio
  // PUC 35 - Dividendos (o participaciones)
  {
    row: 79,
    pucPrefixes: ['35'],
    description: 'Otras participaciones en el patrimonio',
    useAbsoluteValue: true,
  },

  // Fila 80: Superávit por revaluación
  // PUC 34 - Revalorización del patrimonio + 38 - Superávit por valorizaciones
  {
    row: 80,
    pucPrefixes: ['34', '38'],
    description: 'Superávit por revaluación',
    useAbsoluteValue: true,
  },

  // Fila 81: Otras Reservas
  // PUC 33 - Reservas
  {
    row: 81,
    pucPrefixes: ['33'],
    description: 'Otras Reservas',
    useAbsoluteValue: true,
  },

  // Fila 82: Ganancias acumuladas
  // PUC 36 - Resultados del ejercicio + 37 - Resultados de ejercicios anteriores
  {
    row: 82,
    pucPrefixes: ['36', '37'],
    description: 'Ganancias acumuladas',
    useAbsoluteValue: true,
  },

  // Fila 83: Efectos por adopción NIF
  // Subcuenta específica si existe - normalmente vacío
  // No mapear por defecto

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
