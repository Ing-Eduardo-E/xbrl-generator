# PITFALLS — Risk Research for XBRL Generator Refactoring

**Date**: 2026-03-21
**Scope**: R414 fix, excelRewriter.ts refactor, Grupos NIIF 1/2/3, Resolución 533, IFE preservation

---

## 1. CURRENT TEST COVERAGE

### 1.1 What Tests Exist

**Test suite location**: `app/src/lib/xbrl/__tests__/`

All 302 tests currently pass in 4 seconds (`pnpm test`).

| File | Tests | Covers |
|---|---|---|
| `baseTemplateService.test.ts` | ~30 | `sumAccountsByPrefix`, `sumServiceAccountsByPrefix`, `writeCell`, `fillInfoSheet`, `generateOutputPrefix`, `customizeXml` in `BaseTemplateService` |
| `dateUtils.test.ts` | ~20 | `getTrimestreDateRange`, `generateFiscalYearTrimesters` — all four quarters, edge cases, string/number year types |
| `excelUtils.test.ts` | ~80 | `writeCellNumber`, `writeCellText`, `writeCellByRowCol`, `readCellNumber`, `readCellText`, `applyNumberFormat`, `forEachCellInRange`, `copyCellFormat`, `worksheetExists`, `getWorksheet`, `parseNumericValue`, `formatCurrency`, `formatNumber`, `getColumnName`, `getColumnIndex` |
| `grupoRewriters.test.ts` | ~25 | `matchesPrefixes`, `sumAccountsByPrefixes` (from `shared/rewriterHelpers`), `getGrupoConfig`, `GRUPO_ER_MAPPINGS`, `GRUPO_FC01_EXPENSE_MAPPINGS` |
| `pucUtils.test.ts` | ~80 | Every export in `shared/pucUtils.ts`: PUC constants, classifiers, level detection, boolean predicates, `sumByPrefixes`, `sumServiceByPrefixes`, `calculateTotalsByClass`, `validateAccountingEquation`, `filterByClass`, `filterLeafAccounts`, `filterByPrefix`, `groupByService`, `cleanPucCode`, `isValidPucCode`, `getParentCode` |
| `r414Pipeline.test.ts` | 8 | **E2E pipeline**: loads the real R414 template file from disk, calls `rewriteFinancialDataWithExcelJS()`, verifies cell values with ExcelJS. Covers: Hoja2 P15/P16, Hoja3 L14, Hoja7 F14, numFmt format, shared formula clearing, Hoja16 E13, empty-accounts guard, service column distribution I/J/K in Hoja2 |
| `templatePaths.test.ts` | ~50 | All constants in `official/templatePaths.ts`: `TEMPLATE_PATHS`, `SHEET_MAPPING`, `SERVICE_COLUMNS`, `R414_SERVICE_COLUMNS`, `R414_ESF_MAPPINGS` (structure/content), `R414_ER_COLUMNS`, `R414_ER_MAPPINGS`, `R414_PPE_MAPPINGS`, `R414_INTANGIBLES_MAPPINGS`, `R414_EFECTIVO_MAPPINGS`, `R414_PROVISIONES_MAPPINGS`, `R414_OTRAS_PROVISIONES_MAPPINGS`, `R414_BENEFICIOS_EMPLEADOS_MAPPINGS` |
| `services/__tests__/distributionUtils.test.ts` | ~15 | `distributeLargestRemainder`, `balanceAccountingEquation` including multi-service scenarios |

**Mock infrastructure**: `__tests__/mocks/exceljs.mock.ts` — a single shared mock for `ExcelJS.Workbook`, `Worksheet`, and `Cell`. The mock is minimal: `getCell` always returns the same `mockCell` object, which means multi-cell tests must reset state manually.

**Vitest configuration** (`app/vitest.config.ts`):
- Environment: `node`
- Coverage: v8, text reporter
- Coverage `include` is restricted to `src/lib/xbrl/shared/**` and `src/lib/xbrl/official/templatePaths.ts` only
- The large implementation files (`excelRewriter.ts`, `R414TemplateService.ts`, `excelDataFiller.ts`) are excluded from coverage metrics

### 1.2 What Is NOT Covered by Tests

**Critical gaps** (ordered by risk):

1. **`excelDataFiller.ts` (1580 lines)** — Zero tests. Uses SheetJS (`xlsx`) for the old data-filling path. This is the legacy path that was found to destroy xlsx structure.

2. **`officialTemplateService.ts` entry point** — The `preserveOriginalStructure()` hybrid ZIP function has **zero dedicated tests**. The E2E tests in `r414Pipeline.test.ts` call `rewriteFinancialDataWithExcelJS` directly, bypassing `preserveOriginalStructure` entirely. This means the function that actually ships to XBRL Express is untested at the unit level.

3. **`generateOfficialTemplatePackageWithData()`** (`officialTemplateService.ts` line 135) — The full ZIP generation pipeline (loads template from filesystem, calls `preserveOriginalStructure`, builds ZIP with `.xbrlt`/`.xml`/`.xbrl`) has no tests.

4. **IFE data filling** — The IFE section of `excelRewriter.ts` (lines 1780–2458) has no dedicated tests. The E2E test in `r414Pipeline.test.ts` only covers `niifGroup: 'r414'`.

5. **`R414TemplateService.fillESFSheet()` / `fillERSheet()`** — These methods exist and are tested indirectly via `r414Pipeline.test.ts` (which calls `rewriteFinancialDataWithExcelJS`), but that function has its own copy of the logic. The `R414TemplateService.fillExcelData()` path (used by `BaseTemplateService.generateTemplatePackage()`) is never exercised by tests.

6. **FC01 sheets (Hoja16/17/18/22)** — The `r414Pipeline.test.ts` test at line 198 only verifies `typeof e13 === 'number'`; it does not verify the actual computed value.

7. **Hoja32/35 cross-sheet dependency** — Hoja32 reads values already written to Hoja2 column P, then distributes them. No test verifies this chained data flow.

8. **`grupoFcRewriter.ts` (370 lines) and `grupoEsfErRewriter.ts` (135 lines)** — Only helper functions (`matchesPrefixes`, `sumAccountsByPrefixes`) are tested; the sheet-filling functions themselves have no tests.

9. **`templateCustomizers.ts`** — `customizeXbrlt` and `customizeXml` have no tests.

10. **`r414/mappings/fc01Mappings.ts`** — The `R414_FC01_GASTOS_MAPPINGS`, `R414_FC01_DATA_ROWS`, `R414_FC01_ZERO_F_ROWS` constants have no tests verifying structure or completeness.

11. **`safeNumericValue()`** utility (used in `excelUtils.ts`) — No dedicated tests for the ExcelJS formula-object case (`{formula, result}`), only `parseNumericValue` is tested.

### 1.3 Do Any Tests Verify R414 Fills Data Correctly?

**Yes, partially.** `r414Pipeline.test.ts` runs against the real template file (`public/templates/r414/R414Ind_ID20037_2024-12-31.xlsx`) and verifies:

- `Hoja2!P15 = 100000000` (Efectivo y equivalentes, PUC 11 excl 1132)
- `Hoja2!P16 = 5000000` (Efectivo restringido, PUC 1132)
- `Hoja3!L14` is a non-zero number (Ingresos ordinarios)
- `Hoja7!F14 = 250000000` (Terrenos, PUC 1605)
- `Hoja2!P15` cell has `numFmt = '#,##0;(#,##0)'`
- `Hoja2!P15` cell has no shared formula
- `Hoja16!E13` is a number (Beneficios empleados Acueducto)
- `Hoja2!I15 = 40000000`, `J15 = 35000000`, `K15 = 25000000` (service columns)

**What these tests do NOT cover**:
- Hojas 9, 10 (notes and policies)
- Hojas 22, 23 (FC01 consolidated, FC02 income)
- Hojas 24, 25, 26 (FC03 CXC by stratum)
- Hojas 30, 32, 35 (subsidies, liabilities, reconciliation)
- Values in Hoja3 service columns (E/F/G)
- The full set of ESF rows (only row 15 and 16 are verified)
- Negative value handling (pasivos have negative signs in mock data)

### 1.4 Do Any Tests Verify IFE Generates Valid Output?

**No.** There are zero IFE-specific tests. The IFE section occupies lines 1780–2458 of `excelRewriter.ts` (approximately 680 lines) and is entirely untested. Date utilities (`dateUtils.test.ts`) confirm IFE trimester ranges work correctly, and `templatePaths.test.ts` confirms IFE template paths and sheet mappings are configured, but **no test exercises the actual IFE data-writing code path**.

---

## 2. REFACTORING RISKS

### 2.1 What Could Break When Refactoring `excelRewriter.ts` (2463 lines → smaller files)?

**File**: `app/src/lib/xbrl/official/excelRewriter.ts`

#### Risk A: Closure-scoped helpers duplicated across sections

The function `matchesPrefixes` is defined as a local arrow function at line 171 inside `rewriteFinancialDataWithExcelJS`. It is used by every section (R414, Grupos, IFE). If extracted to a module, the signature must match `shared/rewriterHelpers.ts`'s `matchesPrefixes` exactly — but the local version has a different signature (`(code, prefixes, excludes?) => boolean`) from the shared one. Both exist and must be kept in sync.

**Risk**: If the extracted module uses a different `matchesPrefixes` behavior (e.g., changes how `excludes` interacts with `prefixes`), every PUC sum will silently produce wrong values.

#### Risk B: `writeCellSafe` is local to `excelRewriter.ts`

`writeCellSafe` (lines 38–63) is a local function not exported from any module. `BaseTemplateService.writeCell()` contains equivalent logic but is a class method. If `excelRewriter.ts` is split into multiple rewriter files, each extracted file either:
- Must import a shared `writeCellSafe` utility
- Or duplicate the function

The `numFmt` format string `'#,##0;(#,##0)'` must remain identical across all usages — XBRL Express validates this format.

#### Risk C: `accountsByService` pre-computation scoped to main function

The `accountsByService` record (line 165) is populated once and shared across all 10+ sheet-filling sections. If sections are extracted to separate functions, this map must be passed as a parameter — it cannot be recomputed from scratch per-section without O(n) performance impact per sheet.

#### Risk D: IFE section depends on `activeServices` and `accountsByService` from outer scope

The IFE block (lines 1780–2458) references both `activeServices` and `accountsByService` from the outer function scope. It also calls `safeNumericValue()` from `excelUtils.ts`. Any extraction must pass all dependencies explicitly.

#### Risk E: Hoja32/35 reads back values written by earlier sections

`Hoja32` (line 1612) reads values from `Hoja2` column P using `getValorHoja2()`. `Hoja35` (line 1721) reads values from `Hoja3` column E/F/G. These cross-sheet reads work only if Hoja2/Hoja3 have already been written in the same `workbook` instance. If extraction moves these sections to separate functions called with different workbook instances, the reads will return zero or formula objects, silently producing wrong data.

**Mitigation**: All rewriter sub-functions must receive the same `ExcelJS.Workbook` instance as a parameter, never create their own.

#### Risk F: `console.log` debug output

There are approximately 200+ `console.log` calls scattered throughout `excelRewriter.ts`. These are not harmful but cause noise in CI output. Refactoring is an opportunity to remove them, but doing so in the same PR as a structural split increases the diff size and review burden.

#### Risk G: R414TemplateService and excelRewriter contain parallel implementations

`R414TemplateService.fillESFSheet()` (line 146 in `R414TemplateService.ts`) and `rewriteFinancialDataWithExcelJS` (lines 189–233 in `excelRewriter.ts`) contain nearly identical ESF-filling logic. The key difference:
- `R414TemplateService` uses `this.writeCell()` (from `BaseTemplateService`) — does NOT clear shared formulas
- `excelRewriter.ts` uses local `writeCellSafe()` — DOES clear shared formulas

This is the root cause of the R414 empty Excel issue (see Section 5.1). **Do not merge these paths without ensuring `writeCellSafe` semantics are preserved**.

### 2.2 What Could Break When Splitting `R414TemplateService.ts` (1891 lines)?

**File**: `app/src/lib/xbrl/r414/R414TemplateService.ts`

#### Risk A: `fillExcelData` override chain

`R414TemplateService.fillExcelData()` (line 1736) calls `super.fillExcelData()` then adds Hoja7, Hoja9, Hoja10, FC01 sheets. If `fillExcelData` is split into modules, the `super.fillExcelData()` call ordering must be preserved exactly — especially that Hoja1/2/3 are filled before Hoja7 (Hoja7 references PPE accounts from Hoja2), and Hoja9/Hoja10 are filled after all data hojas.

#### Risk B: `fillHoja16/17/18` use local `sumByPrefixesXX` helpers

Each FC01 sheet method defines its own `sumByPrefixesN` closure (e.g., `sumByPrefixes16`, `sumByPrefixes17`, `sumByPrefixes18`). These are identical functions wrapping `safeNumericValue` calls. If extracted to a shared helper, the dependency on `safeNumericValue` from `excelUtils.ts` must be explicit.

#### Risk C: The singleton `r414TemplateService` export

`excelRewriter.ts` line 26 imports `r414TemplateService` singleton from `R414TemplateService.ts` and calls `r414TemplateService.fillHoja9Sheet()` and `fillHoja10Sheet()` at lines 1758–1765. This creates a bidirectional dependency: `excelRewriter.ts` imports from `R414TemplateService.ts`, and any split of `R414TemplateService.ts` must preserve this singleton export.

#### Risk D: `R414_FC01_ZERO_F_ROWS` silently controls which cells get zeroed

The constant `R414_FC01_ZERO_F_ROWS` in `r414/mappings/fc01Mappings.ts` defines rows where column F must be explicitly zeroed to prevent shared formula contamination. If a refactoring changes how FC01 sheets are filled and omits this zero-clearing step, XBRL Express will see phantom formula results.

### 2.3 How to Ensure IFE Still Works After Refactoring `shared/` Modules?

The `shared/` directory (`baseTemplateService.ts`, `excelUtils.ts`, `pucUtils.ts`, `rewriterHelpers.ts`, `dateUtils.ts`) is **well-tested** for its pure functions. The risk is not in the functions themselves but in:

1. **Export contract changes**: If any function signature in `shared/` changes (parameter order, return type), all callers including IFE must be updated. TypeScript catches this — but only if the project compiles (`pnpm build` or `pnpm type-check`).

2. **`excelUtils.ts` additions**: New utilities added during refactoring must not override existing behavior. `writeCellNumber` guards against `null`/`undefined` by doing nothing — this behavior is tested and relied upon by IFE's zero-filling pattern.

3. **`rewriterHelpers.ts`**: `matchesPrefixes` and `sumAccountsByPrefixes` are used by both Grupos and IFE. Any change to exclude-prefix logic will affect both.

**Mitigation**: Run `pnpm test` and `pnpm type-check` after every change to `shared/`. The test suite currently finishes in 4 seconds — it should be run on every save.

### 2.4 Apache POI / XBRL Express Compatibility Pitfalls

These are documented in `officialTemplateService.ts` comments and commit messages:

1. **SharedStrings.xml destruction (SheetJS)**: SheetJS (`xlsx` library) reduces `sharedStrings.xml` and `styles.xml` to minimal stubs when writing. Apache POI (used by XBRL Express) cannot resolve cell values without the original shared strings. **Never use SheetJS to write the output xlsx**. Use ExcelJS only. File: `excelDataFiller.ts` still imports SheetJS — it should not be used in the output path.

2. **Phantom theme references (ExcelJS)**: ExcelJS always adds `xl/theme/theme1.xml` to the output ZIP and adds `theme="N"` attributes to color definitions in `styles.xml`. If the template does not have a theme file (most SSPD templates don't), Apache POI fails to resolve these references and displays all cells as empty. **Solution**: `preserveOriginalStructure()` strips theme attributes from `styles.xml` when `originalHasTheme === false`. **Do not break this function.**

3. **Shared formula contamination**: R414 templates contain shared formulas (Excel's space-saving mechanism where one formula cell is the "master" and others are "slaves"). When ExcelJS writes a value to a slave cell, it sometimes leaves the `sharedFormula` property intact in the cell model, causing POI to try to resolve the master formula cell, which may not exist. **Solution**: `writeCellSafe()` deletes both `model.sharedFormula` and `model.formula` before writing. This is the critical fix from commit `b123cfb`.

4. **`workbook.xml` rId renumbering**: ExcelJS renumbers all relationship IDs in `xl/_rels/workbook.xml.rels` and modifies `xl/workbook.xml`. POI is sensitive to `rId` mismatches. **Solution**: `preserveOriginalStructure()` always takes `workbook.xml`, `workbook.xml.rels`, `[Content_Types].xml`, `_rels/.rels`, `docProps/app.xml`, and `docProps/core.xml` from the original template. Any refactoring must preserve this set of structural files.

5. **`numFmt` requirement**: XBRL Express validates that numeric cells have the format string `'#,##0;(#,##0)'`. Cells without this format are rejected as non-xs:decimal. `writeCellSafe()` applies this unconditionally for numbers. `writeCellNumber()` in `excelUtils.ts` does NOT apply `numFmt` — never use it for cells that go to XBRL Express.

6. **Zero vs blank**: Some XBRL concepts require explicit zero values (not blank cells). In `excelRewriter.ts`, the ER sheet writes zero unconditionally (`// SIEMPRE escribir el valor, incluso si es 0` — line 253). The ESF sheet only writes non-zero values (`if (totalValue !== 0)` — line 208). This difference is intentional: ER requires complete rows for XBRL validation, ESF does not. Any refactoring must preserve this distinction.

---

## 3. TESTING STRATEGY

### 3.1 Tests Needed BEFORE Refactoring (Regression Safety Net)

**Priority 1 — Must have before any structural change:**

**Test: `preserveOriginalStructure` unit test**
```
File: app/src/lib/xbrl/__tests__/preserveOriginalStructure.test.ts
What: Load a real template buffer, load a minimal ExcelJS-generated buffer,
      call preserveOriginalStructure(), verify:
      - xl/workbook.xml comes from original (not ExcelJS)
      - xl/worksheets/sheet1.xml comes from ExcelJS
      - styles.xml has no theme="N" attributes when original has no theme
      - Output ZIP is valid (can be loaded back by ExcelJS)
Why: This function is the last line of defense before the file reaches XBRL Express.
     It has no tests and handles 3 separate edge cases.
```

**Test: `generateOfficialTemplatePackageWithData` integration test**
```
File: app/src/lib/xbrl/__tests__/templatePackage.test.ts
What: Call generateOfficialTemplatePackageWithData() with mock R414 data,
      verify the output ZIP contains correctly named files:
      - {prefix}.xlsx, {prefix}.xbrlt, {prefix}.xml, {prefix}.xbrl
      Verify the xlsx within the ZIP can be loaded by ExcelJS
Why: The complete pipeline (load + rewrite + preserveStructure + zip) is untested.
```

**Test: IFE E2E smoke test**
```
File: app/src/lib/xbrl/__tests__/ifePipeline.test.ts
What: Call rewriteFinancialDataWithExcelJS() with niifGroup: 'ife',
      a real IFE template buffer, and representative mock data.
      Verify: Hoja1!E15 (company name), Hoja3!I15 (ESF acueducto),
              Hoja4!E14 (ER ingresos acueducto), Hoja7!F14 (ingresos),
              No shared formula contamination in any written cell.
Why: 680 lines of IFE code are completely untested. Any refactoring that
     touches excelRewriter.ts could silently break IFE.
```

**Priority 2 — Before splitting R414TemplateService.ts:**

**Test: `R414TemplateService.fillExcelData` full pipeline**
```
What: Instantiate R414TemplateService, call fillExcelData with mock workbook
      (the ExcelJS mock), verify all expected sheets are filled:
      Hoja1 (writeCell calls), Hoja2 (ESF mappings), Hoja3 (ER mappings),
      Hoja7 (PPE), Hoja9 (57 notes), Hoja10 (33 policies), Hoja16/17/18 (FC01)
Why: The fillExcelData override chain (line 1736) is not exercised by any test.
     Without this, splitting the class risks breaking sheet ordering.
```

**Test: FC01 gastos mapping completeness**
```
What: For each of Hoja16/17/18/22, verify that the PUC prefixes in
      R414_FC01_GASTOS_MAPPINGS cover the known expense categories without gaps.
      Smoke test: given an account with PUC 5101, verify it ends up in E13.
Why: fc01Mappings.ts has 241 lines of mapping constants with zero tests.
```

### 3.2 Tests Needed to Verify R414 Data Filling Works

The existing `r414Pipeline.test.ts` is a good foundation but has specific gaps:

1. **Add ESF row coverage**: Currently only rows 15 and 16 are verified. Add assertions for representative rows across all sections: activos corrientes (rows 15–40), activos no corrientes (rows 45–60), pasivos corrientes (rows 65–85), pasivos no corrientes (rows 90–110), patrimonio (rows 115–130).

2. **Verify sign conventions**: Pasivos and patrimonio have negative values in the PUC convention. Add a test account with PUC `210401` (value `-80000000`) and verify it appears as a positive number in the correct ESF row. XBRL Express expects absolute values for liability concepts.

3. **Verify ER service columns**: Add assertions for `Hoja3!E14`, `F14`, `G14` (ingresos by service). Currently only `L14` (total) is verified.

4. **Verify Hoja16/17/18 actual values**: The current test only checks `typeof e13 === 'number'`. Add a test that computes expected values (e.g., `5101 * 0.40 = 18000000`) and asserts equality.

5. **Verify empty cell behaviour**: The `if (totalValue !== 0)` guard on ESF means cells for accounts not in the mock data are NOT written. Add a test that verifies cells for PUC prefixes not present in mock data remain as formula/null (not zeroed out).

### 3.3 How to Test Without Running XBRL Express Desktop App

XBRL Express is a Java/POI desktop application that cannot be automated. The test strategy is:

1. **Unit tests with ExcelJS**: Read the output buffer back into ExcelJS and assert cell values. This verifies data correctness but not POI compatibility.

2. **Structural ZIP inspection**: After generating the output, use JSZip to inspect the internal XML files:
   - `xl/workbook.xml` must be from the original template (verify by checking a known attribute)
   - `xl/styles.xml` must not contain `theme="` (for no-theme templates)
   - `xl/worksheets/sheet2.xml` must contain `<v>100000000</v>` (or similar) for written values
   - No `<f t="shared"` elements should remain in written cells

3. **Apache POI validation script**: A separate Node.js/Java script can load the output with Apache POI (via Java child process or the `java` npm package) and verify it can read cell values. This is expensive but catches POI-specific issues.

4. **Golden file comparison**: Generate the output once with known-good inputs, save as a golden file, and compare XML content on subsequent runs. Detects unintended structural changes.

### 3.4 Integration vs Unit Testing Approach

**Use unit tests for:**
- All pure functions (`pucUtils`, `excelUtils`, `rewriterHelpers`, `dateUtils`)
- Mapping constant structure and completeness (`templatePaths`, `fc01Mappings`, etc.)
- `BaseTemplateService` protected methods via the `TestService` pattern already established
- Individual sheet-filling methods (mock the worksheet, assert `writeCell` calls)

**Use integration tests (real template on disk) for:**
- End-to-end pipeline: `rewriteFinancialDataWithExcelJS` with real template
- `preserveOriginalStructure` with real buffers (structure verification, not value verification)
- `generateOfficialTemplatePackageWithData` ZIP output shape

**Avoid:**
- Tests that require XBRL Express to be running
- Tests that write to the filesystem (use `Buffer` in-memory throughout)
- Tests that depend on exact cell addresses without documenting the business reason (R414 cell addresses are in the taxonomy spec — document which XBRL concept maps to which cell)

---

## 4. MIGRATION SAFETY PROTOCOL

### 4.1 Safe Order to Refactor Without Breaking IFE

```
Phase 0: Add missing tests (Section 3.1) — do NOT change any source code
Phase 1: Fix R414 empty Excel bug (R414TemplateService path)
Phase 2: Extract shared utilities from excelRewriter.ts (no logic changes)
Phase 3: Split excelRewriter.ts into rewriter modules (move blocks, no logic changes)
Phase 4: Split R414TemplateService.ts (move methods, no logic changes)
Phase 5: Implement Grupos NIIF 1/2/3 annual taxonomies
Phase 6: Implement Resolución 533
```

**Never touch IFE code until Phases 0–2 are complete and tests pass.** IFE is the only currently shipping feature that works end-to-end with XBRL Express.

### 4.2 Checkpoints to Validate IFE Still Works

After every phase:

1. `pnpm test` must pass (302+ tests, 0 failures)
2. `pnpm type-check` must pass (0 TypeScript errors)
3. **Manual smoke test** (until IFE E2E test exists): generate an IFE package for a known test company, load the xlsx in Excel, verify the cells that XBRL Express reads are populated

After Phase 3 (splitting `excelRewriter.ts`):
4. The IFE block (lines 1780–2458) must not have been reordered or had its outer `if (options.niifGroup === 'ife')` guard removed
5. `writeCellSafe` must still be used for all IFE cell writes (not `writeCellNumber` or `cell.value =` directly)
6. The `accountsByService` map must be passed through to the IFE block correctly

### 4.3 How to Test the R414 Fix Before Full Refactoring

The existing `r414Pipeline.test.ts` already tests `rewriteFinancialDataWithExcelJS` (the new path). The bug is that `R414TemplateService.generateTemplatePackage()` calls `fillExcelData()` which uses `writeCell()` instead of `writeCellSafe()`.

**Safe test-first approach:**

1. Create `r414TemplateServicePipeline.test.ts` that calls `r414TemplateService.generateTemplatePackage()` with mock data and verifies the output xlsx has data in Hoja2!P15 (not formula, not null).
2. This test will **fail** — it will expose that `fillExcelData()` path produces empty cells.
3. Fix `fillExcelData()` to use `writeCellSafe()` semantics (or route through `rewriteFinancialDataWithExcelJS`).
4. Test passes. The fix is confirmed.

Do not proceed to structural refactoring until this test passes.

---

## 5. KNOWN PITFALLS FROM CODE

### 5.1 The `preserveOriginalStructure()` Hybrid ZIP Approach — Fragility Analysis

**Location**: `app/src/lib/xbrl/officialTemplateService.ts`, lines 30–107

**What it does**: Takes the original template ZIP and an ExcelJS-generated ZIP, produces a hybrid ZIP where:
- Structural files come from original: `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `[Content_Types].xml`, `_rels/.rels`, `docProps/app.xml`, `docProps/core.xml`
- Data files come from ExcelJS: `xl/worksheets/sheet*.xml`, `xl/sharedStrings.xml`, `xl/styles.xml`
- Theme files from ExcelJS are conditionally excluded based on whether the original had a theme

**Fragility points:**

1. **Worksheet rId mismatch**: `workbook.xml` references sheets by `rId` (e.g., `r:id="rId2"`). The `workbook.xml.rels` file maps these IDs to actual files (e.g., `xl/worksheets/sheet2.xml`). If ExcelJS changes the sheet file naming (e.g., renumbers sheets), the original `workbook.xml.rels` will point to wrong files. Currently ExcelJS preserves filenames when loading an existing workbook, but this is not guaranteed across ExcelJS versions.

2. **New sheets added by ExcelJS**: If a refactoring causes ExcelJS to add a new worksheet (e.g., as a side effect of `addWorksheet()` being called), `workbook.xml.rels` from the original will not reference it. The sheet exists in the ZIP but XBRL Express cannot see it.

3. **styles.xml misalignment**: `styles.xml` comes from ExcelJS. `sharedStrings.xml` also comes from ExcelJS. These must be consistent with each other. If ExcelJS adds a new style (due to `numFmt` application), the `styles.xml` index must match what the worksheet XMLs reference. This is normally correct but could break if ExcelJS changes its style-indexing behavior across versions.

4. **Theme detection by filename only**: The check `originalZip.file('xl/theme/theme1.xml') !== null` is fragile — templates could have `theme2.xml` or use a different path. Currently all known SSPD templates either have `theme1.xml` or no theme at all.

5. **JSZip version differences**: The hybrid ZIP is generated with `compression: 'DEFLATE', level: 6`. Apache POI can read DEFLATE-compressed XLSXs. However, if the template was originally stored uncompressed (some SSPD templates are), and POI is sensitive to mixed compression modes, this could cause issues.

**What breaks it:**
- Upgrading ExcelJS to a version that changes how `workbook.xml.rels` entries are named
- Adding a call to `workbook.addWorksheet()` in any sheet-filling code
- Changing the `structuralFiles` set to include `xl/styles.xml` (would lose ExcelJS-applied numFmt)
- Any code that modifies `workbook.xml` directly (not via ExcelJS API)

### 5.2 The `writeCellSafe()` Pattern — Edge Cases That Can Fail

**Location**: `app/src/lib/xbrl/official/excelRewriter.ts`, lines 38–63

```typescript
function writeCellSafe(worksheet, cellAddress, value) {
  const cell = worksheet.getCell(cellAddress);
  const model = cell as any;
  if (model.model) {
    delete model.model.sharedFormula;
    delete model.model.formula;
  }
  cell.value = null;
  if (value !== null && value !== undefined) {
    cell.value = value;
    if (typeof value === 'number') {
      cell.numFmt = '#,##0;(#,##0)';
    }
  }
}
```

**Edge cases that can fail:**

1. **`cell.value = null` before write**: ExcelJS may not fully clear a shared formula when the cell is just assigned `null`. The `delete model.model.sharedFormula` pattern accesses the internal `model` property which is not part of the ExcelJS public API. If a future ExcelJS version changes the internal model structure (e.g., using a `_model` property or a Symbol key), this deletion will silently fail, leaving the shared formula intact.

2. **Merged cell writes**: If `cellAddress` is part of a merged range, `worksheet.getCell()` returns the top-left cell of the merge. Writing to a non-top-left cell in the merge may throw or silently fail depending on ExcelJS version. XBRL Express templates may have merged cells in annotation rows.

3. **Undefined cell**: If `cellAddress` is outside the sheet's defined range, ExcelJS creates a new cell. This is correct behavior for adding data. However, if the sheet has explicit column width definitions but the cell has never been accessed, the write may not trigger a column width update, causing display issues (not a data issue).

4. **Formula result objects**: When ExcelJS loads a template with calculated formulas, the cell value may be `{ formula: 'SUM(A1:A10)', result: 12345 }`. Setting `cell.value = null` does clear this. But `safeNumericValue()` in `excelUtils.ts` is the correct way to read such values — never use `cell.value as number` directly on a cell that may have been written by someone else.

5. **The `value !== null && value !== undefined` guard**: The guard means passing `0` (zero) IS written, which is correct. But the check does not guard against `NaN` or `Infinity`. If a PUC sum produces `NaN` (e.g., due to a non-numeric account value), `writeCellSafe` will write `NaN` to the cell, which XBRL Express will reject as non-xs:decimal. Use `safeNumericValue()` on all account values before summing.

6. **String values and numFmt**: Passing a string skips the `numFmt` assignment. This is correct for text cells (company name, dates). However, if a caller passes a stringified number (e.g., `'1000000'`), the cell will not have `numFmt` applied and XBRL Express may reject it.

### 5.3 ExcelJS vs Apache POI Compatibility Issues — Documented Cases

From commit history and code comments:

1. **`xl/theme/theme1.xml` phantom reference** (commits `5a5965c`, `9843253`): ExcelJS always writes a `<Relationship Type="...theme" Target="theme/theme1.xml"/>` in `workbook.xml.rels` and adds the theme file. POI validates these relationships. If the relationship exists but the file does not, POI throws a `PartNotFoundException`. Solution: `preserveOriginalStructure` uses original `workbook.xml.rels` (which has no theme relationship) and excludes the theme file from ExcelJS output.

2. **`Cannot convert string 0[object Object] to xs:decimal`** (commit `9a2edde`): ExcelJS's `cell.value` for a formula cell returns a formula-object, not a number. The original code used `cell.value as number || 0`, which evaluates the formula-object as truthy, then the `|| 0` never triggers, giving `[object Object]`. Fix: `safeNumericValue(cell)` from `excelUtils.ts` handles this by checking `typeof value === 'object' && 'result' in value`.

3. **SharedFormula "master must exist" error**: When ExcelJS writes a buffer with a shared formula slave cell that references a deleted or overwritten master cell, POI throws `Shared Formula master must exist`. Fix: `writeCellSafe` deletes both `formula` and `sharedFormula` from the cell model before writing.

4. **`styles.xml` color theme attributes**: ExcelJS applies `theme="N"` attributes to `<color>` elements in `styles.xml`. When POI tries to resolve these against a non-existent theme XML, it may fall back to default colors or throw. In practice, this causes some cells to display with wrong colors in XBRL Express, which may then fail validation. Fix: `preserveOriginalStructure` strips all `theme="N"` attributes from `styles.xml` when the original template has no theme file.

5. **`workbookPr` attributes**: ExcelJS modifies `workbook.xml`'s `<workbookPr>` element, sometimes adding `date1904="0"` or changing `defaultThemeVersion`. POI is sensitive to `date1904` — if it differs from the original, all date serial numbers are interpreted differently. Fix: `preserveOriginalStructure` uses original `workbook.xml`.

6. **ExcelJS `xlsx.writeBuffer()` vs `xlsx.write()`**: `writeBuffer()` returns a `Buffer | ArrayBuffer`. The type cast `Buffer.from(outputBuffer)` at the end of `rewriteFinancialDataWithExcelJS` is necessary because the TypeScript definition declares `ArrayBuffer | Buffer<ArrayBufferLike>`, but the actual runtime type depends on the Node.js version. This is handled in the current code but must be preserved in any refactoring.

---

## 6. SUMMARY TABLE

| Risk | Severity | Tested? | Mitigation |
|---|---|---|---|
| `preserveOriginalStructure` untested | CRITICAL | No | Add test before any refactoring |
| IFE pipeline untested | HIGH | No | Add IFE smoke test before refactoring |
| `writeCellSafe` not in shared module | HIGH | Partially | Add to `shared/excelUtils.ts`, update all callers |
| `excelDataFiller.ts` uses SheetJS | HIGH | No | Do not use in output path; already bypassed in main flow |
| Two parallel ESF-filling implementations | HIGH | Partial | Fix `R414TemplateService` to use `writeCellSafe` |
| `accountsByService` scope loss during extraction | MEDIUM | N/A | Pass as explicit parameter to sub-functions |
| Cross-sheet reads (Hoja32←Hoja2) | MEDIUM | No | Tests for cross-sheet dependencies needed |
| `matchesPrefixes` signature mismatch | MEDIUM | No | Unify to single implementation in `rewriterHelpers.ts` |
| ExcelJS `workbook.xml.rels` rId changes | MEDIUM | No | Golden file test for ZIP structure |
| `fc01Mappings.ts` constants untested | LOW | No | Add structure tests before splitting |
| `console.log` noise | LOW | N/A | Clean up in same PR as logic changes |

---

## 7. FILE REFERENCE INDEX

| File | Lines | Risk Level | Test Coverage |
|---|---|---|---|
| `app/src/lib/xbrl/officialTemplateService.ts` | ~220 | CRITICAL | None |
| `app/src/lib/xbrl/official/excelRewriter.ts` | 2463 | HIGH | 8 E2E tests (partial coverage) |
| `app/src/lib/xbrl/official/excelDataFiller.ts` | 1580 | HIGH | None |
| `app/src/lib/xbrl/r414/R414TemplateService.ts` | 1891 | HIGH | None |
| `app/src/lib/xbrl/r414/mappings/fc01Mappings.ts` | 241 | MEDIUM | None |
| `app/src/lib/xbrl/official/templateCustomizers.ts` | 283 | MEDIUM | None |
| `app/src/lib/xbrl/grupos/grupoFcRewriter.ts` | 370 | MEDIUM | None |
| `app/src/lib/xbrl/grupos/grupoEsfErRewriter.ts` | 135 | MEDIUM | None |
| `app/src/lib/xbrl/shared/baseTemplateService.ts` | 537 | LOW | Good (via TestService subclass) |
| `app/src/lib/xbrl/shared/excelUtils.ts` | 212 | LOW | Comprehensive |
| `app/src/lib/xbrl/shared/pucUtils.ts` | 339 | LOW | Comprehensive |
| `app/src/lib/xbrl/shared/rewriterHelpers.ts` | 235 | LOW | Good |
| `app/src/lib/xbrl/shared/dateUtils.ts` | 73 | LOW | Comprehensive |
