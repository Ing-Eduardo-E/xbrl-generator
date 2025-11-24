import * as XLSX from 'xlsx';

export interface BalanceAccount {
  codigo: string;
  nombre: string;
  valor: number;
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
}

export interface BalanceData {
  cuentas: BalanceAccount[];
  periodo: string;
  empresa: string;
  debug?: {
    totalLeidas: number;
    totalHojas: number;
    distribucionAntes: Record<number, number>;
    distribucionDespues: Record<number, number>;
  };
}

export interface ServiceDistribution {
  servicio: string;
  porcentaje: number;
  cuentas: BalanceAccount[];
}

/**
 * Filtra las cuentas para mantener solo las "hojas" (cuentas sin hijos)
 * Esto evita la doble contabilización de subtotales
 */
function filterLeafAccounts(cuentas: BalanceAccount[]): BalanceAccount[] {
  // Crear un conjunto de todos los códigos que son prefijos de otros
  const codigosConHijos = new Set<string>();
  
  for (let i = 0; i < cuentas.length; i++) {
    for (let j = 0; j < cuentas.length; j++) {
      if (i !== j) {
        // Si el código j empieza con el código i, entonces i tiene hijos
        if (cuentas[j].codigo.startsWith(cuentas[i].codigo) && 
            cuentas[j].codigo.length > cuentas[i].codigo.length) {
          codigosConHijos.add(cuentas[i].codigo);
        }
      }
    }
  }
  
  // Filtrar para mantener solo las cuentas que NO tienen hijos
  return cuentas.filter(cuenta => !codigosConHijos.has(cuenta.codigo));
}

/**
 * Lee un archivo Excel y extrae las cuentas del balance
 */
export async function readBalanceFromExcel(file: File): Promise<BalanceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Buscar la hoja "Consolidado" o la primera hoja disponible
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('consolidado')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Parsear las cuentas del balance
        const cuentas: BalanceAccount[] = [];
        
        // Buscar la fila de encabezados (más flexible)
        let headerRow = -1;
        let codigoCol = 0;
        let nombreCol = 1;
        let valorCol = 2;
        
        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          // Buscar columnas que contengan estas palabras (sin importar tildes o mayúsculas)
          for (let j = 0; j < row.length; j++) {
            if (row[j] && typeof row[j] === 'string') {
              const cell = row[j].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              
              if (cell.includes('codigo') || cell.includes('cod')) {
                headerRow = i;
                codigoCol = j;
              } else if (cell.includes('denominacion') || cell.includes('nombre') || cell.includes('cuenta')) {
                nombreCol = j;
              } else if (cell.includes('total') || cell.includes('valor') || cell.includes('saldo')) {
                valorCol = j;
              }
            }
          }
          
          if (headerRow !== -1) break;
        }
        
        if (headerRow === -1) {
          throw new Error('No se encontró la fila de encabezados en el archivo Excel');
        }
        
        // Procesar las filas de datos
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < Math.max(codigoCol, nombreCol, valorCol) + 1) continue;
          
          const codigo = String(row[codigoCol] || '').trim();
          const nombre = String(row[nombreCol] || '').trim();
          
          // Leer el valor directamente de la columna Total
          const valor = Number(row[valorCol]) || 0;
          
          // Ignorar filas vacías o sin código válido
          if (!codigo || codigo === '' || isNaN(Number(codigo))) continue;
          
          // Ignorar filas con valor 0 (opcional, comentar si quieres incluirlas)
          // if (valor === 0) continue;
          
          // Determinar el tipo de cuenta basado en el código PUC
          let tipo: BalanceAccount['tipo'] = 'activo';
          const codigoNum = parseInt(codigo);
          
          if (codigoNum >= 1000 && codigoNum < 2000) {
            tipo = 'activo';
          } else if (codigoNum >= 2000 && codigoNum < 3000) {
            tipo = 'pasivo';
          } else if (codigoNum >= 3000 && codigoNum < 4000) {
            tipo = 'patrimonio';
          } else if (codigoNum >= 4000 && codigoNum < 5000) {
            tipo = 'ingreso';
          } else if (codigoNum >= 5000 && codigoNum < 7000) {
            tipo = 'gasto';
          }
          
          cuentas.push({
            codigo,
            nombre,
            valor,
            tipo
          });
        }
        
        if (cuentas.length === 0) {
          throw new Error('No se encontraron cuentas válidas en el archivo Excel');
        }
        
        // Filtrar para mantener solo las cuentas "hoja" (sin hijos)
        const cuentasHoja = filterLeafAccounts(cuentas);
        
        // Log de depuración
        console.log('='.repeat(80));
        console.log('PROCESAMIENTO DE EXCEL');
        console.log('='.repeat(80));
        console.log('Columnas detectadas:', { codigoCol, nombreCol, valorCol });
        console.log('Total cuentas leídas:', cuentas.length);
        console.log('Total cuentas hoja:', cuentasHoja.length);
        
        // Distribución por longitud ANTES del filtro
        const distribucionAntes: Record<number, number> = {};
        cuentas.forEach(c => {
          const len = c.codigo.length;
          distribucionAntes[len] = (distribucionAntes[len] || 0) + 1;
        });
        console.log('Distribución ANTES del filtro:', distribucionAntes);
        
        // Distribución por longitud DESPUÉS del filtro
        const distribucionDespues: Record<number, number> = {};
        cuentasHoja.forEach(c => {
          const len = c.codigo.length;
          distribucionDespues[len] = (distribucionDespues[len] || 0) + 1;
        });
        console.log('Distribución DESPUÉS del filtro:', distribucionDespues);
        
        // Calcular totales por tipo
        const totales = {
          activo: cuentasHoja.filter(c => c.tipo === 'activo').reduce((sum, c) => sum + c.valor, 0),
          pasivo: cuentasHoja.filter(c => c.tipo === 'pasivo').reduce((sum, c) => sum + c.valor, 0),
          patrimonio: cuentasHoja.filter(c => c.tipo === 'patrimonio').reduce((sum, c) => sum + c.valor, 0),
          ingreso: cuentasHoja.filter(c => c.tipo === 'ingreso').reduce((sum, c) => sum + c.valor, 0),
          gasto: cuentasHoja.filter(c => c.tipo === 'gasto').reduce((sum, c) => sum + c.valor, 0)
        };
        
        console.log('Totales calculados:', totales);
        
        // Debug: contar activos hoja
        const activosHoja = cuentasHoja.filter(c => c.tipo === 'activo');
        console.log(`Total activos hoja: ${activosHoja.length} cuentas`);
        console.log('Primeros 10 activos hoja:', activosHoja.slice(0, 10));
        console.log('Primeras 10 cuentas hoja:', cuentasHoja.slice(0, 10));
        
        resolve({
          cuentas: cuentasHoja,
          periodo: new Date().toISOString().split('T')[0],
          empresa: 'Empresa de Servicios Públicos',
          debug: {
            totalLeidas: cuentas.length,
            totalHojas: cuentasHoja.length,
            distribucionAntes,
            distribucionDespues
          }
        });
      } catch (error) {
        console.error('ERROR EN PROCESAMIENTO:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Distribuye las cuentas del balance según los porcentajes de cada servicio
 */
export function distributeByServices(
  balance: BalanceData,
  services: Array<{ name: string; percentage: number }>
): ServiceDistribution[] {
  const distributions: ServiceDistribution[] = [];
  
  for (const service of services) {
    const factor = service.percentage / 100;
    const cuentasDistribuidas: BalanceAccount[] = balance.cuentas.map(cuenta => ({
      ...cuenta,
      valor: Math.round(cuenta.valor * factor) // Redondear a enteros
    }));
    
    distributions.push({
      servicio: service.name,
      porcentaje: service.percentage,
      cuentas: cuentasDistribuidas
    });
  }
  
  // Ajustar por redondeo para mantener las ecuaciones contables
  adjustForRounding(distributions, balance.cuentas);
  
  return distributions;
}

/**
 * Ajusta los valores distribuidos para compensar errores de redondeo
 * y mantener las ecuaciones contables
 */
function adjustForRounding(
  distributions: ServiceDistribution[],
  originalCuentas: BalanceAccount[]
): void {
  for (let i = 0; i < originalCuentas.length; i++) {
    const originalValor = originalCuentas[i].valor;
    const sumaDistribuida = distributions.reduce(
      (sum, dist) => sum + dist.cuentas[i].valor,
      0
    );
    
    const diferencia = originalValor - sumaDistribuida;
    
    // Si hay diferencia, ajustar en el servicio con mayor porcentaje
    if (diferencia !== 0) {
      const maxService = distributions.reduce((max, dist) => 
        dist.porcentaje > max.porcentaje ? dist : max
      );
      maxService.cuentas[i].valor += diferencia;
    }
  }
}

/**
 * Valida las ecuaciones contables básicas
 */
export function validateAccountingEquations(cuentas: BalanceAccount[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Calcular totales
  const totalActivo = cuentas
    .filter(c => c.tipo === 'activo')
    .reduce((sum, c) => sum + c.valor, 0);
    
  const totalPasivo = cuentas
    .filter(c => c.tipo === 'pasivo')
    .reduce((sum, c) => sum + c.valor, 0);
    
  const totalPatrimonio = cuentas
    .filter(c => c.tipo === 'patrimonio')
    .reduce((sum, c) => sum + c.valor, 0);
    
  const totalIngresos = cuentas
    .filter(c => c.tipo === 'ingreso')
    .reduce((sum, c) => sum + c.valor, 0);
    
  const totalGastos = cuentas
    .filter(c => c.tipo === 'gasto')
    .reduce((sum, c) => sum + c.valor, 0);
  
  // Validar: Activo = Pasivo + Patrimonio
  const diferencia1 = Math.abs(totalActivo - (totalPasivo + totalPatrimonio));
  if (diferencia1 > 1) { // Tolerancia de 1 peso por redondeo
    errors.push(
      `Ecuación contable no balanceada: Activo (${totalActivo}) ≠ Pasivo + Patrimonio (${totalPasivo + totalPatrimonio})`
    );
  }
  
  // Validar: Utilidad = Ingresos - Gastos
  const utilidad = totalIngresos - totalGastos;
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Genera un resumen del balance
 */
export function generateBalanceSummary(cuentas: BalanceAccount[]): {
  totalActivo: number;
  totalPasivo: number;
  totalPatrimonio: number;
  totalIngresos: number;
  totalGastos: number;
  utilidad: number;
} {
  return {
    totalActivo: cuentas.filter(c => c.tipo === 'activo').reduce((sum, c) => sum + c.valor, 0),
    totalPasivo: cuentas.filter(c => c.tipo === 'pasivo').reduce((sum, c) => sum + c.valor, 0),
    totalPatrimonio: cuentas.filter(c => c.tipo === 'patrimonio').reduce((sum, c) => sum + c.valor, 0),
    totalIngresos: cuentas.filter(c => c.tipo === 'ingreso').reduce((sum, c) => sum + c.valor, 0),
    totalGastos: cuentas.filter(c => c.tipo === 'gasto').reduce((sum, c) => sum + c.valor, 0),
    utilidad: cuentas.filter(c => c.tipo === 'ingreso').reduce((sum, c) => sum + c.valor, 0) -
              cuentas.filter(c => c.tipo === 'gasto').reduce((sum, c) => sum + c.valor, 0)
  };
}
