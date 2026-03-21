import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_PATHS,
  SHEET_MAPPING,
  SERVICE_COLUMNS,
  R414_SERVICE_COLUMNS,
  R414_ESF_MAPPINGS,
  R414_ESF_ACTIVOS,
  R414_ESF_PASIVOS,
  R414_ESF_PATRIMONIO,
  R414_ER_COLUMNS,
  R414_ER_MAPPINGS,
  R414_PPE_MAPPINGS,
  R414_INTANGIBLES_MAPPINGS,
  R414_EFECTIVO_MAPPINGS,
  R414_PROVISIONES_MAPPINGS,
  R414_OTRAS_PROVISIONES_MAPPINGS,
  R414_BENEFICIOS_EMPLEADOS_MAPPINGS,
} from '../official/templatePaths';

// ============================================
// TEMPLATE_PATHS
// ============================================
describe('TEMPLATE_PATHS', () => {
  const EXPECTED_GROUPS = ['grupo1', 'grupo2', 'grupo3', 'r414', 'r533', 'ife'] as const;
  const REQUIRED_KEYS = ['xbrlt', 'xml', 'xlsx', 'xbrl', 'basePrefix', 'outputPrefix'] as const;

  it('exports an object with all 6 NiifGroup keys', () => {
    for (const group of EXPECTED_GROUPS) {
      expect(TEMPLATE_PATHS).toHaveProperty(group);
    }
  });

  it('each group entry has all required file keys', () => {
    for (const group of EXPECTED_GROUPS) {
      for (const key of REQUIRED_KEYS) {
        expect(TEMPLATE_PATHS[group]).toHaveProperty(key);
      }
    }
  });

  it('grupo1 paths are non-empty strings', () => {
    const g1 = TEMPLATE_PATHS.grupo1;
    expect(g1.xbrlt).toBeTruthy();
    expect(g1.xml).toBeTruthy();
    expect(g1.xlsx).toBeTruthy();
    expect(g1.xbrl).toBeTruthy();
    expect(g1.basePrefix).toBe('Grupo1_Individual_Directo');
    expect(g1.outputPrefix).toBe('G1_Individual');
  });

  it('grupo2 basePrefix and outputPrefix are correct', () => {
    expect(TEMPLATE_PATHS.grupo2.basePrefix).toBe('Grupo2_Individual_Indirecto');
    expect(TEMPLATE_PATHS.grupo2.outputPrefix).toBe('G2_Individual');
  });

  it('grupo3 paths use the grupo3 prefix', () => {
    expect(TEMPLATE_PATHS.grupo3.xbrlt).toContain('grupo3/');
    expect(TEMPLATE_PATHS.grupo3.basePrefix).toBe('Grupo3');
    expect(TEMPLATE_PATHS.grupo3.outputPrefix).toBe('G3');
  });

  it('r414 paths are non-empty and use r414 prefix', () => {
    const r414 = TEMPLATE_PATHS.r414;
    expect(r414.xbrlt).toContain('r414/');
    expect(r414.basePrefix).toBe('R414Ind');
    expect(r414.outputPrefix).toBe('R414_Individual');
  });

  it('r533 paths are empty strings (not yet implemented)', () => {
    const r533 = TEMPLATE_PATHS.r533;
    expect(r533.xbrlt).toBe('');
    expect(r533.xml).toBe('');
    expect(r533.xlsx).toBe('');
    expect(r533.xbrl).toBe('');
  });

  it('ife paths are non-empty and use ife prefix', () => {
    const ife = TEMPLATE_PATHS.ife;
    expect(ife.xbrlt).toContain('ife/');
    expect(ife.basePrefix).toContain('IFE');
    expect(ife.outputPrefix).toBe('IFE');
  });

  it('all paths for grupos 1-3 and r414 end with correct extension', () => {
    const groups = ['grupo1', 'grupo2', 'grupo3', 'r414'] as const;
    for (const group of groups) {
      expect(TEMPLATE_PATHS[group].xbrlt).toMatch(/\.xbrlt$/);
      expect(TEMPLATE_PATHS[group].xml).toMatch(/\.xml$/);
      expect(TEMPLATE_PATHS[group].xlsx).toMatch(/\.xlsx$/);
      expect(TEMPLATE_PATHS[group].xbrl).toMatch(/\.xbrl$/);
    }
  });
});

// ============================================
// SHEET_MAPPING
// ============================================
describe('SHEET_MAPPING', () => {
  it('exports an object with all 6 NiifGroup keys', () => {
    const groups = ['grupo1', 'grupo2', 'grupo3', 'r414', 'r533', 'ife'] as const;
    for (const group of groups) {
      expect(SHEET_MAPPING).toHaveProperty(group);
    }
  });

  it('all groups map "110000" to "Hoja1" (except ife which uses different keys)', () => {
    const groups = ['grupo1', 'grupo2', 'grupo3', 'r414'] as const;
    for (const group of groups) {
      expect(SHEET_MAPPING[group]['110000']).toBe('Hoja1');
    }
  });

  it('all groups map "210000" to "Hoja2" (balance sheet)', () => {
    const groups = ['grupo1', 'grupo2', 'grupo3', 'r414'] as const;
    for (const group of groups) {
      expect(SHEET_MAPPING[group]['210000']).toBe('Hoja2');
    }
  });

  it('all groups map "310000" to "Hoja3" (income statement)', () => {
    const groups = ['grupo1', 'grupo2', 'grupo3', 'r414'] as const;
    for (const group of groups) {
      expect(SHEET_MAPPING[group]['310000']).toBe('Hoja3');
    }
  });

  it('ife uses different sheet codes with "t" suffix', () => {
    const ife = SHEET_MAPPING.ife;
    expect(ife['110000t']).toBe('Hoja1');
    expect(ife['210000t']).toBe('Hoja3');
    expect(ife['310000t']).toBe('Hoja4');
  });

  it('ife has exactly 8 sheet mappings', () => {
    expect(Object.keys(SHEET_MAPPING.ife)).toHaveLength(8);
  });

  it('r533 has no sheet mappings (empty object)', () => {
    expect(Object.keys(SHEET_MAPPING.r533)).toHaveLength(0);
  });

  it('grupo1 maps FC01 gastos sheets', () => {
    expect(SHEET_MAPPING.grupo1['900017a']).toBe('Hoja38');
    expect(SHEET_MAPPING.grupo1['900017b']).toBe('Hoja39');
    expect(SHEET_MAPPING.grupo1['900017c']).toBe('Hoja40');
  });
});

// ============================================
// SERVICE_COLUMNS
// ============================================
describe('SERVICE_COLUMNS', () => {
  it('does not have total key (total is a template formula)', () => {
    expect(SERVICE_COLUMNS.total).toBeUndefined();
  });

  it('maps acueducto to column I', () => {
    expect(SERVICE_COLUMNS.acueducto).toBe('I');
  });

  it('maps alcantarillado to column J', () => {
    expect(SERVICE_COLUMNS.alcantarillado).toBe('J');
  });

  it('maps aseo to column K', () => {
    expect(SERVICE_COLUMNS.aseo).toBe('K');
  });

  it('maps all 8 service columns', () => {
    const keys = ['acueducto', 'alcantarillado', 'aseo', 'energia', 'gas', 'glp', 'otras', 'xm'];
    for (const key of keys) {
      expect(SERVICE_COLUMNS).toHaveProperty(key);
      expect(typeof SERVICE_COLUMNS[key]).toBe('string');
    }
  });
});

// ============================================
// R414_SERVICE_COLUMNS
// ============================================
describe('R414_SERVICE_COLUMNS', () => {
  it('R414 places acueducto in column I (different from standard)', () => {
    expect(R414_SERVICE_COLUMNS.acueducto).toBe('I');
  });

  it('R414 places total in column P (different from standard)', () => {
    expect(R414_SERVICE_COLUMNS.total).toBe('P');
  });

  it('R414 places alcantarillado in column J', () => {
    expect(R414_SERVICE_COLUMNS.alcantarillado).toBe('J');
  });

  it('R414 places aseo in column K', () => {
    expect(R414_SERVICE_COLUMNS.aseo).toBe('K');
  });
});

// ============================================
// R414_ESF_MAPPINGS (combined)
// ============================================
describe('R414_ESF_MAPPINGS', () => {
  it('is the concatenation of activos + pasivos + patrimonio', () => {
    const expected = R414_ESF_ACTIVOS.length + R414_ESF_PASIVOS.length + R414_ESF_PATRIMONIO.length;
    expect(R414_ESF_MAPPINGS).toHaveLength(expected);
  });

  it('every mapping has a row number, label, and pucPrefixes array', () => {
    for (const mapping of R414_ESF_MAPPINGS) {
      expect(typeof mapping.row).toBe('number');
      expect(typeof mapping.label).toBe('string');
      expect(mapping.label.length).toBeGreaterThan(0);
      expect(Array.isArray(mapping.pucPrefixes)).toBe(true);
    }
  });

  it('activos section starts at row 15 (Efectivo y equivalentes)', () => {
    expect(R414_ESF_ACTIVOS[0].row).toBe(15);
    expect(R414_ESF_ACTIVOS[0].label).toContain('Efectivo');
  });

  it('activos section has Inventarios at row 28', () => {
    const inventarios = R414_ESF_ACTIVOS.find(m => m.row === 28);
    expect(inventarios).toBeDefined();
    expect(inventarios?.pucPrefixes).toContain('15');
  });

  it('pasivos section includes Provisiones beneficios empleados at row 69', () => {
    const prov = R414_ESF_PASIVOS.find(m => m.row === 69);
    expect(prov).toBeDefined();
    expect(prov?.pucPrefixes).toContain('2511');
  });

  it('patrimonio section includes Capital fiscal at row 115', () => {
    const capital = R414_ESF_PATRIMONIO.find(m => m.row === 115);
    expect(capital).toBeDefined();
    expect(capital?.pucPrefixes).toContain('3208');
  });

  it('excludePrefixes is defined only on some mappings', () => {
    const withExclude = R414_ESF_MAPPINGS.filter(m => m.excludePrefixes !== undefined);
    expect(withExclude.length).toBeGreaterThan(0);
  });
});

// ============================================
// R414_ER_COLUMNS
// ============================================
describe('R414_ER_COLUMNS', () => {
  it('maps acueducto to column E', () => {
    expect(R414_ER_COLUMNS.acueducto).toBe('E');
  });

  it('maps alcantarillado to column F', () => {
    expect(R414_ER_COLUMNS.alcantarillado).toBe('F');
  });

  it('maps aseo to column G', () => {
    expect(R414_ER_COLUMNS.aseo).toBe('G');
  });

  it('maps total to column L', () => {
    expect(R414_ER_COLUMNS.total).toBe('L');
  });
});

// ============================================
// R414_ER_MAPPINGS
// ============================================
describe('R414_ER_MAPPINGS', () => {
  it('has at least 8 income statement line mappings', () => {
    expect(R414_ER_MAPPINGS.length).toBeGreaterThanOrEqual(8);
  });

  it('maps row 14 to Ingresos de actividades ordinarias with PUC 43', () => {
    const row14 = R414_ER_MAPPINGS.find(m => m.row === 14);
    expect(row14).toBeDefined();
    expect(row14?.pucPrefixes).toContain('43');
  });

  it('maps row 15 to Costo de ventas', () => {
    const row15 = R414_ER_MAPPINGS.find(m => m.row === 15);
    expect(row15).toBeDefined();
    expect(row15?.label).toContain('Costo');
  });
});

// ============================================
// R414_PPE_MAPPINGS
// ============================================
describe('R414_PPE_MAPPINGS', () => {
  it('has entries for PPE items', () => {
    expect(R414_PPE_MAPPINGS.length).toBeGreaterThan(0);
  });

  it('row 14 is Terrenos with PUC 1605', () => {
    const terrenos = R414_PPE_MAPPINGS.find(m => m.row === 14);
    expect(terrenos).toBeDefined();
    expect(terrenos?.pucPrefixes).toContain('1605');
  });

  it('row 32 Depreciación uses useAbsoluteValue', () => {
    const depr = R414_PPE_MAPPINGS.find(m => m.row === 32);
    expect(depr?.useAbsoluteValue).toBe(true);
  });
});

// ============================================
// R414_INTANGIBLES_MAPPINGS
// ============================================
describe('R414_INTANGIBLES_MAPPINGS', () => {
  it('has entries for intangible assets', () => {
    expect(R414_INTANGIBLES_MAPPINGS.length).toBeGreaterThan(0);
  });

  it('row 39 is Software with PUC 197008', () => {
    const software = R414_INTANGIBLES_MAPPINGS.find(m => m.row === 39);
    expect(software).toBeDefined();
    expect(software?.pucPrefixes).toContain('197008');
  });
});

// ============================================
// R414_EFECTIVO_MAPPINGS
// ============================================
describe('R414_EFECTIVO_MAPPINGS', () => {
  it('has entries for cash items', () => {
    expect(R414_EFECTIVO_MAPPINGS.length).toBeGreaterThan(0);
  });

  it('row 51 is Efectivo en caja with PUC 1105', () => {
    const caja = R414_EFECTIVO_MAPPINGS.find(m => m.row === 51);
    expect(caja).toBeDefined();
    expect(caja?.pucPrefixes).toContain('1105');
  });

  it('row 52 is Saldos en bancos', () => {
    const bancos = R414_EFECTIVO_MAPPINGS.find(m => m.row === 52);
    expect(bancos).toBeDefined();
    expect(bancos?.pucPrefixes).toContain('1110');
  });
});

// ============================================
// R414_PROVISIONES_MAPPINGS & R414_OTRAS_PROVISIONES_MAPPINGS
// ============================================
describe('R414_PROVISIONES_MAPPINGS', () => {
  it('has entries', () => {
    expect(R414_PROVISIONES_MAPPINGS.length).toBeGreaterThan(0);
  });

  it('row 64 maps Litigios y demandas corriente with PUC 2701', () => {
    const litigios = R414_PROVISIONES_MAPPINGS.find(m => m.row === 64);
    expect(litigios).toBeDefined();
    expect(litigios?.pucPrefixes).toContain('2701');
  });
});

describe('R414_OTRAS_PROVISIONES_MAPPINGS', () => {
  it('has entries', () => {
    expect(R414_OTRAS_PROVISIONES_MAPPINGS.length).toBeGreaterThan(0);
  });

  it('row 76 maps Otras provisiones corrientes', () => {
    const otras = R414_OTRAS_PROVISIONES_MAPPINGS.find(m => m.row === 76);
    expect(otras).toBeDefined();
    expect(otras?.pucPrefixes).toContain('2707');
  });
});

// ============================================
// R414_BENEFICIOS_EMPLEADOS_MAPPINGS
// ============================================
describe('R414_BENEFICIOS_EMPLEADOS_MAPPINGS', () => {
  it('has 4 benefit period entries', () => {
    expect(R414_BENEFICIOS_EMPLEADOS_MAPPINGS).toHaveLength(4);
  });

  it('row 79 is beneficios corto plazo with PUC 2511', () => {
    const cp = R414_BENEFICIOS_EMPLEADOS_MAPPINGS.find(m => m.row === 79);
    expect(cp).toBeDefined();
    expect(cp?.pucPrefixes).toContain('2511');
  });

  it('row 80 is beneficios largo plazo with PUC 2512', () => {
    const lp = R414_BENEFICIOS_EMPLEADOS_MAPPINGS.find(m => m.row === 80);
    expect(lp).toBeDefined();
    expect(lp?.pucPrefixes).toContain('2512');
  });
});
