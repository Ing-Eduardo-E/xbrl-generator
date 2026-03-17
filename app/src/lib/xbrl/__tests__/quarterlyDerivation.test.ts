import { describe, it, expect } from 'vitest';
import { generateQuarterlyOptions } from '../shared/quarterlyDerivation';
import type { TemplateWithDataOptions } from '../types';

// Minimal base options that satisfy TemplateWithDataOptions
const baseOptions: TemplateWithDataOptions = {
  niifGroup: 'ife',
  companyId: 'RUPS-001',
  companyName: 'Empresa de Servicios Públicos S.A.',
  reportDate: '2025-12-31',
  startDate: '2025-01-01',
  nit: '900123456',
  accounts: [],
  serviceBalances: [],
  distribution: { acueducto: 100 },
};

describe('generateQuarterlyOptions', () => {
  const options = generateQuarterlyOptions(baseOptions, 2025);

  it('returns exactly 4 options (one per trimestre)', () => {
    expect(options).toHaveLength(4);
  });

  it('all options have niifGroup set to "ife"', () => {
    for (const opt of options) {
      expect(opt.niifGroup).toBe('ife');
    }
  });

  it('trimestre values are 1T, 2T, 3T, 4T in order', () => {
    expect(options.map(o => o.trimestre)).toEqual(['1T', '2T', '3T', '4T']);
  });

  it('reportDate matches each trimestre endDate', () => {
    expect(options[0].reportDate).toBe('2025-03-31');
    expect(options[1].reportDate).toBe('2025-06-30');
    expect(options[2].reportDate).toBe('2025-09-30');
    expect(options[3].reportDate).toBe('2025-12-31');
  });

  it('startDate matches each trimestre startDate', () => {
    expect(options[0].startDate).toBe('2025-01-01');
    expect(options[1].startDate).toBe('2025-04-01');
    expect(options[2].startDate).toBe('2025-07-01');
    expect(options[3].startDate).toBe('2025-10-01');
  });

  it('preserves shared base data on every option', () => {
    for (const opt of options) {
      expect(opt.companyId).toBe(baseOptions.companyId);
      expect(opt.companyName).toBe(baseOptions.companyName);
      expect(opt.nit).toBe(baseOptions.nit);
      expect(opt.accounts).toBe(baseOptions.accounts);
      expect(opt.serviceBalances).toBe(baseOptions.serviceBalances);
      expect(opt.distribution).toBe(baseOptions.distribution);
    }
  });

  it('accepts year as string', () => {
    const optionsStr = generateQuarterlyOptions(baseOptions, '2024');
    expect(optionsStr).toHaveLength(4);
    expect(optionsStr[0].reportDate).toBe('2024-03-31');
    expect(optionsStr[3].reportDate).toBe('2024-12-31');
  });

  it('each option is a distinct object (not the same reference as baseOptions)', () => {
    for (const opt of options) {
      expect(opt).not.toBe(baseOptions);
    }
  });

  it('options do not share the same reference as each other', () => {
    expect(options[0]).not.toBe(options[1]);
    expect(options[1]).not.toBe(options[2]);
    expect(options[2]).not.toBe(options[3]);
  });
});
