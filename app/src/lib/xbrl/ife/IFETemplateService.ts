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
   * - El template está VACÍO en columnas I-Q (no tiene fórmulas ni valores)
   * - Se deben escribir TODOS los valores de datos Y las fórmulas de subtotales
   * - Columnas I-P: servicios individuales (valores calculados desde PUC)
   * - Columna Q: total = SUM(I:P) para cada fila
   * - Las filas de autosuma necesitan fórmulas explícitas (el template no las tiene)
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
    
    // Todas las columnas de servicios (I-P)
    const allServiceColumns = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    
    // TODAS las filas del formulario (datos + subtotales) que debemos limpiar
    const allRows = [
      // Activos corrientes
      15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
      // Activos no corrientes
      34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
      // Pasivos corrientes
      56, 57, 58, 59, 60, 61, 62, 63, 64,
      // Pasivos no corrientes
      66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
      // Patrimonio
      77, 78, 79, 80, 81, 82, 83, 84, 85,
    ];
    
    // Limpiar TODAS las columnas de servicios (I-P) y total (Q) en TODAS las filas
    for (const row of allRows) {
      for (const col of allServiceColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
      this.writeCell(worksheet, `Q${row}`, 0);
    }

    // Llenar filas mapeadas con valores reales desde PUC
    for (const mapping of IFE_ESF_MAPPINGS) {
      let rowTotal = 0;
      
      for (const service of activeServices) {
        const serviceColumn = columns[service as keyof ServiceColumnMapping];
        if (!serviceColumn || serviceColumn === 'Q') continue;

        const serviceValue = this.sumServiceAccountsByPrefix(
          serviceBalances,
          service,
          mapping.pucPrefixes,
          mapping.excludePrefixes,
          mapping.useAbsoluteValue
        );

        this.writeCell(
          worksheet,
          `${serviceColumn}${mapping.row}`,
          serviceValue
        );
        
        rowTotal += serviceValue;
      }
      
      // Escribir total en columna Q para filas de datos
      this.writeCell(worksheet, `Q${mapping.row}`, rowTotal);
    }

    // ================================================================
    // ESCRIBIR FÓRMULAS DE AUTOSUMA para todas las columnas (I-P y Q)
    // El template NO tiene fórmulas - debemos escribirlas explícitamente
    // ================================================================
    const formulaColumns = [...allServiceColumns, 'Q'];
    
    for (const C of formulaColumns) {
      // --- Subtotales CxC corrientes ---
      // Fila 23: Total CxC servicios públicos corrientes = 19+20+21+22
      worksheet.getCell(`${C}23`).value = { formula: `${C}19+${C}20+${C}21+${C}22` };
      // Fila 26: Total CxC y otras CxC corrientes = 23+24+25
      worksheet.getCell(`${C}26`).value = { formula: `${C}23+${C}24+${C}25` };
      
      // --- Activos corrientes totales ---
      // Fila 32 = 15+16+26+27+28+29+30+31
      worksheet.getCell(`${C}32`).value = { formula: `${C}15+${C}16+${C}26+${C}27+${C}28+${C}29+${C}30+${C}31` };
      
      // --- Subtotales CxC no corrientes ---
      // Fila 44: Total CxC servicios públicos no corrientes = 40+41+42+43
      worksheet.getCell(`${C}44`).value = { formula: `${C}40+${C}41+${C}42+${C}43` };
      // Fila 47: Total CxC y otras CxC no corrientes = 44+45+46
      worksheet.getCell(`${C}47`).value = { formula: `${C}44+${C}45+${C}46` };
      
      // --- Activos no corrientes totales ---
      // Fila 51 = 34+35+36+37+47+48+49+50
      worksheet.getCell(`${C}51`).value = { formula: `${C}34+${C}35+${C}36+${C}37+${C}47+${C}48+${C}49+${C}50` };
      
      // --- TOTAL DE ACTIVOS ---
      // Fila 52 = 32+51
      worksheet.getCell(`${C}52`).value = { formula: `${C}32+${C}51` };
      
      // --- Pasivos corrientes totales ---
      // Fila 64 = 56+57+60+61+62+63 (58/59 son sub-detalle de 57, no se suman)
      worksheet.getCell(`${C}64`).value = { formula: `${C}56+${C}57+${C}60+${C}61+${C}62+${C}63` };
      
      // --- Total pasivos no corrientes ---
      // Fila 74 = 66+67+70+71+72+73 (68/69 son sub-detalle de 67)
      worksheet.getCell(`${C}74`).value = { formula: `${C}66+${C}67+${C}70+${C}71+${C}72+${C}73` };
      
      // --- TOTAL PASIVOS ---
      // Fila 75 = 64+74
      worksheet.getCell(`${C}75`).value = { formula: `${C}64+${C}74` };
      
      // --- Patrimonio total ---
      // Fila 84 = SUM(77:83)
      worksheet.getCell(`${C}84`).value = { formula: `SUM(${C}77:${C}83)` };
      
      // --- TOTAL DE PATRIMONIO Y PASIVOS ---
      // Fila 85 = 75+84
      worksheet.getCell(`${C}85`).value = { formula: `${C}75+${C}84` };
      
      // --- Filas resumen (referencian sus totales) ---
      worksheet.getCell(`${C}13`).value = { formula: `${C}52` };   // Activos = Total activos
      worksheet.getCell(`${C}14`).value = { formula: `${C}32` };   // Activos corrientes = Total corrientes
      worksheet.getCell(`${C}17`).value = { formula: `${C}26` };   // CxC corrientes resumen
      worksheet.getCell(`${C}18`).value = { formula: `${C}23` };   // CxC servicios resumen
      worksheet.getCell(`${C}33`).value = { formula: `${C}51` };   // Activos no corrientes resumen
      worksheet.getCell(`${C}38`).value = { formula: `${C}47` };   // CxC no corrientes resumen
      worksheet.getCell(`${C}39`).value = { formula: `${C}44` };   // CxC servicios no corrientes resumen
      worksheet.getCell(`${C}53`).value = { formula: `${C}85` };   // Patrimonio y pasivos resumen
      worksheet.getCell(`${C}54`).value = { formula: `${C}75` };   // Pasivos resumen
      worksheet.getCell(`${C}55`).value = { formula: `${C}64` };   // Pasivos corrientes resumen
      worksheet.getCell(`${C}65`).value = { formula: `${C}74` };   // Pasivos no corrientes resumen
      worksheet.getCell(`${C}76`).value = { formula: `${C}84` };   // Patrimonio resumen
    }
  }

  /**
   * Llena la Hoja4 (ER - Estado de Resultados por servicios).
   * Columnas E-L son servicios individuales, columna M es el total (fórmula de suma).
   * 
   * IMPORTANTE: 
   * - El template tiene valores de EJEMPLO hardcodeados que debemos limpiar
   * - Columnas E-L: servicios individuales (valores)
   * - Columna M: fórmula de suma =SUM(E:L) para cada fila
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
    
    // Filas de datos en ER - todas las filas del Estado de Resultados
    const erDataRows = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
    
    // Limpiar todas las filas de datos (columnas de servicios)
    for (const row of erDataRows) {
      for (const col of allERServiceColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }
    
    // Escribir FÓRMULAS de suma en columna M para todas las filas de datos
    for (const row of erDataRows) {
      const cell = worksheet.getCell(`M${row}`);
      cell.value = { formula: `SUM(E${row}:L${row})` };
    }

    // Llenar valores por servicio según los mapeos
    for (const mapping of IFE_ER_MAPPINGS) {
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
      }
      // La columna M ya tiene la fórmula de suma, no necesitamos escribir el total
    }
  }

  // ============================================
  // MÉTODOS ADICIONALES ESPECÍFICOS DE IFE
  // ============================================

  /**
   * Llena la Hoja5 (FC03t - 900020t - Cuentas comerciales por cobrar por rangos de vencimiento).
   * 
   * Estructura:
   * - Filas 17-23: Servicios (Acueducto, Alcantarillado, Aseo, Energía, Gas, GLP, XM)
   * - Fila 24: Deterioro de CxC (cuenta 1399 - valor negativo)
   * - Fila 25: Total (AUTOSUMA vertical)
   * - Columnas F-J: Rangos de vencimiento (No vencidas, 1-90, 91-180, 181-360, >360 días)
   * - Columna K: Total vencidas =SUM(G:J)
   * - Columna L: Total general =F+K (No vencidas + Total vencidas)
   * 
   * Distribución por defecto: 55% no vencidas, 25% 1-90 días, 20% 91-180 días
   */
  fillCxCSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[],
    serviceBalances: ServiceBalanceData[]
  ): void {
    // Mapeo de servicios a filas en Hoja5
    const serviceRows: Record<string, number> = {
      acueducto: 17,
      alcantarillado: 18,
      aseo: 19,
      energia: 20,
      gas: 21,
      glp: 22,
      xmm: 23,
    };

    // Rangos de vencimiento con distribución por defecto
    // 55% no vencidas, 25% 1-90 días, 20% 91-180 días
    const agingRanges = [
      { column: 'F', percentage: 0.55 }, // No vencidas
      { column: 'G', percentage: 0.25 }, // 1-90 días
      { column: 'H', percentage: 0.20 }, // 91-180 días
      { column: 'I', percentage: 0.00 }, // 181-360 días
      { column: 'J', percentage: 0.00 }, // >360 días
    ];

    // Columnas de datos de rangos (F-J)
    const rangeColumns = ['F', 'G', 'H', 'I', 'J'];
    
    // Filas de servicios (17-23) + deterioro (24)
    const allDataRows = [17, 18, 19, 20, 21, 22, 23, 24];

    // Limpiar todas las celdas de datos (F-J)
    for (const row of allDataRows) {
      for (const col of rangeColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }

    // Prefijos PUC para CxC por servicios públicos (cuenta 13, excluyendo deterioro 1399)
    const cxcPrefixes = ['13'];
    const excludePrefixes = ['1399']; // Deterioro se maneja por separado

    // Llenar datos por servicio
    for (const [service, row] of Object.entries(serviceRows)) {
      // Obtener CxC total del servicio
      const serviceCxC = this.sumServiceAccountsByPrefix(
        serviceBalances,
        service,
        cxcPrefixes,
        excludePrefixes,
        false
      );

      // Distribuir por rangos de vencimiento
      for (const range of agingRanges) {
        const value = Math.round(serviceCxC * range.percentage);
        this.writeCell(worksheet, `${range.column}${row}`, value);
      }

      // Columna K: Fórmula suma de vencidas (G:J)
      worksheet.getCell(`K${row}`).value = { formula: `SUM(G${row}:J${row})` };
      
      // Columna L: Fórmula total (No vencidas + Total vencidas = F + K)
      worksheet.getCell(`L${row}`).value = { formula: `F${row}+K${row}` };
    }

    // Fila 24: Deterioro de CxC (cuenta 1399 - debe ser negativo)
    // Obtener deterioro de todos los servicios
    const deterioroTotal = this.sumAccountsByPrefix(accounts, ['1399'], [], true);
    // El deterioro se muestra como valor negativo
    const deterioroValue = -Math.abs(deterioroTotal);
    
    // El deterioro se distribuye en la misma proporción que las CxC
    for (const range of agingRanges) {
      const value = Math.round(deterioroValue * range.percentage);
      this.writeCell(worksheet, `${range.column}24`, value);
    }
    
    // Fórmulas para deterioro (fila 24)
    worksheet.getCell('K24').value = { formula: 'SUM(G24:J24)' };
    worksheet.getCell('L24').value = { formula: 'F24+K24' };

    // Fila 25: Fórmulas SUM verticales para totales
    for (const col of rangeColumns) {
      worksheet.getCell(`${col}25`).value = { formula: `SUM(${col}17:${col}24)` };
    }
    // Totales para columnas K y L
    worksheet.getCell('K25').value = { formula: 'SUM(K17:K24)' };
    worksheet.getCell('L25').value = { formula: 'SUM(L17:L24)' };
  }

  /**
   * Llena la Hoja6 (FC05t - 900028t - Cuentas comerciales por pagar por rangos de vencimiento).
   * 
   * Estructura:
   * - Fila 15: Cuentas comerciales por pagar (cuenta 22)
   * - Fila 16: Otras cuentas por pagar (cuenta 23, 24, 28)
   * - Fila 17: Total CxP (AUTOSUMA fila 15+16)
   * - Fila 18: Obligaciones financieras (cuenta 21)
   * - Fila 19: Obligaciones laborales (cuenta 25)
   * - Fila 20: Total general (AUTOSUMA)
   * 
   * Columnas:
   * - D: No vencidas (40%)
   * - E: Vencidas 1-90 días (50%)
   * - F: Vencidas 91-180 días (10%)
   * - G: Vencidas 181-360 días (0%)
   * - H: Vencidas >360 días (0%)
   * - I: Total vencidas =SUM(E:H)
   * - J: Total general =D+I
   * 
   * Distribución por defecto: 40% no vencidas, 50% 1-90 días, 10% 91-180 días
   */
  fillCxPSheet(
    worksheet: ExcelJS.Worksheet,
    accounts: AccountData[]
  ): void {
    // Rangos de vencimiento con distribución por defecto
    // 40% no vencidas, 50% 1-90 días, 10% 91-180 días
    const agingRanges = [
      { column: 'D', percentage: 0.40 }, // No vencidas
      { column: 'E', percentage: 0.50 }, // 1-90 días
      { column: 'F', percentage: 0.10 }, // 91-180 días
      { column: 'G', percentage: 0.00 }, // 181-360 días
      { column: 'H', percentage: 0.00 }, // >360 días
    ];

    // Columnas de rangos de vencimiento (D-H)
    const rangeColumns = ['D', 'E', 'F', 'G', 'H'];

    // Mapeo de filas a cuentas PUC
    const rowMappings = [
      { row: 15, prefixes: ['22'], excludes: [], label: 'Cuentas comerciales por pagar' },
      { row: 16, prefixes: ['23', '24', '28'], excludes: [], label: 'Otras cuentas por pagar' },
      // Fila 17 es autosuma de 15+16
      { row: 18, prefixes: ['21'], excludes: [], label: 'Obligaciones financieras' },
      { row: 19, prefixes: ['25'], excludes: [], label: 'Obligaciones laborales' },
      // Fila 20 es autosuma total
    ];

    // Filas de datos (15, 16, 18, 19) - excluyendo autosum rows
    const dataRows = [15, 16, 18, 19];
    
    // Limpiar todas las celdas de datos (D-H para filas de datos)
    for (const row of dataRows) {
      for (const col of rangeColumns) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }

    // Llenar datos por cada concepto
    for (const mapping of rowMappings) {
      // Obtener total de la cuenta (valor absoluto para pasivos)
      const total = this.sumAccountsByPrefix(
        accounts,
        mapping.prefixes,
        mapping.excludes,
        true // Valor absoluto para pasivos
      );

      // Distribuir por rangos de vencimiento
      for (const range of agingRanges) {
        const value = Math.round(total * range.percentage);
        this.writeCell(worksheet, `${range.column}${mapping.row}`, value);
      }

      // Columna I: Fórmula suma de vencidas (E:H)
      worksheet.getCell(`I${mapping.row}`).value = { formula: `SUM(E${mapping.row}:H${mapping.row})` };
      
      // Columna J: Fórmula total (No vencidas + Total vencidas = D + I)
      worksheet.getCell(`J${mapping.row}`).value = { formula: `D${mapping.row}+I${mapping.row}` };
    }

    // Fila 17: Autosuma de filas 15+16 (Total CxP y otras cuentas por pagar)
    for (const col of rangeColumns) {
      worksheet.getCell(`${col}17`).value = { formula: `SUM(${col}15:${col}16)` };
    }
    worksheet.getCell('I17').value = { formula: 'SUM(E17:H17)' };
    worksheet.getCell('J17').value = { formula: 'D17+I17' };

    // Fila 20: Autosuma total (filas 17, 18, 19)
    for (const col of rangeColumns) {
      worksheet.getCell(`${col}20`).value = { formula: `${col}17+${col}18+${col}19` };
    }
    worksheet.getCell('I20').value = { formula: 'SUM(E20:H20)' };
    worksheet.getCell('J20').value = { formula: 'D20+I20' };
  }

  /**
   * Llena la Hoja7 (FC08t - 900050t - Información de ingresos y gastos de la entidad).
   * 
   * Datos tomados de Hoja4 (ER) donde hay filas correspondientes,
   * y computados directamente desde PUC para subcategorías de gastos.
   * 
   * Hoja4 estructura:
   *   - Fila 14: Ingresos de actividades ordinarias
   *   - Fila 15: Costo de ventas
   *   - Fila 17: Gastos de administración, operación y ventas
   *   - Fila 18: Otros ingresos
   *   - Fila 19: Otros gastos (PUC 53, 58)
   *   - Fila 21: Ingresos financieros
   *   - Fila 22: Costos financieros
   *   - Fila 25: Gasto por impuesto (PUC 54)
   * 
   * Mapeo Hoja7 ← Hoja4:
   *   - Fila 14 = Hoja4!fila14 (Ingresos ordinarios)
   *   - Fila 15 = Hoja4!(fila18 + fila21) (Otros ingresos + Financieros)
   *   - Fila 16 = autosuma 14+15
   *   - Fila 18 = Hoja4!(fila15 + fila17 + fila19 + fila22) (Costos totales)
   *   - Fila 19 = Hoja4!fila25 (Impuestos, PUC 54)
   *   - Fila 20 = Hoja4!fila22 (Gastos financieros)
   *   - Filas 21-24: Directo desde PUC clase 53 por servicio
   * 
   * Columna N: Total = SUM(F:M) para cada fila
   */
  fillDetalleIngresosGastosSheet(
    worksheet: ExcelJS.Worksheet,
    serviceBalances: ServiceBalanceData[],
    distribution: Record<string, number>
  ): void {
    // Columnas por servicio en Hoja7 (mapeo a columnas de Hoja4)
    // Hoja7: F=Acueducto, G=Alcantarillado, H=Aseo, I=Energia, J=Gas, K=GLP, L=XM, M=Otras
    // Hoja4: E=Acueducto, F=Alcantarillado, G=Aseo, H=Energia, I=Gas, J=GLP, K=XM, L=Otras
    const serviceMapping = [
      { hoja7Col: 'F', hoja4Col: 'E', service: 'acueducto' },
      { hoja7Col: 'G', hoja4Col: 'F', service: 'alcantarillado' },
      { hoja7Col: 'H', hoja4Col: 'G', service: 'aseo' },
      { hoja7Col: 'I', hoja4Col: 'H', service: 'energia' },
      { hoja7Col: 'J', hoja4Col: 'I', service: 'gas' },
      { hoja7Col: 'K', hoja4Col: 'J', service: 'glp' },
      { hoja7Col: 'L', hoja4Col: 'K', service: 'xmm' },
      { hoja7Col: 'M', hoja4Col: 'L', service: 'otras' },
    ];

    // Filas de datos en Hoja7
    const dataRows = [14, 15, 18, 19, 20, 21, 22, 23, 24];
    
    // Limpiar celdas de datos (F-M para filas de datos)
    const serviceCols = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    for (const row of dataRows) {
      for (const col of serviceCols) {
        this.writeCell(worksheet, `${col}${row}`, 0);
      }
    }

    // Fila 14: Ingresos de actividades ordinarias = Hoja4 fila 14 (Ingresos ordinarios)
    for (const map of serviceMapping) {
      worksheet.getCell(`${map.hoja7Col}14`).value = { formula: `Hoja4!${map.hoja4Col}14` };
    }

    // Fila 15: Todos los demás ingresos = Hoja4 fila 18 (Otros ingresos) + fila 21 (Ingresos financieros)
    for (const map of serviceMapping) {
      worksheet.getCell(`${map.hoja7Col}15`).value = { formula: `Hoja4!${map.hoja4Col}18+Hoja4!${map.hoja4Col}21` };
    }

    // Fila 16: Total ingresos (autosuma fila 14+15)
    for (const col of serviceCols) {
      worksheet.getCell(`${col}16`).value = { formula: `${col}14+${col}15` };
    }

    // Fila 18: Costos y gastos totales = Hoja4 fila 15 (Costo ventas) + 17 (Gastos admin) + 19 (Otros gastos) + 22 (Costos financieros)
    for (const map of serviceMapping) {
      worksheet.getCell(`${map.hoja7Col}18`).value = { 
        formula: `Hoja4!${map.hoja4Col}15+Hoja4!${map.hoja4Col}17+Hoja4!${map.hoja4Col}19+Hoja4!${map.hoja4Col}22` 
      };
    }

    // Filas 19-24: Detalle de gastos
    // Fila 19: Impuestos, tasas y contribuciones = Hoja4 fila 25 (PUC 54)
    for (const map of serviceMapping) {
      worksheet.getCell(`${map.hoja7Col}19`).value = { formula: `Hoja4!${map.hoja4Col}25` };
    }

    // Fila 20: Gastos financieros = Hoja4 fila 22 (Costos financieros, PUC 5802/5803)
    for (const map of serviceMapping) {
      worksheet.getCell(`${map.hoja7Col}20`).value = { formula: `Hoja4!${map.hoja4Col}22` };
    }

    // Filas 21-24: Detalle directo desde PUC por servicio
    // Estos ítems NO tienen filas separadas en Hoja4 (ER); se computan desde cuentas PUC clase 53
    // PUC CGN R414 clase 53: Deterioro, depreciaciones y amortizaciones
    const detailMappings = [
      { row: 21, puc: ['5346'], excl: [] as string[] },         // Deterioro
      { row: 22, puc: ['5360', '5361'], excl: [] as string[] }, // Depreciación
      { row: 23, puc: ['5365', '5366'], excl: [] as string[] }, // Amortización
      { row: 24, puc: ['53'], excl: ['5346', '5360', '5361', '5365', '5366'] }, // Provisiones
    ];
    const activeServices = Object.keys(distribution).filter(s => distribution[s] > 0);
    for (const detail of detailMappings) {
      for (const map of serviceMapping) {
        if (!activeServices.includes(map.service)) continue;
        const value = this.sumServiceAccountsByPrefix(
          serviceBalances,
          map.service,
          detail.puc,
          detail.excl,
          true // useAbsoluteValue para gastos
        );
        if (value !== 0) {
          this.writeCell(worksheet, `${map.hoja7Col}${detail.row}`, value);
        }
      }
    }

    // Columna N: Total = SUM(F:M) para cada fila
    const allDataRows = [14, 15, 16, 18, 19, 20, 21, 22, 23, 24];
    for (const row of allDataRows) {
      worksheet.getCell(`N${row}`).value = { formula: `SUM(F${row}:M${row})` };
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

    // Mapeo de trimestre a nombre del punto de entrada
    const trimestreNames: Record<IFETrimestre, string> = {
      '1T': 'PrimerTrimestre',
      '2T': 'SegundoTrimestre',
      '3T': 'TercerTrimestre',
      '4T': 'CuartoTrimestre',
    };
    const trimestreName = trimestreNames[trimestre];

    // Reemplazar el punto de entrada de la taxonomía según el trimestre
    // NOTA: El año del punto de entrada es siempre 2025 (año de la taxonomía vigente),
    // independientemente del año del reporte. Similar a R414.
    const taxonomyYear = '2025';
    result = result.replace(
      /IFE_PuntoEntradaSegundoTrimestre-(\d{4})\.xsd/g,
      `IFE_PuntoEntrada${trimestreName}-${taxonomyYear}.xsd`
    );

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

    // Mapeo de trimestre a nombre del punto de entrada
    const trimestreNames: Record<IFETrimestre, string> = {
      '1T': 'PrimerTrimestre',
      '2T': 'SegundoTrimestre',
      '3T': 'TercerTrimestre',
      '4T': 'CuartoTrimestre',
    };
    const trimestreName = trimestreNames[trimestre];

    // Reemplazar el punto de entrada de la taxonomía según el trimestre
    // El template usa SegundoTrimestre, hay que cambiarlo al trimestre seleccionado
    // NOTA: El año del punto de entrada es siempre 2025 (año de la taxonomía vigente),
    // independientemente del año del reporte. Similar a R414.
    const taxonomyYear = '2025';
    result = result.replace(
      /IFE_PuntoEntradaSegundoTrimestre-(\d{4})\.xsd/g,
      `IFE_PuntoEntrada${trimestreName}-${taxonomyYear}.xsd`
    );

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
