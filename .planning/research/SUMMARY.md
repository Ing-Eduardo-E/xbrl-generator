# Project Research Summary

**Project:** XBRL Generator — R414 Fix, Refactoring, and Taxonomy Completion
**Domain:** XBRL taxonomy generation for Colombian public utilities (SSPD reporting)
**Researched:** 2026-03-21
**Confidence:** HIGH

---

## Executive Summary

The codebase is a production Next.js/tRPC application that generates XBRL packages for SSPD regulatory reporting. It has two distinct working paths: IFE (quarterly, end-to-end validated with XBRL Express) and R414 (annual, reporting empty data despite code that appears to execute). Research has identified the R414 empty-data bug's most probable cause as the `isLeaf` flag discrepancy — `excelRewriter.ts` trusts the stored DB flag while `BaseTemplateService` computes leaf status dynamically. If all accounts have `isLeaf = false` in the session used for testing, every PUC sum produces zero and `writeCellSafe()` skips them silently. The architectural root is that `excelRewriter.ts` is a 2,463-line monolith containing inline R414 logic that duplicates `R414TemplateService`, and there is no IFE test that would catch collateral damage during refactoring.

The safe path to a working, maintainable codebase has a strict ordering requirement: first add missing safety-net tests, then fix the R414 bug with a confirmed test, then refactor. Any refactoring that touches `excelRewriter.ts` before an IFE pipeline test exists is gambling with the only confirmed-working XBRL output path. Grupos 1/2/3 are approximately 70-75% implemented — template files exist, the data-writing dispatch chain is complete, but Hoja1 cell addresses for the grupo templates have not been verified, and no end-to-end XBRL Express validation has been done. Resolución 533 is explicitly out of scope: no templates exist, it requires a different PUC chart entirely (Marco Normativo para Entidades de Gobierno), and the user base is municipal government entities rather than private ESP companies.

The critical constraint throughout all work is `preserveOriginalStructure()` — the hybrid ZIP function that stitches original template structural files with ExcelJS-generated worksheet content. This function has no unit tests and is the single point of failure for XBRL Express compatibility. Breaking it silently produces a ZIP that opens in Excel but fails POI validation inside XBRL Express. All roadmap phases must treat this function as untouchable until it has dedicated tests.

---

## Key Findings

### Current Stack (No Changes Needed)

The stack is already established and correct for this domain. No technology changes are recommended.

**Core technologies:**
- **Next.js 15.5.9 + tRPC**: Type-safe API layer — already deployed, CVEs patched as of 2026-03-21
- **ExcelJS (not SheetJS)**: Excel writing — critical requirement; SheetJS destroys `sharedStrings.xml` and `styles.xml`, breaking XBRL Express
- **JSZip**: ZIP assembly in `preserveOriginalStructure()` — the hybrid ZIP approach is the only known way to produce XBRL Express-compatible output
- **Vitest**: Test framework — 302 tests currently passing in 4 seconds; test coverage intentionally excludes large implementation files

**Critical version constraint**: ExcelJS must not be upgraded without regression-testing against `preserveOriginalStructure()`. The `workbook.xlsx.rels` entry naming and internal model structure (`model.sharedFormula`) are not guaranteed stable across versions.

### Features: What Works, What Needs Fixing, What Is Out of Scope

**Working (confirmed end-to-end with XBRL Express):**
- IFE Trimestral (1T-4T) — 8 sheets, quarterly, company metadata + ESF + ER + CxC aging
- R414 template loading, XBRLT/XML customization, ZIP packaging (structure is correct)
- Distribution algorithm: proportional per-service account distribution
- `preserveOriginalStructure()`: hybrid ZIP that survives Apache POI validation

**Needs fixing (code runs but output is wrong):**
- R414 data filling: cells compute as zero because `isLeaf` flag may not match dynamic leaf detection
- IFE non-Q2 trimestres: `templateCustomizers.ts` does not update the entry-point XSD URL for Q1/Q3/Q4 (only `IFETemplateService.ts` does this correctly; the official flow path has the bug)
- Grupos 1/2/3 Hoja1 cell addresses: hardcoded to R414 addresses, unverified against actual grupo templates

**In scope, implementation ~70-75% done:**
- Grupo 1 (NIIF Plenas): template files present, rewriting code complete, Hoja1 + E2E test missing
- Grupo 2 (NIIF PYMES): template files present, rewriting code complete, Directo/Indirecto mismatch between template filename and `taxonomyConfig.ts` default
- Grupo 3 (Microempresas): simplest structure, template files present, rewriting code complete, closest to done

**Out of scope (confirmed):**
- Resolución 533: no template files, different PUC chart, different user base, requires budget execution statements the UI does not support; estimated 60-80h separate project

### Architecture Approach

The architecture uses a single entry point (`officialTemplateService.ts`) that delegates to `excelRewriter.ts` (the critical hub), which should be a thin dispatcher routing to taxonomy-specific rewriters. Currently the dispatcher contains 2,463 lines of inline logic for R414 and IFE, making it effectively `r414PlusIfe_rewriter.ts` mislabeled as `official/`. The proposed target is a dispatcher-only `excelRewriter.ts` (~100 lines) with all taxonomy logic living in `r414/`, `ife/`, and `grupos/` modules.

**Major components:**

1. **`officialTemplateService.ts`** — ZIP orchestrator: loads template files, calls `rewriteFinancialDataWithExcelJS`, calls `preserveOriginalStructure`, builds final ZIP with 4 required files (`.xbrlt`, `.xml`, `.xlsx`, `.xbrl`)
2. **`official/excelRewriter.ts`** — dispatcher: currently a 2,463-line monolith; target state is ~100 lines routing by `niifGroup`
3. **`r414/`** — all R414-specific logic (mappings, rewriters, `R414TemplateService`); currently partially in `excelRewriter.ts` (wrong location)
4. **`ife/`** — all IFE logic (`IFETemplateService`); partly in `excelRewriter.ts` (wrong location)
5. **`grupos/`** — all Grupo 1/2/3 logic; already correctly located (~713 lines, properly separated)
6. **`shared/`** — `BaseTemplateService`, `excelUtils`, `pucUtils`, `rewriterHelpers`, `dateUtils`; well-tested, stable
7. **`preserveOriginalStructure()`** — hybrid ZIP function in `officialTemplateService.ts`; must move to `shared/zipBuilder.ts` eventually; has zero unit tests currently

### Critical Pitfalls

1. **`isLeaf` flag vs dynamic leaf detection**: `excelRewriter.ts` inline R414 code uses `if (!account.isLeaf) continue` (trusts DB flag), while `BaseTemplateService.sumAccountsByPrefix()` computes leaf status dynamically. If the uploaded balance has pre-aggregated accounts where parents are also marked as leaf entries, the DB flag may be wrong for some accounts. This silently produces zero sums. **Fix**: pre-compute a `codesWithChildren` set in the R414 inline code, same pattern as `baseTemplateService.ts` line 241-245.

2. **`writeCellSafe` semantics must be preserved everywhere**: `writeCellSafe()` deletes `model.sharedFormula` and `model.formula` before writing, then applies `numFmt = '#,##0;(#,##0)'` for numbers. `writeCellNumber()` in `excelUtils.ts` does NOT do this. Using the wrong writer produces cells that XBRL Express rejects as non-xs:decimal or that exhibit phantom shared formula contamination. Never use `cell.value =` directly or `writeCellNumber()` for cells that feed XBRL Express.

3. **`preserveOriginalStructure()` is fragile and untested**: Takes structural files from the original template ZIP and data files from ExcelJS. Any code that calls `workbook.addWorksheet()`, upgrades ExcelJS, or modifies the `structuralFiles` set will silently produce a ZIP that looks valid but fails POI validation. No dedicated tests exist for this function.

4. **Two `TemplateWithDataOptions` interfaces with the same name**: `types.ts` has `accounts: AccountData[]` (required); `official/interfaces.ts` has `consolidatedAccounts?: AccountData[]` (optional). The router passes `consolidatedAccounts`. `BaseTemplateService.fillExcelData()` reads `options.accounts`. If the `generateTemplatePackage()` path were ever activated for R414, it would silently receive `undefined` accounts. This is a latent bug in unused code that must be resolved before refactoring makes the paths converge.

5. **IFE has zero pipeline tests**: 680 lines of IFE data-writing code in `excelRewriter.ts` have no dedicated test. Any refactoring that touches the outer function — even adding a parameter, changing the `accountsByService` pre-computation, or modifying `writeCellSafe` — can silently break IFE. IFE is the only XBRL Express-confirmed working output. This must be protected with a pipeline test before any structural changes.

---

## Implications for Roadmap

### Phase 0: Safety Net Tests (prerequisite for everything else)
**Rationale:** Three critical code paths have zero tests. Without them, no refactoring can be done safely and the R414 bug fix cannot be confirmed.
**Delivers:** Confidence to change code without breaking IFE; a confirmed-failing test that validates the R414 fix
**Must produce:**
- `preserveOriginalStructure.test.ts` — structural ZIP verification (verifies workbook.xml source, styles.xml theme stripping, output is ExcelJS-readable)
- `ifePipeline.test.ts` — IFE E2E smoke test with real template buffer (Hoja1 metadata, Hoja3 ESF, Hoja4 ER, no shared formula contamination)
- `templatePackage.test.ts` — `generateOfficialTemplatePackageWithData()` ZIP shape (4 required files present, xlsx loadable)
**Avoids:** Pitfall #3 (untested `preserveOriginalStructure`) and pitfall #5 (IFE has zero tests)
**Research flag:** Standard patterns; no research needed. These are straightforward ExcelJS + JSZip assertions.

### Phase 1: R414 Empty Data Fix
**Rationale:** R414 is broken in production. The fix is targeted and does not require restructuring.
**Delivers:** Working R414 XBRL package output confirmed by the `r414Pipeline.test.ts` and the new `r414TemplateServicePipeline.test.ts`
**The fix (2 changes):**
1. Replace `if (!account.isLeaf) continue` in `excelRewriter.ts` R414 inline code (lines 200, 222, 247, 274, 325) with dynamic `codesWithChildren` set detection — same pattern already used in `baseTemplateService.ts`
2. Add diagnostic logging before line 156 guard to confirm `consolidatedAccounts` length at download time; if the guard fires with 0 accounts, the bug is upstream (session state, not leaf detection)
**Also fix:** IFE non-Q2 entry-point URL bug in `templateCustomizers.ts` (Q1/Q3/Q4 IFE packages reference wrong XSD)
**Avoids:** Pitfall #1 (isLeaf flag discrepancy)
**Research flag:** No research needed; root cause is confirmed by code analysis.

### Phase 2: Interface Unification + Dead Code Audit
**Rationale:** The dual `TemplateWithDataOptions` interface creates a latent bug that will manifest when refactoring makes both code paths live. Resolve it before structural changes.
**Delivers:** Single authoritative `TemplateWithDataOptions` with both `accounts` and `consolidatedAccounts` aligned; `excelDataFiller.ts` either deleted or marked explicitly as dead code
**Tasks:**
- Unify the two `TemplateWithDataOptions` interfaces (rename `types.ts` version to `BaseTemplateWithDataOptions` or add `consolidatedAccounts` alias)
- Confirm `customizeExcelWithData` from `excelDataFiller.ts` is not called anywhere, then delete the file (removes 1,580 lines of SheetJS code that would destroy xlsx structure if accidentally invoked)
- Remove duplicate `getTrimestreDates()` from `IFETemplateService.ts` (use `shared/dateUtils.ts`)
- Move `writeCellSafe()` from `excelRewriter.ts` local scope to `shared/excelUtils.ts` as an export
**Avoids:** Pitfall #4 (dual interface), pitfall #2 (wrong cell writer accidentally used)
**Research flag:** No research needed; mechanical changes with TypeScript compiler catching errors.

### Phase 3: excelRewriter.ts Decomposition
**Rationale:** The 2,463-line monolith cannot be maintained. It must be split into taxonomy-specific modules with `excelRewriter.ts` becoming a pure dispatcher. This is the highest-risk structural change and must follow Phase 0-2.
**Delivers:** `excelRewriter.ts` reduced to ~100-line dispatcher; R414 logic extracted to `r414/rewriters/`; IFE logic extracted to `ife/`; each section independently testable
**Safe split sequence (never move IFE until the IFE pipeline test from Phase 0 exists):**
1. Extract R414 Hoja1/2/3/7 → `r414/rewriters/r414EsfErRewriter.ts`; run `r414Pipeline.test.ts`
2. Extract R414 FC01 Hojas 16/17/18/22/23 → `r414/rewriters/r414Fc01Rewriter.ts`; re-run tests
3. Extract R414 FC03 Hojas 24/25/26/32/35 → `r414/rewriters/r414Fc03Rewriter.ts`; re-run tests
4. Extract IFE section (lines 1780-2458) → `ife/ifeRewriter.ts`; re-run all tests
5. `excelRewriter.ts` becomes the dispatcher
**Constraints:** All extracted functions must receive the same `ExcelJS.Workbook` instance (never create new workbooks in sub-functions); Hoja32/35 reads from Hoja2/3, so ordering must be preserved; `accountsByService` map must be passed as parameter to every extracted function
**Avoids:** Pitfall #2 (wrong cell writer), risk C in PITFALLS §2.1 (cross-sheet dependency)
**Research flag:** No external research needed; implementation risk is managed by run-test-after-each-move discipline.

### Phase 4: Grupos 1/2/3 Validation and Completion
**Rationale:** Template files exist and ~70-75% of data-writing logic is already implemented. The remaining gap is small but requires hands-on template inspection.
**Delivers:** Working Grupo 1/2/3 XBRL package output validated against XBRL Express
**Tasks (estimated 15-25h total):**
1. Open each grupo template xlsx and record Hoja1 cell addresses for company name, RUPS, NIT, report date, rounding — update `excelRewriter.ts` Hoja1 filling block (lines ~135-153)
2. Verify ESF row numbers (rows 15-70 assumed same across all groups), ER row numbers (rows 15-26), and FC01 cost row (row 18 assumed)
3. Resolve Grupo 2 Directo/Indirecto mismatch: template file is `Indirecto`, but `taxonomyConfig.ts` default is `directo` — either obtain the Directo template or change the default and align the entry-point URL
4. Add grupo pipeline integration test for each group (load real template, write known data, assert cell values)
5. Generate output ZIP for each group, load into XBRL Express, fix any validation errors
**Avoids:** Pitfall: Hoja1 wrong cell addresses producing XBRL Express info-sheet validation failure
**Research flag:** Requires opening the actual template xlsx files to read cell coordinates — low-stakes investigation, no external research needed.

### Phase 5: R414TemplateService.ts Decomposition
**Rationale:** The 1,891-line class is the second-largest file. After Phase 3 reduces `excelRewriter.ts` to a dispatcher, `R414TemplateService` can be decomposed independently. Lower urgency than Phases 1-4 because it does not block functionality.
**Delivers:** R414 class split into 4-5 focused files each under 550 lines
**Proposed split:** `R414TemplateService.ts` (class skeleton + ESF/ER, <400 lines), `R414Hoja7Service.ts` (PPE), `R414Fc01Service.ts` (FC01 per service), `R414Fc02Fc03Service.ts` (FC02+FC03 CxC)
**Constraint:** `r414TemplateService` singleton export must remain accessible to `excelRewriter.ts` for the Hoja9/Hoja10 calls; the `super.fillExcelData()` call ordering in `fillExcelData()` override must be preserved
**Research flag:** No external research needed.

### Phase 6: Structural Cleanup
**Rationale:** Once all taxonomy logic is in the right modules, the shared infrastructure can be cleaned up without breaking anything.
**Delivers:** Clean module boundaries, no duplicate code, `preserveOriginalStructure()` testable in isolation
**Tasks:**
- Move `preserveOriginalStructure()` from `officialTemplateService.ts` to `shared/zipBuilder.ts`
- Rename `taxonomyConfig.ts` to `grupoNiifConfig.ts`; move `ESF_CONCEPTS` to `grupos/mappings/esfConcepts.ts`
- Resolve the three `sumByPrefixes` variants (`pucUtils.sumByPrefixes`, `rewriterHelpers.sumAccountsByPrefixes`, `baseTemplateService.sumAccountsByPrefix`) — standardize on the dynamic-detection version
**Research flag:** No external research needed.

### Phase Ordering Rationale

- Phase 0 must be first: without the IFE pipeline test, every subsequent phase risks silently breaking the only confirmed-working XBRL output
- Phase 1 must precede Phase 3: fixing the R414 isLeaf bug in the monolith is safer than fixing it during extraction; fixing first, then moving the fixed code
- Phase 2 (interface unification + dead code) is low-risk and should be done early to prevent the dual-interface latent bug from becoming active during Phase 3
- Phase 4 (Grupos) is independent of Phase 3 (decomposition) and can run in parallel if developer bandwidth allows, but Grupos need the Phase 1 bug-fix patterns applied (use dynamic leaf detection, not `isLeaf` flag)
- Phases 5 and 6 are cleanup that does not change user-visible behavior; do last

### Research Flags

No phase requires external domain research — all gaps are code-level, discoverable by reading source files and running tests.

- **Phase 4 (Grupos):** Requires opening template xlsx files to read cell coordinates. This is internal investigation, not external research.
- **Phase 0-3:** All patterns are established. TypeScript compiler + vitest provide the safety net.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| R414 bug root cause | HIGH | Code analysis confirms `isLeaf` flag discrepancy at specific line numbers; fix is straightforward |
| IFE stability requirement | HIGH | IFE is the only XBRL Express-confirmed output; zero pipeline tests is confirmed by test file audit |
| Grupos implementation state | HIGH | Template files confirmed present; dispatch chain confirmed wired; Hoja1 gap confirmed unverified |
| R533 out-of-scope | HIGH | No templates, different PUC chart, different user base — all confirmed by direct file inspection |
| `preserveOriginalStructure` fragility | HIGH | Documented in commit history and code comments; lack of tests confirmed by test file audit |
| Grupos end-to-end correctness | MEDIUM | Core logic exists but row/cell addresses are assumed, not measured against actual templates |
| IFE non-Q2 entry-point URL bug | MEDIUM | Code path clearly shows missing substitution in `templateCustomizers.ts`; untested in practice |

**Overall confidence:** HIGH

### Gaps to Address

- **Grupo Hoja1 cell coordinates**: Must be resolved by opening each template xlsx and recording actual cells. Cannot be inferred from code alone. Handle in Phase 4 during template inspection.
- **R414 `consolidatedAccounts` guard behavior**: Diagnostic logging (Phase 1) must confirm whether the guard at `excelRewriter.ts:156` ever fires with zero accounts during normal download flow, or whether the `isLeaf` issue is always the cause.
- **Grupo 2 EFE method**: Template file is `Indirecto`; codebase defaults to `directo`. One of these must change. Decision requires checking whether SSPD accepts Indirecto for Grupo 2 entities, or whether the direct method template must be obtained.
- **`NaN` from PUC sums**: If any uploaded balance has non-numeric account values, `safeNumericValue()` may return `NaN`, which `writeCellSafe` will write as-is. XBRL Express rejects `NaN` as non-xs:decimal. Add `Number.isFinite()` guard in any new mapping code.

---

## Sources

### Primary (HIGH confidence — direct code analysis)

- `app/src/lib/xbrl/official/excelRewriter.ts` — 2,463 lines; root cause location for R414 bug
- `app/src/lib/xbrl/officialTemplateService.ts` — `preserveOriginalStructure()` implementation and fragility
- `app/src/lib/xbrl/__tests__/` — confirmed test coverage and gaps
- `app/public/templates/` — confirmed template file inventory (all grupo1/2/3/r414/ife files present; r533 absent)
- `app/src/lib/xbrl/official/templatePaths.ts` — TEMPLATE_PATHS, SHEET_MAPPING, mapping constants
- `app/src/lib/xbrl/grupos/` — rewriter dispatch chain confirmed wired and complete
- Commit history (`5a5965c`, `b123cfb`, `9843253`, `9a2edde`, `c599e23`) — documents ExcelJS/POI compatibility fixes

### Secondary (HIGH confidence — official regulatory sources)

- XBRL Express `.xbrlt`/`.xml` files — template structure, sheet counts, XML map entry counts verified
- [SUI XBRL manuals](http://www.sui.gov.co/web/empresas-prestadoras/manuales-nif-xbrl) — taxonomy entry points, namespace URLs
- [Contaduría General de la Nación — R533 entities](https://www.contaduria.gov.co/entidades-sujetas-al-ambito-de-la-resolucion-no-533-2015-y-sus-modificaciones) — confirms R533 is municipal/government entities, not private ESP

### Tertiary (MEDIUM confidence — requires validation)

- `docs/analisis_comparativo_niif.md` — grupo sheet count summary (source of automatable vs manual sheet classification)
- ESF row numbers for grupo1/2/3 (rows 15-70) — assumed identical across groups, not yet verified against actual template files

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
