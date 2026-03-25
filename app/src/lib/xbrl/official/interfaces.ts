/**
 * Tipos e interfaces para el módulo oficial XBRL.
 * Re-exporta tipos de types.ts donde hay solapamiento; define tipos locales donde no.
 * Extraído de officialTemplateService.ts (L892–973).
 */

// Re-exportar tipos idénticos desde types.ts
export type { AccountData } from '../types';
export type { ServiceBalanceData } from '../types';
export type { SubsidiosPorServicio } from '../types';
export type { OfficialTemplatePackage } from '../types';

// UsuariosEstrato en el servicio tiene estructura diferente a types.ts
// (aquí es Record<string,number> por servicio; en types.ts tiene campos estrato1-6)
/** Estructura de usuarios por estrato y servicio */
export interface UsuariosEstrato {
  acueducto: Record<string, number>;
  alcantarillado: Record<string, number>;
  aseo: Record<string, number>;
}

// TemplateCustomization local tiene campos adicionales no presentes en types.ts
/** Configuración para personalizar plantillas */
export interface TemplateCustomization {
  /** Grupo NIIF de la taxonomía */
  niifGroup: import('../types').NiifGroup;
  /** ID de la empresa (RUPS) */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** Fecha del reporte (YYYY-MM-DD) */
  reportDate: string;
  /** Año de la taxonomía */
  taxonomyYear?: import('../types').TaxonomyYear;
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
  /** Trimestre para IFE */
  trimestre?: import('../types').IFETrimestre;
}

// TemplateWithDataOptions local extiende la TemplateCustomization local con campos distintos
/** Opciones extendidas para incluir datos financieros */
export interface TemplateWithDataOptions extends TemplateCustomization {
  /** Cuentas consolidadas del balance */
  consolidatedAccounts?: import('../types').AccountData[];
  /** Balances distribuidos por servicio */
  serviceBalances?: import('../types').ServiceBalanceData[];
  /** Servicios activos para la empresa */
  activeServices?: string[];
  /** Usuarios por estrato y servicio (para distribución proporcional) */
  usuariosEstrato?: UsuariosEstrato;
  /** Subsidios recibidos por servicio */
  subsidios?: import('../types').SubsidiosPorServicio;
  /** Trimestre para IFE */
  trimestre?: import('../types').IFETrimestre;
  /** Datos específicos de compañía para R414 (Hoja11 - Información de la entidad) */
  r414CompanyData?: {
    domicilio?: string;
    direccion?: string;
    emailInstitucional?: string;
  };
  /** Datos específicos de compañía para IFE */
  ifeCompanyData?: {
    address?: string;
    city?: string;
    phone?: string;
    cellphone?: string;
    email?: string;
    employeesStart?: number;
    employeesEnd?: number;
    employeesAverage?: number;
    representativeDocType?: string;
    representativeDocNumber?: string;
    representativeFirstName?: string;
    representativeLastName?: string;
    normativeGroup?: string;
    complianceDeclaration?: boolean;
    goingConcernUncertainty?: boolean;
    goingConcernExplanation?: string;
    servicesTermination?: boolean;
    servicesTerminationExplanation?: string;
  };
}
