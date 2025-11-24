import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const file = readFileSync('/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx');
const workbook = XLSX.read(file, { type: 'buffer' });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });

// Buscar encabezados
let headerRow = 0;
const codigoCol = 0;
const nombreCol = 1;
const valorCol = 2;

console.log('Analizando valores de las primeras 50 cuentas...\n');

let totalSuma = 0;
let cuentasConValor = [];

for (let i = headerRow + 1; i < Math.min(headerRow + 51, data.length); i++) {
  const row = data[i];
  if (!Array.isArray(row)) continue;
  
  const codigo = String(row[codigoCol] || '').trim();
  const nombre = String(row[nombreCol] || '').trim();
  const valor = Number(row[valorCol]) || 0;
  
  if (!codigo || isNaN(Number(codigo))) continue;
  
  totalSuma += valor;
  
  if (valor !== 0) {
    cuentasConValor.push({
      codigo,
      nombre: nombre.substring(0, 40),
      valor,
      longitud: codigo.length
    });
  }
}

console.log('CUENTAS CON VALOR (primeras 50 filas):');
console.log('='.repeat(100));
cuentasConValor.forEach(c => {
  console.log(`${c.codigo.padEnd(8)} (${c.longitud}d) | ${c.nombre.padEnd(42)} | $${c.valor.toLocaleString('es-CO', {minimumFractionDigits: 2})}`);
});

console.log('\n' + '='.repeat(100));
console.log(`SUMA TOTAL (primeras 50 filas): $${totalSuma.toLocaleString('es-CO', {minimumFractionDigits: 2})}`);
console.log('='.repeat(100));

