/**
 * R414TemplateService - Servicio de plantillas para taxonomía R414.
 *
 * Este servicio extiende BaseTemplateService e implementa la lógica específica
 * para la taxonomía R414 (Resolución 414 CGN - Sector Público).
 *
 * R414 es la taxonomía utilizada por empresas de servicios públicos que reportan
 * bajo el marco normativo de la Contaduría General de la Nación (CGN).
 *
 * @module r414/R414TemplateService
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
  UsuariosEstrato,
} from '../types';

// Importar mapeos específicos de R414
import {
  R414_SERVICE_COLUMNS,
  R414_ESF_MAPPINGS,
} from './mappings/esfMappings';
import { R414_ER_COLUMNS, R414_ER_MAPPINGS } from './mappings/erMappings';
import {
  R414_PPE_MAPPINGS,
  R414_INTANGIBLES_MAPPINGS,
  R414_EFECTIVO_MAPPINGS,
  R414_PROVISIONES_MAPPINGS,
  R414_OTRAS_PROVISIONES_MAPPINGS,
  R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
} from './mappings/ppeMappings';
import {
  R414_FC01_GASTOS_MAPPINGS,
  R414_FC01_DATA_ROWS,
  R414_FC01_ZERO_F_ROWS,
} from './mappings/fc01Mappings';
import { R414_SHEET_MAPPING, R414_TEMPLATE_PATHS } from './config';

/**
 * Servicio de plantillas para R414.
 */
export class R414TemplateService extends BaseTemplateService {
  readonly group: NiifGroup = 'r414';

  readonly templatePaths: TemplatePaths = R414_TEMPLATE_PATHS;

  // ============================================
  // IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS
  // ============================================

  getESFMappings(): ESFMapping[] {
    return R414_ESF_MAPPINGS;
  }

  getServiceColumns(): ServiceColumnMapping {
    return R414_SERVICE_COLUMNS;
  }

  getSheetMapping(): SheetMapping {
    return R414_SHEET_MAPPING;
  }

  // ============================================
  // OVERRIDE: Hoja1 para R414
  // ============================================

  /**
   * Override de fillInfoSheet para R414.
   * 
   * Campos específicos para R414 [110000] Información general:
   * - E11: Información a revelar sobre información general (bloque de texto)
   * - E12: Nombre de la empresa
   * - E13: ID RUPS
   * - E14: NIT
   * - E15: Descripción naturaleza estados financieros (1. Individual)
   * - E16: Información a revelar sobre la naturaleza del negocio
   * - E17: Fecha de inicio de operaciones (del paso 2)
   * - E18: Fecha del periodo sobre el que se informa
   * - E19: Grado de redondeo
   * - E21: ¿Estados financieros presentan información reexpresada? (2. No)
   */
  protected override fillInfoSheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    // E11: Información a revelar sobre información general [bloque de texto]
    const infoGeneral = `Los presentes estados financieros de ${options.companyName} corresponden al periodo terminado el ${options.reportDate}. La empresa es un prestador de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo, constituida conforme a las leyes colombianas, que opera bajo la regulación de la Ley 142 de 1994 y la supervisión de la Superintendencia de Servicios Públicos Domiciliarios (SSPD). Los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la Contaduría General de la Nación.`;
    this.writeCell(worksheet, 'E11', infoGeneral);

    // E12: Nombre de la empresa
    this.writeCell(worksheet, 'E12', options.companyName);
    
    // E13: ID RUPS
    this.writeCell(worksheet, 'E13', options.companyId);
    
    // E14: NIT
    this.writeCell(worksheet, 'E14', options.nit || '');
    
    // E15: Descripción de la naturaleza de los estados financieros
    // Siempre "1. Individual" para R414
    this.writeCell(worksheet, 'E15', '1. Individual');
    
    // E16: Información a revelar sobre la naturaleza del negocio
    const naturalezaNegocio = `La empresa tiene por objeto social la prestación de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo, incluyendo sus actividades complementarias de captación, tratamiento, distribución de agua potable, recolección, transporte y disposición final de aguas residuales, y la gestión integral de residuos sólidos, de conformidad con la Ley 142 de 1994 y demás normas aplicables.`;
    this.writeCell(worksheet, 'E16', naturalezaNegocio);
    
    // E17: Fecha de inicio de operaciones
    // Usa el campo startDate del formulario (fecha de inicio de operaciones)
    // Si no está disponible, usa una fecha por defecto
    const fechaInicioOperaciones = options.startDate || '2000-01-01';
    this.writeCell(worksheet, 'E17', fechaInicioOperaciones);
    
    // E18: Fecha del periodo sobre el que se informa
    this.writeCell(worksheet, 'E18', options.reportDate);

    // E19: Grado de redondeo - Valores exactos según taxonomía R414
    if (options.roundingDegree) {
      const r414RoundingLabels: Record<string, string> = {
        '1': '1 - Pesos',
        '2': '2 - Miles de pesos',
        '3': '3 - Millones de pesos',
        '4': '4 - Pesos redondeada a miles',
      };
      const roundingValue = r414RoundingLabels[options.roundingDegree] || '1 - Pesos';
      this.writeCell(worksheet, 'E19', roundingValue);
    }

    // E21: ¿Estos estados financieros presentan información reexpresada?
    // Siempre "2. No" para R414
    this.writeCell(worksheet, 'E21', '2. No');
  }

  /**
   * Llena la Hoja2 (ESF - Estado de Situación Financiera).
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

    // Agrupar cuentas por servicio
    const accountsByService: Record<string, ServiceBalanceData[]> = {};
    for (const service of activeServices) {
      accountsByService[service] = serviceBalances.filter(
        (sb) => sb.service === service
      );
    }

    for (const mapping of R414_ESF_MAPPINGS) {
      // Calcular total consolidado
      const totalValue = this.sumAccountsByPrefix(
        accounts,
        mapping.pucPrefixes,
        mapping.excludePrefixes,
        mapping.useAbsoluteValue
      );

      // Escribir valor total en columna P (Total)
      if (totalValue !== 0) {
        this.writeCell(worksheet, `${columns.total}${mapping.row}`, totalValue);
      }

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
   * Llena la Hoja3 (ER - Estado de Resultados).
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

    // Columnas específicas para ER en R414
    const erColumns: Record<string, string> = {
      acueducto: 'E',
      alcantarillado: 'F',
      aseo: 'G',
    };
    const totalColumn = 'L';

    for (const mapping of R414_ER_MAPPINGS) {
      // Calcular total consolidado
      const totalValue = this.sumAccountsByPrefix(
        accounts,
        mapping.pucPrefixes,
        mapping.excludePrefixes,
        mapping.useAbsoluteValue
      );

      // Escribir valor total en columna L - SIEMPRE escribir, incluso si es 0
      this.writeCell(worksheet, `${totalColumn}${mapping.row}`, totalValue);

      // Escribir valores por servicio
      for (const service of activeServices) {
        const serviceColumn = erColumns[service];
        if (!serviceColumn) continue;

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        // SIEMPRE escribir el valor, incluso si es 0
        this.writeCell(worksheet, `${serviceColumn}${mapping.row}`, serviceValue);
      }
    }
  }

  // ============================================
  // MÉTODOS ADICIONALES ESPECÍFICOS DE R414
  // ============================================

  /**
   * Llena la Hoja7 (Notas - Subclasificaciones PPE, Intangibles, Efectivo, etc.).
   */
  fillHoja7Sheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[]
  ): void {
    // Helper para verificar si una cuenta coincide con los prefijos
    const matchesPrefixes = (
      code: string,
      prefixes: string[],
      excludes?: string[]
    ): boolean => {
      if (excludes) {
        for (const exclude of excludes) {
          if (code.startsWith(exclude)) return false;
        }
      }
      for (const prefix of prefixes) {
        if (code.startsWith(prefix)) return true;
      }
      return false;
    };

    // Función helper para procesar una sección completa
    const processSectionWithZeroFill = (
      mappings: ESFMapping[],
      sectionName: string,
      allRowsInSection: number[]
    ) => {
      // Primero calcular todos los valores
      const rowValues: Map<number, number> = new Map();
      let hasAnyValue = false;

      for (const mapping of mappings) {
        let totalValue = 0;
        for (const account of accounts) {
          if (!account.isLeaf) continue;
          if (
            matchesPrefixes(
              account.code,
              mapping.pucPrefixes,
              mapping.excludePrefixes
            )
          ) {
            totalValue += account.value;
          }
        }

        if (mapping.useAbsoluteValue) {
          totalValue = Math.abs(totalValue);
        }

        rowValues.set(mapping.row, totalValue);
        if (totalValue !== 0) {
          hasAnyValue = true;
        }
      }

      // Si hay al menos un valor, escribir todos (incluyendo ceros)
      if (hasAnyValue) {
        for (const row of allRowsInSection) {
          const value = rowValues.get(row) ?? 0;
          this.writeCell(worksheet, `F${row}`, value);
        }
      }
    };

    // PPE - Propiedad, Planta y Equipo (filas 14-34)
    // Autosumas: 16, 22, 29, 31, 34
    const ppeDataRows = [
      14, 15, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 32, 33,
    ];
    processSectionWithZeroFill(R414_PPE_MAPPINGS, 'PPE', ppeDataRows);

    // Activos Intangibles y Plusvalía (filas 37-48)
    // Autosumas: 44, 48
    const intangiblesDataRows = [37, 38, 39, 40, 41, 42, 43, 45, 46, 47];
    processSectionWithZeroFill(
      R414_INTANGIBLES_MAPPINGS,
      'Intangibles',
      intangiblesDataRows
    );

    // Efectivo y Equivalentes al Efectivo (filas 51-60)
    // Autosumas: 53, 58, 60
    const efectivoDataRows = [51, 52, 55, 56, 57, 59];
    processSectionWithZeroFill(
      R414_EFECTIVO_MAPPINGS,
      'Efectivo',
      efectivoDataRows
    );

    // Clases de Otras Provisiones (filas 63-73)
    // Autosumas: 65, 69, 73
    const provisionesDataRows = [63, 64, 67, 68, 71, 72];
    processSectionWithZeroFill(
      R414_PROVISIONES_MAPPINGS,
      'Provisiones',
      provisionesDataRows
    );

    // Otras Provisiones (filas 75-77)
    // Autosuma: 77
    const otrasProvisionesDataRows = [75, 76];
    processSectionWithZeroFill(
      R414_OTRAS_PROVISIONES_MAPPINGS,
      'Otras Provisiones',
      otrasProvisionesDataRows
    );

    // Beneficios a Empleados (filas 79-83)
    // Autosuma: 83
    const beneficiosDataRows = [79, 80, 81, 82];
    processSectionWithZeroFill(
      R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
      'Beneficios Empleados',
      beneficiosDataRows
    );
  }

  /**
   * Llena una hoja FC01 (Gastos por servicio).
   * Se usa para Hoja16 (Acueducto), Hoja17 (Alcantarillado), Hoja18 (Aseo).
   */
  fillFC01Sheet(
    worksheet: ExcelJS.Worksheet,
    serviceAccounts: ServiceBalanceData[]
  ): void {
    // Helper para verificar si una cuenta coincide con los prefijos
    const matchesPrefixes = (
      code: string,
      prefixes: string[],
      excludes?: string[]
    ): boolean => {
      if (excludes) {
        for (const exclude of excludes) {
          if (code.startsWith(exclude)) return false;
        }
      }
      for (const prefix of prefixes) {
        if (code.startsWith(prefix)) return true;
      }
      return false;
    };

    // Helper para sumar cuentas por prefijos
    const sumByPrefixes = (
      prefixes: string[],
      excludePrefixes?: string[]
    ): number => {
      let total = 0;
      for (const account of serviceAccounts) {
        if (!account.isLeaf) continue;
        if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
          total += account.value;
        }
      }
      return total;
    };

    // Columna E - Gastos (clase 5)
    for (const mapping of R414_FC01_GASTOS_MAPPINGS) {
      let value = sumByPrefixes(mapping.pucPrefixes, mapping.excludePrefixes);

      // Fila 33 (Ganancias MPP) se muestra como negativo
      if (mapping.row === 33 && value !== 0) {
        value = -value;
      }

      this.writeCell(worksheet, `E${mapping.row}`, value);
    }

    // Columna F - Costos de ventas (clase 6)
    // Limpiar todas las filas de columna F excepto fila 72
    for (const row of R414_FC01_ZERO_F_ROWS) {
      this.writeCell(worksheet, `F${row}`, 0);
    }

    // Fila 72: Costos de ventas (clase 6)
    const costosVentas = sumByPrefixes(['6']);
    this.writeCell(worksheet, 'F72', costosVentas);

    // Columna G - Total (E + F) para cada fila con datos
    for (const row of R414_FC01_DATA_ROWS) {
      const valorE = (worksheet.getCell(`E${row}`).value as number) || 0;
      const valorF = (worksheet.getCell(`F${row}`).value as number) || 0;
      this.writeCell(worksheet, `G${row}`, valorE + valorF);
    }
  }

  /**
   * Llena la Hoja22 (FC01-7 - Total servicios públicos).
   * Suma los valores de Hoja16, 17 y 18.
   */
  fillFC01TotalSheet(
    worksheet: ExcelJS.Worksheet,
    sheet16: ExcelJS.Worksheet,
    sheet17: ExcelJS.Worksheet,
    sheet18: ExcelJS.Worksheet
  ): void {
    // Mapeo de filas origen a destino
    const mapeoFilas = [
      { origen: 13, destino: 13 },
      { origen: 14, destino: 14 },
      { origen: 15, destino: 15 },
      { origen: 16, destino: 16 },
      { origen: 17, destino: 17 },
      { origen: 18, destino: 18 },
      { origen: 19, destino: 19 },
      { origen: 21, destino: 21 },
      { origen: 22, destino: 22 },
      { origen: 23, destino: 23 },
      { origen: 25, destino: 25 },
      { origen: 27, destino: 27 },
      { origen: 28, destino: 28 },
      { origen: 29, destino: 29 },
      { origen: 30, destino: 30 },
      { origen: 31, destino: 31 },
      { origen: 32, destino: 32 },
      { origen: 33, destino: 33 },
      { origen: 34, destino: 34 },
      { origen: 35, destino: 35 },
      { origen: 72, destino: 72 },
      { origen: 77, destino: 77 },
      { origen: 80, destino: 80 },
      { origen: 81, destino: 81 },
    ];

    for (const { origen, destino } of mapeoFilas) {
      // Sumar columna E de las 3 hojas
      const e16 = (sheet16.getCell(`E${origen}`).value as number) || 0;
      const e17 = (sheet17.getCell(`E${origen}`).value as number) || 0;
      const e18 = (sheet18.getCell(`E${origen}`).value as number) || 0;
      const sumaE = e16 + e17 + e18;

      // Sumar columna F de las 3 hojas
      const f16 = (sheet16.getCell(`F${origen}`).value as number) || 0;
      const f17 = (sheet17.getCell(`F${origen}`).value as number) || 0;
      const f18 = (sheet18.getCell(`F${origen}`).value as number) || 0;
      const sumaF = f16 + f17 + f18;

      // Escribir en Hoja22
      this.writeCell(worksheet, `E${destino}`, sumaE);
      this.writeCell(worksheet, `F${destino}`, sumaF);
      this.writeCell(worksheet, `G${destino}`, sumaE + sumaF);

      // Columnas K, L, M (Otras actividades - igual a E, F, G)
      this.writeCell(worksheet, `K${destino}`, sumaE);
      this.writeCell(worksheet, `L${destino}`, sumaF);
      this.writeCell(worksheet, `M${destino}`, sumaE + sumaF);
    }
  }

  /**
   * Llena la Hoja23 (FC02 - Complementario de Ingresos).
   */
  fillFC02Sheet(
    worksheet: ExcelJS.Worksheet,
    sheet3: ExcelJS.Worksheet
  ): void {
    // Obtener los valores de ingresos de la Hoja3 (fila 14)
    const ingresosAcueducto = (sheet3.getCell('E14').value as number) || 0;
    const ingresosAlcantarillado = (sheet3.getCell('F14').value as number) || 0;
    const ingresosAseo = (sheet3.getCell('G14').value as number) || 0;

    // Acueducto (filas 17-18)
    this.writeCell(worksheet, 'I17', ingresosAcueducto);
    this.writeCell(worksheet, 'K18', ingresosAcueducto);

    // Alcantarillado (filas 22-23)
    this.writeCell(worksheet, 'I22', ingresosAlcantarillado);
    this.writeCell(worksheet, 'K23', ingresosAlcantarillado);

    // Aseo (filas 28 y 40)
    this.writeCell(worksheet, 'I28', ingresosAseo);
    this.writeCell(worksheet, 'K40', ingresosAseo);
  }

  /**
   * Llena una hoja FC03 (CXC por estrato).
   * Se usa para Hoja24 (Acueducto), Hoja25 (Alcantarillado), Hoja26 (Aseo).
   */
  fillFC03Sheet(
    worksheet: ExcelJS.Worksheet,
    sheet2: ExcelJS.Worksheet,
    serviceColumn: string,
    usuariosEstrato?: UsuariosEstrato
  ): void {
    // Obtener CXC Corrientes de Hoja2 (filas 19 + 20)
    const cxcCorrientes19 =
      (sheet2.getCell(`${serviceColumn}19`).value as number) || 0;
    const cxcCorrientes20 =
      (sheet2.getCell(`${serviceColumn}20`).value as number) || 0;
    const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;

    // Obtener CXC No Corrientes de Hoja2 (filas 43 + 44)
    const cxcNoCorrientes43 =
      (sheet2.getCell(`${serviceColumn}43`).value as number) || 0;
    const cxcNoCorrientes44 =
      (sheet2.getCell(`${serviceColumn}44`).value as number) || 0;
    const totalCXCNoCorrientes = cxcNoCorrientes43 + cxcNoCorrientes44;

    // Estratos residenciales
    const estratos: Array<{ fila: number; key: keyof UsuariosEstrato }> = [
      { fila: 19, key: 'estrato1' },
      { fila: 20, key: 'estrato2' },
      { fila: 21, key: 'estrato3' },
      { fila: 22, key: 'estrato4' },
      { fila: 23, key: 'estrato5' },
      { fila: 24, key: 'estrato6' },
    ];

    // Estratos no residenciales
    const noResidenciales: Array<{ fila: number; key: keyof UsuariosEstrato }> = [
      { fila: 25, key: 'industrial' },
      { fila: 26, key: 'comercial' },
      { fila: 27, key: 'oficial' },
      { fila: 28, key: 'especial' },
    ];

    const todosEstratos = [...estratos, ...noResidenciales];

    // Calcular total de usuarios
    let totalUsuarios = 0;
    if (usuariosEstrato) {
      for (const estrato of todosEstratos) {
        totalUsuarios += Number(usuariosEstrato[estrato.key]) || 0;
      }
    }

    // Rangos de vencimiento
    const rangosVencimiento = [
      { columna: 'J', porcentaje: 0.11 },
      { columna: 'K', porcentaje: 0.09 },
      { columna: 'L', porcentaje: 0.25 },
      { columna: 'M', porcentaje: 0.15 },
      { columna: 'N', porcentaje: 0.2 },
      { columna: 'O', porcentaje: 0.12 },
      { columna: 'P', porcentaje: 0.08 },
      { columna: 'Q', porcentaje: 0.0 },
      { columna: 'R', porcentaje: 0.0 },
    ];

    // Distribuir CXC por estrato
    for (const estrato of todosEstratos) {
      const usuarios = usuariosEstrato
        ? Number(usuariosEstrato[estrato.key]) || 0
        : 0;
      let valorCorriente = 0;
      let valorNoCorriente = 0;

      if (usuarios > 0 && totalUsuarios > 0) {
        valorCorriente = Math.round(
          (totalCXCCorrientes * usuarios) / totalUsuarios
        );
        valorNoCorriente = Math.round(
          (totalCXCNoCorrientes * usuarios) / totalUsuarios
        );
      }

      // Columnas G, H, I
      this.writeCell(worksheet, `G${estrato.fila}`, valorCorriente);
      this.writeCell(worksheet, `H${estrato.fila}`, valorNoCorriente);
      const totalCXCEstrato = valorCorriente + valorNoCorriente;
      this.writeCell(worksheet, `I${estrato.fila}`, totalCXCEstrato);

      // Distribuir por rangos de vencimiento
      let sumaRangos = 0;
      for (const rango of rangosVencimiento) {
        const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
        this.writeCell(worksheet, `${rango.columna}${estrato.fila}`, valorRango);
        sumaRangos += valorRango;
      }
      this.writeCell(worksheet, `S${estrato.fila}`, sumaRangos);
    }
  }

  /**
   * Llena la Hoja26 (FC03-3 - CXC Aseo por estrato).
   * 
   * IMPORTANTE: Hoja26 tiene estructura DIFERENTE a Hoja24/25:
   * - Filas: 15-24 (no 19-28)
   * - Columnas: E=Corriente, F=No Corriente, G=Total (no G/H/I)
   * - Rangos vencimiento: H-P (no J-R)
   * - Suma: Q (no S)
   */
  fillFC03AseoSheet(
    worksheet: ExcelJS.Worksheet,
    sheet2: ExcelJS.Worksheet,
    usuariosEstrato?: UsuariosEstrato
  ): void {
    // Obtener CXC Corrientes de Hoja2 columna K (K19 + K20)
    const cxcCorrientes19 = (sheet2.getCell('K19').value as number) || 0;
    const cxcCorrientes20 = (sheet2.getCell('K20').value as number) || 0;
    const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;

    // Obtener CXC No Corrientes de Hoja2 columna K (K43 + K44)
    const cxcNoCorrientes43 = (sheet2.getCell('K43').value as number) || 0;
    const cxcNoCorrientes44 = (sheet2.getCell('K44').value as number) || 0;
    const totalCXCNoCorrientes = cxcNoCorrientes43 + cxcNoCorrientes44;

    console.log(`[R414] Hoja26 - CXC Aseo desde Hoja2:`);
    console.log(`  Corrientes (K19+K20): ${cxcCorrientes19} + ${cxcCorrientes20} = ${totalCXCCorrientes}`);
    console.log(`  No Corrientes (K43+K44): ${cxcNoCorrientes43} + ${cxcNoCorrientes44} = ${totalCXCNoCorrientes}`);

    // Estratos - FILAS 15-24 para Aseo
    const estratos: Array<{ fila: number; key: keyof UsuariosEstrato }> = [
      { fila: 15, key: 'estrato1' },
      { fila: 16, key: 'estrato2' },
      { fila: 17, key: 'estrato3' },
      { fila: 18, key: 'estrato4' },
      { fila: 19, key: 'estrato5' },
      { fila: 20, key: 'estrato6' },
    ];

    const noResidenciales: Array<{ fila: number; key: keyof UsuariosEstrato }> = [
      { fila: 21, key: 'industrial' },
      { fila: 22, key: 'comercial' },
      { fila: 23, key: 'oficial' },
      { fila: 24, key: 'especial' },
    ];

    const todosEstratos = [...estratos, ...noResidenciales];

    // Calcular total de usuarios
    let totalUsuarios = 0;
    if (usuariosEstrato) {
      for (const estrato of todosEstratos) {
        totalUsuarios += Number(usuariosEstrato[estrato.key]) || 0;
      }
    }

    console.log(`[R414] Hoja26 - Total usuarios aseo: ${totalUsuarios}`);

    // Rangos de vencimiento para Aseo - COLUMNAS H-P
    const rangosVencimiento = [
      { columna: 'H', porcentaje: 0.11 },  // No vencida
      { columna: 'I', porcentaje: 0.09 },  // 1-30 días
      { columna: 'J', porcentaje: 0.25 },  // 31-60 días
      { columna: 'K', porcentaje: 0.15 },  // 61-90 días
      { columna: 'L', porcentaje: 0.20 },  // 91-120 días
      { columna: 'M', porcentaje: 0.12 },  // 121-150 días
      { columna: 'N', porcentaje: 0.08 },  // 151-180 días
      { columna: 'O', porcentaje: 0.00 },  // 181-360 días
      { columna: 'P', porcentaje: 0.00 },  // >360 días
    ];

    // Distribuir CXC por estrato
    for (const estrato of todosEstratos) {
      const usuarios = usuariosEstrato
        ? Number(usuariosEstrato[estrato.key]) || 0
        : 0;
      let valorCorriente = 0;
      let valorNoCorriente = 0;

      if (usuarios > 0 && totalUsuarios > 0) {
        valorCorriente = Math.round(
          (totalCXCCorrientes * usuarios) / totalUsuarios
        );
        valorNoCorriente = Math.round(
          (totalCXCNoCorrientes * usuarios) / totalUsuarios
        );
      }

      // Columnas E, F, G para Aseo (diferente a Hoja24/25)
      this.writeCell(worksheet, `E${estrato.fila}`, valorCorriente);
      this.writeCell(worksheet, `F${estrato.fila}`, valorNoCorriente);
      const totalCXCEstrato = valorCorriente + valorNoCorriente;
      this.writeCell(worksheet, `G${estrato.fila}`, totalCXCEstrato);

      // Distribuir por rangos de vencimiento (columnas H-P)
      let sumaRangos = 0;
      for (const rango of rangosVencimiento) {
        const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
        this.writeCell(worksheet, `${rango.columna}${estrato.fila}`, valorRango);
        sumaRangos += valorRango;
      }

      // Ajustar diferencia de redondeo en columna J (mayor porcentaje)
      const diferencia = totalCXCEstrato - sumaRangos;
      if (diferencia !== 0) {
        const valorJActual = (worksheet.getCell(`J${estrato.fila}`).value as number) || 0;
        this.writeCell(worksheet, `J${estrato.fila}`, valorJActual + diferencia);
        sumaRangos = totalCXCEstrato;
      }

      // Columna Q = suma de rangos (debe coincidir con G)
      this.writeCell(worksheet, `Q${estrato.fila}`, sumaRangos);
    }

    console.log('[R414] Hoja26 (FC03-3 Aseo) completada.');
  }

  /**
   * Llena la Hoja32 (FC05b - Pasivos por edades de vencimiento).
   * 
   * Estructura Hoja32:
   * - Filas 15-29: 15 categorías de pasivos
   * - Fila 30: TOTAL (fórmula)
   * 
   * Columnas:
   * - D = Pasivos corrientes
   * - E = Total (Corriente + No Corriente)
   * - F = Pasivos no corrientes
   * - G = No vencidos
   * - H = Total por bandas de tiempo (G + J)
   * - I = Vencidos hasta 30 días
   * - J = Total vencidos (I+K+L+M+N+O)
   * - K = Vencidos hasta 60 días
   * - L = Vencidos hasta 90 días
   * - M = Vencidos hasta 180 días
   * - N = Vencidos hasta 360 días
   * - O = Vencidos mayor 360 días
   */
  fillFC05bSheet(
    worksheet: ExcelJS.Worksheet,
    sheet2: ExcelJS.Worksheet
  ): void {
    console.log('[R414] Escribiendo datos en Hoja32 (FC05b - Pasivos por edades de vencimiento)...');

    // Función auxiliar para obtener valor de celda de Hoja2 (columna P = Total)
    const getValorHoja2 = (filas: number[]): number => {
      let suma = 0;
      for (const fila of filas) {
        const valor = sheet2.getCell(`P${fila}`).value;
        if (typeof valor === 'number') {
          suma += valor;
        } else if (valor && typeof valor === 'object' && 'result' in valor) {
          suma += (valor as { result: number }).result || 0;
        }
      }
      return suma;
    };

    // Mapeo de los 15 tipos de pasivos de Hoja32 a las filas de Hoja2
    // Basado en la estructura de R414 ESF (Estado de Situación Financiera)
    const mapeoHoja32aHoja2 = [
      {
        fila32: 15,
        nombre: 'Nómina por pagar',
        // Fila 69: Provisiones beneficios empleados (parte nómina)
        filasCorrientes: [69],
        filasNoCorrientes: []
      },
      {
        fila32: 16,
        nombre: 'Prestaciones sociales por pagar',
        // Beneficios empleados largo plazo
        filasCorrientes: [],
        filasNoCorrientes: [91]  // Provisiones beneficios empleados LP
      },
      {
        fila32: 17,
        nombre: 'Cuentas comerciales por pagar por adquisición de bienes y servicios',
        // Filas 73 (servicios) + 74 (proveedores) + 76 (otras cuentas por pagar)
        filasCorrientes: [73, 74, 76],
        filasNoCorrientes: [95]  // Cuentas por pagar bienes LP
      },
      {
        fila32: 18,
        nombre: 'Impuestos por pagar',
        // Fila 80: Impuesto ganancias por pagar
        filasCorrientes: [80],
        filasNoCorrientes: []
      },
      {
        fila32: 19,
        nombre: 'Cuentas por pagar a partes relacionadas y asociadas',
        // Fila 75: Cuentas por pagar partes relacionadas
        filasCorrientes: [75],
        filasNoCorrientes: []
      },
      {
        fila32: 20,
        nombre: 'Obligaciones financieras por pagar',
        // Filas 78 (títulos deuda) + 79 (préstamos)
        filasCorrientes: [78, 79],
        filasNoCorrientes: [100, 101]  // Títulos deuda LP + Préstamos LP
      },
      {
        fila32: 21,
        nombre: 'Ingresos recibidos por anticipado e ingresos diferidos',
        // Fila 82: Ingresos diferidos corrientes
        filasCorrientes: [82],
        filasNoCorrientes: [105]  // Ingresos diferidos LP
      },
      {
        fila32: 22,
        nombre: 'Pasivos por impuestos diferidos',
        // Fila 83: Pasivos por impuestos diferidos corrientes
        filasCorrientes: [83],
        filasNoCorrientes: [103]  // Pasivos por impuestos diferidos LP
      },
      {
        fila32: 23,
        nombre: 'Provisiones',
        // Fila 70: Otras provisiones corrientes
        filasCorrientes: [70],
        filasNoCorrientes: [92]  // Otras provisiones no corrientes
      },
      {
        fila32: 24,
        nombre: 'Tasas ambientales y tasas de uso por pagar',
        // No hay fila específica en Hoja2 - se deja en 0
        filasCorrientes: [],
        filasNoCorrientes: []
      },
      {
        fila32: 25,
        nombre: 'Otras tasas y contribuciones por pagar',
        // No hay fila específica en Hoja2 - se deja en 0
        filasCorrientes: [],
        filasNoCorrientes: []
      },
      {
        fila32: 26,
        nombre: 'Pasivos pretoma (Solo intervenidas)',
        // No aplica para empresas normales - se deja en 0
        filasCorrientes: [],
        filasNoCorrientes: []
      },
      {
        fila32: 27,
        nombre: 'Recursos recibidos en administración',
        // No hay fila específica en Hoja2 - se deja en 0
        filasCorrientes: [],
        filasNoCorrientes: []
      },
      {
        fila32: 28,
        nombre: 'Recursos recibidos a favor de terceros',
        // No hay fila específica en Hoja2 - se deja en 0
        filasCorrientes: [],
        filasNoCorrientes: []
      },
      {
        fila32: 29,
        nombre: 'Otros pasivos',
        // Filas 86 (otros pasivos financieros) + 87 (otros pasivos no financieros)
        filasCorrientes: [86, 87],
        filasNoCorrientes: [108]  // Otros pasivos financieros LP
      },
    ];

    // Porcentajes de distribución por antigüedad
    // Se aplican al TOTAL (columna E) para calcular las bandas de vencimiento
    const porcentajesAntiguedad = {
      noVencido: 0.25,      // Col G: 25%
      hasta30: 0.15,        // Col I: 15%
      hasta60: 0.30,        // Col K: 30%
      hasta90: 0.15,        // Col L: 15%
      hasta180: 0.10,       // Col M: 10%
      hasta360: 0.05,       // Col N: 5%
      mayor360: 0.00,       // Col O: 0%
    };

    let totalCorrientes = 0;
    let totalNoCorrientes = 0;
    let totalGeneral = 0;

    for (const mapeo of mapeoHoja32aHoja2) {
      // Obtener valores reales de Hoja2
      const valorCorriente = getValorHoja2(mapeo.filasCorrientes);
      const valorNoCorriente = getValorHoja2(mapeo.filasNoCorrientes);
      const valorTotal = valorCorriente + valorNoCorriente;

      totalCorrientes += valorCorriente;
      totalNoCorrientes += valorNoCorriente;
      totalGeneral += valorTotal;

      // Columna D = Pasivos corrientes
      if (valorCorriente !== 0) {
        this.writeCell(worksheet, `D${mapeo.fila32}`, valorCorriente);
      }

      // Columna F = Pasivos no corrientes
      if (valorNoCorriente !== 0) {
        this.writeCell(worksheet, `F${mapeo.fila32}`, valorNoCorriente);
      }

      // Columna E = Total (Corriente + No Corriente)
      if (valorTotal !== 0) {
        this.writeCell(worksheet, `E${mapeo.fila32}`, valorTotal);

        // Calcular distribución por antigüedad basada en el Total (E)
        const noVencido = Math.round(valorTotal * porcentajesAntiguedad.noVencido);
        const hasta30 = Math.round(valorTotal * porcentajesAntiguedad.hasta30);
        const hasta60 = Math.round(valorTotal * porcentajesAntiguedad.hasta60);
        const hasta90 = Math.round(valorTotal * porcentajesAntiguedad.hasta90);
        const hasta180 = Math.round(valorTotal * porcentajesAntiguedad.hasta180);
        const hasta360 = Math.round(valorTotal * porcentajesAntiguedad.hasta360);
        const mayor360 = Math.round(valorTotal * porcentajesAntiguedad.mayor360);

        // Total vencidos = suma de todas las bandas vencidas
        const totalVencidos = hasta30 + hasta60 + hasta90 + hasta180 + hasta360 + mayor360;

        // Total H = noVencido + totalVencidos
        let totalH = noVencido + totalVencidos;

        // Ajustar diferencia de redondeo en la columna hasta60 (mayor porcentaje)
        const diferencia = valorTotal - totalH;
        const hasta60Ajustado = hasta60 + diferencia;

        // Escribir valores de antigüedad
        this.writeCell(worksheet, `G${mapeo.fila32}`, noVencido);           // No vencidos
        this.writeCell(worksheet, `I${mapeo.fila32}`, hasta30);             // Hasta 30 días
        this.writeCell(worksheet, `K${mapeo.fila32}`, hasta60Ajustado);     // Hasta 60 días (con ajuste)
        this.writeCell(worksheet, `L${mapeo.fila32}`, hasta90);             // Hasta 90 días
        this.writeCell(worksheet, `M${mapeo.fila32}`, hasta180);            // Hasta 180 días
        this.writeCell(worksheet, `N${mapeo.fila32}`, hasta360);            // Hasta 360 días
        this.writeCell(worksheet, `O${mapeo.fila32}`, mayor360);            // Mayor 360 días
        this.writeCell(worksheet, `J${mapeo.fila32}`, totalVencidos + diferencia);  // Total vencidos
        this.writeCell(worksheet, `H${mapeo.fila32}`, valorTotal);          // Total bandas

        console.log(`[R414] Hoja32 fila ${mapeo.fila32} (${mapeo.nombre}): D=${valorCorriente}, F=${valorNoCorriente}, E=${valorTotal}`);
      }
    }

    console.log(`[R414] Hoja32 - Resumen:`);
    console.log(`[R414]   Total Pasivos Corrientes: ${totalCorrientes}`);
    console.log(`[R414]   Total Pasivos No Corrientes: ${totalNoCorrientes}`);
    console.log(`[R414]   Total General: ${totalGeneral}`);
    console.log('[R414] Hoja32 (FC05b - Pasivos por edades) completada.');
  }

  /**
   * Llena la Hoja30 (Formulario [900027] FC04 - Información Subsidios y Contribuciones).
   * 
   * Estructura Hoja30:
   * - Columnas: E=Acueducto, F=Alcantarillado, G=Aseo
   * - Filas 14-16: Subsidios por estrato (1, 2, 3)
   * - Fila 17: Total Subsidios (fórmula)
   * - Filas 19-22: Contribuciones (estrato 5, 6, comercial, industrial)
   * - Fila 23: Total Contribuciones (fórmula)
   * - Fila 24: Valor Neto (fórmula)
   * 
   * Los subsidios se distribuyen proporcionalmente entre estratos 1, 2 y 3
   * según el número de usuarios de cada estrato.
   */
  fillFC04Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja30 (FC04 - Subsidios y Contribuciones)...');

    const subsidios = options.subsidios;
    const usuariosEstrato = options.usuariosEstrato;

    if (!subsidios) {
      console.log('[R414] Hoja30 - No hay datos de subsidios, omitiendo...');
      return;
    }

    // Columnas por servicio
    const servicios = [
      { nombre: 'acueducto', columna: 'E' },
      { nombre: 'alcantarillado', columna: 'F' },
      { nombre: 'aseo', columna: 'G' },
    ];

    for (const servicio of servicios) {
      const subsidioTotal = subsidios[servicio.nombre as keyof typeof subsidios] || 0;
      
      if (subsidioTotal === 0) {
        console.log(`[R414] Hoja30 - ${servicio.nombre}: Sin subsidios asignados`);
        continue;
      }

      // Obtener usuarios de estratos 1, 2 y 3 para este servicio
      const usuariosServicio = usuariosEstrato?.[servicio.nombre as keyof typeof usuariosEstrato];
      
      const usuariosE1 = usuariosServicio?.estrato1 || 0;
      const usuariosE2 = usuariosServicio?.estrato2 || 0;
      const usuariosE3 = usuariosServicio?.estrato3 || 0;
      
      // Total de usuarios de estratos subsidiables (1, 2 y 3)
      const totalUsuariosSubsidiables = usuariosE1 + usuariosE2 + usuariosE3;

      console.log(`[R414] Hoja30 - ${servicio.nombre}:`);
      console.log(`  Subsidio total: ${subsidioTotal}`);
      console.log(`  Usuarios E1: ${usuariosE1}, E2: ${usuariosE2}, E3: ${usuariosE3}`);
      console.log(`  Total usuarios subsidiables: ${totalUsuariosSubsidiables}`);

      if (totalUsuariosSubsidiables === 0) {
        // Si no hay usuarios subsidiables, poner todo el subsidio en estrato 1 por defecto
        console.log(`  Sin usuarios subsidiables, asignando todo a E1`);
        this.writeCell(worksheet, `${servicio.columna}14`, subsidioTotal);
        this.writeCell(worksheet, `${servicio.columna}15`, 0);
        this.writeCell(worksheet, `${servicio.columna}16`, 0);
      } else {
        // Distribuir proporcionalmente según usuarios
        // Regla de 3 simple: subsidioEstrato = (usuariosEstrato / totalUsuarios) * subsidioTotal
        const subsidioE1 = Math.round((usuariosE1 / totalUsuariosSubsidiables) * subsidioTotal);
        const subsidioE2 = Math.round((usuariosE2 / totalUsuariosSubsidiables) * subsidioTotal);
        // E3 recibe el resto para evitar diferencias de redondeo
        const subsidioE3 = subsidioTotal - subsidioE1 - subsidioE2;

        console.log(`  Subsidio E1: ${subsidioE1} (${((usuariosE1 / totalUsuariosSubsidiables) * 100).toFixed(1)}%)`);
        console.log(`  Subsidio E2: ${subsidioE2} (${((usuariosE2 / totalUsuariosSubsidiables) * 100).toFixed(1)}%)`);
        console.log(`  Subsidio E3: ${subsidioE3} (${((usuariosE3 / totalUsuariosSubsidiables) * 100).toFixed(1)}%)`);

        // Escribir valores de subsidios
        // Fila 14: Estrato 1
        this.writeCell(worksheet, `${servicio.columna}14`, subsidioE1);
        // Fila 15: Estrato 2
        this.writeCell(worksheet, `${servicio.columna}15`, subsidioE2);
        // Fila 16: Estrato 3
        this.writeCell(worksheet, `${servicio.columna}16`, subsidioE3);
      }

      // Las filas 17, 23 y 24 tienen fórmulas que se calculan automáticamente

      // Contribuciones (filas 19-22) - se dejan en 0 por ahora
      // ya que no tenemos datos de contribuciones de estratos 5, 6, comercial e industrial
      this.writeCell(worksheet, `${servicio.columna}19`, 0);
      this.writeCell(worksheet, `${servicio.columna}20`, 0);
      this.writeCell(worksheet, `${servicio.columna}21`, 0);
      this.writeCell(worksheet, `${servicio.columna}22`, 0);
    }

    // =====================================================
    // Columna K: Suma de E + F + G (Total servicios públicos)
    // =====================================================
    // Filas de subsidios (14, 15, 16)
    for (const fila of [14, 15, 16]) {
      const valorE = (worksheet.getCell(`E${fila}`).value as number) || 0;
      const valorF = (worksheet.getCell(`F${fila}`).value as number) || 0;
      const valorG = (worksheet.getCell(`G${fila}`).value as number) || 0;
      const totalK = valorE + valorF + valorG;
      this.writeCell(worksheet, `K${fila}`, totalK);
    }

    // Filas de contribuciones (19, 20, 21, 22)
    for (const fila of [19, 20, 21, 22]) {
      const valorE = (worksheet.getCell(`E${fila}`).value as number) || 0;
      const valorF = (worksheet.getCell(`F${fila}`).value as number) || 0;
      const valorG = (worksheet.getCell(`G${fila}`).value as number) || 0;
      const totalK = valorE + valorF + valorG;
      this.writeCell(worksheet, `K${fila}`, totalK);
    }

    // Las filas 17, 23 y 24 de columna K tienen fórmulas que se calculan automáticamente

    console.log('[R414] Hoja30 (FC04 - Subsidios y Contribuciones) completada.');
  }

  /**
   * Llena la Hoja9 (Formulario [800500] Notas - Lista de Notas).
   * 
   * Contiene las notas explicativas a los estados financieros.
   * Celdas E11 a E67 con respuestas predefinidas para empresas de servicios públicos.
   */
  fillHoja9Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja9 (Notas - Lista de Notas)...');

    const companyName = options.companyName;
    const reportDate = options.reportDate;

    // Definir todas las notas con sus respuestas
    const notas: Array<{ celda: string; contenido: string }> = [
      // E11: Información a revelar sobre notas y otra información explicativa
      {
        celda: 'E11',
        contenido: `Las presentes notas forman parte integral de los estados financieros de ${companyName}. Contienen información adicional sobre las políticas contables aplicadas, los juicios y estimaciones realizados por la administración, así como explicaciones detalladas sobre las partidas significativas presentadas en el Estado de Situación Financiera y el Estado de Resultados. La empresa opera como prestador de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo bajo la regulación de la Ley 142 de 1994 y la supervisión de la Superintendencia de Servicios Públicos Domiciliarios.`
      },
      // E12: Información a revelar sobre juicios y estimaciones contables
      {
        celda: 'E12',
        contenido: `La preparación de los estados financieros requiere que la administración realice juicios, estimaciones y supuestos que afectan la aplicación de las políticas contables y los valores reportados. Las principales estimaciones incluyen: la vida útil de los activos de infraestructura de acueducto y alcantarillado (redes, plantas de tratamiento, tanques de almacenamiento), la provisión para cuentas de difícil cobro de usuarios de servicios públicos, las obligaciones por beneficios a empleados, y las provisiones para litigios y contingencias regulatorias. Estas estimaciones se revisan periódicamente y los ajustes se reconocen en el período en que se realiza la revisión.`
      },
      // E13: Información a revelar sobre remuneración de los auditores
      {
        celda: 'E13',
        contenido: `Los honorarios por servicios de auditoría externa corresponden a la revisión de los estados financieros anuales y la evaluación del sistema de control interno. No se han contratado servicios adicionales que puedan comprometer la independencia del auditor. Los honorarios se establecen mediante contrato y corresponden a tarifas de mercado para empresas de servicios públicos de similar tamaño y complejidad.`
      },
      // E14: Información a revelar sobre la autorización de los estados financieros
      {
        celda: 'E14',
        contenido: `Los estados financieros de ${companyName} correspondientes al periodo terminado el ${reportDate} fueron autorizados para su emisión por la Junta Directiva y el Representante Legal en reunión celebrada con posterioridad a la fecha de cierre. Los estados financieros se preparan de conformidad con las Normas de Información Financiera aplicables en Colombia (NCIF) y la Resolución 414 de 2014 de la Contaduría General de la Nación.`
      },
      // E15: Información a revelar sobre efectivo y equivalentes al efectivo
      {
        celda: 'E15',
        contenido: `El efectivo y equivalentes al efectivo comprende el dinero en caja, depósitos bancarios a la vista y otras inversiones de alta liquidez con vencimiento original de tres meses o menos. La empresa mantiene sus recursos principalmente en cuentas corrientes y de ahorro en entidades financieras vigiladas por la Superintendencia Financiera de Colombia. Los recursos se utilizan principalmente para cubrir los costos operativos del servicio, el mantenimiento de la infraestructura de acueducto y alcantarillado, y la gestión integral de residuos sólidos.`
      },
      // E16: Información a revelar sobre el estado de flujos de efectivo
      {
        celda: 'E16',
        contenido: `El estado de flujos de efectivo se prepara utilizando el método indirecto. Los flujos de efectivo de actividades de operación provienen principalmente del recaudo de tarifas por la prestación de los servicios de acueducto, alcantarillado y aseo a usuarios residenciales, comerciales e industriales. Las actividades de inversión incluyen la adquisición y mejora de infraestructura de captación, tratamiento, distribución y disposición final. Las actividades de financiación comprenden los préstamos obtenidos para expansión de cobertura y mejoramiento del servicio.`
      },
      // E17: Información a revelar sobre activos contingentes
      {
        celda: 'E17',
        contenido: `No Aplica`
      },
      // E18: Información a revelar sobre compromisos y pasivos contingentes
      {
        celda: 'E18',
        contenido: `La empresa tiene compromisos derivados de contratos de operación, mantenimiento y expansión de infraestructura. Existen pasivos contingentes relacionados con procesos judiciales y administrativos ante la Superintendencia de Servicios Públicos Domiciliarios, reclamaciones de usuarios por calidad del servicio, y posibles sanciones regulatorias. La administración evalúa periódicamente la probabilidad de ocurrencia y el impacto financiero de estas contingencias, reconociendo provisiones cuando es probable una salida de recursos.`
      },
      // E19: Información a revelar sobre gastos por depreciación y amortización
      {
        celda: 'E19',
        contenido: `Los activos de infraestructura de servicios públicos se deprecian utilizando el método de línea recta durante su vida útil estimada. Las principales vidas útiles son: plantas de tratamiento de agua (30-50 años), redes de distribución de acueducto y alcantarillado (30-50 años), equipos de bombeo (15-20 años), vehículos recolectores de residuos (8-10 años), edificaciones (50 años), y equipos de cómputo (5 años). Los activos intangibles con vida útil finita se amortizan durante el período del contrato o concesión.`
      },
      // E20: Información a revelar sobre instrumentos financieros derivados
      {
        celda: 'E20',
        contenido: `No Aplica`
      },
      // E21: Información a revelar sobre el efecto de las variaciones en las tasas de cambio
      {
        celda: 'E21',
        contenido: `No Aplica`
      },
      // E22: Información a revelar sobre beneficios a los empleados
      {
        celda: 'E22',
        contenido: `La empresa reconoce los beneficios a empleados de corto plazo (salarios, prestaciones sociales, vacaciones, primas) en el período en que se presta el servicio. Los beneficios post-empleo incluyen las contribuciones a fondos de pensiones y cesantías administrados por terceros. Se reconocen provisiones por beneficios de largo plazo cuando corresponde por convenciones colectivas o políticas de la empresa. El personal operativo incluye fontaneros, operadores de plantas, conductores y personal de aseo, quienes reciben capacitación continua en seguridad industrial y manejo de equipos especializados.`
      },
      // E23: Información a revelar sobre hechos ocurridos después del periodo
      {
        celda: 'E23',
        contenido: `Entre la fecha de cierre de los estados financieros y la fecha de autorización para su emisión, no se han presentado hechos significativos que requieran ajuste o revelación adicional. La empresa continúa sus operaciones normales de prestación de servicios públicos domiciliarios y no se han identificado eventos que afecten materialmente la situación financiera o los resultados del período reportado.`
      },
      // E24: Información a revelar sobre gastos
      {
        celda: 'E24',
        contenido: `Los gastos de la empresa se clasifican en: gastos operacionales (personal operativo, mantenimiento de infraestructura, insumos químicos para tratamiento de agua, combustibles para vehículos recolectores, disposición final de residuos), gastos administrativos (personal administrativo, servicios públicos de oficinas, honorarios profesionales), y otros gastos (provisiones, deterioro de cartera). Los gastos se reconocen cuando se incurren, independientemente del momento del pago.`
      },
      // E25: Información a revelar sobre ingresos (costos) financieros
      {
        celda: 'E25',
        contenido: `Los ingresos financieros provienen principalmente de rendimientos de inversiones temporales y cuentas de ahorro. Los costos financieros incluyen intereses por préstamos bancarios para financiación de infraestructura, comisiones bancarias, e intereses de mora pagados. La empresa también reconoce ingresos por financiación de usuarios cuando se otorgan facilidades de pago por deudas de servicios públicos.`
      },
      // E26: Información a revelar sobre instrumentos financieros
      {
        celda: 'E26',
        contenido: `Los instrumentos financieros de la empresa incluyen: efectivo y equivalentes, cuentas por cobrar a usuarios de servicios públicos (clasificadas por estrato socioeconómico y antigüedad), cuentas por pagar a proveedores de bienes y servicios, y obligaciones financieras con entidades bancarias. Las cuentas por cobrar se miden inicialmente al precio de la transacción y posteriormente al costo amortizado menos deterioro. Los pasivos financieros se miden al costo amortizado utilizando el método de la tasa de interés efectiva.`
      },
      // E27: Información a revelar sobre gestión del riesgo financiero
      {
        celda: 'E27',
        contenido: `La empresa gestiona los siguientes riesgos financieros: riesgo de crédito (asociado a la cartera de usuarios, mitigado mediante cortes de servicio y gestión de cobro), riesgo de liquidez (gestionado mediante presupuesto de caja y líneas de crédito disponibles), y riesgo de tasa de interés (para préstamos a tasa variable). No existe exposición significativa a riesgo cambiario. La Junta Directiva aprueba las políticas de gestión de riesgo y supervisa su cumplimiento.`
      },
      // E28: Información a revelar sobre la adopción por primera vez del marco normativo
      {
        celda: 'E28',
        contenido: `No Aplica`
      },
      // E29: Información a revelar sobre información general sobre los estados financieros
      {
        celda: 'E29',
        contenido: `${companyName} es una empresa de servicios públicos domiciliarios constituida conforme a las leyes colombianas, cuyo objeto social principal es la prestación de los servicios de acueducto, alcantarillado y/o aseo. Opera bajo el marco regulatorio de la Ley 142 de 1994 y sus decretos reglamentarios, y está sujeta a la vigilancia y control de la Superintendencia de Servicios Públicos Domiciliarios. Los estados financieros se preparan bajo el supuesto de negocio en marcha y cumplen con los requisitos de la Resolución 414 de 2014 de la Contaduría General de la Nación.`
      },
      // E30: Información a revelar sobre la plusvalía
      {
        celda: 'E30',
        contenido: `No Aplica`
      },
      // E31: Información a revelar sobre subvenciones del gobierno
      {
        celda: 'E31',
        contenido: `La empresa recibe subsidios del gobierno para cubrir la diferencia entre las tarifas plenas y las tarifas subsidiadas cobradas a usuarios de estratos 1, 2 y 3, de conformidad con la Ley 142 de 1994. Estos subsidios son transferidos por el municipio y se reconocen como ingresos en el período en que se presta el servicio subsidiado. Adicionalmente, la empresa puede recibir aportes para expansión de infraestructura que se reconocen como ingresos diferidos y se amortizan durante la vida útil de los activos financiados.`
      },
      // E32: Descripción de la naturaleza y cuantía de las subvenciones reconocidas
      {
        celda: 'E32',
        contenido: `Las subvenciones reconocidas corresponden a: subsidios para estratos 1, 2 y 3 por los servicios de acueducto, alcantarillado y aseo, calculados como la diferencia entre la tarifa de referencia y la tarifa subsidiada según los porcentajes establecidos por la normativa (hasta 70% para estrato 1, 40% para estrato 2 y 15% para estrato 3). El valor de los subsidios reconocidos en el período se detalla en las notas complementarias por servicio.`
      },
      // E33: Descripción de las condiciones cumplidas, por cumplir y otras contingencias
      {
        celda: 'E33',
        contenido: `Las condiciones para el reconocimiento de subsidios incluyen: estar debidamente registrado ante la SSPD, reportar información al Sistema Único de Información (SUI), aplicar correctamente las metodologías tarifarias de la CRA, mantener los estratos socioeconómicos actualizados, y cumplir con los indicadores de calidad del servicio. No existen contingencias significativas relacionadas con la devolución de subsidios recibidos.`
      },
      // E34: Periodos que cubre las subvención, así como los montos amortizados y por amortizar
      {
        celda: 'E34',
        contenido: `Los subsidios operativos se reconocen mensualmente en el período en que se presta el servicio, sin generar montos diferidos. Los aportes de capital recibidos para infraestructura se amortizan durante la vida útil de los activos financiados (generalmente entre 20 y 50 años dependiendo del tipo de infraestructura). El saldo por amortizar corresponde a aportes para redes, plantas y equipos que aún se encuentran en operación.`
      },
      // E35: Descripción de las subvenciones a las que no se les haya podido asignar un valor
      {
        celda: 'E35',
        contenido: `No Aplica`
      },
      // E36: Descripción de otro tipo de ayudas gubernamentales
      {
        celda: 'E36',
        contenido: `La empresa puede beneficiarse de exenciones tributarias aplicables a empresas de servicios públicos, así como de programas de financiación con tasas preferenciales a través de Findeter u otras entidades de fomento para proyectos de expansión de cobertura y mejoramiento de la calidad del servicio. También puede acceder a recursos del Sistema General de Participaciones y del Sistema General de Regalías para proyectos de agua potable y saneamiento básico.`
      },
      // E37: Información a revelar sobre deterioro de valor de activos
      {
        celda: 'E37',
        contenido: `La empresa evalúa al cierre de cada período si existe algún indicio de deterioro del valor de sus activos. Para los activos de infraestructura de servicios públicos, se considera deterioro cuando existen indicios de obsolescencia tecnológica, daño físico significativo, cambios adversos en el entorno regulatorio, o cuando los flujos de efectivo futuros esperados son menores al valor en libros. Durante el período no se identificaron indicios de deterioro significativo en los activos operativos.`
      },
      // E38: Información a revelar sobre impuestos a las ganancias
      {
        celda: 'E38',
        contenido: `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la base gravable del período aplicando las tarifas vigentes. El impuesto diferido surge de las diferencias temporarias entre el valor en libros de los activos y pasivos para propósitos financieros y su base fiscal, principalmente por diferencias en la depreciación de activos fijos y la provisión de cartera. La empresa aplica las tarifas de impuesto de renta establecidas para el régimen ordinario.`
      },
      // E39: Información a revelar sobre empleados
      {
        celda: 'E39',
        contenido: `La planta de personal de la empresa incluye personal administrativo, operativo y técnico necesario para la prestación de los servicios de acueducto, alcantarillado y aseo. El personal operativo comprende fontaneros, operadores de plantas de tratamiento, lectores de medidores, personal de mantenimiento de redes, conductores de vehículos recolectores y operarios de aseo. La empresa cumple con todas las obligaciones laborales y de seguridad social de conformidad con la legislación colombiana.`
      },
      // E40: Información a revelar sobre personal clave de la gerencia
      {
        celda: 'E40',
        contenido: `El personal clave de la gerencia incluye al Gerente General, los directores de área (Comercial, Técnica, Administrativa y Financiera) y los miembros de la Junta Directiva. La remuneración del personal clave comprende salarios, prestaciones sociales, bonificaciones por cumplimiento de metas, y contribuciones a seguridad social. No existen beneficios post-empleo especiales ni pagos basados en acciones para el personal directivo.`
      },
      // E41: Información a revelar sobre activos intangibles
      {
        celda: 'E41',
        contenido: `Los activos intangibles incluyen principalmente software de gestión comercial, facturación y control de pérdidas, así como derechos de uso sobre licencias y servidumbres necesarias para la operación de la infraestructura. Los intangibles se amortizan durante su vida útil estimada o el término del contrato de licencia. No existen activos intangibles de vida útil indefinida. Los costos de desarrollo de software se capitalizan cuando cumplen los criterios de reconocimiento.`
      },
      // E42: Información a revelar sobre gastos por intereses
      {
        celda: 'E42',
        contenido: `Los gastos por intereses corresponden principalmente a obligaciones financieras contraídas para la financiación de proyectos de infraestructura de acueducto, alcantarillado y aseo. Incluyen intereses de préstamos bancarios, créditos de fomento a través de Findeter, y otros pasivos financieros. Los intereses se reconocen utilizando el método de la tasa de interés efectiva durante el período del préstamo.`
      },
      // E43: Información a revelar sobre ingresos por intereses
      {
        celda: 'E43',
        contenido: `Los ingresos por intereses provienen de rendimientos financieros de inversiones temporales, cuentas de ahorro, e intereses de mora cobrados a usuarios por pagos tardíos de facturas de servicios públicos. Los intereses se reconocen utilizando el método de la tasa de interés efectiva. La política de la empresa establece el cobro de intereses de mora de acuerdo con las tasas máximas permitidas por la regulación.`
      },
      // E44: Información a revelar sobre inventarios
      {
        celda: 'E44',
        contenido: `Los inventarios comprenden principalmente materiales para mantenimiento de redes (tuberías, válvulas, accesorios, medidores), insumos químicos para tratamiento de agua (cloro, sulfato de aluminio, polímeros), repuestos para equipos de bombeo y plantas de tratamiento, y materiales de aseo. Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina utilizando el método de promedio ponderado.`
      },
      // E45: Información a revelar sobre propiedades de inversión
      {
        celda: 'E45',
        contenido: `No Aplica`
      },
      // E46: Información a revelar sobre inversiones contabilizadas utilizando el método de la participación
      {
        celda: 'E46',
        contenido: `No Aplica`
      },
      // E47: Información a revelar sobre inversiones distintas de las contabilizadas utilizando el método de la participación
      {
        celda: 'E47',
        contenido: `No Aplica`
      },
      // E48: Información a revelar sobre arrendamientos
      {
        celda: 'E48',
        contenido: `La empresa puede tener contratos de arrendamiento operativo para vehículos, equipos de cómputo y oficinas administrativas. Los arrendamientos de corto plazo y de activos de bajo valor se reconocen como gasto de forma lineal durante el término del contrato. Para arrendamientos significativos, se reconoce un activo por derecho de uso y un pasivo por arrendamiento. No existen arrendamientos financieros significativos sobre activos de infraestructura.`
      },
      // E49: Información a revelar sobre préstamos y anticipos a bancos
      {
        celda: 'E49',
        contenido: `No Aplica`
      },
      // E50: Información a revelar sobre préstamos y anticipos a clientes
      {
        celda: 'E50',
        contenido: `No Aplica`
      },
      // E51: Información a revelar sobre objetivos, políticas y procesos para la gestión del capital
      {
        celda: 'E51',
        contenido: `El objetivo de la gestión del capital es mantener una estructura financiera sólida que permita la sostenibilidad del servicio público y la expansión de cobertura. La política de la empresa busca mantener un nivel de endeudamiento prudente, reinvertir las utilidades en mejoramiento de infraestructura, y asegurar la capacidad de pago de obligaciones. La Junta Directiva revisa periódicamente los indicadores de capital de trabajo, endeudamiento y rentabilidad.`
      },
      // E52: Información a revelar sobre otros activos corrientes
      {
        celda: 'E52',
        contenido: `Los otros activos corrientes incluyen anticipos a contratistas y proveedores, gastos pagados por anticipado (seguros, arrendamientos), anticipos de impuestos y retenciones a favor, y otros derechos de cobro de corto plazo. Estos activos se miden al costo o al valor recuperable si existe evidencia de deterioro.`
      },
      // E53: Información a revelar sobre otros pasivos corrientes
      {
        celda: 'E53',
        contenido: `Los otros pasivos corrientes incluyen ingresos recibidos por anticipado (conexiones facturadas no instaladas, depósitos de usuarios), retenciones y aportes por pagar (retención en la fuente, IVA, aportes a seguridad social), provisiones de corto plazo, y otros acreedores diversos. Se reconocen al valor de la obligación estimada.`
      },
      // E54: Información a revelar sobre otros activos no corrientes
      {
        celda: 'E54',
        contenido: `Los otros activos no corrientes incluyen depósitos en garantía, cuentas por cobrar de largo plazo con acuerdos de pago, activos por impuesto diferido, y otros derechos cuya realización se espera después de doce meses. Se miden al costo amortizado o al valor presente cuando el efecto del valor temporal del dinero es significativo.`
      },
      // E55: Información a revelar sobre otros pasivos no corrientes
      {
        celda: 'E55',
        contenido: `Los otros pasivos no corrientes incluyen ingresos diferidos por aportes de capital para infraestructura, provisiones de largo plazo (beneficios a empleados, litigios), pasivos por impuesto diferido, y otras obligaciones cuyo vencimiento es superior a doce meses. Se miden al valor presente de los flujos de efectivo futuros cuando corresponde.`
      },
      // E56: Información a revelar sobre otros ingresos (gastos) de operación
      {
        celda: 'E56',
        contenido: `Los otros ingresos de operación incluyen reconexiones, venta de materiales, arrendamiento de infraestructura, servicios complementarios, y recuperación de cartera castigada. Los otros gastos de operación comprenden provisiones para contingencias, pérdidas por deterioro de cartera, gastos legales, y otros gastos no clasificados en las categorías principales. Se reconocen cuando se incurren.`
      },
      // E57: Información a revelar sobre anticipos y otros activos
      {
        celda: 'E57',
        contenido: `Los anticipos comprenden pagos realizados a contratistas por obras de infraestructura en ejecución, anticipos a proveedores de insumos y materiales, y pagos por cuenta de terceros. Se reconocen como activo hasta que se reciben los bienes o servicios correspondientes, momento en el cual se reclasifican al costo del activo o al gasto según corresponda.`
      },
      // E58: Información a revelar sobre ganancias (pérdidas) por actividades de operación
      {
        celda: 'E58',
        contenido: `El resultado de actividades de operación refleja la diferencia entre los ingresos por prestación de servicios públicos (incluyendo subsidios y contribuciones) y los costos y gastos necesarios para la operación. Los principales factores que afectan el resultado operacional incluyen: nivel de recaudo de cartera, eficiencia operativa, costos de energía para bombeo, costos de disposición final de residuos, y mantenimiento de infraestructura.`
      },
      // E59: Información a revelar sobre propiedades, planta y equipo
      {
        celda: 'E59',
        contenido: `Las propiedades, planta y equipo comprenden los activos de infraestructura para la prestación de servicios públicos: plantas de tratamiento de agua potable y residual, redes de acueducto y alcantarillado, estaciones de bombeo, tanques de almacenamiento, vehículos recolectores, equipos para disposición final de residuos, terrenos, edificaciones y equipos administrativos. Se miden al costo menos depreciación acumulada y deterioro. Las adiciones y mejoras que incrementan la vida útil o capacidad se capitalizan.`
      },
      // E60: Información a revelar sobre provisiones
      {
        celda: 'E60',
        contenido: `Las provisiones incluyen obligaciones presentes por litigios laborales y civiles, reclamaciones de usuarios, posibles sanciones regulatorias, obligaciones ambientales, y beneficios a empleados de largo plazo. Se reconoce una provisión cuando existe una obligación presente, es probable la salida de recursos, y el monto puede estimarse de forma fiable. Las provisiones se revisan al cierre de cada período y se ajustan según la mejor estimación disponible.`
      },
      // E61: Información a revelar sobre gastos de investigación y desarrollo
      {
        celda: 'E61',
        contenido: `No Aplica`
      },
      // E62: Información a revelar sobre reservas dentro de patrimonio
      {
        celda: 'E62',
        contenido: `Las reservas del patrimonio incluyen la reserva legal (constituida con el 10% de las utilidades hasta alcanzar el 50% del capital), reservas estatutarias según los estatutos sociales, y otras reservas aprobadas por la Asamblea de Accionistas. Las reservas se utilizan para absorber pérdidas, capitalizar la empresa, o distribuir como dividendos según decisión del máximo órgano social.`
      },
      // E63: Información a revelar sobre efectivo y equivalentes al efectivo restringidos
      {
        celda: 'E63',
        contenido: `No Aplica`
      },
      // E64: Información a revelar sobre ingresos de actividades ordinarias
      {
        celda: 'E64',
        contenido: `Los ingresos ordinarios provienen de la facturación por prestación de servicios de acueducto (cargo fijo y consumo), alcantarillado (cargo fijo y vertimiento), y aseo (cargo fijo, recolección y disposición final). Los ingresos se reconocen cuando el servicio se presta, medido según el consumo de agua o la frecuencia de recolección. También se incluyen las contribuciones de solidaridad de estratos 5 y 6, los subsidios recibidos del gobierno, y los cargos por conexión y reconexión de servicios.`
      },
      // E65: Información a revelar sobre cuentas por cobrar y por pagar por impuestos
      {
        celda: 'E65',
        contenido: `Las cuentas por cobrar por impuestos incluyen saldos a favor de retención en la fuente, IVA descontable, y anticipos de impuesto de renta. Las cuentas por pagar por impuestos incluyen impuesto de renta corriente, impuesto diferido, IVA por pagar, retenciones practicadas, impuesto de industria y comercio, y contribuciones a la SSPD y CRA. Se reconocen según las disposiciones tributarias vigentes.`
      },
      // E66: Información a revelar sobre acreedores comerciales y otras cuentas por pagar
      {
        celda: 'E66',
        contenido: `Los acreedores comerciales corresponden a obligaciones con proveedores de insumos químicos, materiales de construcción, repuestos, combustibles, y contratistas de obras y servicios. Las otras cuentas por pagar incluyen honorarios profesionales, servicios públicos, arrendamientos, y otros gastos acumulados por pagar. Se miden al valor nominal o al costo amortizado cuando el plazo de pago genera un componente financiero significativo.`
      },
      // E67: Información a revelar sobre deudores comerciales y otras cuentas por cobrar
      {
        celda: 'E67',
        contenido: `Los deudores comerciales corresponden a la cartera por facturación de servicios públicos a usuarios residenciales (estratos 1 a 6), comerciales, industriales y oficiales. Se clasifican por servicio, estrato y antigüedad de la deuda. Se reconoce deterioro para cuentas de difícil cobro con base en la antigüedad y el análisis histórico de recuperación. Las otras cuentas por cobrar incluyen anticipos de subsidios, deudores varios, y cuentas por cobrar a empleados.`
      },
    ];

    // Escribir todas las notas en el worksheet
    for (const nota of notas) {
      this.writeCell(worksheet, nota.celda, nota.contenido);
    }

    console.log(`[R414] Hoja9 completada - ${notas.length} notas escritas (E11 a E67).`);
  }

  /**
   * Llena la Hoja10 (Formulario [800600] Notas - Lista de Políticas).
   * 
   * Contiene las políticas contables significativas.
   * Celdas D11 a D43 con respuestas predefinidas para empresas de servicios públicos.
   */
  fillHoja10Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja10 (Notas - Lista de Políticas)...');

    const companyName = options.companyName;

    // Definir todas las políticas contables con sus respuestas
    const politicas: Array<{ celda: string; contenido: string }> = [
      // D11: Información a revelar sobre un resumen de las políticas contables significativas
      {
        celda: 'D11',
        contenido: `${companyName} prepara sus estados financieros de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la Contaduría General de la Nación. Las políticas contables significativas se aplican de manera uniforme para todos los períodos presentados. Los estados financieros se preparan sobre la base del costo histórico, excepto por ciertos instrumentos financieros que se miden a valor razonable. La empresa opera como prestador de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo bajo la regulación de la Ley 142 de 1994.`
      },
      // D12: Descripción de la política contable de activos financieros disponibles para la venta
      {
        celda: 'D12',
        contenido: `No Aplica`
      },
      // D13: Descripción de la política contable para costos de financiación
      {
        celda: 'D13',
        contenido: `Los costos de financiación directamente atribuibles a la adquisición, construcción o producción de activos de infraestructura de servicios públicos que requieren un período sustancial para estar listos para su uso, se capitalizan como parte del costo del activo. Los demás costos de financiación se reconocen como gasto en el período en que se incurren. Los costos de financiación incluyen intereses calculados utilizando el método de la tasa de interés efectiva, cargas financieras por arrendamientos, y diferencias en cambio originadas en préstamos en moneda extranjera en la medida en que se consideren un ajuste a los costos por intereses.`
      },
      // D14: Descripción de la política contable para préstamos por pagar
      {
        celda: 'D14',
        contenido: `Los préstamos por pagar se reconocen inicialmente al valor razonable del efectivo recibido menos los costos de transacción directamente atribuibles. Posteriormente se miden al costo amortizado utilizando el método de la tasa de interés efectiva. La empresa obtiene préstamos principalmente de entidades financieras para financiar proyectos de expansión y mejoramiento de la infraestructura de acueducto, alcantarillado y aseo, incluyendo créditos de fomento a través de Findeter para proyectos de agua potable y saneamiento básico.`
      },
      // D15: Descripción de la política contable para instrumentos financieros derivados
      {
        celda: 'D15',
        contenido: `No Aplica`
      },
      // D16: Descripción de la política contable para beneficios a los empleados
      {
        celda: 'D16',
        contenido: `Los beneficios a empleados de corto plazo (salarios, prestaciones sociales legales, vacaciones, bonificaciones) se reconocen como gasto y pasivo cuando el empleado ha prestado el servicio. Los beneficios post-empleo incluyen contribuciones definidas a fondos de pensiones y cesantías administrados por terceros, reconocidas como gasto cuando se incurren. Los beneficios de largo plazo (quinquenios, primas de antigüedad) se reconocen como provisión cuando existe una obligación legal o implícita. Las indemnizaciones por terminación se reconocen cuando la empresa está comprometida a terminar el empleo.`
      },
      // D17: Descripción de la política contable para gastos
      {
        celda: 'D17',
        contenido: `Los gastos se reconocen cuando se incurren, independientemente del momento del pago, siguiendo el principio de devengo. Los gastos operacionales incluyen los costos necesarios para la prestación de servicios de acueducto, alcantarillado y aseo: personal operativo, mantenimiento de infraestructura, insumos químicos, energía eléctrica para bombeo, combustibles, y disposición final de residuos. Los gastos administrativos incluyen personal administrativo, honorarios profesionales, y gastos generales de oficina. Los gastos se clasifican por naturaleza en el estado de resultados.`
      },
      // D18: Descripción de la política contable para conversión de moneda extranjera
      {
        celda: 'D18',
        contenido: `No Aplica`
      },
      // D19: Descripción de la política contable para la moneda funcional
      {
        celda: 'D19',
        contenido: `La moneda funcional y de presentación de la empresa es el peso colombiano (COP), que es la moneda del entorno económico principal en el que opera. Todas las transacciones se registran en pesos colombianos. La empresa no mantiene operaciones significativas en moneda extranjera dado que sus actividades de servicios públicos domiciliarios se desarrollan exclusivamente en el territorio colombiano.`
      },
      // D20: Descripción de la política contable para la plusvalía
      {
        celda: 'D20',
        contenido: `No Aplica`
      },
      // D21: Descripción de las políticas contables para subvenciones gubernamentales
      {
        celda: 'D21',
        contenido: `Las subvenciones gubernamentales se reconocen cuando existe seguridad razonable de que se cumplirán las condiciones asociadas y que la subvención será recibida. Los subsidios operativos para cubrir la diferencia entre tarifas plenas y subsidiadas de estratos 1, 2 y 3 se reconocen como ingreso en el período en que se presta el servicio subsidiado. Los aportes de capital para infraestructura se reconocen inicialmente como ingreso diferido y se amortizan sistemáticamente durante la vida útil del activo financiado. Las contribuciones de solidaridad de estratos 5 y 6 se reconocen como ingreso cuando se facturan.`
      },
      // D22: Descripción de la política contable para deterioro del valor de activos
      {
        celda: 'D22',
        contenido: `Al cierre de cada período se evalúa si existe algún indicio de deterioro del valor de los activos. Si existe tal indicio, se estima el valor recuperable del activo (mayor entre valor razonable menos costos de venta y valor en uso). Si el valor en libros excede el valor recuperable, se reconoce una pérdida por deterioro. Para activos de infraestructura de servicios públicos, los indicios de deterioro incluyen obsolescencia tecnológica, daño físico, cambios regulatorios adversos, o reducción significativa en la demanda del servicio. Las pérdidas por deterioro se reversan si las circunstancias que las originaron dejan de existir.`
      },
      // D23: Descripción de la política contable para impuestos a las ganancias
      {
        celda: 'D23',
        contenido: `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la renta líquida gravable del período aplicando las tarifas vigentes. El impuesto diferido se reconoce sobre las diferencias temporarias entre el valor en libros de los activos y pasivos y su base fiscal, utilizando las tarifas que se espera aplicar cuando las diferencias se reviertan. Las principales diferencias temporarias surgen por depreciación de activos fijos, provisión de cartera, y beneficios a empleados. Los activos por impuesto diferido se reconocen solo cuando es probable su recuperación.`
      },
      // D24: Descripción de la política contable para activos intangibles
      {
        celda: 'D24',
        contenido: `Los activos intangibles adquiridos separadamente se miden inicialmente al costo. Los intangibles generados internamente (excepto costos de desarrollo capitalizados) se reconocen como gasto cuando se incurren. Los activos intangibles con vida útil finita se amortizan durante su vida útil estimada y se evalúan para deterioro cuando hay indicios. Los principales intangibles incluyen software de gestión comercial y facturación, licencias de uso, derechos de servidumbre, y costos de desarrollo de sistemas de información. La amortización se calcula por el método de línea recta durante el menor entre la vida útil estimada y el término del contrato.`
      },
      // D25: Descripción de las políticas contables para inversiones en asociadas
      {
        celda: 'D25',
        contenido: `No Aplica`
      },
      // D26: Descripción de la política contable para inversiones en negocios conjuntos
      {
        celda: 'D26',
        contenido: `No Aplica`
      },
      // D27: Descripción de la política contable para propiedades de inversión
      {
        celda: 'D27',
        contenido: `No Aplica`
      },
      // D28: Descripción de la política contable para el capital emitido
      {
        celda: 'D28',
        contenido: `El capital social se reconoce al valor nominal de las acciones o cuotas emitidas. Las primas en colocación de acciones se reconocen en el patrimonio como prima de emisión. Los costos directamente atribuibles a la emisión de instrumentos de patrimonio se reconocen como deducción del patrimonio. La distribución de dividendos se reconoce como pasivo cuando es aprobada por el máximo órgano social. Las reservas legales y estatutarias se constituyen según los requisitos legales y los estatutos de la empresa.`
      },
      // D29: Descripción de la política contable para arrendamientos
      {
        celda: 'D29',
        contenido: `La empresa evalúa al inicio del contrato si este contiene un arrendamiento. Para arrendamientos en los que la empresa es arrendataria, se reconoce un activo por derecho de uso y un pasivo por arrendamiento, excepto para arrendamientos de corto plazo (12 meses o menos) y de activos de bajo valor, que se reconocen como gasto de forma lineal. El activo por derecho de uso se deprecia durante el menor entre la vida útil del activo y el plazo del arrendamiento. Los principales arrendamientos incluyen vehículos, equipos de cómputo, y oficinas administrativas.`
      },
      // D30: Descripción de la política contable para préstamos y cuentas por cobrar
      {
        celda: 'D30',
        contenido: `Las cuentas por cobrar comerciales (cartera de usuarios de servicios públicos) se reconocen inicialmente al precio de transacción y posteriormente al costo amortizado menos deterioro. El deterioro se determina utilizando el modelo de pérdidas crediticias esperadas, basado en la experiencia histórica de recaudo, la antigüedad de la cartera, y las condiciones económicas actuales y proyectadas. La cartera se clasifica por servicio (acueducto, alcantarillado, aseo), por tipo de usuario (residencial por estratos, comercial, industrial, oficial), y por antigüedad. Se castigan las cuentas incobrables después de agotar la gestión de cobro.`
      },
      // D31: Descripción de las políticas contables para la medición de inventarios
      {
        celda: 'D31',
        contenido: `Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina utilizando el método de promedio ponderado e incluye los costos de adquisición y otros costos incurridos para darles su condición y ubicación actuales. Los inventarios incluyen materiales para mantenimiento de redes (tuberías, válvulas, accesorios, medidores), insumos químicos para tratamiento de agua, repuestos de equipos, y materiales de aseo. Se reconoce deterioro cuando el valor neto realizable es inferior al costo o cuando los inventarios están dañados, obsoletos o de lento movimiento.`
      },
      // D32: Descripción de la política contable para activos de petróleo y gas
      {
        celda: 'D32',
        contenido: `No Aplica`
      },
      // D33: Descripción de la política contable para propiedades, planta y equipo
      {
        celda: 'D33',
        contenido: `Las propiedades, planta y equipo se reconocen inicialmente al costo, que incluye el precio de adquisición, aranceles, impuestos no recuperables, y costos directamente atribuibles para poner el activo en condiciones de uso. Posteriormente se miden al costo menos depreciación acumulada y deterioro. La depreciación se calcula por el método de línea recta durante la vida útil estimada: plantas de tratamiento (30-50 años), redes de acueducto y alcantarillado (30-50 años), equipos de bombeo (15-20 años), vehículos recolectores (8-10 años), edificaciones (50 años), muebles y equipos de oficina (10 años), equipos de cómputo (5 años). Los costos de mantenimiento se reconocen como gasto; las mejoras que incrementan vida útil o capacidad se capitalizan.`
      },
      // D34: Descripción de la política contable para provisiones
      {
        celda: 'D34',
        contenido: `Se reconoce una provisión cuando la empresa tiene una obligación presente (legal o implícita) como resultado de un evento pasado, es probable que se requiera una salida de recursos para liquidar la obligación, y el monto puede estimarse de manera fiable. Las provisiones se miden por la mejor estimación del desembolso requerido para cancelar la obligación a la fecha del balance. Incluyen provisiones por litigios laborales y civiles, reclamaciones de usuarios, sanciones regulatorias, obligaciones ambientales, garantías, y beneficios a empleados de largo plazo. Las provisiones se revisan cada período y se ajustan para reflejar la mejor estimación actual.`
      },
      // D35: Descripción de las políticas contables para el reconocimiento de ingresos de actividades ordinarias
      {
        celda: 'D35',
        contenido: `Los ingresos se reconocen cuando se transfiere el control del servicio al cliente. Para servicios de acueducto, alcantarillado y aseo, los ingresos se reconocen en el período en que se presta el servicio: el consumo de agua medido (o estimado para usuarios sin medidor), el vertimiento de aguas residuales, y la recolección de residuos sólidos. Los ingresos incluyen cargo fijo y cargo por consumo/uso según las tarifas aprobadas por la CRA. Las contribuciones de solidaridad de estratos 5 y 6 se reconocen cuando se facturan. Los subsidios se reconocen cuando se presta el servicio subsidiado. Los cargos por conexión y reconexión se reconocen cuando se realiza el servicio.`
      },
      // D36: Descripción de la política contable para gastos de investigación y desarrollo
      {
        celda: 'D36',
        contenido: `No Aplica`
      },
      // D37: Descripción de la política contable para el efectivo y equivalentes al efectivo restringido
      {
        celda: 'D37',
        contenido: `No Aplica`
      },
      // D38: Descripción de la política contable para acreedores comerciales y otras cuentas por pagar
      {
        celda: 'D38',
        contenido: `Los acreedores comerciales y otras cuentas por pagar se reconocen inicialmente al valor razonable y posteriormente al costo amortizado utilizando el método de la tasa de interés efectiva. Cuando el plazo de pago es corto y no existe un componente financiero significativo, se miden al valor nominal. Incluyen obligaciones con proveedores de insumos químicos, materiales, repuestos, contratistas de obras y servicios, honorarios profesionales, y otros acreedores. Se dan de baja cuando la obligación se liquida, cancela o expira.`
      },
      // D39: Descripción de la política contable para transacciones con partes relacionadas
      {
        celda: 'D39',
        contenido: `Las transacciones con partes relacionadas (accionistas, administradores, empresas vinculadas, personal clave de la gerencia) se realizan en condiciones equivalentes a las que existen para transacciones entre partes independientes. Se revelan la naturaleza de la relación, el tipo de transacciones, los montos involucrados, y los saldos pendientes al cierre. Las partes relacionadas incluyen los accionistas con influencia significativa, los miembros de la Junta Directiva, el Gerente General, los directores de área, y las empresas del mismo grupo empresarial si aplica.`
      },
      // D40: Descripción de otras políticas contables relevantes para comprender los estados financieros
      {
        celda: 'D40',
        contenido: `Otras políticas contables relevantes incluyen: (a) Hechos posteriores: se ajustan los estados financieros por eventos que proporcionan evidencia de condiciones existentes al cierre; los eventos que no requieren ajuste se revelan. (b) Negocio en marcha: los estados financieros se preparan bajo el supuesto de que la empresa continuará operando indefinidamente. (c) Materialidad: las partidas se consideran materiales cuando su omisión o error puede influir en las decisiones económicas de los usuarios. (d) Compensación: los activos y pasivos, e ingresos y gastos, no se compensan excepto cuando lo requiere o permite una norma.`
      },
      // D41: Descripción de la política contable de inversiones de administración de liquidez
      {
        celda: 'D41',
        contenido: `Las inversiones de administración de liquidez comprenden instrumentos financieros de alta liquidez y bajo riesgo que se mantienen para cubrir necesidades de efectivo de corto plazo. Incluyen depósitos a término fijo, certificados de depósito, y otros instrumentos de renta fija con vencimiento original menor a un año. Se miden al costo amortizado cuando se mantienen para cobrar flujos contractuales de principal e intereses. Los rendimientos se reconocen como ingreso financiero utilizando el método de la tasa de interés efectiva durante el período de la inversión.`
      },
      // D42: Descripción de la política contable para préstamos por cobrar
      {
        celda: 'D42',
        contenido: `No Aplica`
      },
      // D43: Descripción de la política contable para el reconocimiento de ingresos por contratos de construcción
      {
        celda: 'D43',
        contenido: `No Aplica`
      },
    ];

    // Escribir todas las políticas en el worksheet
    for (const politica of politicas) {
      this.writeCell(worksheet, politica.celda, politica.contenido);
    }

    console.log(`[R414] Hoja10 completada - ${politicas.length} políticas escritas (D11 a D43).`);
  }

  // ============================================
  // HOJA35: FC08 - Conciliación de Ingresos [900031]
  // ============================================

  /**
   * Llena la Hoja35 [900031] FC08 - Conciliación de ingresos.
   * 
   * Esta hoja desglosa los ingresos de actividades ordinarias del Estado de Resultados
   * por tipo de ingreso para cada servicio (Acueducto, Alcantarillado, Aseo).
   * 
   * Estructura de columnas:
   * - G: Acueducto
   * - H: Alcantarillado
   * - I: Aseo
   * - J: Energía Eléctrica
   * - K: Gas combustible por redes
   * 
   * Para empresas de acueducto, alcantarillado y aseo, el ingreso principal proviene
   * de la prestación de servicios públicos domiciliarios (fila 26), que corresponde
   * a los "Ingresos de actividades ordinarias" del Estado de Resultados.
   * 
   * @param worksheet Hoja35 del workbook
   * @param sheet3 Hoja3 (Estado de Resultados) para obtener los valores de ingresos
   */
  protected fillFC08Sheet(
    worksheet: ExcelJS.Worksheet,
    sheet3: ExcelJS.Worksheet
  ): void {
    console.log('[R414] Llenando Hoja35 [900031] FC08 - Conciliación de ingresos...');

    // Mapeo de columnas Hoja3 (ER) → Hoja35 (FC08)
    // En Hoja3: E=Acueducto, F=Alcantarillado, G=Aseo
    // En Hoja35: G=Acueducto, H=Alcantarillado, I=Aseo
    const servicios = [
      { nombre: 'Acueducto', columnaER: 'E', columnaFC08: 'G' },
      { nombre: 'Alcantarillado', columnaER: 'F', columnaFC08: 'H' },
      { nombre: 'Aseo', columnaER: 'G', columnaFC08: 'I' },
    ];

    // Fila 14 en Hoja3 = "Ingresos de actividades ordinarias"
    // Esta fila se mapea a la fila 26 en Hoja35 = "Ingresos por prestación de servicios públicos domiciliarios"
    const filaIngresosER = 14;
    const filaIngresosFC08 = 26;

    for (const servicio of servicios) {
      // Obtener el valor de ingresos del Estado de Resultados
      const celdaER = `${servicio.columnaER}${filaIngresosER}`;
      const valorIngresos = (sheet3.getCell(celdaER).value as number) || 0;

      if (valorIngresos !== 0) {
        // Escribir en la celda de "Ingresos por prestación de servicios públicos domiciliarios"
        const celdaFC08 = `${servicio.columnaFC08}${filaIngresosFC08}`;
        this.writeCell(worksheet, celdaFC08, valorIngresos);
        console.log(`  ${servicio.nombre}: ${valorIngresos.toLocaleString('es-CO')} -> ${celdaFC08}`);
      }
    }

    console.log('[R414] Hoja35 FC08 completada.');
  }

  /**
   * Override del método fillExcelData para incluir Hoja7 y otras hojas específicas.
   */
  override fillExcelData(
    workbook: unknown,
    options: TemplateWithDataOptions
  ): void {
    // Llamar al método base que llena Hoja1, Hoja2 y Hoja3
    super.fillExcelData(workbook, options);

    const wb = workbook as ExcelJS.Workbook;

    // Llenar Hoja7 (Notas - Subclasificaciones)
    const sheet7 = wb.getWorksheet('Hoja7');
    if (sheet7) {
      this.fillHoja7Sheet(sheet7, options.accounts);
    }

    // =====================================================
    // HOJA9: Notas - Lista de Notas [800500]
    // =====================================================
    const sheet9 = wb.getWorksheet('Hoja9');
    if (sheet9) {
      this.fillHoja9Sheet(sheet9, options);
    }

    // =====================================================
    // HOJA10: Notas - Lista de Políticas [800600]
    // =====================================================
    const sheet10 = wb.getWorksheet('Hoja10');
    if (sheet10) {
      this.fillHoja10Sheet(sheet10, options);
    }

    // =====================================================
    // HOJAS FC01: Gastos por servicio (Hoja16, 17, 18, 22)
    // =====================================================
    // Agrupar cuentas por servicio
    const accountsByService: Record<string, ServiceBalanceData[]> = {};
    for (const account of options.serviceBalances) {
      if (!accountsByService[account.service]) {
        accountsByService[account.service] = [];
      }
      accountsByService[account.service].push(account);
    }

    // Hoja16 (900017a): Gastos Acueducto
    const sheet16 = wb.getWorksheet('Hoja16');
    if (sheet16) {
      const acueductoAccounts = accountsByService['acueducto'] || [];
      this.fillFC01Sheet(sheet16, acueductoAccounts);
    }

    // Hoja17 (900017b): Gastos Alcantarillado
    const sheet17 = wb.getWorksheet('Hoja17');
    if (sheet17) {
      const alcantarilladoAccounts = accountsByService['alcantarillado'] || [];
      this.fillFC01Sheet(sheet17, alcantarilladoAccounts);
    }

    // Hoja18 (900017c): Gastos Aseo
    const sheet18 = wb.getWorksheet('Hoja18');
    if (sheet18) {
      const aseoAccounts = accountsByService['aseo'] || [];
      this.fillFC01Sheet(sheet18, aseoAccounts);
    }

    // Hoja22 (900017g): Total Servicios Públicos
    const sheet22 = wb.getWorksheet('Hoja22');
    if (sheet22 && sheet16 && sheet17 && sheet18) {
      this.fillFC01TotalSheet(sheet22, sheet16, sheet17, sheet18);
    }

    // =====================================================
    // HOJA FC02: Complementario de Ingresos (Hoja23)
    // =====================================================
    const sheet23 = wb.getWorksheet('Hoja23');
    const sheet3 = wb.getWorksheet('Hoja3');
    if (sheet23 && sheet3) {
      this.fillFC02Sheet(sheet23, sheet3);
    }

    // =====================================================
    // HOJAS FC03: CXC por estrato (Hoja24, 25, 26)
    // =====================================================
    const sheet2 = wb.getWorksheet('Hoja2');

    // Hoja24 (900021): FC03-1 CXC Acueducto
    const sheet24 = wb.getWorksheet('Hoja24');
    if (sheet24 && sheet2) {
      this.fillFC03Sheet(
        sheet24,
        sheet2,
        'I', // Columna de acueducto en Hoja2
        options.usuariosEstrato?.acueducto
      );
    }

    // Hoja25 (900022): FC03-2 CXC Alcantarillado
    const sheet25 = wb.getWorksheet('Hoja25');
    if (sheet25 && sheet2) {
      this.fillFC03Sheet(
        sheet25,
        sheet2,
        'J', // Columna de alcantarillado en Hoja2
        options.usuariosEstrato?.alcantarillado
      );
    }

    // Hoja26 (900023): FC03-3 CXC Aseo
    // NOTA: Hoja26 tiene estructura diferente (E/F/G, filas 15-24, rangos H-P, suma Q)
    const sheet26 = wb.getWorksheet('Hoja26');
    if (sheet26 && sheet2) {
      this.fillFC03AseoSheet(
        sheet26,
        sheet2,
        options.usuariosEstrato?.aseo
      );
    }

    // =====================================================
    // HOJA FC05b: Pasivos por edades (Hoja32)
    // =====================================================
    const sheet32 = wb.getWorksheet('Hoja32');
    if (sheet32 && sheet2) {
      this.fillFC05bSheet(sheet32, sheet2);
    }

    // =====================================================
    // HOJA FC04: Subsidios y Contribuciones (Hoja30)
    // =====================================================
    const sheet30 = wb.getWorksheet('Hoja30');
    if (sheet30) {
      this.fillFC04Sheet(sheet30, options);
    }

    // =====================================================
    // HOJA FC08: Conciliación de Ingresos (Hoja35)
    // =====================================================
    const sheet35 = wb.getWorksheet('Hoja35');
    if (sheet35 && sheet3) {
      this.fillFC08Sheet(sheet35, sheet3);
    }
  }
}

// Exportar instancia por defecto
export const r414TemplateService = new R414TemplateService();

// Exportar también la clase para testing
export default R414TemplateService;
