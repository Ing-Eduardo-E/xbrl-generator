# Roadmap: XBRL Taxonomy Generator — R414 Fix, Refactoring & Grupos NIIF

## Overview

This milestone takes a brownfield production codebase from a state where IFE Trimestral works end-to-end but R414 generates empty Excel cells, and delivers: a confirmed-working R414 annual taxonomy, clean modular architecture with no file exceeding 600 lines, and validated Grupos NIIF 1/2/3 output accepted by XBRL Express. The safe ordering is enforced by the research: tests first, then bug fix, then interface cleanup, then structural decomposition, then Grupos completion. Phase 4 (Grupos) can proceed in parallel with Phases 2 and 3 since it only depends on Phase 1.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Safety Net & Bug Fixes** - Write pipeline tests and fix R414 empty-data bug + IFE URL bug before any structural changes
- [ ] **Phase 2: Architecture Cleanup** - Unify interfaces, delete dead code, extract shared utilities — low-risk prep for decomposition
- [ ] **Phase 3: Modular Decomposition** - Split excelRewriter.ts monolith (2,463 lines) and R414TemplateService.ts into dispatcher + taxonomy-specific modules
- [ ] **Phase 4: Grupos NIIF Completion** - Verify cell coordinates in grupo templates, complete and validate Grupos 1/2/3 output in XBRL Express
- [ ] **Phase 5: Integration & Polish** - Finalize module boundaries, standardize sumByPrefixes, E2E validation across all taxonomies

## Phase Details

### Phase 1: Safety Net & Bug Fixes
**Goal**: The codebase has confirmed safety net tests for all critical paths, the R414 empty-data bug is fixed and verified by a failing-then-passing test, and IFE works correctly for all four trimestres
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, BUG-01, BUG-02, R414-01, R414-02, R414-04, IFE-01
**Success Criteria** (what must be TRUE):
  1. Running `pnpm test` shows a passing `ifePipeline.test.ts` that verifies Hoja1 metadata, Hoja3 ESF cells are non-empty, and the output ZIP contains all 4 required files
  2. Running `pnpm test` shows a passing `r414Pipeline.test.ts` that writes known account balances and reads back non-zero values from Hoja2 (ESF) and Hoja3 (ER) cells
  3. Generating an R414 ZIP and opening the .xlsx in Excel shows populated ESF and ER cells with the distributed service balances — not zeros or blanks
  4. Generating an IFE ZIP for Q1, Q3, and Q4 (not just Q2) produces packages whose .xbrlt entry-point XSD URL matches the correct trimestre namespace
  5. Hoja1 (informacion general) in an R414 output has NIT, company name, address, report date, and responsible party filled in with the correct values from the session
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Write IFE pipeline test + BUG-02 regression (TEST-01, BUG-02)
- [ ] 01-02-PLAN.md — Write ZIP shape tests for generateOfficialTemplatePackageWithData (TEST-02, TEST-03)
- [ ] 01-03-PLAN.md — Fix R414 isLeaf bug with codesWithChildren (BUG-01, R414-01, R414-02, R414-04)
- [ ] 01-04-PLAN.md — Fix IFE XSD entry-point URL for all trimestres (BUG-02, IFE-01)

### Phase 2: Architecture Cleanup
**Goal**: The codebase has a single authoritative `TemplateWithDataOptions` interface, no dead SheetJS code that could accidentally destroy xlsx structure, `writeCellSafe()` lives in exactly one place, and IFE's CxP sheet (Hoja6) has its data-filling implemented
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-02, ARCH-03, R414-03, IFE-02
**Success Criteria** (what must be TRUE):
  1. TypeScript compiler (`pnpm check`) passes with zero errors after `official/excelDataFiller.ts` is deleted — no remaining import of that file anywhere in the codebase
  2. A single `writeCellSafe()` export exists in `shared/excelUtils.ts`; searching the codebase for other definitions of `writeCellSafe` finds zero results
  3. A single `TemplateWithDataOptions` interface exists in `shared/types.ts`; the previous `official/interfaces.ts` version is removed; all callers compile without changes to runtime behavior
  4. Generating an IFE ZIP shows Hoja6 (CxP por antiguedad) with populated aging-range values instead of blank cells
  5. An R414 ZIP has FC01 sheets (Hoja16-Hoja22) with correctly distributed values for Acueducto, Alcantarillado, and Aseo — not zeros
**Plans**: TBD

### Phase 3: Modular Decomposition
**Goal**: `official/excelRewriter.ts` is a pure dispatcher of under 150 lines routing by `niifGroup`; `R414TemplateService.ts` is split into focused files; all taxonomy logic lives in its own module; each module has a clean `index.ts` and does not import from other taxonomy modules; no TypeScript file in xbrl/ exceeds 600 lines
**Depends on**: Phase 2
**Requirements**: ARCH-04, ARCH-05, ARCH-06, ARCH-07, ARCH-08, NIIF-05
**Success Criteria** (what must be TRUE):
  1. `official/excelRewriter.ts` is under 150 lines and contains only a dispatch switch/conditional — no direct cell writes, no PUC mapping lookups, no taxonomy-specific logic
  2. `R414TemplateService.ts` is split into at least 4 focused files (`R414EsfSheet.ts`, `R414ErSheet.ts`, `R414Fc01Sheets.ts`, `R414NotesSheets.ts`), each under 600 lines
  3. All previously passing tests in `pnpm test` still pass after the decomposition — no regressions to IFE or R414 output
  4. Each module (`r414/`, `ife/`, `grupo1/`, `grupo2/`, `grupo3/`) has an `index.ts` with clean exports and imports nothing from other taxonomy modules (only from `shared/`)
  5. No TypeScript file under `src/lib/xbrl/` exceeds 600 lines (verified by line-count check)
**Plans**: TBD

### Phase 4: Grupos NIIF Completion
**Goal**: Grupo 1 (NIIF Plenas), Grupo 2 (NIIF PYMES), and Grupo 3 (Contabilidad Simplificada) each produce a valid XBRL package that opens in XBRL Express v2.8.4 without errors and shows correct financial data; R414 is also end-to-end validated in XBRL Express
**Depends on**: Phase 1
**Requirements**: NIIF-01, NIIF-02, NIIF-03, NIIF-04, R414-05
**Success Criteria** (what must be TRUE):
  1. Opening each grupo template `.xlsx` file and comparing to the code confirms that Hoja1 cell addresses for company name, NIT, RUPS, report date, and rounding are correct — discrepancies are resolved in code
  2. A Grupo 1 ZIP generated with test data opens in XBRL Express without import errors and displays ESF and ER values matching the input balance
  3. A Grupo 2 ZIP generated with test data opens in XBRL Express without import errors — the Directo/Indirecto EFE method mismatch between template filename and `taxonomyConfig.ts` is resolved
  4. A Grupo 3 ZIP generated with test data opens in XBRL Express without import errors and displays correct simplified financial statement values
  5. An R414 ZIP loaded into XBRL Express shows correct financial data with no import or validation errors — the package can be submitted to SUI
**Plans**: TBD

### Phase 5: Integration & Polish
**Goal**: All taxonomy modules have verified end-to-end XBRL Express compatibility, the `sumByPrefixes` utility is standardized across all callers, and `preserveOriginalStructure()` has a dedicated unit test confirming its structural ZIP assembly behavior
**Depends on**: Phase 3, Phase 4
**Requirements**: (no new v1 requirements — all 23 are covered in Phases 1-4; this phase completes their integration)
**Success Criteria** (what must be TRUE):
  1. A dedicated test for `shared/zipBuilder.ts` verifies that `preserveOriginalStructure()` produces a ZIP where structural files (workbook.xml, styles.xml) originate from the template and data sheets originate from ExcelJS output
  2. A single `sumByPrefixes` implementation exists in `shared/pucUtils.ts` — all callers in `rewriterHelpers`, R414 rewriters, and Grupo rewriters use it; no duplicate implementations remain
  3. All 302+ previously passing tests still pass — zero regressions across all taxonomies
  4. The full test suite (`pnpm test`) completes with green for IFE, R414, and Grupos pipeline tests in a single run
**Plans**: TBD

## Progress

**Execution Order:**
Phase 1 must come first. Phase 4 can run in parallel with Phases 2 and 3 (depends only on Phase 1). Phase 5 requires both Phase 3 and Phase 4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Safety Net & Bug Fixes | 0/4 | Not started | - |
| 2. Architecture Cleanup | 0/TBD | Not started | - |
| 3. Modular Decomposition | 0/TBD | Not started | - |
| 4. Grupos NIIF Completion | 0/TBD | Not started | - |
| 5. Integration & Polish | 0/TBD | Not started | - |
