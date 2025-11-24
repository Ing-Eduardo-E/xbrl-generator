import { readFileSync } from 'fs';
import { procesarArchivoExcel } from './server/excelProcessor.ts';
import {
  truncateCuentasTrabajo,
  insertCuentasTrabajo,
  marcarCuentasHoja,
  calcularTotalesPorClase,
  getCuentasHoja,
  getAllCuentas,
} from './server/db.ts';

async function test() {
  try {
    console.log('=== Test de Procesamiento de Excel ===\n');
    
    // Leer el archivo
    const filePath = '/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx';
    console.log(`Leyendo archivo: ${filePath}`);
    const buffer = readFileSync(filePath);
    
    // Procesar el archivo
    console.log('Procesando archivo Excel...');
    const cuentas = await procesarArchivoExcel(buffer);
    console.log(`✓ Procesadas ${cuentas.length} cuentas\n`);
    
    // Vaciar la tabla
    console.log('Vaciando tabla cuentas_trabajo...');
    await truncateCuentasTrabajo();
    console.log('✓ Tabla vaciada\n');
    
    // Insertar las cuentas
    console.log('Insertando cuentas en la base de datos...');
    await insertCuentasTrabajo(cuentas);
    console.log('✓ Cuentas insertadas\n');
    
    // Marcar cuentas hoja
    console.log('Marcando cuentas hoja usando SQL...');
    await marcarCuentasHoja();
    console.log('✓ Cuentas hoja marcadas\n');
    
    // Obtener estadísticas
    const todasCuentas = await getAllCuentas();
    const cuentasHoja = await getCuentasHoja();
    
    console.log('=== Estadísticas ===');
    console.log(`Total cuentas: ${todasCuentas.length}`);
    console.log(`Cuentas hoja: ${cuentasHoja.length}`);
    console.log(`Cuentas subtotales: ${todasCuentas.length - cuentasHoja.length}\n`);
    
    // Distribución por longitud
    const distribucion = {};
    for (const cuenta of todasCuentas) {
      const len = cuenta.longitud;
      distribucion[len] = (distribucion[len] || 0) + 1;
    }
    
    console.log('Distribución por longitud de código:');
    for (const [len, count] of Object.entries(distribucion).sort()) {
      console.log(`  ${len} dígitos: ${count} cuentas`);
    }
    console.log('');
    
    // Calcular totales
    console.log('Calculando totales por clase...');
    const totales = await calcularTotalesPorClase();
    
    console.log('=== Totales Calculados ===');
    console.log(`Activos:    $${(totales.activos / 1_000_000).toFixed(2)}M`);
    console.log(`Pasivos:    $${(totales.pasivos / 1_000_000).toFixed(2)}M`);
    console.log(`Patrimonio: $${(totales.patrimonio / 1_000_000).toFixed(2)}M`);
    console.log(`Ingresos:   $${(totales.ingresos / 1_000_000).toFixed(2)}M`);
    console.log(`Gastos:     $${(totales.gastos / 1_000_000).toFixed(2)}M`);
    console.log(`Costos:     $${(totales.costos / 1_000_000).toFixed(2)}M`);
    console.log('');
    
    // Validar ecuaciones contables
    const ecuacion1 = totales.activos - (totales.pasivos + totales.patrimonio);
    const ecuacion2 = (totales.ingresos - totales.gastos - totales.costos);
    
    console.log('=== Validación Contable ===');
    console.log(`Activo - (Pasivo + Patrimonio) = $${(ecuacion1 / 1_000_000).toFixed(2)}M`);
    console.log(`Utilidad (Ingresos - Gastos - Costos) = $${(ecuacion2 / 1_000_000).toFixed(2)}M`);
    
    if (Math.abs(ecuacion1) < 1000) {
      console.log('✓ Ecuación contable balanceada');
    } else {
      console.log('⚠ Ecuación contable NO balanceada');
    }
    
    console.log('\n=== VALOR ESPERADO ===');
    console.log('Activos esperados: $65.92M (según test_excel_activos.py)');
    console.log(`Activos calculados: $${(totales.activos / 1_000_000).toFixed(2)}M`);
    
    const diferencia = Math.abs(totales.activos - 65_921_694.55);
    if (diferencia < 100) {
      console.log('✓ ¡CORRECTO! Los cálculos coinciden con el valor esperado');
    } else {
      console.log(`⚠ DIFERENCIA: $${(diferencia / 1_000_000).toFixed(2)}M`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
