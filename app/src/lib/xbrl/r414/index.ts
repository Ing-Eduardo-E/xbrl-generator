/**
 * Módulo R414 - Resolución 414 CGN (Sector Público).
 *
 * Este módulo contiene todos los mapeos y configuraciones
 * específicos para la taxonomía R414 de la SSPD.
 *
 * La R414 es utilizada por empresas de servicios públicos
 * que reportan bajo el marco normativo de la Contaduría General
 * de la Nación (CGN).
 */

// Exportar configuración (debe ir primero)
export { R414_TEMPLATE_PATHS, R414_SHEET_MAPPING } from './config';

// Exportar todos los mapeos
export * from './mappings';

// Exportar el servicio de plantillas R414
export { R414TemplateService, r414TemplateService } from './R414TemplateService';
