import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { procesarArchivoExcel } from './excelProcessor';
import {
  truncateCuentasTrabajo,
  insertCuentasTrabajo,
  marcarCuentasHoja,
  calcularTotalesPorClase,
  getCuentasHoja,
  getAllCuentas,
} from './db';

describe('Balance Processing', () => {
  const testFilePath = '/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx';
  
  beforeAll(async () => {
    // Limpiar la base de datos primero
    await truncateCuentasTrabajo();
    
    // Cargar el archivo de prueba
    const buffer = readFileSync(testFilePath);
    const cuentas = await procesarArchivoExcel(buffer);
    
    // Preparar la base de datos
    await insertCuentasTrabajo(cuentas);
    await marcarCuentasHoja();
  }, 10000);

  describe('Excel Processing', () => {
    it('debe procesar el archivo Excel correctamente', async () => {
      const buffer = readFileSync(testFilePath);
      const cuentas = await procesarArchivoExcel(buffer);
      
      expect(cuentas).toBeDefined();
      expect(cuentas.length).toBeGreaterThan(0);
      expect(cuentas.length).toBe(3734);
    });

    it('debe extraer códigos, nombres y valores correctamente', async () => {
      const buffer = readFileSync(testFilePath);
      const cuentas = await procesarArchivoExcel(buffer);
      
      // Buscar la cuenta de Activos (código "1")
      const activos = cuentas.find(c => c.codigo === '1');
      expect(activos).toBeDefined();
      expect(activos?.nombre).toBe('ACTIVOS');
      expect(activos?.valor).toBe(65921695); // Redondeado de 65921694.55
      expect(activos?.longitud).toBe(1);
    });

    it('debe calcular la longitud del código correctamente', async () => {
      const buffer = readFileSync(testFilePath);
      const cuentas = await procesarArchivoExcel(buffer);
      
      const cuenta1Digito = cuentas.find(c => c.codigo === '1');
      const cuenta2Digitos = cuentas.find(c => c.codigo === '11');
      const cuenta4Digitos = cuentas.find(c => c.codigo === '1105');
      
      expect(cuenta1Digito?.longitud).toBe(1);
      expect(cuenta2Digitos?.longitud).toBe(2);
      expect(cuenta4Digitos?.longitud).toBe(4);
    });
  });

  describe('Database Operations', () => {
    it('debe insertar todas las cuentas en la base de datos', async () => {
      const todasCuentas = await getAllCuentas();
      expect(todasCuentas.length).toBe(3734);
    });

    it('debe marcar correctamente las cuentas hoja', async () => {
      const cuentasHoja = await getCuentasHoja();
      expect(cuentasHoja.length).toBe(3323);
      
      // Verificar que todas las cuentas hoja tienen es_hoja = 1
      for (const cuenta of cuentasHoja) {
        expect(cuenta.esHoja).toBe(1);
      }
    });

    it('debe identificar correctamente las cuentas subtotales', async () => {
      const todasCuentas = await getAllCuentas();
      const cuentasHoja = await getCuentasHoja();
      const cuentasSubtotales = todasCuentas.length - cuentasHoja.length;
      
      expect(cuentasSubtotales).toBe(411);
    });
  });

  describe('Totals Calculation', () => {
    it('debe calcular los totales por clase correctamente', async () => {
      const totales = await calcularTotalesPorClase();
      
      expect(totales).toBeDefined();
      expect(totales.activos).toBeDefined();
      expect(totales.pasivos).toBeDefined();
      expect(totales.patrimonio).toBeDefined();
      expect(totales.ingresos).toBeDefined();
      expect(totales.gastos).toBeDefined();
      expect(totales.costos).toBeDefined();
    });

    it('debe calcular correctamente el total de activos', async () => {
      const totales = await calcularTotalesPorClase();
      
      // Valor esperado: $65,921,694.55 (redondeado a 65,921,695)
      expect(totales.activos).toBe(65921695);
    });

    it('debe validar la ecuación contable básica', async () => {
      const totales = await calcularTotalesPorClase();
      
      // Activo = Pasivo + Patrimonio (con tolerancia de redondeo)
      const diferencia = Math.abs(
        totales.activos - (totales.pasivos + totales.patrimonio)
      );
      
      // La diferencia debe ser menor a 1000 (tolerancia de redondeo)
      expect(diferencia).toBeLessThan(1000);
    });

    it('debe tener valores coherentes para todas las clases', async () => {
      const totales = await calcularTotalesPorClase();
      
      // Verificar que los totales son números válidos
      expect(typeof totales.activos).toBe('number');
      expect(typeof totales.pasivos).toBe('number');
      expect(typeof totales.patrimonio).toBe('number');
      expect(typeof totales.ingresos).toBe('number');
      expect(typeof totales.gastos).toBe('number');
      expect(typeof totales.costos).toBe('number');
      
      // Verificar que no son NaN
      expect(isNaN(totales.activos)).toBe(false);
      expect(isNaN(totales.pasivos)).toBe(false);
      expect(isNaN(totales.patrimonio)).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('debe mantener la integridad de los datos después de TRUNCATE', async () => {
      // Obtener totales antes
      const totalesAntes = await calcularTotalesPorClase();
      
      // Recargar los datos
      const buffer = readFileSync(testFilePath);
      const cuentas = await procesarArchivoExcel(buffer);
      await truncateCuentasTrabajo();
      await insertCuentasTrabajo(cuentas);
      await marcarCuentasHoja();
      
      // Obtener totales después
      const totalesDespues = await calcularTotalesPorClase();
      
      // Los totales deben ser iguales
      expect(totalesDespues.activos).toBe(totalesAntes.activos);
      expect(totalesDespues.pasivos).toBe(totalesAntes.pasivos);
      expect(totalesDespues.patrimonio).toBe(totalesAntes.patrimonio);
    });
  });
});
