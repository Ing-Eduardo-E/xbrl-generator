/**
 * Servicio para cargar y personalizar plantillas XBRL oficiales de la SSPD.
 * 
 * Este servicio usa las plantillas oficiales (.xbrlt, .xml, .xlsx) proporcionadas
 * por la SSPD para cada grupo de taxonomía (Grupo1, Grupo2, Grupo3, R414).
 * 
 * Las plantillas oficiales son la fuente de verdad para la estructura XBRL
 * y garantizan compatibilidad con XBRL Express.
 * 
 * HOJAS AUTOMATIZADAS:
 * - [110000] Hoja1: Información general (metadatos)
 * - [210000] Hoja2: Estado de Situación Financiera
 * - [310000] Hoja3: Estado de Resultados
 * - [900017a-c,g] FC01: Gastos por servicio
 * - [900019] FC02: Complementario de ingresos
 * - [900021-23] FC03: CXC por servicio (por estrato)
 * - [900028b] FC05b: Pasivos por edades de vencimiento
 */

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { NiifGroup, TaxonomyYear } from './taxonomyConfig';
import { 
  ESF_CONCEPTS, 
  getTaxonomyConfig, 
  findESFConceptByPUC,
  type TaxonomyConfig 
} from './taxonomyConfig';

/** Rutas de plantillas por grupo NIIF */
const TEMPLATE_PATHS: Record<NiifGroup, {
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
    xbrlt: '',
    xml: '',
    xlsx: '',
    xbrl: '',
    basePrefix: 'IFE_Individual',
    outputPrefix: 'IFE_Individual',
  },
};

/**
 * Mapeo de códigos de hojas XBRL a nombres de hojas Excel por grupo de taxonomía
 * Basado en el índice de contenidos de cada plantilla oficial
 */
const SHEET_MAPPING: Record<NiifGroup, Record<string, string>> = {
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
  ife: {},
};

/**
 * Estructura de columnas para datos por servicio - Grupo 1, 2, 3
 * Columna I = Total, J = Acueducto, K = Alcantarillado, L = Aseo, etc.
 */
const SERVICE_COLUMNS: Record<string, string> = {
  total: 'I',
  acueducto: 'J',
  alcantarillado: 'K',
  aseo: 'L',
  energia: 'M',
  gas: 'N',
  glp: 'O',
  otras: 'P',
  other: 'Q',
};

/**
 * Estructura de columnas para R414
 * En R414: I = Acueducto, J = Alcantarillado, K = Aseo, P = Total
 */
const R414_SERVICE_COLUMNS: Record<string, string> = {
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  energia: 'L',
  gas: 'M',
  glp: 'N',
  otras: 'O',
  total: 'P',
};

/**
 * Mapeo de filas ESF para R414 Hoja2
 * Cada entrada mapea una fila del Excel a los prefijos PUC que debe sumar
 */
interface R414ESFMapping {
  row: number;
  label: string;
  pucPrefixes: string[];
  excludePrefixes?: string[];
}

const R414_ESF_ACTIVOS: R414ESFMapping[] = [
  // =====================================================
  // ACTIVOS CORRIENTES (filas 14-32)
  // Basado en PUC Resolución 414 CGN para servicios públicos
  // =====================================================
  
  // Fila 15: Efectivo y equivalentes al efectivo
  // PUC R414: 11 - Efectivo y equivalentes al efectivo
  // Incluye: 1105 Caja, 1110 Depósitos instituciones financieras, 1120 Fondos en tránsito, 1133 Equivalentes
  // EXCLUIR: 1132 (Efectivo de uso restringido) que va en fila 16
  { row: 15, label: 'Efectivo y equivalentes al efectivo', pucPrefixes: ['11'], excludePrefixes: ['1132'] },
  
  // Fila 16: Efectivo de uso restringido corriente
  // PUC R414: 1132 - Efectivo de uso restringido
  { row: 16, label: 'Efectivo de uso restringido corriente', pucPrefixes: ['1132'] },
  
  // Fila 19: CXC por prestación de servicios públicos (SIN subsidios ni aprovechamiento)
  // PUC R414: 1318 - Prestación de servicios públicos
  // 131801 Energía, 131802 Acueducto, 131803 Alcantarillado, 131804 Aseo, 131805 Gas, 131806 Telecom
  // EXCLUIR: 131807-131812 (Subsidios)
  { row: 19, label: 'CXC servicios públicos (sin subsidios)', pucPrefixes: ['131801', '131802', '131803', '131804', '131805', '131806'] },
  
  // Fila 20: CXC por subsidios corrientes
  // PUC R414: 131807-131812 - Subsidios por servicio
  { row: 20, label: 'CXC subsidios corrientes', pucPrefixes: ['131807', '131808', '131809', '131810', '131811', '131812'] },
  
  // Fila 22: CXC por actividad de aprovechamiento corrientes
  // PUC R414: Parte de otras cuentas por cobrar relacionadas con reciclaje/aprovechamiento
  { row: 22, label: 'CXC aprovechamiento corrientes', pucPrefixes: ['138424'] },
  
  // Fila 24: CXC por venta de bienes corrientes
  // PUC R414: 1316 - Venta de bienes
  { row: 24, label: 'CXC venta de bienes corrientes', pucPrefixes: ['1316'] },
  
  // Fila 25: CXC a partes relacionadas corrientes
  // PUC R414: Parte de 1384 - Otras CXC (vinculados económicos)
  { row: 25, label: 'CXC partes relacionadas corrientes', pucPrefixes: ['138401', '138414'] },
  
  // Fila 26: Otras cuentas por cobrar corrientes
  // PUC R414: Todo el resto del grupo 13 que no está en las filas anteriores
  // 1311 Contribuciones/tasas, 1317 Prestación servicios, 1319 Servicios salud, 1324 Subvenciones, 1384 Otras CXC
  // EXCLUIR: 1386 Deterioro (CR), cuentas ya mapeadas arriba
  { row: 26, label: 'Otras CXC corrientes', pucPrefixes: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'], excludePrefixes: ['138401', '138414', '138424'] },
  
  // Fila 27: Deterioro acumulado de CXC (resta)
  // PUC R414: 1386 - Deterioro acumulado de cuentas por cobrar (CR)
  // 1388 - Deterioro acumulado de CXC a costo amortizado (CR)
  { row: 27, label: 'Deterioro CXC corrientes', pucPrefixes: ['1386', '1388'] },
  
  // Fila 28: Inventarios corrientes
  // PUC R414: 15 - Inventarios
  { row: 28, label: 'Inventarios corrientes', pucPrefixes: ['15'], excludePrefixes: ['1580'] },
  
  // Fila 29: Deterioro inventarios (resta) - incluido en fila 28 como parte del grupo 15
  
  // Fila 30: Otros activos financieros corrientes
  // PUC R414: 12 - Inversiones e instrumentos derivados
  // EXCLUIR: 1280 Deterioro (CR)
  { row: 30, label: 'Otros activos financieros corrientes', pucPrefixes: ['12'], excludePrefixes: ['1280'] },
  
  // Fila 31: Otros activos no financieros corrientes
  // PUC R414: 19 - Otros activos (bienes de arte, etc.) - parte corriente
  { row: 31, label: 'Otros activos no financieros corrientes', pucPrefixes: ['19'] },
  
  // =====================================================
  // ACTIVOS NO CORRIENTES (filas 33-63)
  // =====================================================
  
  // Fila 34: Propiedades, planta y equipo (NETO)
  // PUC R414: 16 - Propiedades, planta y equipo
  // Incluye depreciación acumulada y deterioro como parte del grupo
  { row: 34, label: 'Propiedades, planta y equipo', pucPrefixes: ['16'] },
  
  // Fila 35: Efectivo de uso restringido no corriente
  // No común en el PUC R414, se usaría parte de inversiones LP restringidas
  { row: 35, label: 'Efectivo restringido no corriente', pucPrefixes: ['113210'] },
  
  // Fila 37: Inversiones en asociadas (método participación)
  // PUC R414: 1230 - Inversiones en asociadas contabilizadas por método de participación patrimonial
  { row: 37, label: 'Inversiones en asociadas', pucPrefixes: ['1230'] },
  
  // Fila 38: Inversiones en negocios conjuntos
  // PUC R414: 1233 - Inversiones en negocios conjuntos contabilizadas por método participación
  { row: 38, label: 'Inversiones en negocios conjuntos', pucPrefixes: ['1233'] },
  
  // Fila 39: Inversiones en controladas (subsidiarias)
  // PUC R414: 1227 - Inversiones en controladas contabilizadas por método participación
  { row: 39, label: 'Inversiones en controladas', pucPrefixes: ['1227'] },
  
  // Fila 40: Inversiones en entidades en liquidación
  // PUC R414: 1216 - Inversiones en entidades en liquidación
  { row: 40, label: 'Inversiones entidades en liquidación', pucPrefixes: ['1216'] },
  
  // Fila 53: Activos por impuestos diferidos
  // PUC R414: No hay cuenta específica en clase 1, se registra en cuentas de orden o ajustes
  // Generalmente vacío para estas entidades o en grupo 19
  { row: 53, label: 'Activos por impuestos diferidos', pucPrefixes: ['1905'] },
  
  // Fila 55: Planes de activos (beneficios empleados LP)
  // PUC R414: No es común, generalmente no aplica
  { row: 55, label: 'Planes de activos', pucPrefixes: ['1920'] },
  
  // Fila 57: Propiedad de inversión
  // PUC R414: 1975 - Bienes en proceso de adquisición, 197505 Terrenos, 197510 Edificaciones
  { row: 57, label: 'Propiedad de inversión', pucPrefixes: ['1975'] },
  
  // Fila 59: Activos intangibles
  // PUC R414: 17 - Bienes de uso público e históricos (para entidades públicas) o
  // Intangibles se registran diferente en sector público
  { row: 59, label: 'Activos intangibles', pucPrefixes: ['17'] },
  
  // Fila 61: Otros activos no corrientes
  // PUC: 19 - Otros activos (bienes de arte, cultura, etc.)
  { row: 61, label: 'Otros activos no corrientes', pucPrefixes: ['19'] },
];

const R414_ESF_PASIVOS: R414ESFMapping[] = [
  // =====================================================
  // PASIVOS CORRIENTES (filas 67-88)
  // PUC Resolución 414 CGN para empresas de servicios públicos
  // =====================================================
  
  // Fila 69: Provisiones corrientes por beneficios a empleados
  // PUC R414: 25 - Beneficios a los empleados
  // 2511 - Beneficios a empleados a corto plazo (nómina, cesantías, vacaciones, etc.)
  { row: 69, label: 'Provisiones beneficios empleados corrientes', pucPrefixes: ['2511'] },
  
  // Fila 70: Otras provisiones corrientes
  // PUC R414: 27 - Provisiones
  // 2701 - Litigios y demandas, 2707 - Garantías, 2790 - Provisiones diversas
  { row: 70, label: 'Otras provisiones corrientes', pucPrefixes: ['27'] },
  
  // Fila 73: Cuentas por pagar por adquisición de servicios
  // PUC R414: 2401 - Adquisición de bienes y servicios nacionales (parte servicios)
  { row: 73, label: 'Cuentas por pagar servicios', pucPrefixes: ['240101'] },
  
  // Fila 74: Cuentas por pagar por adquisición de bienes
  // PUC R414: 2401 - Adquisición de bienes y servicios nacionales (parte bienes)
  // 2406 - Adquisición de bienes y servicios del exterior
  { row: 74, label: 'Cuentas por pagar proveedores', pucPrefixes: ['2401', '2406'], excludePrefixes: ['240101'] },
  
  // Fila 75: Cuentas por pagar a partes relacionadas corrientes
  // PUC R414: Parte de 2490 - Otras cuentas por pagar (vinculados, dividendos)
  { row: 75, label: 'Cuentas por pagar partes relacionadas', pucPrefixes: ['249056', '249057'] },
  
  // Fila 76: Otras cuentas comerciales por pagar corrientes
  // PUC R414: 2490 - Otras cuentas por pagar (resto)
  // 2424 - Descuentos de nómina, 2407 - Recursos a favor de terceros
  { row: 76, label: 'Otras cuentas por pagar', pucPrefixes: ['2424', '2407', '2490'], excludePrefixes: ['249056', '249057'] },
  
  // Fila 78: Emisión de títulos de deuda corrientes
  // PUC R414: 22 - Emisión y colocación de títulos de deuda
  // 2222 - Financiamiento interno CP, 2224 - Financiamiento externo CP
  { row: 78, label: 'Títulos de deuda corrientes', pucPrefixes: ['2222', '2224'] },
  
  // Fila 79: Préstamos por pagar corrientes
  // PUC R414: 23 - Préstamos por pagar
  // 2313 - Financiamiento interno CP, 2316 - Financiamiento externo CP
  { row: 79, label: 'Préstamos por pagar corrientes', pucPrefixes: ['2313', '2316'] },
  
  // Fila 80: Pasivo por impuesto a las ganancias corriente
  // PUC R414: 244001 - Impuesto sobre la renta y complementarios
  { row: 80, label: 'Impuesto ganancias por pagar', pucPrefixes: ['244001'] },
  
  // Fila 82: Ingresos recibidos por anticipado corrientes
  // PUC R414: 2910 - Ingresos recibidos por anticipado
  { row: 82, label: 'Ingresos diferidos corrientes', pucPrefixes: ['2910'] },
  
  // Fila 83: Pasivos por impuestos diferidos corrientes
  // PUC R414: 2918 - Pasivos por impuestos diferidos
  { row: 83, label: 'Pasivos impuestos diferidos corrientes', pucPrefixes: ['2918'] },
  
  // Fila 86: Otros pasivos financieros corrientes
  // PUC R414: 21 - Operaciones de banca central (si aplica)
  { row: 86, label: 'Otros pasivos financieros corrientes', pucPrefixes: ['21'] },
  
  // Fila 87: Otros pasivos no financieros corrientes
  // PUC R414: 2436 - Retención en la fuente e impuesto de timbre
  // 2440 - Impuestos, contribuciones y tasas (excepto renta)
  // 2445 - IVA, 29 - Otros pasivos
  { row: 87, label: 'Otros pasivos no financieros corrientes', pucPrefixes: ['2436', '2440', '2445', '29'], excludePrefixes: ['244001'] },
  
  // =====================================================
  // PASIVOS NO CORRIENTES (filas 89-110)
  // =====================================================
  
  // Fila 91: Provisiones no corrientes por beneficios a empleados
  // PUC R414: 2512 - Beneficios a empleados a largo plazo
  // 2513 - Beneficios por terminación, 2514 - Pensiones, 2515 - Otros posempleo
  { row: 91, label: 'Provisiones beneficios empleados LP', pucPrefixes: ['2512', '2513', '2514', '2515'] },
  
  // Fila 92: Otras provisiones no corrientes
  // PUC R414: Provisiones LP (generalmente se clasifican todas en 27)
  { row: 92, label: 'Otras provisiones no corrientes', pucPrefixes: ['2790'] },
  
  // Fila 95: Cuentas por pagar por adquisición de bienes no corrientes
  // PUC R414: 2495 - Cuentas por pagar a costo amortizado (LP)
  { row: 95, label: 'Cuentas por pagar bienes LP', pucPrefixes: ['2495'] },
  
  // Fila 100: Emisión de títulos de deuda no corrientes
  // PUC R414: 2223 - Financiamiento interno LP, 2225 - Financiamiento externo LP
  { row: 100, label: 'Títulos de deuda LP', pucPrefixes: ['2223', '2225'] },
  
  // Fila 101: Préstamos por pagar no corrientes
  // PUC R414: 2314 - Financiamiento interno LP, 2317 - Financiamiento externo LP
  { row: 101, label: 'Préstamos por pagar LP', pucPrefixes: ['2314', '2317'] },
  
  // Fila 103: Pasivos por impuestos diferidos no corrientes
  // PUC R414: 2918 - Pasivos por impuestos diferidos (si es LP)
  { row: 103, label: 'Pasivos por impuestos diferidos LP', pucPrefixes: ['2918'] },
  
  // Fila 105: Ingresos recibidos por anticipado no corrientes
  // PUC R414: 2990 - Otros pasivos diferidos
  { row: 105, label: 'Ingresos diferidos LP', pucPrefixes: ['2990'] },
  
  // Fila 108: Otros pasivos financieros no corrientes
  // PUC R414: 26 - Operaciones con instrumentos derivados
  { row: 108, label: 'Otros pasivos financieros LP', pucPrefixes: ['26'] },
];

const R414_ESF_PATRIMONIO: R414ESFMapping[] = [
  // =====================================================
  // PATRIMONIO (filas 112-130)
  // PUC Resolución 414 CGN - Clase 32: Patrimonio de las empresas
  // =====================================================
  
  // Fila 113: Aportes sociales (cooperativas, fondos)
  // PUC R414: 3203 - Aportes sociales
  { row: 113, label: 'Aportes sociales', pucPrefixes: ['3203'] },
  
  // Fila 114: Capital suscrito y pagado
  // PUC R414: 3204 - Capital suscrito y pagado
  { row: 114, label: 'Capital suscrito y pagado', pucPrefixes: ['3204'] },
  
  // Fila 115: Capital fiscal (entidades del estado)
  // PUC R414: 3208 - Capital fiscal
  { row: 115, label: 'Capital fiscal', pucPrefixes: ['3208'] },
  
  // Fila 116: Prima en colocación de acciones
  // PUC R414: 3210 - Prima en colocación de acciones, cuotas o partes de interés social
  { row: 116, label: 'Prima en colocación', pucPrefixes: ['3210'] },
  
  // Fila 117: Reserva legal
  // PUC R414: 321501 - Reservas de Ley
  { row: 117, label: 'Reserva legal', pucPrefixes: ['321501'] },
  
  // Fila 118: Otras reservas
  // PUC R414: 3215 - Reservas (estatutarias, ocasionales, para readquisición)
  { row: 118, label: 'Otras reservas', pucPrefixes: ['3215'], excludePrefixes: ['321501'] },
  
  // Fila 119: Dividendos decretados en especie
  // PUC R414: 3220 - Dividendos y participaciones decretados en especie
  { row: 119, label: 'Dividendos decretados especie', pucPrefixes: ['3220'] },
  
  // Fila 120: Ganancias acumuladas (resultados)
  // PUC R414: 3225 - Resultados de ejercicios anteriores
  // 3230 - Resultado del ejercicio
  { row: 120, label: 'Ganancias acumuladas', pucPrefixes: ['3225', '3230'] },
  
  // Fila 121: Impactos por transición al nuevo marco NIIF
  // PUC R414: No hay cuenta específica, generalmente en ORI
  { row: 121, label: 'Impactos transición NIIF', pucPrefixes: ['3290'] },
  
  // Fila 122-130: Otro Resultado Integral (ORI)
  // PUC R414: 3271-3281 - Ganancias o pérdidas en ORI
  
  // Fila 123: ORI Inversiones valor razonable
  // PUC R414: 3271 - Ganancias o pérdidas en inversiones de administración de liquidez
  { row: 123, label: 'ORI Inversiones', pucPrefixes: ['3271'] },
  
  // Fila 124: ORI Coberturas de flujos de efectivo
  // PUC R414: 3272 - Ganancias o pérdidas por coberturas de flujos de efectivo
  { row: 124, label: 'ORI Coberturas flujos efectivo', pucPrefixes: ['3272'] },
  
  // Fila 126: ORI Método de participación
  // PUC R414: 3274 - G/P por método participación en controladas
  // 3275 - G/P por método participación en asociadas
  // 3276 - G/P por método participación en negocios conjuntos
  { row: 126, label: 'ORI Método participación', pucPrefixes: ['3274', '3275', '3276'] },
  
  // Fila 127: ORI Cobertura inversión neta en extranjero
  // PUC R414: 3273 - Ganancias o pérdidas por cobertura de inversión neta en negocio extranjero
  { row: 127, label: 'ORI Cobertura inversión extranjero', pucPrefixes: ['3273'] },
  
  // Fila 129: ORI Beneficios a empleados (actuariales)
  // PUC R414: 3280 - Ganancias o pérdidas por planes de beneficios a los empleados
  { row: 129, label: 'ORI Beneficios empleados', pucPrefixes: ['3280'] },
  
  // Fila 130: ORI Conversión de estados financieros
  // PUC R414: 3281 - Ganancias o pérdidas por conversión de estados financieros
  { row: 130, label: 'ORI Conversión estados financieros', pucPrefixes: ['3281'] },
];

// Combinar todos los mapeos R414
const R414_ESF_MAPPINGS: R414ESFMapping[] = [
  ...R414_ESF_ACTIVOS,
  ...R414_ESF_PASIVOS,
  ...R414_ESF_PATRIMONIO,
];

// ===============================================
// MAPEOS R414 - ESTADO DE RESULTADOS (Hoja3)
// Columnas: E=Acueducto, F=Alcantarillado, G=Aseo, L=Total
// ===============================================
const R414_ER_COLUMNS: Record<string, string> = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  total: 'L',
};

/**
 * Mapeos del Estado de Resultados para R414
 * Basado en la estructura de Hoja3 de R414Ind_ID20037_2024-12-31.xlsx
 * 
 * PUC Resolución 414 CGN para empresas de servicios públicos:
 * - Clase 4: INGRESOS
 *   - 41: Ingresos fiscales
 *   - 42: Venta de bienes
 *   - 43: Venta de servicios (4321 acueducto, 4322 alcantarillado, 4323 aseo)
 *   - 44: Transferencias y subvenciones
 *   - 47: Operaciones interinstitucionales
 *   - 48: Otros ingresos
 * - Clase 5: GASTOS
 *   - 51: De administración y operación
 *   - 52: De ventas
 *   - 53: Deterioro, depreciaciones, amortizaciones y provisiones
 *   - 54: Transferencias y subvenciones
 *   - 56: De actividades y/o servicios especializados
 *   - 58: Otros gastos
 * - Clase 6: COSTOS DE VENTAS
 *   - 62: Costo de ventas de bienes
 *   - 63: Costo de ventas de servicios
 */
const R414_ER_MAPPINGS: R414ESFMapping[] = [
  // Fila 14: Ingresos de actividades ordinarias
  // PUC R414: 43 - Venta de servicios (principal para servicios públicos)
  // Incluye: 4321 Acueducto, 4322 Alcantarillado, 4323 Aseo, 4315 Energía, etc.
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['43'] },
  
  // Fila 15: Costo de ventas
  // PUC R414: 6 - Costos de ventas
  // 62 - Costo de ventas de bienes, 63 - Costo de ventas de servicios
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['6', '62', '63'] },
  
  // Fila 17: Otros ingresos
  // PUC R414: 41 - Ingresos fiscales (contribuciones, tasas)
  // 42 - Venta de bienes, 44 - Transferencias, 47 - Operaciones interinstitucionales
  // 48 - Otros ingresos (excepto ingresos financieros que van en fila 19)
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['41', '42', '44', '47', '48'], excludePrefixes: ['4802', '4807', '4808', '4810', '4815'] },
  
  // Fila 18: Gastos de administración, operación y ventas
  // PUC R414: 51 - De administración y operación, 52 - De ventas
  { row: 18, label: 'Gastos de administración, operación y ventas', pucPrefixes: ['51', '52'] },
  
  // Fila 19: Ingresos financieros
  // PUC R414: Subcuentas específicas de 48 - Otros ingresos
  // 4802 - Intereses, 4807 - Rendimientos, 4808 - Utilidad diferencia cambio, 4810 - Dividendos
  { row: 19, label: 'Ingresos financieros', pucPrefixes: ['4802', '4807', '4808', '4810', '4815'] },
  
  // Fila 20: Costos financieros
  // PUC R414: 58 - Otros gastos (gastos financieros, diferencia cambio)
  // 5802 - Intereses, 5803 - Comisiones, 5807 - Diferencia cambio
  { row: 20, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },
  
  // Fila 21: Participación en ganancias/pérdidas de asociadas
  // PUC R414: 4815 - Método de participación patrimonial (si es ganancia)
  // o 5815 (si es pérdida)
  { row: 21, label: 'Participación asociadas', pucPrefixes: ['4815', '5815'] },
  
  // Fila 22: Otros gastos
  // PUC R414: 53 - Deterioro, depreciaciones, amortizaciones y provisiones
  // 54 - Transferencias y subvenciones, 56 - Servicios especializados
  // 58 - Otros gastos (excepto financieros)
  { row: 22, label: 'Otros gastos', pucPrefixes: ['53', '54', '56', '58'], excludePrefixes: ['5802', '5803', '5807', '5815', '5410'] },
  
  // Fila 25: Gasto/Ingreso impuesto a las ganancias corriente
  // PUC R414: 5410 - Impuesto al patrimonio / impuesto sobre la renta
  // En CGN se usa la cuenta 5410 para impuesto diferido, la corriente va en 54
  { row: 25, label: 'Impuesto a las ganancias corriente', pucPrefixes: ['540101'] },
  
  // Fila 26: Gasto/Ingreso impuesto a las ganancias diferido
  // PUC R414: 5410 - Gasto impuesto de renta diferido
  { row: 26, label: 'Impuesto a las ganancias diferido', pucPrefixes: ['5410'] },
];

/**
 * Mapeo de filas de PPE (Propiedad, Planta y Equipo) para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Filas de autosuma (dejar vacías): 16, 22, 29, 31, 34
 * Filas 32-33: Depreciación y Deterioro deben ser valores POSITIVOS (Math.abs)
 */
const R414_PPE_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== PPE General (filas 14-21) ======
  // Fila 14: Terrenos en términos brutos
  // PUC R414: 1605 - Terrenos
  { row: 14, label: 'Terrenos', pucPrefixes: ['1605'] },
  
  // Fila 15: Edificios en términos brutos
  // PUC R414: 1640 - Edificaciones
  { row: 15, label: 'Edificaciones', pucPrefixes: ['1640'] },
  
  // Fila 16: Terrenos y edificios (AUTOSUMA - NO LLENAR)
  
  // Fila 17: Maquinaria en términos brutos
  // PUC R414: 1655 - Maquinaria y equipo
  { row: 17, label: 'Maquinaria y equipo', pucPrefixes: ['1655'] },
  
  // Fila 18: Vehículos en términos brutos
  // PUC R414: 1675 - Equipos de transporte, tracción y elevación
  { row: 18, label: 'Vehículos / Equipos de transporte', pucPrefixes: ['1675'] },
  
  // Fila 19: Enseres y accesorios en términos brutos
  // PUC R414: 1665 - Muebles, enseres y equipo de oficina
  { row: 19, label: 'Muebles, enseres y equipo de oficina', pucPrefixes: ['1665'] },
  
  // Fila 20: Equipo de oficina en términos brutos
  // PUC R414: 1670 - Equipos de comunicación y computación
  { row: 20, label: 'Equipos de comunicación y computación', pucPrefixes: ['1670'] },
  
  // Fila 21: Construcciones en proceso en términos brutos
  // PUC R414: 1615 - Construcciones en curso
  { row: 21, label: 'Construcciones en curso', pucPrefixes: ['1615'] },
  
  // Fila 22: PPE General subtotal (AUTOSUMA - NO LLENAR)
  
  // ====== Infraestructura de servicios (filas 23-28) ======
  // Fila 23: Vías en términos brutos
  // PUC R414: No hay cuenta específica de vías - se llena con 0 si la sección tiene valores
  { row: 23, label: 'Vías', pucPrefixes: [] },
  
  // Fila 24: Ductos en términos brutos
  // PUC R414: 1645 - Plantas, ductos y túneles (parcial)
  { row: 24, label: 'Ductos', pucPrefixes: ['164502', '164503', '164504'] },
  
  // Fila 25: Plantas en términos brutos
  // PUC R414: 1645 - Plantas (parcial)
  { row: 25, label: 'Plantas', pucPrefixes: ['164501'] },
  
  // Fila 26: Redes y cables en términos brutos
  // PUC R414: 1650 - Redes, líneas y cables
  { row: 26, label: 'Redes, líneas y cables', pucPrefixes: ['1650'] },
  
  // Fila 27: Relleno sanitario en términos brutos
  // PUC R414: No hay cuenta específica - se llena con 0 si la sección tiene valores
  { row: 27, label: 'Relleno sanitario', pucPrefixes: [] },
  
  // Fila 28: Activos para generación de energía en términos brutos
  // PUC R414: 1646 - Plantas de generación de energía
  { row: 28, label: 'Activos para generación de energía', pucPrefixes: ['1646'] },
  
  // Fila 29: Información especial PPE (AUTOSUMA - NO LLENAR)
  
  // Fila 30: Otras propiedades, planta y equipo en términos brutos
  // PUC R414: Otras cuentas del grupo 16 no mapeadas arriba
  // 1610 - Semovientes, 1660 - Equipos varios, 1680 - Bienes de arte y cultura
  { row: 30, label: 'Otras PPE', pucPrefixes: ['1610', '1660', '1680', '1690'] },
  
  // Fila 31: PPE Importe en libros bruto (AUTOSUMA - NO LLENAR)
  
  // Fila 32: Depreciación acumulada PPE (VALOR POSITIVO)
  // PUC R414: 1685 - Depreciación acumulada (CR) - almacenado como negativo
  { row: 32, label: 'Depreciación acumulada PPE', pucPrefixes: ['1685'], useAbsoluteValue: true },
  
  // Fila 33: Deterioro de valor acumulado PPE (VALOR POSITIVO)
  // PUC R414: 1695 - Deterioro acumulado de propiedades, planta y equipo (CR)
  { row: 33, label: 'Deterioro acumulado PPE', pucPrefixes: ['1695'], useAbsoluteValue: true },
  
  // Fila 34: PPE Total (AUTOSUMA - NO LLENAR)
];

/**
 * Mapeo de filas de Activos Intangibles y Plusvalía para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Filas de autosuma (dejar vacías): 44, 48
 * Filas 46-47: Amortización y Deterioro deben ser valores POSITIVOS (Math.abs)
 * Fórmula F48 = F44 + F45 - F46 - F47
 */
const R414_INTANGIBLES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Activos intangibles distintos de la plusvalía (filas 37-43) ======
  
  // Fila 37: Marcas comerciales en términos brutos
  // PUC R414: 197002 - Marcas
  { row: 37, label: 'Marcas comerciales', pucPrefixes: ['197002'] },
  
  // Fila 38: Activos intangibles para exploración y evaluación en términos brutos
  // PUC R414: No hay cuenta específica - se llena con 0 si la sección tiene valores
  { row: 38, label: 'Activos intangibles exploración y evaluación', pucPrefixes: [] },
  
  // Fila 39: Programas de computador en términos brutos
  // PUC R414: 197008 - Softwares
  { row: 39, label: 'Programas de computador / Software', pucPrefixes: ['197008'] },
  
  // Fila 40: Licencias y franquicias en términos brutos
  // PUC R414: 197007 - Licencias, 197004 - Concesiones y franquicias
  { row: 40, label: 'Licencias y franquicias', pucPrefixes: ['197007', '197004'] },
  
  // Fila 41: Derechos de propiedad intelectual, patentes y otros derechos
  // PUC R414: 197003 - Patentes, 197005 - Derechos
  { row: 41, label: 'Patentes y derechos', pucPrefixes: ['197003', '197005'] },
  
  // Fila 42: Activos intangibles en desarrollo en términos brutos
  // PUC R414: 197010 - Activos intangibles en fase de desarrollo
  { row: 42, label: 'Activos intangibles en desarrollo', pucPrefixes: ['197010'] },
  
  // Fila 43: Otros activos intangibles en términos brutos
  // PUC R414: 197090 - Otros activos intangibles, 197012 - Activos en concesión
  { row: 43, label: 'Otros activos intangibles', pucPrefixes: ['197090', '197012'] },
  
  // Fila 44: Total activos intangibles distintos de plusvalía (AUTOSUMA - NO LLENAR)
  
  // ====== Plusvalía y ajustes (filas 45-47) ======
  
  // Fila 45: Plusvalía en términos brutos
  // PUC R414: 197001 - Plusvalía
  { row: 45, label: 'Plusvalía', pucPrefixes: ['197001'] },
  
  // Fila 46: Amortización acumulada activos intangibles y plusvalía (VALOR POSITIVO)
  // PUC R414: 1975 - Amortización acumulada de activos intangibles (CR)
  { row: 46, label: 'Amortización acumulada intangibles', pucPrefixes: ['1975'], useAbsoluteValue: true },
  
  // Fila 47: Deterioro de valor acumulado activos intangibles y plusvalía (VALOR POSITIVO)
  // PUC R414: 1976 - Deterioro acumulado de activos intangibles (CR)
  { row: 47, label: 'Deterioro acumulado intangibles', pucPrefixes: ['1976'], useAbsoluteValue: true },
  
  // Fila 48: Total activos intangibles y plusvalía (AUTOSUMA = F44+F45-F46-F47 - NO LLENAR)
];

/**
 * Mapeo de filas de Efectivo y Equivalentes al Efectivo para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Filas de autosuma (dejar vacías): 53, 58, 60
 * Fórmula F53 = F51 + F52
 * Fórmula F58 = SUMA(F55:F57)
 * Fórmula F60 = F53 + F58 + F59
 */
const R414_EFECTIVO_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Efectivo (filas 51-53) ======
  
  // Fila 51: Efectivo en caja
  // PUC R414: 1105 - Caja
  { row: 51, label: 'Efectivo en caja', pucPrefixes: ['1105'] },
  
  // Fila 52: Saldos en bancos
  // PUC R414: 1110 - Depósitos en instituciones financieras, 1120 - Fondos en tránsito
  { row: 52, label: 'Saldos en bancos', pucPrefixes: ['1110', '1120'] },
  
  // Fila 53: Total efectivo (AUTOSUMA = F51+F52 - NO LLENAR)
  
  // ====== Equivalentes al efectivo (filas 55-58) ======
  
  // Fila 55: Depósitos a corto plazo, clasificados como equivalentes al efectivo
  // PUC R414: 113301 - Certificados de depósito de ahorro a término (CDT)
  { row: 55, label: 'Depósitos a corto plazo (CDT)', pucPrefixes: ['113301'] },
  
  // Fila 56: Inversiones a corto plazo, clasificadas como equivalentes al efectivo
  // PUC R414: 113305 - Compromisos reventa inversiones, 113307 - Bonos y títulos
  { row: 56, label: 'Inversiones a corto plazo', pucPrefixes: ['113305', '113307'] },
  
  // Fila 57: Otros acuerdos bancarios, clasificados como equivalentes al efectivo
  // PUC R414: 113302 - Fondos vendidos, 113303 - Overnight, 113304, 113306, 113390
  { row: 57, label: 'Otros acuerdos bancarios', pucPrefixes: ['113302', '113303', '113304', '113306', '113390'] },
  
  // Fila 58: Total equivalentes al efectivo (AUTOSUMA = SUMA(F55:F57) - NO LLENAR)
  
  // ====== Otro efectivo y total (filas 59-60) ======
  
  // Fila 59: Otro efectivo y equivalentes al efectivo
  // PUC R414: 1132 - Efectivo de uso restringido
  { row: 59, label: 'Otro efectivo y equivalentes', pucPrefixes: ['1132'] },
  
  // Fila 60: Total efectivo y equivalentes al efectivo (AUTOSUMA = F53+F58+F59 - NO LLENAR)
];

/**
 * Mapeo de filas de Clases de Otras Provisiones para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Filas de autosuma (dejar vacías): 65, 69, 73
 * Fórmula F65 = F63 + F64
 * Fórmula F69 = F67 + F68
 * Fórmula F73 = F71 + F72
 * 
 * Nota: En R414 las provisiones no están subdivididas por corriente/no corriente
 * en cuentas separadas. Se mapea el total a la fila "corriente" por defecto.
 */
const R414_PROVISIONES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Provisiones por litigios y demandas (filas 63-65) ======
  
  // Fila 63: Provisiones por litigios y demandas no corriente
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  { row: 63, label: 'Litigios y demandas no corriente', pucPrefixes: [] },
  
  // Fila 64: Provisiones por litigios y demandas corriente
  // PUC R414: 2701 - Litigios y demandas (total)
  { row: 64, label: 'Litigios y demandas corriente', pucPrefixes: ['2701'] },
  
  // Fila 65: Total de Provisiones por litigios y demandas (AUTOSUMA = F63+F64 - NO LLENAR)
  
  // ====== Provisiones por contratos onerosos (filas 67-69) ======
  
  // Fila 67: Provisión por contratos onerosos no corriente
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  { row: 67, label: 'Contratos onerosos no corriente', pucPrefixes: [] },
  
  // Fila 68: Provisión corriente por contratos onerosos
  // PUC R414: 279018 - Contratos onerosos
  { row: 68, label: 'Contratos onerosos corriente', pucPrefixes: ['279018'] },
  
  // Fila 69: Total de provisiones por contratos onerosos (AUTOSUMA = F67+F68 - NO LLENAR)
  
  // ====== Provisiones por desmantelamiento y rehabilitación (filas 71-73) ======
  
  // Fila 71: Provisión no corriente para costos de desmantelamiento
  // PUC R414: No hay subdivisión - se llena con 0 si la sección tiene valores
  { row: 71, label: 'Desmantelamiento no corriente', pucPrefixes: [] },
  
  // Fila 72: Provisión corriente para costos de desmantelamiento
  // PUC R414: 279020 - Desmantelamientos
  { row: 72, label: 'Desmantelamiento corriente', pucPrefixes: ['279020'] },
  
  // Fila 73: Total de provisiones por desmantelamiento (AUTOSUMA = F71+F72 - NO LLENAR)
];

/**
 * Mapeo de filas de Otras Provisiones para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Fila de autosuma (dejar vacía): 77
 * Fórmula F77 = F75 + F76
 */
const R414_OTRAS_PROVISIONES_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Otras provisiones (filas 75-77) ======
  
  // Fila 75: Otras provisiones no corrientes
  // PUC R414: No hay subdivisión corriente/no corriente - se llena con 0 si la sección tiene valores
  { row: 75, label: 'Otras provisiones no corrientes', pucPrefixes: [] },
  
  // Fila 76: Otras provisiones corrientes
  // PUC R414: 2707 - Garantías, 2790 - Provisiones diversas (excepto contratos onerosos y desmantelamiento)
  { row: 76, label: 'Otras provisiones corrientes', pucPrefixes: ['2707', '2790'], excludePrefixes: ['279018', '279020'] },
  
  // Fila 77: Total otras provisiones (AUTOSUMA = F75+F76 - NO LLENAR)
];

/**
 * Mapeo de filas de Beneficios a Empleados para R414 - Hoja7 (800100)
 * Notas - Subclasificaciones de activos, pasivos y patrimonios
 * Columna: F (consolidado)
 * 
 * Fila de autosuma (dejar vacía): 83
 * Fórmula F83 = SUMA(F79:F82)
 */
const R414_BENEFICIOS_EMPLEADOS_MAPPINGS: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }> = [
  // ====== Beneficios a Empleados (filas 79-83) ======
  
  // Fila 79: Beneficios a Empleados a corto plazo
  // PUC R414: 2511 - Beneficios a los empleados a corto plazo
  { row: 79, label: 'Beneficios a empleados corto plazo', pucPrefixes: ['2511'] },
  
  // Fila 80: Beneficios a Empleados a largo plazo
  // PUC R414: 2512 - Beneficios a los empleados a largo plazo
  { row: 80, label: 'Beneficios a empleados largo plazo', pucPrefixes: ['2512'] },
  
  // Fila 81: Beneficios por terminación del vínculo laboral o contractual
  // PUC R414: 2513 - Beneficios por terminación del vínculo laboral o contractual
  { row: 81, label: 'Beneficios terminación vínculo', pucPrefixes: ['2513'] },
  
  // Fila 82: Beneficios posempleo
  // PUC R414: 2514 - Beneficios posempleo pensiones, 2515 - Otros beneficios posempleo
  { row: 82, label: 'Beneficios posempleo', pucPrefixes: ['2514', '2515'] },
  
  // Fila 83: Total Beneficios a empleados (AUTOSUMA = SUMA(F79:F82) - NO LLENAR)
];

/** Datos de cuentas para procesar */
export interface AccountData {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

/** Datos de balance por servicio */
export interface ServiceBalanceData {
  service: string;
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
}

/** Estructura de usuarios por estrato y servicio */
export interface UsuariosEstrato {
  acueducto: Record<string, number>;
  alcantarillado: Record<string, number>;
  aseo: Record<string, number>;
}

/** Estructura de subsidios por servicio */
export interface SubsidiosPorServicio {
  acueducto: number;
  alcantarillado: number;
  aseo: number;
}

/** Opciones extendidas para incluir datos financieros */
export interface TemplateWithDataOptions extends TemplateCustomization {
  /** Cuentas consolidadas del balance */
  consolidatedAccounts?: AccountData[];
  /** Balances distribuidos por servicio */
  serviceBalances?: ServiceBalanceData[];
  /** Servicios activos para la empresa */
  activeServices?: string[];
  /** Usuarios por estrato y servicio (para distribución proporcional) */
  usuariosEstrato?: UsuariosEstrato;
  /** Subsidios recibidos por servicio */
  subsidios?: SubsidiosPorServicio;
}

/** Configuración para personalizar plantillas */
export interface TemplateCustomization {
  /** Grupo NIIF de la taxonomía */
  niifGroup: NiifGroup;
  /** ID de la empresa (RUPS) */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** Fecha del reporte (YYYY-MM-DD) */
  reportDate: string;
  /** Año de la taxonomía */
  taxonomyYear?: TaxonomyYear;
  /** NIT de la empresa */
  nit?: string;
  /** Naturaleza del negocio */
  businessNature?: string;
  /** Fecha de inicio de operaciones */
  startDate?: string;
  /** Grado de redondeo (1=Pesos, 2=Miles, 3=Millones, 4=Pesos redondeada a miles) */
  roundingDegree?: string;
  /** ¿Presenta información reexpresada? (Sí/No) */
  hasRestatedInfo?: string;
  /** Período de reexpresión */
  restatedPeriod?: string;
}

/** Resultado del paquete de plantillas */
export interface OfficialTemplatePackage {
  fileName: string;
  fileData: string;
  mimeType: string;
}

/**
 * Obtiene la ruta base de plantillas
 */
function getTemplatesBasePath(): string {
  // En Next.js, public está en la raíz del proyecto
  return path.join(process.cwd(), 'public', 'templates');
}

/**
 * Carga y lee una plantilla oficial
 */
async function loadTemplate(relativePath: string): Promise<string> {
  const fullPath = path.join(getTemplatesBasePath(), relativePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error cargando plantilla ${fullPath}:`, error);
    throw new Error(`No se pudo cargar la plantilla: ${relativePath}`);
  }
}

/**
 * Carga un archivo binario (xlsx)
 */
async function loadBinaryTemplate(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(getTemplatesBasePath(), relativePath);
  try {
    const content = await fs.readFile(fullPath);
    return content;
  } catch (error) {
    console.error(`Error cargando plantilla binaria ${fullPath}:`, error);
    throw new Error(`No se pudo cargar la plantilla binaria: ${relativePath}`);
  }
}

/**
 * Obtiene la etiqueta del grado de redondeo según el código
 */
function getRoundingDegreeLabel(degree: string | undefined): string {
  const labels: Record<string, string> = {
    '1': '1 - Pesos',
    '2': '2 - Miles de pesos',
    '3': '3 - Millones de pesos',
    '4': '4 - Pesos redondeada a miles',
  };
  return labels[degree || '1'] || '1 - Pesos';
}

/**
 * Personaliza el archivo Excel con datos de la empresa Y datos financieros del balance
 * 
 * Esta función llena:
 * - Hoja1 (110000): Metadatos de la empresa
 * - Hoja2 (210000): Estado de Situación Financiera
 * - Hoja3 (310000): Estado de Resultados
 * - Hojas FC01: Gastos por servicio
 * - Hojas FC02/FC03: Ingresos y CXC
 * 
 * @param xlsxBuffer - Buffer del archivo Excel plantilla
 * @param options - Opciones de personalización incluyendo datos financieros
 */
function customizeExcelWithData(xlsxBuffer: Buffer, options: TemplateWithDataOptions): Buffer {
  // Leer el archivo Excel
  const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' });
  
  // ===============================================
  // PARTE 1: LLENAR HOJA1 CON METADATOS
  // ===============================================
  const sheet1 = workbook.Sheets['Hoja1'];
  if (sheet1) {
    // Función helper para establecer el valor de una celda de texto
    const setTextCell = (sheet: XLSX.WorkSheet, cell: string, value: string | undefined) => {
      if (value !== undefined && value !== '') {
        sheet[cell] = { t: 's', v: value };
      }
    };
    
    // C4 contiene el ID de empresa para XBRL Express
    setTextCell(sheet1, 'C4', options.companyId);
    
    // Llenar los campos de información general
    // NOTA: El orden de campos varía según la taxonomía
    if (options.niifGroup === 'r414') {
      // Orden específico para R414 (según plantilla oficial R414Ind_ID20037_2024-12-31.xlsx):
      // Las etiquetas están en columna C, los valores en columna E
      // E12: Nombre de la entidad
      // E13: Identificación de la Empresa (ID RUPS)
      // E14: NIT  
      // E15: Descripción de la naturaleza de los EF ("1. Individual" o "2. Separado")
      // E16: Información sobre la naturaleza del negocio (texto)
      // E17: Fecha de inicio de operaciones (fecha)
      // E18: Fecha de cierre del período (fecha)
      // E19: Grado de redondeo (enumeration)
      // E21: ¿Presenta información reexpresada?
      // E22: Período reexpresado
      setTextCell(sheet1, 'E12', options.companyName);
      setTextCell(sheet1, 'E13', options.companyId);
      setTextCell(sheet1, 'E14', options.nit);
      setTextCell(sheet1, 'E15', '1. Individual'); // Naturaleza de EF
      setTextCell(sheet1, 'E16', options.businessNature || 'Servicios públicos'); // Naturaleza negocio
      setTextCell(sheet1, 'E17', options.startDate || '2005-01-01'); // Fecha inicio
      setTextCell(sheet1, 'E18', options.reportDate); // Fecha cierre
      setTextCell(sheet1, 'E19', getRoundingDegreeLabel(options.roundingDegree)); // Grado redondeo
      
      // Información reexpresada (filas 21-22)
      if (options.hasRestatedInfo === 'Sí' || options.hasRestatedInfo === '1. Sí') {
        setTextCell(sheet1, 'E21', '1. Sí');
        if (options.restatedPeriod) {
          setTextCell(sheet1, 'E22', options.restatedPeriod);
        }
      } else {
        setTextCell(sheet1, 'E21', '2. No');
      }
    } else {
      // Orden para Grupo 1, 2, 3 (puede variar ligeramente)
      setTextCell(sheet1, 'E13', options.companyName);
      setTextCell(sheet1, 'E14', options.companyId);
      setTextCell(sheet1, 'E15', options.nit);
      setTextCell(sheet1, 'E16', options.businessNature);
      setTextCell(sheet1, 'E17', options.startDate);
      setTextCell(sheet1, 'E18', options.reportDate);
      setTextCell(sheet1, 'E19', getRoundingDegreeLabel(options.roundingDegree));
      
      // Información reexpresada
      if (options.hasRestatedInfo === 'Sí' || options.hasRestatedInfo === '1. Sí') {
        setTextCell(sheet1, 'E21', '1. Sí');
        if (options.restatedPeriod) {
          setTextCell(sheet1, 'E22', options.restatedPeriod);
        }
      } else {
        setTextCell(sheet1, 'E21', '2. No');
      }
    }
  }
  
  // ===============================================
  // PARTE 2: LLENAR DATOS FINANCIEROS SI HAY DATOS
  // ===============================================
  if (options.consolidatedAccounts && options.consolidatedAccounts.length > 0) {
    const serviceBalances = options.serviceBalances || [];
    const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];
    const config = getTaxonomyConfig(options.niifGroup);
    
    // Función para establecer valor numérico en celda
    // PRUEBA: Escribir como TEXTO (t:'s') igual que los campos del 110000
    // para ver si XBRL Express lo lee correctamente
    const setNumericCell = (sheet: XLSX.WorkSheet, cell: string, value: number) => {
      if (value !== 0 && value !== undefined && !isNaN(value)) {
        const stringValue = String(value);
        sheet[cell] = { 
          t: 's',  // Tipo STRING en lugar de número
          v: stringValue,
          w: stringValue,
          h: stringValue
        };
      }
    };
    
    // Agrupar cuentas por servicio
    const accountsByService: Record<string, ServiceBalanceData[]> = {};
    for (const service of activeServices) {
      accountsByService[service] = serviceBalances.filter(sb => sb.service === service);
    }
    
    // ===============================================
    // HOJA2 (210000): Estado de Situación Financiera
    // ===============================================
    const sheet2Name = SHEET_MAPPING[options.niifGroup]?.['210000'];
    const sheet2 = sheet2Name ? workbook.Sheets[sheet2Name] : null;
    
    if (sheet2) {
      // Usar mapeo específico para R414, o el genérico para otros grupos
      if (options.niifGroup === 'r414') {
        // ===============================================
        // MAPEO ESPECÍFICO R414
        // Columnas: I=Acueducto, J=Alcantarillado, K=Aseo, P=Total
        // ===============================================
        
        // Función helper para verificar si una cuenta coincide con los prefijos
        const matchesPrefixes = (code: string, prefixes: string[], excludes?: string[]): boolean => {
          // Primero verificar exclusiones
          if (excludes) {
            for (const exclude of excludes) {
              if (code.startsWith(exclude)) {
                return false;
              }
            }
          }
          // Luego verificar si coincide con algún prefijo
          for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
              return true;
            }
          }
          return false;
        };
        
        // Procesar cada mapeo del ESF R414
        for (const mapping of R414_ESF_MAPPINGS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              totalValue += account.value;
            }
          }
          
          // Escribir valor total en columna P (R414)
          if (totalValue !== 0) {
            const totalCell = `${R414_SERVICE_COLUMNS.total}${mapping.row}`;
            setNumericCell(sheet2, totalCell, totalValue);
          }
          
          // Escribir valores por servicio en columnas I, J, K
          for (const service of activeServices) {
            const serviceColumn = R414_SERVICE_COLUMNS[service];
            if (!serviceColumn) continue;
            
            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
                serviceValue += account.value;
              }
            }
            
            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${mapping.row}`;
              setNumericCell(sheet2, serviceCell, serviceValue);
            }
          }
        }
      } else {
        // ===============================================
        // MAPEO GENÉRICO PARA GRUPO 1, 2, 3
        // Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo
        // ===============================================
        for (const concept of ESF_CONCEPTS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            const mappedConcept = findESFConceptByPUC(account.code);
            if (mappedConcept && mappedConcept.concept === concept.concept) {
              totalValue += account.value;
            }
          }
          
          // Escribir valor total en columna I
          if (totalValue !== 0) {
            const totalCell = `${SERVICE_COLUMNS.total}${concept.row}`;
            setNumericCell(sheet2, totalCell, totalValue);
          }
          
          // Escribir valores por servicio
          for (const service of activeServices) {
            const serviceColumn = SERVICE_COLUMNS[service];
            if (!serviceColumn) continue;
            
            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              const mappedConcept = findESFConceptByPUC(account.code);
              if (mappedConcept && mappedConcept.concept === concept.concept) {
                serviceValue += account.value;
              }
            }
            
            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${concept.row}`;
              setNumericCell(sheet2, serviceCell, serviceValue);
            }
          }
        }
      }
    }
    
    // ===============================================
    // HOJA3 (310000): Estado de Resultados
    // ===============================================
    const sheet3Name = SHEET_MAPPING[options.niifGroup]?.['310000'];
    const sheet3 = sheet3Name ? workbook.Sheets[sheet3Name] : null;
    
    if (sheet3) {
      // Usar mapeo específico para R414, o el genérico para otros grupos
      if (options.niifGroup === 'r414') {
        // ===============================================
        // MAPEO ESPECÍFICO R414 - ESTADO DE RESULTADOS
        // Columnas: E=Acueducto, F=Alcantarillado, G=Aseo, L=Total
        // ===============================================
        
        // Función helper para verificar si una cuenta coincide con los prefijos
        const matchesPrefixesER = (code: string, prefixes: string[], excludes?: string[]): boolean => {
          // Primero verificar exclusiones
          if (excludes) {
            for (const exclude of excludes) {
              if (code.startsWith(exclude)) {
                return false;
              }
            }
          }
          // Luego verificar si coincide con algún prefijo
          for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
              return true;
            }
          }
          return false;
        };
        
        // Procesar cada mapeo del ER R414
        for (const mapping of R414_ER_MAPPINGS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixesER(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              totalValue += account.value;
            }
          }
          
          // Escribir valor total en columna L (R414 ER)
          if (totalValue !== 0) {
            const totalCell = `${R414_ER_COLUMNS.total}${mapping.row}`;
            setNumericCell(sheet3, totalCell, totalValue);
          }
          
          // Escribir valores por servicio en columnas E, F, G
          for (const service of activeServices) {
            const serviceColumn = R414_ER_COLUMNS[service];
            if (!serviceColumn) continue;
            
            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (matchesPrefixesER(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
                serviceValue += account.value;
              }
            }
            
            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${mapping.row}`;
              setNumericCell(sheet3, serviceCell, serviceValue);
            }
          }
        }
      } else {
        // ===============================================
        // MAPEO GENÉRICO PARA GRUPO 1, 2, 3
        // Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo
        // ===============================================
        const ERMapping = [
          { row: 15, pucPrefix: '41', label: 'Ingresos de actividades ordinarias' },
          { row: 16, pucPrefix: '42', label: 'Otros ingresos operacionales' },
          { row: 17, pucPrefix: '61', label: 'Costo de ventas' },
          { row: 21, pucPrefix: '51', label: 'Gastos de administración' },
          { row: 22, pucPrefix: '52', label: 'Gastos de ventas' },
          { row: 25, pucPrefix: '53', label: 'Gastos financieros' },
          { row: 26, pucPrefix: '4210', label: 'Ingresos financieros' },
        ];
        
        for (const mapping of ERMapping) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (account.code.startsWith(mapping.pucPrefix)) {
              totalValue += account.value;
            }
          }
          
          if (totalValue !== 0) {
            setNumericCell(sheet3, `${SERVICE_COLUMNS.total}${mapping.row}`, totalValue);
          }
          
          // Valores por servicio
          for (const service of activeServices) {
            const serviceColumn = SERVICE_COLUMNS[service];
            if (!serviceColumn) continue;
            
            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (account.code.startsWith(mapping.pucPrefix)) {
                serviceValue += account.value;
              }
            }
            
            if (serviceValue !== 0) {
              setNumericCell(sheet3, `${serviceColumn}${mapping.row}`, serviceValue);
            }
          }
        }
      }
    }
    
    // ===============================================
    // HOJAS FC01 (900017a-c): Gastos por servicio
    // ===============================================
    const FC01_EXPENSE_MAPPING = [
      { row: 13, pucPrefixes: ['5105', '510506', '510503', '510509'], label: 'Sueldos y salarios' },
      { row: 14, pucPrefixes: ['5110', '5115', '5120', '5125'], label: 'Prestaciones sociales' },
      { row: 15, pucPrefixes: ['5135', '513525', '513530'], label: 'Servicios públicos' },
      { row: 16, pucPrefixes: ['5130'], label: 'Seguros' },
      { row: 17, pucPrefixes: ['5140', '5145'], label: 'Servicios técnicos' },
      { row: 18, pucPrefixes: ['5150', '515005', '515010'], label: 'Mantenimiento' },
      { row: 19, pucPrefixes: ['5260', '526005', '526010'], label: 'Depreciaciones' },
      { row: 20, pucPrefixes: ['5265'], label: 'Amortizaciones' },
      { row: 21, pucPrefixes: ['5165', '5170'], label: 'Transporte y viajes' },
      { row: 22, pucPrefixes: ['5195', '5295'], label: 'Otros gastos' },
    ];
    
    const fc01Services = [
      { sheetCode: '900017a', service: 'acueducto' },
      { sheetCode: '900017b', service: 'alcantarillado' },
      { sheetCode: '900017c', service: 'aseo' },
    ];
    
    for (const fc01 of fc01Services) {
      const sheetName = SHEET_MAPPING[options.niifGroup]?.[fc01.sheetCode];
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;
      
      if (sheet && activeServices.includes(fc01.service)) {
        const serviceAccounts = accountsByService[fc01.service] || [];
        
        for (const mapping of FC01_EXPENSE_MAPPING) {
          let value = 0;
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                value += account.value;
                break;
              }
            }
          }
          
          // FC01 usa columna E para valores del período actual
          if (value !== 0) {
            setNumericCell(sheet, `E${mapping.row}`, value);
          }
        }
      }
    }
    
    // ===============================================
    // HOJA FC01-7 (900017g): Total servicios públicos
    // ===============================================
    const fc01TotalSheetName = SHEET_MAPPING[options.niifGroup]?.['900017g'];
    const fc01TotalSheet = fc01TotalSheetName ? workbook.Sheets[fc01TotalSheetName] : null;
    
    if (fc01TotalSheet) {
      for (const mapping of FC01_EXPENSE_MAPPING) {
        let totalValue = 0;
        
        // Sumar todos los servicios activos
        for (const service of activeServices) {
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                totalValue += account.value;
                break;
              }
            }
          }
        }
        
        if (totalValue !== 0) {
          setNumericCell(fc01TotalSheet, `E${mapping.row}`, totalValue);
        }
      }
    }
    
    // ===============================================
    // HOJA FC02 (900019): Complementario de Ingresos
    // Detalla los ingresos operacionales por servicio
    // ===============================================
    const FC02_INCOME_MAPPING = [
      // Acueducto (filas 15-18)
      { row: 15, service: 'acueducto', pucPrefixes: ['410505', '4105051'], label: 'Abastecimiento' },
      { row: 16, service: 'acueducto', pucPrefixes: ['410510', '4105102'], label: 'Distribución' },
      { row: 17, service: 'acueducto', pucPrefixes: ['410515', '4105153'], label: 'Comercialización' },
      { row: 18, service: 'acueducto', pucPrefixes: ['4105'], label: 'Subtotal Acueducto', isSubtotal: true },
      // Alcantarillado (filas 20-23)
      { row: 20, service: 'alcantarillado', pucPrefixes: ['410520', '4105204'], label: 'Recolección y transporte' },
      { row: 21, service: 'alcantarillado', pucPrefixes: ['410525', '4105255'], label: 'Tratamiento' },
      { row: 22, service: 'alcantarillado', pucPrefixes: ['410530', '4105306'], label: 'Comercialización' },
      { row: 23, service: 'alcantarillado', pucPrefixes: ['4105'], label: 'Subtotal Alcantarillado', isSubtotal: true },
      // Aseo (filas 25-35)
      { row: 25, service: 'aseo', pucPrefixes: ['410535', '4105357'], label: 'Recolección y transporte' },
      { row: 26, service: 'aseo', pucPrefixes: ['410540', '4105408'], label: 'Disposición final' },
      { row: 27, service: 'aseo', pucPrefixes: ['410545', '4105459'], label: 'Tratamiento de lixiviados' },
      { row: 28, service: 'aseo', pucPrefixes: ['410550', '4105510'], label: 'Comercialización' },
      { row: 35, service: 'aseo', pucPrefixes: ['4105'], label: 'Subtotal Aseo', isSubtotal: true },
    ];
    
    const fc02SheetName = SHEET_MAPPING[options.niifGroup]?.['900019'];
    const fc02Sheet = fc02SheetName ? workbook.Sheets[fc02SheetName] : null;
    
    if (fc02Sheet) {
      for (const mapping of FC02_INCOME_MAPPING) {
        if (!activeServices.includes(mapping.service)) continue;
        
        const serviceAccounts = accountsByService[mapping.service] || [];
        let value = 0;
        
        for (const account of serviceAccounts) {
          if (!account.isLeaf) continue;
          for (const prefix of mapping.pucPrefixes) {
            if (account.code.startsWith(prefix)) {
              value += account.value;
              break;
            }
          }
        }
        
        if (value !== 0) {
          // FC02 usa columna G para valores del período actual
          setNumericCell(fc02Sheet, `G${mapping.row}`, value);
        }
      }
    }
    
    // ===============================================
    // HOJAS FC03 (900021-23): CXC por servicio
    // Detalla las cuentas por cobrar por tipo de usuario
    // ===============================================
    const FC03_CXC_MAPPING = [
      { row: 16, pucPrefixes: ['1305', '130505'], label: 'Distribución' },
      { row: 17, pucPrefixes: ['1310', '131005'], label: 'Otros Servicios' },
      { row: 19, pucPrefixes: ['130510', '1305101'], label: 'Residencial Estrato 1' },
      { row: 20, pucPrefixes: ['130515', '1305152'], label: 'Residencial Estrato 2' },
      { row: 21, pucPrefixes: ['130520', '1305203'], label: 'Residencial Estrato 3' },
      { row: 22, pucPrefixes: ['130525', '1305254'], label: 'Residencial Estrato 4' },
      { row: 23, pucPrefixes: ['130530', '1305305'], label: 'Residencial Estrato 5' },
      { row: 24, pucPrefixes: ['130535', '1305356'], label: 'Residencial Estrato 6' },
      { row: 25, pucPrefixes: ['130540', '1305407'], label: 'No residencial industrial' },
      { row: 26, pucPrefixes: ['130545', '1305458'], label: 'No residencial comercial' },
      { row: 27, pucPrefixes: ['130550', '1305509'], label: 'Oficial' },
      { row: 28, pucPrefixes: ['130555', '1305510'], label: 'Otros usuarios' },
    ];
    
    const fc03Services = [
      { sheetCode: '900021', service: 'acueducto' },
      { sheetCode: '900022', service: 'alcantarillado' },
      { sheetCode: '900023', service: 'aseo' },
    ];
    
    for (const fc03 of fc03Services) {
      const sheetName = SHEET_MAPPING[options.niifGroup]?.[fc03.sheetCode];
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;
      
      if (sheet && activeServices.includes(fc03.service)) {
        const serviceAccounts = accountsByService[fc03.service] || [];
        
        for (const mapping of FC03_CXC_MAPPING) {
          let value = 0;
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                value += account.value;
                break;
              }
            }
          }
          
          // FC03 usa columna G para valores corrientes
          if (value !== 0) {
            setNumericCell(sheet, `G${mapping.row}`, value);
          }
        }
      }
    }
    
    // ===============================================
    // HOJA FC05b (900028b): Pasivos por edades de vencimiento
    // Estructura: Fila 15-29 = categorías de pasivo
    // Columnas: D=Corriente, F=No corriente, G=Total pasivos
    // ===============================================
    const FC05B_PAYABLES_MAPPING = [
      { row: 15, pucPrefixes: ['2505', '2510'], label: 'Nómina por pagar' },
      { row: 16, pucPrefixes: ['2515', '2520'], label: 'Prestaciones sociales' },
      { row: 17, pucPrefixes: ['2205', '2210', '22'], label: 'Cuentas comerciales por pagar' },
      { row: 18, pucPrefixes: ['24'], label: 'Impuestos por pagar' },
      { row: 19, pucPrefixes: ['23'], label: 'Cuentas por pagar a partes relacionadas' },
      { row: 20, pucPrefixes: ['21'], label: 'Obligaciones financieras' },
      { row: 21, pucPrefixes: ['27'], label: 'Ingresos recibidos por anticipado' },
      { row: 22, pucPrefixes: ['2404', '2408'], label: 'Pasivos por impuesto diferido' },
      { row: 23, pucPrefixes: ['26'], label: 'Provisiones' },
      { row: 29, pucPrefixes: ['28'], label: 'Otros pasivos' },
    ];
    
    const fc05bSheetName = SHEET_MAPPING[options.niifGroup]?.['900028b'];
    const fc05bSheet = fc05bSheetName ? workbook.Sheets[fc05bSheetName] : null;
    
    if (fc05bSheet) {
      for (const mapping of FC05B_PAYABLES_MAPPING) {
        let totalValue = 0;
        
        // Sumar todos los servicios activos
        for (const service of activeServices) {
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                totalValue += account.value;
                break;
              }
            }
          }
        }
        
        // Columna G = Total pasivos por balance
        if (totalValue !== 0) {
          setNumericCell(fc05bSheet, `G${mapping.row}`, totalValue);
        }
      }
    }
    
    // ===============================================
    // HOJA9 (800500): Notas - Lista de Notas
    // Bloques de texto para revelaciones NIIF
    // Para empresas de servicios públicos
    // ===============================================
    const sheet9 = workbook.Sheets['Hoja9'];
    
    if (sheet9) {
      // Función helper para establecer texto en celda de nota
      const setNoteCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };
      
      // Información de la empresa para usar en notas
      const companyName = options.companyName || 'La empresa';
      const reportDate = options.reportDate || new Date().toISOString().split('T')[0];
      const reportYear = reportDate.split('-')[0];
      
      // ===== NOTAS CON CONTENIDO ESTÁNDAR =====
      // Estas notas son comunes y cortas para empresas de servicios públicos
      
      // Fila 11: Información a revelar sobre notas y otra información explicativa [OBLIGATORIO]
      setNoteCell(sheet9, 'E11',
        `Las presentes notas a los estados financieros contienen información adicional a la presentada en el Estado de Situación Financiera y el Estado de Resultados. Proporcionan descripciones narrativas o desagregaciones de partidas presentadas en dichos estados, así como información sobre partidas que no cumplen las condiciones para ser reconocidas en ellos. Las notas se presentan de forma sistemática, haciendo referencia cruzada para cada partida de los estados financieros con cualquier información relacionada en las notas.`
      );
      
      // Fila 14: Autorización de estados financieros
      setNoteCell(sheet9, 'E14', 
        `Los estados financieros de ${companyName} al ${reportDate} fueron autorizados para su emisión por la Junta Directiva en su reunión celebrada en el mes de marzo de ${parseInt(reportYear) + 1}.`
      );
      
      // Fila 15: Efectivo y equivalentes al efectivo
      setNoteCell(sheet9, 'E15',
        `El efectivo y equivalentes al efectivo incluyen el dinero en caja, depósitos a la vista en bancos y otras inversiones a corto plazo de alta liquidez con vencimiento original de tres meses o menos. Se reconocen al costo.`
      );
      
      // Fila 19: Gastos por depreciación y amortización
      setNoteCell(sheet9, 'E19',
        `La depreciación se calcula usando el método de línea recta sobre la vida útil estimada de los activos. Las vidas útiles estimadas son: edificaciones 20-50 años, redes y tuberías 20-40 años, maquinaria y equipo 10-15 años, equipo de oficina 5-10 años, equipo de cómputo 3-5 años, vehículos 5-10 años.`
      );
      
      // Fila 22: Beneficios a los empleados
      setNoteCell(sheet9, 'E22',
        `Los beneficios a empleados de corto plazo incluyen salarios, seguridad social, prestaciones legales y extralegales. Se reconocen como gasto cuando el empleado ha prestado el servicio. Las obligaciones por beneficios definidos se calculan actuarialmente.`
      );
      
      // Fila 23: Hechos ocurridos después del período
      setNoteCell(sheet9, 'E23',
        `No se han presentado hechos posteriores al cierre del período que requieran ajuste o revelación en los estados financieros.`
      );
      
      // Fila 29: Información general sobre los estados financieros
      setNoteCell(sheet9, 'E29',
        `${companyName} es una empresa de servicios públicos domiciliarios que opera bajo la regulación de la Ley 142 de 1994 y la supervisión de la Superintendencia de Servicios Públicos Domiciliarios. Los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la CGN.`
      );
      
      // Fila 38: Impuestos a las ganancias
      setNoteCell(sheet9, 'E38',
        `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la base imponible del período usando las tasas vigentes. El impuesto diferido se reconoce sobre las diferencias temporarias entre las bases fiscales y contables de activos y pasivos.`
      );
      
      // Fila 44: Inventarios
      setNoteCell(sheet9, 'E44',
        `Los inventarios se valoran al menor entre el costo y el valor neto realizable. El costo se determina usando el método promedio ponderado. Incluyen materiales para mantenimiento de redes, químicos para tratamiento de agua y otros suministros operacionales.`
      );
      
      // Fila 59: Propiedades, planta y equipo
      setNoteCell(sheet9, 'E59',
        `Las propiedades, planta y equipo se reconocen al costo menos depreciación acumulada y pérdidas por deterioro. Incluyen terrenos, edificaciones, redes de acueducto y alcantarillado, plantas de tratamiento, maquinaria, equipos y vehículos. Las mejoras que aumentan la vida útil se capitalizan; el mantenimiento ordinario se reconoce como gasto.`
      );
      
      // Fila 60: Provisiones
      setNoteCell(sheet9, 'E60',
        `Las provisiones se reconocen cuando existe una obligación presente, legal o implícita, como resultado de un evento pasado, es probable que se requiera una salida de recursos y se puede estimar confiablemente el monto. Incluyen provisiones para litigios, garantías y obligaciones ambientales.`
      );
      
      // Fila 64: Ingresos de actividades ordinarias
      setNoteCell(sheet9, 'E64',
        `Los ingresos de actividades ordinarias provienen de la prestación de servicios públicos domiciliarios de acueducto, alcantarillado y aseo. Se reconocen cuando el servicio ha sido prestado, el importe puede medirse confiablemente y es probable que los beneficios económicos fluyan a la entidad. Las tarifas se determinan según la regulación de la CRA.`
      );
      
      // Fila 66: Acreedores comerciales y otras cuentas por pagar
      setNoteCell(sheet9, 'E66',
        `Las cuentas por pagar comerciales incluyen obligaciones con proveedores de bienes y servicios relacionados con la operación. Se reconocen al valor de la factura y se miden posteriormente al costo amortizado. Generalmente tienen vencimientos menores a un año.`
      );
      
      // Fila 67: Deudores comerciales y otras cuentas por cobrar
      setNoteCell(sheet9, 'E67',
        `Las cuentas por cobrar comerciales corresponden principalmente a la facturación de servicios públicos a usuarios residenciales, comerciales, industriales y oficiales. Se reconocen al valor de la factura y se miden al costo amortizado. Se evalúa el deterioro considerando la antigüedad de cartera y la experiencia histórica de recuperación.`
      );
      
      // ===== CAMPOS DE SUBVENCIONES DEL GOBIERNO (filas 32-36) =====
      // Estos campos son obligatorios y van dentro de la sección de subvenciones (fila 31)
      // Para empresas que NO reciben subvenciones, se indica "NA"
      
      // Fila 32: Descripción de la naturaleza y cuantía de las subvenciones reconocidas
      setNoteCell(sheet9, 'E32',
        `NA - La entidad no ha recibido subvenciones del gobierno durante el periodo.`
      );
      
      // Fila 33: Descripción de las condiciones cumplidas, por cumplir y otras contingencias
      setNoteCell(sheet9, 'E33',
        `NA - No aplica, no se han recibido subvenciones gubernamentales.`
      );
      
      // Fila 34: Periodos que cubre la subvención, así como los montos amortizados y por amortizar
      setNoteCell(sheet9, 'E34',
        `NA - No aplica, no existen subvenciones por amortizar.`
      );
      
      // Fila 35: Descripción de las subvenciones a las que no se les haya podido asignar un valor
      setNoteCell(sheet9, 'E35',
        `NA - No aplica, no se han recibido subvenciones.`
      );
      
      // Fila 36: Descripción de otro tipo de ayudas gubernamentales
      setNoteCell(sheet9, 'E36',
        `NA - La entidad no ha recibido ayudas gubernamentales durante el periodo reportado.`
      );
      
      // ===== NOTAS CON "NA" (No Aplica) =====
      // Estas notas generalmente no aplican para empresas típicas de servicios públicos
      
      const notasNA = [
        12, // Juicios y estimaciones contables (muy técnica)
        13, // Remuneración de auditores
        16, // Estado de flujos de efectivo (se llena en otra hoja)
        17, // Activos contingentes
        18, // Compromisos y pasivos contingentes
        20, // Instrumentos financieros derivados
        21, // Variaciones en tasas de cambio
        24, // Gastos (se detalla en otras hojas)
        25, // Ingresos/costos financieros
        26, // Instrumentos financieros
        27, // Gestión del riesgo financiero
        28, // Adopción por primera vez
        30, // Plusvalía
        31, // Subvenciones del gobierno (encabezado general)
        37, // Deterioro de valor de activos
        39, // Empleados (número)
        40, // Personal clave de la gerencia
        41, // Activos intangibles
        42, // Gastos por intereses
        43, // Ingresos por intereses
        45, // Propiedades de inversión
        46, // Inversiones método participación
        47, // Otras inversiones
        48, // Arrendamientos
        49, // Préstamos y anticipos a bancos
        50, // Préstamos y anticipos a clientes
        51, // Gestión del capital
        52, // Otros activos corrientes
        53, // Otros pasivos corrientes
        54, // Otros activos no corrientes
        55, // Otros pasivos no corrientes
        56, // Otros ingresos/gastos de operación
        57, // Anticipos y otros activos
        58, // Ganancias/pérdidas por operación
        61, // Gastos de investigación y desarrollo
        62, // Reservas dentro de patrimonio
        63, // Efectivo restringido
        65, // Cuentas por cobrar/pagar por impuestos
      ];
      
      for (const row of notasNA) {
        setNoteCell(sheet9, `E${row}`, 'NA');
      }
    }
    
    // ===============================================
    // HOJA10 (800600): Notas - Lista de Políticas Contables
    // Descripción de las políticas contables aplicadas
    // Para empresas de servicios públicos
    // ===============================================
    const sheet10 = workbook.Sheets['Hoja10'];
    
    if (sheet10) {
      // Función helper para establecer texto en celda de política
      // NOTA: Hoja10 usa columna D (a diferencia de Hoja09 que usa columna E)
      // porque el encabezado "Periodo Actual" está en D10, no en E10
      const setPolicyCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };
      
      // ===== POLÍTICAS CON CONTENIDO ESTÁNDAR =====
      // Políticas comunes y aplicables a empresas de servicios públicos
      
      // Fila 11: Información a revelar sobre un resumen de las políticas contables significativas [OBLIGATORIO]
      setPolicyCell(sheet10, 'D11',
        `Las políticas contables significativas aplicadas en la preparación de estos estados financieros se resumen a continuación. Estas políticas han sido aplicadas consistentemente para todos los períodos presentados, salvo que se indique lo contrario. Los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la CGN para empresas de servicios públicos domiciliarios.`
      );
      
      // Fila 16: Beneficios a los empleados
      setPolicyCell(sheet10, 'D16',
        `Los beneficios a empleados de corto plazo se reconocen como gasto cuando el empleado presta el servicio. Incluyen salarios, aportes a seguridad social, prestaciones sociales legales y extralegales. Los beneficios post-empleo se reconocen según el tipo de plan: contribución definida (gasto cuando se paga) o beneficio definido (obligación actuarial).`
      );
      
      // Fila 17: Gastos
      setPolicyCell(sheet10, 'D17',
        `Los gastos se reconocen cuando se incurren, independientemente del momento del pago, aplicando el principio de devengo. Se clasifican en gastos de administración, operación y ventas según su función. Los gastos de operación incluyen costos directamente relacionados con la prestación de servicios públicos.`
      );
      
      // Fila 22: Deterioro del valor de activos
      setPolicyCell(sheet10, 'D22',
        `Al cierre de cada período se evalúa si existe indicación de deterioro de activos. Si existe, se estima el valor recuperable como el mayor entre el valor razonable menos costos de venta y el valor en uso. Si el valor en libros excede el recuperable, se reconoce una pérdida por deterioro. Para cuentas por cobrar se aplica el modelo de pérdidas crediticias esperadas.`
      );
      
      // Fila 23: Impuestos a las ganancias
      setPolicyCell(sheet10, 'D23',
        `El gasto por impuesto comprende el impuesto corriente y diferido. El corriente se calcula sobre la renta líquida gravable usando tasas vigentes. El diferido se reconoce sobre diferencias temporarias entre bases contables y fiscales, usando el método del pasivo. Los activos por impuesto diferido se reconocen si es probable obtener ganancias fiscales futuras.`
      );
      
      // Fila 28: Capital emitido
      setPolicyCell(sheet10, 'D28',
        `El capital social se reconoce al valor nominal de las acciones o aportes suscritos y pagados. Las primas en colocación de acciones se registran en el patrimonio. Los costos de transacción relacionados con emisión de instrumentos de patrimonio se deducen directamente del patrimonio.`
      );
      
      // Fila 30: Préstamos y cuentas por cobrar
      setPolicyCell(sheet10, 'D30',
        `Las cuentas por cobrar comerciales se reconocen inicialmente al precio de la transacción. Posteriormente se miden al costo amortizado menos deterioro. El deterioro se calcula usando el modelo de pérdidas crediticias esperadas, considerando la experiencia histórica de pérdidas, las condiciones actuales y proyecciones futuras.`
      );
      
      // Fila 31: Inventarios
      setPolicyCell(sheet10, 'D31',
        `Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina usando el método del promedio ponderado. Incluyen materiales para mantenimiento de redes, químicos para tratamiento de agua, repuestos y suministros. Se evalúa periódicamente la obsolescencia y se reconocen ajustes cuando el valor realizable es menor al costo.`
      );
      
      // Fila 33: Propiedades, planta y equipo
      setPolicyCell(sheet10, 'D33',
        `Las propiedades, planta y equipo se reconocen al costo menos depreciación acumulada y deterioro. El costo incluye precio de adquisición, costos directamente atribuibles y costos de desmantelamiento. La depreciación se calcula por línea recta sobre la vida útil estimada. Las mejoras se capitalizan; el mantenimiento se reconoce como gasto. Se revisan las vidas útiles y valores residuales anualmente.`
      );
      
      // Fila 34: Provisiones
      setPolicyCell(sheet10, 'D34',
        `Las provisiones se reconocen cuando existe una obligación presente (legal o implícita) resultado de un evento pasado, es probable una salida de recursos y el monto puede estimarse confiablemente. Se miden al mejor estimado del desembolso requerido. Las provisiones de largo plazo se descuentan a valor presente si el efecto es material.`
      );
      
      // Fila 35: Reconocimiento de ingresos de actividades ordinarias
      setPolicyCell(sheet10, 'D35',
        `Los ingresos por prestación de servicios públicos se reconocen cuando el servicio ha sido prestado, el importe puede medirse confiablemente y es probable que los beneficios económicos fluyan a la entidad. La facturación se realiza mensualmente según consumo medido o estimado. Los subsidios y contribuciones se reconocen según las disposiciones regulatorias de la CRA.`
      );
      
      // Fila 38: Acreedores comerciales y otras cuentas por pagar
      setPolicyCell(sheet10, 'D38',
        `Las cuentas por pagar comerciales se reconocen al valor de la factura cuando se reciben los bienes o servicios. Posteriormente se miden al costo amortizado. No se descuentan si el efecto del valor temporal del dinero no es significativo. Incluyen obligaciones con proveedores, contratistas y acreedores varios relacionados con la operación.`
      );
      
      // Fila 40: Otras políticas contables relevantes
      setPolicyCell(sheet10, 'D40',
        `Bases de preparación: Los estados financieros se preparan bajo NIIF para Pymes adoptadas en Colombia y la Resolución 414 de 2014 de la CGN. Moneda funcional y de presentación: Peso colombiano. Efectivo: Incluye caja, bancos e inversiones de alta liquidez con vencimiento menor a 3 meses. Aportes y contribuciones: Se reconocen según regulación sectorial aplicable a empresas de servicios públicos.`
      );
      
      // Fila 13: Descripción de la política contable sobre costos de financiación
      setPolicyCell(sheet10, 'D13',
        `Los costos por préstamos directamente atribuibles a la adquisición, construcción o producción de activos aptos se capitalizan como parte del costo del activo. Los demás costos por préstamos se reconocen como gasto en el período en que se incurren. La capitalización se suspende durante períodos prolongados de interrupción de las actividades de desarrollo.`
      );
      
      // Fila 14: Descripción de la política contable sobre préstamos
      setPolicyCell(sheet10, 'D14',
        `Los préstamos se reconocen inicialmente al valor razonable menos los costos de transacción. Posteriormente se miden al costo amortizado utilizando el método del interés efectivo. Los intereses devengados se reconocen como gasto financiero. Se clasifican como pasivos corrientes o no corrientes según su vencimiento.`
      );
      
      // Fila 15: Descripción de la política contable sobre instrumentos financieros derivados
      setPolicyCell(sheet10, 'D15',
        `La entidad no utiliza instrumentos financieros derivados para especulación. En caso de utilizarse con fines de cobertura, se reconocen inicialmente al valor razonable y se miden posteriormente según su clasificación. Los cambios en el valor razonable se reconocen en resultados, excepto las coberturas de flujo de efectivo eficaces que se reconocen en otro resultado integral.`
      );
      
      // Fila 18: Descripción de la política contable sobre conversión de moneda extranjera
      setPolicyCell(sheet10, 'D18',
        `Las transacciones en moneda extranjera se convierten a la moneda funcional usando las tasas de cambio vigentes a la fecha de la transacción. Las partidas monetarias en moneda extranjera al cierre se convierten usando la tasa de cierre. Las diferencias en cambio se reconocen en el resultado del período, excepto las relacionadas con financiamiento de activos aptos.`
      );
      
      // Fila 19: Descripción de la política contable de la moneda funcional
      setPolicyCell(sheet10, 'D19',
        `La moneda funcional y de presentación de la entidad es el peso colombiano (COP), que es la moneda del entorno económico principal donde opera. Esta determinación se basa en que los ingresos, costos, financiamiento y operaciones se denominan principalmente en pesos colombianos.`
      );
      
      // Fila 20: Descripción de la política contable sobre plusvalía
      setPolicyCell(sheet10, 'D20',
        `La plusvalía surge de la adquisición de subsidiarias y representa el exceso del costo de adquisición sobre el valor razonable de los activos netos identificables adquiridos. Se mide posteriormente al costo menos pérdidas por deterioro acumuladas. No se amortiza pero se somete a pruebas de deterioro anuales.`
      );
      
      // Fila 21: Descripción de la política contable para subvenciones del gobierno
      setPolicyCell(sheet10, 'D21',
        `Las subvenciones gubernamentales se reconocen cuando existe seguridad razonable de que se cumplirán las condiciones y que se recibirá la subvención. Se reconocen en resultados sistemáticamente durante los períodos necesarios para asociarlas con los costos relacionados. Las subvenciones para activos se presentan reduciendo el valor en libros del activo o como ingreso diferido.`
      );
      
      // Fila 24: Descripción de la política contable sobre activos intangibles distintos a la plusvalía
      setPolicyCell(sheet10, 'D24',
        `Los activos intangibles adquiridos separadamente se miden al costo menos amortización y deterioro acumulados. La amortización se calcula por línea recta sobre la vida útil estimada. Los activos con vida útil indefinida no se amortizan pero se someten a pruebas de deterioro anuales. Los activos intangibles generados internamente, excepto costos de desarrollo que cumplan criterios específicos, se reconocen como gasto.`
      );
      
      // Fila 25: Descripción de la política contable sobre inversiones en asociadas
      setPolicyCell(sheet10, 'D25',
        `Las inversiones en asociadas se reconocen usando el método de participación patrimonial. Se miden inicialmente al costo y posteriormente se ajustan por la participación en los cambios del patrimonio de la asociada. Los dividendos recibidos reducen el valor en libros. Se evalúan indicadores de deterioro anualmente.`
      );
      
      // Fila 26: Descripción de la política contable para inversiones en negocios conjuntos
      setPolicyCell(sheet10, 'D26',
        `Las inversiones en negocios conjuntos se reconocen usando el método de participación patrimonial. Se miden inicialmente al costo incluyendo costos de transacción. Posteriormente se ajustan por la participación en los resultados y otros cambios en el patrimonio del negocio conjunto.`
      );
      
      // Fila 27: Descripción de la política contable sobre propiedades de inversión
      setPolicyCell(sheet10, 'D27',
        `Las propiedades de inversión son propiedades mantenidas para obtener rentas o apreciación de capital. Se reconocen inicialmente al costo incluyendo costos de transacción. Posteriormente se miden al modelo del costo (costo menos depreciación acumulada y deterioro). La depreciación se calcula por línea recta sobre la vida útil estimada de los edificios.`
      );
      
      // Fila 29: Descripción de la política contable sobre arrendamientos
      setPolicyCell(sheet10, 'D29',
        `Los arrendamientos se evalúan al inicio para determinar si transfieren sustancialmente los riesgos y beneficios. Los arrendamientos financieros se reconocen como activo y pasivo al menor entre el valor razonable y el valor presente de los pagos mínimos. Los arrendamientos operativos se reconocen como gasto de forma lineal durante el plazo del arrendamiento.`
      );
      
      // Fila 37: Descripción de la política contable sobre efectivo restringido
      setPolicyCell(sheet10, 'D37',
        `El efectivo restringido comprende fondos con restricciones de uso por compromisos contractuales, regulatorios o legales. Se clasifica como activo corriente o no corriente según el plazo de la restricción. Las restricciones incluyen fondos para garantías, depósitos en garantía, fondos especiales y recursos con destinación específica.`
      );
      
      // Fila 39: Descripción de la política contable sobre transacciones con partes relacionadas
      setPolicyCell(sheet10, 'D39',
        `Las transacciones con partes relacionadas se realizan en condiciones de mercado. Se consideran partes relacionadas: accionistas controlantes, subsidiarias, asociadas, directivos clave y sus familiares cercanos. Las transacciones y saldos pendientes se revelan en notas a los estados financieros según los requerimientos de la NIC 24.`
      );
      
      // Fila 41: Descripción de la política contable para inversiones en administración de liquidez
      setPolicyCell(sheet10, 'D41',
        `Las inversiones de administración de liquidez comprenden instrumentos financieros de alta liquidez fácilmente convertibles en efectivo, con vencimientos mayores a 90 días pero que no forman parte del capital de trabajo operativo. Se miden al costo amortizado o valor razonable según su clasificación y naturaleza del instrumento.`
      );
      
      // Fila 42: Descripción de la política contable sobre préstamos por cobrar
      setPolicyCell(sheet10, 'D42',
        `Los préstamos por cobrar se reconocen inicialmente al valor razonable más los costos de transacción directamente atribuibles. Posteriormente se miden al costo amortizado usando el método del interés efectivo, menos cualquier deterioro. Se evalúan para deterioro aplicando el modelo de pérdidas crediticias esperadas.`
      );
      
      // ===== POLÍTICAS CON "NA" (No Aplica) =====
      // Políticas que generalmente no aplican para empresas típicas de servicios públicos
      
      const politicasNA = [
        12, // Activos financieros disponibles para la venta (no comunes en servicios públicos)
        32, // Activos de petróleo y gas (no aplica a servicios públicos)
        36, // Gastos de investigación y desarrollo (no significativos)
        43, // Ingresos por contratos de construcción (no es contratista)
      ];
      
      for (const row of politicasNA) {
        setPolicyCell(sheet10, `D${row}`, 'NA');
      }
    }

    // ===============================================
    // HOJA11 (810000): Notas - Información de la entidad
    // y declaración de cumplimiento con el marco normativo
    // Similar a Hoja09 y Hoja10 - Columna E
    // ===============================================
    const sheet11 = workbook.Sheets['Hoja11'];
    
    if (sheet11) {
      // Función helper para establecer texto en celda
      const setInfoCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };
      
      // Fila 11: Información a revelar sobre notas y otra información explicativa [bloque de texto]
      // Referencia al archivo de notas HTML
      setInfoCell(sheet11, 'E11', 'Nota2.html');
      
      // Fila 12: Nombre de la controladora última del grupo
      // Usar el nombre de la empresa de las opciones
      setInfoCell(sheet11, 'E12', options.companyName || '');
      
      // Fila 13: Ciudad donde se encuentra ubicada la sede administrativa
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E13', '');
      
      // Fila 14: Dirección de la sede administrativa de la entidad
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E14', '');
      
      // Fila 15: Email institucional
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E15', '');
      
      // Fila 16: Declaración explícita y sin reservas de cumplimiento del Marco Normativo
      setInfoCell(sheet11, 'E16', 
        `La entidad declara que los presentes estados financieros han sido preparados de conformidad con el Marco Normativo para Entidades de Gobierno - Resolución 414 de 2014 de la Contaduría General de la Nación y sus modificaciones, el cual hace parte del Régimen de Contabilidad Pública. La entidad ha aplicado de manera consistente las políticas contables establecidas en dicho marco normativo.`
      );
      
      // Fila 17: Información sobre incertidumbres o cambios que comprometan su continuidad
      setInfoCell(sheet11, 'E17', 
        `A la fecha de emisión de los estados financieros, no existen incertidumbres significativas ni cambios ordenados que comprometan la continuidad de la entidad como supresión, fusión, escisión o liquidación. La entidad continúa operando como empresa de servicios públicos domiciliarios bajo las condiciones normales de operación.`
      );
      
      // Fila 18: Explicación de porqué no se presume que la actividad se llevara a cabo por tiempo indefinido
      setInfoCell(sheet11, 'E18', 'NA');
      
      // Fila 20: Información sobre incertidumbres sobre la capacidad de dar continuidad a servicios en RUPS
      setInfoCell(sheet11, 'E20', 
        `La entidad no presenta incertidumbres significativas sobre la capacidad de dar continuidad a la prestación de los servicios públicos de acueducto, alcantarillado y aseo inscritos en el Registro Único de Prestadores de Servicios Públicos (RUPS). Los servicios se prestan de manera continua conforme a las condiciones establecidas en los contratos de condiciones uniformes.`
      );
      
      // Fila 21: ¿Durante el período se informó finalizó la prestación de servicios en RUPS?
      setInfoCell(sheet11, 'E21', '2. No');
      
      // Fila 22: Detalle sobre la finalización de la prestación de servicios en RUPS
      setInfoCell(sheet11, 'E22', 'NA');
      
      // Fila 24: Explicación de los criterios de medición utilizados
      setInfoCell(sheet11, 'E24', 
        `Los criterios de medición utilizados para la preparación de los estados financieros incluyen: costo histórico para la mayoría de activos y pasivos, costo amortizado para instrumentos financieros, valor razonable para ciertos activos y pasivos financieros según lo requiere el marco normativo. Las estimaciones contables se basan en la mejor información disponible a la fecha del informe.`
      );
      
      // Fila 25: Descripción de otras políticas contables relevantes
      setInfoCell(sheet11, 'E25', 
        `Las políticas contables aplicadas son consistentes con las establecidas en la Resolución 414 de 2014 de la CGN. Se incluyen políticas sobre: reconocimiento de ingresos por servicios públicos, provisión por deterioro de cartera, depreciación de infraestructura de redes, tratamiento de subsidios y contribuciones, y beneficios a empleados. Las políticas se detallan en las notas específicas.`
      );
      
      // Fila 26: Explicación de supuestos realizados acerca del futuro y otras causas de incertidumbre
      setInfoCell(sheet11, 'E26', 
        `Las principales fuentes de incertidumbre en las estimaciones incluyen: vida útil de activos de infraestructura, deterioro de cartera morosa, provisiones por litigios y demandas, y obligaciones por beneficios posempleo. Los supuestos se revisan periódicamente y los ajustes se reconocen prospectivamente cuando corresponde.`
      );
      
      // Fila 28: ¿La entidad ha implementado programas relacionados con objetivos de desarrollo sostenible?
      setInfoCell(sheet11, 'E28', '2. No');
      
      // Fila 29: ¿La entidad prepara reportes de sostenibilidad?
      setInfoCell(sheet11, 'E29', '2. No');
      
      // Fila 30: Si lo presenta como reporte a una entidad de supervisión específica, ¿a cuál?
      setInfoCell(sheet11, 'E30', 'NA');
      
      // Fila 31: ¿La entidad cuenta con objetivos de desarrollo sostenible para el eje económico?
      setInfoCell(sheet11, 'E31', '2. No');
      
      // Fila 32: Mencione que indicadores calcula. Explique los elementos que componen cada indicador
      setInfoCell(sheet11, 'E32', 'NA');
    }
  }
  
  // Escribir el archivo modificado
  const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(newBuffer);
}

/**
 * Re-escribe los valores numéricos de Hoja2 y Hoja3 usando ExcelJS
 * 
 * Esta función se usa como paso adicional después de customizeExcelWithData
 * porque xlsx library puede no generar celdas compatibles con XBRL Express.
 * ExcelJS preserva mejor el formato original del archivo Excel.
 * 
 * @param xlsxBuffer - Buffer del archivo Excel ya procesado por xlsx
 * @param options - Opciones con datos financieros
 * @returns Promise<Buffer> - Buffer del archivo Excel con valores corregidos
 */
async function rewriteFinancialDataWithExcelJS(
  xlsxBuffer: Buffer, 
  options: TemplateWithDataOptions
): Promise<Buffer> {
  // Si no hay datos financieros, retornar el buffer sin cambios
  if (!options.consolidatedAccounts || options.consolidatedAccounts.length === 0) {
    return xlsxBuffer;
  }

  const workbook = new ExcelJS.Workbook();
  // Cargar el buffer - usamos any para evitar conflictos de tipos entre versiones de Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(xlsxBuffer as any);

  const serviceBalances = options.serviceBalances || [];
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  // Agrupar cuentas por servicio
  const accountsByService: Record<string, ServiceBalanceData[]> = {};
  for (const service of activeServices) {
    accountsByService[service] = serviceBalances.filter(sb => sb.service === service);
  }

  // Función helper para verificar si una cuenta coincide con los prefijos
  const matchesPrefixes = (code: string, prefixes: string[], excludes?: string[]): boolean => {
    if (excludes) {
      for (const exclude of excludes) {
        if (code.startsWith(exclude)) return false;
      }
    }
    for (const prefix of prefixes) {
      if (code.startsWith(prefix)) return true;
    }
    return false;
  };

  // Solo procesar R414 por ahora
  if (options.niifGroup === 'r414') {
    // ===============================================
    // HOJA2 (210000): Estado de Situación Financiera
    // ===============================================
    const sheet2 = workbook.getWorksheet('Hoja2');
    if (sheet2) {
      console.log('[ExcelJS] Escribiendo datos en Hoja2...');
      
      for (const mapping of R414_ESF_MAPPINGS) {
        // Calcular total consolidado
        let totalValue = 0;
        for (const account of options.consolidatedAccounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += account.value;
          }
        }

        // Escribir valor total en columna P (columna 16)
        if (totalValue !== 0) {
          const cell = sheet2.getCell(`P${mapping.row}`);
          cell.value = totalValue;
          console.log(`[ExcelJS] Hoja2!P${mapping.row} = ${totalValue}`);
        }

        // Escribir valores por servicio
        for (const service of activeServices) {
          const serviceColumn = R414_SERVICE_COLUMNS[service];
          if (!serviceColumn) continue;

          let serviceValue = 0;
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += account.value;
            }
          }

          if (serviceValue !== 0) {
            const cell = sheet2.getCell(`${serviceColumn}${mapping.row}`);
            cell.value = serviceValue;
            console.log(`[ExcelJS] Hoja2!${serviceColumn}${mapping.row} = ${serviceValue}`);
          }
        }
      }
    }

    // ===============================================
    // HOJA3 (310000): Estado de Resultados
    // ===============================================
    const sheet3 = workbook.getWorksheet('Hoja3');
    if (sheet3) {
      console.log('[ExcelJS] Escribiendo datos en Hoja3...');
      
      for (const mapping of R414_ER_MAPPINGS) {
        // Calcular total consolidado
        let totalValue = 0;
        for (const account of options.consolidatedAccounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += account.value;
          }
        }

        // Escribir valor total en columna L (columna 12) - SIEMPRE escribir, incluso si es 0
        const cellL = sheet3.getCell(`L${mapping.row}`);
        cellL.value = totalValue;
        if (totalValue !== 0) {
          console.log(`[ExcelJS] Hoja3!L${mapping.row} = ${totalValue}`);
        }

        // Escribir valores por servicio (E=Acueducto, F=Alcantarillado, G=Aseo)
        const erServiceColumns: Record<string, string> = {
          acueducto: 'E',
          alcantarillado: 'F',
          aseo: 'G'
        };

        for (const service of activeServices) {
          const serviceColumn = erServiceColumns[service];
          if (!serviceColumn) continue;

          let serviceValue = 0;
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += account.value;
            }
          }

          // SIEMPRE escribir el valor, incluso si es 0, para limpiar valores previos del template
          const cell = sheet3.getCell(`${serviceColumn}${mapping.row}`);
          cell.value = serviceValue;
          if (serviceValue !== 0) {
            console.log(`[ExcelJS] Hoja3!${serviceColumn}${mapping.row} = ${serviceValue}`);
          }
        }
      }
      
      // DEBUG: Verificar que las cuentas usadas para Hoja3.E18 son las mismas que Hoja16
      const acueductoAccounts3 = accountsByService['acueducto'] || [];
      let suma51 = 0, suma52 = 0;
      for (const account of acueductoAccounts3) {
        if (!account.isLeaf) continue;
        if (account.code.startsWith('51')) suma51 += account.value;
        if (account.code.startsWith('52')) suma52 += account.value;
      }
      console.log(`[ExcelJS] Hoja3 - DEBUG Acueducto: cuenta 51 = ${suma51}, cuenta 52 = ${suma52}, total = ${suma51 + suma52}`);
    }
  }

  // ===============================================
  // HOJA7 (800100): Notas - Subclasificaciones PPE
  // Solo para R414 - Columna F (consolidado)
  // ===============================================
  if (options.niifGroup === 'r414') {
    const sheet7 = workbook.getWorksheet('Hoja7');
    if (sheet7) {
      console.log('[ExcelJS] Escribiendo datos en Hoja7...');
      
      // Verificar que tenemos cuentas consolidadas
      const consolidatedAccounts = options.consolidatedAccounts || [];
      
      // Función helper para procesar una sección completa
      // Si hay al menos un valor != 0, llena con 0 las celdas vacías de la sección
      const processSectionWithZeroFill = (
        mappings: Array<{ row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }>,
        sectionName: string,
        allRowsInSection: number[] // Todas las filas de datos (sin autosumas)
      ) => {
        // Primero calcular todos los valores
        const rowValues: Map<number, number> = new Map();
        let hasAnyValue = false;
        
        for (const mapping of mappings) {
          let totalValue = 0;
          for (const account of consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              totalValue += account.value;
            }
          }
          
          if (mapping.useAbsoluteValue) {
            totalValue = Math.abs(totalValue);
          }
          
          rowValues.set(mapping.row, totalValue);
          if (totalValue !== 0) {
            hasAnyValue = true;
          }
        }
        
        // Si hay al menos un valor, escribir todos (incluyendo ceros)
        if (hasAnyValue) {
          console.log(`[ExcelJS] Sección ${sectionName}: hay valores, llenando celdas...`);
          
          for (const row of allRowsInSection) {
            const value = rowValues.get(row) ?? 0;
            const cell = sheet7.getCell(`F${row}`);
            cell.value = value;
            console.log(`[ExcelJS] Hoja7!F${row} = ${value}`);
          }
        } else {
          console.log(`[ExcelJS] Sección ${sectionName}: sin valores, omitiendo.`);
        }
      };

      // ===============================================
      // PPE - Propiedad, Planta y Equipo (filas 14-34)
      // Autosumas: 16, 22, 29, 31, 34
      // ===============================================
      const ppeDataRows = [14, 15, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 32, 33];
      processSectionWithZeroFill(R414_PPE_MAPPINGS, 'PPE', ppeDataRows);

      // ===============================================
      // Activos Intangibles y Plusvalía (filas 37-48)
      // Autosumas: 44, 48
      // ===============================================
      const intangiblesDataRows = [37, 38, 39, 40, 41, 42, 43, 45, 46, 47];
      processSectionWithZeroFill(R414_INTANGIBLES_MAPPINGS, 'Intangibles', intangiblesDataRows);

      // ===============================================
      // Efectivo y Equivalentes al Efectivo (filas 51-60)
      // Autosumas: 53, 58, 60
      // ===============================================
      const efectivoDataRows = [51, 52, 55, 56, 57, 59];
      processSectionWithZeroFill(R414_EFECTIVO_MAPPINGS, 'Efectivo', efectivoDataRows);

      // ===============================================
      // Clases de Otras Provisiones (filas 63-73)
      // Autosumas: 65, 69, 73
      // ===============================================
      const provisionesDataRows = [63, 64, 67, 68, 71, 72];
      processSectionWithZeroFill(R414_PROVISIONES_MAPPINGS, 'Provisiones', provisionesDataRows);

      // ===============================================
      // Otras Provisiones (filas 75-77)
      // Autosuma: 77
      // ===============================================
      const otrasProvisionesDataRows = [75, 76];
      processSectionWithZeroFill(R414_OTRAS_PROVISIONES_MAPPINGS, 'Otras Provisiones', otrasProvisionesDataRows);

      // ===============================================
      // Beneficios a Empleados (filas 79-83)
      // Autosuma: 83
      // ===============================================
      const beneficiosDataRows = [79, 80, 81, 82];
      processSectionWithZeroFill(R414_BENEFICIOS_EMPLEADOS_MAPPINGS, 'Beneficios Empleados', beneficiosDataRows);
    }

    // ===============================================
    // HOJA16 (900017a): Gastos del Servicio de Acueducto
    // Columna E = Gastos administrativos
    // Columna F = Gastos operativos (Costos de ventas)
    // Columna G = Autosuma E+F (no tocar)
    // ===============================================
    const sheet16 = workbook.getWorksheet('Hoja16');
    
    if (sheet16) {
      console.log('[ExcelJS] Escribiendo datos en Hoja16 (Gastos Acueducto)...');
      
      // Obtener cuentas del servicio de acueducto
      const acueductoAccounts = accountsByService['acueducto'] || [];
      
      // DEBUG: Ver cuántas cuentas hay y algunas de ejemplo
      console.log(`[ExcelJS] Hoja16 - Total cuentas acueducto: ${acueductoAccounts.length}`);
      const gastosAcueducto = acueductoAccounts.filter(a => a.code.startsWith('5'));
      console.log(`[ExcelJS] Hoja16 - Cuentas de gastos (clase 5): ${gastosAcueducto.length}`);
      if (gastosAcueducto.length > 0) {
        console.log(`[ExcelJS] Hoja16 - Ejemplos de gastos:`, gastosAcueducto.slice(0, 5).map(a => `${a.code}=${a.value}`).join(', '));
      }
      
      // Función helper para sumar cuentas por prefijos
      const sumByPrefixes16 = (accounts: typeof acueductoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
        let total = 0;
        for (const account of accounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
            total += account.value;
          }
        }
        return total;
      };
      
      // =====================================================
      // IMPORTANTE: Los gastos se dividen según la Hoja3:
      // - Gastos admin/op/ventas (Hoja3 fila 18): prefijos 51, 52
      // - Otros gastos (Hoja3 fila 22): prefijos 53, 54, 56, 58 (excluye financieros)
      // - Costos financieros (Hoja3 fila 20): prefijos 5802, 5803, 5807
      // 
      // La columna E de Hoja16 debe sumar = Hoja3.E18 + Hoja3.E22 + Hoja3.E20
      // La columna F de Hoja16 debe sumar = Hoja3.E15 (Costo de ventas)
      // =====================================================
      
      // =====================================================
      // COLUMNA E - TODOS LOS GASTOS (clase 5)
      // Incluye: Gastos admin (51,52) + Otros gastos (53,54,56,58) + Costos financieros
      // IMPORTANTE: Siempre escribir valores (incluso 0) para limpiar valores previos del template
      // =====================================================
      
      // Fila 13: Beneficios a empleados
      // PUC: 5101 Sueldos y salarios, 5103 Contribuciones efectivas, 
      //      5104 Aportes sobre la nómina, 5107 Prestaciones sociales, 5108 Gastos de personal diversos
      const beneficiosEmpleados = sumByPrefixes16(acueductoAccounts, ['5101', '5103', '5104', '5107', '5108']);
      sheet16.getCell('E13').value = beneficiosEmpleados;
      console.log(`[ExcelJS] Hoja16!E13 (Beneficios empleados) = ${beneficiosEmpleados}`);
      
      // Fila 14: Honorarios
      // PUC: 5110 Honorarios
      const honorarios = sumByPrefixes16(acueductoAccounts, ['5110']);
      sheet16.getCell('E14').value = honorarios;
      console.log(`[ExcelJS] Hoja16!E14 (Honorarios) = ${honorarios}`);
      
      // Fila 15: Impuestos, Tasas y Contribuciones (No incluye impuesto de renta)
      // PUC: 5120 Impuestos, contribuciones y tasas
      const impuestosTasas = sumByPrefixes16(acueductoAccounts, ['5120']);
      sheet16.getCell('E15').value = impuestosTasas;
      console.log(`[ExcelJS] Hoja16!E15 (Impuestos y tasas) = ${impuestosTasas}`);
      
      // Fila 16: Generales
      // PUC: 5111 Generales
      const generales = sumByPrefixes16(acueductoAccounts, ['5111']);
      sheet16.getCell('E16').value = generales;
      console.log(`[ExcelJS] Hoja16!E16 (Generales) = ${generales}`);
      
      // Fila 17: Deterioro
      // PUC: 5350 Deterioro de activos - Pertenece a "Otros gastos" (Hoja3 fila 22)
      const deterioro = sumByPrefixes16(acueductoAccounts, ['5350']);
      sheet16.getCell('E17').value = deterioro;
      console.log(`[ExcelJS] Hoja16!E17 (Deterioro) = ${deterioro}`);
      
      // Fila 18: Depreciación  
      // PUC: 5360 Depreciación - Pertenece a "Otros gastos" (Hoja3 fila 22)
      const depreciacion = sumByPrefixes16(acueductoAccounts, ['5360']);
      sheet16.getCell('E18').value = depreciacion;
      console.log(`[ExcelJS] Hoja16!E18 (Depreciación) = ${depreciacion}`);
      
      // Fila 19: Amortización
      // PUC: 5365 Amortización - Pertenece a "Otros gastos" (Hoja3 fila 22)
      const amortizacion = sumByPrefixes16(acueductoAccounts, ['5365']);
      sheet16.getCell('E19').value = amortizacion;
      console.log(`[ExcelJS] Hoja16!E19 (Amortización) = ${amortizacion}`);
      
      // =====================================================
      // PROVISIONES (Filas 20-24)
      // PUC: 5370 Provisiones diversas
      // =====================================================
      
      // Fila 20: Total provisiones (autosuma) - no tocar
      
      // Fila 21: Litigios y demandas
      const litigios = sumByPrefixes16(acueductoAccounts, ['537001', '537002']);
      sheet16.getCell('E21').value = litigios;
      
      // Fila 22: Garantías
      const garantias = sumByPrefixes16(acueductoAccounts, ['537003']);
      sheet16.getCell('E22').value = garantias;
      
      // Fila 23: Diversas (otras provisiones)
      const provisionesDiversas = sumByPrefixes16(acueductoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet16.getCell('E23').value = provisionesDiversas;
      
      // Fila 25: Arrendamientos
      // PUC: 5115 Arrendamientos, 5124 Arrendamiento operativo
      const arrendamientos = sumByPrefixes16(acueductoAccounts, ['5115', '5124']);
      sheet16.getCell('E25').value = arrendamientos;
      console.log(`[ExcelJS] Hoja16!E25 (Arrendamientos) = ${arrendamientos}`);
      
      // =====================================================
      // OTROS GASTOS (Filas 26-33)
      // Incluye costos financieros y otros gastos diversos
      // =====================================================
      
      // Fila 26: Total otros gastos (autosuma) - no tocar
      
      // Fila 27: Comisiones
      const comisiones = sumByPrefixes16(acueductoAccounts, ['5125']);
      sheet16.getCell('E27').value = comisiones;
      
      // Fila 28: Ajuste por diferencia en cambio
      const diferenciaEnCambio = sumByPrefixes16(acueductoAccounts, ['5807']);
      sheet16.getCell('E28').value = diferenciaEnCambio;
      
      // Fila 29: Financieros (Costos financieros - Hoja3 fila 20)
      const financieros = sumByPrefixes16(acueductoAccounts, ['5802', '5803']);
      sheet16.getCell('E29').value = financieros;
      console.log(`[ExcelJS] Hoja16!E29 (Financieros) = ${financieros}`);
      
      // Fila 30: Pérdidas por aplicación del método de participación patrimonial
      // PUC: 5815 - Pérdidas MPP (gasto)
      const perdidasMPP = sumByPrefixes16(acueductoAccounts, ['5815']);
      sheet16.getCell('E30').value = perdidasMPP;
      console.log(`[ExcelJS] Hoja16!E30 (Pérdidas MPP) = ${perdidasMPP}`);
      
      // Fila 31: Gastos diversos
      // PUC: 5195 Gastos diversos, 5895 Otros gastos
      const gastosDiversos = sumByPrefixes16(acueductoAccounts, ['5195', '5895']);
      sheet16.getCell('E31').value = gastosDiversos;
      console.log(`[ExcelJS] Hoja16!E31 (Gastos diversos) = ${gastosDiversos}`);
      
      // Fila 32: Donaciones
      // PUC: 5423 Donaciones
      const donaciones = sumByPrefixes16(acueductoAccounts, ['5423']);
      sheet16.getCell('E32').value = donaciones;
      console.log(`[ExcelJS] Hoja16!E32 (Donaciones) = ${donaciones}`);
      
      // =====================================================
      // GANANCIAS (Fila 33) - Si hay ganancias por MPP van aquí
      // PUC: 4815 - Ganancias por método de participación patrimonial (ingreso)
      // Nota: Se muestra como valor NEGATIVO para restar del total de gastos
      // =====================================================
      const gananciasMPP = sumByPrefixes16(acueductoAccounts, ['4815']);
      if (gananciasMPP !== 0) {
        // Las ganancias se muestran como valor negativo en hoja de gastos
        sheet16.getCell('E33').value = -gananciasMPP;
        console.log(`[ExcelJS] Hoja16!E33 (Ganancias MPP) = ${-gananciasMPP}`);
      } else {
        sheet16.getCell('E33').value = 0;
      }
      
      // =====================================================
      // IMPUESTOS A LAS GANANCIAS (Filas 34-35)
      // =====================================================
      
      // Fila 34: Impuesto a las ganancias corrientes
      // PUC: 540101 Impuesto de renta corriente
      const impuestoRentaCorriente = sumByPrefixes16(acueductoAccounts, ['540101']);
      sheet16.getCell('E34').value = impuestoRentaCorriente;
      console.log(`[ExcelJS] Hoja16!E34 (Imp. renta corriente) = ${impuestoRentaCorriente}`);
      
      // Fila 35: Impuesto a las ganancias diferido
      // PUC: 5410 (excepto 540101)
      const impuestoRentaDiferido = sumByPrefixes16(acueductoAccounts, ['5410'], ['540101']);
      sheet16.getCell('E35').value = impuestoRentaDiferido;
      console.log(`[ExcelJS] Hoja16!E35 (Imp. renta diferido) = ${impuestoRentaDiferido}`);
      
      // =====================================================
      // SERVICIOS PÚBLICOS, MANTENIMIENTO, SEGUROS, OTROS
      // Estos son parte de 51xx, así que SÍ van en columna E
      // =====================================================
      
      // Fila 72: Órdenes y contratos de mantenimiento y reparaciones
      // PUC: 5140 Mantenimiento, 5145 Reparaciones
      const mantenimiento = sumByPrefixes16(acueductoAccounts, ['5140', '5145']);
      sheet16.getCell('E72').value = mantenimiento;
      console.log(`[ExcelJS] Hoja16!E72 (Mantenimiento) = ${mantenimiento}`);
      
      // Fila 77: Servicios públicos
      // PUC: 5135 Servicios públicos
      const serviciosPublicos = sumByPrefixes16(acueductoAccounts, ['5135']);
      sheet16.getCell('E77').value = serviciosPublicos;
      console.log(`[ExcelJS] Hoja16!E77 (Servicios públicos) = ${serviciosPublicos}`);
      
      // Fila 80: Seguros
      // PUC: 5130 Seguros
      const seguros = sumByPrefixes16(acueductoAccounts, ['5130']);
      sheet16.getCell('E80').value = seguros;
      console.log(`[ExcelJS] Hoja16!E80 (Seguros) = ${seguros}`);
      
      // Fila 81: Órdenes y contratos por otros servicios
      // PUC: 5150 Servicios, 5155 Servicios de aseo, vigilancia y otros
      const otrosContratos = sumByPrefixes16(acueductoAccounts, ['5150', '5155']);
      sheet16.getCell('E81').value = otrosContratos;
      console.log(`[ExcelJS] Hoja16!E81 (Otros contratos) = ${otrosContratos}`);
      
      // =====================================================
      // COLUMNA F - GASTOS OPERATIVOS / COSTOS DE VENTAS
      // PUC: Clase 6 - Costos de ventas
      // Todos van a la fila 72 "Órdenes y contratos de mantenimiento"
      // =====================================================
      
      const costosVentasTotal = sumByPrefixes16(acueductoAccounts, ['6']);
      sheet16.getCell('F72').value = costosVentasTotal;
      console.log(`[ExcelJS] Hoja16!F72 (Costos de ventas total) = ${costosVentasTotal}`);
      
      // Limpiar otras celdas de la columna F que puedan tener valores previos
      // (filas 13-35 y otras que puedan tener datos del template)
      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 77, 80, 81]) {
        sheet16.getCell(`F${row}`).value = 0;
      }
      
      // =====================================================
      // COLUMNA G - TOTAL (E + F)
      // Suma de gastos administrativos + gastos operativos por fila
      // =====================================================
      const filasConDatos16 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
      for (const row of filasConDatos16) {
        const valorE = sheet16.getCell(`E${row}`).value as number || 0;
        const valorF = sheet16.getCell(`F${row}`).value as number || 0;
        sheet16.getCell(`G${row}`).value = valorE + valorF;
      }
      console.log(`[ExcelJS] Hoja16 - Columna G (E+F) calculada para ${filasConDatos16.length} filas`);
      
      // DEBUG: Mostrar totales para verificar
      const totalGastosAdmin = sumByPrefixes16(acueductoAccounts, ['51', '52']);
      const totalOtrosGastos = sumByPrefixes16(acueductoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
      const totalCostosFinancieros = sumByPrefixes16(acueductoAccounts, ['5802', '5803', '5807']);
      const totalGastosHoja16 = totalGastosAdmin + totalOtrosGastos + totalCostosFinancieros;
      console.log(`[ExcelJS] Hoja16 - Verificación de totales:`);
      console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin}`);
      console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos}`);
      console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros}`);
      console.log(`[ExcelJS]   TOTAL GASTOS HOJA16 columna E = ${totalGastosHoja16}`);
      console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal}`);
      
      // DEBUG: Mostrar TODAS las cuentas 51 y 52 para verificar cobertura
      const prefixesCubiertos = [
        '5101', '5103', '5104', '5107', '5108', // Beneficios empleados
        '5110', // Honorarios
        '5120', // Impuestos y tasas
        '5111', // Generales
        '5115', '5124', // Arrendamientos
        '5140', '5145', // Mantenimiento
        '5135', // Servicios públicos
        '5130', // Seguros
        '5150', '5155', // Otros contratos
      ];
      
      // Encontrar cuentas 51/52 que NO están cubiertas por los mapeos
      const cuentasNoCubiertas: Array<{code: string; value: number}> = [];
      let totalNoCubierto = 0;
      for (const account of acueductoAccounts) {
        if (!account.isLeaf) continue;
        if ((account.code.startsWith('51') || account.code.startsWith('52'))) {
          // Verificar si está cubierta por alguno de los prefijos
          const estaCubierta = prefixesCubiertos.some(prefix => account.code.startsWith(prefix));
          if (!estaCubierta) {
            cuentasNoCubiertas.push({ code: account.code, value: account.value });
            totalNoCubierto += account.value;
          }
        }
      }
      
      if (cuentasNoCubiertas.length > 0) {
        console.log(`[ExcelJS] ⚠️ ATENCIÓN: ${cuentasNoCubiertas.length} cuentas 51/52 NO CUBIERTAS por mapeos:`);
        for (const cuenta of cuentasNoCubiertas) {
          console.log(`[ExcelJS]   - ${cuenta.code} = ${cuenta.value}`);
        }
        console.log(`[ExcelJS]   Total no cubierto: ${totalNoCubierto}`);
      } else {
        console.log(`[ExcelJS] ✓ Todas las cuentas 51/52 están cubiertas por los mapeos`);
      }
      
      console.log('[ExcelJS] Hoja16 completada.');
    }
    
    // ===============================================
    // HOJA17 (900017b): Gastos del Servicio de Alcantarillado
    // Columna E = Gastos administrativos
    // Columna F = Gastos operativos (Costos de ventas)
    // Los valores deben coincidir con Hoja3 columna F
    // ===============================================
    const sheet17 = workbook.getWorksheet('Hoja17');
    
    if (sheet17) {
      console.log('[ExcelJS] Escribiendo datos en Hoja17 (Gastos Alcantarillado)...');
      
      // Obtener cuentas del servicio de alcantarillado
      const alcantarilladoAccounts = accountsByService['alcantarillado'] || [];
      
      // DEBUG: Ver cuántas cuentas hay
      console.log(`[ExcelJS] Hoja17 - Total cuentas alcantarillado: ${alcantarilladoAccounts.length}`);
      const gastosAlcantarillado = alcantarilladoAccounts.filter(a => a.code.startsWith('5'));
      console.log(`[ExcelJS] Hoja17 - Cuentas de gastos (clase 5): ${gastosAlcantarillado.length}`);
      
      // Función helper para sumar cuentas por prefijos
      const sumByPrefixes17 = (accounts: typeof alcantarilladoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
        let total = 0;
        for (const account of accounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
            total += account.value;
          }
        }
        return total;
      };
      
      // =====================================================
      // COLUMNA E - TODOS LOS GASTOS (clase 5)
      // Incluye: Gastos admin (51,52) + Otros gastos (53,54,56,58) + Costos financieros
      // =====================================================
      
      // Fila 13: Beneficios a empleados
      const beneficiosEmpleados17 = sumByPrefixes17(alcantarilladoAccounts, ['5101', '5103', '5104', '5107', '5108']);
      sheet17.getCell('E13').value = beneficiosEmpleados17;
      console.log(`[ExcelJS] Hoja17!E13 (Beneficios empleados) = ${beneficiosEmpleados17}`);
      
      // Fila 14: Honorarios
      const honorarios17 = sumByPrefixes17(alcantarilladoAccounts, ['5110']);
      sheet17.getCell('E14').value = honorarios17;
      console.log(`[ExcelJS] Hoja17!E14 (Honorarios) = ${honorarios17}`);
      
      // Fila 15: Impuestos, Tasas y Contribuciones
      const impuestosTasas17 = sumByPrefixes17(alcantarilladoAccounts, ['5120']);
      sheet17.getCell('E15').value = impuestosTasas17;
      console.log(`[ExcelJS] Hoja17!E15 (Impuestos y tasas) = ${impuestosTasas17}`);
      
      // Fila 16: Generales
      const generales17 = sumByPrefixes17(alcantarilladoAccounts, ['5111']);
      sheet17.getCell('E16').value = generales17;
      console.log(`[ExcelJS] Hoja17!E16 (Generales) = ${generales17}`);
      
      // Fila 17: Deterioro
      const deterioro17 = sumByPrefixes17(alcantarilladoAccounts, ['5350']);
      sheet17.getCell('E17').value = deterioro17;
      console.log(`[ExcelJS] Hoja17!E17 (Deterioro) = ${deterioro17}`);
      
      // Fila 18: Depreciación
      const depreciacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5360']);
      sheet17.getCell('E18').value = depreciacion17;
      console.log(`[ExcelJS] Hoja17!E18 (Depreciación) = ${depreciacion17}`);
      
      // Fila 19: Amortización
      const amortizacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5365']);
      sheet17.getCell('E19').value = amortizacion17;
      console.log(`[ExcelJS] Hoja17!E19 (Amortización) = ${amortizacion17}`);
      
      // =====================================================
      // PROVISIONES (Filas 20-24)
      // =====================================================
      
      // Fila 21: Litigios y demandas
      const litigios17 = sumByPrefixes17(alcantarilladoAccounts, ['537001', '537002']);
      sheet17.getCell('E21').value = litigios17;
      
      // Fila 22: Garantías
      const garantias17 = sumByPrefixes17(alcantarilladoAccounts, ['537003']);
      sheet17.getCell('E22').value = garantias17;
      
      // Fila 23: Diversas (otras provisiones)
      const provisionesDiversas17 = sumByPrefixes17(alcantarilladoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet17.getCell('E23').value = provisionesDiversas17;
      
      // Fila 25: Arrendamientos
      const arrendamientos17 = sumByPrefixes17(alcantarilladoAccounts, ['5115', '5124']);
      sheet17.getCell('E25').value = arrendamientos17;
      console.log(`[ExcelJS] Hoja17!E25 (Arrendamientos) = ${arrendamientos17}`);
      
      // =====================================================
      // OTROS GASTOS (Filas 26-33)
      // =====================================================
      
      // Fila 27: Comisiones
      const comisiones17 = sumByPrefixes17(alcantarilladoAccounts, ['5125']);
      sheet17.getCell('E27').value = comisiones17;
      
      // Fila 28: Ajuste por diferencia en cambio
      const diferenciaEnCambio17 = sumByPrefixes17(alcantarilladoAccounts, ['5807']);
      sheet17.getCell('E28').value = diferenciaEnCambio17;
      
      // Fila 29: Financieros (Costos financieros)
      const financieros17 = sumByPrefixes17(alcantarilladoAccounts, ['5802', '5803']);
      sheet17.getCell('E29').value = financieros17;
      console.log(`[ExcelJS] Hoja17!E29 (Financieros) = ${financieros17}`);
      
      // Fila 30: Pérdidas por aplicación del método de participación patrimonial
      const perdidasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['5815']);
      sheet17.getCell('E30').value = perdidasMPP17;
      console.log(`[ExcelJS] Hoja17!E30 (Pérdidas MPP) = ${perdidasMPP17}`);
      
      // Fila 31: Gastos diversos
      const gastosDiversos17 = sumByPrefixes17(alcantarilladoAccounts, ['5195', '5895']);
      sheet17.getCell('E31').value = gastosDiversos17;
      console.log(`[ExcelJS] Hoja17!E31 (Gastos diversos) = ${gastosDiversos17}`);
      
      // Fila 32: Donaciones
      const donaciones17 = sumByPrefixes17(alcantarilladoAccounts, ['5423']);
      sheet17.getCell('E32').value = donaciones17;
      console.log(`[ExcelJS] Hoja17!E32 (Donaciones) = ${donaciones17}`);
      
      // Fila 33: Ganancias por MPP (negativo)
      const gananciasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['4815']);
      sheet17.getCell('E33').value = gananciasMPP17 !== 0 ? -gananciasMPP17 : 0;
      if (gananciasMPP17 !== 0) {
        console.log(`[ExcelJS] Hoja17!E33 (Ganancias MPP) = ${-gananciasMPP17}`);
      }
      
      // =====================================================
      // IMPUESTOS A LAS GANANCIAS (Filas 34-35)
      // =====================================================
      
      // Fila 34: Impuesto a las ganancias corrientes
      const impuestoRentaCorriente17 = sumByPrefixes17(alcantarilladoAccounts, ['540101']);
      sheet17.getCell('E34').value = impuestoRentaCorriente17;
      console.log(`[ExcelJS] Hoja17!E34 (Imp. renta corriente) = ${impuestoRentaCorriente17}`);
      
      // Fila 35: Impuesto a las ganancias diferido
      const impuestoRentaDiferido17 = sumByPrefixes17(alcantarilladoAccounts, ['5410'], ['540101']);
      sheet17.getCell('E35').value = impuestoRentaDiferido17;
      console.log(`[ExcelJS] Hoja17!E35 (Imp. renta diferido) = ${impuestoRentaDiferido17}`);
      
      // =====================================================
      // SERVICIOS PÚBLICOS, MANTENIMIENTO, SEGUROS, OTROS
      // =====================================================
      
      // Fila 72: Órdenes y contratos de mantenimiento y reparaciones
      const mantenimiento17 = sumByPrefixes17(alcantarilladoAccounts, ['5140', '5145']);
      sheet17.getCell('E72').value = mantenimiento17;
      console.log(`[ExcelJS] Hoja17!E72 (Mantenimiento) = ${mantenimiento17}`);
      
      // Fila 77: Servicios públicos
      const serviciosPublicos17 = sumByPrefixes17(alcantarilladoAccounts, ['5135']);
      sheet17.getCell('E77').value = serviciosPublicos17;
      console.log(`[ExcelJS] Hoja17!E77 (Servicios públicos) = ${serviciosPublicos17}`);
      
      // Fila 80: Seguros
      const seguros17 = sumByPrefixes17(alcantarilladoAccounts, ['5130']);
      sheet17.getCell('E80').value = seguros17;
      console.log(`[ExcelJS] Hoja17!E80 (Seguros) = ${seguros17}`);
      
      // Fila 81: Órdenes y contratos por otros servicios
      const otrosContratos17 = sumByPrefixes17(alcantarilladoAccounts, ['5150', '5155']);
      sheet17.getCell('E81').value = otrosContratos17;
      console.log(`[ExcelJS] Hoja17!E81 (Otros contratos) = ${otrosContratos17}`);
      
      // =====================================================
      // COLUMNA F - GASTOS OPERATIVOS / COSTOS DE VENTAS
      // PUC: Clase 6 - Costos de ventas
      // =====================================================
      
      const costosVentasTotal17 = sumByPrefixes17(alcantarilladoAccounts, ['6']);
      sheet17.getCell('F72').value = costosVentasTotal17;
      console.log(`[ExcelJS] Hoja17!F72 (Costos de ventas total) = ${costosVentasTotal17}`);
      
      // Limpiar otras celdas de la columna F
      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 77, 80, 81]) {
        sheet17.getCell(`F${row}`).value = 0;
      }
      
      // =====================================================
      // COLUMNA G - TOTAL (E + F)
      // Suma de gastos administrativos + gastos operativos por fila
      // =====================================================
      const filasConDatos17 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
      for (const row of filasConDatos17) {
        const valorE = sheet17.getCell(`E${row}`).value as number || 0;
        const valorF = sheet17.getCell(`F${row}`).value as number || 0;
        sheet17.getCell(`G${row}`).value = valorE + valorF;
      }
      console.log(`[ExcelJS] Hoja17 - Columna G (E+F) calculada para ${filasConDatos17.length} filas`);
      
      // DEBUG: Mostrar totales para verificar con Hoja3.F
      const totalGastosAdmin17 = sumByPrefixes17(alcantarilladoAccounts, ['51', '52']);
      const totalOtrosGastos17 = sumByPrefixes17(alcantarilladoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
      const totalCostosFinancieros17 = sumByPrefixes17(alcantarilladoAccounts, ['5802', '5803', '5807']);
      const totalGastosHoja17 = totalGastosAdmin17 + totalOtrosGastos17 + totalCostosFinancieros17;
      console.log(`[ExcelJS] Hoja17 - Verificación de totales (debe coincidir con Hoja3.F):`);
      console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin17} (Hoja3.F18)`);
      console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos17} (Hoja3.F22)`);
      console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros17} (Hoja3.F20)`);
      console.log(`[ExcelJS]   TOTAL GASTOS HOJA17 columna E = ${totalGastosHoja17}`);
      console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal17} (Hoja3.F15)`);
      
      console.log('[ExcelJS] Hoja17 completada.');
    }
    
    // ===============================================
    // HOJA18 (900017c): Gastos del Servicio de Aseo
    // Columna E = Gastos administrativos
    // Columna F = Gastos operativos (Costos de ventas)
    // Los valores deben coincidir con Hoja3 columna G
    // 
    // DISTRIBUCIÓN ESPECIAL DE COSTOS DE VENTAS:
    // - Fila 72 (Mantenimiento): 40%
    // - Fila 73 (Disposición final): 60%
    // ===============================================
    const sheet18 = workbook.getWorksheet('Hoja18');
    
    if (sheet18) {
      console.log('[ExcelJS] Escribiendo datos en Hoja18 (Gastos Aseo)...');
      
      // Obtener cuentas del servicio de aseo
      const aseoAccounts = accountsByService['aseo'] || [];
      
      // DEBUG: Ver cuántas cuentas hay
      console.log(`[ExcelJS] Hoja18 - Total cuentas aseo: ${aseoAccounts.length}`);
      const gastosAseo = aseoAccounts.filter(a => a.code.startsWith('5'));
      console.log(`[ExcelJS] Hoja18 - Cuentas de gastos (clase 5): ${gastosAseo.length}`);
      
      // Función helper para sumar cuentas por prefijos
      const sumByPrefixes18 = (accounts: typeof aseoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
        let total = 0;
        for (const account of accounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
            total += account.value;
          }
        }
        return total;
      };
      
      // =====================================================
      // COLUMNA E - TODOS LOS GASTOS (clase 5)
      // Incluye: Gastos admin (51,52) + Otros gastos (53,54,56,58) + Costos financieros
      // =====================================================
      
      // Fila 13: Beneficios a empleados
      const beneficiosEmpleados18 = sumByPrefixes18(aseoAccounts, ['5101', '5103', '5104', '5107', '5108']);
      sheet18.getCell('E13').value = beneficiosEmpleados18;
      console.log(`[ExcelJS] Hoja18!E13 (Beneficios empleados) = ${beneficiosEmpleados18}`);
      
      // Fila 14: Honorarios
      const honorarios18 = sumByPrefixes18(aseoAccounts, ['5110']);
      sheet18.getCell('E14').value = honorarios18;
      console.log(`[ExcelJS] Hoja18!E14 (Honorarios) = ${honorarios18}`);
      
      // Fila 15: Impuestos, Tasas y Contribuciones
      const impuestosTasas18 = sumByPrefixes18(aseoAccounts, ['5120']);
      sheet18.getCell('E15').value = impuestosTasas18;
      console.log(`[ExcelJS] Hoja18!E15 (Impuestos y tasas) = ${impuestosTasas18}`);
      
      // Fila 16: Generales
      const generales18 = sumByPrefixes18(aseoAccounts, ['5111']);
      sheet18.getCell('E16').value = generales18;
      console.log(`[ExcelJS] Hoja18!E16 (Generales) = ${generales18}`);
      
      // Fila 17: Deterioro
      const deterioro18 = sumByPrefixes18(aseoAccounts, ['5350']);
      sheet18.getCell('E17').value = deterioro18;
      console.log(`[ExcelJS] Hoja18!E17 (Deterioro) = ${deterioro18}`);
      
      // Fila 18: Depreciación
      const depreciacion18 = sumByPrefixes18(aseoAccounts, ['5360']);
      sheet18.getCell('E18').value = depreciacion18;
      console.log(`[ExcelJS] Hoja18!E18 (Depreciación) = ${depreciacion18}`);
      
      // Fila 19: Amortización
      const amortizacion18 = sumByPrefixes18(aseoAccounts, ['5365']);
      sheet18.getCell('E19').value = amortizacion18;
      console.log(`[ExcelJS] Hoja18!E19 (Amortización) = ${amortizacion18}`);
      
      // =====================================================
      // PROVISIONES (Filas 20-24)
      // =====================================================
      
      // Fila 21: Litigios y demandas
      const litigios18 = sumByPrefixes18(aseoAccounts, ['537001', '537002']);
      sheet18.getCell('E21').value = litigios18;
      
      // Fila 22: Garantías
      const garantias18 = sumByPrefixes18(aseoAccounts, ['537003']);
      sheet18.getCell('E22').value = garantias18;
      
      // Fila 23: Diversas (otras provisiones)
      const provisionesDiversas18 = sumByPrefixes18(aseoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet18.getCell('E23').value = provisionesDiversas18;
      
      // Fila 25: Arrendamientos
      const arrendamientos18 = sumByPrefixes18(aseoAccounts, ['5115', '5124']);
      sheet18.getCell('E25').value = arrendamientos18;
      console.log(`[ExcelJS] Hoja18!E25 (Arrendamientos) = ${arrendamientos18}`);
      
      // =====================================================
      // OTROS GASTOS (Filas 26-33)
      // =====================================================
      
      // Fila 27: Comisiones
      const comisiones18 = sumByPrefixes18(aseoAccounts, ['5125']);
      sheet18.getCell('E27').value = comisiones18;
      
      // Fila 28: Ajuste por diferencia en cambio
      const diferenciaEnCambio18 = sumByPrefixes18(aseoAccounts, ['5807']);
      sheet18.getCell('E28').value = diferenciaEnCambio18;
      
      // Fila 29: Financieros (Costos financieros)
      const financieros18 = sumByPrefixes18(aseoAccounts, ['5802', '5803']);
      sheet18.getCell('E29').value = financieros18;
      console.log(`[ExcelJS] Hoja18!E29 (Financieros) = ${financieros18}`);
      
      // Fila 30: Pérdidas por aplicación del método de participación patrimonial
      const perdidasMPP18 = sumByPrefixes18(aseoAccounts, ['5815']);
      sheet18.getCell('E30').value = perdidasMPP18;
      console.log(`[ExcelJS] Hoja18!E30 (Pérdidas MPP) = ${perdidasMPP18}`);
      
      // Fila 31: Gastos diversos
      const gastosDiversos18 = sumByPrefixes18(aseoAccounts, ['5195', '5895']);
      sheet18.getCell('E31').value = gastosDiversos18;
      console.log(`[ExcelJS] Hoja18!E31 (Gastos diversos) = ${gastosDiversos18}`);
      
      // Fila 32: Donaciones
      const donaciones18 = sumByPrefixes18(aseoAccounts, ['5423']);
      sheet18.getCell('E32').value = donaciones18;
      console.log(`[ExcelJS] Hoja18!E32 (Donaciones) = ${donaciones18}`);
      
      // Fila 33: Ganancias por MPP (negativo)
      const gananciasMPP18 = sumByPrefixes18(aseoAccounts, ['4815']);
      sheet18.getCell('E33').value = gananciasMPP18 !== 0 ? -gananciasMPP18 : 0;
      if (gananciasMPP18 !== 0) {
        console.log(`[ExcelJS] Hoja18!E33 (Ganancias MPP) = ${-gananciasMPP18}`);
      }
      
      // =====================================================
      // IMPUESTOS A LAS GANANCIAS (Filas 34-35)
      // =====================================================
      
      // Fila 34: Impuesto a las ganancias corrientes
      const impuestoRentaCorriente18 = sumByPrefixes18(aseoAccounts, ['540101']);
      sheet18.getCell('E34').value = impuestoRentaCorriente18;
      console.log(`[ExcelJS] Hoja18!E34 (Imp. renta corriente) = ${impuestoRentaCorriente18}`);
      
      // Fila 35: Impuesto a las ganancias diferido
      const impuestoRentaDiferido18 = sumByPrefixes18(aseoAccounts, ['5410'], ['540101']);
      sheet18.getCell('E35').value = impuestoRentaDiferido18;
      console.log(`[ExcelJS] Hoja18!E35 (Imp. renta diferido) = ${impuestoRentaDiferido18}`);
      
      // =====================================================
      // SERVICIOS PÚBLICOS, MANTENIMIENTO, SEGUROS, OTROS
      // =====================================================
      
      // Fila 72: Órdenes y contratos de mantenimiento y reparaciones
      const mantenimiento18 = sumByPrefixes18(aseoAccounts, ['5140', '5145']);
      sheet18.getCell('E72').value = mantenimiento18;
      console.log(`[ExcelJS] Hoja18!E72 (Mantenimiento) = ${mantenimiento18}`);
      
      // Fila 77: Servicios públicos
      const serviciosPublicos18 = sumByPrefixes18(aseoAccounts, ['5135']);
      sheet18.getCell('E77').value = serviciosPublicos18;
      console.log(`[ExcelJS] Hoja18!E77 (Servicios públicos) = ${serviciosPublicos18}`);
      
      // Fila 80: Seguros
      const seguros18 = sumByPrefixes18(aseoAccounts, ['5130']);
      sheet18.getCell('E80').value = seguros18;
      console.log(`[ExcelJS] Hoja18!E80 (Seguros) = ${seguros18}`);
      
      // Fila 81: Órdenes y contratos por otros servicios
      const otrosContratos18 = sumByPrefixes18(aseoAccounts, ['5150', '5155']);
      sheet18.getCell('E81').value = otrosContratos18;
      console.log(`[ExcelJS] Hoja18!E81 (Otros contratos) = ${otrosContratos18}`);
      
      // =====================================================
      // COLUMNA F - GASTOS OPERATIVOS / COSTOS DE VENTAS
      // PUC: Clase 6 - Costos de ventas
      // 
      // DISTRIBUCIÓN ESPECIAL PARA SERVICIO DE ASEO:
      // - Fila 72 (Mantenimiento): 40%
      // - Fila 74 (Disposición final): 60%
      // =====================================================
      
      const costosVentasTotal18 = sumByPrefixes18(aseoAccounts, ['6']);
      
      // Calcular distribución: 40% mantenimiento, 60% disposición final
      const costosMantenimiento18 = Math.round(costosVentasTotal18 * 0.40);
      const costosDisposicionFinal18 = costosVentasTotal18 - costosMantenimiento18; // Resto para evitar errores de redondeo
      
      sheet18.getCell('F72').value = costosMantenimiento18;
      sheet18.getCell('F74').value = costosDisposicionFinal18;
      
      console.log(`[ExcelJS] Hoja18 - Costos de ventas total: ${costosVentasTotal18}`);
      console.log(`[ExcelJS] Hoja18!F72 (Mantenimiento 40%) = ${costosMantenimiento18}`);
      console.log(`[ExcelJS] Hoja18!F74 (Disposición final 60%) = ${costosDisposicionFinal18}`);
      
      // Limpiar otras celdas de la columna F (incluyendo F73 que antes tenía datos)
      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 73, 77, 80, 81]) {
        sheet18.getCell(`F${row}`).value = 0;
      }
      
      // =====================================================
      // COLUMNA G - TOTAL (E + F)
      // Suma de gastos administrativos + gastos operativos por fila
      // Nota: Incluye fila 74 para disposición final
      // =====================================================
      const filasConDatos18 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 74, 77, 80, 81];
      for (const row of filasConDatos18) {
        const valorE = sheet18.getCell(`E${row}`).value as number || 0;
        const valorF = sheet18.getCell(`F${row}`).value as number || 0;
        sheet18.getCell(`G${row}`).value = valorE + valorF;
      }
      console.log(`[ExcelJS] Hoja18 - Columna G (E+F) calculada para ${filasConDatos18.length} filas`);
      
      // DEBUG: Mostrar totales para verificar con Hoja3.G
      const totalGastosAdmin18 = sumByPrefixes18(aseoAccounts, ['51', '52']);
      const totalOtrosGastos18 = sumByPrefixes18(aseoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
      const totalCostosFinancieros18 = sumByPrefixes18(aseoAccounts, ['5802', '5803', '5807']);
      const totalGastosHoja18 = totalGastosAdmin18 + totalOtrosGastos18 + totalCostosFinancieros18;
      console.log(`[ExcelJS] Hoja18 - Verificación de totales (debe coincidir con Hoja3.G):`);
      console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin18} (Hoja3.G18)`);
      console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos18} (Hoja3.G22)`);
      console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros18} (Hoja3.G20)`);
      console.log(`[ExcelJS]   TOTAL GASTOS HOJA18 columna E = ${totalGastosHoja18}`);
      console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal18} (Hoja3.G15)`);
      console.log(`[ExcelJS]     -> F72 (40%): ${costosMantenimiento18}`);
      console.log(`[ExcelJS]     -> F74 (60%): ${costosDisposicionFinal18}`);
      
      console.log('[ExcelJS] Hoja18 completada.');
    }
    
    // ===============================================
    // HOJA22 (900017g): Gastos Consolidados de Todos los Servicios
    // ===============================================
    // IMPORTANTE: Hoja22 tiene la misma estructura que Hojas 16, 17, 18
    // PERO está desplazada una fila más abajo (empieza en fila 14, no 13)
    // 
    // Columnas:
    // - E = Gastos administrativos (Total servicios públicos)
    // - F = Gastos operativos/costos de ventas (Total servicios públicos)
    // - G = E + F
    // - K = Gastos administrativos (Otras actividades - mismo que E por ahora)
    // - L = Gastos operativos (Otras actividades - mismo que F por ahora)
    // - M = K + L
    // 
    // FILAS DE DATOS (Hoja22 empieza en 14, Hojas 16/17/18 en 13):
    // Hoja22: 14-20; 22-24; 26; 28-33; 35-36; 38-50; 53-63; 66-71; 73-82
    // Hojas 16/17/18: 13-19; 21-23; 25; 27-32; 34-35; etc.
    // ===============================================
    const sheet22 = workbook.getWorksheet('Hoja22');
    
    if (sheet22 && sheet16 && sheet17 && sheet18) {
      console.log('[ExcelJS] Escribiendo datos en Hoja22 (Gastos Consolidados)...');
      
      // Mapeo de filas: Hojas 16/17/18 (fila origen) -> Hoja22 (fila destino)
      // Hoja22 está desplazada +1 fila respecto a las demás hojas
      const mapeoFilas: Array<{origen: number; destino: number}> = [
        // Gastos principales (13-19 -> 14-20)
        { origen: 13, destino: 14 }, // Beneficios a empleados
        { origen: 14, destino: 15 }, // Honorarios
        { origen: 15, destino: 16 }, // Impuestos, Tasas y Contribuciones
        { origen: 16, destino: 17 }, // Generales
        { origen: 17, destino: 18 }, // Deterioro
        { origen: 18, destino: 19 }, // Depreciación
        { origen: 19, destino: 20 }, // Amortización
        
        // Provisiones (21-23 -> 22-24)
        { origen: 21, destino: 22 }, // Litigios y demandas
        { origen: 22, destino: 23 }, // Garantías
        { origen: 23, destino: 24 }, // Diversas
        
        // Arrendamientos (25 -> 26)
        { origen: 25, destino: 26 },
        
        // Otros gastos (27-32 -> 28-33)
        { origen: 27, destino: 28 }, // Comisiones
        { origen: 28, destino: 29 }, // Ajuste diferencia en cambio
        { origen: 29, destino: 30 }, // Financieros
        { origen: 30, destino: 31 }, // Pérdidas MPP
        { origen: 31, destino: 32 }, // Gastos diversos
        { origen: 32, destino: 33 }, // Donaciones
        
        // Impuestos ganancias (34-35 -> 35-36)
        { origen: 34, destino: 35 }, // Imp. ganancias corrientes
        { origen: 35, destino: 36 }, // Imp. ganancias diferido
        
        // Operación y mantenimiento (72-81 -> 73-82)
        { origen: 72, destino: 73 }, // Mantenimiento y reparaciones
        { origen: 74, destino: 75 }, // Disposición final (Hoja18 usa F74)
        { origen: 77, destino: 78 }, // Servicios públicos
        { origen: 80, destino: 81 }, // Seguros
        { origen: 81, destino: 82 }, // Otros contratos
      ];
      
      // Procesar cada fila según el mapeo
      for (const { origen, destino } of mapeoFilas) {
        // Sumar columna E de las 3 hojas
        const e16 = sheet16.getCell(`E${origen}`).value as number || 0;
        const e17 = sheet17.getCell(`E${origen}`).value as number || 0;
        const e18 = sheet18.getCell(`E${origen}`).value as number || 0;
        const sumaE = e16 + e17 + e18;
        
        // Sumar columna F de las 3 hojas
        const f16 = sheet16.getCell(`F${origen}`).value as number || 0;
        const f17 = sheet17.getCell(`F${origen}`).value as number || 0;
        const f18 = sheet18.getCell(`F${origen}`).value as number || 0;
        const sumaF = f16 + f17 + f18;
        
        // Escribir en Hoja22
        // Columnas E, F, G (Total servicios públicos)
        sheet22.getCell(`E${destino}`).value = sumaE;
        sheet22.getCell(`F${destino}`).value = sumaF;
        sheet22.getCell(`G${destino}`).value = sumaE + sumaF;
        
        // Columnas K, L, M (Otras actividades - por ahora igual a E,F,G)
        // Nota: Si hay actividades no vigiladas, aquí irían esos valores
        sheet22.getCell(`K${destino}`).value = sumaE;
        sheet22.getCell(`L${destino}`).value = sumaF;
        sheet22.getCell(`M${destino}`).value = sumaE + sumaF;
        
        // Log solo para filas con valores
        if (sumaE !== 0 || sumaF !== 0) {
          console.log(`[ExcelJS] Hoja22 fila ${destino}: E=${sumaE}, F=${sumaF}, G=${sumaE + sumaF}`);
        }
      }
      
      // DEBUG: Calcular y mostrar totales consolidados
      let totalE = 0, totalF = 0;
      for (const { destino } of mapeoFilas) {
        totalE += sheet22.getCell(`E${destino}`).value as number || 0;
        totalF += sheet22.getCell(`F${destino}`).value as number || 0;
      }
      console.log(`[ExcelJS] Hoja22 - Totales consolidados:`);
      console.log(`[ExcelJS]   Columna E (Gastos admin): ${totalE}`);
      console.log(`[ExcelJS]   Columna F (Costos ventas): ${totalF}`);
      console.log(`[ExcelJS]   Columna G (E+F): ${totalE + totalF}`);
      
      console.log('[ExcelJS] Hoja22 completada.');
    }
    
    // ===============================================
    // HOJA23 (900019): FC02 - Complementario de Ingresos
    // ===============================================
    // Esta hoja recibe datos de la Hoja3 (Estado de Resultados):
    // - Hoja3.E14 (Ingresos Acueducto) → Hoja23.I17 (Comercialización) y K18 (Ingresos netos)
    // - Hoja3.F14 (Ingresos Alcantarillado) → Hoja23.I22 (Comercialización) y K23 (Ingresos netos)
    // - Hoja3.G14 (Ingresos Aseo) → Hoja23.I28 (Comercialización) y K40 (Ingresos netos)
    // ===============================================
    const sheet23 = workbook.getWorksheet('Hoja23');
    const sheet3ForHoja23 = workbook.getWorksheet('Hoja3');
    
    if (sheet23 && sheet3ForHoja23) {
      console.log('[ExcelJS] Escribiendo datos en Hoja23 (FC02 - Complementario Ingresos)...');
      
      // Obtener los valores de ingresos de la Hoja3 (fila 14)
      const ingresosAcueducto = sheet3ForHoja23.getCell('E14').value as number || 0;
      const ingresosAlcantarillado = sheet3ForHoja23.getCell('F14').value as number || 0;
      const ingresosAseo = sheet3ForHoja23.getCell('G14').value as number || 0;
      
      console.log(`[ExcelJS] Hoja23 - Valores de Hoja3.fila14:`);
      console.log(`[ExcelJS]   E14 (Acueducto): ${ingresosAcueducto}`);
      console.log(`[ExcelJS]   F14 (Alcantarillado): ${ingresosAlcantarillado}`);
      console.log(`[ExcelJS]   G14 (Aseo): ${ingresosAseo}`);
      
      // =====================================================
      // ACUEDUCTO (filas 17-18)
      // =====================================================
      // I17: Comercialización
      sheet23.getCell('I17').value = ingresosAcueducto;
      // K18: Ingresos netos
      sheet23.getCell('K18').value = ingresosAcueducto;
      console.log(`[ExcelJS] Hoja23 - Acueducto: I17=${ingresosAcueducto}, K18=${ingresosAcueducto}`);
      
      // =====================================================
      // ALCANTARILLADO (filas 22-23)
      // =====================================================
      // I22: Comercialización
      sheet23.getCell('I22').value = ingresosAlcantarillado;
      // K23: Ingresos netos
      sheet23.getCell('K23').value = ingresosAlcantarillado;
      console.log(`[ExcelJS] Hoja23 - Alcantarillado: I22=${ingresosAlcantarillado}, K23=${ingresosAlcantarillado}`);
      
      // =====================================================
      // ASEO (filas 28 y 40)
      // =====================================================
      // I28: Comercialización
      sheet23.getCell('I28').value = ingresosAseo;
      // K40: Ingresos netos
      sheet23.getCell('K40').value = ingresosAseo;
      console.log(`[ExcelJS] Hoja23 - Aseo: I28=${ingresosAseo}, K40=${ingresosAseo}`);
      
      console.log('[ExcelJS] Hoja23 completada.');
    }
    
    // ===============================================
    // HOJA24 (900021): FC03-1 - CXC Acueducto (Detallado por estrato)
    // ===============================================
    // Esta hoja distribuye las cuentas por cobrar por estrato usando
    // una distribución proporcional basada en el número de usuarios.
    // 
    // Datos de entrada (Hoja2 columna I - Acueducto):
    // - CXC Corrientes: I19 + I20
    // - CXC No Corrientes: I43 + I44
    // 
    // Distribución por estrato (columnas G=Corriente, H=No Corriente, I=Total):
    // - Filas 19-24: Residencial Estratos 1-6
    // - Filas 25-28: No residencial (Industrial, Comercial, Oficial, Especial)
    // ===============================================
    const sheet24 = workbook.getWorksheet('Hoja24');
    const sheet2ForHoja24 = workbook.getWorksheet('Hoja2');
    
    if (sheet24 && sheet2ForHoja24) {
      console.log('[ExcelJS] Escribiendo datos en Hoja24 (FC03-1 - CXC Acueducto por estrato)...');
      
      // Obtener CXC Corrientes de Hoja2 (I19 + I20)
      const cxcCorrientes19 = sheet2ForHoja24.getCell('I19').value as number || 0;
      const cxcCorrientes20 = sheet2ForHoja24.getCell('I20').value as number || 0;
      const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;
      
      // Obtener CXC No Corrientes de Hoja2 (I43 + I44)
      const cxcNoCorrientes43 = sheet2ForHoja24.getCell('I43').value as number || 0;
      const cxcNoCorrientes44 = sheet2ForHoja24.getCell('I44').value as number || 0;
      const totalCXCNoCorrientes = cxcNoCorrientes43 + cxcNoCorrientes44;
      
      console.log(`[ExcelJS] Hoja24 - CXC desde Hoja2:`);
      console.log(`[ExcelJS]   Corrientes (I19+I20): ${cxcCorrientes19} + ${cxcCorrientes20} = ${totalCXCCorrientes}`);
      console.log(`[ExcelJS]   No Corrientes (I43+I44): ${cxcNoCorrientes43} + ${cxcNoCorrientes44} = ${totalCXCNoCorrientes}`);
      
      // =====================================================
      // DISTRIBUCIÓN POR ESTRATO USANDO USUARIOS REALES
      // Solo para estratos residenciales (1-6)
      // Si el usuario proporciona datos de usuarios, se usa distribución proporcional
      // Si no, se usa distribución típica por defecto
      // =====================================================
      const estratosResidenciales = [
        { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
        { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
        { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
        { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
        { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
        { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' }
      ];
      
      const estratosNoResidenciales = [
        { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
        { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
        { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
        { fila: 28, key: 'especial', nombre: 'No residencial especial' }
      ];
      
      if (options.usuariosEstrato && options.usuariosEstrato.acueducto) {
        // USAR USUARIOS REALES INGRESADOS POR EL USUARIO
        console.log('[ExcelJS] Hoja24 - Usando distribución proporcional por usuarios reales');
        
        // Combinar todos los estratos (residenciales + no residenciales) para distribución
        const todosLosEstratos = [...estratosResidenciales, ...estratosNoResidenciales];
        
        // Sumar usuarios totales (residenciales + no residenciales)
        let totalUsuarios = 0;
        for (const estrato of todosLosEstratos) {
          const n = Number(options.usuariosEstrato.acueducto[estrato.key]) || 0;
          totalUsuarios += n;
        }
        
        console.log(`[ExcelJS] Hoja24 - Total usuarios acueducto (todos): ${totalUsuarios}`);
        
        // =====================================================
        // PORCENTAJES DE DISTRIBUCIÓN POR RANGO DE VENCIMIENTO
        // Columnas J a R para rangos, columna S para suma total
        // =====================================================
        const rangosVencimiento = [
          { columna: 'J', porcentaje: 0.11, nombre: 'No vencida' },
          { columna: 'K', porcentaje: 0.09, nombre: 'Vencida 1-30 días' },
          { columna: 'L', porcentaje: 0.25, nombre: 'Vencida 31-60 días' },
          { columna: 'M', porcentaje: 0.15, nombre: 'Vencida 61-90 días' },
          { columna: 'N', porcentaje: 0.20, nombre: 'Vencida 91-120 días' },
          { columna: 'O', porcentaje: 0.12, nombre: 'Vencida 121-150 días' },
          { columna: 'P', porcentaje: 0.08, nombre: 'Vencida 151-180 días' },
          { columna: 'Q', porcentaje: 0.00, nombre: 'Vencida 181-360 días' },
          { columna: 'R', porcentaje: 0.00, nombre: 'Vencida >360 días' },
        ];
        
        // Distribuir CXC proporcionalmente entre TODOS los estratos con usuarios
        for (const estrato of todosLosEstratos) {
          const usuarios = Number(options.usuariosEstrato.acueducto[estrato.key]) || 0;
          let valorCorriente = 0, valorNoCorriente = 0;
          
          if (usuarios > 0 && totalUsuarios > 0) {
            valorCorriente = Math.round(totalCXCCorrientes * usuarios / totalUsuarios);
            valorNoCorriente = Math.round(totalCXCNoCorrientes * usuarios / totalUsuarios);
          }
          
          // Columnas G, H, I - CXC Corriente, No Corriente, Total
          sheet24.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet24.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          sheet24.getCell(`I${estrato.fila}`).value = totalCXCEstrato;
          
          // =====================================================
          // Distribuir el total de CXC por rangos de vencimiento
          // Columnas J a R según porcentajes, S = suma de J:R
          // =====================================================
          let sumaRangos = 0;
          for (const rango of rangosVencimiento) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet24.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }
          
          // Columna S = suma de todos los rangos (debe ser igual a columna I)
          // Ajustar el último valor para que la suma sea exacta
          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            // Ajustar en la columna L (la de mayor porcentaje) para que cuadre
            const valorLActual = sheet24.getCell(`L${estrato.fila}`).value as number || 0;
            sheet24.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet24.getCell(`S${estrato.fila}`).value = sumaRangos;
          
          if (totalCXCEstrato !== 0) {
            const porcentaje = totalUsuarios > 0 ? (usuarios / totalUsuarios * 100).toFixed(2) : '0.00';
            console.log(`[ExcelJS] Hoja24 fila ${estrato.fila} (${estrato.nombre}): usuarios=${usuarios} (${porcentaje}%), I=${totalCXCEstrato}, S=${sumaRangos}`);
          }
        }
      } else {
        // SIN USUARIOS - Usar distribución típica por defecto
        console.log('[ExcelJS] Hoja24 - Sin datos de usuarios, usando distribución típica por defecto');
        
        // Porcentajes de distribución por rango de vencimiento
        const rangosVencimiento = [
          { columna: 'J', porcentaje: 0.11, nombre: 'No vencida' },
          { columna: 'K', porcentaje: 0.09, nombre: 'Vencida 1-30 días' },
          { columna: 'L', porcentaje: 0.25, nombre: 'Vencida 31-60 días' },
          { columna: 'M', porcentaje: 0.15, nombre: 'Vencida 61-90 días' },
          { columna: 'N', porcentaje: 0.20, nombre: 'Vencida 91-120 días' },
          { columna: 'O', porcentaje: 0.12, nombre: 'Vencida 121-150 días' },
          { columna: 'P', porcentaje: 0.08, nombre: 'Vencida 151-180 días' },
          { columna: 'Q', porcentaje: 0.00, nombre: 'Vencida 181-360 días' },
          { columna: 'R', porcentaje: 0.00, nombre: 'Vencida >360 días' },
        ];
        
        const distribucionTipica = [
          { fila: 19, porcentaje: 0.25 },  // Estrato 1: 25%
          { fila: 20, porcentaje: 0.30 },  // Estrato 2: 30%
          { fila: 21, porcentaje: 0.20 },  // Estrato 3: 20%
          { fila: 22, porcentaje: 0.10 },  // Estrato 4: 10%
          { fila: 23, porcentaje: 0.05 },  // Estrato 5: 5%
          { fila: 24, porcentaje: 0.03 },  // Estrato 6: 3%
          { fila: 25, porcentaje: 0.02 },  // Industrial: 2%
          { fila: 26, porcentaje: 0.03 },  // Comercial: 3%
          { fila: 27, porcentaje: 0.01 },  // Oficial: 1%
          { fila: 28, porcentaje: 0.01 },  // Especial: 1%
        ];
        
        for (const estrato of distribucionTipica) {
          const valorCorriente = Math.round(totalCXCCorrientes * estrato.porcentaje);
          const valorNoCorriente = Math.round(totalCXCNoCorrientes * estrato.porcentaje);
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          
          sheet24.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet24.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          sheet24.getCell(`I${estrato.fila}`).value = totalCXCEstrato;
          
          // Distribuir por rangos de vencimiento
          let sumaRangos = 0;
          for (const rango of rangosVencimiento) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet24.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }
          
          // Ajustar diferencia de redondeo
          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet24.getCell(`L${estrato.fila}`).value as number || 0;
            sheet24.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet24.getCell(`S${estrato.fila}`).value = sumaRangos;
        }
      }
      
      console.log(`[ExcelJS] Hoja24 - Totales distribuidos:`);
      console.log(`[ExcelJS]   Corrientes: ${totalCXCCorrientes}`);
      console.log(`[ExcelJS]   No Corrientes: ${totalCXCNoCorrientes}`);
      console.log(`[ExcelJS]   Total: ${totalCXCCorrientes + totalCXCNoCorrientes}`);
      
      console.log('[ExcelJS] Hoja24 completada.');
    }
    
    // ===============================================
    // HOJA25 (900022): FC03-2 - CXC Alcantarillado (Detallado por estrato)
    // ===============================================
    // Esta hoja distribuye las cuentas por cobrar de ALCANTARILLADO por estrato
    // usando una distribución proporcional basada en el número de usuarios.
    // 
    // Datos de entrada (Hoja2 columna J - Alcantarillado):
    // - CXC Corrientes: J19 + J20
    // - CXC No Corrientes: J43 + J44
    // 
    // Distribución por estrato (columnas G=Corriente, H=No Corriente, I=Total):
    // - Filas 19-24: Residencial Estratos 1-6
    // - Filas 25-28: No residencial (Industrial, Comercial, Oficial, Especial)
    // 
    // Distribución por rangos de vencimiento (columnas J-R, S=suma):
    // J=No vencida(11%), K=1-30d(9%), L=31-60d(25%), M=61-90d(15%),
    // N=91-120d(20%), O=121-150d(12%), P=151-180d(8%), Q=181-360d(0%), R=>360d(0%)
    // ===============================================
    const sheet25 = workbook.getWorksheet('Hoja25');
    const sheet2ForHoja25 = workbook.getWorksheet('Hoja2');
    
    if (sheet25 && sheet2ForHoja25) {
      console.log('[ExcelJS] Escribiendo datos en Hoja25 (FC03-2 - CXC Alcantarillado por estrato)...');
      
      // Obtener CXC Corrientes de Hoja2 columna J (J19 + J20)
      const cxcCorrientes19Alc = sheet2ForHoja25.getCell('J19').value as number || 0;
      const cxcCorrientes20Alc = sheet2ForHoja25.getCell('J20').value as number || 0;
      const totalCXCCorrientesAlc = cxcCorrientes19Alc + cxcCorrientes20Alc;
      
      // Obtener CXC No Corrientes de Hoja2 columna J (J43 + J44)
      const cxcNoCorrientes43Alc = sheet2ForHoja25.getCell('J43').value as number || 0;
      const cxcNoCorrientes44Alc = sheet2ForHoja25.getCell('J44').value as number || 0;
      const totalCXCNoCorrientesAlc = cxcNoCorrientes43Alc + cxcNoCorrientes44Alc;
      
      console.log(`[ExcelJS] Hoja25 - CXC Alcantarillado desde Hoja2:`);
      console.log(`[ExcelJS]   Corrientes (J19+J20): ${cxcCorrientes19Alc} + ${cxcCorrientes20Alc} = ${totalCXCCorrientesAlc}`);
      console.log(`[ExcelJS]   No Corrientes (J43+J44): ${cxcNoCorrientes43Alc} + ${cxcNoCorrientes44Alc} = ${totalCXCNoCorrientesAlc}`);
      
      // Definición de estratos (misma estructura que Hoja24)
      const estratosResidencialesAlc = [
        { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
        { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
        { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
        { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
        { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
        { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' }
      ];
      
      const estratosNoResidencialesAlc = [
        { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
        { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
        { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
        { fila: 28, key: 'especial', nombre: 'No residencial especial' }
      ];
      
      // Porcentajes de distribución por rango de vencimiento
      const rangosVencimientoAlc = [
        { columna: 'J', porcentaje: 0.11, nombre: 'No vencida' },
        { columna: 'K', porcentaje: 0.09, nombre: 'Vencida 1-30 días' },
        { columna: 'L', porcentaje: 0.25, nombre: 'Vencida 31-60 días' },
        { columna: 'M', porcentaje: 0.15, nombre: 'Vencida 61-90 días' },
        { columna: 'N', porcentaje: 0.20, nombre: 'Vencida 91-120 días' },
        { columna: 'O', porcentaje: 0.12, nombre: 'Vencida 121-150 días' },
        { columna: 'P', porcentaje: 0.08, nombre: 'Vencida 151-180 días' },
        { columna: 'Q', porcentaje: 0.00, nombre: 'Vencida 181-360 días' },
        { columna: 'R', porcentaje: 0.00, nombre: 'Vencida >360 días' },
      ];
      
      if (options.usuariosEstrato && options.usuariosEstrato.alcantarillado) {
        // USAR USUARIOS REALES INGRESADOS POR EL USUARIO
        console.log('[ExcelJS] Hoja25 - Usando distribución proporcional por usuarios reales');
        
        const todosLosEstratosAlc = [...estratosResidencialesAlc, ...estratosNoResidencialesAlc];
        
        // Sumar usuarios totales de alcantarillado
        let totalUsuariosAlc = 0;
        for (const estrato of todosLosEstratosAlc) {
          const n = Number(options.usuariosEstrato.alcantarillado[estrato.key]) || 0;
          totalUsuariosAlc += n;
        }
        
        console.log(`[ExcelJS] Hoja25 - Total usuarios alcantarillado (todos): ${totalUsuariosAlc}`);
        
        // Distribuir CXC proporcionalmente entre TODOS los estratos con usuarios
        for (const estrato of todosLosEstratosAlc) {
          const usuarios = Number(options.usuariosEstrato.alcantarillado[estrato.key]) || 0;
          let valorCorriente = 0, valorNoCorriente = 0;
          
          if (usuarios > 0 && totalUsuariosAlc > 0) {
            valorCorriente = Math.round(totalCXCCorrientesAlc * usuarios / totalUsuariosAlc);
            valorNoCorriente = Math.round(totalCXCNoCorrientesAlc * usuarios / totalUsuariosAlc);
          }
          
          // Columnas G, H, I - CXC Corriente, No Corriente, Total
          sheet25.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet25.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          sheet25.getCell(`I${estrato.fila}`).value = totalCXCEstrato;
          
          // Distribuir el total de CXC por rangos de vencimiento (columnas J-R, S=suma)
          let sumaRangos = 0;
          for (const rango of rangosVencimientoAlc) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet25.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }
          
          // Ajustar diferencia de redondeo en columna L
          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet25.getCell(`L${estrato.fila}`).value as number || 0;
            sheet25.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet25.getCell(`S${estrato.fila}`).value = sumaRangos;
          
          if (totalCXCEstrato !== 0) {
            const porcentaje = totalUsuariosAlc > 0 ? (usuarios / totalUsuariosAlc * 100).toFixed(2) : '0.00';
            console.log(`[ExcelJS] Hoja25 fila ${estrato.fila} (${estrato.nombre}): usuarios=${usuarios} (${porcentaje}%), I=${totalCXCEstrato}, S=${sumaRangos}`);
          }
        }
      } else {
        // SIN USUARIOS - Usar distribución típica por defecto
        console.log('[ExcelJS] Hoja25 - Sin datos de usuarios, usando distribución típica por defecto');
        
        const distribucionTipicaAlc = [
          { fila: 19, porcentaje: 0.25 },  // Estrato 1: 25%
          { fila: 20, porcentaje: 0.30 },  // Estrato 2: 30%
          { fila: 21, porcentaje: 0.20 },  // Estrato 3: 20%
          { fila: 22, porcentaje: 0.10 },  // Estrato 4: 10%
          { fila: 23, porcentaje: 0.05 },  // Estrato 5: 5%
          { fila: 24, porcentaje: 0.03 },  // Estrato 6: 3%
          { fila: 25, porcentaje: 0.02 },  // Industrial: 2%
          { fila: 26, porcentaje: 0.03 },  // Comercial: 3%
          { fila: 27, porcentaje: 0.01 },  // Oficial: 1%
          { fila: 28, porcentaje: 0.01 },  // Especial: 1%
        ];
        
        for (const estrato of distribucionTipicaAlc) {
          const valorCorriente = Math.round(totalCXCCorrientesAlc * estrato.porcentaje);
          const valorNoCorriente = Math.round(totalCXCNoCorrientesAlc * estrato.porcentaje);
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          
          sheet25.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet25.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          sheet25.getCell(`I${estrato.fila}`).value = totalCXCEstrato;
          
          // Distribuir por rangos de vencimiento
          let sumaRangos = 0;
          for (const rango of rangosVencimientoAlc) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet25.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }
          
          // Ajustar diferencia de redondeo
          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet25.getCell(`L${estrato.fila}`).value as number || 0;
            sheet25.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet25.getCell(`S${estrato.fila}`).value = sumaRangos;
        }
      }
      
      console.log(`[ExcelJS] Hoja25 - Totales distribuidos:`);
      console.log(`[ExcelJS]   Corrientes: ${totalCXCCorrientesAlc}`);
      console.log(`[ExcelJS]   No Corrientes: ${totalCXCNoCorrientesAlc}`);
      console.log(`[ExcelJS]   Total: ${totalCXCCorrientesAlc + totalCXCNoCorrientesAlc}`);
      
      console.log('[ExcelJS] Hoja25 completada.');
    }
    
    // ===============================================
    // HOJA30 (900027): FC04 - Información Subsidios y Contribuciones
    // ===============================================
    // Distribuir subsidios por estrato (solo 1, 2 y 3) y servicio
    // Celdas: E14-E16 (Acueducto), F14-F16 (Alcantarillado), G14-G16 (Aseo), K14-K16 (Total por estrato)
    // ===============================================
    const sheet30 = workbook.getWorksheet('Hoja30');
    
    if (sheet30 && options.usuariosEstrato && options.subsidios) {
      console.log('[ExcelJS] Escribiendo datos en Hoja30 (FC04 - Subsidios y Contribuciones)...');
      
      // Estructura de estratos subsidiables y servicios
      // Las claves deben coincidir con las del formulario: estrato1, estrato2, estrato3
      const estratosSubsidiables = ['estrato1', 'estrato2', 'estrato3'];
      const serviciosSubsidios = ['acueducto', 'alcantarillado', 'aseo'] as const;
      
      // Subsidios recibidos por servicio
      const subsidiosPorServicio = options.subsidios;
      // Usuarios por estrato y servicio
      const usuariosPorEstrato = options.usuariosEstrato;

      // Para cada servicio, distribuir el subsidio proporcionalmente
      // entre los estratos 1, 2 y 3 según el número de usuarios
      // Si un estrato tiene 0 usuarios, no participa
      const distribucionPorEstrato: Record<string, Record<string, number>> = {
        acueducto: {},
        alcantarillado: {},
        aseo: {}
      };
      const totalPorEstrato: Record<string, number> = { 'estrato1': 0, 'estrato2': 0, 'estrato3': 0 };

      for (const servicio of serviciosSubsidios) {
        const subsidio = Number(subsidiosPorServicio[servicio]) || 0;
        
        // Sumar usuarios de estratos 1,2,3 para este servicio
        let totalUsuarios = 0;
        for (const estrato of estratosSubsidiables) {
          const n = Number(usuariosPorEstrato[servicio]?.[estrato]) || 0;
          totalUsuarios += n;
        }
        
        console.log(`[ExcelJS] Hoja30 - ${servicio}: subsidio=${subsidio}, totalUsuarios123=${totalUsuarios}`);
        
        for (const estrato of estratosSubsidiables) {
          const usuarios = Number(usuariosPorEstrato[servicio]?.[estrato]) || 0;
          let valor = 0;
          
          if (usuarios > 0 && totalUsuarios > 0 && subsidio > 0) {
            valor = Math.round(subsidio * usuarios / totalUsuarios);
          }
          
          distribucionPorEstrato[servicio][estrato] = valor;
          totalPorEstrato[estrato] += valor;
        }
      }

      // Registrar los valores en las celdas correspondientes
      // Acueducto: E14, E15, E16
      sheet30.getCell('E14').value = distribucionPorEstrato.acueducto['estrato1'];
      sheet30.getCell('E15').value = distribucionPorEstrato.acueducto['estrato2'];
      sheet30.getCell('E16').value = distribucionPorEstrato.acueducto['estrato3'];
      
      // Alcantarillado: F14, F15, F16
      sheet30.getCell('F14').value = distribucionPorEstrato.alcantarillado['estrato1'];
      sheet30.getCell('F15').value = distribucionPorEstrato.alcantarillado['estrato2'];
      sheet30.getCell('F16').value = distribucionPorEstrato.alcantarillado['estrato3'];
      
      // Aseo: G14, G15, G16
      sheet30.getCell('G14').value = distribucionPorEstrato.aseo['estrato1'];
      sheet30.getCell('G15').value = distribucionPorEstrato.aseo['estrato2'];
      sheet30.getCell('G16').value = distribucionPorEstrato.aseo['estrato3'];
      
      // Total por estrato: K14, K15, K16
      sheet30.getCell('K14').value = totalPorEstrato['estrato1'];
      sheet30.getCell('K15').value = totalPorEstrato['estrato2'];
      sheet30.getCell('K16').value = totalPorEstrato['estrato3'];

      console.log('[ExcelJS] Hoja30 (FC04) - Distribución de subsidios por estrato y servicio:');
      for (const estrato of estratosSubsidiables) {
        console.log(`  Estrato ${estrato}: Acueducto=${distribucionPorEstrato.acueducto[estrato]}, Alcantarillado=${distribucionPorEstrato.alcantarillado[estrato]}, Aseo=${distribucionPorEstrato.aseo[estrato]}, Total=${totalPorEstrato[estrato]}`);
      }
      
      console.log('[ExcelJS] Hoja30 completada.');
    }
  }

  // Escribir el buffer con ExcelJS
  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}

/**
 * Función original para retrocompatibilidad (solo metadatos, sin datos financieros)
 */
function customizeExcel(xlsxBuffer: Buffer, options: TemplateCustomization): Buffer {
  return customizeExcelWithData(xlsxBuffer, options as TemplateWithDataOptions);
}

/**
 * Personaliza el contenido del archivo .xbrlt
 * 
 * Reemplaza:
 * - ID de empresa (company y identifier)
 * - Fechas de período
 * - Referencia al archivo de configuración Excel
 */
function customizeXbrlt(content: string, options: TemplateCustomization, outputFileName: string): string {
  let customized = content;
  
  // Reemplazar ID de empresa en <company> (valor global usado por XBRL Express)
  customized = customized.replace(
    /<company>20037<\/company>/g,
    `<company>${options.companyId}</company>`
  );
  
  // Reemplazar los placeholders de identifier con el ID real de la empresa
  // El formato original usa "_" como placeholder tanto en scheme como en el valor
  // XBRL Express necesita valores reales para reconocer los datos de empresa
  customized = customized.replace(
    /<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
    `<xbrli:identifier scheme="http://www.sui.gov.co/rups">${options.companyId}</xbrli:identifier>`
  );
  
  // Reemplazar el nombre del archivo de configuración (config=)
  const templatePaths = TEMPLATE_PATHS[options.niifGroup];
  const originalConfigName = path.basename(templatePaths.xml);
  const newConfigName = `${outputFileName}.xml`;
  customized = customized.replace(
    new RegExp(`config="${originalConfigName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
    `config="${newConfigName}"`
  );
  
  // Actualizar fechas en los períodos según la fecha de reporte del usuario
  // La plantilla original tiene fechas de 2024 (año actual) y 2023 (año anterior)
  // Debemos reemplazarlas por el año del reporte del usuario y su año anterior
  const reportYear = options.reportDate.split('-')[0];
  const reportPrevYear = String(parseInt(reportYear) - 1);
  const reportPrevPrevYear = String(parseInt(reportYear) - 2);
  
  // El template tiene:
  // - 2024-12-31 (instant año actual) -> debe ser {reportYear}-12-31
  // - 2024-01-01 (startDate año actual) -> debe ser {reportYear}-01-01
  // - 2023-12-31 (instant año anterior) -> debe ser {reportPrevYear}-12-31
  // - 2023-01-01 (startDate año anterior) -> debe ser {reportPrevYear}-01-01
  // - 2022-12-31 (instant año ante-anterior) -> debe ser {reportPrevPrevYear}-12-31
  
  // Solo reemplazar si es diferente al template original (2024)
  if (reportYear !== '2024') {
    // ============================================================
    // IMPORTANTE: NO REEMPLAZAR URLs DE TAXONOMÍA SSPD
    // ============================================================
    // Las taxonomías de la SSPD se publican anualmente, pero la de 2025
    // puede no estar disponible aún. SIEMPRE usar la taxonomía 2024
    // que es la más reciente disponible.
    // 
    // NO hacemos esto:
    // customized = customized.replace(/Corte_2024/g, `Corte_${reportYear}`);
    // 
    // Las URLs de taxonomía permanecen en 2024:
    // - http://www.sui.gov.co/xbrl/Corte_2024/res414/...
    // - http://www.superservicios.gov.co/xbrl/ef/core/2024-12-31
    
    // ============================================================
    // SOLO REEMPLAZAR FECHAS EN CONTEXTOS XBRL (períodos contables)
    // ============================================================
    
    // Reemplazar año actual (2024 -> reportYear)
    customized = customized.replace(/<instant>2024-12-31<\/instant>/g, `<instant>${reportYear}-12-31</instant>`);
    customized = customized.replace(/<startDate>2024-01-01<\/startDate>/g, `<startDate>${reportYear}-01-01</startDate>`);
    customized = customized.replace(/<endDate>2024-12-31<\/endDate>/g, `<endDate>${reportYear}-12-31</endDate>`);
    
    // Reemplazar año anterior (2023 -> reportPrevYear)
    customized = customized.replace(/<instant>2023-12-31<\/instant>/g, `<instant>${reportPrevYear}-12-31</instant>`);
    customized = customized.replace(/<startDate>2023-01-01<\/startDate>/g, `<startDate>${reportPrevYear}-01-01</startDate>`);
    customized = customized.replace(/<endDate>2023-12-31<\/endDate>/g, `<endDate>${reportPrevYear}-12-31</endDate>`);
    
    // Reemplazar año ante-anterior (2022 -> reportPrevPrevYear)
    customized = customized.replace(/<instant>2022-12-31<\/instant>/g, `<instant>${reportPrevPrevYear}-12-31</instant>`);
    customized = customized.replace(/<startDate>2022-01-01<\/startDate>/g, `<startDate>${reportPrevPrevYear}-01-01</startDate>`);
    customized = customized.replace(/<endDate>2022-12-31<\/endDate>/g, `<endDate>${reportPrevPrevYear}-12-31</endDate>`);
  }
  
  return customized;
}

/**
 * Personaliza el contenido del archivo .xml (mapeo Excel)
 * 
 * Este archivo no necesita muchos cambios ya que define
 * la estructura de mapeo, pero actualizamos referencias si es necesario.
 */
function customizeXml(content: string, options: TemplateCustomization): string {
  // El archivo .xml de mapeo generalmente no necesita cambios
  // ya que define la estructura de mapeo celda-concepto
  return content;
}

/**
 * Genera un archivo README específico para la taxonomía
 */
function generateReadme(options: TemplateCustomization, outputPrefix: string): string {
  const taxonomyNames: Record<NiifGroup, string> = {
    grupo1: 'NIIF Plenas (Grupo 1)',
    grupo2: 'NIIF para PYMES (Grupo 2)',
    grupo3: 'Microempresas (Grupo 3)',
    r414: 'Resolución 414 - Sector Público',
    r533: 'Resolución 533',
    ife: 'Informe Financiero Especial',
  };

  return `================================================================================
PAQUETE DE ARCHIVOS XBRL - TAXONOMÍA OFICIAL SSPD
================================================================================

Empresa: ${options.companyName}
ID RUPS: ${options.companyId}
NIT: ${options.nit || 'No especificado'}
Taxonomía: ${taxonomyNames[options.niifGroup]}
Fecha de Reporte: ${options.reportDate}
Generado: ${new Date().toLocaleString('es-CO')}

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

1. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrlt
   → Plantilla de mapeo XBRL (para XBRL Express)

2. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xml
   → Configuración de mapeo Excel → XBRL

3. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xlsx
   → Plantilla Excel oficial (para diligenciar datos)

4. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrl
   → Archivo de instancia XBRL (referencia)

5. README.txt
   → Este archivo

================================================================================
INSTRUCCIONES DE USO
================================================================================

PASO 1: Extraer los archivos
   - Extraiga todos los archivos de este ZIP en una misma carpeta
   - Mantenga todos los archivos juntos, NO los renombre

PASO 2: Diligenciar el Excel
   1. Abra el archivo .xlsx con Microsoft Excel
   2. Diligencia la Hoja1 con la información general de la empresa
   3. Diligencia la Hoja2 con el Estado de Situación Financiera
   4. Complete las demás hojas según aplique a su empresa
   5. Guarde el archivo (NO cambie el nombre)

PASO 3: Abrir en XBRL Express
   1. Abra el aplicativo XBRL Express
   2. Vaya a: Archivo → Abrir plantilla (.xbrlt)
   3. Seleccione el archivo .xbrlt de esta carpeta
   4. XBRL Express cargará automáticamente:
      - La configuración de mapeo (.xml)
      - Los datos del Excel (.xlsx)

PASO 4: Validar y Generar
   1. Revise que todos los datos se hayan cargado correctamente
   2. Use la función de validación para detectar errores
   3. Corrija cualquier error encontrado
   4. Genere el archivo XBRL final

PASO 5: Certificar en SUI
   1. Ingrese a la plataforma SUI
   2. Cargue el archivo XBRL generado
   3. Complete el proceso de certificación

================================================================================
IMPORTANTE
================================================================================

- Los archivos de este paquete fueron generados usando las plantillas
  OFICIALES de la SSPD para la taxonomía ${taxonomyNames[options.niifGroup]}.

- El archivo .xlsx contiene la estructura EXACTA requerida por XBRL Express.
  NO modifique la estructura de las hojas ni las columnas.

- Si tiene problemas al cargar en XBRL Express, verifique que:
  1. Todos los archivos estén en la misma carpeta
  2. No haya renombrado ningún archivo
  3. La taxonomía correcta esté instalada en XBRL Express

================================================================================
SOPORTE
================================================================================

Para soporte técnico de XBRL Express:
- Reporting Standard: https://www.reportingstandard.com
- Documentación SSPD: https://www.superservicios.gov.co

================================================================================
`;
}

/**
 * Genera el paquete completo de archivos XBRL usando plantillas oficiales
 * Esta función solo llena metadatos. Para incluir datos financieros use
 * generateOfficialTemplatePackageWithData.
 */
export async function generateOfficialTemplatePackage(
  options: TemplateCustomization
): Promise<OfficialTemplatePackage> {
  return generateOfficialTemplatePackageWithData(options as TemplateWithDataOptions);
}

/**
 * Genera el paquete completo de archivos XBRL usando plantillas oficiales
 * INCLUYE datos financieros del balance distribuido.
 * 
 * Esta función:
 * 1. Llena la Hoja1 con metadatos de la empresa
 * 2. Llena la Hoja2 (ESF) con datos del balance
 * 3. Llena la Hoja3 (ER) con datos de resultados
 * 4. Llena las hojas FC01 con gastos por servicio
 * 5. Llena las hojas FC02/FC03 con ingresos y CXC
 */
export async function generateOfficialTemplatePackageWithData(
  options: TemplateWithDataOptions
): Promise<OfficialTemplatePackage> {
  const templatePaths = TEMPLATE_PATHS[options.niifGroup];
  
  // Verificar que el grupo tiene plantillas disponibles
  if (!templatePaths.xbrlt) {
    throw new Error(`No hay plantillas oficiales disponibles para ${options.niifGroup}. Use el generador estándar.`);
  }
  
  // Generar nombre de archivo de salida
  const outputPrefix = templatePaths.outputPrefix;
  const outputFileName = `${outputPrefix}_ID${options.companyId}_${options.reportDate}`;
  
  const zip = new JSZip();
  
  try {
    // 1. Cargar y personalizar .xbrlt
    const xbrltContent = await loadTemplate(templatePaths.xbrlt);
    const customizedXbrlt = customizeXbrlt(xbrltContent, options, outputFileName);
    zip.file(`${outputFileName}.xbrlt`, customizedXbrlt);
    
    // 2. Cargar y personalizar .xml
    const xmlContent = await loadTemplate(templatePaths.xml);
    const customizedXml = customizeXml(xmlContent, options);
    zip.file(`${outputFileName}.xml`, customizedXml);
    
    // 3. Cargar y personalizar .xlsx con datos del formulario Y datos financieros
    const xlsxContent = await loadBinaryTemplate(templatePaths.xlsx);
    let customizedXlsx = customizeExcelWithData(xlsxContent, options);
    
    // 3.1 Re-escribir datos financieros con ExcelJS para mejor compatibilidad con XBRL Express
    // La librería xlsx puede no generar celdas que XBRL Express pueda leer correctamente
    customizedXlsx = await rewriteFinancialDataWithExcelJS(customizedXlsx, options);
    
    zip.file(`${outputFileName}.xlsx`, customizedXlsx);
    
    // 4. Cargar .xbrl (referencia)
    const xbrlContent = await loadTemplate(templatePaths.xbrl);
    zip.file(`${outputFileName}.xbrl`, xbrlContent);
    
    // 5. Generar README actualizado
    const readmeContent = generateReadmeWithData(options, outputPrefix);
    zip.file('README.txt', readmeContent);
    
    // Generar el ZIP
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer', 
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    
    const base64 = Buffer.from(zipBuffer).toString('base64');
    
    return {
      fileName: `${outputFileName}.zip`,
      fileData: base64,
      mimeType: 'application/zip',
    };
  } catch (error) {
    console.error('Error generando paquete de plantillas:', error);
    throw new Error(
      error instanceof Error 
        ? `Error generando paquete: ${error.message}` 
        : 'Error desconocido generando paquete'
    );
  }
}

/**
 * Genera README con información sobre datos financieros incluidos
 */
function generateReadmeWithData(options: TemplateWithDataOptions, outputPrefix: string): string {
  const taxonomyNames: Record<NiifGroup, string> = {
    grupo1: 'NIIF Plenas (Grupo 1)',
    grupo2: 'NIIF para PYMES (Grupo 2)',
    grupo3: 'Microempresas (Grupo 3)',
    r414: 'Resolución 414 - Sector Público',
    r533: 'Resolución 533',
    ife: 'Informe Financiero Especial',
  };

  const hasData = options.consolidatedAccounts && options.consolidatedAccounts.length > 0;
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  return `================================================================================
PAQUETE DE ARCHIVOS XBRL - TAXONOMÍA OFICIAL SSPD
${hasData ? '★★★ CON DATOS FINANCIEROS PRE-LLENADOS ★★★' : ''}
================================================================================

Empresa: ${options.companyName}
ID RUPS: ${options.companyId}
NIT: ${options.nit || 'No especificado'}
Taxonomía: ${taxonomyNames[options.niifGroup]}
Fecha de Reporte: ${options.reportDate}
Generado: ${new Date().toLocaleString('es-CO')}
${hasData ? `Cuentas procesadas: ${options.consolidatedAccounts!.length}
Servicios activos: ${activeServices.join(', ')}` : ''}

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

1. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrlt
   → Plantilla de mapeo XBRL (para XBRL Express)

2. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xml
   → Configuración de mapeo Excel → XBRL

3. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xlsx
   → Plantilla Excel oficial ${hasData ? '(PRE-LLENADA con datos)' : '(para diligenciar datos)'}

4. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrl
   → Archivo de instancia XBRL (referencia)

5. README.txt
   → Este archivo

${hasData ? `================================================================================
HOJAS PRE-LLENADAS AUTOMÁTICAMENTE
================================================================================

Las siguientes hojas contienen datos del balance distribuido:

✓ [110000] Información general - Datos de la empresa
✓ [210000] Estado de Situación Financiera - Balance por servicio
✓ [310000] Estado de Resultados - P&G por servicio
✓ [900017a] FC01-1 Gastos Acueducto
✓ [900017b] FC01-2 Gastos Alcantarillado  
✓ [900017c] FC01-3 Gastos Aseo
✓ [900017g] FC01-7 Total servicios públicos

Las demás hojas (notas, revelaciones, etc.) deben completarse manualmente.

` : ''}================================================================================
INSTRUCCIONES DE USO
================================================================================

PASO 1: Extraer los archivos
   - Extraiga todos los archivos de este ZIP en una misma carpeta
   - Mantenga todos los archivos juntos, NO los renombre

PASO 2: ${hasData ? 'Revisar y complementar el Excel' : 'Diligenciar el Excel'}
   1. Abra el archivo .xlsx con Microsoft Excel
   ${hasData ? '2. Revise que los datos automáticos sean correctos' : '2. Diligencia la Hoja1 con la información general de la empresa'}
   ${hasData ? '3. Complete las hojas de notas y revelaciones' : '3. Diligencia la Hoja2 con el Estado de Situación Financiera'}
   4. Guarde el archivo (NO cambie el nombre)

PASO 3: Abrir en XBRL Express
   1. Abra el aplicativo XBRL Express
   2. Vaya a: Archivo → Abrir plantilla (.xbrlt)
   3. Seleccione el archivo .xbrlt de esta carpeta
   4. XBRL Express cargará automáticamente:
      - La configuración de mapeo (.xml)
      - Los datos del Excel (.xlsx)

PASO 4: Validar y Generar
   1. Revise que todos los datos se hayan cargado correctamente
   2. Use la función de validación para detectar errores
   3. Corrija cualquier error encontrado
   4. Genere el archivo XBRL final

PASO 5: Certificar en SUI
   1. Ingrese a la plataforma SUI
   2. Cargue el archivo XBRL generado
   3. Complete el proceso de certificación

================================================================================
IMPORTANTE
================================================================================

- Los archivos de este paquete fueron generados usando las plantillas
  OFICIALES de la SSPD para la taxonomía ${taxonomyNames[options.niifGroup]}.

- El archivo .xlsx contiene la estructura EXACTA requerida por XBRL Express.
  NO modifique la estructura de las hojas ni las columnas.

- Si tiene problemas al cargar en XBRL Express, verifique que:
  1. Todos los archivos estén en la misma carpeta
  2. No haya renombrado ningún archivo
  3. La taxonomía correcta esté instalada en XBRL Express

================================================================================
SOPORTE
================================================================================

Para soporte técnico de XBRL Express:
- Reporting Standard: https://www.reportingstandard.com
- Documentación SSPD: https://www.superservicios.gov.co

================================================================================
`;
}

/**
 * Verifica si un grupo tiene plantillas oficiales disponibles
 */
export function hasOfficialTemplates(niifGroup: NiifGroup): boolean {
  const templatePaths = TEMPLATE_PATHS[niifGroup];
  return !!templatePaths.xbrlt;
}

/**
 * Obtiene la lista de grupos con plantillas disponibles
 */
export function getAvailableTemplateGroups(): NiifGroup[] {
  return (Object.keys(TEMPLATE_PATHS) as NiifGroup[]).filter(
    group => hasOfficialTemplates(group)
  );
}
