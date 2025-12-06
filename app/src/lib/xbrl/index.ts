/**
 * Módulo de generación XBRL para la SSPD Colombia
 */

// Servicios existentes (mantener para compatibilidad)
export * from './taxonomyConfig';
export * from './xbrlGenerator';
export * from './officialTemplateService';

// Utilidades compartidas (nuevas) - exportación explícita para evitar conflictos
export { BaseTemplateService } from './shared/baseTemplateService';
export * from './shared/excelUtils';
export * from './shared/pucUtils';
