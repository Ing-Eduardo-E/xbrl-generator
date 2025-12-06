/**
 * Servicio Dispatcher para plantillas XBRL oficiales de la SSPD.
 *
 * Este archivo actúa como puente/dispatcher que delega la generación
 * de plantillas a los servicios específicos de cada taxonomía.
 *
 * Taxonomías soportadas:
 * - R414: Resolución 414 CGN (Sector Público) - ACTIVA
 * - Grupo1, Grupo2, Grupo3, IFE: Pendientes de implementación
 *
 * @module officialTemplateService
 */

import type { NiifGroup, TaxonomyYear } from './taxonomyConfig';
import { r414TemplateService } from './r414';

// Importar tipos desde types.ts (no re-exportar para evitar conflictos)
import type {
  AccountData,
  ServiceBalanceData,
  UsuariosEstrato,
  OfficialTemplatePackage,
} from './types';

// ============================================
// INTERFACES PARA COMPATIBILIDAD CON ROUTER
// ============================================

/**
 * Estructura de subsidios por servicio
 */
export interface SubsidiosPorServicio {
  acueducto: number;
  alcantarillado: number;
  aseo: number;
}

/**
 * Opciones de personalización de plantilla base
 */
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

/**
 * Opciones extendidas con datos financieros
 */
export interface TemplateWithDataOptions extends TemplateCustomization {
  /** Cuentas consolidadas del balance */
  consolidatedAccounts?: Array<{
    code: string;
    name: string;
    value: number;
    isLeaf: boolean;
    level: number;
    class: string;
  }>;
  /** Balances distribuidos por servicio */
  serviceBalances?: Array<{
    service: string;
    code: string;
    name: string;
    value: number;
    isLeaf: boolean;
  }>;
  /** Servicios activos para la empresa */
  activeServices?: string[];
  /** Usuarios por estrato y servicio (para distribución proporcional) */
  usuariosEstrato?: {
    acueducto?: Record<string, number>;
    alcantarillado?: Record<string, number>;
    aseo?: Record<string, number>;
  };
  /** Subsidios recibidos por servicio */
  subsidios?: SubsidiosPorServicio;
}

// ============================================
// FUNCIONES PÚBLICAS - DISPATCHER
// ============================================

/**
 * Genera un paquete de plantilla oficial sin datos financieros.
 * Solo personaliza metadatos (empresa, fecha, etc.)
 *
 * @deprecated Usar generateOfficialTemplatePackageWithData en su lugar
 */
export async function generateOfficialTemplatePackage(
  options: TemplateCustomization
): Promise<{ fileName: string; fileData: string; mimeType: string }> {
  // Delegar al servicio con datos pero sin accounts/balances
  return generateOfficialTemplatePackageWithData(options as TemplateWithDataOptions);
}

/**
 * Genera un paquete de plantilla oficial con datos financieros.
 * Función principal que delega a los servicios específicos de cada taxonomía.
 */
export async function generateOfficialTemplatePackageWithData(
  options: TemplateWithDataOptions
): Promise<{ fileName: string; fileData: string; mimeType: string }> {
  const { niifGroup } = options;

  // Dispatcher según el grupo de taxonomía
  switch (niifGroup) {
    case 'r414':
      return r414TemplateService.generateTemplatePackage(convertToR414Options(options));

    case 'grupo1':
    case 'grupo2':
    case 'grupo3':
    case 'ife':
      throw new Error(
        `La taxonomía ${niifGroup} aún no está implementada. ` +
        `Actualmente solo R414 está disponible.`
      );

    default:
      throw new Error(`Grupo NIIF no soportado: ${niifGroup}`);
  }
}

/**
 * Verifica si un grupo NIIF tiene plantillas oficiales disponibles.
 */
export function hasOfficialTemplates(niifGroup: NiifGroup): boolean {
  // Por ahora solo R414 está completamente implementado
  return niifGroup === 'r414';
}

/**
 * Obtiene la lista de grupos con plantillas disponibles.
 */
export function getAvailableTemplateGroups(): NiifGroup[] {
  return ['r414'];
}

// ============================================
// FUNCIONES INTERNAS - CONVERSIÓN DE TIPOS
// ============================================

/**
 * Convierte las opciones del dispatcher al formato esperado por R414TemplateService.
 */
function convertToR414Options(options: TemplateWithDataOptions) {
  // Importar tipos dinámicamente para evitar dependencias circulares
  const accounts = options.consolidatedAccounts?.map(acc => ({
    code: acc.code,
    name: acc.name,
    value: acc.value,
    isLeaf: acc.isLeaf,
    level: acc.level,
    class: acc.class,
  })) ?? [];

  const serviceBalances = options.serviceBalances?.map(sb => ({
    service: sb.service,
    code: sb.code,
    name: sb.name,
    value: sb.value,
    isLeaf: sb.isLeaf,
  })) ?? [];

  // Calcular distribución desde serviceBalances o usar default
  const distribution: Record<string, number> = {};
  if (options.activeServices && options.activeServices.length > 0) {
    const equalShare = 100 / options.activeServices.length;
    for (const service of options.activeServices) {
      distribution[service] = equalShare;
    }
  } else {
    distribution.acueducto = 40;
    distribution.alcantarillado = 35;
    distribution.aseo = 25;
  }

  // Convertir usuariosEstrato al formato Record<string, UsuariosEstrato>
  let usuariosEstrato: Record<string, UsuariosEstrato> | undefined;
  if (options.usuariosEstrato) {
    usuariosEstrato = {};
    if (options.usuariosEstrato.acueducto) {
      usuariosEstrato.acueducto = convertUsuariosToEstrato(options.usuariosEstrato.acueducto)!;
    }
    if (options.usuariosEstrato.alcantarillado) {
      usuariosEstrato.alcantarillado = convertUsuariosToEstrato(options.usuariosEstrato.alcantarillado)!;
    }
    if (options.usuariosEstrato.aseo) {
      usuariosEstrato.aseo = convertUsuariosToEstrato(options.usuariosEstrato.aseo)!;
    }
  }

  return {
    niifGroup: options.niifGroup,
    companyId: options.companyId,
    companyName: options.companyName,
    reportDate: options.reportDate,
    taxonomyYear: options.taxonomyYear,
    nit: options.nit,
    roundingDegree: options.roundingDegree as '1' | '2' | '3' | '4' | undefined,
    accounts,
    serviceBalances,
    distribution,
    usuariosEstrato,
    subsidios: options.subsidios,
  };
}

/**
 * Convierte Record<string, number> a estructura UsuariosEstrato
 */
function convertUsuariosToEstrato(data?: Record<string, number>) {
  if (!data) return undefined;
  return {
    estrato1: data.estrato1 ?? data['1'] ?? 0,
    estrato2: data.estrato2 ?? data['2'] ?? 0,
    estrato3: data.estrato3 ?? data['3'] ?? 0,
    estrato4: data.estrato4 ?? data['4'] ?? 0,
    estrato5: data.estrato5 ?? data['5'] ?? 0,
    estrato6: data.estrato6 ?? data['6'] ?? 0,
    industrial: data.industrial ?? 0,
    comercial: data.comercial ?? 0,
    oficial: data.oficial ?? 0,
    especial: data.especial ?? 0,
  };
}
