import { describe, it, expect } from 'vitest';
import {
  PUC_CLASSES,
  PUC_LEVELS,
  getAccountClass,
  getClassDigit,
  getAccountLevel,
  getAccountLevelName,
  isAsset,
  isLiability,
  isEquity,
  isIncome,
  isExpense,
  isCost,
  sumByPrefixes,
  sumServiceByPrefixes,
  calculateTotalsByClass,
  validateAccountingEquation,
  filterByClass,
  filterLeafAccounts,
  filterByPrefix,
  groupByService,
  cleanPucCode,
  isValidPucCode,
  getParentCode,
} from '../shared/pucUtils';
import type { AccountData, ServiceBalanceData } from '../types';

// ============================================
// DATOS DE PRUEBA PUC COLOMBIANO
// ============================================

const cuentasActivo: AccountData[] = [
  { code: '1', name: 'Activos', value: 6000, isLeaf: false, level: 1, class: 'Activos' },
  { code: '11', name: 'Efectivo', value: 6000, isLeaf: false, level: 2, class: 'Activos' },
  { code: '1105', name: 'Caja', value: 1000, isLeaf: true, level: 3, class: 'Activos' },
  { code: '1110', name: 'Bancos', value: 5000, isLeaf: true, level: 3, class: 'Activos' },
];

const cuentasPasivo: AccountData[] = [
  { code: '2105', name: 'Obligaciones financieras', value: 2000, isLeaf: true, level: 3, class: 'Pasivos' },
];

const cuentasPatrimonio: AccountData[] = [
  { code: '3105', name: 'Capital social', value: 4000, isLeaf: true, level: 3, class: 'Patrimonio' },
];

const cuentasIngreso: AccountData[] = [
  { code: '4135', name: 'Ingresos por servicios', value: 3000, isLeaf: true, level: 3, class: 'Ingresos' },
];

const cuentasGasto: AccountData[] = [
  { code: '5105', name: 'Gastos de administración', value: 1000, isLeaf: true, level: 3, class: 'Gastos' },
];

const cuentasCosto: AccountData[] = [
  { code: '6135', name: 'Costos de ventas', value: 500, isLeaf: true, level: 3, class: 'Costos de Ventas' },
  { code: '7105', name: 'Costos de producción', value: 300, isLeaf: true, level: 3, class: 'Costos de Producción' },
];

const todasLasCuentas: AccountData[] = [
  ...cuentasActivo,
  ...cuentasPasivo,
  ...cuentasPatrimonio,
  ...cuentasIngreso,
  ...cuentasGasto,
  ...cuentasCosto,
];

const serviceBalances: ServiceBalanceData[] = [
  { service: 'acueducto', code: '1105', name: 'Caja', value: 600, isLeaf: true },
  { service: 'acueducto', code: '1110', name: 'Bancos', value: 3000, isLeaf: true },
  { service: 'acueducto', code: '11', name: 'Efectivo', value: 3600, isLeaf: false },
  { service: 'alcantarillado', code: '1105', name: 'Caja', value: 300, isLeaf: true },
  { service: 'alcantarillado', code: '1110', name: 'Bancos', value: 1500, isLeaf: true },
  { service: 'aseo', code: '1105', name: 'Caja', value: 100, isLeaf: true },
  { service: 'aseo', code: '1110', name: 'Bancos', value: 500, isLeaf: true },
];

// ============================================
// CONSTANTES
// ============================================

describe('PUC_CLASSES', () => {
  it('contiene las 9 clases del PUC colombiano', () => {
    expect(Object.keys(PUC_CLASSES)).toHaveLength(9);
  });

  it('mapea los dígitos principales correctamente', () => {
    expect(PUC_CLASSES['1']).toBe('Activos');
    expect(PUC_CLASSES['2']).toBe('Pasivos');
    expect(PUC_CLASSES['3']).toBe('Patrimonio');
    expect(PUC_CLASSES['4']).toBe('Ingresos');
    expect(PUC_CLASSES['5']).toBe('Gastos');
    expect(PUC_CLASSES['6']).toBe('Costos de Ventas');
    expect(PUC_CLASSES['7']).toBe('Costos de Producción');
    expect(PUC_CLASSES['8']).toBe('Cuentas de Orden Deudoras');
    expect(PUC_CLASSES['9']).toBe('Cuentas de Orden Acreedoras');
  });
});

describe('PUC_LEVELS', () => {
  it('mapea longitudes a nombres de nivel', () => {
    expect(PUC_LEVELS[1]).toBe('Clase');
    expect(PUC_LEVELS[2]).toBe('Grupo');
    expect(PUC_LEVELS[4]).toBe('Cuenta');
    expect(PUC_LEVELS[6]).toBe('Subcuenta');
    expect(PUC_LEVELS[7]).toBe('Auxiliar');
  });
});

// ============================================
// CLASIFICADORES: getAccountClass / getClassDigit
// ============================================

describe('getAccountClass', () => {
  it('retorna la clase correcta para activos', () => {
    expect(getAccountClass('1105')).toBe('Activos');
    expect(getAccountClass('1')).toBe('Activos');
  });

  it('retorna la clase correcta para pasivos', () => {
    expect(getAccountClass('2105')).toBe('Pasivos');
  });

  it('retorna la clase correcta para patrimonio', () => {
    expect(getAccountClass('3105')).toBe('Patrimonio');
  });

  it('retorna la clase correcta para ingresos', () => {
    expect(getAccountClass('4135')).toBe('Ingresos');
  });

  it('retorna la clase correcta para gastos', () => {
    expect(getAccountClass('5105')).toBe('Gastos');
  });

  it('retorna la clase correcta para costos de ventas', () => {
    expect(getAccountClass('6135')).toBe('Costos de Ventas');
  });

  it('retorna la clase correcta para costos de producción', () => {
    expect(getAccountClass('7105')).toBe('Costos de Producción');
  });

  it('retorna Desconocido para código sin clase válida', () => {
    expect(getAccountClass('0000')).toBe('Desconocido');
  });
});

describe('getClassDigit', () => {
  it('retorna el primer dígito del código', () => {
    expect(getClassDigit('1105')).toBe('1');
    expect(getClassDigit('2105')).toBe('2');
    expect(getClassDigit('5105')).toBe('5');
  });

  it('funciona con código de un solo dígito', () => {
    expect(getClassDigit('3')).toBe('3');
  });
});

// ============================================
// NIVELES: getAccountLevel / getAccountLevelName
// ============================================

describe('getAccountLevel', () => {
  it('código de 1 dígito → nivel 1 (Clase)', () => {
    expect(getAccountLevel('1')).toBe(1);
    expect(getAccountLevel('5')).toBe(1);
  });

  it('código de 2 dígitos → nivel 2 (Grupo)', () => {
    expect(getAccountLevel('11')).toBe(2);
    expect(getAccountLevel('21')).toBe(2);
  });

  it('código de 3 dígitos → nivel 3 (Cuenta)', () => {
    expect(getAccountLevel('110')).toBe(3);
  });

  it('código de 4 dígitos → nivel 3 (Cuenta)', () => {
    expect(getAccountLevel('1105')).toBe(3);
    expect(getAccountLevel('2105')).toBe(3);
  });

  it('código de 5 dígitos → nivel 4 (Subcuenta)', () => {
    expect(getAccountLevel('11050')).toBe(4);
  });

  it('código de 6 dígitos → nivel 4 (Subcuenta)', () => {
    expect(getAccountLevel('110501')).toBe(4);
  });

  it('código de 7 o más dígitos → nivel 5 (Auxiliar)', () => {
    expect(getAccountLevel('1105010')).toBe(5);
    expect(getAccountLevel('11050101')).toBe(5);
  });
});

describe('getAccountLevelName', () => {
  it('retorna Clase para código de 1 dígito', () => {
    expect(getAccountLevelName('1')).toBe('Clase');
  });

  it('retorna Grupo para código de 2 dígitos', () => {
    expect(getAccountLevelName('11')).toBe('Grupo');
  });

  it('retorna Cuenta para código de 3-4 dígitos', () => {
    expect(getAccountLevelName('110')).toBe('Cuenta');
    expect(getAccountLevelName('1105')).toBe('Cuenta');
  });

  it('retorna Subcuenta para código de 5-6 dígitos', () => {
    expect(getAccountLevelName('11050')).toBe('Subcuenta');
    expect(getAccountLevelName('110501')).toBe('Subcuenta');
  });

  it('retorna Auxiliar para código de 7+ dígitos', () => {
    expect(getAccountLevelName('1105010')).toBe('Auxiliar');
  });
});

// ============================================
// CLASIFICADORES BOOLEANOS
// ============================================

describe('isAsset', () => {
  it('retorna true para códigos que empiezan con 1', () => {
    expect(isAsset('1105')).toBe(true);
    expect(isAsset('1')).toBe(true);
    expect(isAsset('110501')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isAsset('2105')).toBe(false);
    expect(isAsset('3105')).toBe(false);
    expect(isAsset('5105')).toBe(false);
  });
});

describe('isLiability', () => {
  it('retorna true para códigos que empiezan con 2', () => {
    expect(isLiability('2105')).toBe(true);
    expect(isLiability('21')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isLiability('1105')).toBe(false);
    expect(isLiability('3105')).toBe(false);
  });
});

describe('isEquity', () => {
  it('retorna true para códigos que empiezan con 3', () => {
    expect(isEquity('3105')).toBe(true);
    expect(isEquity('32')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isEquity('1105')).toBe(false);
    expect(isEquity('4135')).toBe(false);
  });
});

describe('isIncome', () => {
  it('retorna true para códigos que empiezan con 4', () => {
    expect(isIncome('4135')).toBe(true);
    expect(isIncome('41')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isIncome('1105')).toBe(false);
    expect(isIncome('5105')).toBe(false);
  });
});

describe('isExpense', () => {
  it('retorna true para códigos que empiezan con 5', () => {
    expect(isExpense('5105')).toBe(true);
    expect(isExpense('51')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isExpense('1105')).toBe(false);
    expect(isExpense('4135')).toBe(false);
  });
});

describe('isCost', () => {
  it('retorna true para códigos que empiezan con 6 (costos de ventas)', () => {
    expect(isCost('6135')).toBe(true);
    expect(isCost('61')).toBe(true);
  });

  it('retorna true para códigos que empiezan con 7 (costos de producción)', () => {
    expect(isCost('7105')).toBe(true);
    expect(isCost('71')).toBe(true);
  });

  it('retorna false para otros códigos', () => {
    expect(isCost('1105')).toBe(false);
    expect(isCost('5105')).toBe(false);
  });
});

// ============================================
// sumByPrefixes
// ============================================

describe('sumByPrefixes', () => {
  it('suma solo cuentas hoja que coincidan con el prefijo', () => {
    // cuentas '1105' (1000) y '1110' (5000) son hoja y coinciden con '11'
    // '11' no es hoja, no se cuenta
    const result = sumByPrefixes(cuentasActivo, ['11']);
    expect(result).toBe(6000);
  });

  it('no doble-cuenta cuentas padre no-hoja', () => {
    // '11' (6000) no es isLeaf, debe ignorarse
    const result = sumByPrefixes(cuentasActivo, ['1']);
    expect(result).toBe(6000); // solo 1105 + 1110
  });

  it('suma múltiples prefijos sin repetición', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: 1000, isLeaf: true, level: 3, class: 'Activos' },
      { code: '2105', name: 'Obligaciones', value: 2000, isLeaf: true, level: 3, class: 'Pasivos' },
      { code: '3105', name: 'Capital', value: 3000, isLeaf: true, level: 3, class: 'Patrimonio' },
    ];
    const result = sumByPrefixes(cuentas, ['1', '2']);
    expect(result).toBe(3000);
  });

  it('excluye prefijos especificados en excludePrefixes', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: 1000, isLeaf: true, level: 3, class: 'Activos' },
      { code: '1110', name: 'Bancos', value: 5000, isLeaf: true, level: 3, class: 'Activos' },
      { code: '1305', name: 'Deudores', value: 2000, isLeaf: true, level: 3, class: 'Activos' },
    ];
    // incluir '1' pero excluir '13'
    const result = sumByPrefixes(cuentas, ['1'], ['13']);
    expect(result).toBe(6000);
  });

  it('usa valor absoluto cuando useAbsoluteValue es true', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: -1000, isLeaf: true, level: 3, class: 'Activos' },
    ];
    expect(sumByPrefixes(cuentas, ['1'], [], true)).toBe(1000);
    expect(sumByPrefixes(cuentas, ['1'], [], false)).toBe(-1000);
  });

  it('retorna 0 si no hay cuentas hoja que coincidan', () => {
    const result = sumByPrefixes(cuentasActivo, ['9']);
    expect(result).toBe(0);
  });

  it('retorna 0 para lista vacía de cuentas', () => {
    expect(sumByPrefixes([], ['1'])).toBe(0);
  });
});

// ============================================
// sumServiceByPrefixes
// ============================================

describe('sumServiceByPrefixes', () => {
  it('suma solo cuentas hoja del servicio especificado', () => {
    // acueducto: 1105(600) + 1110(3000) = 3600 (hoja)
    // '11' no es hoja, se ignora
    const result = sumServiceByPrefixes(serviceBalances, 'acueducto', ['1']);
    expect(result).toBe(3600);
  });

  it('no mezcla cuentas de diferentes servicios', () => {
    const acueducto = sumServiceByPrefixes(serviceBalances, 'acueducto', ['1']);
    const alcantarillado = sumServiceByPrefixes(serviceBalances, 'alcantarillado', ['1']);
    const aseo = sumServiceByPrefixes(serviceBalances, 'aseo', ['1']);
    expect(acueducto).toBe(3600);
    expect(alcantarillado).toBe(1800);
    expect(aseo).toBe(600);
    expect(acueducto + alcantarillado + aseo).toBe(6000);
  });

  it('retorna 0 para servicio inexistente', () => {
    const result = sumServiceByPrefixes(serviceBalances, 'energia', ['1']);
    expect(result).toBe(0);
  });

  it('aplica excludePrefixes correctamente', () => {
    const result = sumServiceByPrefixes(serviceBalances, 'acueducto', ['1'], ['1110']);
    expect(result).toBe(600); // solo 1105
  });

  it('usa valor absoluto cuando se solicita', () => {
    const negativeBalances: ServiceBalanceData[] = [
      { service: 'acueducto', code: '1105', name: 'Caja', value: -600, isLeaf: true },
    ];
    expect(sumServiceByPrefixes(negativeBalances, 'acueducto', ['1'], [], true)).toBe(600);
  });
});

// ============================================
// calculateTotalsByClass
// ============================================

describe('calculateTotalsByClass', () => {
  it('calcula totales por clase contable correctamente', () => {
    const totals = calculateTotalsByClass(todasLasCuentas);
    expect(totals.activos).toBe(6000);   // 1105(1000) + 1110(5000)
    expect(totals.pasivos).toBe(2000);   // 2105(2000)
    expect(totals.patrimonio).toBe(4000); // 3105(4000)
    expect(totals.ingresos).toBe(3000);  // 4135(3000)
    expect(totals.gastos).toBe(1000);    // 5105(1000)
    expect(totals.costos).toBe(800);     // 6135(500) + 7105(300)
  });

  it('ignora cuentas no-hoja para evitar doble conteo', () => {
    const totals = calculateTotalsByClass(cuentasActivo);
    // '1' (6000, no-hoja) y '11' (6000, no-hoja) deben ignorarse
    expect(totals.activos).toBe(6000); // solo 1105 + 1110
  });

  it('retorna todos los totales en 0 para lista vacía', () => {
    const totals = calculateTotalsByClass([]);
    expect(totals.activos).toBe(0);
    expect(totals.pasivos).toBe(0);
    expect(totals.patrimonio).toBe(0);
    expect(totals.ingresos).toBe(0);
    expect(totals.gastos).toBe(0);
    expect(totals.costos).toBe(0);
  });

  it('incluye costos de producción (clase 7) en costos', () => {
    const totals = calculateTotalsByClass(cuentasCosto);
    expect(totals.costos).toBe(800); // 500 + 300
  });
});

// ============================================
// validateAccountingEquation
// ============================================

describe('validateAccountingEquation', () => {
  it('ecuación balanceada → isValid true, difference 0', () => {
    // Activos(6000) = Pasivos(2000) + Patrimonio(4000)
    const cuentas: AccountData[] = [
      ...cuentasActivo,
      ...cuentasPasivo,
      ...cuentasPatrimonio,
    ];
    const result = validateAccountingEquation(cuentas);
    expect(result.isValid).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('ecuación desequilibrada dentro de tolerancia → isValid true', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: 6000, isLeaf: true, level: 3, class: 'Activos' },
      { code: '2105', name: 'Obligaciones', value: 2000, isLeaf: true, level: 3, class: 'Pasivos' },
      { code: '3105', name: 'Capital', value: 3500, isLeaf: true, level: 3, class: 'Patrimonio' },
    ];
    // diferencia = 6000 - 5500 = 500, tolerancia por defecto = 1000
    const result = validateAccountingEquation(cuentas);
    expect(result.isValid).toBe(true);
    expect(result.difference).toBe(500);
  });

  it('ecuación desequilibrada fuera de tolerancia → isValid false', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: 10000, isLeaf: true, level: 3, class: 'Activos' },
      { code: '2105', name: 'Obligaciones', value: 2000, isLeaf: true, level: 3, class: 'Pasivos' },
      { code: '3105', name: 'Capital', value: 4000, isLeaf: true, level: 3, class: 'Patrimonio' },
    ];
    // diferencia = 10000 - 6000 = 4000, supera tolerancia 1000
    const result = validateAccountingEquation(cuentas);
    expect(result.isValid).toBe(false);
    expect(result.difference).toBe(4000);
  });

  it('respeta tolerancia personalizada', () => {
    const cuentas: AccountData[] = [
      { code: '1105', name: 'Caja', value: 6100, isLeaf: true, level: 3, class: 'Activos' },
      { code: '2105', name: 'Obligaciones', value: 2000, isLeaf: true, level: 3, class: 'Pasivos' },
      { code: '3105', name: 'Capital', value: 4000, isLeaf: true, level: 3, class: 'Patrimonio' },
    ];
    // diferencia = 100
    expect(validateAccountingEquation(cuentas, 50).isValid).toBe(false);
    expect(validateAccountingEquation(cuentas, 200).isValid).toBe(true);
  });
});

// ============================================
// filterByClass
// ============================================

describe('filterByClass', () => {
  it('retorna solo cuentas de la clase indicada', () => {
    const result = filterByClass(todasLasCuentas, '1');
    expect(result.every((a) => a.code.startsWith('1'))).toBe(true);
    expect(result).toHaveLength(cuentasActivo.length);
  });

  it('retorna array vacío si no hay cuentas de esa clase', () => {
    const result = filterByClass(cuentasActivo, '9');
    expect(result).toHaveLength(0);
  });
});

// ============================================
// filterLeafAccounts
// ============================================

describe('filterLeafAccounts', () => {
  it('retorna solo cuentas con isLeaf true', () => {
    const result = filterLeafAccounts(cuentasActivo);
    expect(result.every((a) => a.isLeaf)).toBe(true);
  });

  it('excluye cuentas padre (isLeaf false)', () => {
    const result = filterLeafAccounts(cuentasActivo);
    // cuentasActivo tiene '1' y '11' como no-hoja y '1105' y '1110' como hoja
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.code)).toEqual(['1105', '1110']);
  });

  it('retorna array vacío si no hay hojas', () => {
    const sinHojas: AccountData[] = [
      { code: '1', name: 'Activos', value: 0, isLeaf: false, level: 1, class: 'Activos' },
      { code: '11', name: 'Efectivo', value: 0, isLeaf: false, level: 2, class: 'Activos' },
    ];
    expect(filterLeafAccounts(sinHojas)).toHaveLength(0);
  });
});

// ============================================
// filterByPrefix
// ============================================

describe('filterByPrefix', () => {
  it('retorna solo cuentas cuyo código empieza con el prefijo', () => {
    const result = filterByPrefix(todasLasCuentas, '11');
    expect(result.every((a) => a.code.startsWith('11'))).toBe(true);
    expect(result).toHaveLength(3); // '11', '1105', '1110'
  });

  it('prefijo exacto devuelve solo esa cuenta', () => {
    const result = filterByPrefix(todasLasCuentas, '1105');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('1105');
  });

  it('retorna array vacío si no hay coincidencias', () => {
    const result = filterByPrefix(todasLasCuentas, '99');
    expect(result).toHaveLength(0);
  });
});

// ============================================
// groupByService
// ============================================

describe('groupByService', () => {
  it('agrupa cuentas por servicio correctamente', () => {
    const grouped = groupByService(serviceBalances);
    expect(Object.keys(grouped).sort()).toEqual(['acueducto', 'alcantarillado', 'aseo']);
  });

  it('cada grupo contiene solo las cuentas de ese servicio', () => {
    const grouped = groupByService(serviceBalances);
    expect(grouped['acueducto'].every((b) => b.service === 'acueducto')).toBe(true);
    expect(grouped['alcantarillado'].every((b) => b.service === 'alcantarillado')).toBe(true);
    expect(grouped['aseo'].every((b) => b.service === 'aseo')).toBe(true);
  });

  it('preserva el número de elementos por servicio', () => {
    const grouped = groupByService(serviceBalances);
    expect(grouped['acueducto']).toHaveLength(3);    // '1105', '1110', '11'
    expect(grouped['alcantarillado']).toHaveLength(2);
    expect(grouped['aseo']).toHaveLength(2);
  });

  it('retorna objeto vacío para lista vacía', () => {
    expect(groupByService([])).toEqual({});
  });
});

// ============================================
// cleanPucCode
// ============================================

describe('cleanPucCode', () => {
  it('elimina puntos del código', () => {
    expect(cleanPucCode('11.05')).toBe('1105');
    expect(cleanPucCode('1.1.0.5')).toBe('1105');
  });

  it('elimina espacios del código', () => {
    expect(cleanPucCode('11 05')).toBe('1105');
    expect(cleanPucCode(' 1105 ')).toBe('1105');
  });

  it('elimina guiones del código', () => {
    expect(cleanPucCode('11-05')).toBe('1105');
  });

  it('no altera código limpio', () => {
    expect(cleanPucCode('1105')).toBe('1105');
    expect(cleanPucCode('210501')).toBe('210501');
  });
});

// ============================================
// isValidPucCode
// ============================================

describe('isValidPucCode', () => {
  it('retorna true para códigos numéricos válidos', () => {
    expect(isValidPucCode('1105')).toBe(true);
    expect(isValidPucCode('1')).toBe(true);
    expect(isValidPucCode('1234567890')).toBe(true);
  });

  it('retorna true para códigos con puntos/guiones (se limpian antes de validar)', () => {
    expect(isValidPucCode('11.05')).toBe(true);
    expect(isValidPucCode('11-05')).toBe(true);
  });

  it('retorna false para código vacío', () => {
    expect(isValidPucCode('')).toBe(false);
  });

  it('retorna false para código con letras', () => {
    expect(isValidPucCode('1A05')).toBe(false);
    expect(isValidPucCode('ABC')).toBe(false);
  });

  it('retorna false para código de más de 10 dígitos', () => {
    expect(isValidPucCode('12345678901')).toBe(false);
  });
});

// ============================================
// getParentCode
// ============================================

describe('getParentCode', () => {
  it('código de 1 dígito no tiene padre → null', () => {
    expect(getParentCode('1')).toBeNull();
  });

  it('código de 2 dígitos → padre de 1 dígito', () => {
    expect(getParentCode('11')).toBe('1');
  });

  it('código de 3-4 dígitos → padre de 2 dígitos', () => {
    expect(getParentCode('110')).toBe('11');
    expect(getParentCode('1105')).toBe('11');
  });

  it('código de 5-6 dígitos → padre de 4 dígitos', () => {
    expect(getParentCode('11050')).toBe('1105');
    expect(getParentCode('110501')).toBe('1105');
  });

  it('código de 7+ dígitos → padre de 6 dígitos', () => {
    expect(getParentCode('1105010')).toBe('110501');
  });
});
