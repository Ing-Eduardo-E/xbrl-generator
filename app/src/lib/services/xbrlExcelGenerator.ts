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
  
  // ==========================================
  // HOJA 1: Información General (formato XBRL Express)
  // ==========================================
  const infoSheet = createXBRLInfoSheet(options);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Hoja1');
  
  // ==========================================
  // HOJA 2: Estado de Situación Financiera (formato XBRL Express)
  // ==========================================
  const esfSheet = createXBRLESFSheet(conceptValues, config, activeServices);
  XLSX.utils.book_append_sheet(workbook, esfSheet, 'Hoja2');
  
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
