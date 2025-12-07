/**
 * Tipos e interfaces compartidas para todas las taxonomías XBRL.
 *
 * Este archivo centraliza los tipos que son utilizados por múltiples
 * taxonomías (R414, Grupo1, Grupo2, Grupo3, IFE).
 */

// ============================================
// TIPOS BÁSICOS DE TAXONOMÍA
// ============================================

/** Años de taxonomía disponibles en el catálogo SSPD */
export type TaxonomyYear = '2017' | '2018' | '2019' | '2020' | '2021' | '2022' | '2023' | '2024' | '2025';

/** Grupos NIIF soportados */
export type NiifGroup = 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'r533' | 'ife';

/** Tipo de reporte financiero */
export type ReportType = 'individual' | 'consolidado';

/** Método de flujo de efectivo */
export type CashFlowType = 'directo' | 'indirecto';

/** Trimestre para IFE (Informe Financiero Especial) */
export type IFETrimestre = '1T' | '2T' | '3T' | '4T';

/** Grado de redondeo para estados financieros */
export type RoundingDegree = '1' | '2' | '3' | '4';

/** Servicios públicos domiciliarios */
export type ServiceType = 'acueducto' | 'alcantarillado' | 'aseo' | 'energia' | 'gas' | 'glp' | 'otras';

// ============================================
// INTERFACES DE MAPEO ESF/ER
// ============================================

/**
 * Mapeo de fila Excel a prefijos PUC para Estado de Situación Financiera.
 * Usado para mapear cuentas PUC a filas específicas en las plantillas Excel.
 */
export interface ESFMapping {
  /** Número de fila en la hoja Excel */
  row: number;
  /** Prefijos PUC a sumar (ej: ['11', '12'] para activos corrientes) */
  pucPrefixes: string[];
  /** Prefijos PUC a excluir de la suma */
  excludePrefixes?: string[];
  /** Si debe usar valor absoluto */
  useAbsoluteValue?: boolean;
  /** Etiqueta descriptiva del concepto (opcional, para documentación) */
  label?: string;
  /** Descripción del mapeo (alias de label) */
  description?: string;
}

/**
 * Mapeo de columnas por servicio en las hojas Excel.
 * Varía según el grupo de taxonomía.
 */
export interface ServiceColumnMapping {
  acueducto: string;
  alcantarillado: string;
  aseo: string;
  energia?: string;
  gas?: string;
  glp?: string;
  xmm?: string;
  otras?: string;
  total: string;
}

// ============================================
// INTERFACES DE DATOS DE CUENTA
// ============================================

/**
 * Datos de una cuenta contable del balance consolidado.
 */
export interface AccountData {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

/**
 * Datos de una cuenta distribuida por servicio.
 */
export interface ServiceBalanceData {
  service: string;
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
}

/**
 * Usuarios por estrato para cada servicio.
 * Incluye tanto estratos residenciales (1-6) como categorías no residenciales.
 */
export interface UsuariosEstrato {
  // Estratos residenciales
  estrato1: number;
  estrato2: number;
  estrato3: number;
  estrato4: number;
  estrato5: number;
  estrato6: number;
  // Categorías no residenciales (opcionales)
  industrial?: number;
  comercial?: number;
  oficial?: number;
  especial?: number;
}

/**
 * Subsidios por servicio (porcentajes o valores).
 */
export interface SubsidiosPorServicio {
  acueducto: number;
  alcantarillado: number;
  aseo: number;
}

// ============================================
// INTERFACES DE CONFIGURACIÓN DE PLANTILLA
// ============================================

/**
 * Opciones base para personalización de plantillas.
 */
export interface TemplateCustomization {
  /** Grupo NIIF */
  niifGroup: NiifGroup;
  /** ID de la empresa (RUPS) */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** Fecha de corte (YYYY-MM-DD) */
  reportDate: string;
  /** Año de taxonomía SSPD (2017-2025) */
  taxonomyYear?: TaxonomyYear;
  /** NIT de la empresa */
  nit?: string;
  /** Grado de redondeo */
  roundingDegree?: RoundingDegree;
  /** Trimestre (solo para IFE) */
  trimestre?: IFETrimestre;
}

/**
 * Datos específicos para IFE (Informe Financiero Especial).
 * Incluye información adicional requerida por la taxonomía IFE.
 */
export interface IFESpecificData {
  // Dirección y contacto
  address?: string;
  city?: string;
  phone?: string;
  cellphone?: string;
  email?: string;
  // Empleados
  employeesStart?: number;
  employeesEnd?: number;
  employeesAverage?: number;
  // Representante legal
  representativeDocType?: string;
  representativeDocNumber?: string;
  representativeFirstName?: string;
  representativeLastName?: string;
  // Marco normativo y continuidad
  normativeGroup?: string;
  complianceDeclaration?: string;
  goingConcernUncertainty?: string;
  goingConcernExplanation?: string;
  servicesContinuityUncertainty?: string;
  servicesTermination?: string;
  servicesTerminationDetail?: string;
}

/**
 * Opciones extendidas con datos financieros para llenar plantillas.
 */
export interface TemplateWithDataOptions extends TemplateCustomization {
  /** Datos de cuentas del balance consolidado */
  accounts: AccountData[];
  /** Datos de cuentas distribuidas por servicio */
  serviceBalances: ServiceBalanceData[];
  /** Porcentajes de distribución */
  distribution: Record<string, number>;
  /** Usuarios por estrato y servicio (opcional) */
  usuariosEstrato?: Record<string, UsuariosEstrato>;
  /** Subsidios por servicio (opcional) */
  subsidios?: SubsidiosPorServicio;
  /** Datos específicos para IFE (opcional) */
  ifeData?: IFESpecificData;
}

/**
 * Paquete de plantilla oficial generado.
 */
export interface OfficialTemplatePackage {
  /** Nombre del archivo ZIP */
  fileName: string;
  /** Contenido en base64 */
  fileData: string;
  /** Tipo MIME */
  mimeType: string;
}

// ============================================
// INTERFACES DE CONFIGURACIÓN DE TAXONOMÍA
// ============================================

/**
 * Configuración de un servicio público.
 */
export interface ServiceConfig {
  id: string;
  name: string;
  suffix: string;
  enabled: boolean;
}

/**
 * Configuración completa de una taxonomía.
 */
export interface TaxonomyConfig {
  id: string;
  name: string;
  description: string;
  entryPoint: string;
  namespace: string;
  prefix: string;
  schemaLocation: string;
  services: ServiceConfig[];
}

/**
 * Rutas de archivos de plantilla para un grupo NIIF.
 */
export interface TemplatePaths {
  xbrlt: string;
  xml: string;
  xlsx: string;
  xbrl: string;
  basePrefix: string;
  outputPrefix: string;
}

/**
 * Mapeo de códigos de hoja XBRL a nombres de hoja Excel.
 */
export type SheetMapping = Record<string, string>;

// ============================================
// INTERFACES DE CONCEPTO XBRL
// ============================================

/**
 * Concepto del Estado de Situación Financiera.
 */
export interface ESFConcept {
  id: string;
  name: string;
  pucCode: string;
  pucName: string;
  row: number;
  isTotal?: boolean;
  children?: string[];
}

/**
 * Concepto de información general.
 */
export interface InfoConcept {
  id: string;
  name: string;
  row: number;
  column: string;
  type: 'text' | 'date' | 'number' | 'boolean';
}

// ============================================
// INTERFACES DE RANGOS DE VENCIMIENTO (IFE)
// ============================================

/**
 * Rango de vencimiento para CxC/CxP en IFE.
 */
export interface AgingRange {
  id: string;
  name: string;
  xbrlMember: string;
  /** Porcentaje por defecto de distribución */
  defaultPercentage: number;
  /** Columna Excel en la hoja correspondiente */
  column: string;
}

// ============================================
// INTERFACE PARA PROCESADOR DE TAXONOMÍA
// ============================================

/**
 * Interface que debe implementar cada procesador de taxonomía.
 * Permite un patrón Strategy para manejar diferentes taxonomías.
 */
export interface TaxonomyProcessor {
  /** Grupo NIIF que procesa */
  readonly group: NiifGroup;

  /**
   * Genera el paquete de plantilla con datos.
   */
  generateTemplatePackage(options: TemplateWithDataOptions): Promise<OfficialTemplatePackage>;

  /**
   * Llena los datos en el workbook de Excel.
   */
  fillExcelData(workbook: unknown, options: TemplateWithDataOptions): void;

  /**
   * Obtiene los mapeos ESF para esta taxonomía.
   */
  getESFMappings(): ESFMapping[];

  /**
   * Obtiene el mapeo de columnas por servicio.
   */
  getServiceColumns(): ServiceColumnMapping;

  /**
   * Obtiene el mapeo de hojas.
   */
  getSheetMapping(): SheetMapping;
}
