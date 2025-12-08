/**
 * IFETemplateService - Servicio de plantillas para taxonomía IFE.
 *
 * Este servicio extiende BaseTemplateService e implementa la lógica específica
 * para la taxonomía IFE (Informe Financiero Especial) trimestral.
 *
 * IFE es la taxonomía trimestral obligatoria de la SSPD desde 2020.
 * Tiene 8 hojas simplificadas vs las 60+ de R414.
 *
 * @module ife/IFETemplateService
 */

import type ExcelJS from 'exceljs';
import { BaseTemplateService } from '../shared/baseTemplateService';
import type {
  NiifGroup,
  TemplatePaths,
  ESFMapping,
  ServiceColumnMapping,
  SheetMapping,
  AccountData,
  ServiceBalanceData,
  TemplateWithDataOptions,
  IFETrimestre,
} from '../types';

// Importar mapeos específicos de IFE
import {
  IFE_ESF_SERVICE_COLUMNS,
  IFE_ESF_MAPPINGS,
} from './mappings/esfMappings';
import {
  IFE_ER_SERVICE_COLUMNS,
  IFE_ER_MAPPINGS,
} from './mappings/erMappings';
import { IFE_SHEET_MAPPING, IFE_TEMPLATE_PATHS } from './config';

/**
 * Interfaz para las fechas de un trimestre.
 */
interface TrimestreDates {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  prevEndDate: string; // Fecha fin del trimestre anterior (para instant de inicio)
}

/**
 * Calcula las fechas de inicio y fin de un trimestre para un año dado.
 * @param year - El año (ej: "2024")
 * @param trimestre - El trimestre ("1T", "2T", "3T", "4T")
 * @returns Objeto con startDate, endDate y prevEndDate
 */
function getTrimestreDates(year: string, trimestre: IFETrimestre): TrimestreDates {
  const y = parseInt(year, 10);
  
  switch (trimestre) {
    case '1T':
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-03-31`,
        prevEndDate: `${y - 1}-12-31`, // 31 dic del año anterior
      };
    case '2T':
      return {
        startDate: `${year}-04-01`,
        endDate: `${year}-06-30`,
        prevEndDate: `${year}-03-31`, // 31 mar del mismo año
      };
    case '3T':
      return {
        startDate: `${year}-07-01`,
        endDate: `${year}-09-30`,
        prevEndDate: `${year}-06-30`, // 30 jun del mismo año
      };
    case '4T':
      return {
        startDate: `${year}-10-01`,
        endDate: `${year}-12-31`,
        prevEndDate: `${year}-09-30`, // 30 sep del mismo año
      };
    default:
      // Por defecto, segundo trimestre
      return {
        startDate: `${year}-04-01`,
        endDate: `${year}-06-30`,
        prevEndDate: `${year}-03-31`,
      };
  }
}

/**
 * Servicio de plantillas para IFE.
 */
export class IFETemplateService extends BaseTemplateService {
  readonly group: NiifGroup = 'ife';

  readonly templatePaths: TemplatePaths = IFE_TEMPLATE_PATHS;

  // ============================================
  // IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS
  // ============================================

  getESFMappings(): ESFMapping[] {
    return IFE_ESF_MAPPINGS;
  }

  getServiceColumns(): ServiceColumnMapping {
    return IFE_ESF_SERVICE_COLUMNS;
  }

  getSheetMapping(): SheetMapping {
    return IFE_SHEET_MAPPING;
  }

  /**
   * Llena la Hoja3 (ESF - Estado de Situación Financiera por servicios).
   * Columnas I-P son servicios individuales, columna Q es el total.
   * 
   * IMPORTANTE: 
   * - El template tiene valores de EJEMPLO hardcodeados que debemos limpiar
   * - Columnas I-P: servicios individuales - limpiar todas las filas de datos
   * - Columna Q: tiene VALORES en filas de datos y FÓRMULAS en subtotales
   * - Debemos limpiar Q en filas de datos, pero NO tocar las filas con fórmulas
   * - Filas con FÓRMULAS (NO TOCAR): 51, 52, 64, 74, 75, 84, 85
   */
  fillESFSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void {
    const activeServices = Object.keys(distribution).filter(
      (s) => distribution[s] > 0
    );
    const columns = this.getServiceColumns();
    
    // Todas las columnas de servicios (I-P) + columna total (Q)
    const allServiceColumns = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    
    // Filas de DATOS que debemos limpiar (incluye columnas I-P y Q)
    // NOTA: El template tiene valores hardcodeados del ejemplo original
    // Las filas 51, 52, 64, 74, 75, 84, 85 tienen FÓRMULAS - NO limpiar Q en esas
    const dataRows = [
      // Activos corrientes (filas 15-31)
      15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      // Subtotal activos corrientes: fila 32 tiene valor, no fórmula - limpiar
      32,
      // Activos no corrientes (filas 34-50)
      34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
      // Fila 51 tiene FÓRMULA - no incluir
      // Fila 52 tiene FÓRMULA - no incluir
      // Pasivos corrientes (filas 56-63)
      56, 57, 58, 59, 60, 61, 62, 63,
      // Fila 64 tiene FÓRMULA - no incluir
      // Pasivos no corrientes (filas 66-73)
      66, 67, 68, 69, 70, 71, 72, 73,
      // Fila 74 tiene FÓRMULA - no incluir
      // Fila 75 tiene FÓRMULA - no incluir
      // Patrimonio (filas 77-83)
      77, 78, 79, 80, 81, 82, 83,
      // Fila 84 tiene FÓRMULA - no incluir
      // Fila 85 tiene FÓRMULA - no incluir
    ];
    
    // Limpiar TODAS las columnas de servicios (I-P) en filas de datos
    for (const row of dataRows) {
      for (const col of allServiceColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }
    
    // Limpiar TAMBIÉN columna Q en filas de datos (valores hardcodeados del ejemplo)
    // Las fórmulas de Excel en filas 51, 52, 64, 74, 75, 84, 85 se preservan
    for (const row of dataRows) {
      this.writeCell(worksheet, `Q${row}`, 0);
    }

    // Ahora llenar solo las filas mapeadas con valores reales
    for (const mapping of IFE_ESF_MAPPINGS) {
      let rowTotal = 0;
      
      // Escribir valores por servicio activo
      for (const service of activeServices) {
        const serviceColumn = columns[service as keyof ServiceColumnMapping];
        if (!serviceColumn || serviceColumn === 'Q') continue; // Saltar columna total

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        // Escribir el valor (ya limpiamos antes, así que esto sobrescribe el 0)
        this.writeCell(
          worksheet,
          `${serviceColumn}${mapping.row}`,
          serviceValue
        );
        
        // Acumular para el total
        rowTotal += serviceValue;
      }
      
      // ESCRIBIR el total en columna Q
      // El template tiene valores hardcodeados del ejemplo, no fórmulas de suma
      // Debemos escribir el total calculado para que los subtotales funcionen
      this.writeCell(worksheet, `Q${mapping.row}`, rowTotal);
    }
  }

  /**
   * Llena la Hoja4 (ER - Estado de Resultados por servicios).
   * Columnas E-L son servicios individuales, columna M es el total.
   * 
   * IMPORTANTE: 
   * - El template tiene valores de EJEMPLO hardcodeados que debemos limpiar
   * - Columnas E-L: servicios individuales
   * - Columna M: tiene VALORES hardcodeados del ejemplo, no fórmulas
   * - Debemos escribir el total calculado en M para cada fila de datos
   */
  fillERSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void {
    const activeServices = Object.keys(distribution).filter(
      (s) => distribution[s] > 0
    );
    const erColumns = IFE_ER_SERVICE_COLUMNS;
    
    // Columnas de servicios en ER (excluyendo M que es total)
    const allERServiceColumns = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    // Filas de datos en ER - incluir todas las filas con valores del ejemplo
    const erDataRows = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
    
    // Limpiar todas las filas de datos (columnas de servicios)
    for (const row of erDataRows) {
      for (const col of allERServiceColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }
    
    // Limpiar TAMBIÉN columna M en filas de datos (valores hardcodeados del ejemplo)
    for (const row of erDataRows) {
      this.writeCell(worksheet, `M${row}`, 0);
    }

    for (const mapping of IFE_ER_MAPPINGS) {
      let rowTotal = 0;
      
      // Escribir valores por servicio
      for (const service of activeServices) {
        const serviceColumn = erColumns[service as keyof ServiceColumnMapping];
        if (!serviceColumn || serviceColumn === 'M') continue; // Saltar columna total

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        // Escribir valor
        this.writeCell(
          worksheet,
          `${serviceColumn}${mapping.row}`,
          serviceValue
        );
        
        // Acumular para el total
        rowTotal += serviceValue;
      }
      
      // ESCRIBIR el total en columna M
      // El template tiene valores hardcodeados del ejemplo, no fórmulas
      this.writeCell(worksheet, `M${mapping.row}`, rowTotal);
    }
  }

  // ============================================
  // MÉTODOS ADICIONALES ESPECÍFICOS DE IFE
  // ============================================

  /**
   * Llena la Hoja5 (CxC por rangos de vencimiento).
   */
  fillCxCSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[]
  ): void {
    // IFE tiene CxC por rangos de vencimiento, no por estrato como R414
    // Los rangos son: No vencidas, 1-90 días, 91-180 días, 181-360 días, >360 días

    // Por ahora, distribuir el total de CxC con porcentajes por defecto
    const cxcTotal = this.sumAccountsByPrefix(accounts, ['13'], ['1399']);

    // Distribución por defecto según CLAUDE.md
    const ranges = [
      { column: 'F', percentage: 0.55 }, // No vencidas
      { column: 'G', percentage: 0.25 }, // 1-90 días
      { column: 'H', percentage: 0.20 }, // 91-180 días
      { column: 'I', percentage: 0.0 },  // 181-360 días
      { column: 'J', percentage: 0.0 },  // >360 días
    ];

    const dataRow = 16; // Fila de datos en Hoja5

    for (const range of ranges) {
      const value = Math.round(cxcTotal * range.percentage);
      this.writeCell(worksheet, `${range.column}${dataRow}`, value);
    }

    // Total
    this.writeCell(worksheet, `K${dataRow}`, cxcTotal);
  }

  /**
   * Llena la Hoja6 (CxP por rangos de vencimiento).
   */
  fillCxPSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[]
  ): void {
    // CxP tiene estructura similar a CxC
    const cxpTotal = this.sumAccountsByPrefix(
      accounts,
      ['22', '23'],
      [],
      true // Valor absoluto para pasivos
    );

    // Por defecto, todo en "No vencidas"
    const dataRow = 15;
    this.writeCell(worksheet, `D${dataRow}`, cxpTotal);
    this.writeCell(worksheet, `I${dataRow}`, cxpTotal);
  }

  /**
   * Llena la Hoja7 (Detalle de ingresos y gastos por servicio).
   * Columnas F-M son servicios individuales, columna N es el total.
   */
  fillDetalleIngresosGastosSheet(
    worksheet: ExcelJS.Worksheet,
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void {
    const activeServices = Object.keys(distribution).filter(
      (s) => distribution[s] > 0
    );

    // Columnas por servicio en Hoja7
    const columns: Record<string, string> = {
      acueducto: 'F',
      alcantarillado: 'G',
      aseo: 'H',
      energia: 'I',
      gas: 'J',
      glp: 'K',
      xmm: 'L',
      otras: 'M',
    };

    // Mapeos para Hoja7
    const mappings = [
      { row: 14, prefixes: ['41'], description: 'Ingresos actividades ordinarias' },
      { row: 15, prefixes: ['42'], description: 'Todos los demás ingresos' },
      // row 16 es total ingresos (autosuma)
      { row: 18, prefixes: ['5', '6'], description: 'Costos y gastos totales' },
      { row: 19, prefixes: ['5115', '5120'], description: 'Impuestos, tasas y contribuciones' },
      { row: 20, prefixes: ['5305'], description: 'Gastos financieros' },
      { row: 21, prefixes: ['5199'], description: 'Gasto por deterioro' },
      { row: 22, prefixes: ['5160', '5165'], description: 'Gasto por depreciación' },
      { row: 23, prefixes: ['5170'], description: 'Gasto por amortización' },
      { row: 24, prefixes: ['5195'], description: 'Gasto por provisiones' },
    ];

    for (const mapping of mappings) {
      let rowTotal = 0;

      for (const service of activeServices) {
        const serviceColumn = columns[service];
        if (!serviceColumn) continue;

        const value = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.prefixes,
          [],
          true
        );

        this.writeCell(worksheet, `${serviceColumn}${mapping.row}`, value);
        rowTotal += value;
      }

      // Escribir total en columna N
      if (rowTotal !== 0) {
        this.writeCell(worksheet, `N${mapping.row}`, rowTotal);
      }
    }
  }

  /**
   * Override del método fillExcelData para incluir hojas adicionales de IFE.
   */
  override fillExcelData(
    workbook: unknown,
    options: TemplateWithDataOptions
  ): void {
    const wb = workbook as ExcelJS.Workbook;

    // Llenar Hoja1 (Información general)
    const sheet1 = wb.getWorksheet('Hoja1');
    if (sheet1) {
      this.fillInfoSheetIFE(sheet1, options);
    }

    // Llenar Hoja3 (ESF por servicios) - usar código IFE '210000t'
    const sheet3 = wb.getWorksheet('Hoja3');
    if (sheet3) {
      this.fillESFSheet(
        sheet3,
        options.accounts,
        options.serviceBalances,
        options.distribution
      );
    }

    // Llenar Hoja4 (ER por servicios) - usar código IFE '310000t'
    const sheet4 = wb.getWorksheet('Hoja4');
    if (sheet4) {
      this.fillERSheet(
        sheet4,
        options.accounts,
        options.serviceBalances,
        options.distribution
      );
    }

    // Llenar Hoja5 (CxC por vencimiento)
    const sheet5 = wb.getWorksheet('Hoja5');
    if (sheet5) {
      this.fillCxCSheet(sheet5, options.accounts, options.serviceBalances);
    }

    // Llenar Hoja6 (CxP por vencimiento)
    const sheet6 = wb.getWorksheet('Hoja6');
    if (sheet6) {
      this.fillCxPSheet(sheet6, options.accounts);
    }

    // Llenar Hoja7 (Detalle ingresos y gastos)
    const sheet7 = wb.getWorksheet('Hoja7');
    if (sheet7) {
      this.fillDetalleIngresosGastosSheet(
        sheet7,
        options.serviceBalances,
        options.distribution
      );
    }

    // Hoja8 (Deterioro de activos) - normalmente es 0
    // No se llena automáticamente
  }

  /**
   * Llena la hoja de información general específica de IFE (Hoja1).
   * IFE tiene estructura diferente a R414 con más campos.
   * 
   * Mapeo de celdas según XML oficial:
   * - E13: NIT
   * - E14: ID RUPS
   * - E15: Nombre entidad
   * - E16: Fecha cierre
   * - E18: Dirección
   * - E19: Ciudad
   * - E20: Teléfono fijo
   * - E21: Teléfono celular
   * - E22: Email
   * - E24: Empleados inicio trimestre
   * - E25: Empleados fin trimestre
   * - E26: Promedio empleados
   * - E28: Tipo doc rep. legal
   * - E29: Número doc rep. legal
   * - E30: Nombres rep. legal
   * - E31: Apellidos rep. legal
   * - E33: Grupo clasificación
   * - E34: Declaración cumplimiento
   * - E35: Incertidumbre negocio en marcha
   * - E36: Explicación no negocio en marcha
   * - E38: Incertidumbre continuidad servicios
   * - E39: Finalización servicios
   * - E40: Detalle finalización servicios
   */
  protected fillInfoSheetIFE(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    const ife = options.ifeData;

    // Información básica de la empresa
    this.writeCell(worksheet, 'E13', options.nit || '');
    this.writeCell(worksheet, 'E14', options.companyId);
    this.writeCell(worksheet, 'E15', options.companyName);
    this.writeCell(worksheet, 'E16', options.reportDate);

    // Si hay datos específicos de IFE, llenar campos adicionales
    if (ife) {
      // Dirección y contacto
      this.writeCell(worksheet, 'E18', ife.address || '');
      this.writeCell(worksheet, 'E19', ife.city || '');
      this.writeCell(worksheet, 'E20', ife.phone || '');
      this.writeCell(worksheet, 'E21', ife.cellphone || ife.phone || '');
      this.writeCell(worksheet, 'E22', ife.email || '');

      // Empleados
      if (ife.employeesStart !== undefined) {
        this.writeCell(worksheet, 'E24', ife.employeesStart);
      }
      if (ife.employeesEnd !== undefined) {
        this.writeCell(worksheet, 'E25', ife.employeesEnd);
      }
      if (ife.employeesAverage !== undefined) {
        this.writeCell(worksheet, 'E26', ife.employeesAverage);
      }

      // Representante legal
      if (ife.representativeDocType) {
        // Mapear tipo de documento al formato SSPD
        const docTypeMap: Record<string, string> = {
          '01': '01 - CÉDULA DE CIUDADANÍA',
          '02': '02 - CÉDULA DE EXTRANJERÍA',
          '03': '03 - PASAPORTE',
        };
        this.writeCell(worksheet, 'E28', docTypeMap[ife.representativeDocType] || ife.representativeDocType);
      }
      this.writeCell(worksheet, 'E29', ife.representativeDocNumber || '');
      this.writeCell(worksheet, 'E30', ife.representativeFirstName || '');
      this.writeCell(worksheet, 'E31', ife.representativeLastName || '');

      // Marco normativo
      if (ife.normativeGroup) {
        // Mapear grupo al formato SSPD
        const groupMap: Record<string, string> = {
          'R414': 'R. 414',
          'NIIF1': 'Grupo 1 - NIIF Plenas',
          'NIIF2': 'Grupo 2 - NIIF PYMES',
          'NIIF3': 'Grupo 3 - Microempresas',
        };
        this.writeCell(worksheet, 'E33', groupMap[ife.normativeGroup] || ife.normativeGroup);
      }

      // Declaración de cumplimiento
      if (ife.complianceDeclaration !== undefined) {
        const compliance = ife.complianceDeclaration === 'true' || ife.complianceDeclaration === '1'
          ? '1. Si cumple'
          : '2. No cumple';
        this.writeCell(worksheet, 'E34', compliance);
      }

      // Negocio en marcha - Formato SSPD: "1. Si" o "2. No"
      const goingConcernValue = this.formatYesNo(ife.goingConcernUncertainty);
      this.writeCell(worksheet, 'E35', goingConcernValue);
      this.writeCell(worksheet, 'E36', ife.goingConcernExplanation || 'NA');

      // Continuidad de servicios - Formato SSPD: "1. Si" o "2. No"
      const servicesContinuityValue = this.formatYesNo(ife.servicesContinuityUncertainty);
      const servicesTerminationValue = this.formatYesNo(ife.servicesTermination);
      this.writeCell(worksheet, 'E38', servicesContinuityValue);
      this.writeCell(worksheet, 'E39', servicesTerminationValue);
      this.writeCell(worksheet, 'E40', ife.servicesTerminationDetail || 'NA');
    }
  }

  /**
   * Formatea valores booleanos/string al formato SSPD "1. Si" / "2. No".
   */
  private formatYesNo(value: string | boolean | undefined): string {
    if (value === undefined || value === null || value === '' || value === 'NA') {
      return '2. No';
    }
    if (value === true || value === 'true' || value === '1' || value === 'Si' || value === 'si' || value === '1. Si') {
      return '1. Si';
    }
    return '2. No';
  }

  /**
   * Override para generar nombres de archivo específicos de IFE.
   */
  protected override generateOutputPrefix(options: TemplateWithDataOptions): string {
    // IFE usa formato: IFE_Trimestral_ID{companyId}_{date}
    const date = options.reportDate.replace(/-/g, '');
    return `IFE_Trimestral_ID${options.companyId}_${date}`;
  }

  /**
   * Override para personalizar el archivo .xbrlt con nombres de archivo correctos para IFE.
   *
   * El problema es que la plantilla original tiene referencias como:
   * config="IFE_SegundoTrimestre_ID20037_2025-06-30.xml"
   *
   * Pero los archivos en el ZIP se llaman:
   * IFE_Trimestral_ID{companyId}_{date}.xml
   *
   * Este override corrige las referencias internas para que coincidan.
   * 
   * IMPORTANTE: Las fechas del periodo trimestral se calculan dinámicamente
   * basándose en el año y trimestre seleccionado por el usuario.
   */
  protected override customizeXbrlt(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    // Generar el nuevo prefijo de archivo
    const outputPrefix = this.generateOutputPrefix(options);

    // Reemplazar la referencia al archivo .xml en el config
    result = result.replace(
      /IFE_SegundoTrimestre_ID\d+_\d{4}-\d{2}-\d{2}\.xml/g,
      `${outputPrefix}.xml`
    );

    // Reemplazar referencias al archivo .xlsx también
    result = result.replace(
      /IFE_SegundoTrimestre_ID\d+_\d{4}-\d{2}-\d{2}\.xlsx/g,
      `${outputPrefix}.xlsx`
    );

    // Calcular fechas del trimestre basadas en el año y trimestre seleccionado
    const year = options.reportDate.split('-')[0];
    const trimestre = options.trimestre || '2T'; // Por defecto 2T si no se especifica
    const dates = getTrimestreDates(year, trimestre);

    // Reemplazar fechas del periodo trimestral SOLO dentro de tags específicos
    // para no afectar namespaces como http://www.superservicios.gov.co/xbrl/ef/core/2025-03-31
    
    // startDate: reemplazar solo dentro del tag <startDate>
    result = result.replace(/<startDate>2025-04-01<\/startDate>/g, `<startDate>${dates.startDate}</startDate>`);
    result = result.replace(/<startDate>2025-01-01<\/startDate>/g, `<startDate>${dates.startDate}</startDate>`);
    result = result.replace(/<startDate>2025-07-01<\/startDate>/g, `<startDate>${dates.startDate}</startDate>`);
    result = result.replace(/<startDate>2025-10-01<\/startDate>/g, `<startDate>${dates.startDate}</startDate>`);
    
    // endDate: reemplazar solo dentro del tag <endDate>
    result = result.replace(/<endDate>2025-06-30<\/endDate>/g, `<endDate>${dates.endDate}</endDate>`);
    result = result.replace(/<endDate>2025-03-31<\/endDate>/g, `<endDate>${dates.endDate}</endDate>`);
    result = result.replace(/<endDate>2025-09-30<\/endDate>/g, `<endDate>${dates.endDate}</endDate>`);
    result = result.replace(/<endDate>2025-12-31<\/endDate>/g, `<endDate>${dates.endDate}</endDate>`);
    
    // instant del reporte (fecha de cierre): reemplazar dentro de <instant>
    result = result.replace(/<instant>2025-06-30<\/instant>/g, `<instant>${dates.endDate}</instant>`);
    result = result.replace(/<instant>2025-03-31<\/instant>/g, `<instant>${dates.prevEndDate}</instant>`);
    result = result.replace(/<instant>2025-09-30<\/instant>/g, `<instant>${dates.endDate}</instant>`);
    result = result.replace(/<instant>2025-12-31<\/instant>/g, `<instant>${dates.endDate}</instant>`);
    
    // NOTA: Los namespaces y schemas NO se tocan porque usamos tags específicos

    // Reemplazar ID de empresa
    result = result.replace(/ID20037/g, `ID${options.companyId}`);
    result = result.replace(
      /<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
      `<xbrli:identifier scheme="http://www.sui.gov.co">${options.companyId}</xbrli:identifier>`
    );

    return result;
  }

  /**
   * Override para personalizar el archivo .xml de mapeo con nombres correctos para IFE.
   * El archivo .xml solo contiene mapeos de celdas Excel, no tiene fechas que cambiar.
   */
  protected override customizeXml(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    // Generar el nuevo prefijo de archivo
    const outputPrefix = this.generateOutputPrefix(options);

    // Reemplazar referencias a archivos
    result = result.replace(
      /IFE_SegundoTrimestre_ID\d+_\d{4}-\d{2}-\d{2}/g,
      outputPrefix
    );

    // Solo reemplazar ID de empresa - el .xml no tiene fechas
    result = result.replace(/ID20037/g, `ID${options.companyId}`);

    return result;
  }

  /**
   * Override para personalizar el archivo .xbrl con nombres correctos para IFE.
   */
  protected override customizeXbrl(content: string, options: TemplateWithDataOptions): string {
    let result = content;

    // Generar el nuevo prefijo de archivo
    const outputPrefix = this.generateOutputPrefix(options);

    // Reemplazar referencias a archivos
    result = result.replace(
      /IFE_SegundoTrimestre_ID\d+_\d{4}-\d{2}-\d{2}/g,
      outputPrefix
    );

    // Calcular fechas del trimestre
    const year = options.reportDate.split('-')[0];
    const trimestre = options.trimestre || '2T';
    const dates = getTrimestreDates(year, trimestre);

    // Reemplazar fechas SOLO dentro de tags XBRL específicos
    // para no afectar namespaces como xmlns:co-sspd-ife="...2025-03-31"
    
    // xbrli:startDate
    result = result.replace(/<xbrli:startDate>2025-04-01<\/xbrli:startDate>/g, `<xbrli:startDate>${dates.startDate}</xbrli:startDate>`);
    result = result.replace(/<xbrli:startDate>2025-01-01<\/xbrli:startDate>/g, `<xbrli:startDate>${dates.startDate}</xbrli:startDate>`);
    result = result.replace(/<xbrli:startDate>2025-07-01<\/xbrli:startDate>/g, `<xbrli:startDate>${dates.startDate}</xbrli:startDate>`);
    result = result.replace(/<xbrli:startDate>2025-10-01<\/xbrli:startDate>/g, `<xbrli:startDate>${dates.startDate}</xbrli:startDate>`);
    
    // xbrli:endDate
    result = result.replace(/<xbrli:endDate>2025-06-30<\/xbrli:endDate>/g, `<xbrli:endDate>${dates.endDate}</xbrli:endDate>`);
    result = result.replace(/<xbrli:endDate>2025-03-31<\/xbrli:endDate>/g, `<xbrli:endDate>${dates.endDate}</xbrli:endDate>`);
    result = result.replace(/<xbrli:endDate>2025-09-30<\/xbrli:endDate>/g, `<xbrli:endDate>${dates.endDate}</xbrli:endDate>`);
    result = result.replace(/<xbrli:endDate>2025-12-31<\/xbrli:endDate>/g, `<xbrli:endDate>${dates.endDate}</xbrli:endDate>`);
    
    // xbrli:instant - el 2025-03-31 es prevEndDate, el 2025-06-30 es endDate
    result = result.replace(/<xbrli:instant>2025-06-30<\/xbrli:instant>/g, `<xbrli:instant>${dates.endDate}</xbrli:instant>`);
    result = result.replace(/<xbrli:instant>2025-03-31<\/xbrli:instant>/g, `<xbrli:instant>${dates.prevEndDate}</xbrli:instant>`);
    result = result.replace(/<xbrli:instant>2025-09-30<\/xbrli:instant>/g, `<xbrli:instant>${dates.endDate}</xbrli:instant>`);
    result = result.replace(/<xbrli:instant>2025-12-31<\/xbrli:instant>/g, `<xbrli:instant>${dates.endDate}</xbrli:instant>`);
    
    // Fecha de cierre en el contenido del elemento
    result = result.replace(/>2025-06-30<\/co-sspd-ife:FechaDeCierreDelPeriodoSobreElQueSeInforma>/g, 
      `>${dates.endDate}</co-sspd-ife:FechaDeCierreDelPeriodoSobreElQueSeInforma>`);
    
    // Reemplazar ID de empresa
    result = result.replace(/ID20037/g, `ID${options.companyId}`);
    result = result.replace(
      /<xbrli:identifier scheme="_">_<\/xbrli:identifier>/g,
      `<xbrli:identifier scheme="http://www.sui.gov.co">${options.companyId}</xbrli:identifier>`
    );

    return result;
  }
}

// Exportar instancia por defecto
export const ifeTemplateService = new IFETemplateService();

// Exportar también la clase para testing
export default IFETemplateService;
