/**
 * OfficialTemplateService — punto de entrada público.
 * La implementación está en lib/xbrl/official/.
 */
export * from './official';

import JSZip from 'jszip';
import type { NiifGroup } from './taxonomyConfig';
import { loadTemplate, loadBinaryTemplate } from './official/fileLoaders';
import { rewriteFinancialDataWithExcelJS } from './official/excelRewriter';
import { customizeXbrlt, customizeXml } from './official/templateCustomizers';
import { TEMPLATE_PATHS } from './official/templatePaths';
import type { TemplateWithDataOptions, TemplateCustomization, OfficialTemplatePackage } from './official/interfaces';

/**
 * Preserva la estructura original del template xlsx mientras inyecta los datos de ExcelJS.
 *
 * ExcelJS modifica workbook.xml, _rels/workbook.xml.rels y [Content_Types].xml
 * al generar el buffer de salida. Específicamente:
 * - Agrega una referencia rota a xl/theme/theme1.xml (que no existe)
 * - Renumera todos los rIds de las relaciones
 * - Modifica workbookPr, fileVersion y otros metadatos
 *
 * Estas modificaciones hacen que XBRL Express (Java/POI) no pueda resolver
 * correctamente las hojas del workbook, mostrando todos los cuadros vacíos.
 *
 * Solución: Combinar la estructura original (workbook.xml, rels, Content_Types,
 * docProps) con los datos de ExcelJS (worksheets, sharedStrings, styles).
 */
async function preserveOriginalStructure(
  originalBuffer: Buffer,
  excelJsBuffer: Buffer
): Promise<Buffer> {
  const originalZip = await JSZip.loadAsync(originalBuffer);
  const excelJsZip = await JSZip.loadAsync(excelJsBuffer);
  const hybridZip = new JSZip();

  // Archivos estructurales que se preservan del template ORIGINAL
  // (mantienen workbook.xml, rels y metadatos intactos)
  const structuralFiles = new Set([
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    '[Content_Types].xml',
    '_rels/.rels',
    'docProps/app.xml',
    'docProps/core.xml',
  ]);

  // 1. Copiar archivos estructurales del original
  for (const filePath of structuralFiles) {
    const file = originalZip.file(filePath);
    if (file) {
      hybridZip.file(filePath, await file.async('nodebuffer'));
    }
  }

  // Detectar si el template original tiene archivo de tema
  const originalHasTheme = originalZip.file('xl/theme/theme1.xml') !== null;

  // 2. Copiar datos de ExcelJS (worksheets, styles, sharedStrings)
  let worksheetCount = 0;
  for (const [filePath, file] of Object.entries(excelJsZip.files)) {
    if (file.dir) continue;
    if (structuralFiles.has(filePath)) continue; // ya copiado del original

    // No copiar archivo theme1.xml generado por ExcelJS si el original no lo tiene
    if (filePath.includes('theme/theme') && !originalHasTheme) {
      continue;
    }

    hybridZip.file(filePath, await file.async('nodebuffer'));
    if (filePath.startsWith('xl/worksheets/')) worksheetCount++;
  }

  // 3. Si el original NO tiene tema, limpiar referencias theme de styles.xml
  // ExcelJS siempre agrega atributos theme="X" en definiciones de color dentro de
  // styles.xml, incluso cuando el template original no tiene archivo de tema.
  // Apache POI (usado por XBRL Express) puede fallar al resolver esas referencias
  // contra un tema inexistente, causando que todos los cuadros aparezcan vacíos.
  if (!originalHasTheme) {
    const stylesFile = hybridZip.file('xl/styles.xml');
    if (stylesFile) {
      let stylesXml = await stylesFile.async('string');
      const themeRefCount = (stylesXml.match(/\btheme="/g) || []).length;
      if (themeRefCount > 0) {
        // Eliminar atributos theme="N" de elementos <color> y similares
        stylesXml = stylesXml.replace(/\s*theme="\d+"/g, '');
        hybridZip.file('xl/styles.xml', stylesXml);
        console.log(`[preserveOriginalStructure] Eliminadas ${themeRefCount} referencias theme de styles.xml (template sin tema)`);
      }
    }
  }

  // Validar que el híbrido tiene worksheets
  if (worksheetCount === 0) {
    console.error('[preserveOriginalStructure] ADVERTENCIA: El ZIP híbrido no contiene worksheets');
  } else {
    console.log(`[preserveOriginalStructure] ZIP híbrido generado: ${worksheetCount} worksheets`);
  }

  const result = await hybridZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return Buffer.from(result);
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS (L4717–4943 del monolito original)
// ═══════════════════════════════════════════════════════════════════

/**
 * Genera el paquete completo de archivos XBRL usando plantillas oficiales
 * Esta función solo llena metadatos. Para incluir datos financieros use
 * generateOfficialTemplatePackageWithData.
 */
export async function generateOfficialTemplatePackage(
  options: TemplateCustomization
): Promise<OfficialTemplatePackage> {
  return generateOfficialTemplatePackageWithData(options as TemplateWithDataOptions);
}

/**
 * Genera el paquete completo de archivos XBRL usando plantillas oficiales
 * INCLUYE datos financieros del balance distribuido.
 *
 * Esta función:
 * 1. Llena la Hoja1 con metadatos de la empresa
 * 2. Llena la Hoja2 (ESF) con datos del balance
 * 3. Llena la Hoja3 (ER) con datos de resultados
 * 4. Llena las hojas FC01 con gastos por servicio
 * 5. Llena las hojas FC02/FC03 con ingresos y CXC
 */
export async function generateOfficialTemplatePackageWithData(
  options: TemplateWithDataOptions
): Promise<OfficialTemplatePackage> {
  const templatePaths = TEMPLATE_PATHS[options.niifGroup];

  // Verificar que el grupo tiene plantillas disponibles
  if (!templatePaths.xbrlt) {
    throw new Error(`No hay plantillas oficiales disponibles para ${options.niifGroup}. Use el generador estándar.`);
  }

  // Generar nombre de archivo de salida
  const outputPrefix = templatePaths.outputPrefix;
  const outputFileName = `${outputPrefix}_ID${options.companyId}_${options.reportDate}`;

  const zip = new JSZip();

  try {
    // 1. Cargar y personalizar .xbrlt
    const xbrltContent = await loadTemplate(templatePaths.xbrlt);
    const customizedXbrlt = customizeXbrlt(xbrltContent, options, outputFileName);
    zip.file(`${outputFileName}.xbrlt`, customizedXbrlt);

    // 2. Cargar y personalizar .xml
    const xmlContent = await loadTemplate(templatePaths.xml);
    const customizedXml = customizeXml(xmlContent, options);
    zip.file(`${outputFileName}.xml`, customizedXml);

    // 3. Cargar y personalizar .xlsx con datos financieros
    // IMPORTANTE: Usar SOLO ExcelJS para modificar el Excel.
    // SheetJS (xlsx) destruye la estructura interna del template (elimina sharedStrings.xml,
    // reduce styles.xml de 14KB a 1KB, pierde formatos de hojas) lo que hace que
    // XBRL Express no pueda leer los datos del archivo generado.
    // ExcelJS preserva los datos pero modifica workbook.xml y rels (agrega referencia
    // rota a theme/theme1.xml). preserveOriginalStructure() restaura la estructura original.
    const xlsxContent = await loadBinaryTemplate(templatePaths.xlsx);
    const excelJsOutput = await rewriteFinancialDataWithExcelJS(xlsxContent, options);
    const customizedXlsx = await preserveOriginalStructure(xlsxContent, excelJsOutput);

    zip.file(`${outputFileName}.xlsx`, customizedXlsx);

    // 4. Cargar .xbrl (referencia)
    const xbrlContent = await loadTemplate(templatePaths.xbrl);
    zip.file(`${outputFileName}.xbrl`, xbrlContent);

    // 5. Generar README actualizado
    const readmeContent = generateReadmeWithData(options, outputPrefix);
    zip.file('README.txt', readmeContent);

    // Generar el ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const base64 = Buffer.from(zipBuffer).toString('base64');

    return {
      fileName: `${outputFileName}.zip`,
      fileData: base64,
      mimeType: 'application/zip',
    };
  } catch (error) {
    console.error('Error generando paquete de plantillas:', error);
    throw new Error(
      error instanceof Error
        ? `Error generando paquete: ${error.message}`
        : 'Error desconocido generando paquete'
    );
  }
}

/**
 * Genera README con información sobre datos financieros incluidos
 */
function generateReadmeWithData(options: TemplateWithDataOptions, outputPrefix: string): string {
  const taxonomyNames: Record<NiifGroup, string> = {
    grupo1: 'NIIF Plenas (Grupo 1)',
    grupo2: 'NIIF para PYMES (Grupo 2)',
    grupo3: 'Microempresas (Grupo 3)',
    r414: 'Resolución 414 - Sector Público',
    r533: 'Resolución 533',
    ife: 'Informe Financiero Especial',
  };

  const hasData = options.consolidatedAccounts && options.consolidatedAccounts.length > 0;
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  return `================================================================================
PAQUETE DE ARCHIVOS XBRL - TAXONOMÍA OFICIAL SSPD
${hasData ? '*** CON DATOS FINANCIEROS PRE-LLENADOS ***' : ''}
================================================================================

Empresa: ${options.companyName}
ID RUPS: ${options.companyId}
NIT: ${options.nit || 'No especificado'}
Taxonomía: ${taxonomyNames[options.niifGroup]}
Fecha de Reporte: ${options.reportDate}
Generado: ${new Date().toLocaleString('es-CO')}
${hasData ? `Cuentas procesadas: ${options.consolidatedAccounts!.length}
Servicios activos: ${activeServices.join(', ')}` : ''}

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

1. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrlt
   → Plantilla de mapeo XBRL (para XBRL Express)

2. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xml
   → Configuración de mapeo Excel → XBRL

3. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xlsx
   → Plantilla Excel oficial ${hasData ? '(PRE-LLENADA con datos)' : '(para diligenciar datos)'}

4. ${outputPrefix}_ID${options.companyId}_${options.reportDate}.xbrl
   → Archivo de instancia XBRL (referencia)

5. README.txt
   → Este archivo

${hasData ? `================================================================================
HOJAS PRE-LLENADAS AUTOMÁTICAMENTE
================================================================================

Las siguientes hojas contienen datos del balance distribuido:

✓ [110000] Información general - Datos de la empresa
✓ [210000] Estado de Situación Financiera - Balance por servicio
✓ [310000] Estado de Resultados - P&G por servicio
✓ [900017a] FC01-1 Gastos Acueducto
✓ [900017b] FC01-2 Gastos Alcantarillado
✓ [900017c] FC01-3 Gastos Aseo
✓ [900017g] FC01-7 Total servicios públicos

Las demás hojas (notas, revelaciones, etc.) deben completarse manualmente.

` : ''}================================================================================
INSTRUCCIONES DE USO
================================================================================

PASO 1: Extraer los archivos
   - Extraiga todos los archivos de este ZIP en una misma carpeta
   - Mantenga todos los archivos juntos, NO los renombre

PASO 2: ${hasData ? 'Revisar y complementar el Excel' : 'Diligenciar el Excel'}
   1. Abra el archivo .xlsx con Microsoft Excel
   ${hasData ? '2. Revise que los datos automáticos sean correctos' : '2. Diligencia la Hoja1 con la información general de la empresa'}
   ${hasData ? '3. Complete las hojas de notas y revelaciones' : '3. Diligencia la Hoja2 con el Estado de Situación Financiera'}
   4. Guarde el archivo (NO cambie el nombre)

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

/**
 * Verifica si un grupo tiene plantillas oficiales disponibles
 */
export function hasOfficialTemplates(niifGroup: NiifGroup): boolean {
  const templatePaths = TEMPLATE_PATHS[niifGroup];
  return !!templatePaths.xbrlt;
}

/**
 * Obtiene la lista de grupos con plantillas disponibles
 */
export function getAvailableTemplateGroups(): NiifGroup[] {
  return (Object.keys(TEMPLATE_PATHS) as NiifGroup[]).filter(
    group => hasOfficialTemplates(group)
  );
}
