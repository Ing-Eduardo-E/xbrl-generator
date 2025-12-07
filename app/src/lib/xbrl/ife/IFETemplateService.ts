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

    for (const mapping of IFE_ESF_MAPPINGS) {
      // Escribir valores por servicio
      for (const service of activeServices) {
        const serviceColumn = columns[service as keyof ServiceColumnMapping];
        if (!serviceColumn) continue;

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        if (serviceValue !== 0) {
          this.writeCell(
            worksheet,
            `${serviceColumn}${mapping.row}`,
            serviceValue
          );
        }
      }
    }
  }

  /**
   * Llena la Hoja4 (ER - Estado de Resultados por servicios).
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

    for (const mapping of IFE_ER_MAPPINGS) {
      // Escribir valores por servicio
      for (const service of activeServices) {
        const serviceColumn = erColumns[service as keyof ServiceColumnMapping];
        if (!serviceColumn) continue;

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        // Siempre escribir, incluso si es 0
        this.writeCell(
          worksheet,
          `${serviceColumn}${mapping.row}`,
          serviceValue
        );
      }
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

      // Negocio en marcha
      this.writeCell(worksheet, 'E35', ife.goingConcernUncertainty || 'NA');
      this.writeCell(worksheet, 'E36', ife.goingConcernExplanation || 'NA');

      // Continuidad de servicios
      this.writeCell(worksheet, 'E38', ife.servicesContinuityUncertainty || 'NA');
      this.writeCell(worksheet, 'E39', ife.servicesTermination || 'No');
      this.writeCell(worksheet, 'E40', ife.servicesTerminationDetail || 'NA');
    }
  }

  /**
   * Override para generar nombres de archivo específicos de IFE.
   */
  protected override generateOutputPrefix(options: TemplateWithDataOptions): string {
    // IFE usa formato: IFE_Trimestral_ID{companyId}_{date}
    const date = options.reportDate.replace(/-/g, '');
    return `IFE_Trimestral_ID${options.companyId}_${date}`;
  }
}

// Exportar instancia por defecto
export const ifeTemplateService = new IFETemplateService();

// Exportar también la clase para testing
export default IFETemplateService;
