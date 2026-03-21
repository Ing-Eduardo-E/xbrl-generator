/**
 * Writer de datos financieros R414 para workbooks Excel.
 * Extraido de excelRewriter.ts para mantener el dispatcher limpio.
 */
import ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from './interfaces';
import {
  R414_ESF_MAPPINGS,
  R414_SERVICE_COLUMNS,
  R414_ER_MAPPINGS,
  R414_PPE_MAPPINGS,
  R414_INTANGIBLES_MAPPINGS,
  R414_EFECTIVO_MAPPINGS,
  R414_PROVISIONES_MAPPINGS,
  R414_OTRAS_PROVISIONES_MAPPINGS,
  R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
} from '../r414/mappings';
import { safeNumericValue } from '../excelUtils';
import { writeCellSafe, matchesPrefixes, type DataWriterContext } from '../shared/excelUtils';
import { r414TemplateService } from '../r414/R414TemplateService';
import type { TemplateWithDataOptions as R414Options } from '../types';

export function writeR414Data(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { accountsByService, activeServices, codesWithChildren, serviceCodesWithChildren } = ctx;

  // ===============================================
  // HOJA2 (210000): Estado de Situación Financiera
  // ===============================================
  const sheet2 = workbook.getWorksheet('Hoja2');
  if (sheet2) {
    console.log('[ExcelJS] Escribiendo datos en Hoja2...');

    for (const mapping of R414_ESF_MAPPINGS) {
      // Calcular total consolidado
      let totalValue = 0;
      for (const account of options.consolidatedAccounts) {
        if (codesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          totalValue += account.value;
        }
      }

      // Escribir valor total en columna P (columna 16)
      if (totalValue !== 0) {
        writeCellSafe(sheet2, `P${mapping.row}`, totalValue);
        console.log(`[ExcelJS] Hoja2!P${mapping.row} = ${totalValue}`);
      }

      // Escribir valores por servicio
      const serviceColumnMap = R414_SERVICE_COLUMNS as unknown as Record<string, string | undefined>;
      for (const service of activeServices) {
        const serviceColumn = serviceColumnMap[service];
        if (!serviceColumn) continue;

        let serviceValue = 0;
        const serviceAccounts = accountsByService[service] || [];
        for (const account of serviceAccounts) {
          if (serviceCodesWithChildren.has(account.code)) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            serviceValue += account.value;
          }
        }

        if (serviceValue !== 0) {
          writeCellSafe(sheet2, `${serviceColumn}${mapping.row}`, serviceValue);
          console.log(`[ExcelJS] Hoja2!${serviceColumn}${mapping.row} = ${serviceValue}`);
        }
      }
    }
  }

  // ===============================================
  // HOJA3 (310000): Estado de Resultados
  // ===============================================
  const sheet3 = workbook.getWorksheet('Hoja3');
  if (sheet3) {
    console.log('[ExcelJS] Escribiendo datos en Hoja3...');

    for (const mapping of R414_ER_MAPPINGS) {
      // Calcular total consolidado
      let totalValue = 0;
      for (const account of options.consolidatedAccounts) {
        if (codesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
          totalValue += account.value;
        }
      }

      // Escribir valor total en columna L (columna 12) - SIEMPRE escribir, incluso si es 0
      writeCellSafe(sheet3, `L${mapping.row}`, totalValue);
      if (totalValue !== 0) {
        console.log(`[ExcelJS] Hoja3!L${mapping.row} = ${totalValue}`);
      }

      // Escribir valores por servicio (E=Acueducto, F=Alcantarillado, G=Aseo)
      const erServiceColumns: Record<string, string> = {
        acueducto: 'E',
        alcantarillado: 'F',
        aseo: 'G'
      };

      for (const service of activeServices) {
        const serviceColumn = erServiceColumns[service];
        if (!serviceColumn) continue;

        let serviceValue = 0;
        const serviceAccounts = accountsByService[service] || [];
        for (const account of serviceAccounts) {
          if (serviceCodesWithChildren.has(account.code)) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            serviceValue += account.value;
          }
        }

        // SIEMPRE escribir el valor, incluso si es 0, para limpiar valores previos del template
        writeCellSafe(sheet3, `${serviceColumn}${mapping.row}`, serviceValue);
        if (serviceValue !== 0) {
          console.log(`[ExcelJS] Hoja3!${serviceColumn}${mapping.row} = ${serviceValue}`);
        }
      }
    }

    // DEBUG: Verificar que las cuentas usadas para Hoja3.E18 son las mismas que Hoja16
    const acueductoAccounts3 = accountsByService['acueducto'] || [];
    let suma51 = 0, suma52 = 0;
    for (const account of acueductoAccounts3) {
      if (serviceCodesWithChildren.has(account.code)) continue;
      if (account.code.startsWith('51')) suma51 += account.value;
      if (account.code.startsWith('52')) suma52 += account.value;
    }
    console.log(`[ExcelJS] Hoja3 - DEBUG Acueducto: cuenta 51 = ${suma51}, cuenta 52 = ${suma52}, total = ${suma51 + suma52}`);
  }

  const sheet7 = workbook.getWorksheet('Hoja7');
  if (sheet7) {
    console.log('[ExcelJS] Escribiendo datos en Hoja7...');

    // Verificar que tenemos cuentas consolidadas
    const consolidatedAccounts = options.consolidatedAccounts || [];

    // Función helper para procesar una sección completa
    // Si hay al menos un valor != 0, llena con 0 las celdas vacías de la sección
    const processSectionWithZeroFill = (
      mappings: Array<{ row: number; label?: string; pucPrefixes: string[]; excludePrefixes?: string[]; useAbsoluteValue?: boolean }>,
      sectionName: string,
      allRowsInSection: number[] // Todas las filas de datos (sin autosumas)
    ) => {
      // Primero calcular todos los valores
      const rowValues: Map<number, number> = new Map();
      let hasAnyValue = false;

      for (const mapping of mappings) {
        let totalValue = 0;
        for (const account of consolidatedAccounts) {
          if (codesWithChildren.has(account.code)) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
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
        console.log(`[ExcelJS] Sección ${sectionName}: hay valores, llenando celdas...`);

        for (const row of allRowsInSection) {
          const value = rowValues.get(row) ?? 0;
          writeCellSafe(sheet7, `F${row}`, value);
          console.log(`[ExcelJS] Hoja7!F${row} = ${value}`);
        }
      } else {
        console.log(`[ExcelJS] Sección ${sectionName}: sin valores, omitiendo.`);
      }
    };

    // ===============================================
    // PPE - Propiedad, Planta y Equipo (filas 14-34)
    // Autosumas: 16, 22, 29, 31, 34
    // ===============================================
    const ppeDataRows = [14, 15, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 32, 33];
    processSectionWithZeroFill(R414_PPE_MAPPINGS, 'PPE', ppeDataRows);

    // ===============================================
    // Activos Intangibles y Plusvalía (filas 37-48)
    // Autosumas: 44, 48
    // ===============================================
    const intangiblesDataRows = [37, 38, 39, 40, 41, 42, 43, 45, 46, 47];
    processSectionWithZeroFill(R414_INTANGIBLES_MAPPINGS, 'Intangibles', intangiblesDataRows);

    // ===============================================
    // Efectivo y Equivalentes al Efectivo (filas 51-60)
    // Autosumas: 53, 58, 60
    // ===============================================
    const efectivoDataRows = [51, 52, 55, 56, 57, 59];
    processSectionWithZeroFill(R414_EFECTIVO_MAPPINGS, 'Efectivo', efectivoDataRows);

    // ===============================================
    // Clases de Otras Provisiones (filas 63-73)
    // Autosumas: 65, 69, 73
    // ===============================================
    const provisionesDataRows = [63, 64, 67, 68, 71, 72];
    processSectionWithZeroFill(R414_PROVISIONES_MAPPINGS, 'Provisiones', provisionesDataRows);

    // ===============================================
    // Otras Provisiones (filas 75-77)
    // Autosuma: 77
    // ===============================================
    const otrasProvisionesDataRows = [75, 76];
    processSectionWithZeroFill(R414_OTRAS_PROVISIONES_MAPPINGS, 'Otras Provisiones', otrasProvisionesDataRows);

    // ===============================================
    // Beneficios a Empleados (filas 79-83)
    // Autosuma: 83
    // ===============================================
    const beneficiosDataRows = [79, 80, 81, 82];
    processSectionWithZeroFill(R414_BENEFICIOS_EMPLEADOS_MAPPINGS, 'Beneficios Empleados', beneficiosDataRows);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3 — Gastos por servicio: Hoja16/17/18 (~L289-862)
  // Candidato de extracción: official/rewriters/serviceExpensesRewriter.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // ===============================================
  // HOJA16 (900017a): Gastos del Servicio de Acueducto
  // Columna E = Gastos administrativos
  // Columna F = Gastos operativos (Costos de ventas)
  // Columna G = Autosuma E+F (no tocar)
  // ===============================================
  const sheet16 = workbook.getWorksheet('Hoja16');

  if (sheet16) {
    console.log('[ExcelJS] Escribiendo datos en Hoja16 (Gastos Acueducto)...');

    // Obtener cuentas del servicio de acueducto
    const acueductoAccounts = accountsByService['acueducto'] || [];

    // DEBUG: Ver cuántas cuentas hay y algunas de ejemplo
    console.log(`[ExcelJS] Hoja16 - Total cuentas acueducto: ${acueductoAccounts.length}`);
    const gastosAcueducto = acueductoAccounts.filter(a => a.code.startsWith('5'));
    console.log(`[ExcelJS] Hoja16 - Cuentas de gastos (clase 5): ${gastosAcueducto.length}`);
    if (gastosAcueducto.length > 0) {
      console.log(`[ExcelJS] Hoja16 - Ejemplos de gastos:`, gastosAcueducto.slice(0, 5).map(a => `${a.code}=${a.value}`).join(', '));
    }

    // Función helper para sumar cuentas por prefijos
    const sumByPrefixes16 = (accounts: typeof acueductoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
      let total = 0;
      for (const account of accounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
          total += account.value;
        }
      }
      return total;
    };

    // =====================================================
    // IMPORTANTE: Los gastos se dividen según la Hoja3:
    // - Gastos admin/op/ventas (Hoja3 fila 18): prefijos 51, 52
    // - Otros gastos (Hoja3 fila 22): prefijos 53, 54, 56, 58 (excluye financieros)
    // - Costos financieros (Hoja3 fila 20): prefijos 5802, 5803, 5807
    //
    // La columna E de Hoja16 debe sumar = Hoja3.E18 + Hoja3.E22 + Hoja3.E20
    // La columna F de Hoja16 debe sumar = Hoja3.E15 (Costo de ventas)
    // =====================================================

    // =====================================================
    // COLUMNA E - TODOS LOS GASTOS (clase 5)
    // Incluye: Gastos admin (51,52) + Otros gastos (53,54,56,58) + Costos financieros
    // IMPORTANTE: Siempre escribir valores (incluso 0) para limpiar valores previos del template
    // =====================================================

    // Fila 13: Beneficios a empleados
    const beneficiosEmpleados = sumByPrefixes16(acueductoAccounts, ['5101', '5103', '5104', '5107', '5108']);
    writeCellSafe(sheet16, 'E13', beneficiosEmpleados);
    console.log(`[ExcelJS] Hoja16!E13 (Beneficios empleados) = ${beneficiosEmpleados}`);

    // Fila 14: Honorarios
    const honorarios = sumByPrefixes16(acueductoAccounts, ['5110']);
    writeCellSafe(sheet16, 'E14', honorarios);
    console.log(`[ExcelJS] Hoja16!E14 (Honorarios) = ${honorarios}`);

    // Fila 15: Impuestos, Tasas y Contribuciones (No incluye impuesto de renta)
    const impuestosTasas = sumByPrefixes16(acueductoAccounts, ['5120']);
    writeCellSafe(sheet16, 'E15', impuestosTasas);
    console.log(`[ExcelJS] Hoja16!E15 (Impuestos y tasas) = ${impuestosTasas}`);

    // Fila 16: Generales
    const generales = sumByPrefixes16(acueductoAccounts, ['5111']);
    writeCellSafe(sheet16, 'E16', generales);
    console.log(`[ExcelJS] Hoja16!E16 (Generales) = ${generales}`);

    // Fila 17: Deterioro
    const deterioro = sumByPrefixes16(acueductoAccounts, ['5350']);
    writeCellSafe(sheet16, 'E17', deterioro);
    console.log(`[ExcelJS] Hoja16!E17 (Deterioro) = ${deterioro}`);

    // Fila 18: Depreciación
    const depreciacion = sumByPrefixes16(acueductoAccounts, ['5360']);
    writeCellSafe(sheet16, 'E18', depreciacion);
    console.log(`[ExcelJS] Hoja16!E18 (Depreciación) = ${depreciacion}`);

    // Fila 19: Amortización
    const amortizacion = sumByPrefixes16(acueductoAccounts, ['5365']);
    writeCellSafe(sheet16, 'E19', amortizacion);
    console.log(`[ExcelJS] Hoja16!E19 (Amortización) = ${amortizacion}`);

    // =====================================================
    // PROVISIONES (Filas 20-24)
    // =====================================================

    // Fila 21: Litigios y demandas
    const litigios = sumByPrefixes16(acueductoAccounts, ['537001', '537002']);
    writeCellSafe(sheet16, 'E21', litigios);

    // Fila 22: Garantías
    const garantias = sumByPrefixes16(acueductoAccounts, ['537003']);
    writeCellSafe(sheet16, 'E22', garantias);

    // Fila 23: Diversas (otras provisiones)
    const provisionesDiversas = sumByPrefixes16(acueductoAccounts, ['5370'], ['537001', '537002', '537003']);
    writeCellSafe(sheet16, 'E23', provisionesDiversas);

    // Fila 25: Arrendamientos
    const arrendamientos = sumByPrefixes16(acueductoAccounts, ['5115', '5124']);
    writeCellSafe(sheet16, 'E25', arrendamientos);
    console.log(`[ExcelJS] Hoja16!E25 (Arrendamientos) = ${arrendamientos}`);

    // =====================================================
    // OTROS GASTOS (Filas 26-33)
    // =====================================================

    // Fila 27: Comisiones
    const comisiones = sumByPrefixes16(acueductoAccounts, ['5125']);
    writeCellSafe(sheet16, 'E27', comisiones);

    // Fila 28: Ajuste por diferencia en cambio
    const diferenciaEnCambio = sumByPrefixes16(acueductoAccounts, ['5807']);
    writeCellSafe(sheet16, 'E28', diferenciaEnCambio);

    // Fila 29: Financieros (Costos financieros - Hoja3 fila 20)
    const financieros = sumByPrefixes16(acueductoAccounts, ['5802', '5803']);
    writeCellSafe(sheet16, 'E29', financieros);
    console.log(`[ExcelJS] Hoja16!E29 (Financieros) = ${financieros}`);

    // Fila 30: Pérdidas por aplicación del método de participación patrimonial
    const perdidasMPP = sumByPrefixes16(acueductoAccounts, ['5815']);
    writeCellSafe(sheet16, 'E30', perdidasMPP);
    console.log(`[ExcelJS] Hoja16!E30 (Pérdidas MPP) = ${perdidasMPP}`);

    // Fila 31: Gastos diversos
    const gastosDiversos = sumByPrefixes16(acueductoAccounts, ['5195', '5895']);
    writeCellSafe(sheet16, 'E31', gastosDiversos);
    console.log(`[ExcelJS] Hoja16!E31 (Gastos diversos) = ${gastosDiversos}`);

    // Fila 32: Donaciones
    const donaciones = sumByPrefixes16(acueductoAccounts, ['5423']);
    writeCellSafe(sheet16, 'E32', donaciones);
    console.log(`[ExcelJS] Hoja16!E32 (Donaciones) = ${donaciones}`);

    // =====================================================
    // GANANCIAS (Fila 33) - Si hay ganancias por MPP van aquí
    // PUC: 4815 - Ganancias por método de participación patrimonial (ingreso)
    // Nota: Se muestra como valor NEGATIVO para restar del total de gastos
    // =====================================================
    const gananciasMPP = sumByPrefixes16(acueductoAccounts, ['4815']);
    if (gananciasMPP !== 0) {
      writeCellSafe(sheet16, 'E33', -gananciasMPP);
      console.log(`[ExcelJS] Hoja16!E33 (Ganancias MPP) = ${-gananciasMPP}`);
    } else {
      writeCellSafe(sheet16, 'E33', 0);
    }

    // =====================================================
    // IMPUESTOS A LAS GANANCIAS (Filas 34-35)
    // =====================================================

    // Fila 34: Impuesto a las ganancias corrientes
    const impuestoRentaCorriente = sumByPrefixes16(acueductoAccounts, ['540101']);
    writeCellSafe(sheet16, 'E34', impuestoRentaCorriente);
    console.log(`[ExcelJS] Hoja16!E34 (Imp. renta corriente) = ${impuestoRentaCorriente}`);

    // Fila 35: Impuesto a las ganancias diferido
    const impuestoRentaDiferido = sumByPrefixes16(acueductoAccounts, ['5410'], ['540101']);
    writeCellSafe(sheet16, 'E35', impuestoRentaDiferido);
    console.log(`[ExcelJS] Hoja16!E35 (Imp. renta diferido) = ${impuestoRentaDiferido}`);

    // =====================================================
    // SERVICIOS PÚBLICOS, MANTENIMIENTO, SEGUROS, OTROS
    // =====================================================

    // Fila 72: Órdenes y contratos de mantenimiento y reparaciones
    const mantenimiento = sumByPrefixes16(acueductoAccounts, ['5140', '5145']);
    writeCellSafe(sheet16, 'E72', mantenimiento);
    console.log(`[ExcelJS] Hoja16!E72 (Mantenimiento) = ${mantenimiento}`);

    // Fila 77: Servicios públicos
    const serviciosPublicos = sumByPrefixes16(acueductoAccounts, ['5135']);
    writeCellSafe(sheet16, 'E77', serviciosPublicos);
    console.log(`[ExcelJS] Hoja16!E77 (Servicios públicos) = ${serviciosPublicos}`);

    // Fila 80: Seguros
    const seguros = sumByPrefixes16(acueductoAccounts, ['5130']);
    writeCellSafe(sheet16, 'E80', seguros);
    console.log(`[ExcelJS] Hoja16!E80 (Seguros) = ${seguros}`);

    // Fila 81: Órdenes y contratos por otros servicios
    const otrosContratos = sumByPrefixes16(acueductoAccounts, ['5150', '5155']);
    writeCellSafe(sheet16, 'E81', otrosContratos);
    console.log(`[ExcelJS] Hoja16!E81 (Otros contratos) = ${otrosContratos}`);

    // =====================================================
    // COLUMNA F - GASTOS OPERATIVOS / COSTOS DE VENTAS
    // PUC: Clase 6 - Costos de ventas
    // Todos van a la fila 72 "Órdenes y contratos de mantenimiento"
    // =====================================================

    const costosVentasTotal = sumByPrefixes16(acueductoAccounts, ['6']);
    writeCellSafe(sheet16, 'F72', costosVentasTotal);
    console.log(`[ExcelJS] Hoja16!F72 (Costos de ventas total) = ${costosVentasTotal}`);

    // Limpiar otras celdas de la columna F que puedan tener valores previos
    // IMPORTANTE: Incluir fila 33 (Ganancias MPP) — si no se limpia, ExcelJS
    // conserva la fórmula original del template y `.value` retorna un objeto
    // { formula: '...' }, causando "0[object Object]" al sumar en columna G.
    for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 77, 80, 81]) {
      writeCellSafe(sheet16, `F${row}`, 0);
    }

    // =====================================================
    // COLUMNA G - TOTAL (E + F)
    // =====================================================
    const filasConDatos16 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
    for (const row of filasConDatos16) {
      const valorE = safeNumericValue(sheet16.getCell(`E${row}`));
      const valorF = safeNumericValue(sheet16.getCell(`F${row}`));
      writeCellSafe(sheet16, `G${row}`, valorE + valorF);
    }
    console.log(`[ExcelJS] Hoja16 - Columna G (E+F) calculada para ${filasConDatos16.length} filas`);

    // DEBUG: Mostrar totales para verificar
    const totalGastosAdmin = sumByPrefixes16(acueductoAccounts, ['51', '52']);
    const totalOtrosGastos = sumByPrefixes16(acueductoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
    const totalCostosFinancieros = sumByPrefixes16(acueductoAccounts, ['5802', '5803', '5807']);
    const totalGastosHoja16 = totalGastosAdmin + totalOtrosGastos + totalCostosFinancieros;
    console.log(`[ExcelJS] Hoja16 - Verificación de totales:`);
    console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin}`);
    console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos}`);
    console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros}`);
    console.log(`[ExcelJS]   TOTAL GASTOS HOJA16 columna E = ${totalGastosHoja16}`);
    console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal}`);

    // DEBUG: Encontrar cuentas 51/52 no cubiertas por los mapeos
    const prefixesCubiertos = [
      '5101', '5103', '5104', '5107', '5108',
      '5110', '5120', '5111', '5115', '5124',
      '5140', '5145', '5135', '5130', '5150', '5155',
    ];

    const cuentasNoCubiertas: Array<{code: string; value: number}> = [];
    let totalNoCubierto = 0;
    for (const account of acueductoAccounts) {
      if (serviceCodesWithChildren.has(account.code)) continue;
      if ((account.code.startsWith('51') || account.code.startsWith('52'))) {
        const estaCubierta = prefixesCubiertos.some(prefix => account.code.startsWith(prefix));
        if (!estaCubierta) {
          cuentasNoCubiertas.push({ code: account.code, value: account.value });
          totalNoCubierto += account.value;
        }
      }
    }

    if (cuentasNoCubiertas.length > 0) {
      console.log(`[ExcelJS] ATENCION: ${cuentasNoCubiertas.length} cuentas 51/52 NO CUBIERTAS por mapeos:`);
      for (const cuenta of cuentasNoCubiertas) {
        console.log(`[ExcelJS]   - ${cuenta.code} = ${cuenta.value}`);
      }
      console.log(`[ExcelJS]   Total no cubierto: ${totalNoCubierto}`);
    } else {
      console.log(`[ExcelJS] Todas las cuentas 51/52 estan cubiertas por los mapeos`);
    }

    console.log('[ExcelJS] Hoja16 completada.');
  }

  // ===============================================
  // HOJA17 (900017b): Gastos del Servicio de Alcantarillado
  // ===============================================
  const sheet17 = workbook.getWorksheet('Hoja17');

  if (sheet17) {
    console.log('[ExcelJS] Escribiendo datos en Hoja17 (Gastos Alcantarillado)...');

    const alcantarilladoAccounts = accountsByService['alcantarillado'] || [];

    console.log(`[ExcelJS] Hoja17 - Total cuentas alcantarillado: ${alcantarilladoAccounts.length}`);
    const gastosAlcantarillado = alcantarilladoAccounts.filter(a => a.code.startsWith('5'));
    console.log(`[ExcelJS] Hoja17 - Cuentas de gastos (clase 5): ${gastosAlcantarillado.length}`);

    const sumByPrefixes17 = (accounts: typeof alcantarilladoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
      let total = 0;
      for (const account of accounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
          total += account.value;
        }
      }
      return total;
    };

    const beneficiosEmpleados17 = sumByPrefixes17(alcantarilladoAccounts, ['5101', '5103', '5104', '5107', '5108']);
    writeCellSafe(sheet17, 'E13', beneficiosEmpleados17);
    console.log(`[ExcelJS] Hoja17!E13 (Beneficios empleados) = ${beneficiosEmpleados17}`);

    const honorarios17 = sumByPrefixes17(alcantarilladoAccounts, ['5110']);
    writeCellSafe(sheet17, 'E14', honorarios17);
    console.log(`[ExcelJS] Hoja17!E14 (Honorarios) = ${honorarios17}`);

    const impuestosTasas17 = sumByPrefixes17(alcantarilladoAccounts, ['5120']);
    writeCellSafe(sheet17, 'E15', impuestosTasas17);
    console.log(`[ExcelJS] Hoja17!E15 (Impuestos y tasas) = ${impuestosTasas17}`);

    const generales17 = sumByPrefixes17(alcantarilladoAccounts, ['5111']);
    writeCellSafe(sheet17, 'E16', generales17);
    console.log(`[ExcelJS] Hoja17!E16 (Generales) = ${generales17}`);

    const deterioro17 = sumByPrefixes17(alcantarilladoAccounts, ['5350']);
    writeCellSafe(sheet17, 'E17', deterioro17);
    console.log(`[ExcelJS] Hoja17!E17 (Deterioro) = ${deterioro17}`);

    const depreciacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5360']);
    writeCellSafe(sheet17, 'E18', depreciacion17);
    console.log(`[ExcelJS] Hoja17!E18 (Depreciación) = ${depreciacion17}`);

    const amortizacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5365']);
    writeCellSafe(sheet17, 'E19', amortizacion17);
    console.log(`[ExcelJS] Hoja17!E19 (Amortización) = ${amortizacion17}`);

    const litigios17 = sumByPrefixes17(alcantarilladoAccounts, ['537001', '537002']);
    writeCellSafe(sheet17, 'E21', litigios17);

    const garantias17 = sumByPrefixes17(alcantarilladoAccounts, ['537003']);
    writeCellSafe(sheet17, 'E22', garantias17);

    const provisionesDiversas17 = sumByPrefixes17(alcantarilladoAccounts, ['5370'], ['537001', '537002', '537003']);
    writeCellSafe(sheet17, 'E23', provisionesDiversas17);

    const arrendamientos17 = sumByPrefixes17(alcantarilladoAccounts, ['5115', '5124']);
    writeCellSafe(sheet17, 'E25', arrendamientos17);
    console.log(`[ExcelJS] Hoja17!E25 (Arrendamientos) = ${arrendamientos17}`);

    const comisiones17 = sumByPrefixes17(alcantarilladoAccounts, ['5125']);
    writeCellSafe(sheet17, 'E27', comisiones17);

    const diferenciaEnCambio17 = sumByPrefixes17(alcantarilladoAccounts, ['5807']);
    writeCellSafe(sheet17, 'E28', diferenciaEnCambio17);

    const financieros17 = sumByPrefixes17(alcantarilladoAccounts, ['5802', '5803']);
    writeCellSafe(sheet17, 'E29', financieros17);
    console.log(`[ExcelJS] Hoja17!E29 (Financieros) = ${financieros17}`);

    const perdidasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['5815']);
    writeCellSafe(sheet17, 'E30', perdidasMPP17);
    console.log(`[ExcelJS] Hoja17!E30 (Pérdidas MPP) = ${perdidasMPP17}`);

    const gastosDiversos17 = sumByPrefixes17(alcantarilladoAccounts, ['5195', '5895']);
    writeCellSafe(sheet17, 'E31', gastosDiversos17);
    console.log(`[ExcelJS] Hoja17!E31 (Gastos diversos) = ${gastosDiversos17}`);

    const donaciones17 = sumByPrefixes17(alcantarilladoAccounts, ['5423']);
    writeCellSafe(sheet17, 'E32', donaciones17);
    console.log(`[ExcelJS] Hoja17!E32 (Donaciones) = ${donaciones17}`);

    const gananciasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['4815']);
    writeCellSafe(sheet17, 'E33', gananciasMPP17 !== 0 ? -gananciasMPP17 : 0);
    if (gananciasMPP17 !== 0) {
      console.log(`[ExcelJS] Hoja17!E33 (Ganancias MPP) = ${-gananciasMPP17}`);
    }

    const impuestoRentaCorriente17 = sumByPrefixes17(alcantarilladoAccounts, ['540101']);
    writeCellSafe(sheet17, 'E34', impuestoRentaCorriente17);
    console.log(`[ExcelJS] Hoja17!E34 (Imp. renta corriente) = ${impuestoRentaCorriente17}`);

    const impuestoRentaDiferido17 = sumByPrefixes17(alcantarilladoAccounts, ['5410'], ['540101']);
    writeCellSafe(sheet17, 'E35', impuestoRentaDiferido17);
    console.log(`[ExcelJS] Hoja17!E35 (Imp. renta diferido) = ${impuestoRentaDiferido17}`);

    const mantenimiento17 = sumByPrefixes17(alcantarilladoAccounts, ['5140', '5145']);
    writeCellSafe(sheet17, 'E72', mantenimiento17);
    console.log(`[ExcelJS] Hoja17!E72 (Mantenimiento) = ${mantenimiento17}`);

    const serviciosPublicos17 = sumByPrefixes17(alcantarilladoAccounts, ['5135']);
    writeCellSafe(sheet17, 'E77', serviciosPublicos17);
    console.log(`[ExcelJS] Hoja17!E77 (Servicios públicos) = ${serviciosPublicos17}`);

    const seguros17 = sumByPrefixes17(alcantarilladoAccounts, ['5130']);
    writeCellSafe(sheet17, 'E80', seguros17);
    console.log(`[ExcelJS] Hoja17!E80 (Seguros) = ${seguros17}`);

    const otrosContratos17 = sumByPrefixes17(alcantarilladoAccounts, ['5150', '5155']);
    writeCellSafe(sheet17, 'E81', otrosContratos17);
    console.log(`[ExcelJS] Hoja17!E81 (Otros contratos) = ${otrosContratos17}`);

    const costosVentasTotal17 = sumByPrefixes17(alcantarilladoAccounts, ['6']);
    writeCellSafe(sheet17, 'F72', costosVentasTotal17);
    console.log(`[ExcelJS] Hoja17!F72 (Costos de ventas total) = ${costosVentasTotal17}`);

    for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 77, 80, 81]) {
      writeCellSafe(sheet17, `F${row}`, 0);
    }

    const filasConDatos17 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
    for (const row of filasConDatos17) {
      const valorE = safeNumericValue(sheet17.getCell(`E${row}`));
      const valorF = safeNumericValue(sheet17.getCell(`F${row}`));
      writeCellSafe(sheet17, `G${row}`, valorE + valorF);
    }
    console.log(`[ExcelJS] Hoja17 - Columna G (E+F) calculada para ${filasConDatos17.length} filas`);

    const totalGastosAdmin17 = sumByPrefixes17(alcantarilladoAccounts, ['51', '52']);
    const totalOtrosGastos17 = sumByPrefixes17(alcantarilladoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
    const totalCostosFinancieros17 = sumByPrefixes17(alcantarilladoAccounts, ['5802', '5803', '5807']);
    const totalGastosHoja17 = totalGastosAdmin17 + totalOtrosGastos17 + totalCostosFinancieros17;
    console.log(`[ExcelJS] Hoja17 - Verificación de totales (debe coincidir con Hoja3.F):`);
    console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin17} (Hoja3.F18)`);
    console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos17} (Hoja3.F22)`);
    console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros17} (Hoja3.F20)`);
    console.log(`[ExcelJS]   TOTAL GASTOS HOJA17 columna E = ${totalGastosHoja17}`);
    console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal17} (Hoja3.F15)`);

    console.log('[ExcelJS] Hoja17 completada.');
  }

  // ===============================================
  // HOJA18 (900017c): Gastos del Servicio de Aseo
  // DISTRIBUCIÓN ESPECIAL DE COSTOS DE VENTAS:
  // - Fila 72 (Mantenimiento): 40%
  // - Fila 73 (Disposición final): 60%
  // ===============================================
  const sheet18 = workbook.getWorksheet('Hoja18');

  if (sheet18) {
    console.log('[ExcelJS] Escribiendo datos en Hoja18 (Gastos Aseo)...');

    const aseoAccounts = accountsByService['aseo'] || [];

    console.log(`[ExcelJS] Hoja18 - Total cuentas aseo: ${aseoAccounts.length}`);
    const gastosAseo = aseoAccounts.filter(a => a.code.startsWith('5'));
    console.log(`[ExcelJS] Hoja18 - Cuentas de gastos (clase 5): ${gastosAseo.length}`);

    const sumByPrefixes18 = (accounts: typeof aseoAccounts, prefixes: string[], excludePrefixes?: string[]): number => {
      let total = 0;
      for (const account of accounts) {
        if (serviceCodesWithChildren.has(account.code)) continue;
        if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
          total += account.value;
        }
      }
      return total;
    };

    const beneficiosEmpleados18 = sumByPrefixes18(aseoAccounts, ['5101', '5103', '5104', '5107', '5108']);
    writeCellSafe(sheet18, 'E13', beneficiosEmpleados18);
    console.log(`[ExcelJS] Hoja18!E13 (Beneficios empleados) = ${beneficiosEmpleados18}`);

    const honorarios18 = sumByPrefixes18(aseoAccounts, ['5110']);
    writeCellSafe(sheet18, 'E14', honorarios18);
    console.log(`[ExcelJS] Hoja18!E14 (Honorarios) = ${honorarios18}`);

    const impuestosTasas18 = sumByPrefixes18(aseoAccounts, ['5120']);
    writeCellSafe(sheet18, 'E15', impuestosTasas18);
    console.log(`[ExcelJS] Hoja18!E15 (Impuestos y tasas) = ${impuestosTasas18}`);

    const generales18 = sumByPrefixes18(aseoAccounts, ['5111']);
    writeCellSafe(sheet18, 'E16', generales18);
    console.log(`[ExcelJS] Hoja18!E16 (Generales) = ${generales18}`);

    const deterioro18 = sumByPrefixes18(aseoAccounts, ['5350']);
    writeCellSafe(sheet18, 'E17', deterioro18);
    console.log(`[ExcelJS] Hoja18!E17 (Deterioro) = ${deterioro18}`);

    const depreciacion18 = sumByPrefixes18(aseoAccounts, ['5360']);
    writeCellSafe(sheet18, 'E18', depreciacion18);
    console.log(`[ExcelJS] Hoja18!E18 (Depreciación) = ${depreciacion18}`);

    const amortizacion18 = sumByPrefixes18(aseoAccounts, ['5365']);
    writeCellSafe(sheet18, 'E19', amortizacion18);
    console.log(`[ExcelJS] Hoja18!E19 (Amortización) = ${amortizacion18}`);

    const litigios18 = sumByPrefixes18(aseoAccounts, ['537001', '537002']);
    writeCellSafe(sheet18, 'E21', litigios18);

    const garantias18 = sumByPrefixes18(aseoAccounts, ['537003']);
    writeCellSafe(sheet18, 'E22', garantias18);

    const provisionesDiversas18 = sumByPrefixes18(aseoAccounts, ['5370'], ['537001', '537002', '537003']);
    writeCellSafe(sheet18, 'E23', provisionesDiversas18);

    const arrendamientos18 = sumByPrefixes18(aseoAccounts, ['5115', '5124']);
    writeCellSafe(sheet18, 'E25', arrendamientos18);
    console.log(`[ExcelJS] Hoja18!E25 (Arrendamientos) = ${arrendamientos18}`);

    const comisiones18 = sumByPrefixes18(aseoAccounts, ['5125']);
    writeCellSafe(sheet18, 'E27', comisiones18);

    const diferenciaEnCambio18 = sumByPrefixes18(aseoAccounts, ['5807']);
    writeCellSafe(sheet18, 'E28', diferenciaEnCambio18);

    const financieros18 = sumByPrefixes18(aseoAccounts, ['5802', '5803']);
    writeCellSafe(sheet18, 'E29', financieros18);
    console.log(`[ExcelJS] Hoja18!E29 (Financieros) = ${financieros18}`);

    const perdidasMPP18 = sumByPrefixes18(aseoAccounts, ['5815']);
    writeCellSafe(sheet18, 'E30', perdidasMPP18);
    console.log(`[ExcelJS] Hoja18!E30 (Pérdidas MPP) = ${perdidasMPP18}`);

    const gastosDiversos18 = sumByPrefixes18(aseoAccounts, ['5195', '5895']);
    writeCellSafe(sheet18, 'E31', gastosDiversos18);
    console.log(`[ExcelJS] Hoja18!E31 (Gastos diversos) = ${gastosDiversos18}`);

    const donaciones18 = sumByPrefixes18(aseoAccounts, ['5423']);
    writeCellSafe(sheet18, 'E32', donaciones18);
    console.log(`[ExcelJS] Hoja18!E32 (Donaciones) = ${donaciones18}`);

    const gananciasMPP18 = sumByPrefixes18(aseoAccounts, ['4815']);
    writeCellSafe(sheet18, 'E33', gananciasMPP18 !== 0 ? -gananciasMPP18 : 0);
    if (gananciasMPP18 !== 0) {
      console.log(`[ExcelJS] Hoja18!E33 (Ganancias MPP) = ${-gananciasMPP18}`);
    }

    const impuestoRentaCorriente18 = sumByPrefixes18(aseoAccounts, ['540101']);
    writeCellSafe(sheet18, 'E34', impuestoRentaCorriente18);
    console.log(`[ExcelJS] Hoja18!E34 (Imp. renta corriente) = ${impuestoRentaCorriente18}`);

    const impuestoRentaDiferido18 = sumByPrefixes18(aseoAccounts, ['5410'], ['540101']);
    writeCellSafe(sheet18, 'E35', impuestoRentaDiferido18);
    console.log(`[ExcelJS] Hoja18!E35 (Imp. renta diferido) = ${impuestoRentaDiferido18}`);

    const mantenimiento18 = sumByPrefixes18(aseoAccounts, ['5140', '5145']);
    writeCellSafe(sheet18, 'E72', mantenimiento18);
    console.log(`[ExcelJS] Hoja18!E72 (Mantenimiento) = ${mantenimiento18}`);

    const serviciosPublicos18 = sumByPrefixes18(aseoAccounts, ['5135']);
    writeCellSafe(sheet18, 'E77', serviciosPublicos18);
    console.log(`[ExcelJS] Hoja18!E77 (Servicios públicos) = ${serviciosPublicos18}`);

    const seguros18 = sumByPrefixes18(aseoAccounts, ['5130']);
    writeCellSafe(sheet18, 'E80', seguros18);
    console.log(`[ExcelJS] Hoja18!E80 (Seguros) = ${seguros18}`);

    const otrosContratos18 = sumByPrefixes18(aseoAccounts, ['5150', '5155']);
    writeCellSafe(sheet18, 'E81', otrosContratos18);
    console.log(`[ExcelJS] Hoja18!E81 (Otros contratos) = ${otrosContratos18}`);

    // =====================================================
    // COLUMNA F - DISTRIBUCIÓN ESPECIAL PARA SERVICIO DE ASEO:
    // - Fila 72 (Mantenimiento): 40%
    // - Fila 74 (Disposición final): 60%
    // =====================================================

    const costosVentasTotal18 = sumByPrefixes18(aseoAccounts, ['6']);

    const costosMantenimiento18 = Math.round(costosVentasTotal18 * 0.40);
    const costosDisposicionFinal18 = costosVentasTotal18 - costosMantenimiento18;

    writeCellSafe(sheet18, 'F72', costosMantenimiento18);
    writeCellSafe(sheet18, 'F74', costosDisposicionFinal18);

    console.log(`[ExcelJS] Hoja18 - Costos de ventas total: ${costosVentasTotal18}`);
    console.log(`[ExcelJS] Hoja18!F72 (Mantenimiento 40%) = ${costosMantenimiento18}`);
    console.log(`[ExcelJS] Hoja18!F74 (Disposición final 60%) = ${costosDisposicionFinal18}`);

    for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 73, 77, 80, 81]) {
      writeCellSafe(sheet18, `F${row}`, 0);
    }

    const filasConDatos18 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 74, 77, 80, 81];
    for (const row of filasConDatos18) {
      const valorE = safeNumericValue(sheet18.getCell(`E${row}`));
      const valorF = safeNumericValue(sheet18.getCell(`F${row}`));
      writeCellSafe(sheet18, `G${row}`, valorE + valorF);
    }
    console.log(`[ExcelJS] Hoja18 - Columna G (E+F) calculada para ${filasConDatos18.length} filas`);

    const totalGastosAdmin18 = sumByPrefixes18(aseoAccounts, ['51', '52']);
    const totalOtrosGastos18 = sumByPrefixes18(aseoAccounts, ['53', '54', '56', '58'], ['5802', '5803', '5807', '5815', '5410']);
    const totalCostosFinancieros18 = sumByPrefixes18(aseoAccounts, ['5802', '5803', '5807']);
    const totalGastosHoja18 = totalGastosAdmin18 + totalOtrosGastos18 + totalCostosFinancieros18;
    console.log(`[ExcelJS] Hoja18 - Verificación de totales (debe coincidir con Hoja3.G):`);
    console.log(`[ExcelJS]   Gastos admin/op/ventas (51,52) = ${totalGastosAdmin18} (Hoja3.G18)`);
    console.log(`[ExcelJS]   Otros gastos (53,54,56,58) = ${totalOtrosGastos18} (Hoja3.G22)`);
    console.log(`[ExcelJS]   Costos financieros (5802,5803,5807) = ${totalCostosFinancieros18} (Hoja3.G20)`);
    console.log(`[ExcelJS]   TOTAL GASTOS HOJA18 columna E = ${totalGastosHoja18}`);
    console.log(`[ExcelJS]   Costos de ventas (6) columna F = ${costosVentasTotal18} (Hoja3.G15)`);
    console.log(`[ExcelJS]     -> F72 (40%): ${costosMantenimiento18}`);
    console.log(`[ExcelJS]     -> F74 (60%): ${costosDisposicionFinal18}`);

    console.log('[ExcelJS] Hoja18 completada.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4 — Consolidados y CxC: Hoja22/23/24/25/26/30 (~L869-1485)
  // Candidato de extracción: official/rewriters/consolidatedAndCxCRewriter.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // ===============================================
  // HOJA22 (900017g): Gastos Consolidados de Todos los Servicios
  // IMPORTANTE: Hoja22 está desplazada +1 fila respecto a Hojas 16/17/18
  // ===============================================
  const sheet16ForHoja22 = workbook.getWorksheet('Hoja16');
  const sheet17ForHoja22 = workbook.getWorksheet('Hoja17');
  const sheet18ForHoja22 = workbook.getWorksheet('Hoja18');
  const sheet22 = workbook.getWorksheet('Hoja22');

  if (sheet22 && sheet16ForHoja22 && sheet17ForHoja22 && sheet18ForHoja22) {
    console.log('[ExcelJS] Escribiendo datos en Hoja22 (Gastos Consolidados)...');

    // Mapeo de filas: Hojas 16/17/18 (fila origen) -> Hoja22 (fila destino)
    const mapeoFilas: Array<{origen: number; destino: number}> = [
      { origen: 13, destino: 14 },
      { origen: 14, destino: 15 },
      { origen: 15, destino: 16 },
      { origen: 16, destino: 17 },
      { origen: 17, destino: 18 },
      { origen: 18, destino: 19 },
      { origen: 19, destino: 20 },
      { origen: 21, destino: 22 },
      { origen: 22, destino: 23 },
      { origen: 23, destino: 24 },
      { origen: 25, destino: 26 },
      { origen: 27, destino: 28 },
      { origen: 28, destino: 29 },
      { origen: 29, destino: 30 },
      { origen: 30, destino: 31 },
      { origen: 31, destino: 32 },
      { origen: 32, destino: 33 },
      { origen: 34, destino: 35 },
      { origen: 35, destino: 36 },
      { origen: 72, destino: 73 },
      { origen: 74, destino: 75 },
      { origen: 77, destino: 78 },
      { origen: 80, destino: 81 },
      { origen: 81, destino: 82 },
    ];

    for (const { origen, destino } of mapeoFilas) {
      const e16 = safeNumericValue(sheet16ForHoja22.getCell(`E${origen}`));
      const e17 = safeNumericValue(sheet17ForHoja22.getCell(`E${origen}`));
      const e18 = safeNumericValue(sheet18ForHoja22.getCell(`E${origen}`));
      const sumaE = e16 + e17 + e18;

      const f16 = safeNumericValue(sheet16ForHoja22.getCell(`F${origen}`));
      const f17 = safeNumericValue(sheet17ForHoja22.getCell(`F${origen}`));
      const f18 = safeNumericValue(sheet18ForHoja22.getCell(`F${origen}`));
      const sumaF = f16 + f17 + f18;

      writeCellSafe(sheet22, `E${destino}`, sumaE);
      writeCellSafe(sheet22, `F${destino}`, sumaF);
      writeCellSafe(sheet22, `G${destino}`, sumaE + sumaF);

      writeCellSafe(sheet22, `K${destino}`, sumaE);
      writeCellSafe(sheet22, `L${destino}`, sumaF);
      writeCellSafe(sheet22, `M${destino}`, sumaE + sumaF);

      if (sumaE !== 0 || sumaF !== 0) {
        console.log(`[ExcelJS] Hoja22 fila ${destino}: E=${sumaE}, F=${sumaF}, G=${sumaE + sumaF}`);
      }
    }

    let totalE = 0, totalF = 0;
    for (const { destino } of mapeoFilas) {
      totalE += safeNumericValue(sheet22.getCell(`E${destino}`));
      totalF += safeNumericValue(sheet22.getCell(`F${destino}`));
    }
    console.log(`[ExcelJS] Hoja22 - Totales consolidados:`);
    console.log(`[ExcelJS]   Columna E (Gastos admin): ${totalE}`);
    console.log(`[ExcelJS]   Columna F (Costos ventas): ${totalF}`);
    console.log(`[ExcelJS]   Columna G (E+F): ${totalE + totalF}`);

    console.log('[ExcelJS] Hoja22 completada.');
  }

  // ===============================================
  // HOJA23 (900019): FC02 - Complementario de Ingresos
  // ===============================================
  const sheet23 = workbook.getWorksheet('Hoja23');
  const sheet3ForHoja23 = workbook.getWorksheet('Hoja3');

  if (sheet23 && sheet3ForHoja23) {
    console.log('[ExcelJS] Escribiendo datos en Hoja23 (FC02 - Complementario Ingresos)...');

    const ingresosAcueducto = safeNumericValue(sheet3ForHoja23.getCell('E14'));
    const ingresosAlcantarillado = safeNumericValue(sheet3ForHoja23.getCell('F14'));
    const ingresosAseo = safeNumericValue(sheet3ForHoja23.getCell('G14'));

    console.log(`[ExcelJS] Hoja23 - Valores de Hoja3.fila14:`);
    console.log(`[ExcelJS]   E14 (Acueducto): ${ingresosAcueducto}`);
    console.log(`[ExcelJS]   F14 (Alcantarillado): ${ingresosAlcantarillado}`);
    console.log(`[ExcelJS]   G14 (Aseo): ${ingresosAseo}`);

    writeCellSafe(sheet23, 'I17', ingresosAcueducto);
    writeCellSafe(sheet23, 'K18', ingresosAcueducto);
    console.log(`[ExcelJS] Hoja23 - Acueducto: I17=${ingresosAcueducto}, K18=${ingresosAcueducto}`);

    writeCellSafe(sheet23, 'I22', ingresosAlcantarillado);
    writeCellSafe(sheet23, 'K23', ingresosAlcantarillado);
    console.log(`[ExcelJS] Hoja23 - Alcantarillado: I22=${ingresosAlcantarillado}, K23=${ingresosAlcantarillado}`);

    writeCellSafe(sheet23, 'I28', ingresosAseo);
    writeCellSafe(sheet23, 'K40', ingresosAseo);
    console.log(`[ExcelJS] Hoja23 - Aseo: I28=${ingresosAseo}, K40=${ingresosAseo}`);

    console.log('[ExcelJS] Hoja23 completada.');
  }

  // ===============================================
  // HOJA24 (900021): FC03-1 - CXC Acueducto (Detallado por estrato)
  // ===============================================
  const sheet24 = workbook.getWorksheet('Hoja24');
  const sheet2ForHoja24 = workbook.getWorksheet('Hoja2');

  if (sheet24 && sheet2ForHoja24) {
    console.log('[ExcelJS] Escribiendo datos en Hoja24 (FC03-1 - CXC Acueducto por estrato)...');

    const cxcCorrientes19 = safeNumericValue(sheet2ForHoja24.getCell('I19'));
    const cxcCorrientes20 = safeNumericValue(sheet2ForHoja24.getCell('I20'));
    const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;

    const cxcNoCorrientes43 = safeNumericValue(sheet2ForHoja24.getCell('I43'));
    const cxcNoCorrientes44 = safeNumericValue(sheet2ForHoja24.getCell('I44'));
    const totalCXCNoCorrientes = cxcNoCorrientes43 + cxcNoCorrientes44;

    console.log(`[ExcelJS] Hoja24 - CXC desde Hoja2:`);
    console.log(`[ExcelJS]   Corrientes (I19+I20): ${cxcCorrientes19} + ${cxcCorrientes20} = ${totalCXCCorrientes}`);
    console.log(`[ExcelJS]   No Corrientes (I43+I44): ${cxcNoCorrientes43} + ${cxcNoCorrientes44} = ${totalCXCNoCorrientes}`);

    const estratosResidenciales = [
      { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
      { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
      { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
      { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
      { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
      { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' }
    ];

    const estratosNoResidenciales = [
      { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
      { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
      { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
      { fila: 28, key: 'especial', nombre: 'No residencial especial' }
    ];

    if (options.usuariosEstrato && options.usuariosEstrato.acueducto) {
      console.log('[ExcelJS] Hoja24 - Usando distribución proporcional por usuarios reales');

      const todosLosEstratos = [...estratosResidenciales, ...estratosNoResidenciales];

      let totalUsuarios = 0;
      for (const estrato of todosLosEstratos) {
        const n = Number(options.usuariosEstrato.acueducto[estrato.key]) || 0;
        totalUsuarios += n;
      }

      console.log(`[ExcelJS] Hoja24 - Total usuarios acueducto (todos): ${totalUsuarios}`);

      const rangosVencimiento = [
        { columna: 'J', porcentaje: 0.11 },
        { columna: 'K', porcentaje: 0.09 },
        { columna: 'L', porcentaje: 0.25 },
        { columna: 'M', porcentaje: 0.15 },
        { columna: 'N', porcentaje: 0.20 },
        { columna: 'O', porcentaje: 0.12 },
        { columna: 'P', porcentaje: 0.08 },
        { columna: 'Q', porcentaje: 0.00 },
        { columna: 'R', porcentaje: 0.00 },
      ];

      for (const estrato of todosLosEstratos) {
        const usuarios = Number(options.usuariosEstrato.acueducto[estrato.key]) || 0;
        let valorCorriente = 0, valorNoCorriente = 0;

        if (usuarios > 0 && totalUsuarios > 0) {
          valorCorriente = Math.round(totalCXCCorrientes * usuarios / totalUsuarios);
          valorNoCorriente = Math.round(totalCXCNoCorrientes * usuarios / totalUsuarios);
        }

        writeCellSafe(sheet24, `G${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet24, `H${estrato.fila}`, valorNoCorriente);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;
        writeCellSafe(sheet24, `I${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimiento) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet24, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorLActual = safeNumericValue(sheet24.getCell(`L${estrato.fila}`));
          writeCellSafe(sheet24, `L${estrato.fila}`, valorLActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet24, `S${estrato.fila}`, sumaRangos);

        if (totalCXCEstrato !== 0) {
          const porcentaje = totalUsuarios > 0 ? (usuarios / totalUsuarios * 100).toFixed(2) : '0.00';
          console.log(`[ExcelJS] Hoja24 fila ${estrato.fila} (${estrato.nombre}): usuarios=${usuarios} (${porcentaje}%), I=${totalCXCEstrato}, S=${sumaRangos}`);
        }
      }
    } else {
      console.log('[ExcelJS] Hoja24 - Sin datos de usuarios, usando distribución típica por defecto');

      const rangosVencimiento = [
        { columna: 'J', porcentaje: 0.11 },
        { columna: 'K', porcentaje: 0.09 },
        { columna: 'L', porcentaje: 0.25 },
        { columna: 'M', porcentaje: 0.15 },
        { columna: 'N', porcentaje: 0.20 },
        { columna: 'O', porcentaje: 0.12 },
        { columna: 'P', porcentaje: 0.08 },
        { columna: 'Q', porcentaje: 0.00 },
        { columna: 'R', porcentaje: 0.00 },
      ];

      const distribucionTipica = [
        { fila: 19, porcentaje: 0.25 },
        { fila: 20, porcentaje: 0.30 },
        { fila: 21, porcentaje: 0.20 },
        { fila: 22, porcentaje: 0.10 },
        { fila: 23, porcentaje: 0.05 },
        { fila: 24, porcentaje: 0.03 },
        { fila: 25, porcentaje: 0.02 },
        { fila: 26, porcentaje: 0.03 },
        { fila: 27, porcentaje: 0.01 },
        { fila: 28, porcentaje: 0.01 },
      ];

      for (const estrato of distribucionTipica) {
        const valorCorriente = Math.round(totalCXCCorrientes * estrato.porcentaje);
        const valorNoCorriente = Math.round(totalCXCNoCorrientes * estrato.porcentaje);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;

        writeCellSafe(sheet24, `G${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet24, `H${estrato.fila}`, valorNoCorriente);
        writeCellSafe(sheet24, `I${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimiento) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet24, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorLActual = safeNumericValue(sheet24.getCell(`L${estrato.fila}`));
          writeCellSafe(sheet24, `L${estrato.fila}`, valorLActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet24, `S${estrato.fila}`, sumaRangos);
      }
    }

    console.log(`[ExcelJS] Hoja24 - Totales distribuidos: Corrientes=${totalCXCCorrientes}, No Corrientes=${totalCXCNoCorrientes}, Total=${totalCXCCorrientes + totalCXCNoCorrientes}`);
    console.log('[ExcelJS] Hoja24 completada.');
  }

  // ===============================================
  // HOJA25 (900022): FC03-2 - CXC Alcantarillado (Detallado por estrato)
  // ===============================================
  const sheet25 = workbook.getWorksheet('Hoja25');
  const sheet2ForHoja25 = workbook.getWorksheet('Hoja2');

  if (sheet25 && sheet2ForHoja25) {
    console.log('[ExcelJS] Escribiendo datos en Hoja25 (FC03-2 - CXC Alcantarillado por estrato)...');

    const cxcCorrientes19Alc = safeNumericValue(sheet2ForHoja25.getCell('J19'));
    const cxcCorrientes20Alc = safeNumericValue(sheet2ForHoja25.getCell('J20'));
    const totalCXCCorrientesAlc = cxcCorrientes19Alc + cxcCorrientes20Alc;

    const cxcNoCorrientes43Alc = safeNumericValue(sheet2ForHoja25.getCell('J43'));
    const cxcNoCorrientes44Alc = safeNumericValue(sheet2ForHoja25.getCell('J44'));
    const totalCXCNoCorrientesAlc = cxcNoCorrientes43Alc + cxcNoCorrientes44Alc;

    console.log(`[ExcelJS] Hoja25 - CXC Alcantarillado desde Hoja2:`);
    console.log(`[ExcelJS]   Corrientes (J19+J20): ${cxcCorrientes19Alc} + ${cxcCorrientes20Alc} = ${totalCXCCorrientesAlc}`);
    console.log(`[ExcelJS]   No Corrientes (J43+J44): ${cxcNoCorrientes43Alc} + ${cxcNoCorrientes44Alc} = ${totalCXCNoCorrientesAlc}`);

    const estratosResidencialesAlc = [
      { fila: 19, key: 'estrato1', nombre: 'Residencial Estrato 1' },
      { fila: 20, key: 'estrato2', nombre: 'Residencial Estrato 2' },
      { fila: 21, key: 'estrato3', nombre: 'Residencial Estrato 3' },
      { fila: 22, key: 'estrato4', nombre: 'Residencial Estrato 4' },
      { fila: 23, key: 'estrato5', nombre: 'Residencial Estrato 5' },
      { fila: 24, key: 'estrato6', nombre: 'Residencial Estrato 6' }
    ];

    const estratosNoResidencialesAlc = [
      { fila: 25, key: 'industrial', nombre: 'No residencial industrial' },
      { fila: 26, key: 'comercial', nombre: 'No residencial comercial' },
      { fila: 27, key: 'oficial', nombre: 'No residencial oficial' },
      { fila: 28, key: 'especial', nombre: 'No residencial especial' }
    ];

    const rangosVencimientoAlc = [
      { columna: 'J', porcentaje: 0.11 },
      { columna: 'K', porcentaje: 0.09 },
      { columna: 'L', porcentaje: 0.25 },
      { columna: 'M', porcentaje: 0.15 },
      { columna: 'N', porcentaje: 0.20 },
      { columna: 'O', porcentaje: 0.12 },
      { columna: 'P', porcentaje: 0.08 },
      { columna: 'Q', porcentaje: 0.00 },
      { columna: 'R', porcentaje: 0.00 },
    ];

    if (options.usuariosEstrato && options.usuariosEstrato.alcantarillado) {
      console.log('[ExcelJS] Hoja25 - Usando distribución proporcional por usuarios reales');

      const todosLosEstratosAlc = [...estratosResidencialesAlc, ...estratosNoResidencialesAlc];

      let totalUsuariosAlc = 0;
      for (const estrato of todosLosEstratosAlc) {
        const n = Number(options.usuariosEstrato.alcantarillado[estrato.key]) || 0;
        totalUsuariosAlc += n;
      }

      console.log(`[ExcelJS] Hoja25 - Total usuarios alcantarillado (todos): ${totalUsuariosAlc}`);

      for (const estrato of todosLosEstratosAlc) {
        const usuarios = Number(options.usuariosEstrato.alcantarillado[estrato.key]) || 0;
        let valorCorriente = 0, valorNoCorriente = 0;

        if (usuarios > 0 && totalUsuariosAlc > 0) {
          valorCorriente = Math.round(totalCXCCorrientesAlc * usuarios / totalUsuariosAlc);
          valorNoCorriente = Math.round(totalCXCNoCorrientesAlc * usuarios / totalUsuariosAlc);
        }

        writeCellSafe(sheet25, `G${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet25, `H${estrato.fila}`, valorNoCorriente);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;
        writeCellSafe(sheet25, `I${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimientoAlc) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet25, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorLActual = safeNumericValue(sheet25.getCell(`L${estrato.fila}`));
          writeCellSafe(sheet25, `L${estrato.fila}`, valorLActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet25, `S${estrato.fila}`, sumaRangos);

        if (totalCXCEstrato !== 0) {
          const porcentaje = totalUsuariosAlc > 0 ? (usuarios / totalUsuariosAlc * 100).toFixed(2) : '0.00';
          console.log(`[ExcelJS] Hoja25 fila ${estrato.fila} (${estrato.nombre}): usuarios=${usuarios} (${porcentaje}%), I=${totalCXCEstrato}, S=${sumaRangos}`);
        }
      }
    } else {
      console.log('[ExcelJS] Hoja25 - Sin datos de usuarios, usando distribución típica por defecto');

      const distribucionTipicaAlc = [
        { fila: 19, porcentaje: 0.25 },
        { fila: 20, porcentaje: 0.30 },
        { fila: 21, porcentaje: 0.20 },
        { fila: 22, porcentaje: 0.10 },
        { fila: 23, porcentaje: 0.05 },
        { fila: 24, porcentaje: 0.03 },
        { fila: 25, porcentaje: 0.02 },
        { fila: 26, porcentaje: 0.03 },
        { fila: 27, porcentaje: 0.01 },
        { fila: 28, porcentaje: 0.01 },
      ];

      for (const estrato of distribucionTipicaAlc) {
        const valorCorriente = Math.round(totalCXCCorrientesAlc * estrato.porcentaje);
        const valorNoCorriente = Math.round(totalCXCNoCorrientesAlc * estrato.porcentaje);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;

        writeCellSafe(sheet25, `G${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet25, `H${estrato.fila}`, valorNoCorriente);
        writeCellSafe(sheet25, `I${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimientoAlc) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet25, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorLActual = safeNumericValue(sheet25.getCell(`L${estrato.fila}`));
          writeCellSafe(sheet25, `L${estrato.fila}`, valorLActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet25, `S${estrato.fila}`, sumaRangos);
      }
    }

    console.log(`[ExcelJS] Hoja25 - Totales distribuidos: Corrientes=${totalCXCCorrientesAlc}, No Corrientes=${totalCXCNoCorrientesAlc}, Total=${totalCXCCorrientesAlc + totalCXCNoCorrientesAlc}`);
    console.log('[ExcelJS] Hoja25 completada.');
  }

  // ===============================================
  // HOJA26 (900023): FC03-3 - CXC Aseo (Detallado por estrato)
  // DIFERENCIAS: columnas E/F/G (no G/H/I), filas empiezan en 15, rangos en H-P, suma en Q
  // ===============================================
  const sheet26 = workbook.getWorksheet('Hoja26');
  const sheet2ForHoja26 = workbook.getWorksheet('Hoja2');

  if (sheet26 && sheet2ForHoja26) {
    console.log('[ExcelJS] Escribiendo datos en Hoja26 (FC03-3 - CXC Aseo por estrato)...');

    const cxcCorrientes19Aseo = safeNumericValue(sheet2ForHoja26.getCell('K19'));
    const cxcCorrientes20Aseo = safeNumericValue(sheet2ForHoja26.getCell('K20'));
    const totalCXCCorrientesAseo = cxcCorrientes19Aseo + cxcCorrientes20Aseo;

    const cxcNoCorrientes43Aseo = safeNumericValue(sheet2ForHoja26.getCell('K43'));
    const cxcNoCorrientes44Aseo = safeNumericValue(sheet2ForHoja26.getCell('K44'));
    const totalCXCNoCorrientesAseo = cxcNoCorrientes43Aseo + cxcNoCorrientes44Aseo;

    console.log(`[ExcelJS] Hoja26 - CXC Aseo desde Hoja2:`);
    console.log(`[ExcelJS]   Corrientes (K19+K20): ${cxcCorrientes19Aseo} + ${cxcCorrientes20Aseo} = ${totalCXCCorrientesAseo}`);
    console.log(`[ExcelJS]   No Corrientes (K43+K44): ${cxcNoCorrientes43Aseo} + ${cxcNoCorrientes44Aseo} = ${totalCXCNoCorrientesAseo}`);

    const estratosResidencialesAseo = [
      { fila: 15, key: 'estrato1', nombre: 'Residencial Estrato 1' },
      { fila: 16, key: 'estrato2', nombre: 'Residencial Estrato 2' },
      { fila: 17, key: 'estrato3', nombre: 'Residencial Estrato 3' },
      { fila: 18, key: 'estrato4', nombre: 'Residencial Estrato 4' },
      { fila: 19, key: 'estrato5', nombre: 'Residencial Estrato 5' },
      { fila: 20, key: 'estrato6', nombre: 'Residencial Estrato 6' }
    ];

    const estratosNoResidencialesAseo = [
      { fila: 21, key: 'industrial', nombre: 'No residencial industrial' },
      { fila: 22, key: 'comercial', nombre: 'No residencial comercial' },
      { fila: 23, key: 'oficial', nombre: 'No residencial oficial' },
      { fila: 24, key: 'especial', nombre: 'No residencial especial' }
    ];

    const rangosVencimientoAseo = [
      { columna: 'H', porcentaje: 0.11 },
      { columna: 'I', porcentaje: 0.09 },
      { columna: 'J', porcentaje: 0.25 },
      { columna: 'K', porcentaje: 0.15 },
      { columna: 'L', porcentaje: 0.20 },
      { columna: 'M', porcentaje: 0.12 },
      { columna: 'N', porcentaje: 0.08 },
      { columna: 'O', porcentaje: 0.00 },
      { columna: 'P', porcentaje: 0.00 },
    ];

    if (options.usuariosEstrato && options.usuariosEstrato.aseo) {
      console.log('[ExcelJS] Hoja26 - Usando distribución proporcional por usuarios reales');

      const todosLosEstratosAseo = [...estratosResidencialesAseo, ...estratosNoResidencialesAseo];

      let totalUsuariosAseo = 0;
      for (const estrato of todosLosEstratosAseo) {
        const n = Number(options.usuariosEstrato.aseo[estrato.key]) || 0;
        totalUsuariosAseo += n;
      }

      console.log(`[ExcelJS] Hoja26 - Total usuarios aseo (todos): ${totalUsuariosAseo}`);

      for (const estrato of todosLosEstratosAseo) {
        const usuarios = Number(options.usuariosEstrato.aseo[estrato.key]) || 0;
        let valorCorriente = 0, valorNoCorriente = 0;

        if (usuarios > 0 && totalUsuariosAseo > 0) {
          valorCorriente = Math.round(totalCXCCorrientesAseo * usuarios / totalUsuariosAseo);
          valorNoCorriente = Math.round(totalCXCNoCorrientesAseo * usuarios / totalUsuariosAseo);
        }

        writeCellSafe(sheet26, `E${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet26, `F${estrato.fila}`, valorNoCorriente);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;
        writeCellSafe(sheet26, `G${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimientoAseo) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet26, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorJActual = safeNumericValue(sheet26.getCell(`J${estrato.fila}`));
          writeCellSafe(sheet26, `J${estrato.fila}`, valorJActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet26, `Q${estrato.fila}`, sumaRangos);

        if (totalCXCEstrato !== 0) {
          const porcentaje = totalUsuariosAseo > 0 ? (usuarios / totalUsuariosAseo * 100).toFixed(2) : '0.00';
          console.log(`[ExcelJS] Hoja26 fila ${estrato.fila} (${estrato.nombre}): usuarios=${usuarios} (${porcentaje}%), G=${totalCXCEstrato}, Q=${sumaRangos}`);
        }
      }
    } else {
      console.log('[ExcelJS] Hoja26 - Sin datos de usuarios, usando distribución típica por defecto');

      const distribucionTipicaAseo = [
        { fila: 15, porcentaje: 0.25 },
        { fila: 16, porcentaje: 0.30 },
        { fila: 17, porcentaje: 0.20 },
        { fila: 18, porcentaje: 0.10 },
        { fila: 19, porcentaje: 0.05 },
        { fila: 20, porcentaje: 0.03 },
        { fila: 21, porcentaje: 0.02 },
        { fila: 22, porcentaje: 0.03 },
        { fila: 23, porcentaje: 0.01 },
        { fila: 24, porcentaje: 0.01 },
      ];

      for (const estrato of distribucionTipicaAseo) {
        const valorCorriente = Math.round(totalCXCCorrientesAseo * estrato.porcentaje);
        const valorNoCorriente = Math.round(totalCXCNoCorrientesAseo * estrato.porcentaje);
        const totalCXCEstrato = valorCorriente + valorNoCorriente;

        writeCellSafe(sheet26, `E${estrato.fila}`, valorCorriente);
        writeCellSafe(sheet26, `F${estrato.fila}`, valorNoCorriente);
        writeCellSafe(sheet26, `G${estrato.fila}`, totalCXCEstrato);

        let sumaRangos = 0;
        for (const rango of rangosVencimientoAseo) {
          const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
          writeCellSafe(sheet26, `${rango.columna}${estrato.fila}`, valorRango);
          sumaRangos += valorRango;
        }

        const diferencia = totalCXCEstrato - sumaRangos;
        if (diferencia !== 0) {
          const valorJActual = safeNumericValue(sheet26.getCell(`J${estrato.fila}`));
          writeCellSafe(sheet26, `J${estrato.fila}`, valorJActual + diferencia);
          sumaRangos = totalCXCEstrato;
        }
        writeCellSafe(sheet26, `Q${estrato.fila}`, sumaRangos);
      }
    }

    console.log(`[ExcelJS] Hoja26 - Totales distribuidos: Corrientes=${totalCXCCorrientesAseo}, No Corrientes=${totalCXCNoCorrientesAseo}, Total=${totalCXCCorrientesAseo + totalCXCNoCorrientesAseo}`);
    console.log('[ExcelJS] Hoja26 completada.');
  }

  // ===============================================
  // HOJA30 (900027): FC04 - Información Subsidios y Contribuciones
  // ===============================================
  const sheet30 = workbook.getWorksheet('Hoja30');

  if (sheet30 && options.usuariosEstrato && options.subsidios) {
    console.log('[ExcelJS] Escribiendo datos en Hoja30 (FC04 - Subsidios y Contribuciones)...');

    const estratosSubsidiables = ['estrato1', 'estrato2', 'estrato3'];
    const serviciosSubsidios = ['acueducto', 'alcantarillado', 'aseo'] as const;

    const subsidiosPorServicio = options.subsidios;
    const usuariosPorEstrato = options.usuariosEstrato;

    const distribucionPorEstrato: Record<string, Record<string, number>> = {
      acueducto: {},
      alcantarillado: {},
      aseo: {}
    };
    const totalPorEstrato: Record<string, number> = { 'estrato1': 0, 'estrato2': 0, 'estrato3': 0 };

    for (const servicio of serviciosSubsidios) {
      const subsidio = Number(subsidiosPorServicio[servicio]) || 0;

      let totalUsuarios = 0;
      for (const estrato of estratosSubsidiables) {
        const n = Number(usuariosPorEstrato[servicio]?.[estrato]) || 0;
        totalUsuarios += n;
      }

      console.log(`[ExcelJS] Hoja30 - ${servicio}: subsidio=${subsidio}, totalUsuarios123=${totalUsuarios}`);

      for (const estrato of estratosSubsidiables) {
        const usuarios = Number(usuariosPorEstrato[servicio]?.[estrato]) || 0;
        let valor = 0;

        if (usuarios > 0 && totalUsuarios > 0 && subsidio > 0) {
          valor = Math.round(subsidio * usuarios / totalUsuarios);
        }

        distribucionPorEstrato[servicio][estrato] = valor;
        totalPorEstrato[estrato] += valor;
      }
    }

    writeCellSafe(sheet30, 'E14', distribucionPorEstrato.acueducto['estrato1']);
    writeCellSafe(sheet30, 'E15', distribucionPorEstrato.acueducto['estrato2']);
    writeCellSafe(sheet30, 'E16', distribucionPorEstrato.acueducto['estrato3']);

    writeCellSafe(sheet30, 'F14', distribucionPorEstrato.alcantarillado['estrato1']);
    writeCellSafe(sheet30, 'F15', distribucionPorEstrato.alcantarillado['estrato2']);
    writeCellSafe(sheet30, 'F16', distribucionPorEstrato.alcantarillado['estrato3']);

    writeCellSafe(sheet30, 'G14', distribucionPorEstrato.aseo['estrato1']);
    writeCellSafe(sheet30, 'G15', distribucionPorEstrato.aseo['estrato2']);
    writeCellSafe(sheet30, 'G16', distribucionPorEstrato.aseo['estrato3']);

    writeCellSafe(sheet30, 'K14', totalPorEstrato['estrato1']);
    writeCellSafe(sheet30, 'K15', totalPorEstrato['estrato2']);
    writeCellSafe(sheet30, 'K16', totalPorEstrato['estrato3']);

    console.log('[ExcelJS] Hoja30 (FC04) - Distribución de subsidios por estrato y servicio:');
    for (const estrato of estratosSubsidiables) {
      console.log(`  Estrato ${estrato}: Acueducto=${distribucionPorEstrato.acueducto[estrato]}, Alcantarillado=${distribucionPorEstrato.alcantarillado[estrato]}, Aseo=${distribucionPorEstrato.aseo[estrato]}, Total=${totalPorEstrato[estrato]}`);
    }

    console.log('[ExcelJS] Hoja30 completada.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5 — Pasivos y conciliación: Hoja32/35 (~L1491-1620)
  // Candidato de extracción: official/rewriters/liabilitiesAndReconciliationRewriter.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // ===============================================
  // HOJA32 (900028b): FC05b - Clase de pasivo por edades de vencimiento
  // ===============================================
  const sheet32 = workbook.getWorksheet('Hoja32');
  const sheet2ForHoja32 = workbook.getWorksheet('Hoja2');

  if (sheet32 && sheet2ForHoja32) {
    console.log('[ExcelJS] Escribiendo datos en Hoja32 (FC05b - Pasivos por edades de vencimiento)...');

    const getValorHoja2 = (filas: number[]): number => {
      let suma = 0;
      for (const fila of filas) {
        const valor = sheet2ForHoja32.getCell(`P${fila}`).value;
        if (typeof valor === 'number') {
          suma += valor;
        } else if (valor && typeof valor === 'object' && 'result' in valor) {
          suma += (valor as { result: number }).result || 0;
        }
      }
      return suma;
    };

    const mapeoHoja32aHoja2 = [
      { fila32: 15, nombre: 'Nómina por pagar', filasCorrientes: [69], filasNoCorrientes: [] },
      { fila32: 16, nombre: 'Prestaciones sociales por pagar', filasCorrientes: [], filasNoCorrientes: [91] },
      { fila32: 17, nombre: 'Cuentas comerciales por pagar por adquisición de bienes y servicios', filasCorrientes: [73, 74, 76], filasNoCorrientes: [95] },
      { fila32: 18, nombre: 'Impuestos por pagar', filasCorrientes: [80], filasNoCorrientes: [] },
      { fila32: 19, nombre: 'Cuentas por pagar a partes relacionadas y asociadas', filasCorrientes: [75], filasNoCorrientes: [] },
      { fila32: 20, nombre: 'Obligaciones financieras por pagar', filasCorrientes: [78, 79], filasNoCorrientes: [100, 101] },
      { fila32: 21, nombre: 'Ingresos recibidos por anticipado e ingresos diferidos', filasCorrientes: [82], filasNoCorrientes: [105] },
      { fila32: 22, nombre: 'Pasivos por impuestos diferidos', filasCorrientes: [83], filasNoCorrientes: [103] },
      { fila32: 23, nombre: 'Provisiones', filasCorrientes: [70], filasNoCorrientes: [92] },
      { fila32: 24, nombre: 'Tasas ambientales y tasas de uso por pagar', filasCorrientes: [], filasNoCorrientes: [] },
      { fila32: 25, nombre: 'Otras tasas y contribuciones por pagar', filasCorrientes: [], filasNoCorrientes: [] },
      { fila32: 26, nombre: 'Pasivos pretoma (Solo intervenidas)', filasCorrientes: [], filasNoCorrientes: [] },
      { fila32: 27, nombre: 'Recursos recibidos en administración', filasCorrientes: [], filasNoCorrientes: [] },
      { fila32: 28, nombre: 'Recursos recibidos a favor de terceros', filasCorrientes: [], filasNoCorrientes: [] },
      { fila32: 29, nombre: 'Otros pasivos', filasCorrientes: [86, 87], filasNoCorrientes: [108] },
    ];

    const porcentajesAntiguedad = {
      noVencido: 0.11,
      hasta30: 0.09,
      hasta60: 0.25,
      hasta90: 0.15,
      hasta180: 0.20,
      hasta360: 0.12,
      mayor360: 0.08,
    };

    let totalCorrientes = 0;
    let totalNoCorrientes = 0;
    let totalGeneral = 0;

    for (const mapeo of mapeoHoja32aHoja2) {
      const valorCorriente = getValorHoja2(mapeo.filasCorrientes);
      const valorNoCorriente = getValorHoja2(mapeo.filasNoCorrientes);
      const valorTotal = valorCorriente + valorNoCorriente;

      totalCorrientes += valorCorriente;
      totalNoCorrientes += valorNoCorriente;
      totalGeneral += valorTotal;

      if (valorCorriente !== 0) {
        writeCellSafe(sheet32, `D${mapeo.fila32}`, valorCorriente);
      }

      if (valorNoCorriente !== 0) {
        writeCellSafe(sheet32, `F${mapeo.fila32}`, valorNoCorriente);
      }

      if (valorTotal !== 0) {
        writeCellSafe(sheet32, `E${mapeo.fila32}`, valorTotal);

        const noVencido = Math.round(valorTotal * porcentajesAntiguedad.noVencido);
        const hasta30 = Math.round(valorTotal * porcentajesAntiguedad.hasta30);
        const hasta60 = Math.round(valorTotal * porcentajesAntiguedad.hasta60);
        const hasta90 = Math.round(valorTotal * porcentajesAntiguedad.hasta90);
        const hasta180 = Math.round(valorTotal * porcentajesAntiguedad.hasta180);
        const hasta360 = Math.round(valorTotal * porcentajesAntiguedad.hasta360);
        const mayor360 = Math.round(valorTotal * porcentajesAntiguedad.mayor360);

        const totalVencidos = hasta30 + hasta60 + hasta90 + hasta180 + hasta360 + mayor360;
        const totalH = noVencido + totalVencidos;
        const diferencia = valorTotal - totalH;
        const hasta60Ajustado = hasta60 + diferencia;

        writeCellSafe(sheet32, `G${mapeo.fila32}`, noVencido);
        writeCellSafe(sheet32, `I${mapeo.fila32}`, hasta30);
        writeCellSafe(sheet32, `K${mapeo.fila32}`, hasta60Ajustado);
        writeCellSafe(sheet32, `L${mapeo.fila32}`, hasta90);
        writeCellSafe(sheet32, `M${mapeo.fila32}`, hasta180);
        writeCellSafe(sheet32, `N${mapeo.fila32}`, hasta360);
        writeCellSafe(sheet32, `O${mapeo.fila32}`, mayor360);
        writeCellSafe(sheet32, `J${mapeo.fila32}`, totalVencidos + diferencia);
        writeCellSafe(sheet32, `H${mapeo.fila32}`, valorTotal);

        console.log(`[ExcelJS] Hoja32 fila ${mapeo.fila32} (${mapeo.nombre}): D=${valorCorriente}, F=${valorNoCorriente}, E=${valorTotal}`);
      }
    }

    console.log(`[ExcelJS] Hoja32 - Resumen:`);
    console.log(`[ExcelJS]   Total Pasivos Corrientes: ${totalCorrientes}`);
    console.log(`[ExcelJS]   Total Pasivos No Corrientes: ${totalNoCorrientes}`);
    console.log(`[ExcelJS]   Total General: ${totalGeneral}`);

    console.log('[ExcelJS] Hoja32 completada.');
  }

  // ===============================================
  // HOJA35 (900031): FC08 - Conciliación de ingresos
  // ===============================================
  const sheet35 = workbook.getWorksheet('Hoja35');
  const sheet3ForHoja35 = workbook.getWorksheet('Hoja3');

  if (sheet35 && sheet3ForHoja35) {
    console.log('[ExcelJS] Escribiendo datos en Hoja35 (FC08 - Conciliación de ingresos)...');

    const ingresosAcueducto35 = safeNumericValue(sheet3ForHoja35.getCell('E14'));
    const ingresosAlcantarillado35 = safeNumericValue(sheet3ForHoja35.getCell('F14'));
    const ingresosAseo35 = safeNumericValue(sheet3ForHoja35.getCell('G14'));

    writeCellSafe(sheet35, 'G26', ingresosAcueducto35);
    writeCellSafe(sheet35, 'H26', ingresosAlcantarillado35);
    writeCellSafe(sheet35, 'I26', ingresosAseo35);

    console.log(`[ExcelJS] Hoja35 - Ingresos por prestación de servicios (fila 26):`);
    console.log(`[ExcelJS]   G26 (Acueducto): ${ingresosAcueducto35}`);
    console.log(`[ExcelJS]   H26 (Alcantarillado): ${ingresosAlcantarillado35}`);
    console.log(`[ExcelJS]   I26 (Aseo): ${ingresosAseo35}`);

    console.log('[ExcelJS] Hoja35 completada.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOJA9 (800500) y HOJA10 (800600): Notas y Políticas contables
  // Reutiliza R414TemplateService que ya tiene las 57 notas y 33 políticas.
  // ═══════════════════════════════════════════════════════════════════════════
  const r414Opts = {
    companyName: options.companyName,
    companyId: options.companyId,
    reportDate: options.reportDate,
    niifGroup: 'r414',
    accounts: options.consolidatedAccounts || [],
    serviceBalances: options.serviceBalances || [],
    distribution: {},
  } as R414Options;

  const sheet9 = workbook.getWorksheet('Hoja9');
  if (sheet9) {
    r414TemplateService.fillHoja9Sheet(sheet9, r414Opts);
  }

  const sheet10 = workbook.getWorksheet('Hoja10');
  if (sheet10) {
    r414TemplateService.fillHoja10Sheet(sheet10, r414Opts);
  }
}
