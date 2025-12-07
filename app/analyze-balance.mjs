import ExcelJS from "exceljs";

async function analyzeFiles() {
  // 1. Leer el balance distribuido generado por la app
  console.log("=== BALANCE DISTRIBUIDO ===\n");
  const balanceWb = new ExcelJS.Workbook();
  await balanceWb.xlsx.readFile("C:\\Users\\rekin\\Downloads\\Resultados\\Balance_Distribuido_2025-12-07.xlsx");
  
  // Listar hojas
  console.log("Hojas disponibles:");
  balanceWb.eachSheet((sheet) => console.log(`  - ${sheet.name}`));
  
  // Buscar hoja de servicios (distribución)
  const distSheet = balanceWb.getWorksheet("Acueducto") || balanceWb.getWorksheet("Distribucion") || balanceWb.worksheets[1];
  if (distSheet) {
    console.log(`\nHoja seleccionada: ${distSheet.name}`);
    console.log("\nPrimeras 20 filas:");
    for (let row = 1; row <= 20; row++) {
      const a = distSheet.getCell(row, 1).value || "";
      const b = distSheet.getCell(row, 2).value || "";
      const c = distSheet.getCell(row, 3).value || "";
      if (a || b || c) {
        console.log(`  Fila ${row}: ${a} | ${b} | ${c}`);
      }
    }
  }
  
  // 2. Leer la taxonomía IFE generada
  console.log("\n\n=== TAXONOMIA IFE GENERADA ===\n");
  const ifeWb = new ExcelJS.Workbook();
  await ifeWb.xlsx.readFile("C:\\Users\\rekin\\Downloads\\Resultados\\IFE_PuntoEntradaSegundoTrimestre-2024.xlsx");
  
  console.log("Hojas disponibles:");
  ifeWb.eachSheet((sheet) => console.log(`  - ${sheet.name}`));
  
  // Leer Hoja3 (ESF)
  const hoja3 = ifeWb.getWorksheet("Hoja3");
  if (hoja3) {
    console.log("\n--- Hoja3 (ESF - 210000t) ---");
    console.log("Columnas: I=Acueducto, J=Alcantarillado, K=Aseo, Q=Total\n");
    
    // Filas relevantes según el formulario
    const rows = [15, 16, 19, 24, 25, 27, 28, 30, 31, 34, 36, 49, 56, 57, 60, 61, 62, 63, 77, 78, 80, 81, 82];
    
    console.log("Fila | Descripción | I (Acu) | J (Alc) | K (Aseo) | Q (Total) | Suma I+J+K");
    console.log("-".repeat(100));
    
    for (const row of rows) {
      const desc = hoja3.getCell(`H${row}`).value || hoja3.getCell(`G${row}`).value || hoja3.getCell(`F${row}`).value || "";
      const valI = Number(hoja3.getCell(`I${row}`).value) || 0;
      const valJ = Number(hoja3.getCell(`J${row}`).value) || 0;
      const valK = Number(hoja3.getCell(`K${row}`).value) || 0;
      const valQ = Number(hoja3.getCell(`Q${row}`).value) || 0;
      const suma = valI + valJ + valK;
      const match = valQ === suma ? "✓" : `≠ (diff: ${valQ - suma})`;
      
      console.log(`${row.toString().padStart(4)} | ${String(desc).substring(0, 30).padEnd(30)} | ${valI.toString().padStart(12)} | ${valJ.toString().padStart(12)} | ${valK.toString().padStart(12)} | ${valQ.toString().padStart(12)} | ${suma} ${match}`);
    }
  }
}

analyzeFiles().catch(console.error);
