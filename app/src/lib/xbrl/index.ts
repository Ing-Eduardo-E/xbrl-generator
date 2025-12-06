/**
 * Módulo de generación XBRL para la SSPD Colombia
 */

// Servicios existentes (mantener para compatibilidad)
export * from './taxonomyConfig';
export * from './xbrlGenerator';

// Exportaciones específicas de officialTemplateService (evitando conflictos)
export {
  generateOfficialTemplatePackage,
  generateOfficialTemplatePackageWithData,
  hasOfficialTemplates,
  getAvailableTemplateGroups,
  type SubsidiosPorServicio,
  type TemplateCustomization,
  type TemplateWithDataOptions,
} from './officialTemplateService';

// Utilidades compartidas (nuevas) - exportación explícita para evitar conflictos
export { BaseTemplateService } from './shared/baseTemplateService';
export * from './shared/excelUtils';
export * from './shared/pucUtils';

// Tipos compartidos - solo exportar tipos que no conflictúan
// Los tipos principales ya están exportados por taxonomyConfig y officialTemplateService
export type {
  ESFMapping,
  ServiceColumnMapping,
  SheetMapping,
  TemplatePaths,
  TaxonomyProcessor,
  AgingRange,
  AccountData,
  ServiceBalanceData,
  UsuariosEstrato,
  OfficialTemplatePackage,
} from './types';

// Servicios de taxonomía específicos
export { R414TemplateService, r414TemplateService } from './r414';
