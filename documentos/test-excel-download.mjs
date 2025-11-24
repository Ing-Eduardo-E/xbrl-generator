import { generarExcelBalances } from './server/excelGenerator.ts';
import { writeFileSync } from 'fs';

console.log('[Test] Generando Excel...');

try {
  const buffer = await generarExcelBalances();
  
  console.log(`[Test] Buffer generado: ${buffer.length} bytes`);
  
  // Guardar el archivo para inspección
  writeFileSync('/tmp/test-balances.xlsx', buffer);
  
  console.log('[Test] ✅ Archivo guardado en /tmp/test-balances.xlsx');
} catch (error) {
  console.error('[Test] ❌ Error:', error);
  process.exit(1);
}
