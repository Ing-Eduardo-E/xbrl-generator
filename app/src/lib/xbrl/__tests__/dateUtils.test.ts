import { describe, it, expect } from 'vitest';
import {
  getTrimestreDateRange,
  generateFiscalYearTrimesters,
} from '../shared/dateUtils';

describe('getTrimestreDateRange', () => {
  it('T1: starts on Jan 1 and ends on Mar 31', () => {
    const result = getTrimestreDateRange(2025, '1T');
    expect(result.startDate).toBe('2025-01-01');
    expect(result.endDate).toBe('2025-03-31');
  });

  it('T1: prevEndDate is Dec 31 of previous year', () => {
    const result = getTrimestreDateRange(2025, '1T');
    expect(result.prevEndDate).toBe('2024-12-31');
  });

  it('T2: starts on Apr 1 and ends on Jun 30', () => {
    const result = getTrimestreDateRange(2025, '2T');
    expect(result.startDate).toBe('2025-04-01');
    expect(result.endDate).toBe('2025-06-30');
  });

  it('T2: prevEndDate is end of T1', () => {
    const result = getTrimestreDateRange(2025, '2T');
    expect(result.prevEndDate).toBe('2025-03-31');
  });

  it('T3: starts on Jul 1 and ends on Sep 30', () => {
    const result = getTrimestreDateRange(2025, '3T');
    expect(result.startDate).toBe('2025-07-01');
    expect(result.endDate).toBe('2025-09-30');
  });

  it('T3: prevEndDate is end of T2', () => {
    const result = getTrimestreDateRange(2025, '3T');
    expect(result.prevEndDate).toBe('2025-06-30');
  });

  it('T4: starts on Oct 1 and ends on Dec 31', () => {
    const result = getTrimestreDateRange(2025, '4T');
    expect(result.startDate).toBe('2025-10-01');
    expect(result.endDate).toBe('2025-12-31');
  });

  it('T4: prevEndDate is end of T3', () => {
    const result = getTrimestreDateRange(2025, '4T');
    expect(result.prevEndDate).toBe('2025-09-30');
  });

  it('accepts year as string', () => {
    const result = getTrimestreDateRange('2024', '1T');
    expect(result.startDate).toBe('2024-01-01');
    expect(result.endDate).toBe('2024-03-31');
    expect(result.prevEndDate).toBe('2023-12-31');
  });

  it('works correctly for year 2020 (edge year)', () => {
    const t4 = getTrimestreDateRange(2020, '4T');
    expect(t4.startDate).toBe('2020-10-01');
    expect(t4.endDate).toBe('2020-12-31');
  });
});

describe('generateFiscalYearTrimesters', () => {
  const periods = generateFiscalYearTrimesters(2025);

  it('returns exactly 4 periods', () => {
    expect(periods).toHaveLength(4);
  });

  it('first period starts on Jan 1', () => {
    expect(periods[0].startDate).toBe('2025-01-01');
  });

  it('last period ends on Dec 31', () => {
    expect(periods[3].endDate).toBe('2025-12-31');
  });

  it('trimestre values are 1T, 2T, 3T, 4T in order', () => {
    expect(periods.map(p => p.trimestre)).toEqual(['1T', '2T', '3T', '4T']);
  });

  it('labels follow the pattern "XT YYYY"', () => {
    expect(periods[0].label).toBe('1T 2025');
    expect(periods[1].label).toBe('2T 2025');
    expect(periods[2].label).toBe('3T 2025');
    expect(periods[3].label).toBe('4T 2025');
  });

  it('periods do not overlap: each startDate follows previous endDate', () => {
    for (let i = 1; i < periods.length; i++) {
      const prevEnd = new Date(periods[i - 1].endDate);
      const currStart = new Date(periods[i].startDate);
      // currStart must be exactly the day after prevEnd
      const diff = currStart.getTime() - prevEnd.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000); // exactly 1 day apart
    }
  });

  it('accepts year as string', () => {
    const periodsStr = generateFiscalYearTrimesters('2024');
    expect(periodsStr).toHaveLength(4);
    expect(periodsStr[0].startDate).toBe('2024-01-01');
    expect(periodsStr[3].endDate).toBe('2024-12-31');
  });

  it('each period contains the correct trimestre date range', () => {
    expect(periods[1].startDate).toBe('2025-04-01');
    expect(periods[1].endDate).toBe('2025-06-30');
    expect(periods[2].startDate).toBe('2025-07-01');
    expect(periods[2].endDate).toBe('2025-09-30');
  });
});
