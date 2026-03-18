/**
 * Mappings para grupo1, grupo2 y grupo3 (NIIF sector privado).
 *
 * ESF: Usa ESF_CONCEPTS de taxonomyConfig.ts (match por concepto XBRL).
 * ER: Mappings propios basados en PUC NIIF privado.
 * FC01: Mappings de gastos basados en PUC NIIF privado (clase 5).
 * Columnas de servicio: I=Total, J=Acu, K=Alc, L=Aseo.
 */
import type { ESFMapping } from '../../types';
import type { NiifGroup } from '../../taxonomyConfig';
import { SHEET_MAPPING, SERVICE_COLUMNS } from '../../official/templatePaths';

// ============================================
// CONFIGURACIÓN DE COLUMNAS
// ============================================

/** Columnas ER para grupo1/2/3 (Hoja3) */
export const GRUPO_ER_COLUMNS: Record<string, string> = {
  total: 'I',
  acueducto: 'J',
  alcantarillado: 'K',
  aseo: 'L',
};

// Re-export SERVICE_COLUMNS para uso directo
export { SERVICE_COLUMNS };

// ============================================
// MAPPINGS DEL ESTADO DE RESULTADOS (Hoja3)
// PUC NIIF sector privado
// ============================================

export const GRUPO_ER_MAPPINGS: ESFMapping[] = [
  { row: 15, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['41'] },
  { row: 16, label: 'Otros ingresos operacionales', pucPrefixes: ['42'] },
  { row: 17, label: 'Costo de ventas', pucPrefixes: ['61'] },
  { row: 21, label: 'Gastos de administración', pucPrefixes: ['51'] },
  { row: 22, label: 'Gastos de ventas', pucPrefixes: ['52'] },
  { row: 25, label: 'Gastos financieros', pucPrefixes: ['53'] },
  { row: 26, label: 'Ingresos financieros', pucPrefixes: ['4210'] },
];

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
  };
}