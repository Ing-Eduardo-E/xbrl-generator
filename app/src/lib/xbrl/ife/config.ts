/**
 * Configuración de plantillas IFE (Informe Financiero Especial).
 *
 * IFE es la taxonomía trimestral obligatoria de la SSPD desde 2020.
 * Tiene 8 hojas simplificadas vs las 60+ de R414.
 *
 * @module ife/config
 */

import type { TemplatePaths, SheetMapping } from '../types';

/**
 * Rutas de archivos de plantilla IFE.
 * Nota: IFE usa nombres basados en trimestre (SegundoTrimestre, etc.)
 */
export const IFE_TEMPLATE_PATHS: TemplatePaths = {
  xbrlt: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt',
  xml: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xml',
  xlsx: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx',
  xbrl: 'ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrl',
  basePrefix: 'IFE',
  outputPrefix: 'IFE_Trimestral',
};

/**
 * Mapeo de códigos de vista XBRL a nombres de hojas Excel.
 *
 * IFE tiene 8 hojas:
 * - Hoja1: Información general
 * - Hoja2: Información adicional (flujo efectivo)
 * - Hoja3: ESF por servicio
 * - Hoja4: Estado de Resultados por servicio
 * - Hoja5: CxC por vencimiento
 * - Hoja6: CxP por vencimiento
 * - Hoja7: Detalle ingresos y gastos
 * - Hoja8: Deterioro de activos
 */
export const IFE_SHEET_MAPPING: SheetMapping = {
  '110000t': 'Hoja1', // Información general
  '120000t': 'Hoja2', // Información adicional
  '210000t': 'Hoja3', // ESF por servicio
  '310000t': 'Hoja4', // Estado de Resultados
  '900020t': 'Hoja5', // CxC por vencimiento
  '900028t': 'Hoja6', // CxP por vencimiento
  '900050t': 'Hoja7', // Detalle ingresos y gastos
  '900060t': 'Hoja8', // Deterioro de activos
};

/**
 * Columnas de servicios en IFE.
 * IFE tiene más servicios que R414 (incluye Energía, Gas, GLP, XMM).
 */
export const IFE_SERVICE_COLUMNS = {
  // Hoja3 (ESF) y Hoja4 (ER) - columnas por servicio
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  energia: 'L',
  gas: 'M',
  glp: 'N',
  xmm: 'O',
  otras: 'P',
  total: 'Q', // No hay columna total en IFE ESF, se calcula
};

/**
 * Columnas para Hoja4 (Estado de Resultados).
 * Similar a ESF pero con diferente estructura.
 */
export const IFE_ER_COLUMNS = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  energia: 'H',
  gas: 'I',
  glp: 'J',
  xmm: 'K',
  otras: 'L',
};

/**
 * Rangos de vencimiento para CxC (Hoja5).
 */
export const IFE_CXC_COLUMNS = {
  noVencidas: 'F',
  '1a90': 'G',
  '91a180': 'H',
  '181a360': 'I',
  mas360: 'J',
  total: 'K',
};

/**
 * Rangos de vencimiento para CxP (Hoja6).
 */
export const IFE_CXP_COLUMNS = {
  noVencidas: 'D',
  '1a90': 'E',
  '91a180': 'F',
  '181a360': 'G',
  mas360: 'H',
  total: 'I',
};
