/**
 * Integration smoke tests for batch IFE logic.
 *
 * These tests exercise pure functions only — no DB, no filesystem, no network.
 * They verify the temporal math and object-independence guarantees that the
 * generateBatchIFE router relies on.
 */

import { describe, it, expect } from 'vitest';
import {
  generateFiscalYearTrimesters,
  getTrimestreDateRange,
} from '../../shared/dateUtils';
import { generateQuarterlyOptions } from '../../shared/quarterlyDerivation';
import type { TemplateWithDataOptions } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a YYYY-MM-DD string into a UTC midnight timestamp (ms). */
function toUtcMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Return the number of days in a closed [startDate, endDate] interval. */
function daysInPeriod(startDate: string, endDate: string): number {
  const diff = toUtcMs(endDate) - toUtcMs(startDate);
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1; // inclusive
}

/** Minimal valid TemplateWithDataOptions for testing. */
function makeBaseOptions(overrides: Partial<TemplateWithDataOptions> = {}): TemplateWithDataOptions {
  return {
    niifGroup: 'ife',
    companyId: 'TEST-001',
    companyName: 'Empresa de Prueba S.A.',
    reportDate: '2025-12-31',
    startDate: '2025-01-01',
    trimestre: '4T',
    accounts: [],
    serviceBalances: [],
    distribution: { acueducto: 40, alcantarillado: 35, aseo: 25 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1 – Temporal continuity
// ---------------------------------------------------------------------------

describe('generateFiscalYearTrimesters – temporal continuity (2025)', () => {
  it('each period starts exactly 1 day after the previous period ends', () => {
    const periods = generateFiscalYearTrimesters(2025);

    expect(periods).toHaveLength(4);

    for (let i = 1; i < periods.length; i++) {
      const prevEnd = toUtcMs(periods[i - 1].endDate);
      const currStart = toUtcMs(periods[i].startDate);
      const gapDays = (currStart - prevEnd) / (1000 * 60 * 60 * 24);

      expect(gapDays).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2 – Annual coverage
// ---------------------------------------------------------------------------

describe('generateFiscalYearTrimesters – annual coverage', () => {
  it('4 quarters of 2025 (non-leap) cover exactly 365 days', () => {
    const periods = generateFiscalYearTrimesters(2025);
    const total = periods.reduce(
      (sum, p) => sum + daysInPeriod(p.startDate, p.endDate),
      0
    );
    expect(total).toBe(365);
  });

  it('4 quarters of 2024 (leap year) cover exactly 366 days', () => {
    const periods = generateFiscalYearTrimesters(2024);
    const total = periods.reduce(
      (sum, p) => sum + daysInPeriod(p.startDate, p.endDate),
      0
    );
    expect(total).toBe(366);
  });
});

// ---------------------------------------------------------------------------
// Test 3 – Leap year T1 end date
// ---------------------------------------------------------------------------

describe('generateFiscalYearTrimesters – leap year 2024 T1', () => {
  it('T1 2024 ends on 2024-03-31 (not 2024-02-29)', () => {
    const periods = generateFiscalYearTrimesters(2024);
    const t1 = periods[0];

    expect(t1.trimestre).toBe('1T');
    expect(t1.startDate).toBe('2024-01-01');
    // Calendar quarter always ends March 31, regardless of leap year
    expect(t1.endDate).toBe('2024-03-31');
  });
});

// ---------------------------------------------------------------------------
// Test 4 – Immutability of generateQuarterlyOptions output
// ---------------------------------------------------------------------------

describe('generateQuarterlyOptions – object independence', () => {
  it('mutating one quarterly option does not affect the others', () => {
    const base = makeBaseOptions();
    const options = generateQuarterlyOptions(base, 2025);

    expect(options).toHaveLength(4);

    // Store original value of the second option's reportDate
    const originalT2ReportDate = options[1].reportDate;

    // Mutate the first option
    (options[0] as unknown as Record<string, unknown>).reportDate = 'MUTATED';

    // Second option must be unaffected
    expect(options[1].reportDate).toBe(originalT2ReportDate);
  });

  it('each option has a unique reportDate', () => {
    const base = makeBaseOptions();
    const options = generateQuarterlyOptions(base, 2025);

    const dates = options.map(o => o.reportDate);
    const unique = new Set(dates);

    expect(unique.size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Test 5 – Label format
// ---------------------------------------------------------------------------

describe('generateFiscalYearTrimesters – label format', () => {
  it('labels follow the pattern "<trimestre> <year>" (e.g. "1T 2025")', () => {
    const periods = generateFiscalYearTrimesters(2025);

    // Actual template: `${t} ${y}` where t is '1T', '2T', '3T', '4T'
    expect(periods[0].label).toBe('1T 2025');
    expect(periods[1].label).toBe('2T 2025');
    expect(periods[2].label).toBe('3T 2025');
    expect(periods[3].label).toBe('4T 2025');
  });

  it('works identically when year is passed as a string', () => {
    const periods = generateFiscalYearTrimesters('2025');

    expect(periods[0].label).toBe('1T 2025');
    expect(periods[3].label).toBe('4T 2025');
  });
});

// ---------------------------------------------------------------------------
// Test 6 – generateQuarterlyOptions wires trimestre + dates correctly
// ---------------------------------------------------------------------------

describe('generateQuarterlyOptions – correct date wiring per quarter', () => {
  const base = makeBaseOptions();
  const options = generateQuarterlyOptions(base, 2025);

  const expected = [
    { trimestre: '1T', reportDate: '2025-03-31', startDate: '2025-01-01' },
    { trimestre: '2T', reportDate: '2025-06-30', startDate: '2025-04-01' },
    { trimestre: '3T', reportDate: '2025-09-30', startDate: '2025-07-01' },
    { trimestre: '4T', reportDate: '2025-12-31', startDate: '2025-10-01' },
  ] as const;

  expected.forEach(({ trimestre, reportDate, startDate }) => {
    it(`${trimestre}: reportDate=${reportDate}, startDate=${startDate}`, () => {
      const opt = options.find(o => o.trimestre === trimestre);
      expect(opt).toBeDefined();
      expect(opt!.reportDate).toBe(reportDate);
      expect(opt!.startDate).toBe(startDate);
    });
  });

  it('all options have niifGroup forced to "ife"', () => {
    options.forEach(opt => {
      expect(opt.niifGroup).toBe('ife');
    });
  });

  it('all options preserve base companyId and companyName', () => {
    options.forEach(opt => {
      expect(opt.companyId).toBe(base.companyId);
      expect(opt.companyName).toBe(base.companyName);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 7 – getTrimestreDateRange edge cases
// ---------------------------------------------------------------------------

describe('getTrimestreDateRange – boundary dates', () => {
  it('1T starts Jan 1 and ends Mar 31', () => {
    const r = getTrimestreDateRange(2025, '1T');
    expect(r.startDate).toBe('2025-01-01');
    expect(r.endDate).toBe('2025-03-31');
    expect(r.prevEndDate).toBe('2024-12-31');
  });

  it('2T starts Apr 1 and ends Jun 30', () => {
    const r = getTrimestreDateRange(2025, '2T');
    expect(r.startDate).toBe('2025-04-01');
    expect(r.endDate).toBe('2025-06-30');
    expect(r.prevEndDate).toBe('2025-03-31');
  });

  it('3T starts Jul 1 and ends Sep 30', () => {
    const r = getTrimestreDateRange(2025, '3T');
    expect(r.startDate).toBe('2025-07-01');
    expect(r.endDate).toBe('2025-09-30');
    expect(r.prevEndDate).toBe('2025-06-30');
  });

  it('4T starts Oct 1 and ends Dec 31', () => {
    const r = getTrimestreDateRange(2025, '4T');
    expect(r.startDate).toBe('2025-10-01');
    expect(r.endDate).toBe('2025-12-31');
    expect(r.prevEndDate).toBe('2025-09-30');
  });

  it('accepts year as string', () => {
    const r = getTrimestreDateRange('2023', '2T');
    expect(r.startDate).toBe('2023-04-01');
  });
});
