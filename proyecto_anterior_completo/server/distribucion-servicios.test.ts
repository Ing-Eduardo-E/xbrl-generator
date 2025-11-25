import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { procesarArchivoExcel } from './excelProcessor';
import {
  truncateCuentasTrabajo,
  insertCuentasTrabajo,
  marcarCuentasHoja,
  calcularTotalesPorClase,
  distribuirPorServicios,
  getTotalesTodosServicios,
  calcularTotalesPorServicio,
} from './db';

describe('Distribución por Servicios', () => {
  let totalesConsolidado: Awaited<ReturnType<typeof calcularTotalesPorClase>>;
  
  beforeAll(async () => {
    // Cargar el archivo de prueba
    const testFilePath = '/home/ubuntu/upload/EstadosFinancierosaño2023.xlsx';
    const buffer = readFileSync(testFilePath);
    const cuentas = await procesarArchivoExcel(buffer);
    
    // Preparar la base de datos
    await truncateCuentasTrabajo();
    await insertCuentasTrabajo(cuentas);
    await marcarCuentasHoja();
    
    // Calcular totales consolidados
    totalesConsolidado = await calcularTotalesPorClase();
    
    // Distribuir por servicios (40% Acueducto, 20% Alcantarillado, 40% Aseo)
    await distribuirPorServicios([
      { nombre: 'Acueducto', porcentaje: 40 },
      { nombre: 'Alcantarillado', porcentaje: 20 },
      { nombre: 'Aseo', porcentaje: 40 },
    ]);
  });

  describe('Validación de Porcentajes', () => {
    it('debe rechazar porcentajes que no sumen 100%', async () => {
      await expect(
        distribuirPorServicios([
          { nombre: 'Acueducto', porcentaje: 40 },
          { nombre: 'Alcantarillado', porcentaje: 30 }, // Suma 70%
        ])
      ).rejects.toThrow('Los porcentajes deben sumar 100%');
    });

    it('debe aceptar porcentajes que sumen exactamente 100%', async () => {
      await expect(
        distribuirPorServicios([
          { nombre: 'Acueducto', porcentaje: 40 },
          { nombre: 'Alcantarillado', porcentaje: 20 },
          { nombre: 'Aseo', porcentaje: 40 },
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('Distribución de Totales', () => {
    it('debe distribuir correctamente los totales entre servicios', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      console.log('\n=== DISTRIBUCIÓN POR SERVICIOS ===');
      console.log(`\nCONSOLIDADO (100%):`);
      console.log(`  Activos:    $${(totalesConsolidado.activos / 1_000_000).toFixed(2)}M`);
      console.log(`  Pasivos:    $${(totalesConsolidado.pasivos / 1_000_000).toFixed(2)}M`);
      console.log(`  Patrimonio: $${(totalesConsolidado.patrimonio / 1_000_000).toFixed(2)}M`);
      console.log(`  Ingresos:   $${(totalesConsolidado.ingresos / 1_000_000).toFixed(2)}M`);
      
      for (const servicio of totalesServicios) {
        console.log(`\n${servicio.servicio.toUpperCase()} (${servicio.porcentaje}%):`);
        console.log(`  Activos:    $${(servicio.activos / 1_000_000).toFixed(2)}M`);
        console.log(`  Pasivos:    $${(servicio.pasivos / 1_000_000).toFixed(2)}M`);
        console.log(`  Patrimonio: $${(servicio.patrimonio / 1_000_000).toFixed(2)}M`);
        console.log(`  Ingresos:   $${(servicio.ingresos / 1_000_000).toFixed(2)}M`);
      }
      console.log('===================================\n');
      
      expect(totalesServicios.length).toBe(3);
    });

    it('debe mantener la proporción correcta en Acueducto (40%)', async () => {
      const acueducto = await calcularTotalesPorServicio('Acueducto');
      
      const activosEsperados = Math.round(totalesConsolidado.activos * 0.4);
      const diferencia = Math.abs(acueducto.activos - activosEsperados);
      
      // Tolerancia de 1% por redondeos
      const tolerancia = Math.abs(activosEsperados * 0.01);
      
      expect(diferencia).toBeLessThan(tolerancia);
      expect(acueducto.porcentaje).toBe(40);
    });

    it('debe mantener la proporción correcta en Alcantarillado (20%)', async () => {
      const alcantarillado = await calcularTotalesPorServicio('Alcantarillado');
      
      const activosEsperados = Math.round(totalesConsolidado.activos * 0.2);
      const diferencia = Math.abs(alcantarillado.activos - activosEsperados);
      
      const tolerancia = Math.abs(activosEsperados * 0.01);
      
      expect(diferencia).toBeLessThan(tolerancia);
      expect(alcantarillado.porcentaje).toBe(20);
    });

    it('debe mantener la proporción correcta en Aseo (40%)', async () => {
      const aseo = await calcularTotalesPorServicio('Aseo');
      
      const activosEsperados = Math.round(totalesConsolidado.activos * 0.4);
      const diferencia = Math.abs(aseo.activos - activosEsperados);
      
      const tolerancia = Math.abs(activosEsperados * 0.01);
      
      expect(diferencia).toBeLessThan(tolerancia);
      expect(aseo.porcentaje).toBe(40);
    });
  });

  describe('Validación de Suma de Servicios', () => {
    it('la suma de activos de todos los servicios debe ser igual al consolidado', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      const sumaActivos = totalesServicios.reduce((sum, s) => sum + s.activos, 0);
      const diferencia = Math.abs(sumaActivos - totalesConsolidado.activos);
      
      console.log('\n=== VALIDACIÓN DE SUMA ===');
      console.log(`Consolidado Activos: $${(totalesConsolidado.activos / 1_000_000).toFixed(2)}M`);
      console.log(`Suma Servicios:      $${(sumaActivos / 1_000_000).toFixed(2)}M`);
      console.log(`Diferencia:          $${(diferencia / 1_000_000).toFixed(6)}M`);
      console.log('==========================\n');
      
      // Tolerancia de $1000 por redondeos
      expect(diferencia).toBeLessThan(1000);
    });

    it('la suma de pasivos de todos los servicios debe ser igual al consolidado', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      const sumaPasivos = totalesServicios.reduce((sum, s) => sum + s.pasivos, 0);
      const diferencia = Math.abs(sumaPasivos - totalesConsolidado.pasivos);
      
      expect(diferencia).toBeLessThan(1000);
    });

    it('la suma de patrimonio de todos los servicios debe ser igual al consolidado', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      const sumaPatrimonio = totalesServicios.reduce((sum, s) => sum + s.patrimonio, 0);
      const diferencia = Math.abs(sumaPatrimonio - totalesConsolidado.patrimonio);
      
      expect(diferencia).toBeLessThan(1000);
    });

    it('la suma de ingresos de todos los servicios debe ser igual al consolidado', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      const sumaIngresos = totalesServicios.reduce((sum, s) => sum + s.ingresos, 0);
      const diferencia = Math.abs(sumaIngresos - totalesConsolidado.ingresos);
      
      expect(diferencia).toBeLessThan(1000);
    });
  });

  describe('Ecuaciones Contables por Servicio', () => {
    it('cada servicio debe cumplir la ecuación: Activo = Pasivo + Patrimonio', async () => {
      const totalesServicios = await getTotalesTodosServicios();
      
      console.log('\n=== ECUACIONES CONTABLES POR SERVICIO ===');
      
      for (const servicio of totalesServicios) {
        const diferencia = servicio.activos - (servicio.pasivos + servicio.patrimonio);
        const porcentajeDiferencia = Math.abs(diferencia / servicio.activos) * 100;
        
        console.log(`\n${servicio.servicio}:`);
        console.log(`  Activo:             $${(servicio.activos / 1_000_000).toFixed(2)}M`);
        console.log(`  Pasivo + Patrimonio: $${((servicio.pasivos + servicio.patrimonio) / 1_000_000).toFixed(2)}M`);
        console.log(`  Diferencia:         $${(diferencia / 1_000_000).toFixed(6)}M (${porcentajeDiferencia.toFixed(4)}%)`);
        
        // Cada servicio debe mantener la ecuación balanceada
        expect(porcentajeDiferencia).toBeLessThan(0.01);
      }
      
      console.log('==========================================\n');
    });
  });
});
