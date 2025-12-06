/**
 * Índice de exportaciones de mapeos R414.
 *
 * Exporta todos los mapeos necesarios para la taxonomía R414.
 */

// ESF - Estado de Situación Financiera
export {
  R414_SERVICE_COLUMNS,
  R414_ESF_ACTIVOS,
  R414_ESF_PASIVOS,
  R414_ESF_PATRIMONIO,
  R414_ESF_MAPPINGS,
} from './esfMappings';

// ER - Estado de Resultados
export { R414_ER_COLUMNS, R414_ER_MAPPINGS } from './erMappings';

// PPE e Intangibles
export { R414_PPE_MAPPINGS, R414_INTANGIBLES_MAPPINGS } from './ppeMappings';
