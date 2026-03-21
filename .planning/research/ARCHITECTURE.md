# XBRL Generator — Architecture Research Report

**Date**: 2026-03-21
**Analyst**: Claude Sonnet 4.6
**Scope**: `app/src/lib/xbrl/` — all TypeScript files
**Purpose**: Design a clean modular structure where each taxonomy is fully independent

---

## 1. FILE SIZE AUDIT

Files over 300 lines that require attention:

### 1.1 `official/excelRewriter.ts` — 2,463 lines (CRITICAL)

**What it does**: Single function `rewriteFinancialDataWithExcelJS()` that orchestrates ALL financial data writing for ALL taxonomies into Excel worksheets. Contains:
- `writeCellSafe()` helper (duplicated from BaseTemplateService.writeCell)
- R414 Hoja1 metadata (lines ~88–138)
- R414 Hoja2 ESF — balance sheet by service (lines ~140–238)
- R414 Hoja3 ER — income statement (lines ~240–297)
- R414 Hoja7 — PPE notes with `processSectionWithZeroFill` helper (lines ~299–450)
- R414 Hojas 16/17/18 — FC01 expenses per service (lines ~451–900)
- R414 Hojas 22/23 — FC01 consolidated + FC02 revenues (lines ~900–1100)
- R414 Hojas 24/25/26 — FC03 CxC by stratum (lines ~1100–1474)
- R414 Hojas 32/35 — liabilities aging + reconciliation (lines ~1475–1613)
- IFE Hoja1 metadata (lines ~1614–1700)
- IFE Hoja3 ESF trimestral (lines ~1700–1900)
- IFE Hoja4 ER trimestral (lines ~1900–2100)
- IFE Hoja5 CxC aging (lines ~2100–2250)
- IFE Hoja7 detail income/expense (lines ~2250–2463)
- Routes to `rewriteGrupoData()` for grupo1/2/3

**Split plan** (5 files, each under 600 lines):
```
official/rewriters/
  r414EsfErRewriter.ts      (~550 lines) — Hoja1/2/3/7
  r414Fc01Rewriter.ts       (~550 lines) — Hojas 16/17/18/22/23
  r414Fc03Rewriter.ts       (~550 lines) — Hojas 24/25/26/32/35
  ifeRewriter.ts            (~500 lines) — All IFE sheets
  rewriterCore.ts           (~100 lines) — rewriteFinancialDataWithExcelJS() dispatcher only
```

---

### 1.2 `r414/R414TemplateService.ts` — 1,891 lines (CRITICAL)

**What it does**: Class extending `BaseTemplateService` that implements R414-specific logic. Contains:
- `fillInfoSheet()` override with R414-specific cell mappings (lines ~80–141)
- `fillESFSheet()` (lines ~143–201)
- `fillERSheet()` (lines ~203–280)
- `fillHoja7PPE()` — PPE notes sheet (lines ~280–450)
- FC01 filling for each service (acueducto, alcantarillado, aseo) with ~150 lines each
- FC02 revenues (lines ~900–1050)
- FC03 CxC by stratum for each service (~180 lines each)
- FC05b liabilities aging (lines ~1600–1700)
- FC08 reconciliation (lines ~1700–1800)
- FC09 cost of sales detail (lines ~1800–1891)

**Split plan** (4 files, each under 600 lines):
```
r414/
  R414TemplateService.ts    (~400 lines) — class skeleton + fillInfoSheet/ESF/ER
  R414Hoja7Service.ts       (~300 lines) — fillHoja7PPE() and PPE section helpers
  R414Fc01Service.ts        (~550 lines) — FC01 for all 3 services
  R414Fc02Fc03Service.ts    (~550 lines) — FC02, FC03 per service
  R414Fc05bFc09Service.ts   (~400 lines) — FC05b, FC08, FC09
```

---

### 1.3 `ife/IFETemplateService.ts` — 1,061 lines (LARGE)

**What it does**: Class extending `BaseTemplateService` for IFE trimestral taxonomy. Contains:
- Local `getTrimestreDates()` (duplicates `shared/dateUtils.ts`)
- `fillInfoSheet()` override (lines ~85–200)
- `fillESFSheet()` Hoja3 trimestral (lines ~200–420)
- `fillERSheet()` Hoja4 trimestral (lines ~420–600)
- `fillHoja5CxC()` CxC aging (lines ~600–780)
- `fillHoja6CxP()` (lines ~780–900)
- `fillHoja7Detalle()` (lines ~900–1061)

**Split plan** (3 files):
```
ife/
  IFETemplateService.ts     (~400 lines) — class + fillInfoSheet/ESF/ER
  IFEHoja5Service.ts        (~350 lines) — CxC, CxP aging sheets
  IFEHoja7Service.ts        (~350 lines) — Detail income/expense
```

> **NOTE**: IFE is production-deployed and end-to-end tested. Splitting should happen only after R414 and official/excelRewriter are stabilized.

---

### 1.4 `official/excelDataFiller.ts` — 1,580 lines (LARGE)

**What it does**: Uses SheetJS (XLSX) to fill metadata into Excel — this is the **deprecated legacy path**. The comment at line 20 imports `xlsx` (SheetJS) which the commit history explicitly states was removed because it destroys xlsx structure. This file appears to be kept as a compatibility shim but should be treated as dead code.

**Action**: Verify if `customizeExcelWithData` is still called from anywhere; if not, schedule deletion.

---

### 1.5 `shared/baseTemplateService.ts` — 537 lines (BORDERLINE)

**What it does**: Abstract base class with:
- `generateTemplatePackage()` — ZIP assembly
- `fillExcelData()` — dispatches to abstract methods
- `sumAccountsByPrefix()` / `sumServiceAccountsByPrefix()` — smart leaf-detection aggregation
- `writeCell()` — shared ExcelJS cell writer
- `fillInfoSheet()` — default Hoja1 filling
- `customizeXbrlt()`, `customizeXml()`, `customizeXbrl()` — template text replacement
- `generateOutputPrefix()`, `generateReadme()`

**Status**: 537 lines is borderline. Could stay as-is if the ZIP assembly logic (`generateTemplatePackage`) is extracted to `shared/zipBuilder.ts`.

---

### 1.6 `taxonomyConfig.ts` — 812 lines (LARGE)

**What it does**: Contains `ESF_CONCEPTS` (large array of XBRL concept definitions for grupo1/2/3 ESF), `SHEET_MAPPING` for all groups, `SERVICE_COLUMNS`, `getTaxonomyConfig()`, `findESFConceptByPUC()`. This is NOT taxonomy-specific — it's a shared registry for grupo1/2/3.

**Note**: R414 does NOT use `ESF_CONCEPTS` — it uses its own `R414_ESF_MAPPINGS`. The `taxonomyConfig.ts` is effectively `grupo-niif-config.ts`.

---

### Summary of Oversized Files

| File | Lines | Priority |
|------|-------|----------|
| `official/excelRewriter.ts` | 2,463 | CRITICAL — split now |
| `r414/R414TemplateService.ts` | 1,891 | CRITICAL — split now |
| `official/excelDataFiller.ts` | 1,580 | AUDIT — likely dead code |
| `ife/IFETemplateService.ts` | 1,061 | MEDIUM — split after R414 |
| `taxonomyConfig.ts` | 812 | LOW — rename + minor split |
| `shared/baseTemplateService.ts` | 537 | LOW — extract ZIP builder |

---

## 2. SHARED vs TAXONOMY-SPECIFIC CLASSIFICATION

### 2.1 Truly Shared (`shared/`) — Used by 2+ taxonomies

| Function/Class | File | Used by | Notes |
|---|---|---|---|
| `BaseTemplateService` | `shared/baseTemplateService.ts` | R414, IFE (grupo1/2/3 bypass) | Core abstraction |
| `writeCell()` | `shared/baseTemplateService.ts` | All via inheritance | Also duplicated as `writeCellSafe` in excelRewriter |
| `sumAccountsByPrefix()` | `shared/baseTemplateService.ts` | R414, IFE via inheritance | Smart leaf detection |
| `sumServiceAccountsByPrefix()` | `shared/baseTemplateService.ts` | R414, IFE via inheritance | Smart leaf detection |
| `matchesPrefixes()` | `shared/rewriterHelpers.ts` | excelRewriter, grupoFcRewriter | Used in 2+ places |
| `sumAccountsByPrefixes()` | `shared/rewriterHelpers.ts` | grupoFcRewriter, grupos | Used by grupos |
| `fillExpenseColumnE()` | `shared/rewriterHelpers.ts` | grupoFcRewriter | Only grupos currently |
| `fillExpenseColumnF()` | `shared/rewriterHelpers.ts` | grupoFcRewriter | Only grupos currently |
| `calculateColumnG()` | `shared/rewriterHelpers.ts` | grupoFcRewriter | Only grupos currently |
| `fillCxCByEstrato()` | `shared/rewriterHelpers.ts` | grupoFcRewriter | CxC distribution logic |
| `ESTRATOS_*`, `RANGOS_*` | `shared/rewriterHelpers.ts` | grupoFcRewriter, (R414 inline) | R414 duplicates this inline |
| `getTrimestreDateRange()` | `shared/dateUtils.ts` | IFETemplateService (local copy), dateUtils | **DUPLICATION**: IFETemplateService has its own `getTrimestreDates()` |
| `generateFiscalYearTrimesters()` | `shared/dateUtils.ts` | Only exported, not used internally | Utility function |
| All functions | `shared/excelUtils.ts` | Exported but lightly used | `writeCellNumber`, `readCellNumber`, etc. |
| All functions | `shared/pucUtils.ts` | Exported but lightly used | PUC classification utilities |
| `AccountData`, `ServiceBalanceData`, etc. | `types.ts` | All modules | Core types |
| `ESFMapping`, `ServiceColumnMapping` | `types.ts` | All modules | Core interfaces |

### 2.2 R414-Specific — Move to `r414/`

| Function/Export | Current Location | Reason |
|---|---|---|
| `writeCellSafe()` | `official/excelRewriter.ts` (local) | Duplicate of `writeCell()` in BaseTemplateService — should use shared version |
| R414 Hoja7 PPE logic | `official/excelRewriter.ts` (lines ~299–450) | Only for R414 |
| R414 FC01 Hojas 16/17/18 logic | `official/excelRewriter.ts` (lines ~451–900) | Only for R414 |
| R414 FC02 Hoja22/23 logic | `official/excelRewriter.ts` (lines ~900–1100) | Only for R414 |
| R414 FC03 Hojas 24/25/26 logic | `official/excelRewriter.ts` (lines ~1100–1474) | Only for R414 |
| R414 FC05b/FC08 logic | `official/excelRewriter.ts` (lines ~1475–1613) | Only for R414 |
| `R414_ESF_MAPPINGS` (622 lines) | `r414/mappings/esfMappings.ts` | Already in r414/ — correct |
| `R414_ER_MAPPINGS` | `r414/mappings/erMappings.ts` | Already in r414/ — correct |
| `R414_PPE_MAPPINGS`, etc. | `r414/mappings/ppeMappings.ts` | Already in r414/ — correct |
| `R414_FC01_*` | `r414/mappings/fc01Mappings.ts` | Already in r414/ — correct |
| `R414_SHEET_MAPPING` | `r414/config.ts` | Already in r414/ — correct |

**Key Problem**: `official/excelRewriter.ts` is essentially `r414/excelRewriter.ts` with IFE logic bolted on. The file imports from `r414/mappings` directly, proving it is R414-specific code living in the wrong module.

### 2.3 IFE-Specific — Move to `ife/`

| Function/Export | Current Location | Reason |
|---|---|---|
| IFE Hoja1 metadata (lines ~1614–1700) | `official/excelRewriter.ts` | Only for IFE |
| IFE Hoja3 ESF (lines ~1700–1900) | `official/excelRewriter.ts` | Only for IFE |
| IFE Hoja4 ER (lines ~1900–2100) | `official/excelRewriter.ts` | Only for IFE |
| IFE Hoja5 CxC (lines ~2100–2250) | `official/excelRewriter.ts` | Only for IFE |
| IFE Hoja7 detail (lines ~2250–2463) | `official/excelRewriter.ts` | Only for IFE |
| `getTrimestreDates()` local copy | `ife/IFETemplateService.ts` | Duplicates `shared/dateUtils.ts` — remove local copy |
| `IFE_SHEET_MAPPING` | `ife/config.ts` | Already in ife/ — correct |
| `IFE_ESF_MAPPINGS`, `IFE_ER_MAPPINGS` | `ife/mappings/` | Already in ife/ — correct |

### 2.4 Grupo NIIF-Specific — Move to `grupos/`

| Function/Export | Current Location | Reason |
|---|---|---|
| `ESF_CONCEPTS` | `taxonomyConfig.ts` | Only used by grupo1/2/3 ESF rewriter |
| `findESFConceptByPUC()` | `taxonomyConfig.ts` | Only used by grupoEsfErRewriter |
| `SHEET_MAPPING` (grupo1/2/3 entries) | `official/templatePaths.ts` | Partially shared, partially grupo-specific |
| `GRUPO_ER_MAPPINGS` | `grupos/mappings/index.ts` | Already in grupos/ — correct |
| `GRUPO_FC01_EXPENSE_MAPPINGS` | `grupos/mappings/index.ts` | Already in grupos/ — correct |
| `GrupoConfig` + `getGrupoConfig()` | `grupos/mappings/index.ts` | Already in grupos/ — correct |
| `rewriteGrupoESF()`, `rewriteGrupoER()` | `grupos/grupoEsfErRewriter.ts` | Already in grupos/ — correct |
| `rewriteGrupoFC01()` through `FC08()` | `grupos/grupoFcRewriter.ts` | Already in grupos/ — correct |

### 2.5 Duplication Problems Found

1. **`writeCellSafe` vs `writeCell`**: `excelRewriter.ts` defines a local `writeCellSafe()` at line 38. `BaseTemplateService.writeCell()` at line 343 is identical logic. The `official/` module bypasses the class hierarchy entirely and re-implements the same function.

2. **`getTrimestreDates` duplication**: `IFETemplateService.ts` defines a local `getTrimestreDates()` at line 53. `shared/dateUtils.ts` exports `getTrimestreDateRange()` with the same logic. The local copy should be removed.

3. **`SERVICE_COLUMNS` duplication**: `official/excelDataFiller.ts` has a local `SERVICE_COLUMNS` constant at line 36 with a comment saying "DEUDA: duplicado del monolito." The canonical version is in `official/templatePaths.ts`.

4. **`R414_ER_COLUMNS` duplication**: Same comment in `excelDataFiller.ts` — "DEUDA: R414_ER_COLUMNS está duplicado."

5. **`sumByPrefixes` vs `sumAccountsByPrefixes`**: `shared/pucUtils.ts` exports `sumByPrefixes()` using `isLeaf` flag. `shared/rewriterHelpers.ts` exports `sumAccountsByPrefixes()` also using `isLeaf`. `BaseTemplateService.sumAccountsByPrefix()` uses dynamic parent-detection instead of `isLeaf` to handle pre-aggregated balances. Three implementations of the same concept with different assumptions.

---

## 3. PROPOSED MODULE STRUCTURE

```
src/lib/xbrl/
│
├── shared/                         # Only truly common utilities
│   ├── types.ts                    # All shared types (move from ../types.ts)
│   ├── baseTemplateService.ts      # Abstract base — ZIP, template I/O, writeCell
│   │                               # Extract generateTemplatePackage() to zipBuilder.ts
│   ├── zipBuilder.ts               # ZIP packaging + preserveOriginalStructure()
│   │                               # (moved from officialTemplateService.ts)
│   ├── excelUtils.ts               # writeCellNumber, readCellNumber, etc.
│   ├── dateUtils.ts                # getTrimestreDateRange, generateFiscalYearTrimesters
│   ├── pucUtils.ts                 # PUC classification, cleanPucCode, etc.
│   └── rewriterHelpers.ts          # matchesPrefixes, sumAccountsByPrefixes,
│                                   # fillExpenseColumn*, calculateColumnG,
│                                   # fillCxCByEstrato, ESTRATOS_*, RANGOS_*
│
├── r414/                           # Resolución 414 — FULLY INDEPENDENT
│   ├── index.ts                    # Public exports
│   ├── config.ts                   # R414_TEMPLATE_PATHS, R414_SHEET_MAPPING (exists)
│   ├── R414TemplateService.ts      # Class skeleton + fillInfoSheet/ESF/ER (<400 lines)
│   ├── R414Hoja7Service.ts         # PPE notes + section helpers (<350 lines)
│   ├── R414Fc01Service.ts          # FC01 gastos acueducto/alcantarillado/aseo (<550 lines)
│   ├── R414Fc02Fc03Service.ts      # FC02 ingresos + FC03 CxC por estrato (<550 lines)
│   ├── R414Fc05bFc09Service.ts     # FC05b pasivos, FC08 conciliación, FC09 costos (<400 lines)
│   └── mappings/                   # PUC mappings (all exist already)
│       ├── index.ts
│       ├── esfMappings.ts          # R414_ESF_MAPPINGS, R414_SERVICE_COLUMNS
│       ├── erMappings.ts           # R414_ER_MAPPINGS
│       ├── ppeMappings.ts          # R414_PPE_MAPPINGS, INTANGIBLES, EFECTIVO, etc.
│       └── fc01Mappings.ts         # R414_FC01_GASTOS_MAPPINGS, DATA_ROWS, ZERO_F_ROWS
│
├── ife/                            # IFE Trimestral — FULLY INDEPENDENT (keep stable)
│   ├── index.ts                    # Public exports (exists)
│   ├── config.ts                   # IFE_TEMPLATE_PATHS, IFE_SHEET_MAPPING (exists)
│   ├── IFETemplateService.ts       # Class skeleton + fillInfoSheet/ESF/ER (<400 lines)
│   │                               # Remove local getTrimestreDates() — use shared/dateUtils
│   ├── IFEHoja5Service.ts          # fillHoja5CxC, fillHoja6CxP (<350 lines)
│   ├── IFEHoja7Service.ts          # fillHoja7Detalle (<350 lines)
│   └── mappings/                   # IFE PUC mappings (exist)
│       ├── esfMappings.ts
│       └── erMappings.ts
│
├── grupos/                         # Grupo 1/2/3 NIIF — shared infrastructure
│   ├── index.ts                    # rewriteGrupoData() dispatcher (exists)
│   ├── grupoEsfErRewriter.ts       # rewriteGrupoESF, rewriteGrupoER (exists, 135 lines OK)
│   ├── grupoFcRewriter.ts          # rewriteGrupoFC01-FC08 (exists, 370 lines OK)
│   └── mappings/
│       └── index.ts                # GRUPO_ER_MAPPINGS, GRUPO_FC01_*, GrupoConfig (exists)
│
├── grupo1/                         # Future: Grupo 1 NIIF Plenas (separate templates)
│   ├── index.ts
│   ├── config.ts                   # Grupo1-specific template paths and sheet names
│   └── (delegates to grupos/ for rewriting logic)
│
├── grupo2/                         # Future: Grupo 2 NIIF PYMES (separate templates)
│   └── (same pattern as grupo1/)
│
├── grupo3/                         # Future: Grupo 3 Simplificada (separate templates)
│   └── (same pattern as grupo1/)
│
├── official/                       # Cross-taxonomy template machinery (refactor in place)
│   ├── index.ts                    # Public re-exports
│   ├── interfaces.ts               # TemplateWithDataOptions, OfficialTemplatePackage
│   ├── templatePaths.ts            # TEMPLATE_PATHS, SHEET_MAPPING, SERVICE_COLUMNS
│   ├── templateCustomizers.ts      # customizeXbrlt, customizeXml (exists, small)
│   ├── fileLoaders.ts              # loadTemplate, loadBinaryTemplate (exists, small)
│   ├── excelDataFiller.ts          # LEGACY/SheetJS path — AUDIT FOR DELETION
│   └── excelRewriter.ts            # Refactor to dispatcher only (~100 lines):
│                                   # routes to r414/*, ife/*, grupos/ rewriters
│                                   # All sheet-filling logic moves out to taxonomy modules
│
├── officialTemplateService.ts      # Entry point: generateOfficialTemplatePackageWithData()
│                                   # + preserveOriginalStructure() → move to shared/zipBuilder.ts
│
├── taxonomyConfig.ts               # Rename to grupoNiifConfig.ts or split:
│                                   # - ESF_CONCEPTS → grupos/mappings/esfConcepts.ts
│                                   # - getTaxonomyConfig() → grupos/config.ts
│                                   # - SHEET_MAPPING R414/IFE → their own modules
│
├── types.ts                        # Canonical shared types (341 lines, keep here)
├── xbrlGenerator.ts                # XBRL XML generation
└── index.ts                        # Root public API
```

### Key Architecture Principle: The Dispatcher Pattern

The `official/excelRewriter.ts` should become a thin dispatcher (100 lines max):

```typescript
// PROPOSED: official/excelRewriter.ts after refactor
export async function rewriteFinancialDataWithExcelJS(buffer, options) {
  const workbook = await loadWorkbook(buffer);

  switch (options.niifGroup) {
    case 'r414':
      await r414TemplateService.rewriteAll(workbook, options);
      break;
    case 'ife':
      await ifeTemplateService.rewriteAll(workbook, options);
      break;
    case 'grupo1':
    case 'grupo2':
    case 'grupo3':
      rewriteGrupoData(workbook, options);
      break;
  }

  return workbook.xlsx.writeBuffer();
}
```

Each taxonomy module owns its own rewriting logic completely.

---

## 4. REFACTORING RISK ASSESSMENT

### 4.1 Safe to Refactor (Low Risk)

These changes can be made without touching IFE or breaking production:

1. **Extract `writeCellSafe` duplication** — Move the local `writeCellSafe()` in `excelRewriter.ts` to `shared/excelUtils.ts` as `writeCellSafe()`. Update all callers. No behavior change. IFE is unaffected (it uses `BaseTemplateService.writeCell()`).

2. **Remove `getTrimestreDates` duplication in IFE** — `IFETemplateService.ts` has its own local function. Replace with import from `shared/dateUtils.ts`. Safe because the logic is identical (verified by reading both implementations).

3. **Fix `SERVICE_COLUMNS` duplication** — `excelDataFiller.ts` has a local copy. If the file is unused (see Section 4.3), this resolves itself.

4. **Split `r414/R414TemplateService.ts`** — The class can be split into focused files. Since `R414TemplateService` extends `BaseTemplateService` and all the public methods are called only through the interface, this is safe to decompose. IFE is completely isolated from R414 code paths.

5. **Rename `taxonomyConfig.ts`** — Move `ESF_CONCEPTS` to `grupos/mappings/esfConcepts.ts`. Only `grupoEsfErRewriter.ts` imports `ESF_CONCEPTS`. Update that import. Low blast radius.

### 4.2 Moderate Risk

6. **Split `official/excelRewriter.ts`** — This is the main orchestrator. Splitting requires moving large sections to R414 and IFE modules. Risk: import chain changes, potential for missed calls. Mitigation: Do one section at a time, run the R414 pipeline test after each move.

7. **`officialTemplateService.ts` cleanup** — The `preserveOriginalStructure()` function could move to `shared/zipBuilder.ts`. This is used in production for every XBRL package. Risk: medium. Test thoroughly.

### 4.3 Audit Required Before Touching

8. **`official/excelDataFiller.ts` (1,580 lines, uses SheetJS)** — The commit history (`c599e23`) explicitly says "eliminar SheetJS que destruía estructura xlsx". This file imports `xlsx` (SheetJS) at line 20. Check if `customizeExcelWithData()` from this file is called anywhere in the live code path. If not, this is dead code to be deleted, not refactored.

```bash
# Check if excelDataFiller exports are used anywhere
grep -r "customizeExcelWithData\|excelDataFiller" app/src --include="*.ts"
```

### 4.4 Dependency Map (What Calls What)

```
officialTemplateService.ts
  └── official/excelRewriter.ts           ← CRITICAL HUB (2,463 lines)
        ├── r414/mappings/*               ← R414 data
        ├── grupos/index.ts → grupoEsfErRewriter + grupoFcRewriter
        ├── shared/rewriterHelpers.ts
        └── r414/R414TemplateService.ts   ← imports r414TemplateService singleton

r414/R414TemplateService.ts
  └── shared/baseTemplateService.ts       ← abstract base
  └── r414/mappings/*

ife/IFETemplateService.ts
  └── shared/baseTemplateService.ts       ← abstract base
  └── ife/mappings/*
  └── [local duplicate of dateUtils]      ← fix this

grupos/grupoFcRewriter.ts
  └── shared/rewriterHelpers.ts           ← shared helpers
  └── grupos/mappings/index.ts

grupos/grupoEsfErRewriter.ts
  └── taxonomyConfig.ts                   ← ESF_CONCEPTS (misplaced)
  └── grupos/mappings/index.ts
```

### 4.5 Tests That Catch Regressions

Existing test coverage in `app/src/lib/xbrl/__tests__/`:

| Test File | What it Tests | Taxonomy |
|---|---|---|
| `r414Pipeline.test.ts` | `rewriteFinancialDataWithExcelJS()` end-to-end with real template | R414 |
| `grupoRewriters.test.ts` | `matchesPrefixes()`, `sumAccountsByPrefixes()`, mappings | grupos |
| `baseTemplateService.test.ts` | `sumAccountsByPrefix()`, `writeCell()` | All |
| `dateUtils.test.ts` | `getTrimestreDateRange()` | IFE |
| `excelUtils.test.ts` | `writeCellNumber()`, column helpers | All |
| `pucUtils.test.ts` | PUC classification functions | All |
| `templatePaths.test.ts` | TEMPLATE_PATHS completeness | All |

**Critical gap**: There is NO test for IFE pipeline end-to-end (the CLAUDE.md notes "⏳ End-to-end testing with XBRL Express"). This means any refactoring of IFE code carries higher risk than R414.

**Recommended test-driven refactoring order**:
1. Run existing `r414Pipeline.test.ts` to establish baseline
2. Extract R414 sections from `excelRewriter.ts` to `r414/` — re-run after each extraction
3. Extract IFE sections — add IFE pipeline test first
4. Move `preserveOriginalStructure` to `shared/zipBuilder.ts` — re-run all tests

---

## 5. GRUPOS NIIF ASSESSMENT

### 5.1 What Currently Exists in `grupos/`

```
grupos/
  index.ts               (83 lines)   — rewriteGrupoData() dispatcher
  grupoEsfErRewriter.ts  (135 lines)  — rewriteGrupoESF(), rewriteGrupoER()
  grupoFcRewriter.ts     (370 lines)  — rewriteGrupoFC01-FC08()
  mappings/
    index.ts             (125 lines)  — configs + mappings for all 3 groups
```

**Total**: ~713 lines of working rewriting logic.

The `grupos/` module handles the data-writing side (ExcelJS). The template files themselves (`.xlsx`, `.xbrlt`, `.xml`, `.xbrl`) are loaded from `public/templates/` via `official/templatePaths.ts`.

### 5.2 What Is Implemented

**Working** (code exists and is called):
- `rewriteGrupoESF()` — writes ESF data to Hoja2 using `ESF_CONCEPTS` concept matching
- `rewriteGrupoER()` — writes ER data to Hoja3 using `GRUPO_ER_MAPPINGS`
- `rewriteGrupoFC01()` — gastos per service to FC01 sheets (Acueducto, Alcantarillado, Aseo)
- `rewriteGrupoFC02()` — complementary revenues (skeleton, probably minimal)
- `rewriteGrupoFC03()` — CxC by stratum (delegating to `fillCxCByEstrato` from rewriterHelpers)
- `rewriteGrupoFC05b()` — liabilities aging (grupo1 only)
- `rewriteGrupoFC08()` — income reconciliation (grupo1 only)
- `getGrupoConfig()` — resolves sheet names from `SHEET_MAPPING` for the given group

**The dispatcher** `rewriteGrupoData()` correctly routes grupo1/2/3 through all 7 FC routines.

### 5.3 What Is NOT Implemented / Gaps to Working Grupo 1/2/3

**Gap 1: Template Files May Not Exist**
The `getGrupoConfig()` returns `null` if `SHEET_MAPPING[niifGroup]['900017a']` is absent. This means if template paths for grupo1/2/3 aren't defined in `official/templatePaths.ts`, the `rewriteGrupoData()` silently exits. Need to verify:
```
public/templates/grupo1/   — does this folder exist with .xlsx/.xbrlt/.xml/.xbrl?
public/templates/grupo2/
public/templates/grupo3/
```

**Gap 2: Hoja1 (Info) for Grupos Not Implemented**
`rewriteFinancialDataWithExcelJS()` in `excelRewriter.ts` only handles Hoja1 for `r414` and `ife` explicitly (lines ~95–140 and ~1614–1700). There is no Hoja1-filling code for grupo1/2/3. The `rewriteGrupoData()` function does NOT call any Hoja1 filler.

**Gap 3: `GRUPO_ER_MAPPINGS` Uses NIIF Private PUC, Not R414 PUC**
The `GRUPO_ER_MAPPINGS` in `grupos/mappings/index.ts` maps to PUC prefixes `41`, `42`, `51`, `52`, `53`, `4210`. This is the NIIF private sector PUC. Companies using grupo1/2/3 may have different account structures than R414 (CGN). This needs validation with real grupo1 template data.

**Gap 4: `fillExpenseColumnF` for Aseo Uses `fc01AseoDisposalRow: null`**
In `getGrupoConfig()`, `fc01AseoDisposalRow` is hardcoded to `null`. This means the 40%/60% split for Aseo disposal (`fillExpenseColumnF` with `isAseo=true`) is never triggered for grupo configurations. This may be intentional or a bug depending on whether the grupo templates have the same split requirement.

**Gap 5: FC03 Only for grupo1/grupo2**
`rewriteGrupoFC03()` checks `config.fc03AcuSheet !== null` and `getGrupoConfig()` sets these to null if `SHEET_MAPPING[niifGroup]['900021']` is absent. The FC03 sheet structure needs to exist in the template for grupo1 and grupo2.

**Gap 6: No End-to-End Tests for Grupos**
The `grupoRewriters.test.ts` only tests unit-level helpers (`matchesPrefixes`, `sumAccountsByPrefixes`). There is no integration test that loads a real grupo template and verifies cell values are written correctly.

### 5.4 Estimated Gap to Working Grupo 1/2/3

| Component | Status | Effort |
|---|---|---|
| Template files (xlsx/xbrlt/xml/xbrl) | Unknown — need to check public/templates/ | Medium if files exist, High if need to prepare |
| `SHEET_MAPPING` entries for grupo1/2/3 | Exists in taxonomyConfig.ts | Done |
| Data writing (ESF, ER, FC01-FC08) | Code exists and routes correctly | Done |
| Hoja1 filling for grupos | Missing — not implemented | Low (1–2 hours) |
| End-to-end test | Missing | Medium (2–4 hours) |
| Validation with XBRL Express | Not done | Unknown |

**Bottom line**: The `grupos/` rewriting code is ~80% complete. The main blockers are: (1) confirming template files exist, (2) implementing Hoja1 filling for grupos in `excelRewriter.ts`, and (3) end-to-end validation.

---

## 6. RECOMMENDED REFACTORING SEQUENCE

### Phase 1: Low-Risk Cleanups (No breaking changes)
1. Remove duplicate `getTrimestreDates()` from `IFETemplateService.ts` → import from `shared/dateUtils.ts`
2. Audit `official/excelDataFiller.ts` — verify if `customizeExcelWithData` is called anywhere; if dead, schedule deletion
3. Move `writeCellSafe()` from `excelRewriter.ts` to `shared/excelUtils.ts`
4. Fix `SERVICE_COLUMNS` duplication in `excelDataFiller.ts`

### Phase 2: R414 Decomposition
5. Create `r414/R414EsfErSheet.ts` — extract ESF+ER logic from `R414TemplateService.ts`
6. Create `r414/R414Fc01Sheet.ts` — extract FC01 logic
7. Create `r414/R414Fc02Fc03Sheet.ts` — extract FC02+FC03 logic
8. Run `r414Pipeline.test.ts` after each extraction
9. Move R414 sections from `official/excelRewriter.ts` to delegate to `r414/` service

### Phase 3: IFE Stabilization
10. Add IFE pipeline integration test (prerequisite for safe IFE refactoring)
11. Split `IFETemplateService.ts` into IFE sheet service files

### Phase 4: Grupo NIIF Completion
12. Verify grupo template files exist in `public/templates/`
13. Implement Hoja1 filling for grupo1/2/3 in `excelRewriter.ts`
14. Add end-to-end grupo pipeline test
15. Validate one grupo package with XBRL Express

### Phase 5: Structural Cleanup
16. Move `preserveOriginalStructure()` from `officialTemplateService.ts` to `shared/zipBuilder.ts`
17. Rename/split `taxonomyConfig.ts` — move `ESF_CONCEPTS` to `grupos/mappings/esfConcepts.ts`
18. Trim `official/excelRewriter.ts` to pure dispatcher (~100 lines)

---

## Appendix: File Inventory

| File | Lines | Classification | Status |
|---|---|---|---|
| `official/excelRewriter.ts` | 2,463 | R414+IFE-specific (misplaced) | Split needed |
| `r414/R414TemplateService.ts` | 1,891 | R414-specific | Split needed |
| `official/excelDataFiller.ts` | 1,580 | Legacy SheetJS path | Audit/delete |
| `ife/IFETemplateService.ts` | 1,061 | IFE-specific | Split later |
| `taxonomyConfig.ts` | 812 | Grupo NIIF + shared | Rename/split |
| `r414/mappings/esfMappings.ts` | 622 | R414-specific | Correct location |
| `shared/baseTemplateService.ts` | 537 | Shared | Borderline OK |
| `official/excelDataFiller.ts` | 1,580 | Legacy | Audit |
| `r414/mappings/ppeMappings.ts` | 504 | R414-specific | Correct location |
| `officialTemplateService.ts` | 347 | Shared infra | Needs zipBuilder extract |
| `r414/mappings/esfMappings.ts` | 622 | R414-specific | Correct location |
| `types.ts` | 341 | Shared | Correct location |
| `grupos/grupoFcRewriter.ts` | 370 | Grupos-specific | Correct, OK size |
| `r414/mappings/fc01Mappings.ts` | 241 | R414-specific | Correct location |
| `shared/rewriterHelpers.ts` | 235 | Shared | Correct location |
| `shared/pucUtils.ts` | 340 | Shared | Correct location |
| `shared/excelUtils.ts` | 212 | Shared | Correct location |
| `shared/dateUtils.ts` | 73 | Shared | Correct, small |
| `grupos/grupoEsfErRewriter.ts` | 135 | Grupos-specific | Correct, small |
| `ife/config.ts` | 104 | IFE-specific | Correct, small |
| `r414/config.ts` | 68 | R414-specific | Correct, small |
| `grupos/index.ts` | 83 | Grupos | Correct, small |
| `grupos/mappings/index.ts` | 125 | Grupos | Correct, small |
| `ife/mappings/esfMappings.ts` | ~80 | IFE-specific | Correct, small |
| `ife/mappings/erMappings.ts` | ~60 | IFE-specific | Correct, small |
| `official/interfaces.ts` | 87 | Shared infra | Correct, small |
| `official/fileLoaders.ts` | ~50 | Shared infra | Correct, small |
| `official/templateCustomizers.ts` | ~80 | Shared infra | Correct, small |
| `official/templatePaths.ts` | ~120 | Shared infra | Correct, small |
| `index.ts` | 8 | Root API | Needs updating |
| `excelUtils.ts` (root) | 39 | Wrapper for safeNumericValue | Verify usage |
