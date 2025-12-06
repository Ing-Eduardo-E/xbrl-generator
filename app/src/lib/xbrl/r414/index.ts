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

// Exportar todos los mapeos
export * from './mappings';

// Configuración de plantillas R414
export const R414_TEMPLATE_PATHS = {
  xbrlt: 'r414/R414Ind_ID20037_2024-12-31.xbrlt',
  xml: 'r414/R414Ind_ID20037_2024-12-31.xml',
  xlsx: 'r414/R414Ind_ID20037_2024-12-31.xlsx',
  xbrl: 'r414/R414Ind_ID20037_2024-12-31.xbrl',
  basePrefix: 'R414Ind',
  outputPrefix: 'R414_Individual',
};

/**
 * Mapeo de hojas Excel para R414.
 * Clave: código XBRL, Valor: nombre de hoja en Excel.
 */
export const R414_SHEET_MAPPING: Record<string, string> = {
  '110000': 'Hoja1', // Información general
  '210000': 'Hoja2', // Estado de Situación Financiera
  '310000': 'Hoja3', // Estado de Resultados
  '410000': 'Hoja4', // Estado de Flujos de Efectivo
  '610000': 'Hoja5', // Estado de Cambios en el Patrimonio
  '800100': 'Hoja7', // Notas - Subclasificaciones
  '800200': 'Hoja8', // Notas - Análisis ingresos y gastos
  '800500': 'Hoja9', // Notas - Lista de notas
  '900017a': 'FC01-1', // Gastos Acueducto
  '900017b': 'FC01-2', // Gastos Alcantarillado
  '900017c': 'FC01-3', // Gastos Aseo
  '900017g': 'FC01-7', // Gastos Total servicios
  '900019': 'FC02', // Complementario de ingresos
  '900021': 'FC03-1', // CXC Acueducto (por estrato)
  '900022': 'FC03-2', // CXC Alcantarillado (por estrato)
  '900023': 'FC03-3', // CXC Aseo (por estrato)
  '900028b': 'FC05b', // Pasivos por edades de vencimiento
};
