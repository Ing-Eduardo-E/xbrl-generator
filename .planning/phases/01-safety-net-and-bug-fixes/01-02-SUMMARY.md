---
phase: 01-safety-net-and-bug-fixes
plan: 02
subsystem: xbrl/officialTemplateService
tags: [testing, zip, exceljs, jszip, r414, ife, regression-baseline]
dependency_graph:
  requires: []
  provides: [TEST-01, TEST-02, TEST-03]
  affects: [officialTemplateService.ts, preserveOriginalStructure]
tech_stack:
  added: []
  patterns: [vitest-beforeAll, jszip-loadAsync, exceljs-xlsx-load]
key_files:
  created:
    - app/src/lib/xbrl/__tests__/templatePackage.test.ts
  modified: []
decisions:
  - "Used actual outputPrefix values from TEMPLATE_PATHS (R414_Individual, IFE) rather than plan's assumed values (R414Ind, IFE_PrimerTrimestre)"
  - "IFE test asserts files start with 'IFE_' prefix (not 'IFE_PrimerTrimestre') because outputPrefix in TEMPLATE_PATHS.ife is 'IFE'"
metrics:
  duration: ~8 minutes
  completed: 2026-03-21T17:07:00Z
  tasks_completed: 1
  files_created: 1
---

# Phase 1 Plan 02: ZIP Shape and Data-Presence Tests Summary

**One-liner:** 16-test suite verifying generateOfficialTemplatePackageWithData() produces a valid 5-file ZIP with ExcelJS-loadable xlsx containing non-zero ESF data for both R414 and IFE pipelines.

## What Was Built

Created `app/src/lib/xbrl/__tests__/templatePackage.test.ts` with two describe blocks:

**R414 ZIP Shape (TEST-02, TEST-03) — 11 tests:**
- ZIP contains exactly 5 files
- Each file has correct extension (.xbrlt, .xml, .xlsx, .xbrl, README.txt)
- The .xlsx entry is loadable by ExcelJS without throwing
- The loaded workbook contains Hoja1 (proving preserveOriginalStructure() preserved sheet names)
- Hoja2 cell P15 is a non-zero number (ESF data was actually written)
- package.fileName matches `R414_Individual_ID20037_2024-12-31.zip`
- package.mimeType is `application/zip`

**IFE ZIP Shape (TEST-01) — 5 tests:**
- ZIP contains exactly 5 files
- All non-README entries start with `IFE_` prefix
- README.txt is present
- package.fileName matches `IFE_ID20037_2025-03-31.zip`
- package.mimeType is `application/zip`

All 16 tests pass. Total test count increased from 306 to 322 passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan had incorrect expected filenames for R414 and IFE**

- **Found during:** Task 1 (before writing tests — discovered by reading templatePaths.ts)
- **Issue:** The plan specified `R414Ind_ID20037_2024-12-31.zip` and `IFE_PrimerTrimestre_ID20037_2025-03-31.zip` but TEMPLATE_PATHS.r414.outputPrefix is `R414_Individual` and TEMPLATE_PATHS.ife.outputPrefix is `IFE`. The actual filenames are `R414_Individual_ID20037_2024-12-31.zip` and `IFE_ID20037_2025-03-31.zip`.
- **Fix:** Test assertions were written with the actual values from the code, not the plan's assumed values.
- **Files modified:** templatePackage.test.ts (assertions only)
- **Commit:** edce10c

**2. [Rule 1 - Deviation] IFE prefix assertion uses 'IFE_' not 'IFE_PrimerTrimestre'**

- **Found during:** Task 1 (code inspection)
- **Issue:** Plan specified `fileNames.filter(f => f !== 'README.txt').every(f => f.startsWith('IFE_PrimerTrimestre'))`. The IFE template uses `SegundoTrimestre` as its base template, and the outputPrefix is just `IFE`, producing files named `IFE_ID20037_2025-03-31.*`. No `PrimerTrimestre` in filenames since the service doesn't inject trimestre into the output filename.
- **Fix:** Asserted `f.startsWith('IFE_')` which is accurate and passes.
- **Files modified:** templatePackage.test.ts
- **Commit:** edce10c

## Self-Check

**Created files exist:**
- `app/src/lib/xbrl/__tests__/templatePackage.test.ts` — FOUND

**Commits exist:**
- `edce10c` — FOUND

## Self-Check: PASSED

## Results

| Test Suite | Tests | Status |
|---|---|---|
| R414 ZIP Shape (TEST-02, TEST-03) | 11 | All pass |
| IFE ZIP Shape (TEST-01) | 5 | All pass |
| **Total new** | **16** | **All pass** |
| Pre-existing (ifePipeline.test.ts BUG-02 intentional) | 2 | Intentionally failing (pre-existing from Plan 01-01) |
| All other tests | 320 | Pass |
