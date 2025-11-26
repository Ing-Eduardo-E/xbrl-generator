import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances } from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export interface ServiceTotals {
  service: string;
  activos: number;
  pasivos: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  costos: number;
}

/**
 * Genera un archivo Excel con el balance consolidado y los balances por servicio.
 * 
 * @returns Buffer del archivo Excel generado en base64
 */
export async function generateExcelWithDistribution(): Promise<string> {
  // Crear un nuevo libro de Excel
  const workbook = XLSX.utils.book_new();

  // 1. Hoja de Balance Consolidado
  const allAccounts = await db.select().from(workingAccounts).orderBy(workingAccounts.code);

  const consolidatedData = allAccounts.map((account) => ({
    'Código': account.code,
    'Denominación': account.name,
    'Valor': account.value,
    'Nivel': account.level,
    'Clase': account.class,
    'Es Hoja': account.isLeaf ? 'Sí' : 'No',
  }));

  const worksheetConsolidado = XLSX.utils.json_to_sheet(consolidatedData);

  // Ajustar ancho de columnas
  worksheetConsolidado['!cols'] = [
    { wch: 15 }, // Código
    { wch: 50 }, // Denominación
    { wch: 18 }, // Valor
    { wch: 8 },  // Nivel
    { wch: 15 }, // Clase
    { wch: 10 }, // Es Hoja
  ];

  XLSX.utils.book_append_sheet(workbook, worksheetConsolidado, 'Consolidado');

  // 2. Obtener los servicios únicos
  const services = ['acueducto', 'alcantarillado', 'aseo'];

  // 3. Crear una hoja por cada servicio
  for (const serviceName of services) {
    // Obtener las cuentas de este servicio
    const serviceAccounts = await db
      .select()
      .from(serviceBalances)
      .where(eq(serviceBalances.service, serviceName))
      .orderBy(serviceBalances.code);

    if (serviceAccounts.length === 0) continue;

    // Calcular totales por clase para este servicio
    const totals = await calculateServiceTotals(serviceName);

    // Crear datos del resumen
    const summaryData = [
      ['RESUMEN DEL SERVICIO'],
      ['Servicio', capitalizeFirst(serviceName)],
      [''],
      ['TOTALES POR CLASE'],
      ['Activos', totals.activos],
      ['Pasivos', totals.pasivos],
      ['Patrimonio', totals.patrimonio],
      ['Ingresos', totals.ingresos],
      ['Gastos', totals.gastos],
      ['Costos', totals.costos],
      [''],
      ['VALIDACIÓN CONTABLE'],
      ['Activo - (Pasivo + Patrimonio)', totals.activos - (totals.pasivos + totals.patrimonio)],
      [''],
      ['DETALLE DE CUENTAS'],
      ['Código', 'Denominación', 'Valor'],
    ];

    // Crear worksheet vacío
    const worksheetServicio = XLSX.utils.aoa_to_sheet(summaryData);

    // Agregar los datos de cuentas
    const accountRows = serviceAccounts.map((account) => [
      account.code,
      account.name,
      account.value,
    ]);

    XLSX.utils.sheet_add_aoa(worksheetServicio, accountRows, { origin: `A${summaryData.length + 1}` });

    // Ajustar ancho de columnas
    worksheetServicio['!cols'] = [
      { wch: 15 }, // Código
      { wch: 50 }, // Denominación
      { wch: 18 }, // Valor
    ];

    // Nombre de la hoja (máximo 31 caracteres en Excel)
    const sheetName = capitalizeFirst(serviceName);
    XLSX.utils.book_append_sheet(workbook, worksheetServicio, sheetName);
  }

  // 4. Generar el buffer del archivo Excel
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });

  // Convertir a base64 para enviar por API
  return Buffer.from(excelBuffer).toString('base64');
}

/**
 * Calcula los totales por clase para un servicio específico.
 * IMPORTANTE: Solo suma las cuentas hoja (isLeaf = true) para evitar duplicación.
 */
async function calculateServiceTotals(serviceName: string): Promise<ServiceTotals> {
  const results = await db
    .select({
      firstDigit: sql<string>`substring(${serviceBalances.code}, 1, 1)`,
      total: sql<number>`sum(${serviceBalances.value})`,
    })
    .from(serviceBalances)
    .where(sql`${serviceBalances.service} = ${serviceName} AND ${serviceBalances.isLeaf} = true`)
    .groupBy(sql`substring(${serviceBalances.code}, 1, 1)`);

  const totals: ServiceTotals = {
    service: serviceName,
    activos: 0,
    pasivos: 0,
    patrimonio: 0,
    ingresos: 0,
    gastos: 0,
    costos: 0,
  };

  for (const row of results) {
    const total = Number(row.total) || 0;
    switch (row.firstDigit) {
      case '1':
        totals.activos = total;
        break;
      case '2':
        totals.pasivos = total;
        break;
      case '3':
        totals.patrimonio = total;
        break;
      case '4':
        totals.ingresos = total;
        break;
      case '5':
        totals.gastos = total;
        break;
      case '6':
        totals.costos = total;
        break;
    }
  }

  return totals;
}

/**
 * Genera solo el balance consolidado en Excel.
 */
export async function generateConsolidatedExcel(): Promise<string> {
  const workbook = XLSX.utils.book_new();

  const allAccounts = await db.select().from(workingAccounts).orderBy(workingAccounts.code);

  const consolidatedData = allAccounts.map((account) => ({
    'Código': account.code,
    'Denominación': account.name,
    'Valor': account.value,
    'Nivel': account.level,
    'Clase': account.class,
    'Es Hoja': account.isLeaf ? 'Sí' : 'No',
  }));

  const worksheet = XLSX.utils.json_to_sheet(consolidatedData);

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 50 },
    { wch: 18 },
    { wch: 8 },
    { wch: 15 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Consolidado');

  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });

  return Buffer.from(excelBuffer).toString('base64');
}

/**
 * Capitaliza la primera letra de una cadena.
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
