# Phase 1: Safety Net & Bug Fixes - Research

**Researched:** 2026-03-21
**Domain:** XBRL taxonomy generation — ExcelJS pipeline testing, R414 leaf-detection bug, IFE URL bug, Vitest E2E patterns
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | IFE E2E pipeline test — verifies `preserveOriginalStructure()` produces a ZIP with 4 correct files and non-empty ESF/ER cells | IFE data-writing pattern confirmed in `excelRewriter.ts` lines 1780-2458; real template buffer pattern exists in `r414Pipeline.test.ts` |
| TEST-02 | R414 E2E pipeline test — verifies `generateOfficialTemplatePackageWithData()` produces a ZIP with populated ESF and ER cells | `generateOfficialTemplatePackageWithData()` in `officialTemplateService.ts`; ZIP structure confirmed in XBRL_COMPATIBILITY.md |
| TEST-03 | Unit test for `generateOfficialTemplatePackageWithData()` — verifies ZIP shape (4 files, correct names, internal structure) | JSZip API for ZIP inspection; 4-file requirement confirmed |
| BUG-01 | R414 cells populated — `isLeaf` DB flag replaced with `codesWithChildren` dynamic detection in `excelRewriter.ts` | Root cause confirmed in BUG_R414_DIAGNOSIS.md; fix pattern in `baseTemplateService.ts` lines 240-245 |
| BUG-02 | IFE entry-point URL updated for all trimestres — `templateCustomizers.ts` must perform the Q2→QN XSD URL substitution | Bug confirmed in `templateCustomizers.ts` line 110 (returns early without URL substitution for IFE non-Q2); fix pattern in `IFETemplateService.ts` |
| R414-01 | R414 output Hoja2 (ESF) completely populated | Enabled by BUG-01 fix; existing `R414_ESF_MAPPINGS` already complete |
| R414-02 | R414 output Hoja3 (ER) completely populated | Enabled by BUG-01 fix; existing `R414_ER_MAPPINGS` already complete |
| R414-04 | R414 Hoja1 company fields all filled (NIT, nombre, dirección, fecha, responsable) | Hoja1 filling code already present in `excelRewriter.ts` lines 97-132; needs end-to-end verification |
| IFE-01 | IFE passes E2E testing in XBRL Express for all 4 trimestres | Enabled by BUG-02 fix; IFE data-writing path confirmed working for Q2 |
</phase_requirements>

---

## Summary

Phase 1 has two distinct sub-domains: (1) writing automated pipeline tests for paths that currently have zero test coverage, and (2) applying two targeted bug fixes. The research is entirely based on direct code analysis — all patterns are established, all root causes are confirmed, and no external library research is needed. The primary risk is accidental regression to IFE (the only XBRL Express-confirmed working output), which is precisely why TEST-01 must be completed before BUG-01 is applied.

The existing test suite (302 tests, 4 seconds) demonstrates the exact patterns to follow: `r414Pipeline.test.ts` loads a real template buffer with `readFile`, calls `rewriteFinancialDataWithExcelJS()` directly, then reads back cell values using a fresh `ExcelJS.Workbook`. This same pattern applies to the IFE pipeline test. The ZIP-shape test (TEST-02, TEST-03) requires adding `generateOfficialTemplatePackageWithData()` to the test surface, which currently has zero coverage.

BUG-01 (R414 empty data) has a confirmed, minimal fix: replace `if (!account.isLeaf) continue` at five locations in `excelRewriter.ts` with a pre-computed `codesWithChildren` Set using the exact same algorithm already in `baseTemplateService.ts` lines 240-245. BUG-02 (IFE URL) has an equally minimal fix: add entry-point URL substitution to the IFE block in `templateCustomizers.ts`, replicating the logic already present in `IFETemplateService.ts`. Neither fix requires structural changes to any file.

**Primary recommendation:** Write TEST-01 (IFE pipeline) first, then apply BUG-01 with TEST-02 as confirmation, then apply BUG-02. Never apply a bug fix before its safety-net test exists.

---

## Standard Stack

### Core (already installed — no changes needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | current (4s suite) | Test framework | Already in use; 302 passing tests; configured in `app/vitest.config.ts` |
| ExcelJS | current | Excel workbook reading/writing in tests | Must use for assertions — SheetJS destroys xlsx structure |
| JSZip | current | ZIP inspection in TEST-02/03 | Already used in `officialTemplateService.ts` for ZIP assembly |
| Node `fs/promises` | built-in | Load real template buffers in tests | Pattern established in `r414Pipeline.test.ts` line 76 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `path.resolve` | built-in | Absolute path to template files in tests | Use `resolve(__dirname, '../../../../public/templates/...')` pattern |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Test File Locations

```
app/src/lib/xbrl/__tests__/
├── r414Pipeline.test.ts          # EXISTS — 8 tests, real template, ExcelJS assertions
├── ifePipeline.test.ts           # MISSING (TEST-01) — must create
├── templatePackage.test.ts       # MISSING (TEST-02, TEST-03) — must create
├── baseTemplateService.test.ts   # EXISTS
├── dateUtils.test.ts             # EXISTS
├── excelUtils.test.ts            # EXISTS
├── grupoRewriters.test.ts        # EXISTS
├── pucUtils.test.ts              # EXISTS
├── templatePaths.test.ts         # EXISTS
└── mocks/
    └── exceljs.mock.ts           # EXISTS — minimal mock (NOT for pipeline tests)
```

### Pattern 1: Pipeline Test Using Real Template Buffer

The `r414Pipeline.test.ts` pattern is the canonical approach. Pipeline tests must NOT use the `exceljs.mock.ts` — they need a real workbook to verify actual cell values.

```typescript
// Source: app/src/lib/xbrl/__tests__/r414Pipeline.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { rewriteFinancialDataWithExcelJS } from '../official/excelRewriter';
import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

describe('IFE Pipeline E2E', () => {
  let templateBuffer: Buffer;

  beforeAll(async () => {
    const templatePath = resolve(
      __dirname,
      '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx'
    );
    templateBuffer = await readFile(templatePath);
  }, 30000);

  it('must write ESF data to Hoja3 for 1T', async () => {
    const result = await rewriteFinancialDataWithExcelJS(templateBuffer, {
      niifGroup: 'ife',
      companyId: '20037',
      companyName: 'Empresa de Prueba',
      reportDate: '2025-03-31',   // 1T
      consolidatedAccounts: MOCK_ACCOUNTS,
      serviceBalances: MOCK_SERVICE_BALANCES,
      activeServices: ['acueducto', 'alcantarillado', 'aseo'],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result as any);

    const hoja3 = wb.getWorksheet('Hoja3');
    expect(hoja3).toBeDefined();
    // Verify non-empty cells — exact cells depend on IFE_ESF_MAPPINGS
    const i15 = hoja3!.getCell('I15').value;
    expect(typeof i15).toBe('number');
    expect(i15).not.toBe(0);
  }, 30000);
});
```

**Key rules for pipeline tests:**
- `beforeAll` loads real template from disk once — reuse for all tests in suite
- Each `it` block creates a fresh `ExcelJS.Workbook()` to avoid state sharing
- Timeout 30000ms per test — template I/O is slow
- Test body calls the function under test with `consolidatedAccounts` populated (not undefined)

### Pattern 2: ZIP Shape Test Using JSZip

For TEST-02 (ZIP output shape), use JSZip to inspect the archive returned by `generateOfficialTemplatePackageWithData()`:

```typescript
// Source: JSZip API (already used in officialTemplateService.ts)
import JSZip from 'jszip';
import { generateOfficialTemplatePackageWithData } from '../officialTemplateService';

it('ZIP must contain 4 required files', async () => {
  const zipBuffer = await generateOfficialTemplatePackageWithData({
    niifGroup: 'r414',
    companyId: '20037',
    // ... minimal required options
    consolidatedAccounts: MOCK_ACCOUNTS,
    serviceBalances: MOCK_SERVICE_BALANCES,
  });

  const zip = await JSZip.loadAsync(zipBuffer);
  const files = Object.keys(zip.files);

  // All 4 required files must be present
  expect(files.some(f => f.endsWith('.xbrlt'))).toBe(true);
  expect(files.some(f => f.endsWith('.xml'))).toBe(true);
  expect(files.some(f => f.endsWith('.xlsx'))).toBe(true);
  expect(files.some(f => f.endsWith('.xbrl'))).toBe(true);

  // xlsx must be readable by ExcelJS
  const xlsxEntry = files.find(f => f.endsWith('.xlsx'))!;
  const xlsxBuffer = await zip.files[xlsxEntry].async('nodebuffer');
  const wb = new ExcelJS.Workbook();
  await expect(wb.xlsx.load(xlsxBuffer as any)).resolves.not.toThrow();
});
```

### Pattern 3: BUG-01 Fix — codesWithChildren Dynamic Leaf Detection

The fix replaces `if (!account.isLeaf) continue` in `excelRewriter.ts` with a pre-computed Set. Applies to the R414 inline section in `rewriteFinancialDataWithExcelJS()`.

```typescript
// Source: app/src/lib/xbrl/shared/baseTemplateService.ts lines 240-245
// Pattern to replicate in excelRewriter.ts BEFORE any R414 mapping loops

// Add ONCE before the r414 block's first loop:
const codesWithChildren = new Set<string>();
for (const account of options.consolidatedAccounts) {
  for (let i = 1; i < account.code.length; i++) {
    codesWithChildren.add(account.code.slice(0, i));
  }
}

// Replace EVERY instance of:
//   if (!account.isLeaf) continue;
// With:
//   if (codesWithChildren.has(account.code)) continue;
```

**Locations in `excelRewriter.ts` requiring this change (confirmed line numbers from BUG_R414_DIAGNOSIS.md):**
- Line 201: Hoja2 consolidated loop
- Line 222: Hoja2 per-service loop
- Line 246: Hoja3 consolidated loop
- Line 274: Hoja3 per-service loop
- Line 325: Hoja7 PPE section

Also: per-service `accountsByService` arrays feed loops at lines 220-231. Those service balance loops also check `if (!account.isLeaf) continue` — build a `serviceCodesWithChildren` set per service or reuse the `codesWithChildren` set (consolidated codes apply to service codes too since service codes are a subset of consolidated codes).

### Pattern 4: BUG-02 Fix — IFE Entry-Point URL Substitution

The `templateCustomizers.ts` IFE block (lines 57-111) handles date replacement but returns early without updating the XSD entry-point URL. The fix adds URL substitution before the `return customized` at line 110.

```typescript
// Source: confirmed from templateCustomizers.ts line 57-111 and
//         IFETemplateService.ts quarter name mapping pattern

// Map trimestre names for XSD entry-point URL
const trimNamesXsd: Record<string, string> = {
  '03': 'PrimerTrimestre',
  '06': 'SegundoTrimestre',
  '09': 'TercerTrimestre',
  '12': 'CuartoTrimestre',
};

// Existing template has Q2 entry-point URL:
// IFE_PuntoEntradaSegundoTrimestre-2025.xsd
// Must replace with correct quarter URL before return:
const trimName = trimNamesXsd[reportMonth] || 'SegundoTrimestre';
customized = customized.replace(
  /IFE_PuntoEntradaSegundoTrimestre-(\d{4})\.xsd/g,
  `IFE_PuntoEntrada${trimName}-$1.xsd`
);

// Also update filenames in config= attribute:
// IFE_SegundoTrimestre_ID20037_2025-06-30.xml → IFE_{TrimName}_ID...xsd
const trimNamesFile: Record<string, string> = {
  '03': 'PrimerTrimestre',
  '06': 'SegundoTrimestre',
  '09': 'TercerTrimestre',
  '12': 'CuartoTrimestre',
};
// NOTE: filename replacement is handled separately by the outputFileName
// substitution already in customizeXbrlt; verify this covers the URL too
```

**Important verification:** Check whether the `config=` attribute replacement (lines 49-52) already covers the entry-point URL, or if the XSD URL is in a separate `<schemaRef>` element. The `XBRL_COMPATIBILITY.md` confirms the entry-point is in the `.xbrlt` itself, not just the `config=` attribute.

### Anti-Patterns to Avoid

- **Using `exceljs.mock.ts` in pipeline tests:** The mock returns the same `mockCell` for all `getCell()` calls. Pipeline tests must create a real `ExcelJS.Workbook` and load actual template bytes.
- **Testing only Q2 for IFE:** BUG-02 only manifests for Q1, Q3, Q4. Tests must explicitly pass `reportDate: '2025-03-31'` (Q1) and verify the `.xbrlt` output contains the correct XSD URL string.
- **Applying BUG-01 fix before writing TEST-01:** The IFE code path shares the outer function `rewriteFinancialDataWithExcelJS`. Changing leaf detection logic could accidentally affect IFE's data loop even though it's inside `if (options.niifGroup === 'ife')`.
- **Using `writeCellNumber()` or direct `cell.value =` instead of `writeCellSafe()`:** Only `writeCellSafe()` clears `model.sharedFormula` and applies `numFmt`. The R414 template has pre-existing formulas; `writeCellNumber()` does not clear them and produces xs:decimal validation errors in XBRL Express.
- **Verifying ZIP with only file count:** A ZIP with 4 files is necessary but not sufficient. The `.xlsx` must be loadable by ExcelJS (TEST-03 requirement). `JSZip.loadAsync(buffer)` plus `ExcelJS.Workbook.xlsx.load()` on the extracted xlsx buffer is the complete verification.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic leaf detection | Custom `isLeaf` recalculation | `codesWithChildren` Set pattern from `baseTemplateService.ts:240-245` | Already O(N*L), proven correct, tested via baseTemplateService.test.ts |
| Quarter name mapping | New switch/map | Replicate the `trimNamesXsd` pattern from IFETemplateService | Exact strings must match SSPD XSD filenames — not a domain to invent |
| ZIP file inspection | Manual byte parsing | `JSZip.loadAsync()` | Already in project dependencies; API is `zip.files[name].async('nodebuffer')` |
| Cell assertion in tests | Custom workbook helpers | `ExcelJS.Workbook().xlsx.load(buffer)` then `.getWorksheet().getCell()` | Same pattern used in all 8 existing `r414Pipeline.test.ts` tests |

**Key insight:** Every pattern needed for Phase 1 already exists in the codebase. The task is application of existing patterns, not invention.

---

## Common Pitfalls

### Pitfall 1: isLeaf Flag — Silent Zero Sums

**What goes wrong:** `excelRewriter.ts` R414 loops check `if (!account.isLeaf) continue`. If an uploaded Excel balance has accounts where parent nodes are also included (pre-aggregated format), the DB-stored `isLeaf` flag may mark many accounts as non-leaf (`isLeaf = false`). All mapping loops produce `totalValue = 0`. The guard `if (totalValue !== 0)` then skips the `writeCellSafe()` call, leaving cells untouched (template placeholder values remain). Output LOOKS valid in Excel but XBRL Express reads zeros.

**Why it happens:** `isLeaf` is set at upload time based on the Excel hierarchy. `BaseTemplateService.sumAccountsByPrefix()` never trusts this flag — it computes dynamically. The R414 inline code in `excelRewriter.ts` does trust it.

**How to avoid:** Pre-compute `codesWithChildren` Set (Pattern 3 above). This is the same algorithm used in `baseTemplateService.ts`. Apply it to BOTH consolidated account loops AND per-service `accountsByService` loops.

**Warning signs:** Test passes with `MOCK_ACCOUNTS` (which have `isLeaf: true` hardcoded) but fails in production with real uploaded data. Always add a test case with `isLeaf: false` accounts that have no children — these should be included in sums after the fix.

### Pitfall 2: IFE Q2-Only Template — URL Must Be Patched at Runtime

**What goes wrong:** The template file on disk is `IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt`. Its content contains `IFE_PuntoEntradaSegundoTrimestre-2025.xsd` as the taxonomy entry point. For Q1, Q3, Q4, this URL is wrong — SSPD has separate XSD files per quarter. `templateCustomizers.ts` handles date replacement but returns from the IFE block at line 110 without replacing the entry-point URL.

**Why it happens:** The `IFETemplateService.customizeXbrlt()` override correctly patches the URL, but `templateCustomizers.ts` is a separate function used in the `officialTemplateService.ts` flow. The two code paths diverged and the URL substitution was only added to one of them.

**How to avoid:** Add the URL substitution to `templateCustomizers.ts` IFE block before the `return customized`. Use regex on the full string content (same approach as the date replacements above it).

**Warning signs:** IFE ZIP for Q2 works in XBRL Express but Q1/Q3/Q4 fails with "unknown taxonomy entry point" or "schemaRef not found" error. The test for BUG-02 must check the raw `.xbrlt` string content for the correct XSD filename, not just that the ZIP was created.

### Pitfall 3: preserveOriginalStructure Has Zero Tests — Treat as Frozen

**What goes wrong:** `officialTemplateService.ts` `preserveOriginalStructure()` stitches original template ZIP internals (`workbook.xml`, `styles.xml`, `xl/theme/`) with ExcelJS-written worksheet content. If any test helper code calls `workbook.addWorksheet()` or any test accidentally upgrades ExcelJS, the `xl/theme/theme1.xml` reference gets re-added, breaking Apache POI validation inside XBRL Express.

**Why it happens:** `preserveOriginalStructure()` was built to work around ExcelJS modifying `workbook.xml` internal references. It is brittle by design.

**How to avoid:** TEST-02 and TEST-03 test `generateOfficialTemplatePackageWithData()` which calls `preserveOriginalStructure()`. These tests provide a regression baseline. Do NOT call `workbook.addWorksheet()` anywhere in test setup. Do NOT create test helper workbooks and then pass them to production code paths.

**Warning signs:** ZIP is created, `xlsx` has correct file count, but XBRL Express refuses to import with "invalid workbook structure" or POI parser exception.

### Pitfall 4: The guard `if (totalValue !== 0)` silently skips cells

**What goes wrong:** Even after fixing the `isLeaf` check, if all account values for a PUC prefix genuinely sum to zero (e.g., a test account for a PUC code not in `MOCK_ACCOUNTS`), `writeCellSafe()` is never called and the template formula remains in the cell. XBRL Express reads the old formula result, not zero.

**Why it happens:** The guard was added to avoid overwriting formula cells with zeros. But for XBRL output, all data cells must contain plain numeric values, not formulas.

**How to avoid:** For TEST-02 verification, ensure `MOCK_ACCOUNTS` includes at least one account matching each primary PUC prefix in `R414_ESF_MAPPINGS` row 15 (Efectivo) and row 14 in ER (Ingresos). The existing `r414Pipeline.test.ts` `MOCK_ACCOUNTS` already covers this — reuse it.

### Pitfall 5: IFE Hoja1 cell addresses differ from R414 Hoja1 addresses

**What goes wrong:** R414 Hoja1 uses cells `E12` (nombre), `E13` (RUPS), `E14` (NIT). IFE Hoja1 uses `E13` (NIT), `E14` (RUPS/companyId), `E15` (nombre) — shifted by one row. Tests verifying IFE Hoja1 metadata must use IFE-specific cell addresses.

**Why it happens:** The two taxonomies have different information layouts in their Hoja1 sheets.

**How to avoid:** Read the IFE Hoja1 assertions from the existing `excelRewriter.ts` IFE block (lines 1800-1803) before writing any test assertion. Do not copy R414 Hoja1 cell addresses into IFE tests.

---

## Code Examples

### IFE Mock Data for Tests

IFE tests need `ifeCompanyData` in addition to the standard fields. The IFE block in `excelRewriter.ts` reads from `options.ifeCompanyData` (optional, graceful fallback to empty string if absent). For testing Hoja1 population, provide minimal data:

```typescript
// Source: excelRewriter.ts lines 1800-1840 (IFE Hoja1 writes)
const MOCK_IFE_OPTIONS = {
  niifGroup: 'ife' as const,
  companyId: '20037',
  companyName: 'Empresa de Prueba S.A. E.S.P.',
  reportDate: '2025-03-31',   // Q1 — the bug-triggering quarter
  nit: '800123456',
  consolidatedAccounts: MOCK_ACCOUNTS,  // reuse r414Pipeline accounts
  serviceBalances: MOCK_SERVICE_BALANCES,
  activeServices: ['acueducto', 'alcantarillado', 'aseo'],
  ifeCompanyData: {
    address: 'Calle 1 #2-3',
    city: 'Bogotá',
    phone: '6011234567',
    email: 'contacto@empresa.com.co',
    employeesStart: 50,
    employeesEnd: 52,
    employeesAverage: 51,
  },
};
```

### BUG-02 Test: Verify XSD URL in Raw XBRLT Content

TEST-01 should verify the `.xbrlt` string contains the correct trimestre URL. This requires accessing the raw customized `.xbrlt` content. The simplest approach is to test `customizeXbrlt()` in isolation:

```typescript
// Source: templateCustomizers.ts — function under test
import { customizeXbrlt } from '../official/templateCustomizers';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

it('IFE 1T xbrlt must reference PrimerTrimestre XSD, not SegundoTrimestre', async () => {
  const templatePath = resolve(
    __dirname,
    '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt'
  );
  const originalContent = await readFile(templatePath, 'utf-8');
  const outputFileName = 'IFE_PrimerTrimestre_ID20037_2025-03-31';

  const customized = customizeXbrlt(originalContent, {
    niifGroup: 'ife',
    companyId: '20037',
    companyName: 'Empresa de Prueba',
    reportDate: '2025-03-31',   // Q1
  }, outputFileName);

  // After BUG-02 fix: must contain PrimerTrimestre URL
  expect(customized).toContain('IFE_PuntoEntradaPrimerTrimestre-2025.xsd');
  // Must NOT contain the wrong Q2 URL
  expect(customized).not.toContain('IFE_PuntoEntradaSegundoTrimestre-2025.xsd');
});
```

### Confirmed: IFE Template File Path

```typescript
// Source: XBRL_COMPATIBILITY.md template inventory
const IFE_TEMPLATE_PATH = resolve(
  __dirname,
  '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx'
);
const IFE_XBRLT_PATH = resolve(
  __dirname,
  '../../../../public/templates/ife/IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt'
);
```

### Confirmed: ESF Cells to Assert in IFE Hoja3

The IFE ESF sheet uses columns I-P for services, Q for total. Row 15 is the first data row (same as R414 Hoja2). Service column layout from `excelRewriter.ts` line 1784-1787:

```typescript
// Source: excelRewriter.ts lines 1784-1787
const IFE_ESF_COLS = {
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  energia: 'L',
  gas: 'M',
  glp: 'N',
  xm: 'O',
  otras: 'P',
};
// Total column: Q (confirmed in IFETemplateService.ts)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SheetJS for Excel writing | ExcelJS only | Pre-2025 (commit `c599e23`) | SheetJS destroyed `sharedStrings.xml`; ExcelJS preserves internal structure |
| Trust `isLeaf` DB flag | Dynamic `codesWithChildren` Set | Phase 1 (this phase) | Eliminates silent zero-sums for pre-aggregated balance sheets |
| Single entry-point URL for all IFE trimestres | Per-quarter XSD URL | Phase 1 (this phase, BUG-02) | Q1/Q3/Q4 packages rejected by XBRL Express without correct URL |
| `excelDataFiller.ts` (SheetJS path) | `rewriteFinancialDataWithExcelJS` (ExcelJS path) | Pre-2025 | `excelDataFiller.ts` is dead code — Phase 2 will delete it |

**Deprecated/outdated:**
- `excelDataFiller.ts`: Uses SheetJS, is dead code, must NOT be wired in. `templateCustomizers.ts` line 10 imports it and line 17 calls it from `customizeExcel()` — this function is called by nothing in the active flow, but the import is a lint/risk issue. Deletion is Phase 2 work.

---

## Open Questions

1. **Does `customizeXml()` need IFE trimestre handling?**
   - What we know: `customizeXml()` returns content unchanged for all taxonomies. The `.xml` mapping file uses generic cell references that don't change by quarter.
   - What's unclear: Whether SSPD provides separate `.xml` files per trimestre or one shared file. The template inventory shows one `.xml` file for IFE.
   - Recommendation: No change needed. The `.xml` file is renamed via the `config=` attribute in `.xbrlt` — the content itself is reusable across quarters.

2. **Will TEST-01 pass before BUG-01 is fixed (i.e., does IFE currently produce non-zero ESF cells)?**
   - What we know: IFE uses `IFETemplateService.sumServiceAccountsByPrefix()` via the `ifeTemplateService` singleton in `excelRewriter.ts` lines 1780+. This method uses dynamic leaf detection (not `isLeaf`). IFE is confirmed working in XBRL Express.
   - What's unclear: Whether the `excelRewriter.ts` IFE section uses the singleton (`ifeTemplateService`) or has its own inline loop with `!account.isLeaf`.
   - Recommendation: Read `excelRewriter.ts` lines 1780-1900 before writing the test to confirm whether IFE uses inline loops or delegates to `ifeTemplateService`. If inline with `!account.isLeaf`, TEST-01 will fail until BUG-01 is also applied to IFE loops.

3. **Does the R414 Hoja1 `responsable` field have a corresponding input in the UI?**
   - What we know: R414-04 requires "responsable" in Hoja1. The filling code at `excelRewriter.ts` lines 97-132 writes nombre, NIT, RUPS, dirección (businessNature), fecha. No explicit "responsable" field is written.
   - What's unclear: Which cell is "responsable" and whether it is in the current `TemplateWithDataOptions` interface.
   - Recommendation: Check the R414 template Hoja1 directly to identify the responsable cell. If not in the options interface, R414-04 may require a minor interface addition — scope this before planning R414-04 work.

---

## Sources

### Primary (HIGH confidence — direct code analysis)

- `app/src/lib/xbrl/__tests__/r414Pipeline.test.ts` — canonical pipeline test pattern; all 8 test cases analyzed
- `app/src/lib/xbrl/official/excelRewriter.ts` — confirmed bug locations: `isLeaf` at lines 201, 222, 246, 274, 325; IFE section at lines 1780+
- `app/src/lib/xbrl/official/templateCustomizers.ts` — BUG-02 location confirmed: IFE block lines 57-111, returns without URL substitution
- `app/src/lib/xbrl/shared/baseTemplateService.ts` — `codesWithChildren` pattern at lines 240-245; `sumServiceAccountsByPrefix` dynamic detection at lines 286-326
- `app/src/lib/xbrl/ife/IFETemplateService.ts` — `getTrimestreDates()` quarter name mapping at lines 53-89; correct pattern for BUG-02 fix
- `app/vitest.config.ts` — confirmed: `environment: 'node'`, coverage restricted to `shared/**` + `templatePaths.ts`, no test infrastructure changes needed
- `app/src/lib/xbrl/__tests__/mocks/exceljs.mock.ts` — confirmed: mock is single shared cell; pipeline tests must NOT import this
- `.planning/research/BUG_R414_DIAGNOSIS.md` — complete root cause analysis, all 6 secondary issues documented
- `.planning/research/PITFALLS.md` — test coverage gap analysis, refactoring risks
- `.planning/research/XBRL_COMPATIBILITY.md` — template file inventory, ZIP output requirements, IFE entry-point URL issue confirmed

### Secondary (HIGH confidence — project documentation)

- `.planning/research/SUMMARY.md` — executive summary of all research; Phase ordering rationale
- `.planning/REQUIREMENTS.md` — requirement definitions for TEST-01 through IFE-01
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependencies

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns established in existing tests
- Architecture (test patterns): HIGH — `r414Pipeline.test.ts` is a complete reference; IFE applies same pattern
- Bug fix approach (BUG-01): HIGH — root cause confirmed by code analysis, fix pattern verified in `baseTemplateService.ts`
- Bug fix approach (BUG-02): HIGH — bug location confirmed in `templateCustomizers.ts`; fix pattern in `IFETemplateService.ts`; one open question on whether IFE inline loops also need the fix
- Common pitfalls: HIGH — all confirmed by direct code analysis and commit history

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable codebase; no external dependencies involved)
