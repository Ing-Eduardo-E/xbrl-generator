/**
 * Configuración de R414 - Rutas de plantillas y mapeos de hojas.
 * 
 * Este archivo está separado para evitar dependencias circulares
 * entre index.ts y R414TemplateService.ts.
 */

import type { TemplatePaths, SheetMapping } from '../types';

/**
 * Rutas de las plantillas R414.
 */
export const R414_TEMPLATE_PATHS: TemplatePaths = {
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
export const R414_SHEET_MAPPING: SheetMapping = {
  '110000': 'Hoja1',   // Información general sobre estados financieros
  '210000': 'Hoja2',   // Estado de Situación Financiera (ESF)
  '310000': 'Hoja3',   // Estado de Resultados (ER)
  '420000': 'Hoja4',   // Estado del Resultado Integral (ORI)
  '510000': 'Hoja5',   // Estado de Flujos de Efectivo (método directo)
  '610000': 'Hoja6',   // Estado de Cambios en el Patrimonio
  '800100': 'Hoja7',   // Notas - Subclasificaciones de activos, pasivos y patrimonios
  '800200': 'Hoja8',   // Notas - Análisis de ingresos y gastos
  '800500': 'Hoja9',   // Notas - Lista de Notas
  '800600': 'Hoja10',  // Notas - Lista de Políticas
  '810000': 'Hoja11',  // Notas - Información de la entidad y declaración de cumplimiento
  '811001': 'Hoja12',  // Notas - Políticas contables, cambios en estimaciones
  '825701': 'Hoja13',  // Notas - Información a revelar partes relacionadas
  '835110': 'Hoja14',  // Notas - Impuestos a las ganancias
  '900010': 'Hoja15',  // Notas - Responsables de la información
  '900017a': 'Hoja16', // FC01-1 Gastos Acueducto
  '900017b': 'Hoja17', // FC01-2 Gastos Alcantarillado
  '900017c': 'Hoja18', // FC01-3 Gastos Aseo
  '900017d': 'Hoja19', // FC01-4 Gastos Energía
  '900017e': 'Hoja20', // FC01-5 Gastos Gas combustible por redes
  '900017f': 'Hoja21', // FC01-6 Gastos GLP
  '900017g': 'Hoja22', // FC01-7 Gastos Total servicios públicos
  '900019': 'Hoja23',  // FC02 Complementario de ingresos
  '900021': 'Hoja24',  // FC03-1 CXC Acueducto (por estrato)
  '900022': 'Hoja25',  // FC03-2 CXC Alcantarillado (por estrato)
  '900023': 'Hoja26',  // FC03-3 CXC Aseo (por estrato)
  '900024': 'Hoja27',  // FC03-4 CXC Energía (por estrato)
  '900025': 'Hoja28',  // FC03-5 CXC Gas combustible por redes (por estrato)
  '900026': 'Hoja29',  // FC03-6 CXC GLP (por estrato)
  '900027': 'Hoja30',  // FC04 Información Subsidios y Contribuciones
  '900027a': 'Hoja31', // FC04a Detalle de subsidios por cobrar
  '900028b': 'Hoja32', // FC05b Pasivos por edades de vencimiento
  '900029': 'Hoja33',  // FC06 Depósitos en Garantía de GLP
  '900030': 'Hoja34',  // FC07 Información sobre el cálculo actuarial
  '900031': 'Hoja35',  // FC08 Conciliación de ingresos
  '900032': 'Hoja36',  // FC09 Detalle de costo de ventas
  '900040': 'Hoja37',  // FC15 Información sobre el cálculo del IUS
  '900080': 'Hoja38',  // FC30 Ingreso por tarifa y comercialización de aprovechamiento
  '900090': 'Hoja39',  // FC40 Pagos tarifa de aprovechamiento a recicladores
  '900100': 'Hoja40',  // FC50 Detalle de ventas a comercializadores materiales aprovechables
  '900110': 'Hoja41',  // FC60 Porcentaje de provisión tarifa de aprovechamiento
};