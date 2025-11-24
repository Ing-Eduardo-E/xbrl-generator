import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const file = readFileSync('/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx');
const workbook = XLSX.read(file, { type: 'buffer' });

console.log('Hojas en el archivo:', workbook.SheetNames);
console.log('Leyendo la primera hoja...');

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });

console.log(`Total filas: ${data.length}`);
console.log('Primeras 5 filas:');
data.slice(0, 5).forEach((row, i) => {
  console.log(`Fila ${i}:`, row);
});

// Buscar encabezados
let headerRow = -1;
for (let i = 0; i < Math.min(20, data.length); i++) {
  const row = data[i];
  if (Array.isArray(row)) {
    for (let j = 0; j < row.length; j++) {
      if (row[j] && typeof row[j] === 'string') {
        const cell = row[j].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (cell.includes('codigo')) {
          headerRow = i;
          console.log(`\nEncabezados encontrados en fila ${i}:`, row);
          break;
        }
      }
    }
    if (headerRow !== -1) break;
  }
}

if (headerRow === -1) {
  console.log('\n❌ NO SE ENCONTRARON ENCABEZADOS');
} else {
  console.log(`\n✅ Encabezados en fila ${headerRow}`);
  
  // Leer algunas cuentas
  console.log('\nPrimeras 10 cuentas:');
  for (let i = headerRow + 1; i < Math.min(headerRow + 11, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row) && row[0]) {
      console.log(`  ${row[0]} | ${row[1]} | ${row[2]}`);
    }
  }
}

