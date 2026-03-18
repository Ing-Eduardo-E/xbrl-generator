import * as XLSX from 'xlsx';
import type { ParsedAccount } from './excelParser';
import type { QuarterlyProjection } from './projectionEngine';

export function generateQuarterlyExcel(accounts: ParsedAccount[], quarterLabel: string): Buffer {
  const workbook = XLSX.utils.book_new();
  // Fila de encabezado
  const data: (string | number)[][] = [['Código', 'Denominación', 'Total']];
  // Ordenar por código y agregar todas las cuentas
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));
  for (const acc of sorted) {
    data.push([acc.code, acc.name, Math.round(acc.value)]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(data);
  // Ancho de columnas
  sheet['!cols'] = [
    { wch: 15 }, // Código
    { wch: 60 }, // Denominación
    { wch: 20 }, // Total
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Consolidado');
  return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
}

export interface QuarterlyExcelFiles {
  files: Array<{
    fileName: string;
    base64: string;
    quarter: string;
  }>;
}

export function generateQuarterlyExcelFiles(
  projections: QuarterlyProjection[],
  companyName: string,
  year: number
): QuarterlyExcelFiles {
  const files = projections.map((proj) => {
    const buffer = generateQuarterlyExcel(proj.accounts, proj.label);
    // Sanitizar el nombre de la empresa para el nombre del archivo
    const sanitizedName = companyName.replace(/[^a-zA-Z0-9_\-\s]/g, '').substring(0, 50);
    const fileName = `${sanitizedName}_${proj.quarter}_${year}.xlsx`;
    return {
      fileName,
      base64: buffer.toString('base64'),
      quarter: proj.quarter,
    };
  });
  return { files };
}