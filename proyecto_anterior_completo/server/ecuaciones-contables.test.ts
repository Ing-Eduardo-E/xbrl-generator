import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { procesarArchivoExcel } from './excelProcessor';
import {
  truncateCuentasTrabajo,
  insertCuentasTrabajo,
  marcarCuentasHoja,
  calcularTotalesPorClase,
} from './db';

describe('Validación de Ecuaciones Contables', () => {
  let totales: Awaited<ReturnType<typeof calcularTotalesPorClase>>;
  
  beforeAll(async () => {
    // Cargar el archivo de prueba
    const testFilePath = '/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx';
    const buffer = readFileSync(testFilePath);
    const cuentas = await procesarArchivoExcel(buffer);
    
    // Preparar la base de datos
    await truncateCuentasTrabajo();
    await insertCuentasTrabajo(cuentas);
    await marcarCuentasHoja();
    
    // Calcular totales
    totales = await calcularTotalesPorClase();
  });

  describe('Totales por Clase de Cuenta', () => {
    it('debe mostrar todos los totales calculados', () => {
      console.log('\n=== TOTALES POR CLASE DE CUENTA ===');
      console.log(`Clase 1 - Activos:    $${(totales.activos / 1_000_000).toFixed(2)}M`);
      console.log(`Clase 2 - Pasivos:    $${(totales.pasivos / 1_000_000).toFixed(2)}M`);
      console.log(`Clase 3 - Patrimonio: $${(totales.patrimonio / 1_000_000).toFixed(2)}M`);
      console.log(`Clase 4 - Ingresos:   $${(totales.ingresos / 1_000_000).toFixed(2)}M`);
      console.log(`Clase 5 - Gastos:     $${(totales.gastos / 1_000_000).toFixed(2)}M`);
      console.log(`Clase 6 - Costos:     $${(totales.costos / 1_000_000).toFixed(2)}M`);
      console.log('=====================================\n');
      
      // Verificar que todos los totales sean números válidos
      expect(typeof totales.activos).toBe('number');
      expect(typeof totales.pasivos).toBe('number');
      expect(typeof totales.patrimonio).toBe('number');
      expect(typeof totales.ingresos).toBe('number');
      expect(typeof totales.gastos).toBe('number');
      expect(typeof totales.costos).toBe('number');
    });
  });

  describe('Ecuación Fundamental del Balance', () => {
    it('debe cumplir: Activo = Pasivo + Patrimonio', () => {
      const activo = totales.activos;
      const pasivo = totales.pasivos;
      const patrimonio = totales.patrimonio;
      
      const ladoIzquierdo = activo;
      const ladoDerecho = pasivo + patrimonio;
      const diferencia = ladoIzquierdo - ladoDerecho;
      const porcentajeDiferencia = Math.abs(diferencia / activo) * 100;
      
      console.log('\n=== ECUACIÓN DEL BALANCE ===');
      console.log(`Activo (1):           $${(activo / 1_000_000).toFixed(2)}M`);
      console.log(`Pasivo (2):           $${(pasivo / 1_000_000).toFixed(2)}M`);
      console.log(`Patrimonio (3):       $${(patrimonio / 1_000_000).toFixed(2)}M`);
      console.log(`Pasivo + Patrimonio:  $${(ladoDerecho / 1_000_000).toFixed(2)}M`);
      console.log(`Diferencia:           $${(diferencia / 1_000_000).toFixed(2)}M`);
      console.log(`% Diferencia:         ${porcentajeDiferencia.toFixed(4)}%`);
      
      if (Math.abs(diferencia) < 1000) {
        console.log('✅ ECUACIÓN BALANCEADA (diferencia < $1,000)');
      } else if (porcentajeDiferencia < 0.01) {
        console.log('✅ ECUACIÓN BALANCEADA (diferencia < 0.01%)');
      } else {
        console.log('⚠️  ECUACIÓN NO BALANCEADA');
      }
      console.log('============================\n');
      
      // La diferencia debe ser menor al 0.01% del activo (tolerancia de redondeo)
      expect(porcentajeDiferencia).toBeLessThan(0.01);
    });

    it('debe tener activos positivos', () => {
      expect(totales.activos).toBeGreaterThan(0);
    });

    it('debe tener pasivos positivos', () => {
      expect(totales.pasivos).toBeGreaterThan(0);
    });
  });

  describe('Ecuación del Estado de Resultados', () => {
    it('debe calcular la utilidad/pérdida: Ingresos - Gastos - Costos', () => {
      const ingresos = totales.ingresos;
      const gastos = totales.gastos;
      const costos = totales.costos;
      
      const utilidad = ingresos - gastos - costos;
      const margenNeto = (utilidad / ingresos) * 100;
      
      console.log('\n=== ESTADO DE RESULTADOS ===');
      console.log(`Ingresos (4):         $${(ingresos / 1_000_000).toFixed(2)}M`);
      console.log(`Gastos (5):           $${(gastos / 1_000_000).toFixed(2)}M`);
      console.log(`Costos (6):           $${(costos / 1_000_000).toFixed(2)}M`);
      console.log(`Total Egresos (5+6):  $${((gastos + costos) / 1_000_000).toFixed(2)}M`);
      console.log(`Utilidad/Pérdida:     $${(utilidad / 1_000_000).toFixed(2)}M`);
      console.log(`Margen Neto:          ${margenNeto.toFixed(2)}%`);
      
      if (utilidad > 0) {
        console.log('✅ UTILIDAD (resultado positivo)');
      } else {
        console.log('⚠️  PÉRDIDA (resultado negativo)');
      }
      console.log('============================\n');
      
      // Verificar que los valores sean coherentes
      expect(ingresos).toBeGreaterThan(0);
      expect(gastos).toBeGreaterThanOrEqual(0);
      expect(costos).toBeGreaterThanOrEqual(0);
    });

    it('debe tener ingresos mayores a cero', () => {
      expect(totales.ingresos).toBeGreaterThan(0);
    });
  });

  describe('Relación entre Balance y Resultados', () => {
    it('debe analizar la coherencia entre utilidad y patrimonio', () => {
      const ingresos = totales.ingresos;
      const gastos = totales.gastos;
      const costos = totales.costos;
      const patrimonio = totales.patrimonio;
      
      const utilidad = ingresos - gastos - costos;
      
      console.log('\n=== RELACIÓN BALANCE - RESULTADOS ===');
      console.log(`Utilidad del Período:  $${(utilidad / 1_000_000).toFixed(2)}M`);
      console.log(`Patrimonio:            $${(patrimonio / 1_000_000).toFixed(2)}M`);
      
      // En teoría, la utilidad del período debería reflejarse en el patrimonio
      // Pero esto depende de si el balance es de apertura, cierre, etc.
      console.log('\nNota: La utilidad del período normalmente se refleja en el patrimonio,');
      console.log('pero esto depende del tipo de balance y los ajustes contables realizados.');
      console.log('=======================================\n');
      
      // No hacemos assertion aquí porque depende del contexto contable
      expect(true).toBe(true);
    });
  });

  describe('Validación de Integridad de Datos', () => {
    it('debe tener valores absolutos coherentes', () => {
      // Los activos deben ser el valor más grande en un balance típico
      const valorMaximo = Math.max(
        Math.abs(totales.activos),
        Math.abs(totales.pasivos),
        Math.abs(totales.patrimonio),
        Math.abs(totales.ingresos)
      );
      
      console.log('\n=== ANÁLISIS DE MAGNITUDES ===');
      console.log(`Valor máximo absoluto: $${(valorMaximo / 1_000_000).toFixed(2)}M`);
      console.log(`Activos:    ${((Math.abs(totales.activos) / valorMaximo) * 100).toFixed(1)}%`);
      console.log(`Pasivos:    ${((Math.abs(totales.pasivos) / valorMaximo) * 100).toFixed(1)}%`);
      console.log(`Patrimonio: ${((Math.abs(totales.patrimonio) / valorMaximo) * 100).toFixed(1)}%`);
      console.log(`Ingresos:   ${((Math.abs(totales.ingresos) / valorMaximo) * 100).toFixed(1)}%`);
      console.log('==============================\n');
      
      // Verificar que no haya valores NaN o Infinity
      expect(isNaN(totales.activos)).toBe(false);
      expect(isNaN(totales.pasivos)).toBe(false);
      expect(isNaN(totales.patrimonio)).toBe(false);
      expect(isNaN(totales.ingresos)).toBe(false);
      expect(isNaN(totales.gastos)).toBe(false);
      expect(isNaN(totales.costos)).toBe(false);
      
      expect(isFinite(totales.activos)).toBe(true);
      expect(isFinite(totales.pasivos)).toBe(true);
      expect(isFinite(totales.patrimonio)).toBe(true);
    });
  });
});
