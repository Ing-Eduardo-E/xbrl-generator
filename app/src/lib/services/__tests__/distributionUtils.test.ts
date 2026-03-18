import { describe, it, expect } from 'vitest';
import {
  distributeLargestRemainder,
  balanceAccountingEquation,
} from '../distributionUtils';

// ============================================
// SERVICIOS DE PRUEBA
// ============================================

const SERVICES_40_35_25 = [
  { name: 'acueducto', percentage: 40 },
  { name: 'alcantarillado', percentage: 35 },
  { name: 'aseo', percentage: 25 },
];

// ============================================
// TESTS: distributeLargestRemainder
// ============================================

describe('distributeLargestRemainder', () => {
  it('debe distribuir un valor divisible exactamente', () => {
    const result = distributeLargestRemainder(1000, SERVICES_40_35_25);
    expect(result.acueducto).toBe(400);
    expect(result.alcantarillado).toBe(350);
    expect(result.aseo).toBe(250);
    expect(result.acueducto + result.alcantarillado + result.aseo).toBe(1000);
  });

  it('debe distribuir un valor no divisible sin error de redondeo', () => {
    const result = distributeLargestRemainder(1001, SERVICES_40_35_25);
    // 1001 * 0.40 = 400.4 → trunc 400, frac 0.4
    // 1001 * 0.35 = 350.35 → trunc 350, frac 0.35
    // 1001 * 0.25 = 250.25 → trunc 250, frac 0.25
    // sum trunc = 1000, remaining = 1, give to 0.4 (acueducto)
    expect(result.acueducto + result.alcantarillado + result.aseo).toBe(1001);
  });

  it('debe manejar valor cero', () => {
    const result = distributeLargestRemainder(0, SERVICES_40_35_25);
    expect(result.acueducto).toBe(0);
    expect(result.alcantarillado).toBe(0);
    expect(result.aseo).toBe(0);
  });

  it('debe manejar valores negativos correctamente', () => {
    const result = distributeLargestRemainder(-1001, SERVICES_40_35_25);
    expect(result.acueducto + result.alcantarillado + result.aseo).toBe(-1001);
  });

  it('debe sumar exactamente el valor original para muchos valores', () => {
    // Probar 100 valores diferentes
    for (let v = 1; v <= 100; v++) {
      const result = distributeLargestRemainder(v, SERVICES_40_35_25);
      const sum = result.acueducto + result.alcantarillado + result.aseo;
      expect(sum).toBe(v);
    }
  });

  it('debe manejar valores grandes sin perder precisión', () => {
    const result = distributeLargestRemainder(170436924, SERVICES_40_35_25);
    const sum = result.acueducto + result.alcantarillado + result.aseo;
    expect(sum).toBe(170436924);
  });

  it('debe funcionar con porcentajes 33/33/34', () => {
    const services = [
      { name: 'a', percentage: 33 },
      { name: 'b', percentage: 33 },
      { name: 'c', percentage: 34 },
    ];
    const result = distributeLargestRemainder(100, services);
    expect(result.a + result.b + result.c).toBe(100);
  });

  it('debe funcionar con porcentajes 50/50/0', () => {
    const services = [
      { name: 'a', percentage: 50 },
      { name: 'b', percentage: 50 },
      { name: 'c', percentage: 0 },
    ];
    const result = distributeLargestRemainder(1001, services);
    expect(result.c).toBe(0);
    expect(result.a + result.b + result.c).toBe(1001);
  });
});

// ============================================
// TESTS: balanceAccountingEquation
// ============================================

describe('balanceAccountingEquation', () => {
  it('no debe modificar cuentas si la ecuación ya cuadra', () => {
    const accounts = [
      { service: 'acueducto', code: '1105', name: 'Caja', value: 1000, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    balanceAccountingEquation(accounts, ['acueducto']);
    expect(accounts[0].value).toBe(1000);
    expect(accounts[1].value).toBe(600);
    expect(accounts[2].value).toBe(400);
  });

  it('debe ajustar patrimonio cuando Activos > Pasivos + Patrimonio', () => {
    const accounts = [
      { service: 'acueducto', code: '1105', name: 'Caja', value: 1003, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    // diff = 1003 - (600 + 400) = 3
    balanceAccountingEquation(accounts, ['acueducto']);
    expect(accounts[2].value).toBe(403); // 400 + 3
    // Verificar ecuación
    const activos = accounts.filter(a => a.code.startsWith('1')).reduce((s, a) => s + a.value, 0);
    const pasivos = accounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.value, 0);
    const patrimonio = accounts.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.value, 0);
    expect(activos).toBe(pasivos + patrimonio);
  });

  it('debe ajustar patrimonio cuando Activos < Pasivos + Patrimonio', () => {
    const accounts = [
      { service: 'acueducto', code: '1105', name: 'Caja', value: 997, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    // diff = 997 - (600 + 400) = -3
    balanceAccountingEquation(accounts, ['acueducto']);
    expect(accounts[2].value).toBe(397); // 400 - 3
    const activos = accounts.filter(a => a.code.startsWith('1')).reduce((s, a) => s + a.value, 0);
    const pasivos = accounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.value, 0);
    const patrimonio = accounts.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.value, 0);
    expect(activos).toBe(pasivos + patrimonio);
  });

  it('debe ajustar la cuenta de patrimonio con mayor valor absoluto', () => {
    const accounts = [
      { service: 'acueducto', code: '1105', name: 'Caja', value: 1002, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 100, isLeaf: true, level: 4, class: 'Patrimonio' },
      { service: 'acueducto', code: '3205', name: 'Resultados', value: 300, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    // diff = 1002 - (600 + 100 + 300) = 2
    // Debe ajustar '3205' (valor 300, mayor que 100)
    balanceAccountingEquation(accounts, ['acueducto']);
    expect(accounts[3].value).toBe(302); // 300 + 2
    expect(accounts[2].value).toBe(100); // Intacto
  });

  it('debe ignorar cuentas no-hoja', () => {
    const accounts = [
      { service: 'acueducto', code: '1', name: 'Activos', value: 5000, isLeaf: false, level: 1, class: 'Activos' },
      { service: 'acueducto', code: '1105', name: 'Caja', value: 1003, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    balanceAccountingEquation(accounts, ['acueducto']);
    // Solo considera hojas: 1003 - (600 + 400) = 3
    expect(accounts[3].value).toBe(403);
    // La no-hoja no se toca
    expect(accounts[0].value).toBe(5000);
  });

  it('debe balancear múltiples servicios independientemente', () => {
    const accounts = [
      // Acueducto: 1003 vs 600+400 = diff +3
      { service: 'acueducto', code: '1105', name: 'Caja', value: 1003, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'acueducto', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'acueducto', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
      // Alcantarillado: 997 vs 600+400 = diff -3
      { service: 'alcantarillado', code: '1105', name: 'Caja', value: 997, isLeaf: true, level: 4, class: 'Activos' },
      { service: 'alcantarillado', code: '2105', name: 'Obligaciones', value: 600, isLeaf: true, level: 4, class: 'Pasivos' },
      { service: 'alcantarillado', code: '3105', name: 'Capital', value: 400, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];
    balanceAccountingEquation(accounts, ['acueducto', 'alcantarillado']);

    // Acueducto: Capital = 400 + 3 = 403
    expect(accounts[2].value).toBe(403);
    // Alcantarillado: Capital = 400 - 3 = 397
    expect(accounts[5].value).toBe(397);
  });

  it('debe cumplir ecuación contable después de distribución Largest Remainder', () => {
    // Simular un balance consolidado que cuadra perfectamente
    const consolidatedLeafAccounts = [
      { code: '1105', name: 'Caja', value: 50000, isLeaf: true, level: 4, class: 'Activos' },
      { code: '1110', name: 'Bancos', value: 120437, isLeaf: true, level: 4, class: 'Activos' },
      { code: '2105', name: 'Obligaciones', value: 80200, isLeaf: true, level: 4, class: 'Pasivos' },
      { code: '2305', name: 'CxP', value: 45000, isLeaf: true, level: 4, class: 'Pasivos' },
      { code: '3105', name: 'Capital', value: 30237, isLeaf: true, level: 4, class: 'Patrimonio' },
      { code: '3205', name: 'Resultados', value: 15000, isLeaf: true, level: 4, class: 'Patrimonio' },
    ];

    // Verificar que el consolidado cuadra: 170437 = 125200 + 45237
    const totalActivos = consolidatedLeafAccounts.filter(a => a.code.startsWith('1')).reduce((s, a) => s + a.value, 0);
    const totalPasivos = consolidatedLeafAccounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.value, 0);
    const totalPatrimonio = consolidatedLeafAccounts.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.value, 0);
    expect(totalActivos).toBe(totalPasivos + totalPatrimonio);

    // Distribuir usando Largest Remainder
    const services = SERVICES_40_35_25;
    const distributed: { service: string; code: string; name: string; value: number; isLeaf: boolean; level: number; class: string }[] = [];

    for (const account of consolidatedLeafAccounts) {
      const values = distributeLargestRemainder(account.value, services);
      for (const svc of services) {
        distributed.push({
          service: svc.name,
          code: account.code,
          name: account.name,
          value: values[svc.name],
          isLeaf: account.isLeaf,
          level: account.level,
          class: account.class,
        });
      }
    }

    // Balancear
    balanceAccountingEquation(distributed, services.map(s => s.name));

    // Verificar que cada servicio cumple la ecuación contable
    for (const svc of services) {
      const svcAccounts = distributed.filter(a => a.service === svc.name);
      const activos = svcAccounts.filter(a => a.code.startsWith('1')).reduce((s, a) => s + a.value, 0);
      const pasivos = svcAccounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.value, 0);
      const patrimonio = svcAccounts.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.value, 0);
      expect(activos).toBe(pasivos + patrimonio);
    }
  });
});
