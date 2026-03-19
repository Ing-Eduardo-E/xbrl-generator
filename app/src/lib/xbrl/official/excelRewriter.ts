/**
 * Reescritura de datos financieros en workbooks Excel con ExcelJS.
 * Contiene rewriteFinancialDataWithExcelJS y sus helpers.
 * Extraído de officialTemplateService.ts (L2371–4433).
 *
 * DEPENDENCIAS:
 * - ServiceBalanceData, TemplateWithDataOptions: importados desde ./interfaces
 * - R414_*_MAPPINGS, R414_SERVICE_COLUMNS: importados desde ../r414/mappings
 */
import ExcelJS from 'exceljs';
import type { TemplateWithDataOptions, ServiceBalanceData } from './interfaces';
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
import { rewriteGrupoData } from '../grupos';

// ─── (Índice de secciones del body — ver marcadores ═══ abajo) ──────────
// ─── Sección 1: Función principal + helpers de init (~L29-76)   ─────────
// ─── Sección 2: R414 Hoja2/3/7 - ESF, ER y Notas PPE (~L77-280) ────────
// ─── Sección 3: Hoja16/17/18 - Gastos por servicio (~L281-856) ──────────
// ─── Sección 4: Hoja22/23/24/25/26/30 - Consolidados y CxC (~L857-1474) ─
// ─── Sección 5: Hoja32/35 - Pasivos y conciliación (~L1475-1613) ────────

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — Función principal, workbook setup y helpers de inicialización (~L31-75)
// Candidato de extracción: official/rewriters/rewriterCore.ts
// ═══════════════════════════════════════════════════════════════════════════

export async function rewriteFinancialDataWithExcelJS(
  xlsxBuffer: Buffer,
  options: TemplateWithDataOptions
): Promise<Buffer> {
  // Si no hay datos financieros, retornar el buffer sin cambios
  if (!options.consolidatedAccounts || options.consolidatedAccounts.length === 0) {
    return xlsxBuffer;
  }

  const workbook = new ExcelJS.Workbook();
  // ExcelJS load() declara Buffer pero su definición de tipos es incompatible con
  // Buffer<ArrayBufferLike> de Node — cast inevitable hasta que ExcelJS actualice sus tipos.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(xlsxBuffer as any);

  const serviceBalances = options.serviceBalances || [];
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  // Agrupar cuentas por servicio
  const accountsByService: Record<string, ServiceBalanceData[]> = {};
  for (const service of activeServices) {
    accountsByService[service] = (serviceBalances as ServiceBalanceData[]).filter(sb => sb.service === service);
  }

  // Función helper para verificar si una cuenta coincide con los prefijos
  const matchesPrefixes = (code: string, prefixes: string[], excludes?: string[]): boolean => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2 — R414: Hoja2 (ESF) + Hoja3 (ER) + Hoja7 (Notas PPE) (~L68-281)
  // Candidato de extracción: official/rewriters/r414FinancialStatementsRewriter.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // Solo procesar R414 por ahora
  if (options.niifGroup === 'r414') {
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
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += account.value;
          }
        }

        // Escribir valor total en columna P (columna 16)
        if (totalValue !== 0) {
          const cell = sheet2.getCell(`P${mapping.row}`);
          cell.value = totalValue;
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
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += account.value;
            }
          }

          if (serviceValue !== 0) {
            const cell = sheet2.getCell(`${serviceColumn}${mapping.row}`);
            cell.value = serviceValue;
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
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += account.value;
          }
        }

        // Escribir valor total en columna L (columna 12) - SIEMPRE escribir, incluso si es 0
        const cellL = sheet3.getCell(`L${mapping.row}`);
        cellL.value = totalValue;
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
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += account.value;
            }
          }

          // SIEMPRE escribir el valor, incluso si es 0, para limpiar valores previos del template
          const cell = sheet3.getCell(`${serviceColumn}${mapping.row}`);
          cell.value = serviceValue;
          if (serviceValue !== 0) {
            console.log(`[ExcelJS] Hoja3!${serviceColumn}${mapping.row} = ${serviceValue}`);
          }
        }
      }

      // DEBUG: Verificar que las cuentas usadas para Hoja3.E18 son las mismas que Hoja16
      const acueductoAccounts3 = accountsByService['acueducto'] || [];
      let suma51 = 0, suma52 = 0;
      for (const account of acueductoAccounts3) {
        if (!account.isLeaf) continue;
        if (account.code.startsWith('51')) suma51 += account.value;
        if (account.code.startsWith('52')) suma52 += account.value;
      }
      console.log(`[ExcelJS] Hoja3 - DEBUG Acueducto: cuenta 51 = ${suma51}, cuenta 52 = ${suma52}, total = ${suma51 + suma52}`);
    }
  }

  // ===============================================
  // HOJA7 (800100): Notas - Subclasificaciones PPE
  // Solo para R414 - Columna F (consolidado)
  // ===============================================
  if (options.niifGroup === 'r414') {
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
            if (!account.isLeaf) continue;
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
            const cell = sheet7.getCell(`F${row}`);
            cell.value = value;
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
          if (!account.isLeaf) continue;
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
      sheet16.getCell('E13').value = beneficiosEmpleados;
      console.log(`[ExcelJS] Hoja16!E13 (Beneficios empleados) = ${beneficiosEmpleados}`);

      // Fila 14: Honorarios
      const honorarios = sumByPrefixes16(acueductoAccounts, ['5110']);
      sheet16.getCell('E14').value = honorarios;
      console.log(`[ExcelJS] Hoja16!E14 (Honorarios) = ${honorarios}`);

      // Fila 15: Impuestos, Tasas y Contribuciones (No incluye impuesto de renta)
      const impuestosTasas = sumByPrefixes16(acueductoAccounts, ['5120']);
      sheet16.getCell('E15').value = impuestosTasas;
      console.log(`[ExcelJS] Hoja16!E15 (Impuestos y tasas) = ${impuestosTasas}`);

      // Fila 16: Generales
      const generales = sumByPrefixes16(acueductoAccounts, ['5111']);
      sheet16.getCell('E16').value = generales;
      console.log(`[ExcelJS] Hoja16!E16 (Generales) = ${generales}`);

      // Fila 17: Deterioro
      const deterioro = sumByPrefixes16(acueductoAccounts, ['5350']);
      sheet16.getCell('E17').value = deterioro;
      console.log(`[ExcelJS] Hoja16!E17 (Deterioro) = ${deterioro}`);

      // Fila 18: Depreciación
      const depreciacion = sumByPrefixes16(acueductoAccounts, ['5360']);
      sheet16.getCell('E18').value = depreciacion;
      console.log(`[ExcelJS] Hoja16!E18 (Depreciación) = ${depreciacion}`);

      // Fila 19: Amortización
      const amortizacion = sumByPrefixes16(acueductoAccounts, ['5365']);
      sheet16.getCell('E19').value = amortizacion;
      console.log(`[ExcelJS] Hoja16!E19 (Amortización) = ${amortizacion}`);

      // =====================================================
      // PROVISIONES (Filas 20-24)
      // =====================================================

      // Fila 21: Litigios y demandas
      const litigios = sumByPrefixes16(acueductoAccounts, ['537001', '537002']);
      sheet16.getCell('E21').value = litigios;

      // Fila 22: Garantías
      const garantias = sumByPrefixes16(acueductoAccounts, ['537003']);
      sheet16.getCell('E22').value = garantias;

      // Fila 23: Diversas (otras provisiones)
      const provisionesDiversas = sumByPrefixes16(acueductoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet16.getCell('E23').value = provisionesDiversas;

      // Fila 25: Arrendamientos
      const arrendamientos = sumByPrefixes16(acueductoAccounts, ['5115', '5124']);
      sheet16.getCell('E25').value = arrendamientos;
      console.log(`[ExcelJS] Hoja16!E25 (Arrendamientos) = ${arrendamientos}`);

      // =====================================================
      // OTROS GASTOS (Filas 26-33)
      // =====================================================

      // Fila 27: Comisiones
      const comisiones = sumByPrefixes16(acueductoAccounts, ['5125']);
      sheet16.getCell('E27').value = comisiones;

      // Fila 28: Ajuste por diferencia en cambio
      const diferenciaEnCambio = sumByPrefixes16(acueductoAccounts, ['5807']);
      sheet16.getCell('E28').value = diferenciaEnCambio;

      // Fila 29: Financieros (Costos financieros - Hoja3 fila 20)
      const financieros = sumByPrefixes16(acueductoAccounts, ['5802', '5803']);
      sheet16.getCell('E29').value = financieros;
      console.log(`[ExcelJS] Hoja16!E29 (Financieros) = ${financieros}`);

      // Fila 30: Pérdidas por aplicación del método de participación patrimonial
      const perdidasMPP = sumByPrefixes16(acueductoAccounts, ['5815']);
      sheet16.getCell('E30').value = perdidasMPP;
      console.log(`[ExcelJS] Hoja16!E30 (Pérdidas MPP) = ${perdidasMPP}`);

      // Fila 31: Gastos diversos
      const gastosDiversos = sumByPrefixes16(acueductoAccounts, ['5195', '5895']);
      sheet16.getCell('E31').value = gastosDiversos;
      console.log(`[ExcelJS] Hoja16!E31 (Gastos diversos) = ${gastosDiversos}`);

      // Fila 32: Donaciones
      const donaciones = sumByPrefixes16(acueductoAccounts, ['5423']);
      sheet16.getCell('E32').value = donaciones;
      console.log(`[ExcelJS] Hoja16!E32 (Donaciones) = ${donaciones}`);

      // =====================================================
      // GANANCIAS (Fila 33) - Si hay ganancias por MPP van aquí
      // PUC: 4815 - Ganancias por método de participación patrimonial (ingreso)
      // Nota: Se muestra como valor NEGATIVO para restar del total de gastos
      // =====================================================
      const gananciasMPP = sumByPrefixes16(acueductoAccounts, ['4815']);
      if (gananciasMPP !== 0) {
        sheet16.getCell('E33').value = -gananciasMPP;
        console.log(`[ExcelJS] Hoja16!E33 (Ganancias MPP) = ${-gananciasMPP}`);
      } else {
        sheet16.getCell('E33').value = 0;
      }

      // =====================================================
      // IMPUESTOS A LAS GANANCIAS (Filas 34-35)
      // =====================================================

      // Fila 34: Impuesto a las ganancias corrientes
      const impuestoRentaCorriente = sumByPrefixes16(acueductoAccounts, ['540101']);
      sheet16.getCell('E34').value = impuestoRentaCorriente;
      console.log(`[ExcelJS] Hoja16!E34 (Imp. renta corriente) = ${impuestoRentaCorriente}`);

      // Fila 35: Impuesto a las ganancias diferido
      const impuestoRentaDiferido = sumByPrefixes16(acueductoAccounts, ['5410'], ['540101']);
      sheet16.getCell('E35').value = impuestoRentaDiferido;
      console.log(`[ExcelJS] Hoja16!E35 (Imp. renta diferido) = ${impuestoRentaDiferido}`);

      // =====================================================
      // SERVICIOS PÚBLICOS, MANTENIMIENTO, SEGUROS, OTROS
      // =====================================================

      // Fila 72: Órdenes y contratos de mantenimiento y reparaciones
      const mantenimiento = sumByPrefixes16(acueductoAccounts, ['5140', '5145']);
      sheet16.getCell('E72').value = mantenimiento;
      console.log(`[ExcelJS] Hoja16!E72 (Mantenimiento) = ${mantenimiento}`);

      // Fila 77: Servicios públicos
      const serviciosPublicos = sumByPrefixes16(acueductoAccounts, ['5135']);
      sheet16.getCell('E77').value = serviciosPublicos;
      console.log(`[ExcelJS] Hoja16!E77 (Servicios públicos) = ${serviciosPublicos}`);

      // Fila 80: Seguros
      const seguros = sumByPrefixes16(acueductoAccounts, ['5130']);
      sheet16.getCell('E80').value = seguros;
      console.log(`[ExcelJS] Hoja16!E80 (Seguros) = ${seguros}`);

      // Fila 81: Órdenes y contratos por otros servicios
      const otrosContratos = sumByPrefixes16(acueductoAccounts, ['5150', '5155']);
      sheet16.getCell('E81').value = otrosContratos;
      console.log(`[ExcelJS] Hoja16!E81 (Otros contratos) = ${otrosContratos}`);

      // =====================================================
      // COLUMNA F - GASTOS OPERATIVOS / COSTOS DE VENTAS
      // PUC: Clase 6 - Costos de ventas
      // Todos van a la fila 72 "Órdenes y contratos de mantenimiento"
      // =====================================================

      const costosVentasTotal = sumByPrefixes16(acueductoAccounts, ['6']);
      sheet16.getCell('F72').value = costosVentasTotal;
      console.log(`[ExcelJS] Hoja16!F72 (Costos de ventas total) = ${costosVentasTotal}`);

      // Limpiar otras celdas de la columna F que puedan tener valores previos
      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 77, 80, 81]) {
        sheet16.getCell(`F${row}`).value = 0;
      }

      // =====================================================
      // COLUMNA G - TOTAL (E + F)
      // =====================================================
      const filasConDatos16 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
      for (const row of filasConDatos16) {
        const valorE = sheet16.getCell(`E${row}`).value as number || 0;
        const valorF = sheet16.getCell(`F${row}`).value as number || 0;
        sheet16.getCell(`G${row}`).value = valorE + valorF;
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
        if (!account.isLeaf) continue;
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
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
            total += account.value;
          }
        }
        return total;
      };

      const beneficiosEmpleados17 = sumByPrefixes17(alcantarilladoAccounts, ['5101', '5103', '5104', '5107', '5108']);
      sheet17.getCell('E13').value = beneficiosEmpleados17;
      console.log(`[ExcelJS] Hoja17!E13 (Beneficios empleados) = ${beneficiosEmpleados17}`);

      const honorarios17 = sumByPrefixes17(alcantarilladoAccounts, ['5110']);
      sheet17.getCell('E14').value = honorarios17;
      console.log(`[ExcelJS] Hoja17!E14 (Honorarios) = ${honorarios17}`);

      const impuestosTasas17 = sumByPrefixes17(alcantarilladoAccounts, ['5120']);
      sheet17.getCell('E15').value = impuestosTasas17;
      console.log(`[ExcelJS] Hoja17!E15 (Impuestos y tasas) = ${impuestosTasas17}`);

      const generales17 = sumByPrefixes17(alcantarilladoAccounts, ['5111']);
      sheet17.getCell('E16').value = generales17;
      console.log(`[ExcelJS] Hoja17!E16 (Generales) = ${generales17}`);

      const deterioro17 = sumByPrefixes17(alcantarilladoAccounts, ['5350']);
      sheet17.getCell('E17').value = deterioro17;
      console.log(`[ExcelJS] Hoja17!E17 (Deterioro) = ${deterioro17}`);

      const depreciacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5360']);
      sheet17.getCell('E18').value = depreciacion17;
      console.log(`[ExcelJS] Hoja17!E18 (Depreciación) = ${depreciacion17}`);

      const amortizacion17 = sumByPrefixes17(alcantarilladoAccounts, ['5365']);
      sheet17.getCell('E19').value = amortizacion17;
      console.log(`[ExcelJS] Hoja17!E19 (Amortización) = ${amortizacion17}`);

      const litigios17 = sumByPrefixes17(alcantarilladoAccounts, ['537001', '537002']);
      sheet17.getCell('E21').value = litigios17;

      const garantias17 = sumByPrefixes17(alcantarilladoAccounts, ['537003']);
      sheet17.getCell('E22').value = garantias17;

      const provisionesDiversas17 = sumByPrefixes17(alcantarilladoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet17.getCell('E23').value = provisionesDiversas17;

      const arrendamientos17 = sumByPrefixes17(alcantarilladoAccounts, ['5115', '5124']);
      sheet17.getCell('E25').value = arrendamientos17;
      console.log(`[ExcelJS] Hoja17!E25 (Arrendamientos) = ${arrendamientos17}`);

      const comisiones17 = sumByPrefixes17(alcantarilladoAccounts, ['5125']);
      sheet17.getCell('E27').value = comisiones17;

      const diferenciaEnCambio17 = sumByPrefixes17(alcantarilladoAccounts, ['5807']);
      sheet17.getCell('E28').value = diferenciaEnCambio17;

      const financieros17 = sumByPrefixes17(alcantarilladoAccounts, ['5802', '5803']);
      sheet17.getCell('E29').value = financieros17;
      console.log(`[ExcelJS] Hoja17!E29 (Financieros) = ${financieros17}`);

      const perdidasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['5815']);
      sheet17.getCell('E30').value = perdidasMPP17;
      console.log(`[ExcelJS] Hoja17!E30 (Pérdidas MPP) = ${perdidasMPP17}`);

      const gastosDiversos17 = sumByPrefixes17(alcantarilladoAccounts, ['5195', '5895']);
      sheet17.getCell('E31').value = gastosDiversos17;
      console.log(`[ExcelJS] Hoja17!E31 (Gastos diversos) = ${gastosDiversos17}`);

      const donaciones17 = sumByPrefixes17(alcantarilladoAccounts, ['5423']);
      sheet17.getCell('E32').value = donaciones17;
      console.log(`[ExcelJS] Hoja17!E32 (Donaciones) = ${donaciones17}`);

      const gananciasMPP17 = sumByPrefixes17(alcantarilladoAccounts, ['4815']);
      sheet17.getCell('E33').value = gananciasMPP17 !== 0 ? -gananciasMPP17 : 0;
      if (gananciasMPP17 !== 0) {
        console.log(`[ExcelJS] Hoja17!E33 (Ganancias MPP) = ${-gananciasMPP17}`);
      }

      const impuestoRentaCorriente17 = sumByPrefixes17(alcantarilladoAccounts, ['540101']);
      sheet17.getCell('E34').value = impuestoRentaCorriente17;
      console.log(`[ExcelJS] Hoja17!E34 (Imp. renta corriente) = ${impuestoRentaCorriente17}`);

      const impuestoRentaDiferido17 = sumByPrefixes17(alcantarilladoAccounts, ['5410'], ['540101']);
      sheet17.getCell('E35').value = impuestoRentaDiferido17;
      console.log(`[ExcelJS] Hoja17!E35 (Imp. renta diferido) = ${impuestoRentaDiferido17}`);

      const mantenimiento17 = sumByPrefixes17(alcantarilladoAccounts, ['5140', '5145']);
      sheet17.getCell('E72').value = mantenimiento17;
      console.log(`[ExcelJS] Hoja17!E72 (Mantenimiento) = ${mantenimiento17}`);

      const serviciosPublicos17 = sumByPrefixes17(alcantarilladoAccounts, ['5135']);
      sheet17.getCell('E77').value = serviciosPublicos17;
      console.log(`[ExcelJS] Hoja17!E77 (Servicios públicos) = ${serviciosPublicos17}`);

      const seguros17 = sumByPrefixes17(alcantarilladoAccounts, ['5130']);
      sheet17.getCell('E80').value = seguros17;
      console.log(`[ExcelJS] Hoja17!E80 (Seguros) = ${seguros17}`);

      const otrosContratos17 = sumByPrefixes17(alcantarilladoAccounts, ['5150', '5155']);
      sheet17.getCell('E81').value = otrosContratos17;
      console.log(`[ExcelJS] Hoja17!E81 (Otros contratos) = ${otrosContratos17}`);

      const costosVentasTotal17 = sumByPrefixes17(alcantarilladoAccounts, ['6']);
      sheet17.getCell('F72').value = costosVentasTotal17;
      console.log(`[ExcelJS] Hoja17!F72 (Costos de ventas total) = ${costosVentasTotal17}`);

      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 77, 80, 81]) {
        sheet17.getCell(`F${row}`).value = 0;
      }

      const filasConDatos17 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 77, 80, 81];
      for (const row of filasConDatos17) {
        const valorE = sheet17.getCell(`E${row}`).value as number || 0;
        const valorF = sheet17.getCell(`F${row}`).value as number || 0;
        sheet17.getCell(`G${row}`).value = valorE + valorF;
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
          if (!account.isLeaf) continue;
          if (matchesPrefixes(account.code, prefixes, excludePrefixes)) {
            total += account.value;
          }
        }
        return total;
      };

      const beneficiosEmpleados18 = sumByPrefixes18(aseoAccounts, ['5101', '5103', '5104', '5107', '5108']);
      sheet18.getCell('E13').value = beneficiosEmpleados18;
      console.log(`[ExcelJS] Hoja18!E13 (Beneficios empleados) = ${beneficiosEmpleados18}`);

      const honorarios18 = sumByPrefixes18(aseoAccounts, ['5110']);
      sheet18.getCell('E14').value = honorarios18;
      console.log(`[ExcelJS] Hoja18!E14 (Honorarios) = ${honorarios18}`);

      const impuestosTasas18 = sumByPrefixes18(aseoAccounts, ['5120']);
      sheet18.getCell('E15').value = impuestosTasas18;
      console.log(`[ExcelJS] Hoja18!E15 (Impuestos y tasas) = ${impuestosTasas18}`);

      const generales18 = sumByPrefixes18(aseoAccounts, ['5111']);
      sheet18.getCell('E16').value = generales18;
      console.log(`[ExcelJS] Hoja18!E16 (Generales) = ${generales18}`);

      const deterioro18 = sumByPrefixes18(aseoAccounts, ['5350']);
      sheet18.getCell('E17').value = deterioro18;
      console.log(`[ExcelJS] Hoja18!E17 (Deterioro) = ${deterioro18}`);

      const depreciacion18 = sumByPrefixes18(aseoAccounts, ['5360']);
      sheet18.getCell('E18').value = depreciacion18;
      console.log(`[ExcelJS] Hoja18!E18 (Depreciación) = ${depreciacion18}`);

      const amortizacion18 = sumByPrefixes18(aseoAccounts, ['5365']);
      sheet18.getCell('E19').value = amortizacion18;
      console.log(`[ExcelJS] Hoja18!E19 (Amortización) = ${amortizacion18}`);

      const litigios18 = sumByPrefixes18(aseoAccounts, ['537001', '537002']);
      sheet18.getCell('E21').value = litigios18;

      const garantias18 = sumByPrefixes18(aseoAccounts, ['537003']);
      sheet18.getCell('E22').value = garantias18;

      const provisionesDiversas18 = sumByPrefixes18(aseoAccounts, ['5370'], ['537001', '537002', '537003']);
      sheet18.getCell('E23').value = provisionesDiversas18;

      const arrendamientos18 = sumByPrefixes18(aseoAccounts, ['5115', '5124']);
      sheet18.getCell('E25').value = arrendamientos18;
      console.log(`[ExcelJS] Hoja18!E25 (Arrendamientos) = ${arrendamientos18}`);

      const comisiones18 = sumByPrefixes18(aseoAccounts, ['5125']);
      sheet18.getCell('E27').value = comisiones18;

      const diferenciaEnCambio18 = sumByPrefixes18(aseoAccounts, ['5807']);
      sheet18.getCell('E28').value = diferenciaEnCambio18;

      const financieros18 = sumByPrefixes18(aseoAccounts, ['5802', '5803']);
      sheet18.getCell('E29').value = financieros18;
      console.log(`[ExcelJS] Hoja18!E29 (Financieros) = ${financieros18}`);

      const perdidasMPP18 = sumByPrefixes18(aseoAccounts, ['5815']);
      sheet18.getCell('E30').value = perdidasMPP18;
      console.log(`[ExcelJS] Hoja18!E30 (Pérdidas MPP) = ${perdidasMPP18}`);

      const gastosDiversos18 = sumByPrefixes18(aseoAccounts, ['5195', '5895']);
      sheet18.getCell('E31').value = gastosDiversos18;
      console.log(`[ExcelJS] Hoja18!E31 (Gastos diversos) = ${gastosDiversos18}`);

      const donaciones18 = sumByPrefixes18(aseoAccounts, ['5423']);
      sheet18.getCell('E32').value = donaciones18;
      console.log(`[ExcelJS] Hoja18!E32 (Donaciones) = ${donaciones18}`);

      const gananciasMPP18 = sumByPrefixes18(aseoAccounts, ['4815']);
      sheet18.getCell('E33').value = gananciasMPP18 !== 0 ? -gananciasMPP18 : 0;
      if (gananciasMPP18 !== 0) {
        console.log(`[ExcelJS] Hoja18!E33 (Ganancias MPP) = ${-gananciasMPP18}`);
      }

      const impuestoRentaCorriente18 = sumByPrefixes18(aseoAccounts, ['540101']);
      sheet18.getCell('E34').value = impuestoRentaCorriente18;
      console.log(`[ExcelJS] Hoja18!E34 (Imp. renta corriente) = ${impuestoRentaCorriente18}`);

      const impuestoRentaDiferido18 = sumByPrefixes18(aseoAccounts, ['5410'], ['540101']);
      sheet18.getCell('E35').value = impuestoRentaDiferido18;
      console.log(`[ExcelJS] Hoja18!E35 (Imp. renta diferido) = ${impuestoRentaDiferido18}`);

      const mantenimiento18 = sumByPrefixes18(aseoAccounts, ['5140', '5145']);
      sheet18.getCell('E72').value = mantenimiento18;
      console.log(`[ExcelJS] Hoja18!E72 (Mantenimiento) = ${mantenimiento18}`);

      const serviciosPublicos18 = sumByPrefixes18(aseoAccounts, ['5135']);
      sheet18.getCell('E77').value = serviciosPublicos18;
      console.log(`[ExcelJS] Hoja18!E77 (Servicios públicos) = ${serviciosPublicos18}`);

      const seguros18 = sumByPrefixes18(aseoAccounts, ['5130']);
      sheet18.getCell('E80').value = seguros18;
      console.log(`[ExcelJS] Hoja18!E80 (Seguros) = ${seguros18}`);

      const otrosContratos18 = sumByPrefixes18(aseoAccounts, ['5150', '5155']);
      sheet18.getCell('E81').value = otrosContratos18;
      console.log(`[ExcelJS] Hoja18!E81 (Otros contratos) = ${otrosContratos18}`);

      // =====================================================
      // COLUMNA F - DISTRIBUCIÓN ESPECIAL PARA SERVICIO DE ASEO:
      // - Fila 72 (Mantenimiento): 40%
      // - Fila 74 (Disposición final): 60%
      // =====================================================

      const costosVentasTotal18 = sumByPrefixes18(aseoAccounts, ['6']);

      const costosMantenimiento18 = Math.round(costosVentasTotal18 * 0.40);
      const costosDisposicionFinal18 = costosVentasTotal18 - costosMantenimiento18;

      sheet18.getCell('F72').value = costosMantenimiento18;
      sheet18.getCell('F74').value = costosDisposicionFinal18;

      console.log(`[ExcelJS] Hoja18 - Costos de ventas total: ${costosVentasTotal18}`);
      console.log(`[ExcelJS] Hoja18!F72 (Mantenimiento 40%) = ${costosMantenimiento18}`);
      console.log(`[ExcelJS] Hoja18!F74 (Disposición final 60%) = ${costosDisposicionFinal18}`);

      for (const row of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 73, 77, 80, 81]) {
        sheet18.getCell(`F${row}`).value = 0;
      }

      const filasConDatos18 = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 72, 74, 77, 80, 81];
      for (const row of filasConDatos18) {
        const valorE = sheet18.getCell(`E${row}`).value as number || 0;
        const valorF = sheet18.getCell(`F${row}`).value as number || 0;
        sheet18.getCell(`G${row}`).value = valorE + valorF;
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
        const e16 = sheet16ForHoja22.getCell(`E${origen}`).value as number || 0;
        const e17 = sheet17ForHoja22.getCell(`E${origen}`).value as number || 0;
        const e18 = sheet18ForHoja22.getCell(`E${origen}`).value as number || 0;
        const sumaE = e16 + e17 + e18;

        const f16 = sheet16ForHoja22.getCell(`F${origen}`).value as number || 0;
        const f17 = sheet17ForHoja22.getCell(`F${origen}`).value as number || 0;
        const f18 = sheet18ForHoja22.getCell(`F${origen}`).value as number || 0;
        const sumaF = f16 + f17 + f18;

        sheet22.getCell(`E${destino}`).value = sumaE;
        sheet22.getCell(`F${destino}`).value = sumaF;
        sheet22.getCell(`G${destino}`).value = sumaE + sumaF;

        sheet22.getCell(`K${destino}`).value = sumaE;
        sheet22.getCell(`L${destino}`).value = sumaF;
        sheet22.getCell(`M${destino}`).value = sumaE + sumaF;

        if (sumaE !== 0 || sumaF !== 0) {
          console.log(`[ExcelJS] Hoja22 fila ${destino}: E=${sumaE}, F=${sumaF}, G=${sumaE + sumaF}`);
        }
      }

      let totalE = 0, totalF = 0;
      for (const { destino } of mapeoFilas) {
        totalE += sheet22.getCell(`E${destino}`).value as number || 0;
        totalF += sheet22.getCell(`F${destino}`).value as number || 0;
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

      const ingresosAcueducto = sheet3ForHoja23.getCell('E14').value as number || 0;
      const ingresosAlcantarillado = sheet3ForHoja23.getCell('F14').value as number || 0;
      const ingresosAseo = sheet3ForHoja23.getCell('G14').value as number || 0;

      console.log(`[ExcelJS] Hoja23 - Valores de Hoja3.fila14:`);
      console.log(`[ExcelJS]   E14 (Acueducto): ${ingresosAcueducto}`);
      console.log(`[ExcelJS]   F14 (Alcantarillado): ${ingresosAlcantarillado}`);
      console.log(`[ExcelJS]   G14 (Aseo): ${ingresosAseo}`);

      sheet23.getCell('I17').value = ingresosAcueducto;
      sheet23.getCell('K18').value = ingresosAcueducto;
      console.log(`[ExcelJS] Hoja23 - Acueducto: I17=${ingresosAcueducto}, K18=${ingresosAcueducto}`);

      sheet23.getCell('I22').value = ingresosAlcantarillado;
      sheet23.getCell('K23').value = ingresosAlcantarillado;
      console.log(`[ExcelJS] Hoja23 - Alcantarillado: I22=${ingresosAlcantarillado}, K23=${ingresosAlcantarillado}`);

      sheet23.getCell('I28').value = ingresosAseo;
      sheet23.getCell('K40').value = ingresosAseo;
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

      const cxcCorrientes19 = sheet2ForHoja24.getCell('I19').value as number || 0;
      const cxcCorrientes20 = sheet2ForHoja24.getCell('I20').value as number || 0;
      const totalCXCCorrientes = cxcCorrientes19 + cxcCorrientes20;

      const cxcNoCorrientes43 = sheet2ForHoja24.getCell('I43').value as number || 0;
      const cxcNoCorrientes44 = sheet2ForHoja24.getCell('I44').value as number || 0;
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

          sheet24.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet24.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          sheet24.getCell(`I${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimiento) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet24.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet24.getCell(`L${estrato.fila}`).value as number || 0;
            sheet24.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet24.getCell(`S${estrato.fila}`).value = sumaRangos;

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

          sheet24.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet24.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          sheet24.getCell(`I${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimiento) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet24.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet24.getCell(`L${estrato.fila}`).value as number || 0;
            sheet24.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet24.getCell(`S${estrato.fila}`).value = sumaRangos;
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

      const cxcCorrientes19Alc = sheet2ForHoja25.getCell('J19').value as number || 0;
      const cxcCorrientes20Alc = sheet2ForHoja25.getCell('J20').value as number || 0;
      const totalCXCCorrientesAlc = cxcCorrientes19Alc + cxcCorrientes20Alc;

      const cxcNoCorrientes43Alc = sheet2ForHoja25.getCell('J43').value as number || 0;
      const cxcNoCorrientes44Alc = sheet2ForHoja25.getCell('J44').value as number || 0;
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

          sheet25.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet25.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          sheet25.getCell(`I${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimientoAlc) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet25.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet25.getCell(`L${estrato.fila}`).value as number || 0;
            sheet25.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet25.getCell(`S${estrato.fila}`).value = sumaRangos;

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

          sheet25.getCell(`G${estrato.fila}`).value = valorCorriente;
          sheet25.getCell(`H${estrato.fila}`).value = valorNoCorriente;
          sheet25.getCell(`I${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimientoAlc) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet25.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorLActual = sheet25.getCell(`L${estrato.fila}`).value as number || 0;
            sheet25.getCell(`L${estrato.fila}`).value = valorLActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet25.getCell(`S${estrato.fila}`).value = sumaRangos;
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

      const cxcCorrientes19Aseo = sheet2ForHoja26.getCell('K19').value as number || 0;
      const cxcCorrientes20Aseo = sheet2ForHoja26.getCell('K20').value as number || 0;
      const totalCXCCorrientesAseo = cxcCorrientes19Aseo + cxcCorrientes20Aseo;

      const cxcNoCorrientes43Aseo = sheet2ForHoja26.getCell('K43').value as number || 0;
      const cxcNoCorrientes44Aseo = sheet2ForHoja26.getCell('K44').value as number || 0;
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

          sheet26.getCell(`E${estrato.fila}`).value = valorCorriente;
          sheet26.getCell(`F${estrato.fila}`).value = valorNoCorriente;
          const totalCXCEstrato = valorCorriente + valorNoCorriente;
          sheet26.getCell(`G${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimientoAseo) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet26.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorJActual = sheet26.getCell(`J${estrato.fila}`).value as number || 0;
            sheet26.getCell(`J${estrato.fila}`).value = valorJActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet26.getCell(`Q${estrato.fila}`).value = sumaRangos;

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

          sheet26.getCell(`E${estrato.fila}`).value = valorCorriente;
          sheet26.getCell(`F${estrato.fila}`).value = valorNoCorriente;
          sheet26.getCell(`G${estrato.fila}`).value = totalCXCEstrato;

          let sumaRangos = 0;
          for (const rango of rangosVencimientoAseo) {
            const valorRango = Math.round(totalCXCEstrato * rango.porcentaje);
            sheet26.getCell(`${rango.columna}${estrato.fila}`).value = valorRango;
            sumaRangos += valorRango;
          }

          const diferencia = totalCXCEstrato - sumaRangos;
          if (diferencia !== 0) {
            const valorJActual = sheet26.getCell(`J${estrato.fila}`).value as number || 0;
            sheet26.getCell(`J${estrato.fila}`).value = valorJActual + diferencia;
            sumaRangos = totalCXCEstrato;
          }
          sheet26.getCell(`Q${estrato.fila}`).value = sumaRangos;
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

      sheet30.getCell('E14').value = distribucionPorEstrato.acueducto['estrato1'];
      sheet30.getCell('E15').value = distribucionPorEstrato.acueducto['estrato2'];
      sheet30.getCell('E16').value = distribucionPorEstrato.acueducto['estrato3'];

      sheet30.getCell('F14').value = distribucionPorEstrato.alcantarillado['estrato1'];
      sheet30.getCell('F15').value = distribucionPorEstrato.alcantarillado['estrato2'];
      sheet30.getCell('F16').value = distribucionPorEstrato.alcantarillado['estrato3'];

      sheet30.getCell('G14').value = distribucionPorEstrato.aseo['estrato1'];
      sheet30.getCell('G15').value = distribucionPorEstrato.aseo['estrato2'];
      sheet30.getCell('G16').value = distribucionPorEstrato.aseo['estrato3'];

      sheet30.getCell('K14').value = totalPorEstrato['estrato1'];
      sheet30.getCell('K15').value = totalPorEstrato['estrato2'];
      sheet30.getCell('K16').value = totalPorEstrato['estrato3'];

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
          sheet32.getCell(`D${mapeo.fila32}`).value = valorCorriente;
        }

        if (valorNoCorriente !== 0) {
          sheet32.getCell(`F${mapeo.fila32}`).value = valorNoCorriente;
        }

        if (valorTotal !== 0) {
          sheet32.getCell(`E${mapeo.fila32}`).value = valorTotal;

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

          sheet32.getCell(`G${mapeo.fila32}`).value = noVencido;
          sheet32.getCell(`I${mapeo.fila32}`).value = hasta30;
          sheet32.getCell(`K${mapeo.fila32}`).value = hasta60Ajustado;
          sheet32.getCell(`L${mapeo.fila32}`).value = hasta90;
          sheet32.getCell(`M${mapeo.fila32}`).value = hasta180;
          sheet32.getCell(`N${mapeo.fila32}`).value = hasta360;
          sheet32.getCell(`O${mapeo.fila32}`).value = mayor360;
          sheet32.getCell(`J${mapeo.fila32}`).value = totalVencidos + diferencia;
          sheet32.getCell(`H${mapeo.fila32}`).value = valorTotal;

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

      const ingresosAcueducto35 = sheet3ForHoja35.getCell('E14').value as number || 0;
      const ingresosAlcantarillado35 = sheet3ForHoja35.getCell('F14').value as number || 0;
      const ingresosAseo35 = sheet3ForHoja35.getCell('G14').value as number || 0;

      sheet35.getCell('G26').value = ingresosAcueducto35;
      sheet35.getCell('H26').value = ingresosAlcantarillado35;
      sheet35.getCell('I26').value = ingresosAseo35;

      console.log(`[ExcelJS] Hoja35 - Ingresos por prestación de servicios (fila 26):`);
      console.log(`[ExcelJS]   G26 (Acueducto): ${ingresosAcueducto35}`);
      console.log(`[ExcelJS]   H26 (Alcantarillado): ${ingresosAlcantarillado35}`);
      console.log(`[ExcelJS]   I26 (Aseo): ${ingresosAseo35}`);

      console.log('[ExcelJS] Hoja35 completada.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN GRUPO1/2/3 — NIIF Sector Privado (Plenas, PYMES, Microempresas)
  // ═══════════════════════════════════════════════════════════════════════════
  if (options.niifGroup === 'grupo1' || options.niifGroup === 'grupo2' || options.niifGroup === 'grupo3') {
    rewriteGrupoData(workbook, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN IFE — Reescritura de datos para IFE (Informe Financiero Especial)
  // Hoja1 (110000t), Hoja3 (210000t), Hoja4 (310000t), Hoja5 (900020t),
  // Hoja6 (900028t), Hoja7 (900050t)
  // ═══════════════════════════════════════════════════════════════════════════
  if (options.niifGroup === 'ife') {
    console.log('[ExcelJS-IFE] Inicio reescritura datos IFE...');

    // Columnas de servicio ESF (Hoja3): I-P
    const IFE_ESF_COLS: Record<string, string> = {
      acueducto: 'I', alcantarillado: 'J', aseo: 'K',
      energia: 'L', gas: 'M', glp: 'N', xm: 'O', otras: 'P',
    };
    // Columnas de servicio ER (Hoja4): E-L
    const IFE_ER_COLS: Record<string, string> = {
      acueducto: 'E', alcantarillado: 'F', aseo: 'G',
      energia: 'H', gas: 'I', glp: 'J', xm: 'K', otras: 'L',
    };

    // ---------------------------------------------------------------
    // HOJA1 IFE (110000t): Información general — reescribir con ExcelJS
    // ---------------------------------------------------------------
    const ifeSheet1 = workbook.getWorksheet('Hoja1');
    if (ifeSheet1) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja1 (110000t)...');
      ifeSheet1.getCell('E13').value = options.nit || '';
      ifeSheet1.getCell('E14').value = options.companyId;
      ifeSheet1.getCell('E15').value = options.companyName;
      ifeSheet1.getCell('E16').value = options.reportDate;

      const ife = options.ifeCompanyData;
      if (ife) {
        ifeSheet1.getCell('E18').value = ife.address || '';
        ifeSheet1.getCell('E19').value = ife.city || '';
        ifeSheet1.getCell('E20').value = ife.phone || '';
        ifeSheet1.getCell('E21').value = ife.cellphone || ife.phone || '';
        ifeSheet1.getCell('E22').value = ife.email || '';
        if (ife.employeesStart !== undefined) ifeSheet1.getCell('E24').value = ife.employeesStart;
        if (ife.employeesEnd !== undefined) ifeSheet1.getCell('E25').value = ife.employeesEnd;
        if (ife.employeesAverage !== undefined) ifeSheet1.getCell('E26').value = ife.employeesAverage;
        if (ife.representativeDocType) {
          const dtMap: Record<string, string> = {
            '01': '01 - CÉDULA DE CIUDADANÍA', '02': '02 - CÉDULA DE EXTRANJERÍA', '03': '03 - PASAPORTE',
          };
          ifeSheet1.getCell('E28').value = dtMap[ife.representativeDocType] || ife.representativeDocType;
        }
        ifeSheet1.getCell('E29').value = ife.representativeDocNumber || '';
        ifeSheet1.getCell('E30').value = ife.representativeFirstName || '';
        ifeSheet1.getCell('E31').value = ife.representativeLastName || '';
        if (ife.normativeGroup) {
          const gMap: Record<string, string> = {
            'R414': 'R. 414', 'NIIF1': 'Grupo 1 - NIIF Plenas',
            'NIIF2': 'Grupo 2 - NIIF PYMES', 'NIIF3': 'Grupo 3 - Microempresas',
          };
          ifeSheet1.getCell('E33').value = gMap[ife.normativeGroup] || ife.normativeGroup;
        } else {
          ifeSheet1.getCell('E33').value = 'R. 414';
        }
        ifeSheet1.getCell('E34').value = ife.complianceDeclaration ? '1. Si cumple' : '2. No cumple';
        ifeSheet1.getCell('E35').value = ife.goingConcernUncertainty ? '1. Si' : '2. No';
        ifeSheet1.getCell('E36').value = ife.goingConcernExplanation || 'NA';
        ifeSheet1.getCell('E38').value = '2. No';
        ifeSheet1.getCell('E39').value = ife.servicesTermination ? '1. Si' : '2. No';
        ifeSheet1.getCell('E40').value = ife.servicesTerminationExplanation || 'NA';
      } else {
        ifeSheet1.getCell('E33').value = 'R. 414';
        ifeSheet1.getCell('E34').value = '1. Si cumple';
        ifeSheet1.getCell('E35').value = '2. No';
        ifeSheet1.getCell('E36').value = 'NA';
        ifeSheet1.getCell('E38').value = '2. No';
        ifeSheet1.getCell('E39').value = '2. No';
        ifeSheet1.getCell('E40').value = 'NA';
      }
      console.log('[ExcelJS-IFE] Hoja1 completada.');
    }

    // ---------------------------------------------------------------
    // HOJA2 IFE (120000t): Información adicional — flujo de efectivo y notas
    // Celdas clave: G13 (Efectivo final), G15 (Incrementos), G16 (Efectivo inicio)
    // ---------------------------------------------------------------
    const ifeSheet2 = workbook.getWorksheet('Hoja2');
    if (ifeSheet2) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja2 (120000t)...');

      // G13: Efectivo y equivalentes al efectivo al final del periodo
      // = Total PUC 11 (excluyendo 1132 restringido)
      let efectivoFinal = 0;
      for (const acc of options.consolidatedAccounts!) {
        if (!acc.isLeaf) continue;
        if (matchesPrefixes(acc.code, ['11'], ['1132'])) {
          efectivoFinal += acc.value;
        }
      }
      ifeSheet2.getCell('G13').value = efectivoFinal;

      // G15: Incrementos (disminuciones) en el efectivo = 0
      // (no tenemos balance de apertura para calcular la diferencia)
      ifeSheet2.getCell('G15').value = 0;

      // G16: Efectivo y equivalentes al efectivo al inicio del periodo = 0
      ifeSheet2.getCell('G16').value = 0;

      // G14: Información sobre variaciones de flujo de efectivo (texto obligatorio)
      ifeSheet2.getCell('G14').value = 'Sin observaciones';

      // G18-G23: Notas de revelación (texto obligatorio)
      ifeSheet2.getCell('G18').value = 'Sin observaciones';
      ifeSheet2.getCell('G19').value = 'Sin observaciones';
      ifeSheet2.getCell('G20').value = 'Sin observaciones';
      ifeSheet2.getCell('G21').value = 'Sin observaciones';
      ifeSheet2.getCell('G22').value = 'Sin observaciones';
      ifeSheet2.getCell('G23').value = 'Sin observaciones';

      // G25-G33: Sección de ajustes a información certificada
      ifeSheet2.getCell('G25').value = '2. No';
      ifeSheet2.getCell('G26').value = '2. No';
      ifeSheet2.getCell('G27').value = 'NA';
      ifeSheet2.getCell('G28').value = '2. No';
      ifeSheet2.getCell('G29').value = 'NA';
      ifeSheet2.getCell('G30').value = '2. No';
      ifeSheet2.getCell('G31').value = 'NA';
      ifeSheet2.getCell('G32').value = '2. No';
      ifeSheet2.getCell('G33').value = 'NA';

      console.log('[ExcelJS-IFE] Hoja2 (120000t) completada.');
    }

    // ---------------------------------------------------------------
    // HOJA3 IFE (210000t): Estado de Situación Financiera
    // Columnas I-P servicios, Q total
    // ---------------------------------------------------------------
    const ifeSheet3 = workbook.getWorksheet('Hoja3');
    if (ifeSheet3) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja3 (ESF)...');

      // Mapeo ESF alineado con esfMappings.ts — PUC CGN Resolución 414
      // Los valores se usan tal cual (sin abs) para preservar la ecuación A = P + Pt
      const IFE_ESF_MAP: Array<{row: number; puc: string[]; ex?: string[]; label: string}> = [
        // === ACTIVOS CORRIENTES (Filas 15-31) ===
        { row: 15, puc: ['11'], ex: ['1132'], label: 'Efectivo y equivalentes' },
        { row: 16, puc: ['1132'], label: 'Efectivo de uso restringido' },
        { row: 19, puc: ['131801', '131802', '131803', '131804', '131805', '131806'], label: 'CXC servicios públicos' },
        { row: 20, puc: ['131807', '131808', '131809', '131810', '131811', '131812'], label: 'CXC por subsidios' },
        { row: 22, puc: ['138424'], label: 'CXC por aprovechamiento' },
        { row: 24, puc: ['1316'], label: 'CXC venta de bienes' },
        { row: 25, puc: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'], ex: ['138401', '138414', '138424'], label: 'Otras CXC corrientes' },
        { row: 27, puc: ['15'], ex: ['1580'], label: 'Inventarios corrientes' },
        { row: 28, puc: ['12'], ex: ['1280'], label: 'Inversiones corrientes' },
        { row: 30, puc: ['19'], ex: ['1970', '1971', '1972', '1973', '1974', '1975'], label: 'Otros activos financieros corrientes' },
        { row: 31, puc: ['17', '18'], label: 'Otros activos no financieros corrientes' },
        // === ACTIVOS NO CORRIENTES (Filas 34-50) ===
        { row: 34, puc: ['16'], label: 'PPE' },
        { row: 36, puc: ['1970', '1971', '1972', '1973', '1974', '1975'], label: 'Intangibles' },
        { row: 37, puc: ['1227', '1230', '1233'], label: 'Inversiones no corrientes' },
        { row: 49, puc: ['14'], label: 'Otros activos financieros no corrientes' },
        // === PASIVOS CORRIENTES (Filas 56-63) ===
        { row: 56, puc: ['25'], label: 'Provisiones corrientes' },
        { row: 57, puc: ['23'], label: 'CxP corrientes' },
        { row: 60, puc: ['21', '22'], label: 'Obligaciones financieras corrientes' },
        { row: 61, puc: ['24'], label: 'Obligaciones laborales corrientes' },
        { row: 62, puc: ['27'], label: 'Pasivo por impuestos corrientes' },
        { row: 63, puc: ['26', '28', '29'], label: 'Otros pasivos corrientes' },
        // === PASIVOS NO CORRIENTES (Filas 66-73) — sin mapear, el usuario completa manualmente ===
        // === PATRIMONIO (Filas 77-83) ===
        // '31' como fallback para balances que reportan patrimonio a nivel de grupo (código 31)
        // en vez de subcuentas detalladas (3105, 3109, etc.)
        { row: 77, puc: ['3105', '3205', '3208', '3210', '3215', '31'], ex: ['3109', '3110', '3115', '3120', '3125', '3130', '3145'], label: 'Capital' },
        { row: 78, puc: ['3109'], label: 'Inversión suplementaria' },
        { row: 79, puc: ['3125', '3110', '3270'], label: 'Otras participaciones' },
        { row: 80, puc: ['3115', '3120', '3240', '3245', '3255'], label: 'Superávit por revaluación' },
        { row: 81, puc: ['3130', '3260'], label: 'Reservas' },
        { row: 82, puc: ['3225', '3230', '32'], ex: ['3205', '3208', '3210', '3215', '3240', '3245', '3250', '3255', '3260', '3270'], label: 'Ganancias acumuladas' },
        { row: 83, puc: ['3145'], label: 'Efectos adopción NIF' },
      ];

      for (const m of IFE_ESF_MAP) {
        // Solo escribir valores en columnas de servicio (I-P)
        // La columna Q será fórmula =SUM(I:P) escrita al final
        for (const svc of activeServices) {
          const col = IFE_ESF_COLS[svc];
          if (!col) continue;
          let svcValue = 0;
          const svcAccounts = accountsByService[svc] || [];
          for (const acc of svcAccounts) {
            if (!acc.isLeaf) continue;
            if (matchesPrefixes(acc.code, m.puc, m.ex)) {
              svcValue += acc.value;
            }
          }
          if (svcValue !== 0) {
            ifeSheet3.getCell(`${col}${m.row}`).value = svcValue;
          }
        }
      }

      // --- Ganancias acumuladas (fila 82): si PUC 32 dio 0, calcular desde ER ---
      // En reportes trimestrales la cuenta 3210 puede no existir aún;
      // en ese caso derivamos el resultado neto de clases 4, 5 y 6.
      // Verificar en columnas de servicio (Q será fórmula =SUM(I:P))
      const row82HasServiceData = activeServices.some(svc => {
        const col = IFE_ESF_COLS[svc];
        if (!col) return false;
        const v = ifeSheet3.getCell(`${col}82`).value;
        return v !== null && v !== undefined && v !== 0;
      });
      if (!row82HasServiceData) {
        const calcERNet = (accs: {code: string; value: number; isLeaf: boolean}[]): number => {
          let ing = 0, gas = 0, cos = 0;
          for (const a of accs) {
            if (!a.isLeaf) continue;
            if (a.code.startsWith('4')) ing += Math.abs(a.value);
            if (a.code.startsWith('5')) gas += Math.abs(a.value);
            if (a.code.startsWith('6')) cos += Math.abs(a.value);
          }
          return ing - gas - cos;
        };
        // Solo escribir a columnas de servicio (I-P), Q será fórmula
        for (const svc of activeServices) {
          const col = IFE_ESF_COLS[svc];
          if (!col) continue;
          const svcAccounts = accountsByService[svc] || [];
          const svcER = calcERNet(svcAccounts);
          if (svcER !== 0) {
            ifeSheet3.getCell(`${col}82`).value = svcER;
          }
        }
      }

      // ================================================================
      // ESCRIBIR FÓRMULAS DE AUTOSUMA para Hoja3 (ESF)
      // El template NO tiene fórmulas - debemos escribirlas explícitamente
      // para que los subtotales y totales se calculen correctamente.
      // Columnas I-P: fórmulas verticales (subtotales dentro de cada servicio)
      // Columna Q: fórmulas horizontales =SUM(I:P) para totalizar servicios
      // ================================================================
      const esfServiceCols = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
      for (const C of esfServiceCols) {
        // Subtotales CxC corrientes
        ifeSheet3.getCell(`${C}23`).value = { formula: `${C}19+${C}20+${C}21+${C}22` };
        ifeSheet3.getCell(`${C}26`).value = { formula: `${C}23+${C}24+${C}25` };
        // Activos corrientes totales
        ifeSheet3.getCell(`${C}32`).value = { formula: `${C}15+${C}16+${C}26+${C}27+${C}28+${C}29+${C}30+${C}31` };
        // Subtotales CxC no corrientes
        ifeSheet3.getCell(`${C}44`).value = { formula: `${C}40+${C}41+${C}42+${C}43` };
        ifeSheet3.getCell(`${C}47`).value = { formula: `${C}44+${C}45+${C}46` };
        // Activos no corrientes totales
        ifeSheet3.getCell(`${C}51`).value = { formula: `${C}34+${C}35+${C}36+${C}37+${C}47+${C}48+${C}49+${C}50` };
        // TOTAL DE ACTIVOS
        ifeSheet3.getCell(`${C}52`).value = { formula: `${C}32+${C}51` };
        // Pasivos corrientes totales (58/59 son sub-detalle de 57)
        ifeSheet3.getCell(`${C}64`).value = { formula: `${C}56+${C}57+${C}60+${C}61+${C}62+${C}63` };
        // Total pasivos no corrientes (68/69 son sub-detalle de 67)
        ifeSheet3.getCell(`${C}74`).value = { formula: `${C}66+${C}67+${C}70+${C}71+${C}72+${C}73` };
        // TOTAL PASIVOS
        ifeSheet3.getCell(`${C}75`).value = { formula: `${C}64+${C}74` };
        // Patrimonio total
        ifeSheet3.getCell(`${C}84`).value = { formula: `SUM(${C}77:${C}83)` };
        // TOTAL DE PATRIMONIO Y PASIVOS
        ifeSheet3.getCell(`${C}85`).value = { formula: `${C}75+${C}84` };
        // Filas resumen (referencian sus totales)
        ifeSheet3.getCell(`${C}13`).value = { formula: `${C}52` };
        ifeSheet3.getCell(`${C}14`).value = { formula: `${C}32` };
        ifeSheet3.getCell(`${C}17`).value = { formula: `${C}26` };
        ifeSheet3.getCell(`${C}18`).value = { formula: `${C}23` };
        ifeSheet3.getCell(`${C}33`).value = { formula: `${C}51` };
        ifeSheet3.getCell(`${C}38`).value = { formula: `${C}47` };
        ifeSheet3.getCell(`${C}39`).value = { formula: `${C}44` };
        ifeSheet3.getCell(`${C}53`).value = { formula: `${C}85` };
        ifeSheet3.getCell(`${C}54`).value = { formula: `${C}75` };
        ifeSheet3.getCell(`${C}55`).value = { formula: `${C}64` };
        ifeSheet3.getCell(`${C}65`).value = { formula: `${C}74` };
        ifeSheet3.getCell(`${C}76`).value = { formula: `${C}84` };
      }

      // Columna Q: fórmulas horizontales =SUM(I{row}:P{row}) para TODAS las filas
      // Esto garantiza que Q = sum de servicios y la ecuación contable se cumple
      // automáticamente porque cada columna de servicio ya está balanceada (A=P+Pt)
      for (let row = 13; row <= 85; row++) {
        ifeSheet3.getCell(`Q${row}`).value = { formula: `SUM(I${row}:P${row})` };
      }

      // Limpiar ESF PERIODO ANTERIOR (filas 86+) — evitar datos ejemplo del template
      // El template IFE tiene sección comparativa a partir de fila 86 (offset 78 desde fila 15)
      // que el XBRLT lee para generar facts XBRL del periodo anterior.
      const esfAllCols = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
      for (let row = 86; row <= 163; row++) {
        for (const C of esfAllCols) {
          ifeSheet3.getCell(`${C}${row}`).value = 0;
        }
      }

      console.log('[ExcelJS-IFE] Hoja3 (ESF) completada.');
    }

    // ---------------------------------------------------------------
    // HOJA4 IFE (310000t): Estado de Resultados
    // Columnas E-L servicios, M total
    // ---------------------------------------------------------------
    const ifeSheet4 = workbook.getWorksheet('Hoja4');
    if (ifeSheet4) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja4 (ER)...');

      // Mapeo ER alineado con erMappings.ts — PUC CGN Resolución 414
      // abs: true → las autosumas del template ya manejan los signos
      const IFE_ER_MAP: Array<{row: number; puc: string[]; ex?: string[]; label: string; abs?: boolean}> = [
        { row: 14, puc: ['41', '42', '43'], label: 'Ingresos ordinarios', abs: true },
        { row: 15, puc: ['62', '63'], label: 'Costo de ventas', abs: true },
        { row: 17, puc: ['51', '52', '56'], label: 'Gastos admin y ventas', abs: true },
        { row: 18, puc: ['44', '48'], ex: ['4802', '4803', '4808'], label: 'Otros ingresos', abs: true },
        { row: 19, puc: ['53', '58'], ex: ['5802', '5803', '5808'], label: 'Otros gastos', abs: true },
        { row: 21, puc: ['4802', '4803'], label: 'Ingresos financieros', abs: true },
        { row: 22, puc: ['5802', '5803'], label: 'Costos financieros', abs: true },
        { row: 23, puc: ['4808', '5808'], label: 'Otras ganancias/pérdidas', abs: true },
        { row: 25, puc: ['54'], label: 'Gasto por impuesto', abs: true },
        { row: 27, puc: ['59'], label: 'Operaciones discontinuadas', abs: true },
      ];

      // Almacenar valores computados por fila y columna para reutilizar en autosumas y Hoja7
      const erValues: Record<number, Record<string, number>> = {};

      for (const m of IFE_ER_MAP) {
        erValues[m.row] = {};
        let totalValue = 0;
        for (const acc of options.consolidatedAccounts!) {
          if (!acc.isLeaf) continue;
          if (matchesPrefixes(acc.code, m.puc, m.ex)) {
            totalValue += m.abs ? Math.abs(acc.value) : acc.value;
          }
        }
        erValues[m.row]['M'] = totalValue;
        if (totalValue !== 0) {
          ifeSheet4.getCell(`M${m.row}`).value = totalValue;
        }
        for (const svc of activeServices) {
          const col = IFE_ER_COLS[svc];
          if (!col) continue;
          let svcValue = 0;
          const svcAccounts = accountsByService[svc] || [];
          for (const acc of svcAccounts) {
            if (!acc.isLeaf) continue;
            if (matchesPrefixes(acc.code, m.puc, m.ex)) {
              svcValue += m.abs ? Math.abs(acc.value) : acc.value;
            }
          }
          erValues[m.row][col] = svcValue;
          if (svcValue !== 0) {
            ifeSheet4.getCell(`${col}${m.row}`).value = svcValue;
          }
        }
      }

      // Helper para obtener valor ER computado
      const getErVal = (row: number, col: string): number => erValues[row]?.[col] ?? 0;

      // ER Autosuma rows: escribir fórmulas CON resultado cacheado para XBRL Express
      const erAllCols = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
      for (const C of erAllCols) {
        // Fila 16: Ganancia bruta = Ingresos(14) - CostoVentas(15)
        const r16 = getErVal(14, C) - getErVal(15, C);
        ifeSheet4.getCell(`${C}16`).value = { formula: `${C}14-${C}15`, result: r16 };
        // Fila 20: Ganancia operacional = GananciaBruta(16) - GastosAdmin(17) + OtrosIngresos(18) - OtrosGastos(19)
        const r20 = r16 - getErVal(17, C) + getErVal(18, C) - getErVal(19, C);
        ifeSheet4.getCell(`${C}20`).value = { formula: `${C}16-${C}17+${C}18-${C}19`, result: r20 };
        // Fila 24: Ganancia antes impuestos = GananciaOp(20) + IngresosFinanc(21) - CostosFinanc(22) + OtrasGanancias(23)
        const r24 = r20 + getErVal(21, C) - getErVal(22, C) + getErVal(23, C);
        ifeSheet4.getCell(`${C}24`).value = { formula: `${C}20+${C}21-${C}22+${C}23`, result: r24 };
        // Fila 26: Ganancia continuadas = GananciaAntesImp(24) - GastoImpuesto(25)
        const r26 = r24 - getErVal(25, C);
        ifeSheet4.getCell(`${C}26`).value = { formula: `${C}24-${C}25`, result: r26 };
        // Fila 28: Ganancia total = GananciaContinuadas(26) + Discontinuadas(27)
        const r28 = r26 + getErVal(27, C);
        ifeSheet4.getCell(`${C}28`).value = { formula: `${C}26+${C}27`, result: r28 };
      }

      // Limpiar ER PERIODO ANTERIOR (filas 35-49) — evitar datos ejemplo del template
      // que generarían facts XBRL negativos (FRM_310000_008)
      for (let row = 35; row <= 49; row++) {
        for (const C of erAllCols) {
          ifeSheet4.getCell(`${C}${row}`).value = 0;
        }
      }

      console.log('[ExcelJS-IFE] Hoja4 (ER) completada con autosumas y limpieza periodo anterior.');
    }

    // ---------------------------------------------------------------
    // HOJA5 IFE (900020t): CxC por rangos de vencimiento
    // Sección 1: Filas 17-23 (CXC servicios públicos por servicio), 24 (deterioro), 25 (total)
    // Sección 2: Filas 27 (bienes brutas), 28 (deterioro bienes), 29 (total bienes)
    // Sección 3: Filas 31 (otras brutas), 32 (deterioro otras), 33 (total otras)
    // Fila 34: Gran total CXC corrientes
    // Columnas: F-J rangos, K total vencidas, L total general
    // ---------------------------------------------------------------
    const ifeSheet5 = workbook.getWorksheet('Hoja5');
    if (ifeSheet5) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja5 (CxC)...');

      const CXC_SVC_ROWS: Record<string, number> = {
        acueducto: 17, alcantarillado: 18, aseo: 19,
        energia: 20, gas: 21, glp: 22, xm: 23,
      };
      const CXC_PCTS = [
        { col: 'F', pct: 0.55 }, // No vencidas
        { col: 'G', pct: 0.25 }, // 1-90 días
        { col: 'H', pct: 0.20 }, // 91-180 días
        { col: 'I', pct: 0.00 }, // 181-360 días
        { col: 'J', pct: 0.00 }, // >360 días
      ];
      const CXC_ALL_COLS = ['F', 'G', 'H', 'I', 'J', 'K', 'L'];

      // Clasificación de cuentas PUC 13:
      // - "Otras CXC" = PUC del ESF Row 25 (1311,1317,1319,1322,1324,1333,1384,1385,1387 excl 138401,138414,138424)
      // - "Venta de bienes" = PUC 1316 (ESF Row 24)
      // - "Deterioro" = PUC 1399
      // - Todo lo demás en PUC 13 = "Servicios públicos"
      const isOtrasCXC = (code: string) =>
        matchesPrefixes(code, ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'],
          ['138401', '138414', '138424']);

      // Limpiar todas las celdas de datos (rows 17-34, cols F-L) para evitar datos del template
      for (let r = 17; r <= 34; r++) {
        for (const c of CXC_ALL_COLS) {
          ifeSheet5.getCell(`${c}${r}`).value = 0;
        }
      }

      // Acumular totales para secciones que NO son por servicio
      let totalBienes = 0;    // PUC 1316 (todos los servicios)
      let totalOtras = 0;     // "Otras CXC" (todos los servicios)
      let totalDeterioro = 0; // PUC 1399 (todos los servicios)

      // --- SECCIÓN 1: CXC por prestación de servicios públicos (rows 17-25) ---
      for (const svc of activeServices) {
        const row = CXC_SVC_ROWS[svc];
        if (!row) continue;

        let svcServicios = 0;
        let svcDeterioro = 0;
        const svcAccounts = accountsByService[svc] || [];
        for (const acc of svcAccounts) {
          if (!acc.isLeaf) continue;
          if (!acc.code.startsWith('13')) continue;
          if (acc.code.startsWith('1399')) {
            svcDeterioro += acc.value;
            continue;
          }
          if (acc.code.startsWith('1316')) {
            totalBienes += acc.value;
          } else if (isOtrasCXC(acc.code)) {
            totalOtras += acc.value;
          } else {
            svcServicios += acc.value;
          }
        }
        totalDeterioro += svcDeterioro;

        // Escribir CXC servicios en la fila del servicio
        if (svcServicios !== 0) {
          for (const p of CXC_PCTS) {
            ifeSheet5.getCell(`${p.col}${row}`).value = Math.round(svcServicios * p.pct);
          }
          ifeSheet5.getCell(`K${row}`).value = { formula: `SUM(G${row}:J${row})` };
          ifeSheet5.getCell(`L${row}`).value = { formula: `F${row}+K${row}` };
        }
      }

      // Fila 24: Deterioro de CXC por prestación de servicios públicos (PUC 1399)
      if (totalDeterioro !== 0) {
        const detValue = -Math.abs(totalDeterioro);
        for (const p of CXC_PCTS) {
          ifeSheet5.getCell(`${p.col}24`).value = Math.round(detValue * p.pct);
        }
        ifeSheet5.getCell('K24').value = { formula: 'SUM(G24:J24)' };
        ifeSheet5.getCell('L24').value = { formula: 'F24+K24' };
      }

      // Fila 25: Total CXC por prestación de servicios públicos
      for (const col of CXC_ALL_COLS) {
        ifeSheet5.getCell(`${col}25`).value = { formula: `SUM(${col}17:${col}24)` };
      }

      // --- SECCIÓN 2: CXC por venta de bienes (rows 27-29) ---
      if (totalBienes !== 0) {
        for (const p of CXC_PCTS) {
          ifeSheet5.getCell(`${p.col}27`).value = Math.round(totalBienes * p.pct);
        }
        ifeSheet5.getCell('K27').value = { formula: 'SUM(G27:J27)' };
        ifeSheet5.getCell('L27').value = { formula: 'F27+K27' };
      }
      // Row 28: Deterioro venta bienes = 0 (ya limpio)
      // Row 29: Total CXC por venta de bienes = Row 27 + Row 28
      for (const col of CXC_ALL_COLS) {
        ifeSheet5.getCell(`${col}29`).value = { formula: `${col}27+${col}28` };
      }

      // --- SECCIÓN 3: Otras CXC corrientes (rows 31-33) ---
      if (totalOtras !== 0) {
        for (const p of CXC_PCTS) {
          ifeSheet5.getCell(`${p.col}31`).value = Math.round(totalOtras * p.pct);
        }
        ifeSheet5.getCell('K31').value = { formula: 'SUM(G31:J31)' };
        ifeSheet5.getCell('L31').value = { formula: 'F31+K31' };
      }
      // Row 32: Deterioro otras CXC = 0 (ya limpio)
      // Row 33: Total Otras CXC corrientes = Row 31 + Row 32
      for (const col of CXC_ALL_COLS) {
        ifeSheet5.getCell(`${col}33`).value = { formula: `${col}31+${col}32` };
      }

      // --- FILA 34: Gran total CXC y Otras CXC corrientes ---
      for (const col of CXC_ALL_COLS) {
        ifeSheet5.getCell(`${col}34`).value = { formula: `${col}25+${col}29+${col}33` };
      }

      console.log('[ExcelJS-IFE] Hoja5 (CxC) completada con 3 secciones: servicios/bienes/otras.');
    }

    // ---------------------------------------------------------------
    // HOJA6 IFE (900028t): CxP por rangos de vencimiento
    // Filas: 15 (CxP comerciales), 16 (Otras CxP), 17 (subtotal),
    //        18 (Obligaciones financieras), 19 (Obligaciones laborales), 20 (total)
    // Columnas: D-H rangos, I total vencidas, J total general
    // ---------------------------------------------------------------
    const ifeSheet6 = workbook.getWorksheet('Hoja6');
    if (ifeSheet6) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja6 (CxP)...');

      const CXP_ROWS = [
        { row: 15, puc: ['23'], label: 'CxP comerciales' },
        { row: 16, puc: ['22', '26', '28', '29'], label: 'Otras CxP' },
        { row: 18, puc: ['21'], label: 'Obligaciones financieras' },
        { row: 19, puc: ['24'], label: 'Obligaciones laborales' },
      ];
      const CXP_PCTS = [
        { col: 'D', pct: 0.40 },
        { col: 'E', pct: 0.50 },
        { col: 'F', pct: 0.10 },
        { col: 'G', pct: 0.00 },
        { col: 'H', pct: 0.00 },
      ];

      for (const m of CXP_ROWS) {
        let total = 0;
        for (const acc of options.consolidatedAccounts!) {
          if (!acc.isLeaf) continue;
          if (matchesPrefixes(acc.code, m.puc)) {
            total += Math.abs(acc.value);
          }
        }
        if (total !== 0) {
          for (const r of CXP_PCTS) {
            ifeSheet6.getCell(`${r.col}${m.row}`).value = Math.round(total * r.pct);
          }
          ifeSheet6.getCell(`I${m.row}`).value = { formula: `SUM(E${m.row}:H${m.row})` };
          ifeSheet6.getCell(`J${m.row}`).value = { formula: `D${m.row}+I${m.row}` };
        }
      }

      // Fila 17: subtotal CxP (15+16)
      for (const col of ['D', 'E', 'F', 'G', 'H']) {
        ifeSheet6.getCell(`${col}17`).value = { formula: `SUM(${col}15:${col}16)` };
      }
      ifeSheet6.getCell('I17').value = { formula: 'SUM(E17:H17)' };
      ifeSheet6.getCell('J17').value = { formula: 'D17+I17' };

      // Fila 20: total general (17+18+19)
      for (const col of ['D', 'E', 'F', 'G', 'H']) {
        ifeSheet6.getCell(`${col}20`).value = { formula: `${col}17+${col}18+${col}19` };
      }
      ifeSheet6.getCell('I20').value = { formula: 'SUM(E20:H20)' };
      ifeSheet6.getCell('J20').value = { formula: 'D20+I20' };

      console.log('[ExcelJS-IFE] Hoja6 (CxP) completada.');
    }

    // ---------------------------------------------------------------
    // HOJA7 IFE (900050t): Detalle ingresos y gastos
    // Columnas F-M servicios (diferente a Hoja4), N total
    // ESCRITURA DIRECTA de valores computados desde PUC para que XBRL Express
    // pueda leerlos (no evalúa fórmulas cross-sheet).
    // ---------------------------------------------------------------
    const ifeSheet7 = workbook.getWorksheet('Hoja7');
    if (ifeSheet7) {
      console.log('[ExcelJS-IFE] Reescribiendo Hoja7 (Ingresos y Gastos)...');

      // Mapeo Hoja7 col → servicio
      const H7_MAP = [
        { h7: 'F', svc: 'acueducto' },
        { h7: 'G', svc: 'alcantarillado' },
        { h7: 'H', svc: 'aseo' },
        { h7: 'I', svc: 'energia' },
        { h7: 'J', svc: 'gas' },
        { h7: 'K', svc: 'glp' },
        { h7: 'L', svc: 'xmm' },
        { h7: 'M', svc: 'otras' },
      ];

      // Mapeos de PUC alineados con Hoja4 (ER) para consistencia cross-form
      const H7_ING_ORD  = { puc: ['41', '42', '43'], ex: [] as string[] };  // Row 14: Ingresos ordinarios
      const H7_OTROS_ING = { puc: ['44', '48'], ex: ['4802', '4803'] };      // Otros ingresos + Otras ganancias (4808)
      const H7_ING_FIN  = { puc: ['4802', '4803'], ex: [] as string[] };     // Ingresos financieros
      const H7_COSTO_VTA = { puc: ['62', '63'], ex: [] as string[] };        // Costo ventas
      const H7_GASTOS_AD = { puc: ['51', '52', '56'], ex: [] as string[] };  // Gastos admin
      const H7_OTROS_GAS = { puc: ['53', '58'], ex: ['5802', '5803'] };      // Otros gastos + Otras pérdidas (5808)
      const H7_COSTOS_FI = { puc: ['5802', '5803'], ex: [] as string[] };    // Costos financieros
      const H7_IMPUESTOS = { puc: ['54'], ex: [] as string[] };              // Gasto por impuesto

      // Helper local para sumar PUC por servicio con abs
      const sumSvcAbs = (svc: string, puc: string[], ex: string[]): number => {
        let v = 0;
        const accs = accountsByService[svc] || [];
        for (const a of accs) {
          if (!a.isLeaf) continue;
          if (matchesPrefixes(a.code, puc, ex)) v += Math.abs(a.value);
        }
        return v;
      };

      // Detalle PUC clase 53 para filas 21-24
      const H7_DETAIL = [
        { row: 21, puc: ['5346'], excl: [] as string[] },         // Deterioro
        { row: 22, puc: ['5360', '5361'], excl: [] as string[] }, // Depreciación
        { row: 23, puc: ['5365', '5366'], excl: [] as string[] }, // Amortización
        { row: 24, puc: ['53'], excl: ['5346', '5360', '5361', '5365', '5366'] }, // Provisiones
      ];

      // Limpiar TODAS las filas de datos (F-N) para evitar datos residuales
      for (const row of [14, 15, 16, 18, 19, 20, 21, 22, 23, 24]) {
        for (const col of ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']) {
          ifeSheet7.getCell(`${col}${row}`).value = 0;
        }
      }

      // Escribir valores por servicio
      for (const m of H7_MAP) {
        // Fila 14: Ingresos de actividades ordinarias
        const ingOrd = sumSvcAbs(m.svc, H7_ING_ORD.puc, H7_ING_ORD.ex);
        ifeSheet7.getCell(`${m.h7}14`).value = ingOrd;

        // Fila 15: Todos los demás ingresos = Otros ingresos + Ingresos financieros
        const otrosIng = sumSvcAbs(m.svc, H7_OTROS_ING.puc, H7_OTROS_ING.ex);
        const ingFin = sumSvcAbs(m.svc, H7_ING_FIN.puc, H7_ING_FIN.ex);
        ifeSheet7.getCell(`${m.h7}15`).value = otrosIng + ingFin;

        // Fila 16: Total ingresos = 14 + 15
        const totalIng = ingOrd + otrosIng + ingFin;
        ifeSheet7.getCell(`${m.h7}16`).value = totalIng;

        // Fila 18: Costos y gastos totales = CostoVentas + GastosAdmin + OtrosGastos + CostosFinancieros
        const costoVta = sumSvcAbs(m.svc, H7_COSTO_VTA.puc, H7_COSTO_VTA.ex);
        const gastosAd = sumSvcAbs(m.svc, H7_GASTOS_AD.puc, H7_GASTOS_AD.ex);
        const otrosGas = sumSvcAbs(m.svc, H7_OTROS_GAS.puc, H7_OTROS_GAS.ex);
        const costosFi = sumSvcAbs(m.svc, H7_COSTOS_FI.puc, H7_COSTOS_FI.ex);
        ifeSheet7.getCell(`${m.h7}18`).value = costoVta + gastosAd + otrosGas + costosFi;

        // Fila 19: Impuestos, tasas y contribuciones
        const impuestos = sumSvcAbs(m.svc, H7_IMPUESTOS.puc, H7_IMPUESTOS.ex);
        ifeSheet7.getCell(`${m.h7}19`).value = impuestos;

        // Fila 20: Gastos financieros
        ifeSheet7.getCell(`${m.h7}20`).value = costosFi;

        // Filas 21-24: Detalle desde PUC clase 53 (SIEMPRE escribir, incluso 0)
        for (const detail of H7_DETAIL) {
          const val = sumSvcAbs(m.svc, detail.puc, detail.excl);
          ifeSheet7.getCell(`${m.h7}${detail.row}`).value = val;
        }
      }

      // Columna N: Total = SUM(F:M) con valor cacheado
      for (const row of [14, 15, 16, 18, 19, 20, 21, 22, 23, 24]) {
        let rowTotal = 0;
        for (const m of H7_MAP) {
          const cellVal = ifeSheet7.getCell(`${m.h7}${row}`).value;
          rowTotal += typeof cellVal === 'number' ? cellVal : 0;
        }
        ifeSheet7.getCell(`N${row}`).value = { formula: `SUM(F${row}:M${row})`, result: rowTotal };
      }

      console.log('[ExcelJS-IFE] Hoja7 (Ingresos y Gastos) completada.');
    }

    console.log('[ExcelJS-IFE] Reescritura IFE completada.');
  }

  // Escribir el buffer con ExcelJS
  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}
