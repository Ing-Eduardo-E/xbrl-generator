/**
 * Servicio para manejar plantillas oficiales de XBRL Express.
 * 
 * NUEVO ENFOQUE:
 * En lugar de generar la estructura XBRL desde cero, este servicio:
 * 1. Usa las plantillas oficiales de XBRL Express (archivos .xbrlt)
 * 2. Parsea la estructura del archivo .xbrlt para extraer los mapeos
 * 3. Genera el Excel con los datos en las celdas correctas
 * 4. Genera el archivo .xml de mapeo (XBRLDataSourceExcelMap)
 * 5. Adapta el archivo .xbrlt con los datos de la empresa
 * 
 * TAXONOMÍAS SOPORTADAS:
 * - R414: Resolución 414 de 2014 (Contaduría General de la Nación)
 * - Grupo1: NIIF Plenas (Grupo 1)
 * - Grupo2: NIIF PYMES (Grupo 2)
 * - Grupo3: Microempresas (Grupo 3)
 */

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances, balanceSessions } from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

/** Tipos de taxonomía soportados */
export type TaxonomyType = 'r414' | 'grupo1' | 'grupo2' | 'grupo3';

/** Configuración de una taxonomía */
export interface TaxonomyTemplateConfig {
  /** Identificador de la taxonomía */
  id: TaxonomyType;
  /** Nombre para mostrar */
  name: string;
  /** Prefijo XBRL (ej: co-sspd-ef-Res414) */
  prefix: string;
  /** Namespace XBRL */
  namespace: string;
  /** URL del schema */
  schemaUrl: string;
  /** URL del punto de entrada */
  entryPointUrl: string;
  /** Nombre del archivo de plantilla Excel */
  excelTemplateName: string;
  /** Nombre del archivo de plantilla xbrlt */
  xbrltTemplateName: string;
  /** Año de la taxonomía */
  taxonomyYear: string;
}

/** Mapeo de un fact XBRL a una celda Excel */
export interface FactCellMapping {
  /** Identificador único del mapeo */
  mapIdentifier: string;
  /** Concepto XBRL (ej: co-sspd-ef-Res414:EfectivoYEquivalentesAlEfectivo) */
  concept: string;
  /** Referencia al contexto */
  contextRef: string;
  /** Referencia a la unidad (opcional para strings) */
  unitRef?: string;
  /** Celda Excel (ej: Hoja2!I14) */
  cell?: string;
}

/** Contexto XBRL */
export interface XBRLContext {
  id: string;
  period: {
    type: 'instant' | 'duration';
    instant?: string;
    startDate?: string;
    endDate?: string;
  };
  scenario?: {
    dimension: string;
    member: string;
  };
}

/** Configuración parseada de un archivo .xbrlt */
export interface ParsedXBRLTemplate {
  /** URL del schema DTS */
  dtsFile: string;
  /** Scheme de la entidad */
  entityScheme: string;
  /** ID de la empresa */
  companyId: string;
  /** Contextos definidos */
  contexts: XBRLContext[];
  /** Mapeos de facts */
  factMappings: FactCellMapping[];
  /** XML original procesado */
  rawXml: string;
}

/** Resultado de la generación */
export interface TemplateGenerationResult {
  /** Contenido del archivo Excel (.xlsx) */
  excelBuffer: Buffer;
  /** Contenido del archivo de mapeo (.xml) */
  xmlMapping: string;
  /** Contenido del archivo .xbrlt */
  xbrltContent: string;
  /** Nombre base de los archivos */
  baseName: string;
}

// ============================================================================
// CONFIGURACIÓN DE TAXONOMÍAS
// ============================================================================

export const TAXONOMY_TEMPLATES: Record<TaxonomyType, TaxonomyTemplateConfig> = {
  r414: {
    id: 'r414',
    name: 'Resolución 414 de 2014',
    prefix: 'co-sspd-ef-Res414',
    namespace: 'http://www.superservicios.gov.co/xbrl/ef/core/2024-12-31',
    schemaUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/res414/co-sspd-ef-Res414-core_2024-12-31.xsd',
    entryPointUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/res414/PuntoEntrada_R414_Individual-2024.xsd',
    excelTemplateName: 'PuntoEntrada_R414_Individual-2024_1.xlsx',
    xbrltTemplateName: 'PuntoEntrada_R414_Individual-2024.xbrlt',
    taxonomyYear: '2024',
  },
  grupo1: {
    id: 'grupo1',
    name: 'NIIF Plenas (Grupo 1)',
    prefix: 'co-sspd-ef-Grupo1',
    namespace: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo1/sspdgroup1',
    schemaUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo1/Comun/co-sspd-ef-Grupo1_2024-12-31.xsd',
    entryPointUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo1/Comun/co-sspd-ef-Grupo1_2024-12-31.xsd',
    excelTemplateName: 'Grupo1_Individual_2024.xlsx',
    xbrltTemplateName: 'Grupo1_Individual_2024.xbrlt',
    taxonomyYear: '2024',
  },
  grupo2: {
    id: 'grupo2',
    name: 'NIIF PYMES (Grupo 2)',
    prefix: 'co-sspd-ef-Grupo2',
    namespace: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo2/sspdgroup2',
    schemaUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo2/Comun/co-sspd-ef-Grupo2_2024-12-31.xsd',
    entryPointUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo2/Comun/co-sspd-ef-Grupo2_2024-12-31.xsd',
    excelTemplateName: 'Grupo2_Individual_2024.xlsx',
    xbrltTemplateName: 'Grupo2_Individual_2024.xbrlt',
    taxonomyYear: '2024',
  },
  grupo3: {
    id: 'grupo3',
    name: 'Microempresas (Grupo 3)',
    prefix: 'co-sspd-ef-Grupo3',
    namespace: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo3/sspdgroup3',
    schemaUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo3/Comun/co-sspd-ef-Grupo3_2024-12-31.xsd',
    entryPointUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo3/Comun/co-sspd-ef-Grupo3_2024-12-31.xsd',
    excelTemplateName: 'Grupo3_Individual_2024.xlsx',
    xbrltTemplateName: 'Grupo3_Individual_2024.xbrlt',
    taxonomyYear: '2024',
  },
};

// ============================================================================
// MAPEO DE CONCEPTOS PUC A XBRL (R414)
// ============================================================================

/**
 * Mapeo de cuentas PUC a conceptos XBRL para R414.
 * La estructura del ESF sigue la Resolución 414 de la CGN.
 */
export const PUC_TO_XBRL_R414: Record<string, string> = {
  // ACTIVOS CORRIENTES
  '1105': 'EfectivoYEquivalentesAlEfectivo', // Caja
  '1110': 'EfectivoYEquivalentesAlEfectivo', // Bancos
  '1115': 'EfectivoYEquivalentesAlEfectivo', // Remesas en tránsito
  '1120': 'EfectivoYEquivalentesAlEfectivoDeUsoRestringidoCorrientes', // Cuentas de ahorro
  '1305': 'CuentasComercialesCobrarCorrientesServiciosPublicos', // Clientes
  '1310': 'CuentasComercialesCobrarCorrientesServiciosPublicos', // Cuentas corrientes comerciales
  '1315': 'CuentasComercialesCobrarPorSubsidiosCorrientes', // Cuentas por cobrar a vinculados económicos
  '1320': 'CuentasPorCobrarCorrientesAPartesRelacionadas', // Cuentas por cobrar a directores
  '1325': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Cuentas por cobrar a socios
  '1330': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Anticipos y avances
  '1335': 'CuentasComercialesCobrarAdquisicionBienesCorrientes', // Depósitos
  '1340': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Promesas de compraventa
  '1345': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Ingresos por cobrar
  '1355': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Anticipo de impuestos
  '1360': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Reclamaciones
  '1365': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Cuentas por cobrar a trabajadores
  '1380': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Deudores varios
  '1399': 'OtrasCuentasComercialesCobrarOtrasCuentasCobrarCorrientes', // Provisiones (negativo)
  '14': 'InventariosCorrientes', // Inventarios
  '1705': 'ActivoPorImpuestoALasGananciasCorriente', // Cargos diferidos
  '12': 'OtrosActivosFinancierosCorrientes', // Inversiones
  '1710': 'OtrosActivosNoFinancierosCorrientes', // Otros activos
  
  // ACTIVOS NO CORRIENTES
  '15': 'PropiedadesPlantaYEquipo', // Propiedad, planta y equipo
  '16': 'PropiedadesDeInversion', // Intangibles
  '1905': 'ActivosPorImpuestosDiferidos', // Activo diferido largo plazo
  
  // PASIVOS CORRIENTES
  '21': 'ObligacionesFinancierasCorrientes', // Obligaciones financieras
  '22': 'CuentasPorPagarComercialesCorrientes', // Proveedores
  '23': 'CuentasPorPagarCorrientes', // Cuentas por pagar
  '24': 'PasivoPorImpuestoALasGananciasCorriente', // Impuestos gravámenes y tasas
  '25': 'PasivosPorBeneficiosAEmpleadosCorriente', // Obligaciones laborales
  '26': 'OtrasProvisoinesCorrientes', // Pasivos estimados y provisiones
  '27': 'PasivosContingentes', // Diferidos (ingresos recibidos por anticipado)
  '28': 'OtrosPasivosCorrientes', // Otros pasivos
  '29': 'BonosYPapelesComerciales', // Bonos y títulos
  
  // PATRIMONIO
  '31': 'CapitalEmitido', // Capital social
  '32': 'PrimaDeEmision', // Superávit de capital
  '33': 'ReservasDistribuibles', // Reservas
  '34': 'RevalorazionDelPatrimonio', // Revalorización del patrimonio
  '36': 'GananciasAcumuladas', // Resultados del ejercicio
  '37': 'GananciasAcumuladas', // Resultados de ejercicios anteriores
  '38': 'SuperavitPorRevaluacion', // Superávit por valorizaciones
  
  // INGRESOS (Clase 4)
  '41': 'IngresoDeActividadesOrdinariasPorServiciosPublicos', // Ingresos operacionales
  '42': 'OtrosIngresos', // Otros ingresos
  
  // GASTOS (Clase 5)
  '51': 'GastosDeAdministracionPorNaturaleza', // Gastos de administración
  '52': 'GastosDeVentasPorNaturaleza', // Gastos de ventas
  '53': 'OtrosGastos', // Otros gastos
  
  // COSTOS (Clase 6)
  '61': 'CostoDeVentas', // Costo de ventas
  '62': 'CostoDeVentas', // Compras
  '63': 'CostoDeVentas', // Costo de producción
};

/**
 * Mapeo de servicios a dimensiones XBRL para R414
 */
export const SERVICE_DIMENSIONS_R414: Record<string, string> = {
  total: '', // Sin dimensión
  acueducto: 'AcueductoMember',
  alcantarillado: 'AlcantarilladoMember',
  aseo: 'AseoMember',
  energia: 'EnergiaElectricaMember',
  gas_natural: 'GasNaturalMember',
  glp: 'GasLicuadoDePetroleoMember',
  otras: 'OtrasActividadesMember',
};

// ============================================================================
// PARSER DE ARCHIVOS .xbrlt
// ============================================================================

/**
 * Parsea un archivo .xbrlt para extraer la estructura de mapeo.
 * @param xbrltContent - Contenido del archivo .xbrlt
 * @returns Estructura parseada del template
 */
export function parseXBRLTemplate(xbrltContent: string): ParsedXBRLTemplate {
  const contexts: XBRLContext[] = [];
  const factMappings: FactCellMapping[] = [];
  
  // Extraer DTS file
  const dtsMatch = xbrltContent.match(/<file>([^<]+)<\/file>/);
  const dtsFile = dtsMatch ? dtsMatch[1] : '';
  
  // Extraer scheme y company
  const schemeMatch = xbrltContent.match(/<scheme>([^<]+)<\/scheme>/);
  const companyMatch = xbrltContent.match(/<company>([^<]+)<\/company>/);
  const entityScheme = schemeMatch ? schemeMatch[1] : 'http://www.sui.gov.co/rups';
  const companyId = companyMatch ? companyMatch[1] : '';
  
  // Extraer contextos
  const contextRegex = /<context id="([^"]+)">([\s\S]*?)<\/context>/g;
  let contextMatch;
  while ((contextMatch = contextRegex.exec(xbrltContent)) !== null) {
    const contextId = contextMatch[1];
    const contextBody = contextMatch[2];
    
    const context: XBRLContext = {
      id: contextId,
      period: { type: 'instant' },
    };
    
    // Extraer periodo
    const instantMatch = contextBody.match(/<instant>([^<]+)<\/instant>/);
    const startDateMatch = contextBody.match(/<startDate>([^<]+)<\/startDate>/);
    const endDateMatch = contextBody.match(/<endDate>([^<]+)<\/endDate>/);
    
    if (instantMatch) {
      context.period = { type: 'instant', instant: instantMatch[1] };
    } else if (startDateMatch && endDateMatch) {
      context.period = { type: 'duration', startDate: startDateMatch[1], endDate: endDateMatch[1] };
    }
    
    // Extraer dimensión si existe
    const dimensionMatch = contextBody.match(/<xbrldi:explicitMember dimension="([^"]+)">([^<]+)<\/xbrldi:explicitMember>/);
    if (dimensionMatch) {
      context.scenario = {
        dimension: dimensionMatch[1],
        member: dimensionMatch[2],
      };
    }
    
    contexts.push(context);
  }
  
  // Extraer facts
  const factRegex = /<item\s+sourceRef="[^"]*"\s+contextRef="([^"]*)"\s+mapIdentifier="([^"]*)"\s+concept="([^"]*)"(?:\s+unitRef="([^"]*)")?[^>]*\/>/g;
  let factMatch;
  while ((factMatch = factRegex.exec(xbrltContent)) !== null) {
    factMappings.push({
      contextRef: factMatch[1],
      mapIdentifier: factMatch[2],
      concept: factMatch[3],
      unitRef: factMatch[4] || undefined,
    });
  }
  
  return {
    dtsFile,
    entityScheme,
    companyId,
    contexts,
    factMappings,
    rawXml: xbrltContent,
  };
}

// ============================================================================
// GENERADOR DE EXCEL
// ============================================================================

/**
 * Opciones para la generación del Excel
 */
export interface ExcelGenerationOptions {
  /** Tipo de taxonomía */
  taxonomyType: TaxonomyType;
  /** Nombre de la empresa */
  companyName: string;
  /** ID RUPS */
  companyId: string;
  /** NIT */
  nit: string;
  /** Fecha de cierre */
  reportDate: string;
  /** Grado de redondeo */
  roundingDegree: '1' | '2' | '3' | '4';
  /** Naturaleza del negocio */
  businessNature?: string;
  /** Servicios a incluir */
  services: string[];
}

/**
 * Genera el Excel con los datos del balance usando la plantilla oficial.
 * @param templateWorkbook - Workbook de la plantilla oficial
 * @param options - Opciones de generación
 * @returns Buffer del Excel generado
 */
export async function generateExcelFromTemplate(
  templateWorkbook: XLSX.WorkBook,
  options: ExcelGenerationOptions
): Promise<Buffer> {
  const config = TAXONOMY_TEMPLATES[options.taxonomyType];
  
  // Obtener datos del balance de la base de datos
  const accounts = await db.select().from(workingAccounts);
  const serviceData = await db.select().from(serviceBalances);
  
  // Clonar el workbook
  const wb = XLSX.utils.book_new();
  
  // Copiar todas las hojas
  for (const sheetName of templateWorkbook.SheetNames) {
    const ws = templateWorkbook.Sheets[sheetName];
    wb.SheetNames.push(sheetName);
    wb.Sheets[sheetName] = { ...ws };
  }
  
  // Actualizar Hoja1 - Información General
  updateInfoSheet(wb, options);
  
  // Actualizar Hoja2 - Estado de Situación Financiera
  updateESFSheet(wb, accounts, serviceData, config);
  
  // Actualizar hojas FC si existen
  updateFCSheets(wb, accounts, serviceData, config);
  
  // Generar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

/**
 * Actualiza la hoja de información general
 */
function updateInfoSheet(wb: XLSX.WorkBook, options: ExcelGenerationOptions): void {
  const ws = wb.Sheets['Hoja1'];
  if (!ws) return;
  
  // Mapeo de celdas para R414 (basado en el Excel oficial)
  const cellMappings: Record<string, string | number> = {
    'E11': options.companyName,
    'E12': options.companyId,
    'E13': options.nit,
    'E14': '1. Individual', // Naturaleza de los EF
    'E15': options.businessNature || 'Servicios públicos domiciliarios',
    'E17': formatExcelDate(options.reportDate),
    'E18': getRoundingLabel(options.roundingDegree),
    'E20': '2. No', // ¿Información reexpresada?
  };
  
  for (const [cell, value] of Object.entries(cellMappings)) {
    ws[cell] = { t: typeof value === 'number' ? 'n' : 's', v: value };
  }
}

/**
 * Actualiza la hoja de Estado de Situación Financiera
 */
function updateESFSheet(
  wb: XLSX.WorkBook,
  accounts: typeof workingAccounts.$inferSelect[],
  serviceData: typeof serviceBalances.$inferSelect[],
  config: TaxonomyTemplateConfig
): void {
  const ws = wb.Sheets['Hoja2'];
  if (!ws) return;
  
  // Agrupar cuentas por código PUC y servicio
  const accountsByPUC = groupAccountsByPUC(accounts);
  const serviceAmounts = calculateServiceAmounts(serviceData);
  
  // Mapeo de filas para conceptos ESF (R414)
  // Basado en la estructura del Excel oficial
  const rowMappings: Record<string, number> = {
    'EfectivoYEquivalentesAlEfectivo': 14,
    'EfectivoYEquivalentesAlEfectivoDeUsoRestringidoCorrientes': 15,
    'CuentasComercialesCobrarCorrientesServiciosPublicos': 22,
    'InventariosCorrientes': 27,
    'ActivoPorImpuestoALasGananciasCorriente': 28,
    'OtrosActivosFinancierosCorrientes': 29,
    'OtrosActivosNoFinancierosCorrientes': 30,
    'ActivosCorrientes': 31,
    'PropiedadesPlantaYEquipo': 32,
    // ... más mapeos
  };
  
  // Columnas por servicio
  const serviceColumns: Record<string, string> = {
    'total': 'H',
    'acueducto': 'I',
    'alcantarillado': 'J',
    'aseo': 'K',
    'energia': 'L',
    'gas_natural': 'M',
    'glp': 'N',
  };
  
  // Actualizar celdas con valores
  for (const [concept, row] of Object.entries(rowMappings)) {
    for (const [service, column] of Object.entries(serviceColumns)) {
      const amount = getAmountForConcept(concept, service, accountsByPUC, serviceAmounts);
      if (amount !== 0) {
        const cell = `${column}${row}`;
        ws[cell] = { t: 'n', v: amount };
      }
    }
  }
}

/**
 * Actualiza las hojas FC (Formularios Complementarios)
 */
function updateFCSheets(
  wb: XLSX.WorkBook,
  accounts: typeof workingAccounts.$inferSelect[],
  serviceData: typeof serviceBalances.$inferSelect[],
  config: TaxonomyTemplateConfig
): void {
  // FC01 - Gastos por servicio
  // FC02 - Ingresos complementarios
  // FC03 - CXC por estrato
  // etc.
  
  // TODO: Implementar actualización de hojas FC
}

// ============================================================================
// GENERADOR DE ARCHIVO .xbrlt
// ============================================================================

/**
 * Genera el archivo .xbrlt adaptando la plantilla base
 * @param template - Template parseado
 * @param options - Opciones de generación
 * @param excelFileName - Nombre del archivo Excel generado
 * @returns Contenido del archivo .xbrlt
 */
export function generateXBRLT(
  template: ParsedXBRLTemplate,
  options: ExcelGenerationOptions,
  excelFileName: string
): string {
  const config = TAXONOMY_TEMPLATES[options.taxonomyType];
  
  // Reemplazar el nombre del archivo XML de configuración
  let xbrlt = template.rawXml;
  
  // Actualizar el archivo de configuración (apunta al .xml de mapeo)
  const xmlConfigName = excelFileName.replace('.xlsx', '.xml');
  xbrlt = xbrlt.replace(
    /config="[^"]*\.xml"/,
    `config="${xmlConfigName}"`
  );
  
  // Actualizar el company ID
  xbrlt = xbrlt.replace(
    /<company>[^<]*<\/company>/,
    `<company>${options.companyId}</company>`
  );
  
  return xbrlt;
}

/**
 * Genera el archivo XML de mapeo Excel -> XBRL
 * @param factMappings - Mapeos de facts a celdas
 * @returns Contenido del archivo XML de mapeo
 */
export function generateExcelMapping(factMappings: FactCellMapping[]): string {
  const mappings = factMappings
    .filter(m => m.cell) // Solo los que tienen celda asignada
    .map(m => `  <map>
    <mapId>${m.mapIdentifier}</mapId>
    <cell>${m.cell}</cell>
  </map>`)
    .join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Archivo de mapeo Excel -> XBRL generado automáticamente -->
<XBRLDataSourceExcelMap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.reportingstandard.com/schemas/mapper/XBRLDataSourceExcelMapSchema.xsd">
${mappings}
</XBRLDataSourceExcelMap>`;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function formatExcelDate(dateStr: string): number {
  // Convertir fecha ISO a número de serie Excel
  const date = new Date(dateStr);
  const epoch = new Date(1899, 11, 30);
  const diff = date.getTime() - epoch.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getRoundingLabel(degree: string): string {
  const labels: Record<string, string> = {
    '1': '1 - Pesos',
    '2': '2 - Miles de pesos',
    '3': '3 - Millones de pesos',
    '4': '4 - Pesos redondeada a miles',
  };
  return labels[degree] || '1 - Pesos';
}

function groupAccountsByPUC(accounts: typeof workingAccounts.$inferSelect[]): Map<string, typeof workingAccounts.$inferSelect[]> {
  const grouped = new Map<string, typeof workingAccounts.$inferSelect[]>();
  for (const account of accounts) {
    const key = account.code.substring(0, 4); // Primeros 4 dígitos
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(account);
  }
  return grouped;
}

function calculateServiceAmounts(serviceData: typeof serviceBalances.$inferSelect[]): Map<string, Map<string, number>> {
  const amounts = new Map<string, Map<string, number>>();
  for (const item of serviceData) {
    if (!amounts.has(item.code)) {
      amounts.set(item.code, new Map());
    }
    amounts.get(item.code)!.set(item.service, Number(item.value));
  }
  return amounts;
}

function getAmountForConcept(
  concept: string,
  service: string,
  accountsByPUC: Map<string, typeof workingAccounts.$inferSelect[]>,
  serviceAmounts: Map<string, Map<string, number>>
): number {
  // Buscar las cuentas PUC que corresponden a este concepto
  const pucCodes = Object.entries(PUC_TO_XBRL_R414)
    .filter(([_, xbrlConcept]) => xbrlConcept === concept)
    .map(([puc]) => puc);
  
  let total = 0;
  for (const puc of pucCodes) {
    const serviceMap = serviceAmounts.get(puc);
    if (serviceMap) {
      total += serviceMap.get(service) || 0;
    }
  }
  
  return total;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// ============================================================================

/**
 * Genera el paquete completo (Excel + XML + xbrlt) para XBRL Express
 * @param templatePath - Ruta al archivo .xbrlt de plantilla
 * @param excelTemplatePath - Ruta al archivo Excel de plantilla
 * @param options - Opciones de generación
 * @returns ZIP con todos los archivos
 */
export async function generateXBRLPackage(
  xbrltTemplateContent: string,
  excelTemplateBuffer: Buffer,
  options: ExcelGenerationOptions
): Promise<Buffer> {
  const config = TAXONOMY_TEMPLATES[options.taxonomyType];
  
  // 1. Parsear el template .xbrlt
  const parsedTemplate = parseXBRLTemplate(xbrltTemplateContent);
  
  // 2. Cargar el Excel template
  const templateWb = XLSX.read(excelTemplateBuffer, { type: 'buffer' });
  
  // 3. Generar Excel con datos
  const excelBuffer = await generateExcelFromTemplate(templateWb, options);
  
  // 4. Generar nombre base
  const baseName = `${config.prefix.replace('co-sspd-ef-', '')}_Individual_${options.companyId}_${options.reportDate}`;
  
  // 5. Generar archivo XML de mapeo
  const xmlMapping = generateExcelMapping(parsedTemplate.factMappings);
  
  // 6. Generar archivo .xbrlt
  const xbrltContent = generateXBRLT(parsedTemplate, options, `${baseName}.xlsx`);
  
  // 7. Crear ZIP
  const zip = new JSZip();
  zip.file(`${baseName}.xlsx`, excelBuffer);
  zip.file(`${baseName}.xml`, xmlMapping);
  zip.file(`${baseName}.xbrlt`, xbrltContent);
  zip.file('README.txt', generateReadme(baseName, options));
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}

function generateReadme(baseName: string, options: ExcelGenerationOptions): string {
  return `PAQUETE XBRL GENERADO
=====================

Empresa: ${options.companyName}
ID RUPS: ${options.companyId}
NIT: ${options.nit}
Fecha de reporte: ${options.reportDate}
Taxonomía: ${TAXONOMY_TEMPLATES[options.taxonomyType].name}

ARCHIVOS INCLUIDOS:
------------------
1. ${baseName}.xlsx  - Archivo Excel con los datos del balance
2. ${baseName}.xml   - Archivo de mapeo Excel -> XBRL
3. ${baseName}.xbrlt - Archivo template para XBRL Express

INSTRUCCIONES:
--------------
1. Abrir XBRL Express
2. Seleccionar "Abrir Informe" -> archivo .xbrlt
3. El programa cargará automáticamente los datos del Excel
4. Completar/verificar los datos faltantes
5. Generar el archivo XBRL final

Generado: ${new Date().toISOString()}
`;
}
