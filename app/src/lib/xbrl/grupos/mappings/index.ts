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
}

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
  };
}