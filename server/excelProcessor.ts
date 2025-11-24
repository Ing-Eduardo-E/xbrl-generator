import * as XLSX from 'xlsx';
import { InsertCuentaTrabajo } from '../drizzle/schema';

/**
 * Interfaz para los datos de una cuenta leída del Excel
 */
interface CuentaRaw {
  codigo: string;
  nombre: string;
  valor: number;
}

/**
 * Lee un archivo Excel y extrae las cuentas del balance.
 * Busca automáticamente las columnas CÓDIGO, DENOMINACIÓN y Total.
 * 
 * @param buffer Buffer del archivo Excel
 * @returns Array de cuentas listas para insertar en la BD
 */
export async function procesarArchivoExcel(buffer: Buffer): Promise<InsertCuentaTrabajo[]> {
  try {
    // Leer el archivo Excel desde el buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Obtener la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El archivo Excel está vacío');
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir a JSON con encabezados
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,  // Convertir todo a string primero
      defval: ''   // Valor por defecto para celdas vacías
    });
    
    if (rawData.length === 0) {
      throw new Error('La hoja de Excel no contiene datos');
    }
    
    // Detectar nombres de columnas (pueden tener tildes o variaciones)
    const firstRow = rawData[0] as any;
    const headers = Object.keys(firstRow);
    
    // Buscar columnas de forma flexible
    const codigoCol = headers.find(h => 
      h.toLowerCase().includes('codigo') || 
      h.toLowerCase().includes('código') ||
      h.toLowerCase() === 'código' ||
      h.toLowerCase() === 'codigo'
    );
    
    const nombreCol = headers.find(h => 
      h.toLowerCase().includes('denominacion') || 
      h.toLowerCase().includes('denominación') ||
      h.toLowerCase().includes('nombre') ||
      h.toLowerCase() === 'denominación' ||
      h.toLowerCase() === 'denominacion'
    );
    
    const valorCol = headers.find(h => 
      h.toLowerCase().includes('total') ||
      h.toLowerCase() === 'total'
    );
    
    if (!codigoCol || !nombreCol || !valorCol) {
      throw new Error(
        `No se encontraron las columnas requeridas. ` +
        `Encontradas: ${headers.join(', ')}. ` +
        `Se requieren: CÓDIGO, DENOMINACIÓN, Total`
      );
    }
    
    console.log(`[Excel] Columnas detectadas: ${codigoCol}, ${nombreCol}, ${valorCol}`);
    
    // Procesar cada fila
    const cuentas: InsertCuentaTrabajo[] = [];
    
    for (const row of rawData as any[]) {
      const codigoRaw = String(row[codigoCol] || '').trim();
      const nombreRaw = String(row[nombreCol] || '').trim();
      const valorRaw = String(row[valorCol] || '').trim();
      
      // Saltar filas vacías
      if (!codigoRaw || !nombreRaw) {
        continue;
      }
      
      // Limpiar el código (remover puntos, espacios, etc.)
      const codigo = codigoRaw.replace(/[.\s]/g, '');
      
      // Validar que el código sea numérico
      if (!/^\d+$/.test(codigo)) {
        console.warn(`[Excel] Código inválido ignorado: "${codigoRaw}"`);
        continue;
      }
      
      // Parsear el valor (remover comas de miles, símbolos de moneda, espacios)
      let valor = 0;
      if (valorRaw) {
        // Remover símbolos de moneda y espacios
        let valorLimpio = valorRaw.replace(/[$\s]/g, '');
        // Si tiene comas, asumir que son separadores de miles y removerlas
        // Si tiene punto, asumir que es separador decimal
        valorLimpio = valorLimpio.replace(/,/g, '');
        const valorNumerico = parseFloat(valorLimpio);
        valor = Math.round(valorNumerico || 0);
      }
      
      cuentas.push({
        codigo,
        nombre: nombreRaw,
        valor,
        longitud: codigo.length,
        esHoja: 0, // Se calculará después con SQL
      });
    }
    
    if (cuentas.length === 0) {
      throw new Error('No se encontraron cuentas válidas en el archivo');
    }
    
    console.log(`[Excel] Procesadas ${cuentas.length} cuentas`);
    
    return cuentas;
  } catch (error) {
    console.error('[Excel] Error al procesar archivo:', error);
    throw error;
  }
}

/**
 * Valida que el archivo sea un Excel válido
 */
export function validarArchivoExcel(filename: string): boolean {
  const ext = filename.toLowerCase();
  return ext.endsWith('.xlsx') || ext.endsWith('.xls');
}
