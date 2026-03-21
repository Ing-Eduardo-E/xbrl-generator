/**
 * Mappings para grupo1, grupo2 y grupo3 (NIIF sector privado).
 *
 * ESF: Usa ESF_CONCEPTS de taxonomyConfig.ts (match por concepto XBRL).
 * ER: Mappings propios basados en PUC NIIF privado.
 * FC01: Mappings de gastos basados en PUC NIIF privado (clase 5).
 * Columnas ESF (Hoja2): I=Acu, J=Alc, K=Aseo (Total es fórmula).
 * Columnas ER (Hoja3): varían por grupo (ver configs abajo).
 */
import type { ESFMapping } from '../../types';
import type { NiifGroup } from '../../taxonomyConfig';
import { SHEET_MAPPING, SERVICE_COLUMNS } from '../../official/templatePaths';

// ============================================
// CONFIGURACIÓN DE COLUMNAS
// ============================================

/**
 * Columnas ER por grupo (Hoja3) — verificadas contra plantillas xlsx.
 * Grupo1: F=Acu, G=Alc, H=Aseo, I=Energía, J=Gas, K=GLP, L=Otras, M=XM (Total=N fórmula)
 * Grupo2: E=Acu, F=Alc, G=Aseo, H=Energía, I=Gas, J=GLP, K=Otras (Total=L fórmula)
 * Grupo3: E=Acu, F=Alc, G=Aseo, H=Energía, I=Gas, J=GLP (Total=K fórmula)
 */
const GRUPO1_ER_COLUMNS: Record<string, string> = {
  acueducto: 'F',
  alcantarillado: 'G',
  aseo: 'H',
  energia: 'I',
  gas: 'J',
  glp: 'K',
  otras: 'L',
  xm: 'M',
};

const GRUPO2_ER_COLUMNS: Record<string, string> = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  energia: 'H',
  gas: 'I',
  glp: 'J',
  otras: 'K',
};

const GRUPO3_ER_COLUMNS: Record<string, string> = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  energia: 'H',
  gas: 'I',
  glp: 'J',
};

const ER_COLUMNS_BY_GROUP: Record<string, Record<string, string>> = {
  grupo1: GRUPO1_ER_COLUMNS,
  grupo2: GRUPO2_ER_COLUMNS,
  grupo3: GRUPO3_ER_COLUMNS,
};

// Re-export SERVICE_COLUMNS para uso directo
export { SERVICE_COLUMNS };

// ============================================
// MAPPINGS DEL ESTADO DE RESULTADOS (Hoja3)
// PUC NIIF sector privado — per grupo (filas verificadas contra templates)
// ============================================

/** Grupo 1 (NIIF Plenas): ER con estructura extendida */
const GRUPO1_ER_MAPPINGS: ESFMapping[] = [
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['41'] },
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['61'] },
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['42'], excludePrefixes: ['4210'] },
  { row: 18, label: 'Gastos de administración', pucPrefixes: ['51'] },
  { row: 19, label: 'Otros gastos', pucPrefixes: ['52'] },
  { row: 20, label: 'Otras ganancias (pérdidas)', pucPrefixes: ['47', '48'], excludePrefixes: ['4815'] },
  { row: 25, label: 'Ingresos financieros', pucPrefixes: ['4210'] },
  { row: 26, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },
  { row: 28, label: 'Participación asociadas', pucPrefixes: ['4815', '5815'] },
];

/** Grupo 2 (NIIF Pymes): ER con impuestos diferidos */
const GRUPO2_ER_MAPPINGS: ESFMapping[] = [
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['41'] },
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['61'] },
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['42'], excludePrefixes: ['4210'] },
  { row: 18, label: 'Gastos de administración', pucPrefixes: ['51'] },
  { row: 19, label: 'Otros gastos', pucPrefixes: ['52'] },
  { row: 20, label: 'Otras ganancias (pérdidas)', pucPrefixes: ['47', '48'], excludePrefixes: ['4815'] },
  { row: 21, label: 'Ingresos financieros', pucPrefixes: ['4210'] },
  { row: 22, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },
  { row: 23, label: 'Participación asociadas', pucPrefixes: ['4815', '5815'] },
  { row: 25, label: 'Gasto impuesto ganancias corriente', pucPrefixes: ['540101'] },
  { row: 26, label: 'Gasto impuesto ganancias diferido', pucPrefixes: ['5410'], excludePrefixes: ['540101'] },
];

/** Grupo 3 (Microempresas): ER simplificado, orden distinto */
const GRUPO3_ER_MAPPINGS: ESFMapping[] = [
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['41'] },
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['61'] },
  { row: 17, label: 'Gastos de administración', pucPrefixes: ['51'] },
  { row: 18, label: 'Otros gastos', pucPrefixes: ['52'] },
  { row: 19, label: 'Otras ganancias (pérdidas)', pucPrefixes: ['47', '48'] },
  { row: 20, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },
  { row: 21, label: 'Otros ingresos', pucPrefixes: ['42'], excludePrefixes: ['4210'] },
  { row: 22, label: 'Ingresos financieros', pucPrefixes: ['4210'] },
  { row: 24, label: 'Gasto impuesto ganancias corriente', pucPrefixes: ['540101'] },
  { row: 25, label: 'Gasto impuesto ganancias diferido', pucPrefixes: ['5410'], excludePrefixes: ['540101'] },
];

const ER_MAPPINGS_BY_GROUP: Record<string, ESFMapping[]> = {
  grupo1: GRUPO1_ER_MAPPINGS,
  grupo2: GRUPO2_ER_MAPPINGS,
  grupo3: GRUPO3_ER_MAPPINGS,
};

// ============================================
// MAPPINGS FC01 - GASTOS POR SERVICIO
// PUC NIIF sector privado (clase 5)
// ============================================

export const GRUPO_FC01_EXPENSE_MAPPINGS: ESFMapping[] = [
  { row: 13, label: 'Sueldos y salarios', pucPrefixes: ['5105', '510506', '510503', '510509'] },
  { row: 14, label: 'Prestaciones sociales', pucPrefixes: ['5110', '5115', '5120', '5125'] },
  { row: 15, label: 'Servicios públicos', pucPrefixes: ['5135', '513525', '513530'] },
  { row: 16, label: 'Seguros', pucPrefixes: ['5130'] },
  { row: 17, label: 'Servicios técnicos', pucPrefixes: ['5140', '5145'] },
  { row: 18, label: 'Mantenimiento', pucPrefixes: ['5150', '515005', '515010'] },
  { row: 19, label: 'Depreciaciones', pucPrefixes: ['5260', '526005', '526010'] },
  { row: 20, label: 'Amortizaciones', pucPrefixes: ['5265'] },
  { row: 21, label: 'Transporte y viajes', pucPrefixes: ['5165', '5170'] },
  { row: 22, label: 'Otros gastos', pucPrefixes: ['5195', '5295'] },
];

/** Filas de datos en FC01 para calcular columna G (E+F) */
export const GRUPO_FC01_DATA_ROWS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

/** Filas donde columna F debe ser 0 (solo fila de costos tiene valor) */
export const GRUPO_FC01_ZERO_F_ROWS = [13, 14, 15, 16, 17, 19, 20, 21, 22];

// ============================================
// CONFIGURACIÓN POR GRUPO
// ============================================

export interface GrupoConfig {
  /** Nombre del grupo para logs */
  name: string;
  /** Nombre de hoja para FC01 Acueducto */
  fc01AcuSheet: string;
  /** Nombre de hoja para FC01 Alcantarillado */
  fc01AlcSheet: string;
  /** Nombre de hoja para FC01 Aseo */
  fc01AseoSheet: string;
  /** Nombre de hoja para FC01 Consolidado */
  fc01ConsolidadoSheet: string;
  /** Nombre de hoja para FC02 */
  fc02Sheet: string;
  /** Nombre de hoja para FC03 Acueducto (null si no aplica) */
  fc03AcuSheet: string | null;
  /** Nombre de hoja para FC03 Alcantarillado (null si no aplica) */
  fc03AlcSheet: string | null;
  /** Nombre de hoja para FC03 Aseo (null si no aplica) */
  fc03AseoSheet: string | null;
  /** Nombre de hoja para FC05b (null si no aplica) */
  fc05bSheet: string | null;
  /** Nombre de hoja para FC08 (null si no aplica) */
  fc08Sheet: string | null;
  /** Fila destino de costos de ventas en FC01 */
  fc01CostRow: number;
  /** Fila de disposición final para Aseo (null si no aplica) */
  fc01AseoDisposalRow: number | null;
  /** Columnas ER (Hoja3) — varían por grupo */
  erColumns: Record<string, string>;
  /** Mappings ER (Hoja3) — filas y PUC prefixes varían por grupo */
  erMappings: ESFMapping[];
  /** ESF row overrides — traduce row default de ESF_CONCEPTS al row real del template */
  esfRowMap: Record<number, number>;
}

// ============================================
// ESF ROW MAPS — traduce ESF_CONCEPTS.row al row real de cada template
// Valores verificados contra plantillas xlsx oficiales.
// 0 = concepto no tiene fila en la plantilla (skip).
// ============================================

/**
 * Grupo 1 (NIIF Plenas): Rows 15-21 coinciden con ESF_CONCEPTS.
 * Rows 22+ están desplazados por sub-detail CxC (rows 18-27 en template).
 */
const GRUPO1_ESF_ROW_MAP: Record<number, number> = {
  // Activos corrientes (15-21 coinciden directamente)
  22: 28,   // Inventarios
  23: 29,   // Activos por impuestos corrientes
  24: 32,   // Otros activos no financieros corrientes
  // Activos no corrientes
  27: 40,   // PPE
  28: 43,   // Intangibles
  29: 41,   // Propiedad de inversión
  30: 42,   // Plusvalía
  31: 61,   // Activos por impuestos diferidos
  32: 49,   // CxC no corrientes
  33: 64,   // Otros activos no corrientes
  // Pasivos corrientes
  37: 75,   // CxP comerciales (aggregate)
  38: 75,   // Proveedores → CxP aggregate
  39: 84,   // Ingresos diferidos → Otros pasivos corrientes
  40: 84,   // Gastos acumulados → Otros pasivos corrientes
  41: 82,   // Obligaciones financieras corrientes
  42: 84,   // Obligaciones laborales → Otros pasivos corrientes
  43: 81,   // Pasivos por impuestos corrientes
  44: 71,   // Provisiones corrientes
  45: 84,   // Otros pasivos corrientes
  // Pasivos no corrientes
  48: 101,  // Obligaciones financieras NC
  49: 93,   // Proveedores NC → CxP NC
  50: 103,  // Ingresos diferidos NC → Otros NC
  51: 103,  // Obligaciones laborales NC → Otros NC
  52: 99,   // Pasivo por impuestos diferidos
  53: 89,   // Provisiones NC
  54: 103,  // Otros pasivos NC
  // Patrimonio
  58: 107,  // Capital emitido
  59: 110,  // Prima de emisión
  60: 109,  // Acciones propias en cartera
  61: 111,  // Ganancias acumuladas
  62: 111,  // Utilidad del ejercicio → Ganancias acumuladas
  63: 116,  // Superávit revaluación → ORI
  64: 115,  // Otras reservas
  65: 116,  // Otro resultado integral
  67: 113,  // Participaciones NC → Otras participaciones patrimonio
};

/**
 * Grupo 2 (NIIF Pymes): Estructura similar a G1 con pequeños desplazamientos.
 * Rows 15-21 coinciden; 22+ difieren.
 */
const GRUPO2_ESF_ROW_MAP: Record<number, number> = {
  // Activos corrientes (15-21 coinciden)
  22: 28,   // Inventarios
  23: 29,   // Activos por impuestos corrientes
  24: 33,   // Otros activos no financieros corrientes
  // Activos no corrientes
  27: 38,   // PPE
  28: 42,   // Intangibles
  29: 39,   // Propiedad de inversión
  30: 41,   // Plusvalía
  31: 62,   // Activos por impuestos diferidos
  32: 50,   // CxC no corrientes
  33: 65,   // Otros activos no corrientes
  // Pasivos corrientes
  37: 76,   // CxP comerciales
  38: 76,   // Proveedores → CxP aggregate
  39: 87,   // Ingresos diferidos → Otros pasivos
  40: 87,   // Gastos acumulados → Otros pasivos
  41: 83,   // Obligaciones financieras corrientes
  42: 87,   // Obligaciones laborales → Otros pasivos
  43: 82,   // Pasivos por impuestos corrientes
  44: 72,   // Provisiones corrientes
  45: 87,   // Otros pasivos corrientes
  // Pasivos no corrientes
  48: 102,  // Obligaciones financieras NC → Otros pasivos financieros NC
  49: 94,   // Proveedores NC → CxP NC
  50: 104,  // Ingresos diferidos NC → Otros NC
  51: 104,  // Obligaciones laborales NC → Otros NC
  52: 100,  // Pasivo por impuestos diferidos
  53: 90,   // Provisiones NC
  54: 104,  // Otros pasivos NC
  // Patrimonio
  58: 108,  // Capital emitido
  59: 112,  // Prima de emisión
  60: 113,  // Acciones propias en cartera
  61: 110,  // Ganancias acumuladas
  62: 110,  // Utilidad del ejercicio → Ganancias acumuladas
  63: 117,  // Superávit revaluación → ORI
  64: 116,  // Otras reservas
  65: 117,  // Otro resultado integral
  67: 114,  // Participaciones NC → Otras participaciones patrimonio
};

/**
 * Grupo 3 (Microempresas): Estructura simplificada, CxC desplazada a row 18.
 * Proveedores, ingresos diferidos y gastos acumulados tienen filas propias.
 */
const GRUPO3_ESF_ROW_MAP: Record<number, number> = {
  // Activos corrientes — CxC desplazada (row 17=Inversiones)
  17: 18,   // CxC corrientes (G3: row 18, no row 17)
  18: 19,   // CxC servicios públicos (shifted +1)
  19: 25,   // Deudores comerciales → CxC por venta bienes
  20: 26,   // Otras CxC corrientes
  21: 18,   // Deterioro CxC → CxC aggregate
  22: 28,   // Inventarios
  23: 29,   // Activos por impuestos corrientes
  24: 30,   // Otros activos corrientes
  // Activos no corrientes
  27: 36,   // PPE
  28: 0,    // Intangibles (sin fila en G3)
  29: 35,   // Propiedad de inversión
  30: 0,    // Plusvalía (sin fila en G3)
  31: 48,   // Activos por impuestos diferidos
  32: 37,   // CxC no corrientes
  33: 50,   // Otros activos no corrientes
  // Pasivos corrientes — G3 tiene sub-detail bajo CxP
  37: 56,   // CxP corrientes (aggregate)
  38: 57,   // Proveedores corrientes (G3 tiene fila propia!)
  39: 58,   // Ingresos diferidos corrientes (G3 tiene fila propia!)
  40: 59,   // Gastos acumulados corrientes (G3 tiene fila propia!)
  41: 63,   // Obligaciones financieras corrientes
  42: 62,   // Obligaciones laborales corrientes
  43: 64,   // Pasivo por impuestos corrientes
  44: 65,   // Provisiones corrientes
  45: 66,   // Otros pasivos corrientes
  // Pasivos no corrientes — G3 también tiene sub-detail
  48: 75,   // Obligaciones financieras NC
  49: 70,   // Proveedores NC (G3 tiene fila propia!)
  50: 71,   // Ingresos diferidos NC (G3 tiene fila propia!)
  51: 76,   // Obligaciones laborales NC
  52: 78,   // Pasivo por impuestos diferidos
  53: 79,   // Provisiones NC
  54: 80,   // Otros pasivos NC
  // Patrimonio (simplificado)
  58: 84,   // Capital emitido
  59: 0,    // Prima de emisión (sin fila en G3)
  60: 0,    // Acciones propias (sin fila en G3)
  61: 85,   // Ganancias acumuladas
  62: 85,   // Utilidad del ejercicio → Ganancias acumuladas
  63: 89,   // Superávit revaluación → Otras participaciones
  64: 88,   // Otras reservas
  65: 89,   // Otro resultado integral → Otras participaciones
  67: 0,    // Participaciones NC (sin fila en G3)
};

const ESF_ROW_MAPS: Record<string, Record<number, number>> = {
  grupo1: GRUPO1_ESF_ROW_MAP,
  grupo2: GRUPO2_ESF_ROW_MAP,
  grupo3: GRUPO3_ESF_ROW_MAP,
};

/**
 * Obtiene la configuración de un grupo NIIF usando SHEET_MAPPING.
 */
export function getGrupoConfig(niifGroup: NiifGroup): GrupoConfig | null {
  const sheets = SHEET_MAPPING[niifGroup];
  if (!sheets || !sheets['900017a']) return null;

  const hasFC03 = !!sheets['900021'];
  const hasFC05b = !!sheets['900028b'];
  const hasFC08 = !!sheets['900031'];

  return {
    name: niifGroup,
    fc01AcuSheet: sheets['900017a'],
    fc01AlcSheet: sheets['900017b'],
    fc01AseoSheet: sheets['900017c'],
    fc01ConsolidadoSheet: sheets['900017g'],
    fc02Sheet: sheets['900019'],
    fc03AcuSheet: hasFC03 ? sheets['900021'] : null,
    fc03AlcSheet: hasFC03 ? sheets['900022'] : null,
    fc03AseoSheet: hasFC03 ? sheets['900023'] : null,
    fc05bSheet: hasFC05b ? sheets['900028b'] : null,
    fc08Sheet: hasFC08 ? sheets['900031'] : null,
    fc01CostRow: 18,
    fc01AseoDisposalRow: null,
    erColumns: ER_COLUMNS_BY_GROUP[niifGroup] || GRUPO2_ER_COLUMNS,
    erMappings: ER_MAPPINGS_BY_GROUP[niifGroup] || GRUPO2_ER_MAPPINGS,
    esfRowMap: ESF_ROW_MAPS[niifGroup] || GRUPO2_ESF_ROW_MAP,
  };
}