/**
 * Configuración de rutas de templates XBRL oficiales por grupo NIIF.
 * Extraído de officialTemplateService.ts (L34–891).
 */
import type { NiifGroup } from '../taxonomyConfig';
import {
  R414_SERVICE_COLUMNS,
  R414_ESF_ACTIVOS as _R414_ESF_ACTIVOS,
  R414_ESF_PASIVOS as _R414_ESF_PASIVOS,
  R414_ESF_PATRIMONIO as _R414_ESF_PATRIMONIO,
  R414_ESF_MAPPINGS as _R414_ESF_MAPPINGS,
} from '../r414/mappings';

/** Rutas de plantillas por grupo NIIF */
export const TEMPLATE_PATHS: Record<NiifGroup, {
  xbrlt: string;
  xml: string;
  xlsx: string;
  xbrl: string;
  basePrefix: string;
  outputPrefix: string;
}> = {
  grupo1: {
    xbrlt: 'grupo1/Grupo1_Individual_Directo_ID20037_2024-12-31.xbrlt',
    xml: 'grupo1/Grupo1_Individual_Directo_ID20037_2024-12-31.xml',
    xlsx: 'grupo1/Grupo1_Individual_Directo_ID20037_2024-12-31.xlsx',
    xbrl: 'grupo1/Grupo1_Individual_Directo_ID20037_2024-12-31.xbrl',
    basePrefix: 'Grupo1_Individual_Directo',
    outputPrefix: 'G1_Individual',
  },
  grupo2: {
    xbrlt: 'grupo2/Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrlt',
    xml: 'grupo2/Grupo2_Individual_Indirecto_ID20037_2024-12-31.xml',
    xlsx: 'grupo2/Grupo2_Individual_Indirecto_ID20037_2024-12-31.xlsx',
    xbrl: 'grupo2/Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrl',
    basePrefix: 'Grupo2_Individual_Indirecto',
    outputPrefix: 'G2_Individual',
  },
  grupo3: {
    xbrlt: 'grupo3/Grupo3_ID20037_2024-12-31.xbrlt',
    xml: 'grupo3/Grupo3_ID20037_2024-12-31.xml',
    xlsx: 'grupo3/Grupo3_ID20037_2024-12-31.xlsx',
    xbrl: 'grupo3/Grupo3_ID20037_2024-12-31.xbrl',
    basePrefix: 'Grupo3',
    outputPrefix: 'G3',
  },
  r414: {
    xbrlt: 'r414/R414Ind_ID20037_2024-12-31.xbrlt',
    xml: 'r414/R414Ind_ID20037_2024-12-31.xml',
    xlsx: 'r414/R414Ind_ID20037_2024-12-31.xlsx',
    xbrl: 'r414/R414Ind_ID20037_2024-12-31.xbrl',
    basePrefix: 'R414Ind',
    outputPrefix: 'R414_Individual',
  },
  // Los siguientes grupos no tienen plantillas oficiales todavía
  r533: {
    xbrlt: '',
    xml: '',
    xlsx: '',
    xbrl: '',
    basePrefix: 'R533_Individual',
    outputPrefix: 'R533_Individual',
  },
  ife: {
    xbrlt: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt',
    xml: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xml',
    xlsx: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx',
    xbrl: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrl',
    basePrefix: 'IFE_SegundoTrimestre',
    outputPrefix: 'IFE',
  },
};

/**
 * Mapeo de códigos de hojas XBRL a nombres de hojas Excel por grupo de taxonomía
 * Basado en el índice de contenidos de cada plantilla oficial
 */
export const SHEET_MAPPING: Record<NiifGroup, Record<string, string>> = {
  grupo1: {
    '110000': 'Hoja1',   // Información general
    '210000': 'Hoja2',   // Estado de Situación Financiera
    '310000': 'Hoja3',   // Estado de Resultados
    '900017a': 'Hoja38', // FC01-1 Gastos Acueducto
    '900017b': 'Hoja39', // FC01-2 Gastos Alcantarillado
    '900017c': 'Hoja40', // FC01-3 Gastos Aseo
    '900017g': 'Hoja44', // FC01-7 Gastos Total
    '900019': 'Hoja45',  // FC02 Complementario ingresos
    '900021': 'Hoja46',  // FC03-1 CXC Acueducto
    '900022': 'Hoja47',  // FC03-2 CXC Alcantarillado
    '900023': 'Hoja48',  // FC03-3 CXC Aseo
    '900028': 'Hoja54',  // FC05 Acreedores (revelación textual - no numérico)
    '900028b': 'Hoja55', // FC05b Pasivos por edades (con datos numéricos)
    '900031': 'Hoja58',  // FC08 Conciliación ingresos
    '900032': 'Hoja59',  // FC09 Detalle costo ventas
  },
  grupo2: {
    '110000': 'Hoja1',
    '210000': 'Hoja2',
    '310000': 'Hoja3',
    '900017a': 'Hoja18',
    '900017b': 'Hoja19',
    '900017c': 'Hoja20',
    '900017g': 'Hoja24',
    '900019': 'Hoja25',
    '900021': 'Hoja26',
    '900022': 'Hoja27',
    '900023': 'Hoja28',
  },
  grupo3: {
    '110000': 'Hoja1',
    '210000': 'Hoja2',
    '310000': 'Hoja3',
    '900017a': 'Hoja10',
    '900017b': 'Hoja11',
    '900017c': 'Hoja12',
    '900017g': 'Hoja16',
    '900019': 'Hoja17',
    // Grupo3 no tiene FC03 (CXC por estrato)
  },
  r414: {
    '110000': 'Hoja1',
    '210000': 'Hoja2',
    '310000': 'Hoja3',
    '900017a': 'Hoja16',
    '900017b': 'Hoja17',
    '900017c': 'Hoja18',
    '900017g': 'Hoja22',
    '900019': 'Hoja23',
    '900021': 'Hoja24',
    '900022': 'Hoja25',
    '900023': 'Hoja26',
  },
  r533: {},
  ife: {
    // IFE tiene estructura diferente con 8 hojas trimestrales
    '110000t': 'Hoja1',   // Información general
    '120000t': 'Hoja2',   // Información adicional (variaciones, ajustes)
    '210000t': 'Hoja3',   // Estado de Situación Financiera por servicio
    '310000t': 'Hoja4',   // Estado de Resultados por servicio
    '900020t': 'Hoja5',   // FC03t - CXC por rangos de vencimiento
    '900028t': 'Hoja6',   // FC05t - CXP detallado
    '900050t': 'Hoja7',   // FC08t - Ingresos y Gastos
    '900060t': 'Hoja8',   // FC09t - Deterioro de activos
  },
};

/**
 * Estructura de columnas para datos por servicio - Grupo 1, 2, 3
 * Verificado contra plantillas xlsx reales:
 *   I=Acueducto, J=Alcantarillado, K=Aseo, L=Energía, M=Gas, N=GLP, O=Otras, P=XM
 *   Total es fórmula en la columna posterior (P, Q o O según grupo) — no se escribe.
 */
export const SERVICE_COLUMNS: Record<string, string> = {
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  energia: 'L',
  gas: 'M',
  glp: 'N',
  otras: 'O',
  xm: 'P',
};

/**
 * Estructura de columnas para R414
 * En R414: I = Acueducto, J = Alcantarillado, K = Aseo, P = Total
 * Importado desde r414/mappings (fuente canónica).
 */
export { R414_SERVICE_COLUMNS };

/**
 * Mapeo de filas ESF para R414 Hoja2
 * Cada entrada mapea una fila del Excel a los prefijos PUC que debe sumar
 */
export interface R414ESFMapping {
  row: number;
  label: string;
  pucPrefixes: string[];
  excludePrefixes?: string[];
}

/**
 * Mapeos ESF R414 importados desde r414/mappings (fuente canónica).
 * Casteados a R414ESFMapping[] para compatibilidad con el tipo local (label requerido).
 */
export const R414_ESF_ACTIVOS: R414ESFMapping[] = _R414_ESF_ACTIVOS as R414ESFMapping[];
export const R414_ESF_PASIVOS: R414ESFMapping[] = _R414_ESF_PASIVOS as R414ESFMapping[];
export const R414_ESF_PATRIMONIO: R414ESFMapping[] = _R414_ESF_PATRIMONIO as R414ESFMapping[];
export const R414_ESF_MAPPINGS: R414ESFMapping[] = _R414_ESF_MAPPINGS as R414ESFMapping[];

// ===============================================
// MAPEOS R414 - ESTADO DE RESULTADOS (Hoja3)
// Columnas: E=Acueducto, F=Alcantarillado, G=Aseo, L=Total
// ===============================================
export const R414_ER_COLUMNS: Record<string, string> = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  total: 'L',
};

export const R414_ER_MAPPINGS: R414ESFMapping[] = [
  // Fila 14: Ingresos de actividades ordinarias
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['43'] },

  // Fila 15: Costo de ventas
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['6', '62', '63'] },

  // Fila 17: Otros ingresos
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['41', '42', '44', '47', '48'], excludePrefixes: ['4802', '4807', '4808', '4810', '4815'] },

  // Fila 18: Gastos de administración, operación y ventas
  { row: 18, label: 'Gastos de administración, operación y ventas', pucPrefixes: ['51', '52'] },

  // Fila 19: Ingresos financieros
  { row: 19, label: 'Ingresos financieros', pucPrefixes: ['4802', '4807', '4808', '4810', '4815'] },

  // Fila 20: Costos financieros
  { row: 20, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },

  // Fila 21: Participación en ganancias/pérdidas de asociadas
  { row: 21, label: 'Participación asociadas', pucPrefixes: ['4815', '5815'] },

  // Fila 22: Otros gastos
  { row: 22, label: 'Otros gastos', pucPrefixes: ['53', '54', '56', '58'], excludePrefixes: ['5802', '5803', '5807', '5815', '5410'] },

  // Fila 25: Gasto/Ingreso impuesto a las ganancias corriente
  { row: 25, label: 'Impuesto a las ganancias corriente', pucPrefixes: ['540101'] },

  // Fila 26: Gasto/Ingreso impuesto a las ganancias diferido
  { row: 26, label: 'Impuesto a las ganancias diferido', pucPrefixes: ['5410'] },
];

export const R414_PPE_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== PPE General (filas 14-21) ======
  { row: 14, label: 'Terrenos', pucPrefixes: ['1605'] },
  { row: 15, label: 'Edificaciones', pucPrefixes: ['1640'] },
  // Fila 16: Terrenos y edificios (AUTOSUMA - NO LLENAR)
  { row: 17, label: 'Maquinaria y equipo', pucPrefixes: ['1655'] },
  { row: 18, label: 'Vehículos / Equipos de transporte', pucPrefixes: ['1675'] },
  { row: 19, label: 'Muebles, enseres y equipo de oficina', pucPrefixes: ['1665'] },
  { row: 20, label: 'Equipos de comunicación y computación', pucPrefixes: ['1670'] },
  { row: 21, label: 'Construcciones en curso', pucPrefixes: ['1615'] },
  // Fila 22: PPE General subtotal (AUTOSUMA - NO LLENAR)
  // ====== Infraestructura de servicios (filas 23-28) ======
  { row: 23, label: 'Vías', pucPrefixes: [] },
  { row: 24, label: 'Ductos', pucPrefixes: ['164502', '164503', '164504'] },
  { row: 25, label: 'Plantas', pucPrefixes: ['164501'] },
  { row: 26, label: 'Redes, líneas y cables', pucPrefixes: ['1650'] },
  { row: 27, label: 'Relleno sanitario', pucPrefixes: [] },
  { row: 28, label: 'Activos para generación de energía', pucPrefixes: ['1646'] },
  // Fila 29: Información especial PPE (AUTOSUMA - NO LLENAR)
  { row: 30, label: 'Otras PPE', pucPrefixes: ['1610', '1660', '1680', '1690'] },
  // Fila 31: PPE Importe en libros bruto (AUTOSUMA - NO LLENAR)
  { row: 32, label: 'Depreciación acumulada PPE', pucPrefixes: ['1685'], useAbsoluteValue: true },
  { row: 33, label: 'Deterioro acumulado PPE', pucPrefixes: ['1695'], useAbsoluteValue: true },
  // Fila 34: PPE Total (AUTOSUMA - NO LLENAR)
];

export const R414_INTANGIBLES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Activos intangibles distintos de la plusvalía (filas 37-43) ======
  { row: 37, label: 'Marcas comerciales', pucPrefixes: ['197002'] },
  { row: 38, label: 'Activos intangibles exploración y evaluación', pucPrefixes: [] },
  { row: 39, label: 'Programas de computador / Software', pucPrefixes: ['197008'] },
  { row: 40, label: 'Licencias y franquicias', pucPrefixes: ['197007', '197004'] },
  { row: 41, label: 'Patentes y derechos', pucPrefixes: ['197003', '197005'] },
  { row: 42, label: 'Activos intangibles en desarrollo', pucPrefixes: ['197010'] },
  { row: 43, label: 'Otros activos intangibles', pucPrefixes: ['197090', '197012'] },
  // Fila 44: Total activos intangibles distintos de plusvalía (AUTOSUMA - NO LLENAR)
  // ====== Plusvalía y ajustes (filas 45-47) ======
  { row: 45, label: 'Plusvalía', pucPrefixes: ['197001'] },
  { row: 46, label: 'Amortización acumulada intangibles', pucPrefixes: ['1975'], useAbsoluteValue: true },
  { row: 47, label: 'Deterioro acumulado intangibles', pucPrefixes: ['1976'], useAbsoluteValue: true },
  // Fila 48: Total activos intangibles y plusvalía (AUTOSUMA = F44+F45-F46-F47 - NO LLENAR)
];

export const R414_EFECTIVO_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Efectivo (filas 51-53) ======
  { row: 51, label: 'Efectivo en caja', pucPrefixes: ['1105'] },
  { row: 52, label: 'Saldos en bancos', pucPrefixes: ['1110', '1120'] },
  // Fila 53: Total efectivo (AUTOSUMA = F51+F52 - NO LLENAR)
  // ====== Equivalentes al efectivo (filas 55-58) ======
  { row: 55, label: 'Depósitos a corto plazo (CDT)', pucPrefixes: ['113301'] },
  { row: 56, label: 'Inversiones a corto plazo', pucPrefixes: ['113305', '113307'] },
  { row: 57, label: 'Otros acuerdos bancarios', pucPrefixes: ['113302', '113303', '113304', '113306', '113390'] },
  // Fila 58: Total equivalentes al efectivo (AUTOSUMA = SUMA(F55:F57) - NO LLENAR)
  // ====== Otro efectivo y total (filas 59-60) ======
  { row: 59, label: 'Otro efectivo y equivalentes', pucPrefixes: ['1132'] },
  // Fila 60: Total efectivo y equivalentes al efectivo (AUTOSUMA = F53+F58+F59 - NO LLENAR)
];

export const R414_PROVISIONES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Provisiones por litigios y demandas (filas 63-65) ======
  { row: 63, label: 'Litigios y demandas no corriente', pucPrefixes: [] },
  { row: 64, label: 'Litigios y demandas corriente', pucPrefixes: ['2701'] },
  // Fila 65: Total de Provisiones por litigios y demandas (AUTOSUMA = F63+F64 - NO LLENAR)
  // ====== Provisiones por contratos onerosos (filas 67-69) ======
  { row: 67, label: 'Contratos onerosos no corriente', pucPrefixes: [] },
  { row: 68, label: 'Contratos onerosos corriente', pucPrefixes: ['279018'] },
  // Fila 69: Total de provisiones por contratos onerosos (AUTOSUMA = F67+F68 - NO LLENAR)
  // ====== Provisiones por desmantelamiento y rehabilitación (filas 71-73) ======
  { row: 71, label: 'Desmantelamiento no corriente', pucPrefixes: [] },
  { row: 72, label: 'Desmantelamiento corriente', pucPrefixes: ['279020'] },
  // Fila 73: Total de provisiones por desmantelamiento (AUTOSUMA = F71+F72 - NO LLENAR)
];

export const R414_OTRAS_PROVISIONES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Otras provisiones (filas 75-77) ======
  { row: 75, label: 'Otras provisiones no corrientes', pucPrefixes: [] },
  { row: 76, label: 'Otras provisiones corrientes', pucPrefixes: ['2707', '2790'], excludePrefixes: ['279018', '279020'] },
  // Fila 77: Total otras provisiones (AUTOSUMA = F75+F76 - NO LLENAR)
];

export const R414_BENEFICIOS_EMPLEADOS_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Beneficios a Empleados (filas 79-83) ======
  { row: 79, label: 'Beneficios a empleados corto plazo', pucPrefixes: ['2511'] },
  { row: 80, label: 'Beneficios a empleados largo plazo', pucPrefixes: ['2512'] },
  { row: 81, label: 'Beneficios terminación vínculo', pucPrefixes: ['2513'] },
  { row: 82, label: 'Beneficios posempleo', pucPrefixes: ['2514', '2515'] },
  // Fila 83: Total Beneficios a empleados (AUTOSUMA = SUMA(F79:F82) - NO LLENAR)
];
