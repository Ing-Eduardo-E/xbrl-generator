import * as XLSX from 'xlsx';
import { getAllCuentas, getTotalesTodosServicios } from './db';
import type { BalanceServicio } from '../drizzle/schema';

/**
 * Genera un archivo Excel con el balance consolidado y los balances por servicio.
 * 
 * @returns Buffer del archivo Excel generado
 */
export async function generarExcelBalances(): Promise<Buffer> {
  // Crear un nuevo libro de Excel
  const workbook = XLSX.utils.book_new();
  
  // 1. Hoja de Balance Consolidado
  const cuentasConsolidado = await getAllCuentas();
  
  const datosConsolidado = cuentasConsolidado.map(cuenta => ({
    'Código': cuenta.codigo,
    'Denominación': cuenta.nombre,
    'Valor': cuenta.valor,
    'Longitud': cuenta.longitud,
    'Es Hoja': cuenta.esHoja === 1 ? 'Sí' : 'No',
  }));
  
  const worksheetConsolidado = XLSX.utils.json_to_sheet(datosConsolidado);
  
  // Ajustar ancho de columnas
  worksheetConsolidado['!cols'] = [
    { wch: 15 }, // Código
    { wch: 50 }, // Denominación
    { wch: 15 }, // Valor
    { wch: 10 }, // Longitud
    { wch: 10 }, // Es Hoja
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheetConsolidado, 'Consolidado');
  
  // 2. Obtener los servicios y sus datos
  const totalesServicios = await getTotalesTodosServicios();
  
  // 3. Crear una hoja por cada servicio
  for (const servicio of totalesServicios) {
    // Obtener las cuentas de este servicio desde la base de datos
    const db = await import('./db').then(m => m.getDb());
    if (!db) {
      throw new Error('Database not available');
    }
    
    const { balancesServicio } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    
    const cuentasServicio = await db
      .select()
      .from(balancesServicio)
      .where(eq(balancesServicio.servicio, servicio.servicio));
    
    const datosServicio = cuentasServicio.map((cuenta: BalanceServicio) => ({
      'Código': cuenta.codigo,
      'Denominación': cuenta.nombre,
      'Valor': cuenta.valor,
      'Longitud': cuenta.longitud,
      'Es Hoja': cuenta.esHoja === 1 ? 'Sí' : 'No',
      'Porcentaje': `${cuenta.porcentaje}%`,
    }));
    
    const worksheetServicio = XLSX.utils.json_to_sheet(datosServicio);
    
    // Ajustar ancho de columnas
    worksheetServicio['!cols'] = [
      { wch: 15 }, // Código
      { wch: 50 }, // Denominación
      { wch: 15 }, // Valor
      { wch: 10 }, // Longitud
      { wch: 10 }, // Es Hoja
      { wch: 12 }, // Porcentaje
    ];
    
    // Agregar hoja de resumen al inicio
    const resumen = [
      ['Servicio', servicio.servicio],
      ['Porcentaje', `${servicio.porcentaje}%`],
      [''],
      ['TOTALES POR CLASE'],
      ['Activos', servicio.activos],
      ['Pasivos', servicio.pasivos],
      ['Patrimonio', servicio.patrimonio],
      ['Ingresos', servicio.ingresos],
      ['Gastos', servicio.gastos],
      ['Costos', servicio.costos],
      [''],
      ['VALIDACIÓN CONTABLE'],
      ['Activo - (Pasivo + Patrimonio)', servicio.activos - (servicio.pasivos + servicio.patrimonio)],
      [''],
      ['DETALLE DE CUENTAS'],
    ];
    
    // Insertar el resumen al inicio de la hoja
    XLSX.utils.sheet_add_aoa(worksheetServicio, resumen, { origin: 'A1' });
    
    // Insertar los datos de cuentas después del resumen
    XLSX.utils.sheet_add_json(worksheetServicio, datosServicio, { 
      origin: `A${resumen.length + 1}`,
      skipHeader: false,
    });
    
    // Nombre de la hoja (máximo 31 caracteres en Excel)
    const nombreHoja = servicio.servicio.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheetServicio, nombreHoja);
  }
  
  // 4. Generar el buffer del archivo Excel
  const excelBuffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx',
    compression: true,
  });
  
  return excelBuffer;
}

/**
 * Genera solo el balance consolidado en Excel.
 */
export async function generarExcelConsolidado(): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  const cuentasConsolidado = await getAllCuentas();
  
  const datosConsolidado = cuentasConsolidado.map(cuenta => ({
    'Código': cuenta.codigo,
    'Denominación': cuenta.nombre,
    'Valor': cuenta.valor,
    'Longitud': cuenta.longitud,
    'Es Hoja': cuenta.esHoja === 1 ? 'Sí' : 'No',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(datosConsolidado);
  
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 50 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Consolidado');
  
  const excelBuffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx',
    compression: true,
  });
  
  return excelBuffer;
}
