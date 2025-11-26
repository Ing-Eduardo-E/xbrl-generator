/**
 * Configuración de taxonomías XBRL para la SSPD Colombia.
 * Contiene las definiciones de grupos NIIF y mapeos de cuentas PUC a conceptos XBRL.
 * 
 * Información del catálogo oficial SSPD (XBRLStaticCatalog2.xml):
 * - URL Base: http://www.sui.gov.co/xbrl/Corte_{YEAR}/{group}/
 * - Años disponibles: 2017-2025
 * - Dependencia: Taxonomía IFRS (iasb2022) - https://xbrl.ifrs.org/taxonomy/2022-03-24/
 * 
 * Actualizado según taxonomía oficial SSPD 2024-12-31
 */

/** Años de taxonomía disponibles */
export type TaxonomyYear = '2017' | '2018' | '2019' | '2020' | '2021' | '2022' | '2023' | '2024' | '2025';

/** Tipos de grupo NIIF */
export type NiifGroup = 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'r533' | 'ife';

/** Tipos de reporte */
export type ReportType = 'individual' | 'consolidado';

/** Tipo de flujo de efectivo */
export type CashFlowType = 'directo' | 'indirecto';

/** Grado de redondeo para estados financieros */
export type RoundingDegree = '1' | '2' | '3' | '4';

/**
 * Grados de redondeo disponibles en las taxonomías SSPD
 * Según la taxonomía XBRL de la SSPD
 */
export const ROUNDING_DEGREES = {
  '1': { value: '1', label: 'Pesos', description: 'Valores en pesos colombianos', decimals: 0 },
  '2': { value: '2', label: 'Miles de pesos', description: 'Valores en miles de pesos', decimals: -3 },
  '3': { value: '3', label: 'Millones de pesos', description: 'Valores en millones de pesos', decimals: -6 },
  '4': { value: '4', label: 'Pesos redondeada a miles', description: 'Pesos con redondeo a miles', decimals: -3 },
} as const;

export interface ServiceConfig {
  id: string;
  name: string;
  xbrlMember: string;
  /** Columna Excel para este servicio (I=Total, J=Acueducto, etc.) */
  column: string;
  /** Sufijo numérico para conceptos IFRS en este servicio */
  ifrsSuffix: number;
  /** Sufijo numérico para conceptos co-sspd en este servicio (puede ser diferente) */
  sspdSuffix: number;
}

export interface TaxonomyConfig {
  /** Nombre del grupo */
  name: string;
  /** Prefijo para los conceptos XBRL */
  prefix: string;
  /** Namespace de la taxonomía */
  namespace: string;
  /** URL del punto de entrada de la taxonomía */
  entryPoint: string;
  /** URL base de la taxonomía */
  baseUrl: string;
  /** Archivo ZIP del paquete de taxonomía */
  packageFile: string;
  /** Servicios públicos aplicables */
  services: ServiceConfig[];
}

/**
 * Catálogo oficial de URLs de taxonomías SSPD
 * Fuente: XBRLStaticCatalog2.xml de XBRL Express
 */
export const TAXONOMY_CATALOG = {
  /** URL base del SUI para taxonomías */
  baseUrl: 'http://www.sui.gov.co/xbrl',
  /** URL de la taxonomía IFRS (dependencia) */
  ifrsUrl: 'https://xbrl.ifrs.org/taxonomy/2022-03-24/',
  /** Schema del esquema común */
  schemaUrl: 'http://www.superservicios.gov.co/xbrl/niif/ef/core',
  /** Scheme para identificadores de empresa */
  entityScheme: 'http://www.sui.gov.co/rups',
  
  /** Años disponibles con sus configuraciones */
  years: {
    '2024': { ifrsVersion: '2022-03-24', schemaDate: '2024-12-31' },
    '2025': { ifrsVersion: '2022-03-24', schemaDate: '2025-12-31' },
    '2023': { ifrsVersion: '2022-03-24', schemaDate: '2023-12-31' },
    '2022': { ifrsVersion: '2021-03-24', schemaDate: '2022-12-31' },
    '2021': { ifrsVersion: '2020-03-16', schemaDate: '2021-12-31' },
    '2020': { ifrsVersion: '2019-03-27', schemaDate: '2020-12-31' },
    '2019': { ifrsVersion: '2019-03-27', schemaDate: '2019-12-31' },
    '2018': { ifrsVersion: '2018-03-16', schemaDate: '2018-12-31' },
    '2017': { ifrsVersion: '2017-03-09', schemaDate: '2017-12-31' },
  } as Record<string, { ifrsVersion: string; schemaDate: string }>,
};

/**
 * Genera la URL del punto de entrada para una taxonomía específica
 */
export function getEntryPointUrl(
  year: TaxonomyYear,
  group: NiifGroup,
  reportType: ReportType = 'individual',
  cashFlowType: CashFlowType = 'directo'
): string {
  const groupMap: Record<NiifGroup, string> = {
    grupo1: 'grupo1',
    grupo2: 'grupo2',
    grupo3: 'grupo3',
    r414: 'r414',
    r533: 'r533',
    ife: 'ife',
  };
  
  const groupPrefix: Record<NiifGroup, string> = {
    grupo1: 'G1',
    grupo2: 'G2',
    grupo3: 'G3',
    r414: 'R414',
    r533: 'R533',
    ife: 'IFE',
  };
  
  const reportPrefix = reportType === 'individual' ? 'Individual' : 'Consolidado';
  const cashFlowSuffix = cashFlowType === 'directo' ? 'EFEDirecto' : 'EFEIndirecto';
  
  const groupPath = groupMap[group];
  const prefix = groupPrefix[group];
  
  return `${TAXONOMY_CATALOG.baseUrl}/Corte_${year}/${groupPath}/PuntoEntrada_${prefix}_${reportPrefix}-${year}-${cashFlowSuffix}.xsd`;
}

/**
 * Obtiene la URL del paquete ZIP de una taxonomía
 */
export function getTaxonomyPackageUrl(year: TaxonomyYear, group: NiifGroup): string {
  const groupName: Record<NiifGroup, string> = {
    grupo1: 'Grupo1',
    grupo2: 'Grupo2',
    grupo3: 'Grupo3',
    r414: 'Res414',
    r533: 'Res533',
    ife: 'IFE',
  };
  
  return `SSPD_EF_${year}-12-31_${groupName[group]}.zip`;
}

/**
 * Configuraciones de taxonomías por grupo NIIF
 * 
 * Los sufijos de conceptos varían según el tipo de concepto:
 * - Conceptos ifrs-full_*: usan ifrsSuffix (16, 18, 20, 22, 24, 26, 28, 30)
 * - Conceptos co-sspd-ef-*: usan sspdSuffix (32, 33, 34, 35, 36, 37, 38, 39)
 * 
 * Esto se basa en el análisis del archivo XML de mapeo generado por XBRL Express
 */
export const TAXONOMY_CONFIGS: Record<NiifGroup, TaxonomyConfig> = {
  grupo1: {
    name: 'Grupo 1 - NIIF Plenas',
    prefix: 'co-sspd-ef-Grupo1',
    namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/core/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo1/PuntoEntrada_G1_Individual-2024-EFEDirecto.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo1/',
    packageFile: 'SSPD_EF_2024-12-31_Grupo1.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: 'TotalESFIndividualOSeparadoMember', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
      { id: 'acueducto', name: 'Acueducto', xbrlMember: 'AcueductoMember', column: 'J', ifrsSuffix: 16, sspdSuffix: 32 },
      { id: 'alcantarillado', name: 'Alcantarillado', xbrlMember: 'AlcantarilladoMember', column: 'K', ifrsSuffix: 18, sspdSuffix: 33 },
      { id: 'aseo', name: 'Aseo', xbrlMember: 'AseoMember', column: 'L', ifrsSuffix: 20, sspdSuffix: 34 },
      { id: 'energia', name: 'Energía Eléctrica', xbrlMember: 'EnergiaElectricaMember', column: 'M', ifrsSuffix: 22, sspdSuffix: 35 },
      { id: 'gas', name: 'Gas Natural', xbrlMember: 'GasNaturalMember', column: 'N', ifrsSuffix: 24, sspdSuffix: 36 },
      { id: 'glp', name: 'GLP', xbrlMember: 'GasLicuadoDePetroleoMember', column: 'O', ifrsSuffix: 26, sspdSuffix: 37 },
      { id: 'otras', name: 'Otras Actividades', xbrlMember: 'OtrasActividadesNoVigiladasMember', column: 'P', ifrsSuffix: 28, sspdSuffix: 38 },
      { id: 'other', name: 'Other', xbrlMember: '', column: 'Q', ifrsSuffix: 30, sspdSuffix: 39 },
    ],
  },
  grupo2: {
    name: 'Grupo 2 - NIIF para PYMES',
    prefix: 'co-sspd-ef-Grupo2',
    namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/pymes/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo2/PuntoEntrada_G2_Individual-2024-EFEDirecto.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo2/',
    packageFile: 'SSPD_EF_2024-12-31_Grupo2.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: 'TotalESFIndividualOSeparadoMember', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
      { id: 'acueducto', name: 'Acueducto', xbrlMember: 'AcueductoMember', column: 'J', ifrsSuffix: 16, sspdSuffix: 32 },
      { id: 'alcantarillado', name: 'Alcantarillado', xbrlMember: 'AlcantarilladoMember', column: 'K', ifrsSuffix: 18, sspdSuffix: 33 },
      { id: 'aseo', name: 'Aseo', xbrlMember: 'AseoMember', column: 'L', ifrsSuffix: 20, sspdSuffix: 34 },
    ],
  },
  grupo3: {
    name: 'Grupo 3 - Microempresas',
    prefix: 'co-sspd-ef-Grupo3',
    namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/micro/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo3/PuntoEntrada_G3_Individual-2024-EFEDirecto.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/grupo3/',
    packageFile: 'SSPD_EF_2024-12-31_Grupo3.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: 'TotalESFIndividualOSeparadoMember', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
      { id: 'acueducto', name: 'Acueducto', xbrlMember: 'AcueductoMember', column: 'J', ifrsSuffix: 16, sspdSuffix: 32 },
      { id: 'alcantarillado', name: 'Alcantarillado', xbrlMember: 'AlcantarilladoMember', column: 'K', ifrsSuffix: 18, sspdSuffix: 33 },
      { id: 'aseo', name: 'Aseo', xbrlMember: 'AseoMember', column: 'L', ifrsSuffix: 20, sspdSuffix: 34 },
    ],
  },
  r414: {
    name: 'Resolución 414 - Sector Público',
    prefix: 'co-sspd-ef-R414',
    namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/r414/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/r414/PuntoEntrada_R414_Individual-2024-EFEDirecto.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/r414/',
    packageFile: 'SSPD_EF_2024-12-31_Res414.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: 'TotalESFIndividualOSeparadoMember', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
      { id: 'acueducto', name: 'Acueducto', xbrlMember: 'AcueductoMember', column: 'J', ifrsSuffix: 16, sspdSuffix: 32 },
      { id: 'alcantarillado', name: 'Alcantarillado', xbrlMember: 'AlcantarilladoMember', column: 'K', ifrsSuffix: 18, sspdSuffix: 33 },
      { id: 'aseo', name: 'Aseo', xbrlMember: 'AseoMember', column: 'L', ifrsSuffix: 20, sspdSuffix: 34 },
    ],
  },
  r533: {
    name: 'Resolución 533 - Marco Normativo',
    prefix: 'co-sspd-ef-R533',
    namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/r533/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/r533/PuntoEntrada_R533_Individual-2024-EFEDirecto.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/r533/',
    packageFile: 'SSPD_EF_2024-12-31_Res533.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: 'TotalESFIndividualOSeparadoMember', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
      { id: 'acueducto', name: 'Acueducto', xbrlMember: 'AcueductoMember', column: 'J', ifrsSuffix: 16, sspdSuffix: 32 },
      { id: 'alcantarillado', name: 'Alcantarillado', xbrlMember: 'AlcantarilladoMember', column: 'K', ifrsSuffix: 18, sspdSuffix: 33 },
      { id: 'aseo', name: 'Aseo', xbrlMember: 'AseoMember', column: 'L', ifrsSuffix: 20, sspdSuffix: 34 },
    ],
  },
  ife: {
    name: 'Informe Financiero Especial (IFE)',
    prefix: 'co-sspd-ife',
    namespace: 'http://www.superservicios.gov.co/xbrl/ife/2024-12-31',
    entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/ife/PuntoEntrada_IFE_Individual-2024.xsd',
    baseUrl: 'http://www.sui.gov.co/xbrl/Corte_2024/ife/',
    packageFile: 'SSPD_IFE_2024-12-31.zip',
    services: [
      { id: 'total', name: 'Total', xbrlMember: '', column: 'I', ifrsSuffix: 0, sspdSuffix: 0 },
    ],
  },
};

/**
 * Obtiene la configuración de taxonomía para un grupo NIIF
 */
export function getTaxonomyConfig(group: NiifGroup): TaxonomyConfig {
  return TAXONOMY_CONFIGS[group];
}

/**
 * Obtiene la configuración de taxonomía dinámica para un grupo y año específico
 * Esto permite generar archivos para diferentes períodos de reporte
 */
export function getTaxonomyConfigForYear(
  group: NiifGroup, 
  year: TaxonomyYear,
  reportType: ReportType = 'individual',
  cashFlowType: CashFlowType = 'directo'
): TaxonomyConfig {
  const baseConfig = TAXONOMY_CONFIGS[group];
  const yearConfig = TAXONOMY_CATALOG.years[year];
  
  if (!yearConfig) {
    throw new Error(`Año de taxonomía no soportado: ${year}`);
  }
  
  // Generar URLs dinámicas según el año
  const entryPoint = getEntryPointUrl(year, group, reportType, cashFlowType);
  const packageFile = getTaxonomyPackageUrl(year, group);
  const baseUrl = `${TAXONOMY_CATALOG.baseUrl}/Corte_${year}/${group === 'grupo1' ? 'grupo1' : group === 'grupo2' ? 'grupo2' : group === 'grupo3' ? 'grupo3' : group === 'r414' ? 'r414' : group === 'r533' ? 'r533' : 'ife'}/`;
  
  // Actualizar namespace con la fecha del año
  const namespace = baseConfig.namespace.replace(/\d{4}-\d{2}-\d{2}$/, yearConfig.schemaDate);
  
  return {
    ...baseConfig,
    namespace,
    entryPoint,
    baseUrl,
    packageFile,
  };
}

/**
 * Lista de años de taxonomía disponibles (más reciente primero)
 */
export const AVAILABLE_YEARS: TaxonomyYear[] = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

/**
 * Lista de grupos NIIF disponibles
 */
export const AVAILABLE_GROUPS: { value: NiifGroup; label: string }[] = [
  { value: 'grupo1', label: 'Grupo 1 - NIIF Plenas' },
  { value: 'grupo2', label: 'Grupo 2 - NIIF para PYMES' },
  { value: 'grupo3', label: 'Grupo 3 - Microempresas' },
  { value: 'r414', label: 'Resolución 414 - Sector Público' },
  { value: 'r533', label: 'Resolución 533 - Marco Normativo' },
  { value: 'ife', label: 'Informe Financiero Especial (IFE)' },
];

/**
 * Estructura de concepto XBRL para el Estado de Situación Financiera
 * Cada concepto tiene su fila Excel asignada
 */
export interface ESFConcept {
  /** Fila en el Excel (Hoja2) */
  row: number;
  /** Concepto XBRL base (sin sufijo de servicio) */
  concept: string;
  /** Nombre para mostrar */
  label: string;
  /** Código PUC asociado (opcional) */
  pucCode?: string;
  /** Es un total/subtotal */
  isTotal?: boolean;
  /** Nivel de indentación (para formato) */
  level: number;
  /** Balance: debit o credit */
  balance: 'debit' | 'credit';
}

/**
 * Mapeo de conceptos XBRL para el Estado de Situación Financiera (Hoja2)
 * Basado en la estructura oficial de la taxonomía SSPD Grupo 1
 */
export const ESF_CONCEPTS: ESFConcept[] = [
  // ACTIVOS CORRIENTES
  { row: 15, concept: 'ifrs-full_CashAndCashEquivalents', label: 'Efectivo y equivalentes al efectivo', pucCode: '11', level: 1, balance: 'debit' },
  { row: 16, concept: 'co-sspd-ef-Grupo1_EfectivoYEquivalentesAlEfectivoDeUsoRestringidoCorrientes', label: 'Efectivo restringido corriente', pucCode: '1110', level: 1, balance: 'debit' },
  { row: 17, concept: 'ifrs-full_TradeAndOtherCurrentReceivables', label: 'Deudores comerciales y otras cuentas por cobrar corrientes', pucCode: '13', level: 1, balance: 'debit' },
  { row: 18, concept: 'co-sspd-ef-Grupo1_CuentasComercialesCobrarCorrientesServiciosPublicos', label: 'Cuentas comerciales por cobrar servicios públicos corrientes', pucCode: '1305', level: 2, balance: 'debit' },
  { row: 19, concept: 'co-sspd-ef-Grupo1_DeudoresComercialesCorriente', label: 'Deudores comerciales corrientes', pucCode: '1310', level: 2, balance: 'debit' },
  { row: 20, concept: 'co-sspd-ef-Grupo1_OtrasCuentasPorCobrarCorriente', label: 'Otras cuentas por cobrar corrientes', pucCode: '1315', level: 2, balance: 'debit' },
  { row: 21, concept: 'co-sspd-ef-Grupo1_DeterioroDeLasCuentasPorCobrarCorriente', label: 'Deterioro cuentas por cobrar corrientes', pucCode: '1399', level: 2, balance: 'debit' },
  { row: 22, concept: 'ifrs-full_Inventories', label: 'Inventarios', pucCode: '14', level: 1, balance: 'debit' },
  { row: 23, concept: 'ifrs-full_CurrentTaxAssets', label: 'Activos por impuestos corrientes', pucCode: '1705', level: 1, balance: 'debit' },
  { row: 24, concept: 'ifrs-full_OtherCurrentAssets', label: 'Otros activos corrientes', pucCode: '19', level: 1, balance: 'debit' },
  { row: 25, concept: 'ifrs-full_CurrentAssets', label: 'TOTAL ACTIVOS CORRIENTES', isTotal: true, level: 0, balance: 'debit' },
  
  // ACTIVOS NO CORRIENTES
  { row: 27, concept: 'ifrs-full_PropertyPlantAndEquipment', label: 'Propiedades, planta y equipo', pucCode: '15', level: 1, balance: 'debit' },
  { row: 28, concept: 'ifrs-full_IntangibleAssetsOtherThanGoodwill', label: 'Activos intangibles distintos de la plusvalía', pucCode: '16', level: 1, balance: 'debit' },
  { row: 29, concept: 'ifrs-full_InvestmentProperty', label: 'Propiedades de inversión', pucCode: '1505', level: 1, balance: 'debit' },
  { row: 30, concept: 'ifrs-full_Goodwill', label: 'Plusvalía', pucCode: '1698', level: 1, balance: 'debit' },
  { row: 31, concept: 'ifrs-full_DeferredTaxAssets', label: 'Activos por impuestos diferidos', pucCode: '1710', level: 1, balance: 'debit' },
  { row: 32, concept: 'co-sspd-ef-Grupo1_TradeAndOtherReceivables', label: 'Cuentas por cobrar no corrientes', pucCode: '1320', level: 1, balance: 'debit' },
  { row: 33, concept: 'ifrs-full_OtherNoncurrentAssets', label: 'Otros activos no corrientes', pucCode: '1895', level: 1, balance: 'debit' },
  { row: 34, concept: 'ifrs-full_NoncurrentAssets', label: 'TOTAL ACTIVOS NO CORRIENTES', isTotal: true, level: 0, balance: 'debit' },
  
  { row: 35, concept: 'ifrs-full_Assets', label: 'TOTAL ACTIVOS', isTotal: true, level: 0, balance: 'debit' },
  
  // PASIVOS CORRIENTES
  { row: 37, concept: 'ifrs-full_TradeAndOtherCurrentPayables', label: 'Cuentas comerciales por pagar corrientes', pucCode: '22', level: 1, balance: 'credit' },
  { row: 38, concept: 'co-sspd-ef-Grupo1_ProveedoresCorriente', label: 'Proveedores corrientes', pucCode: '2205', level: 2, balance: 'credit' },
  { row: 39, concept: 'co-sspd-ef-Grupo1_IngresosDiferidosCorriente', label: 'Ingresos diferidos corrientes', pucCode: '27', level: 1, balance: 'credit' },
  { row: 40, concept: 'co-sspd-ef-Grupo1_GastosAcumuladosPorPagarCorriente', label: 'Gastos acumulados por pagar corrientes', pucCode: '2335', level: 1, balance: 'credit' },
  { row: 41, concept: 'co-sspd-ef-Grupo1_ObligacionesFinancierasCorriente', label: 'Obligaciones financieras corrientes', pucCode: '21', level: 1, balance: 'credit' },
  { row: 42, concept: 'co-sspd-ef-Grupo1_ObligacionesLaboralesCorriente', label: 'Obligaciones laborales corrientes', pucCode: '25', level: 1, balance: 'credit' },
  { row: 43, concept: 'ifrs-full_CurrentTaxLiabilitiesCurrent', label: 'Pasivos por impuestos corrientes', pucCode: '24', level: 1, balance: 'credit' },
  { row: 44, concept: 'ifrs-full_ProvisionsCurrent', label: 'Provisiones corrientes', pucCode: '26', level: 1, balance: 'credit' },
  { row: 45, concept: 'ifrs-full_OtherCurrentLiabilities', label: 'Otros pasivos corrientes', pucCode: '28', level: 1, balance: 'credit' },
  { row: 46, concept: 'ifrs-full_CurrentLiabilities', label: 'TOTAL PASIVOS CORRIENTES', isTotal: true, level: 0, balance: 'credit' },
  
  // PASIVOS NO CORRIENTES
  { row: 48, concept: 'co-sspd-ef-Grupo1_ObligacionesFinancierasNoCorriente', label: 'Obligaciones financieras no corrientes', pucCode: '2105', level: 1, balance: 'credit' },
  { row: 49, concept: 'co-sspd-ef-Grupo1_ProveedoresNoCorriente', label: 'Proveedores no corrientes', pucCode: '2210', level: 1, balance: 'credit' },
  { row: 50, concept: 'co-sspd-ef-Grupo1_IngresosDiferidosNoCorriente', label: 'Ingresos diferidos no corrientes', pucCode: '2705', level: 1, balance: 'credit' },
  { row: 51, concept: 'co-sspd-ef-Grupo1_ObligacionesLaboralesNoCorriente', label: 'Obligaciones laborales no corrientes', pucCode: '2510', level: 1, balance: 'credit' },
  { row: 52, concept: 'ifrs-full_DeferredTaxLiabilities', label: 'Pasivos por impuestos diferidos', pucCode: '2715', level: 1, balance: 'credit' },
  { row: 53, concept: 'ifrs-full_ProvisionsNoncurrent', label: 'Provisiones no corrientes', pucCode: '2605', level: 1, balance: 'credit' },
  { row: 54, concept: 'ifrs-full_OtherNoncurrentLiabilities', label: 'Otros pasivos no corrientes', pucCode: '2805', level: 1, balance: 'credit' },
  { row: 55, concept: 'ifrs-full_NoncurrentLiabilities', label: 'TOTAL PASIVOS NO CORRIENTES', isTotal: true, level: 0, balance: 'credit' },
  
  { row: 56, concept: 'ifrs-full_Liabilities', label: 'TOTAL PASIVOS', isTotal: true, level: 0, balance: 'credit' },
  
  // PATRIMONIO
  { row: 58, concept: 'ifrs-full_IssuedCapital', label: 'Capital emitido', pucCode: '31', level: 1, balance: 'credit' },
  { row: 59, concept: 'ifrs-full_SharePremium', label: 'Prima de emisión', pucCode: '32', level: 1, balance: 'credit' },
  { row: 60, concept: 'ifrs-full_TreasuryShares', label: 'Acciones propias en cartera', pucCode: '38', level: 1, balance: 'credit' },
  { row: 61, concept: 'ifrs-full_RetainedEarnings', label: 'Ganancias acumuladas', pucCode: '36', level: 1, balance: 'credit' },
  { row: 62, concept: 'co-sspd-ef-Grupo1_UtilidadOPerdidaDelEjercicio', label: 'Utilidad (pérdida) del ejercicio', pucCode: '37', level: 1, balance: 'credit' },
  { row: 63, concept: 'ifrs-full_RevaluationSurplus', label: 'Superávit por revaluación', pucCode: '34', level: 1, balance: 'credit' },
  { row: 64, concept: 'ifrs-full_OtherReserves', label: 'Otras reservas', pucCode: '33', level: 1, balance: 'credit' },
  { row: 65, concept: 'ifrs-full_AccumulatedOtherComprehensiveIncome', label: 'Otro resultado integral acumulado', pucCode: '3705', level: 1, balance: 'credit' },
  { row: 66, concept: 'ifrs-full_EquityAttributableToOwnersOfParent', label: 'Patrimonio atribuible a los propietarios', isTotal: true, level: 0, balance: 'credit' },
  { row: 67, concept: 'ifrs-full_NoncontrollingInterests', label: 'Participaciones no controladoras', pucCode: '35', level: 1, balance: 'credit' },
  { row: 68, concept: 'ifrs-full_Equity', label: 'TOTAL PATRIMONIO', isTotal: true, level: 0, balance: 'credit' },
  
  { row: 70, concept: 'ifrs-full_EquityAndLiabilities', label: 'TOTAL PASIVO Y PATRIMONIO', isTotal: true, level: 0, balance: 'credit' },
];

/**
 * Conceptos de información general (Hoja1)
 */
export interface InfoConcept {
  row: number;
  concept: string;
  label: string;
  type: 'string' | 'date' | 'number';
}

export const INFO_CONCEPTS: InfoConcept[] = [
  { row: 12, concept: 'ifrs-full_DisclosureOfGeneralInformationAboutFinancialStatementsExplanatory', label: 'Información a revelar sobre información general', type: 'string' },
  { row: 13, concept: 'ifrs-full_NameOfReportingEntityOrOtherMeansOfIdentification', label: 'Nombre de la entidad', type: 'string' },
  { row: 14, concept: 'co-sspd-ef-Grupo1_IdentificacionDeLaEmpresaRUPS', label: 'Identificación de la Empresa (ID RUPS)', type: 'string' },
  { row: 15, concept: 'co-sspd-ef-Grupo1_NumeroDeIdentificacionTributariaNIT', label: 'NIT', type: 'string' },
  { row: 16, concept: 'co-sspd-ef-Grupo1_InformacionARevelarSobreLaNaturalezaDelNegocioIndividualSeparado', label: 'Información sobre la naturaleza del negocio', type: 'string' },
  { row: 17, concept: 'co-sspd-ef-Grupo1_FechaDeInicioDeOperaciones', label: 'Fecha de inicio de operaciones', type: 'date' },
  { row: 18, concept: 'ifrs-full_DateOfEndOfReportingPeriod2013', label: 'Fecha de cierre del período', type: 'date' },
  { row: 19, concept: 'co-sspd-ef-Grupo1_GradoDeRedondeoUtilizadoEnLosEstadosFinancieros', label: 'Grado de redondeo utilizado', type: 'string' },
  { row: 21, concept: 'co-sspd-ef-Grupo1_SePresentaInformacionReexpresada', label: '¿Se presenta información reexpresada?', type: 'string' },
  { row: 22, concept: 'co-sspd-ef-Grupo1_PeriodoDeReexpresion', label: 'Período de reexpresión', type: 'string' },
];

/**
 * Mapeo de códigos PUC a conceptos XBRL.
 */
export const PUC_TO_XBRL_MAP: Record<string, string> = {
  // Clase 1 - Activos
  '1': 'ifrs-full_Assets',
  '11': 'ifrs-full_CashAndCashEquivalents',
  '1105': 'ifrs-full_CashAndCashEquivalents',
  '1110': 'co-sspd-ef-Grupo1_EfectivoYEquivalentesAlEfectivoDeUsoRestringidoCorrientes',
  '12': 'ifrs-full_CurrentFinancialAssets',
  '13': 'ifrs-full_TradeAndOtherCurrentReceivables',
  '1305': 'co-sspd-ef-Grupo1_CuentasComercialesCobrarCorrientesServiciosPublicos',
  '1310': 'co-sspd-ef-Grupo1_DeudoresComercialesCorriente',
  '1315': 'co-sspd-ef-Grupo1_OtrasCuentasPorCobrarCorriente',
  '1320': 'co-sspd-ef-Grupo1_TradeAndOtherReceivables',
  '1399': 'co-sspd-ef-Grupo1_DeterioroDeLasCuentasPorCobrarCorriente',
  '14': 'ifrs-full_Inventories',
  '15': 'ifrs-full_PropertyPlantAndEquipment',
  '16': 'ifrs-full_IntangibleAssetsOtherThanGoodwill',
  '17': 'ifrs-full_DeferredTaxAssets',
  '1705': 'ifrs-full_CurrentTaxAssets',
  '1710': 'ifrs-full_DeferredTaxAssets',
  '18': 'ifrs-full_OtherNoncurrentAssets',
  '19': 'ifrs-full_OtherCurrentAssets',
  
  // Clase 2 - Pasivos
  '2': 'ifrs-full_Liabilities',
  '21': 'co-sspd-ef-Grupo1_ObligacionesFinancierasCorriente',
  '2105': 'co-sspd-ef-Grupo1_ObligacionesFinancierasNoCorriente',
  '22': 'ifrs-full_TradeAndOtherCurrentPayables',
  '2205': 'co-sspd-ef-Grupo1_ProveedoresCorriente',
  '2210': 'co-sspd-ef-Grupo1_ProveedoresNoCorriente',
  '23': 'ifrs-full_TradeAndOtherCurrentPayables',
  '24': 'ifrs-full_CurrentTaxLiabilitiesCurrent',
  '25': 'co-sspd-ef-Grupo1_ObligacionesLaboralesCorriente',
  '2510': 'co-sspd-ef-Grupo1_ObligacionesLaboralesNoCorriente',
  '26': 'ifrs-full_ProvisionsCurrent',
  '2605': 'ifrs-full_ProvisionsNoncurrent',
  '27': 'co-sspd-ef-Grupo1_IngresosDiferidosCorriente',
  '2705': 'co-sspd-ef-Grupo1_IngresosDiferidosNoCorriente',
  '2715': 'ifrs-full_DeferredTaxLiabilities',
  '28': 'ifrs-full_OtherCurrentLiabilities',
  '2805': 'ifrs-full_OtherNoncurrentLiabilities',
  
  // Clase 3 - Patrimonio
  '3': 'ifrs-full_Equity',
  '31': 'ifrs-full_IssuedCapital',
  '32': 'ifrs-full_SharePremium',
  '33': 'ifrs-full_OtherReserves',
  '34': 'ifrs-full_RevaluationSurplus',
  '35': 'ifrs-full_NoncontrollingInterests',
  '36': 'ifrs-full_RetainedEarnings',
  '37': 'co-sspd-ef-Grupo1_UtilidadOPerdidaDelEjercicio',
  '3705': 'ifrs-full_AccumulatedOtherComprehensiveIncome',
  '38': 'ifrs-full_TreasuryShares',
  
  // Clase 4 - Ingresos
  '4': 'ifrs-full_Revenue',
  '41': 'ifrs-full_RevenueFromContractsWithCustomers',
  '42': 'ifrs-full_OtherIncome',
  
  // Clase 5 - Gastos
  '5': 'ifrs-full_ExpenseByNature',
  '51': 'ifrs-full_AdministrativeExpense',
  '52': 'ifrs-full_SellingExpense',
  '53': 'ifrs-full_FinanceCosts',
  
  // Clase 6 - Costos
  '6': 'ifrs-full_CostOfSales',
  '61': 'ifrs-full_CostOfSales',
};

/**
 * Obtiene el concepto XBRL correspondiente a un código PUC
 */
export function getXbrlConcept(pucCode: string): string | null {
  if (PUC_TO_XBRL_MAP[pucCode]) {
    return PUC_TO_XBRL_MAP[pucCode];
  }
  
  for (let i = pucCode.length; i >= 1; i--) {
    const prefix = pucCode.substring(0, i);
    if (PUC_TO_XBRL_MAP[prefix]) {
      return PUC_TO_XBRL_MAP[prefix];
    }
  }
  
  return null;
}

/**
 * Encuentra el concepto ESF que corresponde a un código PUC
 */
export function findESFConceptByPUC(pucCode: string): ESFConcept | null {
  const xbrlConcept = getXbrlConcept(pucCode);
  if (!xbrlConcept) return null;
  return ESF_CONCEPTS.find(c => c.concept === xbrlConcept) || null;
}

/**
 * Genera el ID del concepto con sufijo para un servicio específico.
 * 
 * El sufijo varía según el tipo de concepto:
 * - Conceptos ifrs-full_*: usan ifrsSuffix
 * - Conceptos co-sspd-ef-*: usan sspdSuffix
 * 
 * @param baseConcept - Concepto base (ej: 'ifrs-full_CashAndCashEquivalents')
 * @param ifrsSuffix - Sufijo para conceptos IFRS
 * @param sspdSuffix - Sufijo para conceptos SSPD (si no se proporciona, usa ifrsSuffix)
 */
export function getConceptIdWithSuffix(
  baseConcept: string, 
  ifrsSuffix: number, 
  sspdSuffix?: number
): string {
  if (ifrsSuffix === 0 && (!sspdSuffix || sspdSuffix === 0)) {
    return baseConcept;
  }
  
  // Determinar qué sufijo usar según el tipo de concepto
  const isIfrs = baseConcept.startsWith('ifrs-full_');
  const suffix = isIfrs ? ifrsSuffix : (sspdSuffix ?? ifrsSuffix);
  
  if (suffix === 0) {
    return baseConcept;
  }
  
  return `${baseConcept}${suffix}`;
}

/**
 * Obtiene el sufijo correcto para un concepto y servicio específico
 */
export function getServiceSuffix(
  baseConcept: string,
  service: ServiceConfig
): number {
  const isIfrs = baseConcept.startsWith('ifrs-full_');
  return isIfrs ? service.ifrsSuffix : service.sspdSuffix;
}

/**
 * Obtiene el valor de decimals para XBRL según el grado de redondeo
 * @param roundingDegree - Grado de redondeo (1-4)
 * @returns Valor de decimals para el atributo XBRL
 */
export function getDecimalsFromRounding(roundingDegree?: RoundingDegree): number {
  if (!roundingDegree) return 0; // Por defecto en pesos
  return ROUNDING_DEGREES[roundingDegree].decimals;
}

/**
 * Obtiene la descripción del grado de redondeo
 * @param roundingDegree - Grado de redondeo (1-4)  
 * @returns Descripción legible del grado de redondeo
 */
export function getRoundingDescription(roundingDegree?: RoundingDegree): string {
  if (!roundingDegree) return ROUNDING_DEGREES['1'].label;
  return ROUNDING_DEGREES[roundingDegree].label;
}
