/**
 * Tests for BaseTemplateService
 *
 * The class is abstract; we use a minimal concrete subclass (TestService)
 * that only implements the required abstract members with stubs.
 *
 * ExcelJS is mocked so no filesystem access is needed.
 */

import './mocks/exceljs.mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockWorksheet, mockCell } from './mocks/exceljs.mock';
import { BaseTemplateService } from '../shared/baseTemplateService';
import type {
  NiifGroup,
  TemplatePaths,
  ESFMapping,
  ServiceColumnMapping,
  SheetMapping,
  AccountData,
  ServiceBalanceData,
} from '../types';
import type ExcelJS from 'exceljs';

// ============================================
// Concrete test subclass — stubs only
// ============================================

class TestService extends BaseTemplateService {
  readonly group: NiifGroup = 'r414';

  readonly templatePaths: TemplatePaths = {
    xlsx: 'r414/test.xlsx',
    xbrlt: 'r414/test.xbrlt',
    xml: 'r414/test.xml',
    xbrl: 'r414/test.xbrl',
    basePrefix: 'TestBase',
    outputPrefix: 'Test',
  };

  getESFMappings(): ESFMapping[] {
    return [];
  }

  getServiceColumns(): ServiceColumnMapping {
    return { acueducto: 'I', alcantarillado: 'J', aseo: 'K', total: 'P' };
  }

  getSheetMapping(): SheetMapping {
    return { '110000': 'Hoja1', '210000': 'Hoja2', '310000': 'Hoja3' };
  }

  fillESFSheet(_ws: ExcelJS.Worksheet, _a: AccountData[], _sb: ServiceBalanceData[], _d: Record<string, number>): void {}
  fillERSheet(_ws: ExcelJS.Worksheet, _a: AccountData[], _sb: ServiceBalanceData[], _d: Record<string, number>): void {}

  // Expose protected methods for testing
  publicSumAccountsByPrefix(
    accounts: AccountData[],
    prefixes: string[],
    excludePrefixes?: string[],
    useAbsoluteValue?: boolean
  ): number {
    return this.sumAccountsByPrefix(accounts, prefixes, excludePrefixes, useAbsoluteValue);
  }

  publicSumServiceAccountsByPrefix(
    serviceBalances: ServiceBalanceData[],
    service: string,
    prefixes: string[],
    excludePrefixes?: string[],
    useAbsoluteValue?: boolean
  ): number {
    return this.sumServiceAccountsByPrefix(serviceBalances, service, prefixes, excludePrefixes, useAbsoluteValue);
  }

  publicWriteCell(ws: ExcelJS.Worksheet, cell: string, value: number | string | null): void {
    return this.writeCell(ws, cell, value);
  }

  publicFillInfoSheet(ws: ExcelJS.Worksheet, options: Parameters<typeof this.fillInfoSheet>[1]): void {
    return this.fillInfoSheet(ws, options);
  }

  publicGenerateOutputPrefix(options: Parameters<typeof this.generateOutputPrefix>[0]): string {
    return this.generateOutputPrefix(options);
  }
}

// ============================================
// Helpers
// ============================================

function makeAccount(code: string, value: number): AccountData {
  return { code, name: `Cuenta ${code}`, value, isLeaf: true, level: code.length, class: code[0] };
}

function makeServiceBalance(service: string, code: string, value: number): ServiceBalanceData {
  return { service, code, name: `Cuenta ${code}`, value, isLeaf: true };
}

// ============================================
// Tests
// ============================================

describe('sumAccountsByPrefix', () => {
  const svc = new TestService();

  it('returns 0 for an empty accounts array', () => {
    expect(svc.publicSumAccountsByPrefix([], ['1'])).toBe(0);
  });

  it('sums leaf accounts matching the given prefix', () => {
    const accounts = [
      makeAccount('1105', 1000),
      makeAccount('1110', 2000),
      makeAccount('2105', 500),
    ];
    // Both 1105 and 1110 start with '1'; neither has children in this array
    expect(svc.publicSumAccountsByPrefix(accounts, ['11'])).toBe(3000);
  });

  it('excludes accounts that have more specific children (no double-counting)', () => {
    const accounts = [
      makeAccount('13', 9000),    // parent — should NOT be summed
      makeAccount('1305', 4000),  // child of 13
      makeAccount('1310', 5000),  // child of 13
    ];
    // Only the children (1305 + 1310) should be summed, not 13 itself
    expect(svc.publicSumAccountsByPrefix(accounts, ['1'])).toBe(9000);
  });

  it('excludes accounts matching excludePrefixes', () => {
    const accounts = [
      makeAccount('1105', 1000),
      makeAccount('1305', 2000),
    ];
    // Include prefix '1', but exclude '13'
    expect(svc.publicSumAccountsByPrefix(accounts, ['1'], ['13'])).toBe(1000);
  });

  it('applies Math.abs when useAbsoluteValue is true', () => {
    const accounts = [makeAccount('2105', -3000)];
    expect(svc.publicSumAccountsByPrefix(accounts, ['2'], [], true)).toBe(3000);
  });

  it('accumulates negative values when useAbsoluteValue is false', () => {
    const accounts = [makeAccount('2105', -3000)];
    expect(svc.publicSumAccountsByPrefix(accounts, ['2'])).toBe(-3000);
  });

  it('matches multiple prefixes in same call', () => {
    const accounts = [
      makeAccount('1105', 100),
      makeAccount('2105', 200),
    ];
    expect(svc.publicSumAccountsByPrefix(accounts, ['11', '21'])).toBe(300);
  });

  it('rounds the total to an integer', () => {
    const accounts = [makeAccount('1105', 1.6), makeAccount('1110', 1.6)];
    // 1.6 + 1.6 = 3.2 → Math.round → 3
    expect(svc.publicSumAccountsByPrefix(accounts, ['1'])).toBe(3);
  });

  it('deeper hierarchy: only deepest leaf is counted', () => {
    const accounts = [
      makeAccount('1', 100),       // root — has children
      makeAccount('11', 100),      // level-2 — has children
      makeAccount('1105', 100),    // leaf — no children in array
    ];
    expect(svc.publicSumAccountsByPrefix(accounts, ['1'])).toBe(100);
  });
});

// ============================================
// sumServiceAccountsByPrefix
// ============================================

describe('sumServiceAccountsByPrefix', () => {
  const svc = new TestService();

  it('returns 0 for an empty serviceBalances array', () => {
    expect(svc.publicSumServiceAccountsByPrefix([], 'acueducto', ['1'])).toBe(0);
  });

  it('sums only accounts belonging to the specified service', () => {
    const balances = [
      makeServiceBalance('acueducto', '1105', 1000),
      makeServiceBalance('alcantarillado', '1105', 500),
    ];
    expect(svc.publicSumServiceAccountsByPrefix(balances, 'acueducto', ['11'])).toBe(1000);
  });

  it('avoids double-counting parent/child within the same service', () => {
    const balances = [
      makeServiceBalance('acueducto', '13', 9000),    // parent
      makeServiceBalance('acueducto', '1305', 4000),  // child
      makeServiceBalance('acueducto', '1310', 5000),  // child
    ];
    // Parent 13 is skipped because 1305/1310 are more specific
    expect(svc.publicSumServiceAccountsByPrefix(balances, 'acueducto', ['1'])).toBe(9000);
  });

  it('respects excludePrefixes for service accounts', () => {
    const balances = [
      makeServiceBalance('acueducto', '1105', 1000),
      makeServiceBalance('acueducto', '1305', 2000),
    ];
    expect(svc.publicSumServiceAccountsByPrefix(balances, 'acueducto', ['1'], ['13'])).toBe(1000);
  });

  it('applies absolute value when requested', () => {
    const balances = [makeServiceBalance('acueducto', '2105', -4000)];
    expect(svc.publicSumServiceAccountsByPrefix(balances, 'acueducto', ['2'], [], true)).toBe(4000);
  });
});

// ============================================
// writeCell
// ============================================

describe('writeCell', () => {
  let svc: TestService;

  beforeEach(() => {
    svc = new TestService();
    vi.clearAllMocks();
    // Reset mock cell to a fresh state
    mockCell.value = null as unknown;
    mockCell.numFmt = '';
  });

  it('writes a numeric value to the cell and sets numFmt', () => {
    svc.publicWriteCell(mockWorksheet as unknown as ExcelJS.Worksheet, 'E12', 1234);
    expect(mockWorksheet.getCell).toHaveBeenCalledWith('E12');
    expect(mockCell.value).toBe(1234);
    expect(mockCell.numFmt).toBe('#,##0;(#,##0)');
  });

  it('writes a string value without changing numFmt', () => {
    svc.publicWriteCell(mockWorksheet as unknown as ExcelJS.Worksheet, 'E12', 'Hello');
    expect(mockCell.value).toBe('Hello');
    // numFmt should not be set for strings (remains empty)
    expect(mockCell.numFmt).toBe('');
  });

  it('writes null to clear the cell', () => {
    mockCell.value = 999 as unknown;
    svc.publicWriteCell(mockWorksheet as unknown as ExcelJS.Worksheet, 'E12', null);
    expect(mockCell.value).toBeNull();
  });
});

// ============================================
// fillInfoSheet
// ============================================

describe('fillInfoSheet', () => {
  let svc: TestService;

  beforeEach(() => {
    svc = new TestService();
    vi.clearAllMocks();
    mockCell.value = null as unknown;
    mockCell.numFmt = '';
  });

  it('writes companyName, companyId and reportDate to the correct cells', () => {
    const options = {
      niifGroup: 'r414' as const,
      companyId: '20037',
      companyName: 'Empresa Test S.A.',
      reportDate: '2024-12-31',
      accounts: [],
      serviceBalances: [],
      distribution: {},
    };

    svc.publicFillInfoSheet(mockWorksheet as unknown as ExcelJS.Worksheet, options);

    // getCell should have been called with E12, E13, E14, E18 at minimum
    const calledCells = mockWorksheet.getCell.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledCells).toContain('E12');
    expect(calledCells).toContain('E13');
    expect(calledCells).toContain('E18');
  });

  it('writes rounded rounding degree label when roundingDegree is provided', () => {
    const options = {
      niifGroup: 'r414' as const,
      companyId: '20037',
      companyName: 'Empresa Test',
      reportDate: '2024-12-31',
      roundingDegree: '1' as const,
      accounts: [],
      serviceBalances: [],
      distribution: {},
    };

    svc.publicFillInfoSheet(mockWorksheet as unknown as ExcelJS.Worksheet, options);

    const calledCells = mockWorksheet.getCell.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledCells).toContain('E19');
  });
});

// ============================================
// generateOutputPrefix
// ============================================

describe('generateOutputPrefix', () => {
  const svc = new TestService();

  it('formats the output prefix with company ID and date without dashes', () => {
    const options = {
      niifGroup: 'r414' as const,
      companyId: '20037',
      companyName: 'Test',
      reportDate: '2024-12-31',
      accounts: [],
      serviceBalances: [],
      distribution: {},
    };
    // templatePaths.outputPrefix is 'Test'
    expect(svc.publicGenerateOutputPrefix(options)).toBe('Test_ID20037_20241231');
  });

  it('strips dashes from all date formats', () => {
    const options = {
      niifGroup: 'r414' as const,
      companyId: '99999',
      companyName: 'Test',
      reportDate: '2023-06-30',
      accounts: [],
      serviceBalances: [],
      distribution: {},
    };
    expect(svc.publicGenerateOutputPrefix(options)).toBe('Test_ID99999_20230630');
  });
});

// ============================================
// customizeXml / customizeXbrl (inherited string substitutions)
// ============================================

describe('customizeXml', () => {
  const baseOptions = {
    niifGroup: 'r414' as const,
    companyId: '12345',
    companyName: 'Test Co',
    reportDate: '2025-03-31',
    accounts: [],
    serviceBalances: [],
    distribution: {},
  };

  it('replaces the default date placeholder with the given reportDate', () => {
    // Access via generateTemplatePackage is complex; we test customizeXml indirectly
    // by subclassing and exposing it
    class ExposedService extends TestService {
      public exposeXml(content: string, options: typeof baseOptions) {
        return this.customizeXml(content, options);
      }
    }
    const exposed = new ExposedService();
    const result = exposed.exposeXml('date=2024-12-31 year=2024', baseOptions);
    expect(result).toContain('date=2025-03-31');
    expect(result).toContain('year=2025');
  });

  it('replaces the default company ID placeholder', () => {
    class ExposedService extends TestService {
      public exposeXml(content: string, options: typeof baseOptions) {
        return this.customizeXml(content, options);
      }
    }
    const exposed = new ExposedService();
    const result = exposed.exposeXml('company=ID20037', baseOptions);
    expect(result).toContain('company=ID12345');
  });
});
