/**
 * Writer de datos financieros IFE para workbooks Excel.
 * Extraido de excelRewriter.ts para mantener el dispatcher limpio.
 */
import ExcelJS from 'exceljs';
import type { TemplateWithDataOptions } from './interfaces';
import { safeNumericValue } from '../excelUtils';
import { writeCellSafe, matchesPrefixes, type DataWriterContext } from '../shared/excelUtils';

export function writeIFEData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions,
  ctx: DataWriterContext
): void {
  const { accountsByService, activeServices } = ctx;

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
    writeCellSafe(ifeSheet1, 'E13', options.nit || '');
    writeCellSafe(ifeSheet1, 'E14', options.companyId);
    writeCellSafe(ifeSheet1, 'E15', options.companyName);
    writeCellSafe(ifeSheet1, 'E16', options.reportDate);

    const ife = options.ifeCompanyData;
    if (ife) {
      writeCellSafe(ifeSheet1, 'E18', ife.address || '');
      writeCellSafe(ifeSheet1, 'E19', ife.city || '');
      writeCellSafe(ifeSheet1, 'E20', ife.phone || '');
      writeCellSafe(ifeSheet1, 'E21', ife.cellphone || ife.phone || '');
      writeCellSafe(ifeSheet1, 'E22', ife.email || '');
      if (ife.employeesStart !== undefined) writeCellSafe(ifeSheet1, 'E24', ife.employeesStart);
      if (ife.employeesEnd !== undefined) writeCellSafe(ifeSheet1, 'E25', ife.employeesEnd);
      if (ife.employeesAverage !== undefined) writeCellSafe(ifeSheet1, 'E26', ife.employeesAverage);
      if (ife.representativeDocType) {
        const dtMap: Record<string, string> = {
          '01': '01 - CÉDULA DE CIUDADANÍA', '02': '02 - CÉDULA DE EXTRANJERÍA', '03': '03 - PASAPORTE',
        };
        writeCellSafe(ifeSheet1, 'E28', dtMap[ife.representativeDocType] || ife.representativeDocType);
      }
      writeCellSafe(ifeSheet1, 'E29', ife.representativeDocNumber || '');
      writeCellSafe(ifeSheet1, 'E30', ife.representativeFirstName || '');
      writeCellSafe(ifeSheet1, 'E31', ife.representativeLastName || '');
      if (ife.normativeGroup) {
        const gMap: Record<string, string> = {
          'R414': 'R. 414', 'NIIF1': 'Grupo 1 - NIIF Plenas',
          'NIIF2': 'Grupo 2 - NIIF PYMES', 'NIIF3': 'Grupo 3 - Microempresas',
        };
        writeCellSafe(ifeSheet1, 'E33', gMap[ife.normativeGroup] || ife.normativeGroup);
      } else {
        writeCellSafe(ifeSheet1, 'E33', 'R. 414');
      }
      writeCellSafe(ifeSheet1, 'E34', ife.complianceDeclaration ? '1. Si cumple' : '2. No cumple');
      writeCellSafe(ifeSheet1, 'E35', ife.goingConcernUncertainty ? '1. Si' : '2. No');
      writeCellSafe(ifeSheet1, 'E36', ife.goingConcernExplanation || 'NA');
      writeCellSafe(ifeSheet1, 'E38', '2. No');
      writeCellSafe(ifeSheet1, 'E39', ife.servicesTermination ? '1. Si' : '2. No');
      writeCellSafe(ifeSheet1, 'E40', ife.servicesTerminationExplanation || 'NA');
    } else {
      writeCellSafe(ifeSheet1, 'E33', 'R. 414');
      writeCellSafe(ifeSheet1, 'E34', '1. Si cumple');
      writeCellSafe(ifeSheet1, 'E35', '2. No');
      writeCellSafe(ifeSheet1, 'E36', 'NA');
      writeCellSafe(ifeSheet1, 'E38', '2. No');
      writeCellSafe(ifeSheet1, 'E39', '2. No');
      writeCellSafe(ifeSheet1, 'E40', 'NA');
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
    writeCellSafe(ifeSheet2, 'G13', efectivoFinal);

    // G15: Incrementos (disminuciones) en el efectivo = 0
    // (no tenemos balance de apertura para calcular la diferencia)
    writeCellSafe(ifeSheet2, 'G15', 0);

    // G16: Efectivo y equivalentes al efectivo al inicio del periodo = 0
    writeCellSafe(ifeSheet2, 'G16', 0);

    // G14: Información sobre variaciones de flujo de efectivo (texto obligatorio)
    writeCellSafe(ifeSheet2, 'G14', 'Sin observaciones');

    // G18-G23: Notas de revelación (texto obligatorio)
    writeCellSafe(ifeSheet2, 'G18', 'Sin observaciones');
    writeCellSafe(ifeSheet2, 'G19', 'Sin observaciones');
    writeCellSafe(ifeSheet2, 'G20', 'Sin observaciones');
    writeCellSafe(ifeSheet2, 'G21', 'Sin observaciones');
    writeCellSafe(ifeSheet2, 'G22', 'Sin observaciones');
    writeCellSafe(ifeSheet2, 'G23', 'Sin observaciones');

    // G25-G33: Sección de ajustes a información certificada
    writeCellSafe(ifeSheet2, 'G25', '2. No');
    writeCellSafe(ifeSheet2, 'G26', '2. No');
    writeCellSafe(ifeSheet2, 'G27', 'NA');
    writeCellSafe(ifeSheet2, 'G28', '2. No');
    writeCellSafe(ifeSheet2, 'G29', 'NA');
    writeCellSafe(ifeSheet2, 'G30', '2. No');
    writeCellSafe(ifeSheet2, 'G31', 'NA');
    writeCellSafe(ifeSheet2, 'G32', '2. No');
    writeCellSafe(ifeSheet2, 'G33', 'NA');

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
          writeCellSafe(ifeSheet3, `${col}${m.row}`, svcValue);
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
          writeCellSafe(ifeSheet3, `${col}82`, svcER);
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
        writeCellSafe(ifeSheet3, `${C}${row}`, 0);
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
        writeCellSafe(ifeSheet4, `M${m.row}`, totalValue);
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
          writeCellSafe(ifeSheet4, `${col}${m.row}`, svcValue);
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
        writeCellSafe(ifeSheet4, `${C}${row}`, 0);
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
        writeCellSafe(ifeSheet5, `${c}${r}`, 0);
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
          writeCellSafe(ifeSheet5, `${p.col}${row}`, Math.round(svcServicios * p.pct));
        }
        ifeSheet5.getCell(`K${row}`).value = { formula: `SUM(G${row}:J${row})` };
        ifeSheet5.getCell(`L${row}`).value = { formula: `F${row}+K${row}` };
      }
    }

    // Fila 24: Deterioro de CXC por prestación de servicios públicos (PUC 1399)
    if (totalDeterioro !== 0) {
      const detValue = -Math.abs(totalDeterioro);
      for (const p of CXC_PCTS) {
        writeCellSafe(ifeSheet5, `${p.col}24`, Math.round(detValue * p.pct));
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
        writeCellSafe(ifeSheet5, `${p.col}27`, Math.round(totalBienes * p.pct));
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
        writeCellSafe(ifeSheet5, `${p.col}31`, Math.round(totalOtras * p.pct));
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
      { row: 16, puc: ['26', '28', '29'], label: 'Otras CxP' },
      { row: 18, puc: ['21', '22'], label: 'Obligaciones financieras' },
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
          writeCellSafe(ifeSheet6, `${r.col}${m.row}`, Math.round(total * r.pct));
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
        writeCellSafe(ifeSheet7, `${col}${row}`, 0);
      }
    }

    // Escribir valores por servicio
    for (const m of H7_MAP) {
      // Fila 14: Ingresos de actividades ordinarias
      const ingOrd = sumSvcAbs(m.svc, H7_ING_ORD.puc, H7_ING_ORD.ex);
      writeCellSafe(ifeSheet7, `${m.h7}14`, ingOrd);

      // Fila 15: Todos los demás ingresos = Otros ingresos + Ingresos financieros
      const otrosIng = sumSvcAbs(m.svc, H7_OTROS_ING.puc, H7_OTROS_ING.ex);
      const ingFin = sumSvcAbs(m.svc, H7_ING_FIN.puc, H7_ING_FIN.ex);
      writeCellSafe(ifeSheet7, `${m.h7}15`, otrosIng + ingFin);

      // Fila 16: Total ingresos = 14 + 15
      const totalIng = ingOrd + otrosIng + ingFin;
      writeCellSafe(ifeSheet7, `${m.h7}16`, totalIng);

      // Fila 18: Costos y gastos totales = CostoVentas + GastosAdmin + OtrosGastos + CostosFinancieros
      const costoVta = sumSvcAbs(m.svc, H7_COSTO_VTA.puc, H7_COSTO_VTA.ex);
      const gastosAd = sumSvcAbs(m.svc, H7_GASTOS_AD.puc, H7_GASTOS_AD.ex);
      const otrosGas = sumSvcAbs(m.svc, H7_OTROS_GAS.puc, H7_OTROS_GAS.ex);
      const costosFi = sumSvcAbs(m.svc, H7_COSTOS_FI.puc, H7_COSTOS_FI.ex);
      writeCellSafe(ifeSheet7, `${m.h7}18`, costoVta + gastosAd + otrosGas + costosFi);

      // Fila 19: Impuestos, tasas y contribuciones
      const impuestos = sumSvcAbs(m.svc, H7_IMPUESTOS.puc, H7_IMPUESTOS.ex);
      writeCellSafe(ifeSheet7, `${m.h7}19`, impuestos);

      // Fila 20: Gastos financieros
      writeCellSafe(ifeSheet7, `${m.h7}20`, costosFi);

      // Filas 21-24: Detalle desde PUC clase 53 (SIEMPRE escribir, incluso 0)
      for (const detail of H7_DETAIL) {
        const val = sumSvcAbs(m.svc, detail.puc, detail.excl);
        writeCellSafe(ifeSheet7, `${m.h7}${detail.row}`, val);
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
