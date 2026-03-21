/**
 * Utilidad para combinar la estructura original de un xlsx con datos de ExcelJS.
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

import JSZip from 'jszip';

/**
 * Preserva la estructura original del template xlsx mientras inyecta los datos de ExcelJS.
 */
export async function preserveOriginalStructure(
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
