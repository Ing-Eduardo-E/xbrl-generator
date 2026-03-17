import { vi } from 'vitest';

export const mockCell = { value: null as unknown, font: {}, numFmt: '' };
export const mockWorksheet = {
  getCell: vi.fn().mockReturnValue(mockCell),
  getRow: vi.fn().mockReturnValue({ getCell: vi.fn().mockReturnValue(mockCell) }),
  addRow: vi.fn(),
  eachRow: vi.fn(),
  name: 'TestSheet',
};
export const mockWorkbook = {
  getWorksheet: vi.fn().mockReturnValue(mockWorksheet),
  addWorksheet: vi.fn().mockReturnValue(mockWorksheet),
  xlsx: {
    readFile: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    writeBuffer: vi.fn().mockResolvedValue(Buffer.from([])),
  },
};
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => mockWorkbook),
  },
}));
