import { describe, it, expect } from 'vitest';
import { generateQuarterlyOptions } from '../shared/quarterlyDerivation';
import { generateFiscalYearTrimesters } from '../shared/dateUtils';
import type { TemplateWithDataOptions } from '../types';

const baseOptions: TemplateWithDataOptions = {
  niifGroup: 'ife',
  companyId: 'RUPS-900123456',
  companyName: 'Empresa Test',
  reportDate: '2025-12-31',
  nit: '900123456',
  accounts: [],
  serviceBalances: [],
  distribution: { acueducto: 60, alcantarillado: 30, aseo: 10 },
};

describe('generateQuarterlyOptions integración', () => {
  it('genera exactamente 4 opciones', () => {
    const opts = generateQuarterlyOptions(baseOptions, 2025);
    expect(opts).toHaveLength(4);
  });

  it('años bisiestos — T1 2024 termina el 31 de marzo', () => {
    const periods = generateFiscalYearTrimesters(2024);
    expect(periods[0].endDate).toBe('2024-03-31');
  });

  it('cubre 365 días en 2025', () => {
    const periods = generateFiscalYearTrimesters(2025);
    const start = new Date(periods[0].startDate);
    const end   = new Date(periods[3].endDate);
    const days  = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    expect(days).toBe(365);
  });

  it('cubre 366 días en 2024', () => {
    const periods = generateFiscalYearTrimesters(2024);
    const start = new Date(periods[0].startDate);
    const end   = new Date(periods[3].endDate);
    const days  = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    expect(days).toBe(366);
  });

  it('todas las opciones tienen niifGroup "ife"', () => {
    const opts = generateQuarterlyOptions(baseOptions, 2025);
    for (const opt of opts) {
      expect(opt.niifGroup).toBe('ife');
    }
  });

  it('reportDate de cada opción coincide con el fin del trimestre', () => {
    const opts = generateQuarterlyOptions(baseOptions, 2025);
    expect(opts[0].reportDate).toBe('2025-03-31');
    expect(opts[1].reportDate).toBe('2025-06-30');
    expect(opts[2].reportDate).toBe('2025-09-30');
    expect(opts[3].reportDate).toBe('2025-12-31');
  });

  it('startDate de cada opción coincide con el inicio del trimestre', () => {
    const opts = generateQuarterlyOptions(baseOptions, 2025);
    expect(opts[0].startDate).toBe('2025-01-01');
    expect(opts[1].startDate).toBe('2025-04-01');
    expect(opts[2].startDate).toBe('2025-07-01');
    expect(opts[3].startDate).toBe('2025-10-01');
  });

  it('conserva los datos base (companyId, nit, distribution) en cada opción', () => {
    const opts = generateQuarterlyOptions(baseOptions, 2025);
    for (const opt of opts) {
      expect(opt.companyId).toBe(baseOptions.companyId);
      expect(opt.nit).toBe(baseOptions.nit);
      expect(opt.distribution).toBe(baseOptions.distribution);
    }
  });
});
