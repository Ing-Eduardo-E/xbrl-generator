import { describe, it, expect } from 'vitest';
import {
  matchesPrefixes,
  sumAccountsByPrefixes,
} from '../shared/rewriterHelpers';
import { getGrupoConfig, GRUPO_FC01_EXPENSE_MAPPINGS } from '../grupos/mappings';
import type { ServiceBalanceData } from '../types';

// ============================================
// DATOS DE PRUEBA
// ============================================

const mockServiceAccounts: ServiceBalanceData[] = [
  { service: 'acueducto', code: '5105', name: 'Sueldos', value: 1000, isLeaf: true },
  { service: 'acueducto', code: '511006', name: 'Cesantías', value: 500, isLeaf: true },
  { service: 'acueducto', code: '513525', name: 'Energía', value: 200, isLeaf: true },
  { service: 'acueducto', code: '6135', name: 'Costo ventas', value: 3000, isLeaf: true },
  { service: 'acueducto', code: '4135', name: 'Ingresos', value: 8000, isLeaf: true },
  // Cuenta no-hoja (debe ignorarse)
  { service: 'acueducto', code: '51', name: 'Gastos', value: 5000, isLeaf: false },
];

// ============================================
// TESTS: matchesPrefixes
// ============================================

describe('matchesPrefixes', () => {
  it('debe coincidir con prefijos simples', () => {
    expect(matchesPrefixes('5105', ['51'])).toBe(true);
    expect(matchesPrefixes('5105', ['52'])).toBe(false);
  });

  it('debe coincidir con prefijos exactos', () => {
    expect(matchesPrefixes('5105', ['5105'])).toBe(true);
    expect(matchesPrefixes('5105', ['5106'])).toBe(false);
  });

  it('debe manejar múltiples prefijos', () => {
    expect(matchesPrefixes('5105', ['41', '51', '61'])).toBe(true);
    expect(matchesPrefixes('7105', ['41', '51', '61'])).toBe(false);
  });

  it('debe excluir prefijos correctamente', () => {
    expect(matchesPrefixes('5105', ['51'], ['5105'])).toBe(false);
    expect(matchesPrefixes('5110', ['51'], ['5105'])).toBe(true);
  });

  it('debe manejar arrays vacíos', () => {
    expect(matchesPrefixes('5105', [])).toBe(false);
  });

  it('debe manejar excludes undefined', () => {
    expect(matchesPrefixes('5105', ['51'], undefined)).toBe(true);
  });
});

// ============================================
// TESTS: sumAccountsByPrefixes
// ============================================

describe('sumAccountsByPrefixes', () => {
  it('debe sumar solo cuentas hoja que coincidan', () => {
    const total = sumAccountsByPrefixes(mockServiceAccounts, ['51']);
    // 5105 (1000) + 511006 (500) + 513525 (200) = 1700 (ignora 51 no-hoja)
    expect(total).toBe(1700);
  });

  it('debe sumar costos clase 6', () => {
    const total = sumAccountsByPrefixes(mockServiceAccounts, ['6']);
    expect(total).toBe(3000);
  });

  it('debe retornar 0 si no hay coincidencias', () => {
    const total = sumAccountsByPrefixes(mockServiceAccounts, ['99']);
    expect(total).toBe(0);
  });

  it('debe excluir prefijos correctamente', () => {
    const total = sumAccountsByPrefixes(mockServiceAccounts, ['51'], ['5105']);
    // 511006 (500) + 513525 (200) = 700 (excluye 5105)
    expect(total).toBe(700);
  });

  it('debe manejar array vacío de cuentas', () => {
    const total = sumAccountsByPrefixes([], ['51']);
    expect(total).toBe(0);
  });
});

// ============================================
// TESTS: getGrupoConfig
// ============================================

describe('getGrupoConfig', () => {
  it('debe retornar configuración para grupo1', () => {
    const config = getGrupoConfig('grupo1');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('grupo1');
    expect(config!.fc01AcuSheet).toBe('Hoja38');
    expect(config!.fc01AlcSheet).toBe('Hoja39');
    expect(config!.fc01AseoSheet).toBe('Hoja40');
    expect(config!.fc01ConsolidadoSheet).toBe('Hoja44');
    expect(config!.fc02Sheet).toBe('Hoja45');
    expect(config!.fc03AcuSheet).toBe('Hoja46');
    expect(config!.fc03AlcSheet).toBe('Hoja47');
    expect(config!.fc03AseoSheet).toBe('Hoja48');
    expect(config!.fc05bSheet).toBe('Hoja55');
    expect(config!.fc08Sheet).toBe('Hoja58');
  });

  it('debe retornar configuración para grupo2', () => {
    const config = getGrupoConfig('grupo2');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('grupo2');
    expect(config!.fc01AcuSheet).toBe('Hoja18');
    expect(config!.fc01AlcSheet).toBe('Hoja19');
    expect(config!.fc01AseoSheet).toBe('Hoja20');
    expect(config!.fc01ConsolidadoSheet).toBe('Hoja24');
    expect(config!.fc02Sheet).toBe('Hoja25');
    expect(config!.fc03AcuSheet).toBe('Hoja26');
    expect(config!.fc03AlcSheet).toBe('Hoja27');
    expect(config!.fc03AseoSheet).toBe('Hoja28');
    // Grupo2 NO tiene FC05b ni FC08
    expect(config!.fc05bSheet).toBeNull();
    expect(config!.fc08Sheet).toBeNull();
  });

  it('debe retornar configuración para grupo3', () => {
    const config = getGrupoConfig('grupo3');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('grupo3');
    expect(config!.fc01AcuSheet).toBe('Hoja10');
    expect(config!.fc01AlcSheet).toBe('Hoja11');
    expect(config!.fc01AseoSheet).toBe('Hoja12');
    expect(config!.fc01ConsolidadoSheet).toBe('Hoja16');
    expect(config!.fc02Sheet).toBe('Hoja17');
    // Grupo3 NO tiene FC03, FC05b ni FC08
    expect(config!.fc03AcuSheet).toBeNull();
    expect(config!.fc03AlcSheet).toBeNull();
    expect(config!.fc03AseoSheet).toBeNull();
    expect(config!.fc05bSheet).toBeNull();
    expect(config!.fc08Sheet).toBeNull();
  });

  it('debe retornar null para grupos sin FC01', () => {
    const config = getGrupoConfig('r533');
    expect(config).toBeNull();
  });

  it('debe retornar null para grupo IFE (no usa este path)', () => {
    const config = getGrupoConfig('ife');
    expect(config).toBeNull();
  });
});

// ============================================
// TESTS: Mappings consistency
// ============================================

describe('erMappings (per-group ER row mappings)', () => {
  it('grupo1 erMappings tiene 9 entradas', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.erMappings).toHaveLength(9);
  });

  it('grupo2 erMappings tiene 11 entradas (incluye impuestos)', () => {
    const config = getGrupoConfig('grupo2');
    expect(config!.erMappings).toHaveLength(11);
  });

  it('grupo3 erMappings tiene 10 entradas', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.erMappings).toHaveLength(10);
  });

  it('grupo1 ER filas comienzan en 14 (Ingresos ordinarios)', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.erMappings[0].row).toBe(14);
    expect(config!.erMappings[0].pucPrefixes).toEqual(['41']);
  });

  it('grupo2 ER filas comienzan en 14 (Ingresos ordinarios)', () => {
    const config = getGrupoConfig('grupo2');
    expect(config!.erMappings[0].row).toBe(14);
    expect(config!.erMappings[0].pucPrefixes).toEqual(['41']);
  });

  it('grupo3 ER filas comienzan en 14 (Ingresos ordinarios)', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.erMappings[0].row).toBe(14);
    expect(config!.erMappings[0].pucPrefixes).toEqual(['41']);
  });

  it('cada erMapping debe tener pucPrefixes no vacío', () => {
    for (const group of ['grupo1', 'grupo2', 'grupo3'] as const) {
      const config = getGrupoConfig(group);
      for (const m of config!.erMappings) {
        expect(m.pucPrefixes.length).toBeGreaterThan(0);
      }
    }
  });

  it('grupo1 ER columnas empiezan en F (Acueducto)', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.erColumns.acueducto).toBe('F');
  });

  it('grupo2 ER columnas empiezan en E (Acueducto)', () => {
    const config = getGrupoConfig('grupo2');
    expect(config!.erColumns.acueducto).toBe('E');
  });

  it('grupo3 ER columnas empiezan en E (Acueducto)', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.erColumns.acueducto).toBe('E');
  });
});

describe('esfRowMap (per-group ESF row overrides)', () => {
  it('grupo1 mapea Inventarios (default 22) a row 28', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.esfRowMap[22]).toBe(28);
  });

  it('grupo1 mapea PPE (default 27) a row 40', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.esfRowMap[27]).toBe(40);
  });

  it('grupo1 mapea Capital (default 58) a row 107', () => {
    const config = getGrupoConfig('grupo1');
    expect(config!.esfRowMap[58]).toBe(107);
  });

  it('grupo3 mapea CxC corrientes (default 17) a row 18', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.esfRowMap[17]).toBe(18);
  });

  it('grupo3 mapea Intangibles (default 28) a 0 (skip)', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.esfRowMap[28]).toBe(0);
  });

  it('grupo3 mapea Plusvalía (default 30) a 0 (skip)', () => {
    const config = getGrupoConfig('grupo3');
    expect(config!.esfRowMap[30]).toBe(0);
  });

  it('grupo2 mapea PPE (default 27) a row 38', () => {
    const config = getGrupoConfig('grupo2');
    expect(config!.esfRowMap[27]).toBe(38);
  });

  it('todos los esfRowMap tienen overrides para filas clave', () => {
    for (const group of ['grupo1', 'grupo2', 'grupo3'] as const) {
      const config = getGrupoConfig(group);
      // Inventarios, PPE y Capital deben tener override
      expect(config!.esfRowMap[22]).toBeDefined(); // Inventarios
      expect(config!.esfRowMap[27]).toBeDefined(); // PPE
      expect(config!.esfRowMap[58]).toBeDefined(); // Capital
    }
  });
});

describe('GRUPO_FC01_EXPENSE_MAPPINGS', () => {
  it('debe tener 10 entradas para FC01', () => {
    expect(GRUPO_FC01_EXPENSE_MAPPINGS).toHaveLength(10);
  });

  it('debe tener filas consecutivas 13-22', () => {
    const rows = GRUPO_FC01_EXPENSE_MAPPINGS.map(m => m.row);
    expect(rows).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  });

  it('todos los prefijos deben ser de clase 5 (gastos)', () => {
    for (const m of GRUPO_FC01_EXPENSE_MAPPINGS) {
      for (const prefix of m.pucPrefixes) {
        expect(prefix.startsWith('5')).toBe(true);
      }
    }
  });
});