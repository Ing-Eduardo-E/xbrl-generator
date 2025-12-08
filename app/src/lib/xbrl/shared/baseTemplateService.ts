/**
 * Clase base abstracta para servicios de plantillas XBRL.
 *
 * Proporciona funcionalidad común que es compartida entre todas las
 * taxonomías (R414, Grupo1, Grupo2, Grupo3, IFE).
 *
 * Cada taxonomía extiende esta clase e implementa los métodos abstractos
 * con su lógica específica.
 */

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import type {
  NiifGroup,
  TaxonomyProcessor,
  TemplateWithDataOptions,
  OfficialTemplatePackage,
  ESFMapping,
  ServiceColumnMapping,
  SheetMapping,
  AccountData,
  ServiceBalanceData,
  TemplatePaths,
} from '../types';

/**
 * Clase base abstracta para procesadores de taxonomía.
 */
export abstract class BaseTemplateService implements TaxonomyProcessor {
  /** Grupo NIIF que procesa esta instancia */
  abstract readonly group: NiifGroup;

  /** Rutas de las plantillas */
  abstract readonly templatePaths: TemplatePaths;

  // ============================================
  // MÉTODOS ABSTRACTOS (cada taxonomía implementa)
  // ============================================

  /**
   * Obtiene los mapeos ESF específicos de la taxonomía.
   */
  abstract getESFMappings(): ESFMapping[];

  /**
   * Obtiene el mapeo de columnas por servicio.
   */
  abstract getServiceColumns(): ServiceColumnMapping;

  /**
   * Obtiene el mapeo de hojas Excel.
   */
  abstract getSheetMapping(): SheetMapping;

  /**
   * Llena la hoja de ESF (Estado de Situación Financiera).
   */
  abstract fillESFSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void;

  /**
   * Llena la hoja de ER (Estado de Resultados).
   */
  abstract fillERSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void;

  // ============================================
  // MÉTODOS COMUNES (heredados por todas las taxonomías)
  // ============================================

  /**
   * Genera el paquete completo de plantilla con datos.
   */
  async generateTemplatePackage(
    options: TemplateWithDataOptions
  ): Promise<OfficialTemplatePackage> {
    const zip = new JSZip();

    // Cargar plantilla Excel
    const xlsxBuffer = await this.loadBinaryTemplate(this.templatePaths.xlsx);
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(xlsxBuffer as any);

    // Llenar datos en el workbook
    this.fillExcelData(workbook, options);

    // Generar buffer del Excel modificado
    const modifiedXlsx = await workbook.xlsx.writeBuffer();

    // Cargar y personalizar otros archivos
    const xbrltContent = await this.loadTemplate(this.templatePaths.xbrlt);
    const xmlContent = await this.loadTemplate(this.templatePaths.xml);
    const xbrlContent = await this.loadTemplate(this.templatePaths.xbrl);

    // Personalizar contenido
    const customizedXbrlt = this.customizeXbrlt(xbrltContent, options);
    const customizedXml = this.customizeXml(xmlContent, options);
    const customizedXbrl = this.customizeXbrl(xbrlContent, options);

    // Generar nombres de archivo
    const outputPrefix = this.generateOutputPrefix(options);

    // Agregar archivos al ZIP
    zip.file(`${outputPrefix}.xlsx`, modifiedXlsx);
    zip.file(`${outputPrefix}.xbrlt`, customizedXbrlt);
    zip.file(`${outputPrefix}.xml`, customizedXml);
    zip.file(`${outputPrefix}.xbrl`, customizedXbrl);
    zip.file('README.txt', this.generateReadme(options));

    // Generar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return {
      fileName: `${outputPrefix}.zip`,
      fileData: zipBuffer.toString('base64'),
      mimeType: 'application/zip',
    };
  }

  /**
   * Llena todos los datos en el workbook de Excel.
   */
  fillExcelData(workbook: unknown, options: TemplateWithDataOptions): void {
    const wb = workbook as ExcelJS.Workbook;
    const sheetMapping = this.getSheetMapping();

    // Llenar hoja de información general (Hoja1)
    const infoSheetName = sheetMapping['110000'];
    if (infoSheetName) {
      const infoSheet = wb.getWorksheet(infoSheetName);
      if (infoSheet) {
        this.fillInfoSheet(infoSheet, options);
      }
    }

    // Llenar ESF (Hoja2)
    const esfSheetName = sheetMapping['210000'];
    if (esfSheetName) {
      const esfSheet = wb.getWorksheet(esfSheetName);
      if (esfSheet) {
        this.fillESFSheet(
          esfSheet,
          options.accounts,
          options.serviceBalances,
          options.distribution
        );
      }
    }

    // Llenar ER (Hoja3)
    const erSheetName = sheetMapping['310000'];
    if (erSheetName) {
      const erSheet = wb.getWorksheet(erSheetName);
      if (erSheet) {
        this.fillERSheet(
          erSheet,
          options.accounts,
          options.serviceBalances,
          options.distribution
        );
      }
    }
  }

  // ============================================
  // MÉTODOS PROTEGIDOS (utilidades para subclases)
  // ============================================

  /**
   * Obtiene la ruta base de las plantillas.
   */
  protected getTemplatesBasePath(): string {
    // En desarrollo, las plantillas están en public/templates
    // En producción (Vercel), están en .next/server/app/templates
    const devPath = path.join(process.cwd(), 'public', 'templates');
    const prodPath = path.join(process.cwd(), '.next', 'server', 'app', 'templates');

    // Intentar primero el path de desarrollo
    return devPath;
  }

  /**
   * Carga una plantilla de texto.
   */
  protected async loadTemplate(relativePath: string): Promise<string> {
    const fullPath = path.join(this.getTemplatesBasePath(), relativePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      throw new Error(`No se pudo cargar la plantilla: ${relativePath}`);
    }
  }

  /**
   * Carga una plantilla binaria.
   */
  protected async loadBinaryTemplate(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.getTemplatesBasePath(), relativePath);
    try {
      const data = await fs.readFile(fullPath);
      return Buffer.from(data);
    } catch {
      throw new Error(`No se pudo cargar la plantilla: ${relativePath}`);
    }
  }

  /**
   * Suma valores de cuentas que coinciden con los prefijos dados.
   * 
   * IMPORTANTE: En lugar de confiar en el flag isLeaf (que puede estar mal calculado
   * si el archivo Excel tiene cuentas pre-agregadas), verificamos dinámicamente
   * si existe una cuenta más específica en los datos. Solo sumamos el valor de
   * una cuenta si NO existe otra cuenta que sea más específica (código más largo
   * que empiece igual).
   * 
   * Esto evita el doble conteo cuando tenemos tanto la cuenta padre (ej: 13)
   * como la cuenta hijo (ej: 1305) en los datos.
   */
  protected sumAccountsByPrefix(
    accounts: AccountData[],
    prefixes: string[],
    excludePrefixes: string[] = [],
    useAbsoluteValue = false
  ): number {
    let total = 0;

    for (const account of accounts) {
      // Verificar si coincide con algún prefijo buscado
      const matchesPrefix = prefixes.some((prefix) =>
        account.code.startsWith(prefix)
      );
      if (!matchesPrefix) continue;

      // Verificar si debe excluirse
      const isExcluded = excludePrefixes.some((prefix) =>
        account.code.startsWith(prefix)
      );
      if (isExcluded) continue;

      // Verificación dinámica: ¿Existe una cuenta más específica en los datos?
      // Si existe, no sumamos esta cuenta (su valor ya está incluido en la más específica)
      const hasMoreSpecificAccount = accounts.some(
        (other) =>
          other.code !== account.code &&
          other.code.startsWith(account.code) &&
          other.code.length > account.code.length
      );

      if (!hasMoreSpecificAccount) {
        total += useAbsoluteValue ? Math.abs(account.value) : account.value;
      }
    }

    return Math.round(total);
  }

  /**
   * Suma valores de cuentas de servicio que coinciden con los prefijos.
   * 
   * IMPORTANTE: En lugar de confiar en el flag isLeaf (que puede estar mal calculado
   * si el archivo Excel tiene cuentas pre-agregadas), verificamos dinámicamente
   * si existe una cuenta más específica en los datos del mismo servicio.
   * 
   * Solo sumamos el valor de una cuenta si NO existe otra cuenta del mismo
   * servicio que sea más específica (código más largo que empiece igual).
   * 
   * Esto evita el doble conteo cuando tenemos tanto la cuenta padre (ej: 13)
   * como la cuenta hijo (ej: 1305) en los datos distribuidos.
   */
  protected sumServiceAccountsByPrefix(
    serviceBalances: ServiceBalanceData[],
    service: string,
    prefixes: string[],
    excludePrefixes: string[] = [],
    useAbsoluteValue = false
  ): number {
    // Filtrar solo las cuentas del servicio especificado
    const serviceData = serviceBalances.filter((b) => b.service === service);
    
    let total = 0;

    for (const balance of serviceData) {
      // Verificar si coincide con algún prefijo buscado
      const matchesPrefix = prefixes.some((prefix) =>
        balance.code.startsWith(prefix)
      );
      if (!matchesPrefix) continue;

      // Verificar si debe excluirse
      const isExcluded = excludePrefixes.some((prefix) =>
        balance.code.startsWith(prefix)
      );
      if (isExcluded) continue;

      // Verificación dinámica: ¿Existe una cuenta más específica en los datos del servicio?
      // Si existe, no sumamos esta cuenta (su valor ya está incluido en la más específica)
      const hasMoreSpecificAccount = serviceData.some(
        (other) =>
          other.code !== balance.code &&
          other.code.startsWith(balance.code) &&
          other.code.length > balance.code.length
      );

      if (!hasMoreSpecificAccount) {
        total += useAbsoluteValue ? Math.abs(balance.value) : balance.value;
      }
    }

    return Math.round(total);
  }

  /**
   * Escribe un valor en una celda de Excel.
   * Maneja casos especiales como fórmulas compartidas (shared formulas).
   * 
   * NOTA: ExcelJS tiene problemas con "shared formulas" (fórmulas creadas
   * arrastrando en Excel). Si una celda tiene una fórmula compartida y se
   * intenta modificar, puede causar el error:
   * "Shared Formula master must exist above and or left of clone"
   * 
   * Para evitar esto, limpiamos completamente el valor de la celda antes
   * de escribir, lo que elimina cualquier referencia a fórmulas compartidas.
   * 
   * Para valores numéricos, se aplica un formato que muestra los negativos
   * entre paréntesis, como requiere el XBRL: #,##0;(#,##0)
   */
  protected writeCell(
    worksheet: ExcelJS.Worksheet,
    cell: string,
    value: number | string | null
  ): void {
    try {
      const excelCell = worksheet.getCell(cell);
      
      // Limpiar completamente la celda para eliminar cualquier fórmula compartida
      // Esto evita el error "Shared Formula master must exist..."
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cellModel = excelCell as any;
      if (cellModel.model) {
        // Eliminar referencias a fórmulas compartidas
        delete cellModel.model.sharedFormula;
        delete cellModel.model.formula;
      }
      
      // Primero asignar null para limpiar cualquier valor/fórmula anterior
      excelCell.value = null;
      
      // Luego asignar el nuevo valor
      if (value !== null && value !== undefined) {
        excelCell.value = value;
        
        // Para valores numéricos, aplicar formato que muestra negativos entre paréntesis
        // Este formato es requerido por el validador XBRL de la SSPD
        if (typeof value === 'number') {
          excelCell.numFmt = '#,##0;(#,##0)';
        }
      }
    } catch (error) {
      // Si falla la escritura, intentar un enfoque más agresivo
      console.warn(`Warning: Could not write to cell ${cell}:`, error);
      try {
        const excelCell = worksheet.getCell(cell);
        // Forzar el valor directamente
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (excelCell as any)._value = { 
          model: { value: value ?? null, type: typeof value === 'number' ? 2 : 3 } 
        };
      } catch {
        // Silenciar error si la celda no se puede escribir
        console.error(`Failed to write to cell ${cell}`);
      }
    }
  }

  /**
   * Llena la hoja de información general.
   */
  protected fillInfoSheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    // Datos básicos de la empresa (columna E, filas 13-22 típicamente)
    this.writeCell(worksheet, 'E13', options.companyId);
    this.writeCell(worksheet, 'E14', options.companyName);
    this.writeCell(worksheet, 'E15', options.nit || '');
    this.writeCell(worksheet, 'E16', options.reportDate);

    // Grado de redondeo
    if (options.roundingDegree) {
      const roundingLabels: Record<string, string> = {
        '1': '1 - Pesos',
        '2': '2 - Miles de pesos',
        '3': '3 - Millones de pesos',
        '4': '4 - Pesos redondeados a miles',
      };
      this.writeCell(worksheet, 'E20', roundingLabels[options.roundingDegree] || '1 - Pesos');
    }
  }

  /**
   * Personaliza el archivo .xbrlt.
   */
  protected customizeXbrlt(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    // Reemplazar fecha
    const year = options.reportDate.split('-')[0];
    result = result.replace(/2024-12-31/g, options.reportDate);
    result = result.replace(/2024/g, year);

    // Reemplazar ID de empresa
    result = result.replace(/ID20037/g, `ID${options.companyId}`);
    result = result.replace(/<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
      `<xbrli:identifier scheme="http://www.sui.gov.co">${options.companyId}</xbrli:identifier>`);

    return result;
  }

  /**
   * Personaliza el archivo .xml.
   */
  protected customizeXml(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    const year = options.reportDate.split('-')[0];
    result = result.replace(/2024-12-31/g, options.reportDate);
    result = result.replace(/2024/g, year);
    result = result.replace(/ID20037/g, `ID${options.companyId}`);

    return result;
  }

  /**
   * Personaliza el archivo .xbrl.
   */
  protected customizeXbrl(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    const year = options.reportDate.split('-')[0];
    result = result.replace(/2024-12-31/g, options.reportDate);
    result = result.replace(/2024/g, year);
    result = result.replace(/ID20037/g, `ID${options.companyId}`);
    result = result.replace(/<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
      `<xbrli:identifier scheme="http://www.sui.gov.co">${options.companyId}</xbrli:identifier>`);

    return result;
  }

  /**
   * Genera el prefijo del nombre de archivo de salida.
   */
  protected generateOutputPrefix(options: TemplateWithDataOptions): string {
    const date = options.reportDate.replace(/-/g, '');
    return `${this.templatePaths.outputPrefix}_ID${options.companyId}_${date}`;
  }

  /**
   * Genera el archivo README.
   */
  protected generateReadme(options: TemplateWithDataOptions): string {
    return `XBRL Generator - Paquete de Taxonomía
=====================================

Grupo NIIF: ${options.niifGroup.toUpperCase()}
Empresa: ${options.companyName}
ID (RUPS): ${options.companyId}
Fecha de Corte: ${options.reportDate}

Archivos incluidos:
- .xlsx: Plantilla Excel con datos pre-llenados
- .xbrlt: Plantilla XBRL
- .xml: Archivo de mapeo
- .xbrl: Instancia XBRL

Instrucciones:
1. Abrir XBRL Express
2. Importar el archivo .xlsx
3. Completar las hojas faltantes manualmente
4. Validar y generar el reporte final

Generado automáticamente por XBRL Generator
`;
  }
}

/**
 * Índice de exportaciones del módulo shared.
 */
export { BaseTemplateService as default };
