/**
 * Generador de Excel con formato EXACTO compatible para XBRL Express.
 * 
 * Este módulo genera un archivo Excel con la estructura EXACTA que espera
 * XBRL Express para poder leer los datos y generar el archivo XBRL final.
 * 
 * ESTRUCTURA REQUERIDA:
 * - Hoja1: Información General (datos en columna E, filas 12-22)
 * - Hoja2: Estado de Situación Financiera (datos en columnas I-Q, filas 15-70)
 * 
 * MAPEO DE COLUMNAS PARA ESF (Hoja2):
 * - Columna I: Total (sin sufijo)
 * - Columna J: Acueducto (sufijo 16)
 * - Columna K: Alcantarillado (sufijo 18)
 * - Columna L: Aseo (sufijo 20)
 * - Columna M: Energía Eléctrica (sufijo 22)
 * - Columna N: Gas Natural (sufijo 24)
 * - Columna O: GLP (sufijo 26)
 * - Columna P: (reservado - sufijo 28)
 * - Columna Q: Otras Actividades (sufijo 30)
 */

import { ROUNDING_DEGREES, type RoundingDegree } from '../xbrl/taxonomyConfig';

import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { 
  ESF_CONCEPTS, 
  INFO_CONCEPTS, 
  getTaxonomyConfig,
  findESFConceptByPUC,
  type ESFConcept,
  type TaxonomyConfig 
} from '../xbrl/taxonomyConfig';

/**
 * Mapeo de cuentas PUC de Gastos (Clase 5) a conceptos FC01
 * Basado en la estructura del PUC para empresas de servicios públicos
 */
const PUC_GASTOS_MAP = {
  // Gastos de personal
  sueldos: ['5105', '510506', '510503', '510509'], // Sueldos y salarios
  prestaciones: ['5110', '5115', '5120', '5125'], // Prestaciones sociales, cesantías, etc.
  gastosPersonal: ['51'], // Gastos de personal (general)
  
  // Servicios
  serviciosPublicos: ['5135', '513525', '513530', '513535'], // Servicios públicos (acueducto, energía, teléfono)
  seguros: ['5130'], // Seguros
  servicios: ['5140', '5145'], // Servicios técnicos, honorarios
  
  // Mantenimiento
  mantenimiento: ['5150', '515005', '515010', '515015'], // Mantenimiento y reparaciones
  adecuacion: ['5155'], // Adecuación e instalación
  
  // Materiales
  materiales: ['5160', '5195'], // Materiales, elementos de aseo, etc.
  
  // Transporte
  transporte: ['5165'], // Transporte, fletes y acarreos
  viajes: ['5170'], // Gastos de viaje
  
  // Depreciaciones y amortizaciones  
  depreciaciones: ['5260', '526005', '526010', '526015', '526099'], // Depreciaciones
  amortizaciones: ['5265', '526505', '526510'], // Amortizaciones
  
  // Otros
  otros: ['5195', '5295', '5299'], // Diversos, otros gastos
} as const;

/**
 * Mapeo de cuentas PUC de Costos (Clase 6) a conceptos FC09
 */
const PUC_COSTOS_MAP = {
  personalDirecto: ['61', '6105', '6110'], // Costo de personal directo
  depreciaciones: ['6160', '616005', '616010'], // Depreciaciones producción
  amortizaciones: ['6165'], // Amortizaciones producción
  serviciosPublicos: ['6135', '613525', '613530'], // Servicios públicos producción
  materiales: ['6155', '6170'], // Materiales y suministros
  mantenimiento: ['6150', '615005', '615010'], // Mantenimiento
  serviciosTerceros: ['6140', '6145'], // Servicios de terceros
  seguros: ['6130'], // Seguros
  otros: ['6195', '6199'], // Otros costos
} as const;

/**
 * Mapeo de cuentas PUC de Ingresos (Clase 4) a conceptos FC02/FC08
 */
const PUC_INGRESOS_MAP = {
  ingresosFacturados: ['41', '4105', '4110', '4115'], // Ingresos por servicios
  otrosIngresos: ['42', '4205', '4210'], // Otros ingresos operacionales
  subsidios: ['4705', '470505', '470510'], // Subsidios recibidos
  contribuciones: ['4175', '417505'], // Contribuciones
  ingresosFinancieros: ['42', '4245', '4250'], // Ingresos financieros
} as const;

/**
 * Estructura para datos procesados de gastos por servicio
 */
interface ProcessedExpenseData {
  sueldos: number;
  prestaciones: number;
  gastosPersonal: number;
  serviciosPublicos: number;
  seguros: number;
  servicios: number;
  mantenimiento: number;
  adecuacion: number;
  materiales: number;
  transporte: number;
  viajes: number;
  depreciaciones: number;
  amortizaciones: number;
  otros: number;
  total: number;
}

/**
 * Estructura para datos procesados de costos por servicio
 */
interface ProcessedCostData {
  personalDirecto: number;
  depreciaciones: number;
  amortizaciones: number;
  serviciosPublicos: number;
  materiales: number;
  mantenimiento: number;
  serviciosTerceros: number;
  seguros: number;
  otros: number;
  total: number;
}

/**
 * Estructura para datos procesados de ingresos por servicio
 */
interface ProcessedIncomeData {
  ingresosFacturados: number;
  otrosIngresos: number;
  subsidios: number;
  contribuciones: number;
  ingresosFinancieros: number;
  total: number;
}

export interface XBRLExcelOptions {
  /** Código RUPS de la empresa */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** NIT de la empresa */
  nit?: string;
  /** Fecha de corte del reporte (YYYY-MM-DD) */
  reportDate: string;
  /** Naturaleza del negocio */
  businessNature?: string;
  /** Fecha de inicio de operaciones */
  startDate?: string;
  /** Grado de redondeo (1=Pesos, 2=Miles, 3=Millones, 4=Pesos redondeados a miles) */
  roundingDegree?: RoundingDegree;
  /** ¿Presenta información reexpresada? */
  hasRestatedInfo?: string;
  /** Período de información reexpresada */
  restatedPeriod?: string;
  /** Grupo de taxonomía (grupo1, grupo2, grupo3, r414) */
  taxonomyGroup?: string;
  /** Servicios activos para la empresa */
  activeServices?: string[];
}

interface AccountData {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

interface ServiceAccountData {
  service: string;
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
}

/**
 * Suma los valores de las cuentas que coinciden con los prefijos PUC especificados
 */
function sumAccountsByPrefixes(accounts: ServiceAccountData[], prefixes: readonly string[]): number {
  let total = 0;
  for (const account of accounts) {
    // Solo sumar cuentas hoja para evitar doble conteo
    if (!account.isLeaf) continue;
    
    for (const prefix of prefixes) {
      if (account.code.startsWith(prefix)) {
        total += account.value;
        break; // Evitar contar la misma cuenta múltiples veces
      }
    }
  }
  return total;
}

/**
 * Procesa datos de gastos (Clase 5) para un servicio específico
 */
function processExpenseData(accounts: ServiceAccountData[]): ProcessedExpenseData {
  const sueldos = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.sueldos);
  const prestaciones = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.prestaciones);
  const gastosPersonal = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.gastosPersonal);
  const serviciosPublicos = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.serviciosPublicos);
  const seguros = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.seguros);
  const servicios = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.servicios);
  const mantenimiento = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.mantenimiento);
  const adecuacion = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.adecuacion);
  const materiales = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.materiales);
  const transporte = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.transporte);
  const viajes = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.viajes);
  const depreciaciones = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.depreciaciones);
  const amortizaciones = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.amortizaciones);
  const otros = sumAccountsByPrefixes(accounts, PUC_GASTOS_MAP.otros);
  
  // Total de gastos clase 5
  const total = accounts
    .filter(a => a.isLeaf && a.code.startsWith('5'))
    .reduce((sum, a) => sum + a.value, 0);
  
  return {
    sueldos,
    prestaciones,
    gastosPersonal,
    serviciosPublicos,
    seguros,
    servicios,
    mantenimiento,
    adecuacion,
    materiales,
    transporte,
    viajes,
    depreciaciones,
    amortizaciones,
    otros,
    total,
  };
}

/**
 * Procesa datos de costos (Clase 6) para un servicio específico
 */
function processCostData(accounts: ServiceAccountData[]): ProcessedCostData {
  const personalDirecto = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.personalDirecto);
  const depreciaciones = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.depreciaciones);
  const amortizaciones = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.amortizaciones);
  const serviciosPublicos = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.serviciosPublicos);
  const materiales = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.materiales);
  const mantenimiento = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.mantenimiento);
  const serviciosTerceros = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.serviciosTerceros);
  const seguros = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.seguros);
  const otros = sumAccountsByPrefixes(accounts, PUC_COSTOS_MAP.otros);
  
  // Total de costos clase 6
  const total = accounts
    .filter(a => a.isLeaf && a.code.startsWith('6'))
    .reduce((sum, a) => sum + a.value, 0);
  
  return {
    personalDirecto,
    depreciaciones,
    amortizaciones,
    serviciosPublicos,
    materiales,
    mantenimiento,
    serviciosTerceros,
    seguros,
    otros,
    total,
  };
}

/**
 * Procesa datos de ingresos (Clase 4) para un servicio específico
 */
function processIncomeData(accounts: ServiceAccountData[]): ProcessedIncomeData {
  const ingresosFacturados = sumAccountsByPrefixes(accounts, PUC_INGRESOS_MAP.ingresosFacturados);
  const otrosIngresos = sumAccountsByPrefixes(accounts, PUC_INGRESOS_MAP.otrosIngresos);
  const subsidios = sumAccountsByPrefixes(accounts, PUC_INGRESOS_MAP.subsidios);
  const contribuciones = sumAccountsByPrefixes(accounts, PUC_INGRESOS_MAP.contribuciones);
  const ingresosFinancieros = sumAccountsByPrefixes(accounts, PUC_INGRESOS_MAP.ingresosFinancieros);
  
  // Total de ingresos clase 4
  const total = accounts
    .filter(a => a.isLeaf && a.code.startsWith('4'))
    .reduce((sum, a) => sum + a.value, 0);
  
  return {
    ingresosFacturados,
    otrosIngresos,
    subsidios,
    contribuciones,
    ingresosFinancieros,
    total,
  };
}

/**
 * Genera un Excel con formato EXACTO compatible para XBRL Express
 * 
 * La estructura generada coincide con el mapeo XML que usa XBRL Express:
 * - Hoja1: Información general en columna E (filas 12-22)
 * - Hoja2: ESF en columnas I-Q (filas 15-70)
 */
export async function generateXBRLCompatibleExcel(options: XBRLExcelOptions): Promise<string> {
  const workbook = XLSX.utils.book_new();
  const taxonomyGroup = (options.taxonomyGroup || 'grupo1') as 'grupo1' | 'grupo2' | 'grupo3' | 'r414';
  const config = getTaxonomyConfig(taxonomyGroup);
  
  // Obtener datos consolidados
  const consolidatedAccounts = await db
    .select()
    .from(workingAccounts)
    .orderBy(workingAccounts.code);
  
  // Obtener datos por servicio
  const serviceData: Record<string, ServiceAccountData[]> = {};
  const defaultServices = ['acueducto', 'alcantarillado', 'aseo'];
  const activeServices = options.activeServices || defaultServices;
  
  for (const service of activeServices) {
    const accounts = await db
      .select()
      .from(serviceBalances)
      .where(eq(serviceBalances.service, service))
      .orderBy(serviceBalances.code);
    
    serviceData[service] = accounts.map(a => ({
      service: a.service,
      code: a.code,
      name: a.name,
      value: a.value,
      isLeaf: a.isLeaf ?? false,
    }));
  }
  
  // Mapear datos contables a conceptos XBRL
  const conceptValues = mapAccountsToXBRLConcepts(consolidatedAccounts, serviceData, activeServices);
  
  // Procesar datos de gastos, costos e ingresos por servicio
  const processedExpenses: Record<string, ProcessedExpenseData> = {};
  const processedCosts: Record<string, ProcessedCostData> = {};
  const processedIncome: Record<string, ProcessedIncomeData> = {};
  
  for (const service of activeServices) {
    const accounts = serviceData[service] || [];
    processedExpenses[service] = processExpenseData(accounts);
    processedCosts[service] = processCostData(accounts);
    processedIncome[service] = processIncomeData(accounts);
  }
  
  // También procesar consolidados
  const consolidatedServiceData: ServiceAccountData[] = consolidatedAccounts.map(a => ({
    service: 'consolidado',
    code: a.code,
    name: a.name,
    value: a.value,
    isLeaf: a.isLeaf ?? false,
  }));
  processedExpenses['total'] = processExpenseData(consolidatedServiceData);
  processedCosts['total'] = processCostData(consolidatedServiceData);
  processedIncome['total'] = processIncomeData(consolidatedServiceData);
  
  // ==========================================
  // HOJA 1: [110000] Información General sobre estados financieros
  // ==========================================
  const infoSheet = createXBRLInfoSheet(options);
  XLSX.utils.book_append_sheet(workbook, infoSheet, '[110000] Info General');
  
  // ==========================================
  // HOJA 2: [210000] Estado de Situación Financiera
  // ==========================================
  const esfSheet = createXBRLESFSheet(conceptValues, config, activeServices);
  XLSX.utils.book_append_sheet(workbook, esfSheet, '[210000] ESF');
  
  // ==========================================
  // HOJA 3: [310000] Estado de Resultados
  // ==========================================
  const resultadosSheet = createEstadoResultadosSheet(processedIncome, processedExpenses, processedCosts, activeServices);
  XLSX.utils.book_append_sheet(workbook, resultadosSheet, '[310000] Estado Resultados');
  
  // ==========================================
  // HOJAS FC01: Gastos de servicios públicos
  // ==========================================
  const fc01AcueductoSheet = createFC01Sheet('acueducto', processedExpenses, options);
  XLSX.utils.book_append_sheet(workbook, fc01AcueductoSheet, '[900017a] FC01-1 Acueducto');
  
  const fc01AlcantarilladoSheet = createFC01Sheet('alcantarillado', processedExpenses, options);
  XLSX.utils.book_append_sheet(workbook, fc01AlcantarilladoSheet, '[900017b] FC01-2 Alcantarillado');
  
  const fc01AseoSheet = createFC01Sheet('aseo', processedExpenses, options);
  XLSX.utils.book_append_sheet(workbook, fc01AseoSheet, '[900017c] FC01-3 Aseo');
  
  const fc01TotalSheet = createFC01TotalSheet(processedExpenses, activeServices);
  XLSX.utils.book_append_sheet(workbook, fc01TotalSheet, '[900017g] FC01-7 Total SP');
  
  // ==========================================
  // HOJA FC02: Complementario ingresos
  // ==========================================
  const fc02Sheet = createFC02Sheet(processedIncome, activeServices);
  XLSX.utils.book_append_sheet(workbook, fc02Sheet, '[900019] FC02 Comp Ingresos');
  
  // ==========================================
  // HOJAS FC03: CXC por servicio y estrato
  // ==========================================
  const fc03AcueductoSheet = createFC03Sheet('acueducto', serviceData, options);
  XLSX.utils.book_append_sheet(workbook, fc03AcueductoSheet, '[900021] FC03-1 CXC Acueducto');
  
  const fc03AlcantarilladoSheet = createFC03Sheet('alcantarillado', serviceData, options);
  XLSX.utils.book_append_sheet(workbook, fc03AlcantarilladoSheet, '[900022] FC03-2 CXC Alcantarillado');
  
  const fc03AseoSheet = createFC03Sheet('aseo', serviceData, options);
  XLSX.utils.book_append_sheet(workbook, fc03AseoSheet, '[900023] FC03-3 CXC Aseo');
  
  // ==========================================
  // HOJA FC08: Conciliación de ingresos
  // ==========================================
  const fc08Sheet = createFC08Sheet(processedIncome, activeServices);
  XLSX.utils.book_append_sheet(workbook, fc08Sheet, '[900031] FC08 Conciliacion');
  
  // ==========================================
  // HOJA FC09: Detalle de costo de ventas
  // ==========================================
  const fc09Sheet = createFC09Sheet(processedCosts, activeServices);
  XLSX.utils.book_append_sheet(workbook, fc09Sheet, '[900032] FC09 Costo Ventas');
  
  // Generar buffer y convertir a base64
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });
  
  return Buffer.from(excelBuffer).toString('base64');
}

/**
 * Mapea las cuentas contables PUC a conceptos XBRL.
 * Retorna un objeto con valores por concepto y por servicio.
 */
function mapAccountsToXBRLConcepts(
  consolidatedAccounts: AccountData[],
  serviceData: Record<string, ServiceAccountData[]>,
  activeServices: string[]
): Map<string, Map<string, number>> {
  // Map<conceptId, Map<serviceId, value>>
  const conceptValues = new Map<string, Map<string, number>>();
  
  // Inicializar todos los conceptos con valores en 0
  for (const concept of ESF_CONCEPTS) {
    const serviceValues = new Map<string, number>();
    serviceValues.set('total', 0);
    for (const service of activeServices) {
      serviceValues.set(service, 0);
    }
    conceptValues.set(concept.concept, serviceValues);
  }
  
  // Mapear cuentas consolidadas (Total)
  for (const account of consolidatedAccounts) {
    const concept = findESFConceptByPUC(account.code);
    if (concept) {
      const serviceValues = conceptValues.get(concept.concept);
      if (serviceValues) {
        const currentValue = serviceValues.get('total') || 0;
        serviceValues.set('total', currentValue + account.value);
      }
    }
  }
  
  // Mapear cuentas por servicio
  for (const service of activeServices) {
    const accounts = serviceData[service] || [];
    for (const account of accounts) {
      const concept = findESFConceptByPUC(account.code);
      if (concept) {
        const serviceValues = conceptValues.get(concept.concept);
        if (serviceValues) {
          const currentValue = serviceValues.get(service) || 0;
          serviceValues.set(service, currentValue + account.value);
        }
      }
    }
  }
  
  // Calcular agregados (conceptos padre suman sus hijos)
  calculateAggregates(conceptValues);
  
  return conceptValues;
}

/**
 * Calcula valores agregados para conceptos padre
 * Los conceptos de nivel más alto agregan los valores de sus hijos
 */
function calculateAggregates(conceptValues: Map<string, Map<string, number>>): void {
  // Definir jerarquía de agregación para ESF
  const aggregations: Record<string, string[]> = {
    // Activos corrientes agregan subcategorías
    'ifrs-full_CurrentAssets': [
      'ifrs-full_CashAndCashEquivalents',
      'ifrs-full_CurrentTradeReceivables',
      'ifrs-full_CurrentFinancialAssets',
      'ifrs-full_Inventories',
      'ifrs-full_CurrentTaxAssets',
      'ifrs-full_OtherCurrentAssets',
    ],
    // Activos no corrientes
    'ifrs-full_NoncurrentAssets': [
      'ifrs-full_PropertyPlantAndEquipment',
      'ifrs-full_InvestmentProperty',
      'ifrs-full_IntangibleAssetsOtherThanGoodwill',
      'ifrs-full_NoncurrentFinancialAssets',
      'ifrs-full_DeferredTaxAssets',
      'ifrs-full_OtherNoncurrentAssets',
    ],
    // Total Activos
    'ifrs-full_Assets': [
      'ifrs-full_CurrentAssets',
      'ifrs-full_NoncurrentAssets',
    ],
    // Pasivos corrientes
    'ifrs-full_CurrentLiabilities': [
      'ifrs-full_CurrentTradePayables',
      'ifrs-full_CurrentBorrowings',
      'ifrs-full_CurrentEmployeeBenefits',
      'ifrs-full_CurrentTaxLiabilities',
      'ifrs-full_OtherCurrentLiabilities',
    ],
    // Pasivos no corrientes
    'ifrs-full_NoncurrentLiabilities': [
      'ifrs-full_NoncurrentBorrowings',
      'ifrs-full_NoncurrentEmployeeBenefits',
      'ifrs-full_DeferredTaxLiabilities',
      'ifrs-full_OtherNoncurrentLiabilities',
    ],
    // Total Pasivos
    'ifrs-full_Liabilities': [
      'ifrs-full_CurrentLiabilities',
      'ifrs-full_NoncurrentLiabilities',
    ],
    // Total Patrimonio
    'ifrs-full_Equity': [
      'ifrs-full_IssuedCapital',
      'ifrs-full_SharePremium',
      'ifrs-full_RetainedEarnings',
      'ifrs-full_OtherReserves',
    ],
    // Total Pasivos y Patrimonio
    'ifrs-full_EquityAndLiabilities': [
      'ifrs-full_Liabilities',
      'ifrs-full_Equity',
    ],
  };
  
  // Aplicar agregaciones de abajo hacia arriba
  const orderedKeys = [
    'ifrs-full_CurrentAssets',
    'ifrs-full_NoncurrentAssets',
    'ifrs-full_Assets',
    'ifrs-full_CurrentLiabilities',
    'ifrs-full_NoncurrentLiabilities',
    'ifrs-full_Liabilities',
    'ifrs-full_Equity',
    'ifrs-full_EquityAndLiabilities',
  ];
  
  for (const parentConcept of orderedKeys) {
    const children = aggregations[parentConcept];
    if (!children) continue;
    
    const parentValues = conceptValues.get(parentConcept);
    if (!parentValues) continue;
    
    // Sumar valores de hijos
    for (const childConcept of children) {
      const childValues = conceptValues.get(childConcept);
      if (!childValues) continue;
      
      for (const [service, value] of childValues) {
        const currentParentValue = parentValues.get(service) || 0;
        parentValues.set(service, currentParentValue + value);
      }
    }
  }
}

/**
 * Crea la Hoja1 de información general con formato XBRL Express.
 * Los datos se colocan en la columna E en filas específicas.
 */
function createXBRLInfoSheet(options: XBRLExcelOptions): XLSX.WorkSheet {
  // Crear matriz de datos vacía con tamaño suficiente
  // XBRL Express espera datos en columna E (índice 4), filas 12-22
  const data: (string | number | null)[][] = [];
  
  // Llenar con filas vacías hasta la fila 25
  for (let i = 0; i < 25; i++) {
    data.push(['', '', '', '', '', '', '']);
  }
  
  // Colocar encabezados y etiquetas en columna B
  data[0][1] = 'INFORMACIÓN GENERAL SOBRE ESTADOS FINANCIEROS';
  data[2][1] = 'Datos de la Empresa';
  
  // Colocar etiquetas en columna B y valores en columna E
  // Según INFO_CONCEPTS del taxonomyConfig.ts:
  // Fila 12: Información a revelar (encabezado)
  // Fila 13: Nombre de la entidad
  // Fila 14: RUPS
  // Fila 15: NIT
  // Fila 16: Naturaleza del negocio
  // Fila 17: Fecha inicio operaciones
  // Fila 18: Fecha de cierre
  // Fila 19: Grado de redondeo
  // Fila 21: Información reexpresada
  // Fila 22: Período información reexpresada
  
  data[11][1] = 'Información a revelar sobre información general';
  data[11][4] = 'Valores';
  
  data[12][1] = 'Nombre de la entidad que informa';
  data[12][4] = options.companyName;
  
  data[13][1] = 'Identificación de la Empresa (ID RUPS)';
  data[13][4] = options.companyId;
  
  data[14][1] = 'Número de Identificación Tributaria (NIT)';
  data[14][4] = options.nit || '';
  
  data[15][1] = 'Descripción de la naturaleza del negocio';
  data[15][4] = options.businessNature || 'Servicios públicos domiciliarios';
  
  data[16][1] = 'Fecha de inicio de operaciones';
  data[16][4] = options.startDate || '';
  
  data[17][1] = 'Fecha de cierre del período sobre el que se informa';
  data[17][4] = options.reportDate;
  
  data[18][1] = 'Grado de redondeo utilizado en los estados financieros';
  data[18][4] = options.roundingDegree ? ROUNDING_DEGREES[options.roundingDegree].label : 'Pesos';
  
  data[20][1] = '¿Se presenta información comparativa reexpresada?';
  data[20][4] = options.hasRestatedInfo || 'No';
  
  data[21][1] = 'Período para el cual se presenta información reexpresada';
  data[21][4] = options.restatedPeriod || '';
  
  // Información adicional
  const year = options.reportDate.split('-')[0];
  data[23][1] = `Año del Reporte: ${year}`;
  data[24][1] = `Generado: ${new Date().toLocaleString('es-CO')}`;
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 3 },   // A
    { wch: 55 },  // B
    { wch: 5 },   // C
    { wch: 5 },   // D
    { wch: 50 },  // E
    { wch: 5 },   // F
  ];
  
  return worksheet;
}

/**
 * Crea la Hoja2 de ESF con formato XBRL Express.
 * 
 * Estructura:
 * - Columnas A-H: Información descriptiva (código, nombre, etc.)
 * - Columna I: Total
 * - Columna J: Acueducto
 * - Columna K: Alcantarillado
 * - Columna L: Aseo
 * - Columna M: Energía Eléctrica
 * - Columna N: Gas Natural
 * - Columna O: GLP
 * - Columna P: (reservado)
 * - Columna Q: Otras Actividades
 * 
 * Filas: Según ESF_CONCEPTS (15-70)
 */
function createXBRLESFSheet(
  conceptValues: Map<string, Map<string, number>>,
  config: TaxonomyConfig,
  activeServices: string[]
): XLSX.WorkSheet {
  // Crear matriz de datos con espacio para 75 filas y 18 columnas (A-R)
  const data: (string | number | null)[][] = [];
  
  for (let i = 0; i < 75; i++) {
    data.push(Array(18).fill(''));
  }
  
  // Encabezados
  data[0][0] = 'ESTADO DE SITUACIÓN FINANCIERA';
  data[0][8] = 'Total';
  
  // Encabezados de servicios en fila 13 (índice 12)
  data[12][0] = 'Código PUC';
  data[12][1] = 'Concepto XBRL';
  data[12][2] = 'Descripción';
  data[12][7] = 'Nivel';
  data[12][8] = 'Total';  // I
  
  // Mapear servicios a columnas
  const serviceToColumn: Record<string, number> = {
    'acueducto': 9,      // J
    'alcantarillado': 10, // K
    'aseo': 11,          // L
    'energia': 12,       // M
    'gas': 13,           // N
    'glp': 14,           // O
    'otras': 16,         // Q
  };
  
  // Colocar encabezados de servicios activos
  for (const service of activeServices) {
    const col = serviceToColumn[service];
    if (col !== undefined) {
      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      data[12][col] = serviceName;
    }
  }
  
  // Colocar datos de conceptos en las filas correspondientes
  for (const concept of ESF_CONCEPTS) {
    const rowIndex = concept.row - 1; // Convertir de fila 1-based a índice 0-based
    
    if (rowIndex >= 0 && rowIndex < data.length) {
      // Columnas descriptivas
      data[rowIndex][0] = concept.pucCode || '';
      data[rowIndex][1] = concept.concept;
      data[rowIndex][2] = concept.label;
      data[rowIndex][7] = concept.level;
      
      // Obtener valores del concepto
      const values = conceptValues.get(concept.concept);
      
      if (values) {
        // Columna I - Total
        const totalValue = values.get('total') || 0;
        data[rowIndex][8] = totalValue;
        
        // Columnas J-Q - Servicios
        for (const service of activeServices) {
          const col = serviceToColumn[service];
          if (col !== undefined) {
            const serviceValue = values.get(service) || 0;
            data[rowIndex][col] = serviceValue;
          }
        }
      }
    }
  }
  
  // Fila de validación de ecuación contable
  data[71][0] = 'VALIDACIÓN';
  data[71][2] = 'Activos - (Pasivos + Patrimonio)';
  
  const assetsValues = conceptValues.get('ifrs-full_Assets');
  const liabilitiesValues = conceptValues.get('ifrs-full_Liabilities');
  const equityValues = conceptValues.get('ifrs-full_Equity');
  
  if (assetsValues && liabilitiesValues && equityValues) {
    const totalAssets = assetsValues.get('total') || 0;
    const totalLiabilities = liabilitiesValues.get('total') || 0;
    const totalEquity = equityValues.get('total') || 0;
    data[71][8] = totalAssets - totalLiabilities - totalEquity;
    
    for (const service of activeServices) {
      const col = serviceToColumn[service];
      if (col !== undefined) {
        const svcAssets = assetsValues.get(service) || 0;
        const svcLiabilities = liabilitiesValues.get(service) || 0;
        const svcEquity = equityValues.get(service) || 0;
        data[71][col] = svcAssets - svcLiabilities - svcEquity;
      }
    }
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 10 },  // A - Código PUC
    { wch: 40 },  // B - Concepto XBRL
    { wch: 45 },  // C - Descripción
    { wch: 5 },   // D
    { wch: 5 },   // E
    { wch: 5 },   // F
    { wch: 5 },   // G
    { wch: 6 },   // H - Nivel
    { wch: 16 },  // I - Total
    { wch: 16 },  // J - Acueducto
    { wch: 16 },  // K - Alcantarillado
    { wch: 16 },  // L - Aseo
    { wch: 16 },  // M - Energía
    { wch: 16 },  // N - Gas
    { wch: 16 },  // O - GLP
    { wch: 16 },  // P - (reservado)
    { wch: 16 },  // Q - Otras
  ];
  
  return worksheet;
}

/**
 * Genera un Excel adicional con formato legible para el usuario.
 * Este Excel incluye todas las hojas de detalle y resumen.
 */
export async function generateDetailedExcel(options: XBRLExcelOptions): Promise<string> {
  const workbook = XLSX.utils.book_new();
  
  // Obtener datos consolidados
  const consolidatedAccounts = await db
    .select()
    .from(workingAccounts)
    .orderBy(workingAccounts.code);
  
  // Obtener datos por servicio
  const serviceData: Record<string, ServiceAccountData[]> = {};
  const services = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];
  
  for (const service of services) {
    const accounts = await db
      .select()
      .from(serviceBalances)
      .where(eq(serviceBalances.service, service))
      .orderBy(serviceBalances.code);
    
    serviceData[service] = accounts.map(a => ({
      service: a.service,
      code: a.code,
      name: a.name,
      value: a.value,
      isLeaf: a.isLeaf ?? false,
    }));
  }
  
  // Calcular totales por clase
  const totals = calculateClassTotals(consolidatedAccounts);
  const serviceTotals: Record<string, ReturnType<typeof calculateClassTotals>> = {};
  for (const service of services) {
    serviceTotals[service] = calculateClassTotals(serviceData[service]);
  }
  
  // Hoja 1: Resumen por Servicios
  const summarySheet = createServiceSummarySheet(serviceTotals, options);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  
  // Hoja 2: Detalle ESF
  const esfDetailSheet = createESFDetailSheet(consolidatedAccounts, serviceData, services);
  XLSX.utils.book_append_sheet(workbook, esfDetailSheet, 'Detalle ESF');
  
  // Hoja 3: Detalle Estado de Resultados
  const erDetailSheet = createERDetailSheet(consolidatedAccounts, serviceData, services);
  XLSX.utils.book_append_sheet(workbook, erDetailSheet, 'Detalle ER');
  
  // Generar buffer y convertir a base64
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });
  
  return Buffer.from(excelBuffer).toString('base64');
}

/**
 * Calcula totales por clase contable
 */
function calculateClassTotals(accounts: Array<{ code: string; value: number }>) {
  const totals = {
    activos: 0,
    pasivos: 0,
    patrimonio: 0,
    ingresos: 0,
    gastos: 0,
    costos: 0,
  };
  
  for (const acc of accounts) {
    const firstDigit = acc.code.charAt(0);
    switch (firstDigit) {
      case '1': totals.activos += acc.value; break;
      case '2': totals.pasivos += acc.value; break;
      case '3': totals.patrimonio += acc.value; break;
      case '4': totals.ingresos += acc.value; break;
      case '5': totals.gastos += acc.value; break;
      case '6': totals.costos += acc.value; break;
    }
  }
  
  return totals;
}

/**
 * Crea la hoja de resumen por servicios
 */
function createServiceSummarySheet(
  serviceTotals: Record<string, ReturnType<typeof calculateClassTotals>>,
  options: XBRLExcelOptions
): XLSX.WorkSheet {
  const services = Object.keys(serviceTotals);
  
  // Calcular totales generales
  let totalActivos = 0, totalPasivos = 0, totalPatrimonio = 0;
  let totalIngresos = 0, totalGastos = 0, totalCostos = 0;
  
  for (const service of services) {
    totalActivos += serviceTotals[service].activos;
    totalPasivos += serviceTotals[service].pasivos;
    totalPatrimonio += serviceTotals[service].patrimonio;
    totalIngresos += serviceTotals[service].ingresos;
    totalGastos += serviceTotals[service].gastos;
    totalCostos += serviceTotals[service].costos;
  }
  
  const data: (string | number | null)[][] = [
    ['RESUMEN POR SERVICIOS'],
    [''],
    ['Empresa:', options.companyName],
    ['RUPS:', options.companyId],
    ['Fecha de corte:', options.reportDate],
    [''],
    ['', ...services.map(s => s.charAt(0).toUpperCase() + s.slice(1)), 'TOTAL'],
    [''],
    ['ACTIVOS', ...services.map(s => serviceTotals[s].activos), totalActivos],
    ['PASIVOS', ...services.map(s => serviceTotals[s].pasivos), totalPasivos],
    ['PATRIMONIO', ...services.map(s => serviceTotals[s].patrimonio), totalPatrimonio],
    [''],
    ['INGRESOS', ...services.map(s => serviceTotals[s].ingresos), totalIngresos],
    ['GASTOS', ...services.map(s => serviceTotals[s].gastos), totalGastos],
    ['COSTOS', ...services.map(s => serviceTotals[s].costos), totalCostos],
    [''],
    ['VALIDACIÓN ECUACIÓN CONTABLE'],
    ['Diferencia (A - P - Pat)', 
      ...services.map(s => serviceTotals[s].activos - serviceTotals[s].pasivos - serviceTotals[s].patrimonio),
      totalActivos - totalPasivos - totalPatrimonio
    ],
    [''],
    ['UTILIDAD/PÉRDIDA'],
    ['Resultado (I - G - C)', 
      ...services.map(s => serviceTotals[s].ingresos - serviceTotals[s].gastos - serviceTotals[s].costos),
      totalIngresos - totalGastos - totalCostos
    ],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  const colWidths = [{ wch: 30 }];
  for (let i = 0; i < services.length + 1; i++) {
    colWidths.push({ wch: 18 });
  }
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Crea la hoja de detalle ESF con todas las cuentas
 */
function createESFDetailSheet(
  consolidatedAccounts: AccountData[],
  serviceData: Record<string, ServiceAccountData[]>,
  services: string[]
): XLSX.WorkSheet {
  const headers = [
    'Código', 'Denominación', 'Nivel', 'Es Hoja',
    'Total', ...services.map(s => s.charAt(0).toUpperCase() + s.slice(1))
  ];
  
  const data: (string | number | null)[][] = [
    ['ESTADO DE SITUACIÓN FINANCIERA - DETALLE'],
    [''],
    headers,
    [''],
  ];
  
  // Filtrar solo cuentas de ESF (activos, pasivos, patrimonio)
  const esfAccounts = consolidatedAccounts.filter(a => 
    ['1', '2', '3'].includes(a.code.charAt(0))
  );
  
  for (const acc of esfAccounts) {
    const row: (string | number | null)[] = [
      acc.code,
      acc.name,
      acc.level,
      acc.isLeaf ? 'Sí' : 'No',
      acc.value,
    ];
    
    for (const service of services) {
      const svcAcc = serviceData[service]?.find(a => a.code === acc.code);
      row.push(svcAcc?.value || 0);
    }
    
    data.push(row);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  const colWidths = [
    { wch: 15 }, { wch: 50 }, { wch: 8 }, { wch: 8 }, { wch: 18 }
  ];
  for (let i = 0; i < services.length; i++) {
    colWidths.push({ wch: 18 });
  }
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

/**
 * Crea la hoja de detalle Estado de Resultados
 */
function createERDetailSheet(
  consolidatedAccounts: AccountData[],
  serviceData: Record<string, ServiceAccountData[]>,
  services: string[]
): XLSX.WorkSheet {
  const headers = [
    'Código', 'Denominación', 'Nivel', 'Es Hoja',
    'Total', ...services.map(s => s.charAt(0).toUpperCase() + s.slice(1))
  ];
  
  const data: (string | number | null)[][] = [
    ['ESTADO DE RESULTADOS - DETALLE'],
    [''],
    headers,
    [''],
  ];
  
  // Filtrar solo cuentas de ER (ingresos, gastos, costos)
  const erAccounts = consolidatedAccounts.filter(a => 
    ['4', '5', '6'].includes(a.code.charAt(0))
  );
  
  for (const acc of erAccounts) {
    const row: (string | number | null)[] = [
      acc.code,
      acc.name,
      acc.level,
      acc.isLeaf ? 'Sí' : 'No',
      acc.value,
    ];
    
    for (const service of services) {
      const svcAcc = serviceData[service]?.find(a => a.code === acc.code);
      row.push(svcAcc?.value || 0);
    }
    
    data.push(row);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  const colWidths = [
    { wch: 15 }, { wch: 50 }, { wch: 8 }, { wch: 8 }, { wch: 18 }
  ];
  for (let i = 0; i < services.length; i++) {
    colWidths.push({ wch: 18 });
  }
  worksheet['!cols'] = colWidths;
  
  return worksheet;
}

// ==========================================
// Función auxiliar para obtener valores totales
// ==========================================
function getConceptValue(conceptValues: Map<string, Map<string, number>>, conceptId: string): number {
  const serviceValues = conceptValues.get(conceptId);
  return serviceValues?.get('total') || 0;
}

// ==========================================
// FUNCIÓN: Estado de Resultados [310000]
// ==========================================
function createEstadoResultadosSheet(
  incomeData: Record<string, ProcessedIncomeData>,
  expenseData: Record<string, ProcessedExpenseData>,
  costData: Record<string, ProcessedCostData>,
  activeServices: string[]
): XLSX.WorkSheet {
  const totalIncome = incomeData['total'] || { ingresosFacturados: 0, otrosIngresos: 0, total: 0, subsidios: 0, contribuciones: 0, ingresosFinancieros: 0 };
  const totalExpense = expenseData['total'] || { total: 0, gastosPersonal: 0, depreciaciones: 0, amortizaciones: 0, serviciosPublicos: 0, seguros: 0, servicios: 0, mantenimiento: 0, adecuacion: 0, materiales: 0, transporte: 0, viajes: 0, sueldos: 0, prestaciones: 0, otros: 0 };
  const totalCost = costData['total'] || { total: 0, personalDirecto: 0, depreciaciones: 0, amortizaciones: 0, serviciosPublicos: 0, materiales: 0, mantenimiento: 0, serviciosTerceros: 0, seguros: 0, otros: 0 };
  
  const utilidadBruta = totalIncome.total - totalCost.total;
  const utilidadOperacional = utilidadBruta - totalExpense.total;
  
  // Crear encabezados con servicios
  const headers = ['CONCEPTOS', 'TOTAL', ...activeServices.map(s => s.charAt(0).toUpperCase() + s.slice(1))];
  
  const data: (string | number)[][] = [
    ['[310000] Estado de Resultados'],
    [],
    headers,
    [],
    // Ingresos
    ['INGRESOS OPERACIONALES', totalIncome.total, ...activeServices.map(s => incomeData[s]?.total || 0)],
    ['  Ingresos por servicios públicos', totalIncome.ingresosFacturados, ...activeServices.map(s => incomeData[s]?.ingresosFacturados || 0)],
    ['  Otros ingresos operacionales', totalIncome.otrosIngresos, ...activeServices.map(s => incomeData[s]?.otrosIngresos || 0)],
    [],
    // Costos
    ['COSTO DE VENTAS', totalCost.total, ...activeServices.map(s => costData[s]?.total || 0)],
    [],
    ['UTILIDAD BRUTA', utilidadBruta, ...activeServices.map(s => (incomeData[s]?.total || 0) - (costData[s]?.total || 0))],
    [],
    // Gastos
    ['GASTOS OPERACIONALES', totalExpense.total, ...activeServices.map(s => expenseData[s]?.total || 0)],
    ['  Gastos de personal', totalExpense.gastosPersonal, ...activeServices.map(s => expenseData[s]?.gastosPersonal || 0)],
    ['  Depreciaciones', totalExpense.depreciaciones, ...activeServices.map(s => expenseData[s]?.depreciaciones || 0)],
    ['  Amortizaciones', totalExpense.amortizaciones, ...activeServices.map(s => expenseData[s]?.amortizaciones || 0)],
    ['  Servicios', totalExpense.servicios, ...activeServices.map(s => expenseData[s]?.servicios || 0)],
    ['  Otros gastos', totalExpense.otros, ...activeServices.map(s => expenseData[s]?.otros || 0)],
    [],
    ['UTILIDAD OPERACIONAL', utilidadOperacional, ...activeServices.map(s => 
      (incomeData[s]?.total || 0) - (costData[s]?.total || 0) - (expenseData[s]?.total || 0)
    )],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Anchos de columna dinámicos
  const colWidths = [{ wch: 35 }, { wch: 18 }];
  for (let i = 0; i < activeServices.length; i++) {
    colWidths.push({ wch: 16 });
  }
  ws['!cols'] = colWidths;
  
  return ws;
}

// ==========================================
// FUNCIÓN: FC01 - Gastos de servicios públicos
// ==========================================
function createFC01Sheet(
  service: string, 
  expenseData: Record<string, ProcessedExpenseData>,
  options: XBRLExcelOptions
): XLSX.WorkSheet {
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
  const data = expenseData[service] || {
    sueldos: 0, prestaciones: 0, gastosPersonal: 0, serviciosPublicos: 0,
    seguros: 0, servicios: 0, mantenimiento: 0, adecuacion: 0,
    materiales: 0, transporte: 0, viajes: 0, depreciaciones: 0,
    amortizaciones: 0, otros: 0, total: 0
  };
  
  const sheetCode = service === 'acueducto' ? 'a' : service === 'alcantarillado' ? 'b' : 'c';
  
  const ws = XLSX.utils.aoa_to_sheet([
    [`[900017${sheetCode}] FC01 - Gastos ${serviceName}`],
    [],
    ['CONCEPTO', 'CÓDIGO PUC', 'VALOR'],
    ['Sueldos y salarios', '5105', data.sueldos],
    ['Prestaciones sociales', '5110-5125', data.prestaciones],
    ['Total gastos de personal', '51', data.gastosPersonal],
    ['Servicios públicos', '5135', data.serviciosPublicos],
    ['Seguros', '5130', data.seguros],
    ['Servicios técnicos y honorarios', '5140-5145', data.servicios],
    ['Mantenimiento y reparaciones', '5150', data.mantenimiento],
    ['Adecuación e instalación', '5155', data.adecuacion],
    ['Materiales y repuestos', '5160', data.materiales],
    ['Transporte, fletes y acarreos', '5165', data.transporte],
    ['Gastos de viaje', '5170', data.viajes],
    ['Depreciaciones', '5260', data.depreciaciones],
    ['Amortizaciones', '5265', data.amortizaciones],
    ['Otros gastos', '5195-5299', data.otros],
    [],
    ['TOTAL GASTOS', '', data.total]
  ]);

  ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }];
  return ws;
}

// ==========================================
// FUNCIÓN: FC01 Total - Resumen gastos SP
// ==========================================
function createFC01TotalSheet(
  expenseData: Record<string, ProcessedExpenseData>,
  activeServices: string[]
): XLSX.WorkSheet {
  // Calcular total general
  let totalGeneral = 0;
  const serviceRows: (string | number)[][] = [];
  
  for (const service of activeServices) {
    const data = expenseData[service] || { total: 0 };
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    serviceRows.push([serviceName, data.total]);
    totalGeneral += data.total;
  }
  
  const ws = XLSX.utils.aoa_to_sheet([
    ['[900017g] FC01-7 Total Servicios Públicos'],
    [],
    ['SERVICIO', 'TOTAL GASTOS'],
    ...serviceRows,
    [],
    ['TOTAL GENERAL', totalGeneral]
  ]);

  ws['!cols'] = [{ wch: 25 }, { wch: 18 }];
  return ws;
}

// ==========================================
// FUNCIÓN: FC02 - Complementario ingresos
// ==========================================
function createFC02Sheet(
  incomeData: Record<string, ProcessedIncomeData>,
  activeServices: string[]
): XLSX.WorkSheet {
  const totalData = incomeData['total'] || {
    ingresosFacturados: 0, otrosIngresos: 0, subsidios: 0,
    contribuciones: 0, ingresosFinancieros: 0, total: 0
  };
  
  // Crear encabezados con servicios
  const headers = ['CONCEPTOS', 'TOTAL', ...activeServices.map(s => s.charAt(0).toUpperCase() + s.slice(1))];
  
  const ws = XLSX.utils.aoa_to_sheet([
    ['[900019] FC02 - Complementario Ingresos'],
    [],
    headers,
    [],
    ['Ingresos facturados por servicios', totalData.ingresosFacturados, 
      ...activeServices.map(s => incomeData[s]?.ingresosFacturados || 0)],
    ['Otros ingresos operacionales', totalData.otrosIngresos,
      ...activeServices.map(s => incomeData[s]?.otrosIngresos || 0)],
    ['Subsidios recibidos', totalData.subsidios,
      ...activeServices.map(s => incomeData[s]?.subsidios || 0)],
    ['Contribuciones', totalData.contribuciones,
      ...activeServices.map(s => incomeData[s]?.contribuciones || 0)],
    ['Ingresos financieros', totalData.ingresosFinancieros,
      ...activeServices.map(s => incomeData[s]?.ingresosFinancieros || 0)],
    [],
    ['TOTAL INGRESOS', totalData.total,
      ...activeServices.map(s => incomeData[s]?.total || 0)]
  ]);

  // Anchos de columna dinámicos
  const colWidths = [{ wch: 35 }, { wch: 18 }];
  for (let i = 0; i < activeServices.length; i++) {
    colWidths.push({ wch: 16 });
  }
  ws['!cols'] = colWidths;
  
  return ws;
}

// ==========================================
// FUNCIÓN: FC03 - CXC por servicio y estrato
// Nota: Los datos de cartera por estrato requieren entrada manual
// ya que no están disponibles en el PUC estándar
// ==========================================
function createFC03Sheet(
  service: string, 
  serviceData: Record<string, ServiceAccountData[]>,
  options: XBRLExcelOptions
): XLSX.WorkSheet {
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
  const sheetCode = service === 'acueducto' ? '900021' : service === 'alcantarillado' ? '900022' : '900023';
  const formNumber = service === 'acueducto' ? '1' : service === 'alcantarillado' ? '2' : '3';
  
  // Buscar cuentas por cobrar del servicio (código 13)
  const accounts = serviceData[service] || [];
  const cxcTotal = accounts
    .filter(a => a.isLeaf && a.code.startsWith('13'))
    .reduce((sum, a) => sum + a.value, 0);
  
  const ws = XLSX.utils.aoa_to_sheet([
    [`[${sheetCode}] FC03-${formNumber} Cartera por Cobrar ${serviceName}`],
    [],
    ['NOTA: Los datos por estrato deben completarse manualmente.'],
    ['El total de CXC del servicio se muestra como referencia.'],
    [],
    ['ESTRATO/SECTOR', 'SALDO INICIAL', 'FACTURACIÓN', 'RECAUDOS', 'AJUSTES', 'SALDO FINAL'],
    ['Estrato 1', '', '', '', '', ''],
    ['Estrato 2', '', '', '', '', ''],
    ['Estrato 3', '', '', '', '', ''],
    ['Estrato 4', '', '', '', '', ''],
    ['Estrato 5', '', '', '', '', ''],
    ['Estrato 6', '', '', '', '', ''],
    ['Comercial', '', '', '', '', ''],
    ['Industrial', '', '', '', '', ''],
    ['Oficial', '', '', '', '', ''],
    ['Otros', '', '', '', '', ''],
    [],
    ['TOTAL', '', '', '', '', ''],
    [],
    ['REFERENCIA:'],
    ['CXC Servicios Públicos (cuenta 13)', cxcTotal],
  ]);

  ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  return ws;
}

// ==========================================
// FUNCIÓN: FC08 - Conciliación de ingresos
// ==========================================
function createFC08Sheet(
  incomeData: Record<string, ProcessedIncomeData>,
  activeServices: string[]
): XLSX.WorkSheet {
  const totalData = incomeData['total'] || {
    ingresosFacturados: 0, otrosIngresos: 0, subsidios: 0,
    contribuciones: 0, ingresosFinancieros: 0, total: 0
  };
  
  // Calcular ingresos netos: facturados - subsidios + contribuciones
  const ingresosNetos = totalData.ingresosFacturados - totalData.subsidios + totalData.contribuciones;
  const totalOperacionales = ingresosNetos + totalData.otrosIngresos;
  
  // Crear encabezados con servicios
  const headers = ['CONCEPTOS', 'TOTAL', ...activeServices.map(s => s.charAt(0).toUpperCase() + s.slice(1))];
  
  const ws = XLSX.utils.aoa_to_sheet([
    ['[900031] FC08 - Conciliación de Ingresos'],
    [],
    headers,
    [],
    ['Ingresos facturados por servicios', totalData.ingresosFacturados,
      ...activeServices.map(s => incomeData[s]?.ingresosFacturados || 0)],
    ['Menos: Subsidios otorgados', totalData.subsidios,
      ...activeServices.map(s => incomeData[s]?.subsidios || 0)],
    ['Más: Contribuciones recibidas', totalData.contribuciones,
      ...activeServices.map(s => incomeData[s]?.contribuciones || 0)],
    [],
    ['INGRESOS NETOS POR SERVICIOS', ingresosNetos,
      ...activeServices.map(s => {
        const data = incomeData[s] || { ingresosFacturados: 0, subsidios: 0, contribuciones: 0 };
        return data.ingresosFacturados - data.subsidios + data.contribuciones;
      })],
    [],
    ['Otros ingresos operacionales', totalData.otrosIngresos,
      ...activeServices.map(s => incomeData[s]?.otrosIngresos || 0)],
    [],
    ['TOTAL INGRESOS OPERACIONALES', totalOperacionales,
      ...activeServices.map(s => {
        const data = incomeData[s] || { ingresosFacturados: 0, subsidios: 0, contribuciones: 0, otrosIngresos: 0 };
        return (data.ingresosFacturados - data.subsidios + data.contribuciones) + data.otrosIngresos;
      })],
  ]);

  // Anchos de columna dinámicos
  const colWidths = [{ wch: 35 }, { wch: 18 }];
  for (let i = 0; i < activeServices.length; i++) {
    colWidths.push({ wch: 16 });
  }
  ws['!cols'] = colWidths;
  
  return ws;
}

// ==========================================
// FUNCIÓN: FC09 - Detalle de costo de ventas
// ==========================================
function createFC09Sheet(
  costData: Record<string, ProcessedCostData>,
  activeServices: string[]
): XLSX.WorkSheet {
  const totalData = costData['total'] || {
    personalDirecto: 0, depreciaciones: 0, amortizaciones: 0,
    serviciosPublicos: 0, materiales: 0, mantenimiento: 0,
    serviciosTerceros: 0, seguros: 0, otros: 0, total: 0
  };
  
  // Crear encabezados con servicios
  const headers = ['CONCEPTOS', ...activeServices.map(s => s.charAt(0).toUpperCase() + s.slice(1)), 'TOTAL'];
  
  const ws = XLSX.utils.aoa_to_sheet([
    ['[900032] FC09 - Detalle de Costo de Ventas'],
    [],
    headers,
    [],
    ['Costos de personal directo', 
      ...activeServices.map(s => costData[s]?.personalDirecto || 0), totalData.personalDirecto],
    ['Depreciaciones', 
      ...activeServices.map(s => costData[s]?.depreciaciones || 0), totalData.depreciaciones],
    ['Amortizaciones', 
      ...activeServices.map(s => costData[s]?.amortizaciones || 0), totalData.amortizaciones],
    ['Servicios públicos', 
      ...activeServices.map(s => costData[s]?.serviciosPublicos || 0), totalData.serviciosPublicos],
    ['Materiales y suministros', 
      ...activeServices.map(s => costData[s]?.materiales || 0), totalData.materiales],
    ['Mantenimiento y reparaciones', 
      ...activeServices.map(s => costData[s]?.mantenimiento || 0), totalData.mantenimiento],
    ['Servicios de terceros', 
      ...activeServices.map(s => costData[s]?.serviciosTerceros || 0), totalData.serviciosTerceros],
    ['Seguros', 
      ...activeServices.map(s => costData[s]?.seguros || 0), totalData.seguros],
    ['Otros costos', 
      ...activeServices.map(s => costData[s]?.otros || 0), totalData.otros],
    [],
    ['TOTAL COSTO DE VENTAS', 
      ...activeServices.map(s => costData[s]?.total || 0), totalData.total],
  ]);

  // Anchos de columna dinámicos
  const colWidths = [{ wch: 30 }];
  for (let i = 0; i < activeServices.length; i++) {
    colWidths.push({ wch: 16 });
  }
  colWidths.push({ wch: 18 }); // Total
  ws['!cols'] = colWidths;
  
  return ws;
}
