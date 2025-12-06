/**
 * Módulo IFE - Informe Financiero Especial (Trimestral).
 *
 * Exporta el servicio de plantillas IFE y sus configuraciones.
 *
 * @module ife
 */

// Servicio principal
export { IFETemplateService, ifeTemplateService } from './IFETemplateService';

// Configuración
export {
  IFE_TEMPLATE_PATHS,
  IFE_SHEET_MAPPING,
  IFE_SERVICE_COLUMNS,
  IFE_ER_COLUMNS,
  IFE_CXC_COLUMNS,
  IFE_CXP_COLUMNS,
} from './config';

// Mapeos
export * from './mappings';
