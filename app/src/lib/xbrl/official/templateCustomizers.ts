/**
 * Funciones de personalización de archivos de plantillas XBRL.
 * Extraído de officialTemplateService.ts (L4438–4710).
 */

import path from 'path';
import type { NiifGroup } from '../taxonomyConfig';
import type { TemplateCustomization } from './interfaces';
import { TEMPLATE_PATHS } from './templatePaths';

/**
 * Personaliza el contenido del archivo .xbrlt
 *
 * Reemplaza:
 * - ID de empresa (company y identifier)
 * - Fechas de período
 * - Referencia al archivo de configuración Excel
 */
export function customizeXbrlt(content: string, options: TemplateCustomization, outputFileName: string): string {
  let customized = content;

  // Reemplazar ID de empresa en <company> (valor global usado por XBRL Express)
  customized = customized.replace(
    /<company>20037<\/company>/g,
    `<company>${options.companyId}</company>`
  );

  // Reemplazar los placeholders de identifier con el ID real de la empresa
  // El formato original usa "_" como placeholder tanto en scheme como en el valor
  // XBRL Express necesita valores reales para reconocer los datos de empresa
  customized = customized.replace(
    /<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
    `<xbrli:identifier scheme="http://www.sui.gov.co/rups">${options.companyId}</xbrli:identifier>`
  );

  // Reemplazar el nombre del archivo de configuración (config=)
  const templatePaths = TEMPLATE_PATHS[options.niifGroup];
  const originalConfigName = path.basename(templatePaths.xml);
  const newConfigName = `${outputFileName}.xml`;
  customized = customized.replace(
    new RegExp(`config="${originalConfigName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
    `config="${newConfigName}"`
  );

  // ============================================================
  // MANEJO ESPECIAL PARA IFE (Trimestral)
  // ============================================================
  if (options.niifGroup === 'ife') {
    // Para IFE, la fecha de reporte indica el trimestre
    // Formato esperado: YYYY-MM-DD donde MM-DD es 03-31, 06-30, 09-30 o 12-31
    const reportYear = options.reportDate.split('-')[0];
    const reportMonth = options.reportDate.split('-')[1];

    // Determinar el trimestre basado en el mes de cierre
    let startMonth: string;
    let endMonth: string;
    let endDay: string;
    let prevInstant: string;

    switch (reportMonth) {
      case '03':
        startMonth = '01';
        endMonth = '03';
        endDay = '31';
        prevInstant = `${parseInt(reportYear) - 1}-12-31`;
        break;
      case '06':
        startMonth = '04';
        endMonth = '06';
        endDay = '30';
        prevInstant = `${reportYear}-03-31`;
        break;
      case '09':
        startMonth = '07';
        endMonth = '09';
        endDay = '30';
        prevInstant = `${reportYear}-06-30`;
        break;
      case '12':
      default:
        startMonth = '10';
        endMonth = '12';
        endDay = '31';
        prevInstant = `${reportYear}-09-30`;
        break;
    }

    const newStartDate = `${reportYear}-${startMonth}-01`;
    const newEndDate = `${reportYear}-${endMonth}-${endDay}`;
    const newInstant = newEndDate;

    // La plantilla IFE viene con datos del 2do trimestre 2025
    // Reemplazar fechas del template original por las del trimestre seleccionado

    // Fechas del template original (2do trimestre 2025)
    customized = customized.replace(/<startDate>2025-04-01<\/startDate>/g, `<startDate>${newStartDate}</startDate>`);
    customized = customized.replace(/<endDate>2025-06-30<\/endDate>/g, `<endDate>${newEndDate}</endDate>`);
    customized = customized.replace(/<instant>2025-06-30<\/instant>/g, `<instant>${newInstant}</instant>`);
    customized = customized.replace(/<instant>2025-03-31<\/instant>/g, `<instant>${prevInstant}</instant>`);

    // Reemplazar URL del entry-point XSD según el trimestre
    // BUG-02: El template tiene siempre SegundoTrimestre — debe reemplazarse para Q1/Q3/Q4
    const trimNamesXsd: Record<string, string> = {
      '03': 'PrimerTrimestre',
      '06': 'SegundoTrimestre',
      '09': 'TercerTrimestre',
      '12': 'CuartoTrimestre',
    };
    const trimName = trimNamesXsd[reportMonth] ?? 'SegundoTrimestre';
    customized = customized.replace(
      /IFE_PuntoEntrada\w+Trimestre-(\d{4})\.xsd/g,
      `IFE_PuntoEntrada${trimName}-$1.xsd`
    );

    return customized;
  }

  // ============================================================
  // TAXONOMÍAS ANUALES (Grupo 1, 2, 3, R414, R533)
  // ============================================================
  // Actualizar fechas en los períodos según la fecha de reporte del usuario
  // La plantilla original tiene fechas de 2024 (año actual) y 2023 (año anterior)
  // Debemos reemplazarlas por el año del reporte del usuario y su año anterior
  const reportYear = options.reportDate.split('-')[0];
  const reportPrevYear = String(parseInt(reportYear) - 1);
  const reportPrevPrevYear = String(parseInt(reportYear) - 2);

  // El template tiene:
  // - 2024-12-31 (instant año actual) -> debe ser {reportYear}-12-31
  // - 2024-01-01 (startDate año actual) -> debe ser {reportYear}-01-01
  // - 2023-12-31 (instant año anterior) -> debe ser {reportPrevYear}-12-31
  // - 2023-01-01 (startDate año anterior) -> debe ser {reportPrevYear}-01-01
  // - 2022-12-31 (instant año ante-anterior) -> debe ser {reportPrevPrevYear}-12-31

  // Solo reemplazar si es diferente al template original (2024)
  if (reportYear !== '2024') {
    // ============================================================
    // IMPORTANTE: NO REEMPLAZAR URLs DE TAXONOMÍA SSPD
    // ============================================================
    // Las taxonomías de la SSPD se publican anualmente, pero la de 2025
    // puede no estar disponible aún. SIEMPRE usar la taxonomía 2024
    // que es la más reciente disponible.
    //
    // NO hacemos esto:
    // customized = customized.replace(/Corte_2024/g, `Corte_${reportYear}`);
    //
    // Las URLs de taxonomía permanecen en 2024:
    // - http://www.sui.gov.co/xbrl/Corte_2024/res414/...
    // - http://www.superservicios.gov.co/xbrl/ef/core/2024-12-31

    // ============================================================
    // SOLO REEMPLAZAR FECHAS EN CONTEXTOS XBRL (períodos contables)
    // ============================================================
    // NOTA: Usamos placeholders para evitar el bug de doble-reemplazo.
    // Sin placeholders, al generar para 2022: 2024→2022 (paso 1) y luego
    // 2022→2020 (paso 3) sobrescribe las fechas recién insertadas.

    // Paso 1: Reemplazar todas las fechas del template con placeholders
    customized = customized.replace(/<instant>2024-12-31<\/instant>/g, '<instant>__XBRL_CUR_1231__</instant>');
    customized = customized.replace(/<startDate>2024-01-01<\/startDate>/g, '<startDate>__XBRL_CUR_0101__</startDate>');
    customized = customized.replace(/<endDate>2024-12-31<\/endDate>/g, '<endDate>__XBRL_CUR_1231__</endDate>');

    customized = customized.replace(/<instant>2023-12-31<\/instant>/g, '<instant>__XBRL_PREV_1231__</instant>');
    customized = customized.replace(/<startDate>2023-01-01<\/startDate>/g, '<startDate>__XBRL_PREV_0101__</startDate>');
    customized = customized.replace(/<endDate>2023-12-31<\/endDate>/g, '<endDate>__XBRL_PREV_1231__</endDate>');

    customized = customized.replace(/<instant>2022-12-31<\/instant>/g, '<instant>__XBRL_PPREV_1231__</instant>');
    customized = customized.replace(/<startDate>2022-01-01<\/startDate>/g, '<startDate>__XBRL_PPREV_0101__</startDate>');
    customized = customized.replace(/<endDate>2022-12-31<\/endDate>/g, '<endDate>__XBRL_PPREV_1231__</endDate>');

    // Paso 2: Reemplazar placeholders con las fechas correctas del reporte
    customized = customized.replace(/__XBRL_CUR_1231__/g, `${reportYear}-12-31`);
    customized = customized.replace(/__XBRL_CUR_0101__/g, `${reportYear}-01-01`);
    customized = customized.replace(/__XBRL_PREV_1231__/g, `${reportPrevYear}-12-31`);
    customized = customized.replace(/__XBRL_PREV_0101__/g, `${reportPrevYear}-01-01`);
    customized = customized.replace(/__XBRL_PPREV_1231__/g, `${reportPrevPrevYear}-12-31`);
    customized = customized.replace(/__XBRL_PPREV_0101__/g, `${reportPrevPrevYear}-01-01`);
  }

  return customized;
}

/**
 * Personaliza el contenido del archivo .xml (mapeo Excel)
 *
 * Este archivo no necesita muchos cambios ya que define
 * la estructura de mapeo, pero actualizamos referencias si es necesario.
 */
export function customizeXml(content: string, _options: TemplateCustomization): string {
  // El archivo .xml de mapeo generalmente no necesita cambios
  // ya que define la estructura de mapeo celda-concepto
  return content;
}

/**
 * Genera un archivo README específico para la taxonomía
 */
export function generateReadme(options: TemplateCustomization, outputPrefix: string): string {
  const taxonomyNames: Record<NiifGroup, string> = {
    grupo1: 'NIIF Plenas (Grupo 1)',
    grupo2: 'NIIF para PYMES (Grupo 2)',
    grupo3: 'Microempresas (Grupo 3)',
    r414: 'Resolución 414 - Sector Público',
    r533: 'Resolución 533',
    ife: 'Informe Financiero Especial',
  };

  return `================================================================================
PAQUETE DE ARCHIVOS XBRL - TAXONOMÍA OFICIAL SSPD
================================================================================

Empresa: ${options.companyName}
ID RUPS: ${options.companyId}
NIT: ${options.nit || 'No especificado'}
Taxonomía: ${taxonomyNames[options.niifGroup]}
Fecha de Reporte: ${options.reportDate}
Generado: ${new Date().toLocaleString('es-CO')}

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

1. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrlt
   → Plantilla de mapeo XBRL (para XBRL Express)

2. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xml
   → Configuración de mapeo Excel → XBRL

3. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xlsx
   → Plantilla Excel oficial (para diligenciar datos)

4. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrl
   → Archivo de instancia XBRL (referencia)

5. README.txt
   → Este archivo

================================================================================
INSTRUCCIONES DE USO
================================================================================

PASO 1: Extraer los archivos
   - Extraiga todos los archivos de este ZIP en una misma carpeta
   - Mantenga todos los archivos juntos, NO los renombre

PASO 2: Diligenciar el Excel
   1. Abra el archivo .xlsx con Microsoft Excel
   2. Diligencia la Hoja1 con la información general de la empresa
   3. Diligencia la Hoja2 con el Estado de Situación Financiera
   4. Complete las demás hojas según aplique a su empresa
   5. Guarde el archivo (NO cambie el nombre)

PASO 3: Abrir en XBRL Express
   1. Abra el aplicativo XBRL Express
   2. Vaya a: Archivo → Abrir plantilla (.xbrlt)
   3. Seleccione el archivo .xbrlt de esta carpeta
   4. XBRL Express cargará automáticamente:
      - La configuración de mapeo (.xml)
      - Los datos del Excel (.xlsx)

PASO 4: Validar y Generar
   1. Revise que todos los datos se hayan cargado correctamente
   2. Use la función de validación para detectar errores
   3. Corrija cualquier error encontrado
   4. Genere el archivo XBRL final

PASO 5: Certificar en SUI
   1. Ingrese a la plataforma SUI
   2. Cargue el archivo XBRL generado
   3. Complete el proceso de certificación

================================================================================
IMPORTANTE
================================================================================

- Los archivos de este paquete fueron generados usando las plantillas
  OFICIALES de la SSPD para la taxonomía ${taxonomyNames[options.niifGroup]}.

- El archivo .xlsx contiene la estructura EXACTA requerida por XBRL Express.
  NO modifique la estructura de las hojas ni las columnas.

- Si tiene problemas al cargar en XBRL Express, verifique que:
  1. Todos los archivos estén en la misma carpeta
  2. No haya renombrado ningún archivo
  3. La taxonomía correcta esté instalada en XBRL Express

================================================================================
SOPORTE
================================================================================

Para soporte técnico de XBRL Express:
- Reporting Standard: https://www.reportingstandard.com
- Documentación SSPD: https://www.superservicios.gov.co

================================================================================
`;
}
