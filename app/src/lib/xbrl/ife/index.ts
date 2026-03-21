/**
 * Módulo IFE - Informe Financiero Especial (Trimestral).
 *
 * La lógica de escritura de datos Excel está en official/ifeDataWriter.ts.
 * La personalización de xbrlt/xml está en official/templateCustomizers.ts.
 * Este módulo exporta configuraciones y mapeos de referencia.
 *
 * @module ife
 */

// Configuración
export {
  IFE_TEMPLATE_PATHS,
  IFE_SHEET_MAPPING,
  IFE_SERVICE_COLUMNS,
  IFE_ER_COLUMNS,
  IFE_CXC_COLUMNS,
  IFE_CXP_COLUMNS,
} from './config';

// Mapeos de referencia
export * from './mappings';
