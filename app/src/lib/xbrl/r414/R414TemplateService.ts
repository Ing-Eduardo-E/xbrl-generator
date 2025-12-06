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
   * Llena la Hoja32 (FC05b - Pasivos por edades de vencimiento).
   */
  fillFC05bSheet(
    worksheet: ExcelJS.Worksheet,
    sheet2: ExcelJS.Worksheet
  ): void {
    // Obtener valores de pasivos de Hoja2
    const columns = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

    // Filas de pasivos en Hoja2 a distribuir
    const pasivosRows = [73, 74, 75, 76, 78, 79, 80, 82, 83, 86, 87];

    // Distribución por rango de vencimiento (porcentajes por defecto)
    const rangos = [
      { columna: 'D', porcentaje: 0.4 }, // 0-30 días
      { columna: 'E', porcentaje: 0.25 }, // 31-60 días
      { columna: 'F', porcentaje: 0.15 }, // 61-90 días
      { columna: 'G', porcentaje: 0.1 }, // 91-180 días
      { columna: 'H', porcentaje: 0.05 }, // 181-360 días
      { columna: 'I', porcentaje: 0.05 }, // >360 días
    ];

    let filaDestino = 14;
    for (const pasivoRow of pasivosRows) {
      // Obtener total de columna P (total)
      const totalPasivo = (sheet2.getCell(`P${pasivoRow}`).value as number) || 0;

      if (totalPasivo !== 0) {
        // Distribuir por rangos
        for (const rango of rangos) {
          const valor = Math.round(totalPasivo * rango.porcentaje);
          this.writeCell(worksheet, `${rango.columna}${filaDestino}`, valor);
        }
      }

      filaDestino++;
    }
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
    const sheet26 = wb.getWorksheet('Hoja26');
    if (sheet26 && sheet2) {
      this.fillFC03Sheet(
        sheet26,
        sheet2,
        'K', // Columna de aseo en Hoja2
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
  }
}

// Exportar instancia por defecto
export const r414TemplateService = new R414TemplateService();

// Exportar también la clase para testing
export default R414TemplateService;
