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
  // =====================================================
  // Fila 15: Efectivo y equivalentes al efectivo
  // PUC: 11 - Efectivo (caja, bancos, cuentas de ahorro, fondos)
  { row: 15, label: 'Efectivo y equivalentes al efectivo', pucPrefixes: ['11'] },
  
  // Fila 16: Efectivo de uso restringido corriente
  // PUC: 1195 - Fondos restringidos (si aplica, generalmente vacío)
  { row: 16, label: 'Efectivo de uso restringido corriente', pucPrefixes: ['1195'] },
  
  // Fila 19: CXC por prestación de servicios públicos (SIN subsidios ni aprovechamiento)
  // PUC: 1305 - Clientes servicios públicos (acueducto, alcantarillado, aseo)
  // EXCLUIR: 130580 (subsidios), 130585 (aprovechamiento)
  { row: 19, label: 'CXC servicios públicos (sin subsidios)', pucPrefixes: ['1305'], excludePrefixes: ['130580', '130585', '130590'] },
  
  // Fila 20: CXC por subsidios corrientes
  // PUC: 130580 - Subsidios por cobrar, 1330 - Anticipos de subsidios
  { row: 20, label: 'CXC subsidios corrientes', pucPrefixes: ['130580', '1330'] },
  
  // Fila 22: CXC por actividad de aprovechamiento corrientes
  // PUC: 130585 - Aprovechamiento (reciclaje, etc.)
  { row: 22, label: 'CXC aprovechamiento corrientes', pucPrefixes: ['130585'] },
  
  // Fila 24: CXC por venta de bienes corrientes
  // PUC: 1310 - Clientes del exterior, 1315 - Deudores del sistema
  { row: 24, label: 'CXC venta de bienes corrientes', pucPrefixes: ['1310', '1315'] },
  
  // Fila 25: CXC a partes relacionadas corrientes
  // PUC: 1320 - Cuentas por cobrar a vinculados económicos
  { row: 25, label: 'CXC partes relacionadas corrientes', pucPrefixes: ['1320', '1325'] },
  
  // Fila 26: Otras cuentas por cobrar corrientes
  // PUC: 1345 - Ingresos por cobrar, 1350 - Retención en la fuente, 1355 - Anticipo impuestos,
  //      1360 - Reclamaciones, 1365 - CxC a trabajadores, 1370 - Prestamos particulares,
  //      1380 - Deudores varios, 1385 - Derechos de recompra, 1390 - Deudas difícil cobro
  // EXCLUIR: 1305 (servicios públicos), 1310, 1315, 1320, 1325, 1330
  { row: 26, label: 'Otras CXC corrientes', pucPrefixes: ['1345', '1350', '1355', '1360', '1365', '1370', '1380', '1385', '1390', '1399'] },
  
  // Fila 28: Inventarios corrientes
  // PUC: 14 - Inventarios (materiales, repuestos, productos en proceso, etc.)
  { row: 28, label: 'Inventarios corrientes', pucPrefixes: ['14'] },
  
  // Fila 29: Activo por impuesto a las ganancias corriente
  // PUC: 1355 - Anticipo de impuestos (renta)
  // Nota: Ya incluido en fila 26, aquí sería específico para impuesto de renta anticipado
  // { row: 29, label: 'Activo impuesto ganancias corriente', pucPrefixes: ['135505', '135510'] },
  
  // Fila 30: Otros activos financieros corrientes
  // PUC: 12 - Inversiones (CDT, bonos, acciones de corto plazo)
  { row: 30, label: 'Otros activos financieros corrientes', pucPrefixes: ['12'] },
  
  // Fila 31: Otros activos no financieros corrientes
  // PUC: 17 - Diferidos (gastos pagados por anticipado), 1705, 1710
  { row: 31, label: 'Otros activos no financieros corrientes', pucPrefixes: ['17'] },
  
  // =====================================================
  // ACTIVOS NO CORRIENTES (filas 33-63)
  // =====================================================
  // Fila 34: Propiedades, planta y equipo (NETO)
  // PUC: 15 - Propiedades planta y equipo, 16 - Construcciones en curso
  // El valor debe ser NETO (menos depreciación acumulada 1592)
  { row: 34, label: 'Propiedades, planta y equipo', pucPrefixes: ['15', '16'] },
  
  // Fila 35: Efectivo de uso restringido no corriente
  { row: 35, label: 'Efectivo restringido no corriente', pucPrefixes: ['1295'] },
  
  // Fila 37: Inversiones en asociadas
  // PUC: 1205 - Acciones
  { row: 37, label: 'Inversiones en asociadas', pucPrefixes: ['1205'] },
  
  // Fila 52: Inventarios no corrientes
  // PUC: Generalmente no hay, pero si hubiera serían inventarios de largo plazo
  // { row: 52, label: 'Inventarios no corrientes', pucPrefixes: [] },
  
  // Fila 53: Activos por impuestos diferidos
  // PUC: 1710 - Cargos diferidos impuestos
  { row: 53, label: 'Activos por impuestos diferidos', pucPrefixes: ['171076', '171044'] },
  
  // Fila 59: Activos intangibles
  // PUC: 16 - Intangibles (licencias, software, derechos)
  { row: 59, label: 'Activos intangibles', pucPrefixes: ['1605', '1610', '1615', '1620', '1625', '1630', '1635', '1698'] },
];

const R414_ESF_PASIVOS: R414ESFMapping[] = [
  // =====================================================
  // PASIVOS CORRIENTES (filas 67-90)
  // =====================================================
  // Fila 69: Provisiones corrientes por beneficios a empleados
  // PUC: 25 - Obligaciones laborales (salarios, cesantías, vacaciones, primas)
  { row: 69, label: 'Provisiones beneficios empleados corrientes', pucPrefixes: ['25'] },
  
  // Fila 70: Otras provisiones corrientes
  // PUC: 2610 - Para obligaciones fiscales, 2615 - Para contingencias
  { row: 70, label: 'Otras provisiones corrientes', pucPrefixes: ['2610', '2615', '2620', '2625', '2630', '2635'] },
  
  // Fila 74: Cuentas comerciales por pagar (adquisición bienes/servicios)
  // PUC: 22 - Proveedores
  { row: 74, label: 'Cuentas por pagar proveedores', pucPrefixes: ['22'] },
  
  // Fila 76: Otras cuentas comerciales por pagar
  // PUC: 23 - Cuentas por pagar (costos y gastos por pagar, dividendos)
  { row: 76, label: 'Otras cuentas por pagar', pucPrefixes: ['23'] },
  
  // Fila 79: Préstamos por pagar corrientes
  // PUC: 21 - Obligaciones financieras (bancos, compañías financiamiento)
  { row: 79, label: 'Préstamos por pagar corrientes', pucPrefixes: ['21'] },
  
  // Fila 80: Pasivo por impuesto a las ganancias corriente
  // PUC: 2404 - De renta y complementarios
  { row: 80, label: 'Impuesto ganancias por pagar', pucPrefixes: ['2404'] },
  
  // Fila 82: Ingresos recibidos por anticipado corrientes
  // PUC: 27 - Diferidos (ingresos recibidos por anticipado)
  { row: 82, label: 'Ingresos diferidos corrientes', pucPrefixes: ['27'] },
  
  // Fila 83: Otros pasivos financieros corrientes
  // PUC: 2195 - Otras obligaciones financieras
  { row: 83, label: 'Otros pasivos financieros corrientes', pucPrefixes: ['2195', '2115'] },
  
  // Fila 85: Otros pasivos corrientes
  // PUC: 24 - Impuestos gravámenes y tasas, 28 - Otros pasivos (anticipos, depósitos)
  { row: 85, label: 'Otros pasivos corrientes', pucPrefixes: ['24', '28'], excludePrefixes: ['2404'] },
  
  // =====================================================
  // PASIVOS NO CORRIENTES (filas 91-110)
  // =====================================================
  // Fila 92: Provisiones no corrientes por beneficios a empleados
  // PUC: Pasivos laborales de largo plazo (pensiones, bonificaciones)
  { row: 92, label: 'Provisiones beneficios empleados no corrientes', pucPrefixes: ['2620'] },
  
  // Fila 99: Préstamos por pagar no corrientes
  // PUC: 2105 - Bancos LP, 2120 - Compañías financiamiento LP
  { row: 99, label: 'Préstamos por pagar no corrientes', pucPrefixes: ['2105', '2120'] },
  
  // Fila 103: Pasivos por impuestos diferidos
  // PUC: 2725 - Impuestos diferidos
  { row: 103, label: 'Pasivos por impuestos diferidos', pucPrefixes: ['2725', '272505'] },
];

const R414_ESF_PATRIMONIO: R414ESFMapping[] = [
  // =====================================================
  // PATRIMONIO (filas 112-127)
  // =====================================================
  // Fila 113: Aportes sociales
  // PUC: 32 - Superávit de capital (prima en colocación, donaciones)
  { row: 113, label: 'Aportes sociales', pucPrefixes: ['32'] },
  
  // Fila 114: Capital suscrito y pagado
  // PUC: 31 - Capital social (autorizado, suscrito, pagado)
  { row: 114, label: 'Capital suscrito y pagado', pucPrefixes: ['31'] },
  
  // Fila 115: Acciones propias en cartera (resta)
  // PUC: 3130 - Capital suscrito no pagado (negativo), 3140 - Acciones propias readquiridas
  { row: 115, label: 'Acciones propias en cartera', pucPrefixes: ['3130', '3140'] },
  
  // Fila 117: Reserva legal
  // PUC: 3305 - Reservas obligatorias (reserva legal 10%)
  { row: 117, label: 'Reserva legal', pucPrefixes: ['3305'] },
  
  // Fila 118: Otras reservas
  // PUC: 3310, 3315, 3320 - Reservas estatutarias, ocasionales
  { row: 118, label: 'Otras reservas', pucPrefixes: ['33'], excludePrefixes: ['3305'] },
  
  // Fila 120: Ganancias acumuladas
  // PUC: 36 - Resultados del ejercicio, 37 - Resultados ejercicios anteriores
  { row: 120, label: 'Ganancias acumuladas', pucPrefixes: ['36', '37'] },
  
  // Fila 121: Otro resultado integral acumulado
  // PUC: 38 - Superávit por valorizaciones
  { row: 121, label: 'Otro resultado integral', pucPrefixes: ['38'] },
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
 * INGRESOS FINANCIEROS (fila 19):
 * Según el catálogo CGN / Resolución 414, incluyen:
 * - Intereses sobre depósitos, CDT, bonos, préstamos otorgados
 * - Rendimientos de inversiones financieras
 * - Diferencias en cambio favorables
 * - Dividendos y participaciones
 * 
 * En el PUC: Grupo 48 (CGN) o subcuentas específicas 4210, 4215, 4245, 4250
 */
const R414_ER_MAPPINGS: R414ESFMapping[] = [
  // Fila 14: Ingresos de actividades ordinarias
  // PUC: 41 - Ingresos operacionales (servicios públicos)
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['41'] },
  
  // Fila 15: Costo de ventas
  // PUC: 6 - Costos (61-Costos de operación, 62-Costos de ventas, 63-Otros costos)
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['6', '61', '62', '63'] },
  
  // Fila 17: Otros ingresos
  // PUC: 42 - Otros ingresos operacionales (excepto ingresos financieros)
  // Se excluyen: 4210 (Intereses), 4215 (Rendimientos), 4245 (Dif. cambio), 4250 (Dividendos)
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['42'], excludePrefixes: ['4210', '4215', '4245', '4250'] },
  
  // Fila 18: Gastos de administración, operación y ventas
  // PUC: 51 - Gastos de administración, 52 - Gastos de ventas
  { row: 18, label: 'Gastos de administración, operación y ventas', pucPrefixes: ['51', '52'] },
  
  // Fila 19: Ingresos financieros
  // PUC: 48 - Ingresos financieros (CGN) + subcuentas específicas del PUC comercial
  // Incluye: Intereses ganados, rendimientos de inversiones, diferencias en cambio, dividendos
  { row: 19, label: 'Ingresos financieros', pucPrefixes: ['48', '4210', '4215', '4245', '4250'] },
  
  // Fila 20: Costos financieros
  // PUC: 53 - Gastos financieros (intereses, comisiones bancarias, diferencias en cambio desfavorables)
  { row: 20, label: 'Costos financieros', pucPrefixes: ['53'] },
  
  // Fila 22: Otros gastos
  // PUC: 54 - Impuestos, gravámenes y tasas; 59 - Otros gastos
  { row: 22, label: 'Otros gastos', pucPrefixes: ['54', '59'], excludePrefixes: ['5405', '5410'] },
  
  // Fila 25: Gasto/Ingreso impuesto a las ganancias corriente
  // PUC: 5405 - Impuesto de renta y complementarios corriente
  { row: 25, label: 'Impuesto a las ganancias corriente', pucPrefixes: ['5405'] },
  
  // Fila 26: Gasto/Ingreso impuesto a las ganancias diferido
  // PUC: 5410 - Impuesto de renta diferido
  { row: 26, label: 'Impuesto a las ganancias diferido', pucPrefixes: ['5410'] },
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

/** Opciones extendidas para incluir datos financieros */
export interface TemplateWithDataOptions extends TemplateCustomization {
  /** Cuentas consolidadas del balance */
  consolidatedAccounts?: AccountData[];
  /** Balances distribuidos por servicio */
  serviceBalances?: ServiceBalanceData[];
  /** Servicios activos para la empresa */
  activeServices?: string[];
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
        31, // Subvenciones del gobierno
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
      const setPolicyCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };
      
      // ===== POLÍTICAS CON CONTENIDO ESTÁNDAR =====
      // Políticas comunes y aplicables a empresas de servicios públicos
      
      // Fila 16: Beneficios a los empleados
      setPolicyCell(sheet10, 'E16',
        `Los beneficios a empleados de corto plazo se reconocen como gasto cuando el empleado presta el servicio. Incluyen salarios, aportes a seguridad social, prestaciones sociales legales y extralegales. Los beneficios post-empleo se reconocen según el tipo de plan: contribución definida (gasto cuando se paga) o beneficio definido (obligación actuarial).`
      );
      
      // Fila 17: Gastos
      setPolicyCell(sheet10, 'E17',
        `Los gastos se reconocen cuando se incurren, independientemente del momento del pago, aplicando el principio de devengo. Se clasifican en gastos de administración, operación y ventas según su función. Los gastos de operación incluyen costos directamente relacionados con la prestación de servicios públicos.`
      );
      
      // Fila 22: Deterioro del valor de activos
      setPolicyCell(sheet10, 'E22',
        `Al cierre de cada período se evalúa si existe indicación de deterioro de activos. Si existe, se estima el valor recuperable como el mayor entre el valor razonable menos costos de venta y el valor en uso. Si el valor en libros excede el recuperable, se reconoce una pérdida por deterioro. Para cuentas por cobrar se aplica el modelo de pérdidas crediticias esperadas.`
      );
      
      // Fila 23: Impuestos a las ganancias
      setPolicyCell(sheet10, 'E23',
        `El gasto por impuesto comprende el impuesto corriente y diferido. El corriente se calcula sobre la renta líquida gravable usando tasas vigentes. El diferido se reconoce sobre diferencias temporarias entre bases contables y fiscales, usando el método del pasivo. Los activos por impuesto diferido se reconocen si es probable obtener ganancias fiscales futuras.`
      );
      
      // Fila 28: Capital emitido
      setPolicyCell(sheet10, 'E28',
        `El capital social se reconoce al valor nominal de las acciones o aportes suscritos y pagados. Las primas en colocación de acciones se registran en el patrimonio. Los costos de transacción relacionados con emisión de instrumentos de patrimonio se deducen directamente del patrimonio.`
      );
      
      // Fila 30: Préstamos y cuentas por cobrar
      setPolicyCell(sheet10, 'E30',
        `Las cuentas por cobrar comerciales se reconocen inicialmente al precio de la transacción. Posteriormente se miden al costo amortizado menos deterioro. El deterioro se calcula usando el modelo de pérdidas crediticias esperadas, considerando la experiencia histórica de pérdidas, las condiciones actuales y proyecciones futuras.`
      );
      
      // Fila 31: Inventarios
      setPolicyCell(sheet10, 'E31',
        `Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina usando el método del promedio ponderado. Incluyen materiales para mantenimiento de redes, químicos para tratamiento de agua, repuestos y suministros. Se evalúa periódicamente la obsolescencia y se reconocen ajustes cuando el valor realizable es menor al costo.`
      );
      
      // Fila 33: Propiedades, planta y equipo
      setPolicyCell(sheet10, 'E33',
        `Las propiedades, planta y equipo se reconocen al costo menos depreciación acumulada y deterioro. El costo incluye precio de adquisición, costos directamente atribuibles y costos de desmantelamiento. La depreciación se calcula por línea recta sobre la vida útil estimada. Las mejoras se capitalizan; el mantenimiento se reconoce como gasto. Se revisan las vidas útiles y valores residuales anualmente.`
      );
      
      // Fila 34: Provisiones
      setPolicyCell(sheet10, 'E34',
        `Las provisiones se reconocen cuando existe una obligación presente (legal o implícita) resultado de un evento pasado, es probable una salida de recursos y el monto puede estimarse confiablemente. Se miden al mejor estimado del desembolso requerido. Las provisiones de largo plazo se descuentan a valor presente si el efecto es material.`
      );
      
      // Fila 35: Reconocimiento de ingresos de actividades ordinarias
      setPolicyCell(sheet10, 'E35',
        `Los ingresos por prestación de servicios públicos se reconocen cuando el servicio ha sido prestado, el importe puede medirse confiablemente y es probable que los beneficios económicos fluyan a la entidad. La facturación se realiza mensualmente según consumo medido o estimado. Los subsidios y contribuciones se reconocen según las disposiciones regulatorias de la CRA.`
      );
      
      // Fila 38: Acreedores comerciales y otras cuentas por pagar
      setPolicyCell(sheet10, 'E38',
        `Las cuentas por pagar comerciales se reconocen al valor de la factura cuando se reciben los bienes o servicios. Posteriormente se miden al costo amortizado. No se descuentan si el efecto del valor temporal del dinero no es significativo. Incluyen obligaciones con proveedores, contratistas y acreedores varios relacionados con la operación.`
      );
      
      // Fila 40: Otras políticas contables relevantes
      setPolicyCell(sheet10, 'E40',
        `Bases de preparación: Los estados financieros se preparan bajo NIIF para Pymes adoptadas en Colombia y la Resolución 414 de 2014 de la CGN. Moneda funcional y de presentación: Peso colombiano. Efectivo: Incluye caja, bancos e inversiones de alta liquidez con vencimiento menor a 3 meses. Aportes y contribuciones: Se reconocen según regulación sectorial aplicable a empresas de servicios públicos.`
      );
      
      // ===== POLÍTICAS CON "NA" (No Aplica) =====
      // Políticas que generalmente no aplican para empresas típicas de servicios públicos
      
      const politicasNA = [
        12, // Activos financieros disponibles para la venta
        13, // Costos de financiación (capitalización)
        14, // Préstamos por pagar (política específica)
        15, // Instrumentos financieros derivados
        18, // Conversión de moneda extranjera
        19, // Moneda funcional (si no aplica moneda extranjera)
        20, // Plusvalía
        21, // Subvenciones gubernamentales
        24, // Activos intangibles
        25, // Inversiones en asociadas
        26, // Inversiones en negocios conjuntos
        27, // Propiedades de inversión
        29, // Arrendamientos (bajo NIIF 16 / NIC 17)
        32, // Activos de petróleo y gas
        36, // Gastos de investigación y desarrollo
        37, // Efectivo restringido
        39, // Transacciones con partes relacionadas
        41, // Inversiones de administración de liquidez
        42, // Préstamos por cobrar
        43, // Ingresos por contratos de construcción
      ];
      
      for (const row of politicasNA) {
        setPolicyCell(sheet10, `E${row}`, 'NA');
      }
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

        // Escribir valor total en columna L (columna 12)
        if (totalValue !== 0) {
          const cell = sheet3.getCell(`L${mapping.row}`);
          cell.value = totalValue;
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

          if (serviceValue !== 0) {
            const cell = sheet3.getCell(`${serviceColumn}${mapping.row}`);
            cell.value = serviceValue;
            console.log(`[ExcelJS] Hoja3!${serviceColumn}${mapping.row} = ${serviceValue}`);
          }
        }
      }
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
