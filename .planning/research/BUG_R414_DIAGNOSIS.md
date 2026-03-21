# Bug Diagnosis: R414 Empty Data

## Root Cause (Primary)

**DUAL TYPE SYSTEM MISMATCH: `options.consolidatedAccounts` vs `options.accounts`**

There are two separate `TemplateWithDataOptions` interfaces in the codebase, and R414 data flows through the path that uses `options.consolidatedAccounts` (optional), while `BaseTemplateService.fillExcelData()` calls `this.fillESFSheet()` with `options.accounts` (required, never undefined). These are different property names, different interfaces, and they never converge for R414.

**The smoking gun is at `excelRewriter.ts` line 156:**

```ts
if (!options.consolidatedAccounts || options.consolidatedAccounts.length === 0) {
  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);  // ← RETURNS EARLY with metadata-only workbook
}
```

`options.consolidatedAccounts` is the field used in `official/interfaces.ts` `TemplateWithDataOptions`. The router (`balance.ts` lines 522-545) correctly fetches accounts from DB and passes them as `consolidatedAccounts`. So this guard should pass when data exists.

**However**, the `R414TemplateService.fillESFSheet()` method (and `fillERSheet()`, etc.) are **never called** from `rewriteFinancialDataWithExcelJS()`. The entire R414 data-writing path in `excelRewriter.ts` uses **inline code** (the `if (options.niifGroup === 'r414')` blocks at lines 189–296 and 303–396), NOT the `R414TemplateService` class methods. The `r414TemplateService` singleton is only used for `fillHoja9Sheet()` and `fillHoja10Sheet()` (notes/policies, lines 1759/1764).

## Data Flow Trace

```
balance.ts: downloadOfficialTemplates (line 441)
  → DB query: consolidatedAccounts from workingAccounts table (line 521)
  → DB query: serviceBalancesData from serviceBalances table (line 532)
  → generateOfficialTemplatePackageWithData() in officialTemplateService.ts (line 135)
      → loadBinaryTemplate() loads .xlsx from public/templates/r414/
      → rewriteFinancialDataWithExcelJS(xlsxContent, options) ← options has consolidatedAccounts
          → GUARD at line 156: if (!options.consolidatedAccounts || length === 0) → EARLY RETURN
            (This guard PASSES if data was loaded, so data does reach the next step)
          → if (options.niifGroup === 'r414') at line 189:
              → Hoja2 (ESF): iterates R414_ESF_MAPPINGS, calls writeCellSafe() ← this RUNS
              → Hoja3 (ER):  iterates R414_ER_MAPPINGS, calls writeCellSafe() ← this RUNS
              → Hoja7 (PPE): processSectionWithZeroFill() ← this RUNS
              → Hoja16/17/18 (Gastos por servicio) ← this RUNS
              → Hoja22/23/24/25/26/30 (Consolidados, CxC) ← this RUNS
              → Hoja32/35 (Pasivos, conciliación) ← this RUNS
              → Hoja9/10 (Notas) via r414TemplateService ← this RUNS
          → preserveOriginalStructure() combines original xlsx + ExcelJS output
```

**The data DOES flow.** The `excelRewriter.ts` inline code runs for R414. But the output is empty in XBRL Express.

## IFE vs R414 Comparison

| Aspect | IFE (working) | R414 (broken) |
|--------|---------------|---------------|
| Entry condition guard | Same guard at line 156 | Same guard at line 156 |
| Data writing path | `if (options.niifGroup === 'ife')` block at line 1780 | `if (options.niifGroup === 'r414')` block at line 189 |
| Account data source | `options.consolidatedAccounts` (direct) | `options.consolidatedAccounts` (direct) |
| Account leaf filter | Uses `account.isLeaf` check | Uses `account.isLeaf` check |
| Template structure | IFE template has NO formulas (explicitly written by code) | R414 template HAS existing formulas that get overwritten |
| preserveOriginalStructure | Same call — restores workbook.xml, rels | Same call |

The key architectural difference: **IFE template starts with an empty Excel (no pre-existing values), so the code writes everything from scratch and the output is guaranteed correct.** For R414, the template has pre-existing formulas and values, and `writeCellSafe()` only writes cells where the calculated value != 0, leaving template placeholder values in other cells.

**Critical secondary difference**: IFE uses `IFETemplateService.fillESFSheet()` called from `baseTemplateService.fillExcelData()` which is called from `baseTemplateService.generateTemplatePackage()`. But this path is **NOT the active path for R414**. R414 goes through `officialTemplateService.ts` → `generateOfficialTemplatePackageWithData()` → `rewriteFinancialDataWithExcelJS()` with inline code. The `BaseTemplateService.generateTemplatePackage()` is NEVER called for R414 in the actual download flow.

**WAIT — IFE also goes through `generateOfficialTemplatePackageWithData()`** (same path). So IFE is also using the inline code at line 1780. This means:

Both IFE and R414 go through `rewriteFinancialDataWithExcelJS()`, but:
- IFE section (line 1780) uses `IFETemplateService` class methods via `ifeTemplateService` singleton
- R414 section (lines 189–1766) uses **pure inline code** duplicating logic from `R414TemplateService`

## Secondary Issues Found

### Issue 1: PUC prefix matching uses `isLeaf` flag which may be stale
- `excelRewriter.ts` lines 201, 222, 246, 274 check `if (!account.isLeaf) continue;`
- `baseTemplateService.ts` `sumAccountsByPrefix()` uses dynamic leaf detection (checks `codesWithChildren` set) NOT `isLeaf`
- The `isLeaf` flag in the DB comes from `workingAccounts.isLeaf` which is set at upload time
- If the uploaded Excel has pre-aggregated totals without sub-accounts, many accounts may have incorrect `isLeaf = false`, causing them to be skipped
- **IFE is not immune** to this, but IFE uses `sumServiceAccountsByPrefix()` from `BaseTemplateService` which also uses dynamic leaf detection

### Issue 2: R414 ESF mappings use very specific 6-digit PUC prefixes
At `r414/mappings/esfMappings.ts` line 73–81, rows 19-20 require exact 6-digit codes like `'131801'`, `'131802'`, etc. If the uploaded balance uses shorter codes (e.g., `'131802'` summarized as `'1318'`), these rows will show zero. This is a data quality issue, not a code bug.

### Issue 3: `baseTemplateService.ts` `fillExcelData()` uses `options.accounts` (wrong field)
At `baseTemplateService.ts` lines 154–157:
```ts
this.fillESFSheet(
  esfSheet,
  options.accounts,       // ← 'accounts' from types.ts TemplateWithDataOptions
  options.serviceBalances,
  options.distribution
);
```
The `types.ts` `TemplateWithDataOptions` has `accounts: AccountData[]` (required, never optional).
The `interfaces.ts` `TemplateWithDataOptions` has `consolidatedAccounts?: AccountData[]` (optional).
These are **two different interfaces with the same name**. `BaseTemplateService` imports from `types.ts`, while `rewriteFinancialDataWithExcelJS()` uses `interfaces.ts`. If `generateTemplatePackage()` were called directly, `options.accounts` would be `undefined` because the router passes `consolidatedAccounts`. This path is currently UNUSED for R414 (the router goes through `generateOfficialTemplatePackageWithData()` instead), but it is a latent bug.

### Issue 4: `excelDataFiller.ts` still uses SheetJS (XLSX library)
`excelDataFiller.ts` line 20: `import * as XLSX from 'xlsx';`
Comments in `officialTemplateService.ts` (lines 164-168) and the `preserveOriginalStructure()` function explicitly document that SheetJS destroys the internal xlsx structure (eliminates sharedStrings.xml, reduces styles.xml). `excelDataFiller.ts` appears to be dead code (its export `customizeExcelWithData` is not called in the R414 path), but its presence is a risk if someone wires it in.

### Issue 5: `r414TemplateService` singleton used only for Hoja9/Hoja10 in `excelRewriter.ts`
Lines 1758–1765 use `r414TemplateService.fillHoja9Sheet()` and `fillHoja10Sheet()` passing a locally constructed `r414Opts` object. This object passes `options.consolidatedAccounts || []` as `accounts` — but `fillHoja9Sheet()` (in `R414TemplateService.ts`) expects `AccountData[]` and accesses `account.isLeaf`. Since the cast is `as R414Options` (from `types.ts` `TemplateWithDataOptions`), the field mapping is:
- `r414Opts.accounts = options.consolidatedAccounts || []` ← correct, accounts are present
- `r414Opts.serviceBalances = options.serviceBalances || []` ← correct
- `r414Opts.distribution = {}` ← **EMPTY OBJECT** — no distribution percentages passed

### Issue 6: `matchesPrefixes` in `excelRewriter.ts` uses `account.isLeaf` but `baseTemplateService.ts` uses dynamic detection
In `excelRewriter.ts` lines 201, 222, 246 etc.: `if (!account.isLeaf) continue;`
In `baseTemplateService.ts` `sumAccountsByPrefix()` (line 263): `const hasMoreSpecificAccount = codesWithChildren.has(account.code);`

The inline code in `excelRewriter.ts` trusts the `isLeaf` DB flag, while `BaseTemplateService` computes it dynamically. If a balance has been loaded from an Excel where parent accounts also appear as leaf entries (pre-aggregated format), the `isLeaf` flag may be wrong for some accounts, causing those accounts to be excluded from R414 calculations but included in IFE calculations.

## Recommended Fixes

### Fix 1 (CRITICAL — Data Verification): Add diagnostic logging before the early-return guard
**File**: `I:\Proyectos2025\xbrl-generator\app\src\lib\xbrl\official\excelRewriter.ts` line 155-159

Temporarily add logging to confirm whether `consolidatedAccounts` is actually populated when the R414 download is triggered:

```ts
console.log(`[ExcelJS] niifGroup=${options.niifGroup} consolidatedAccounts=${options.consolidatedAccounts?.length ?? 'undefined'} serviceBalances=${options.serviceBalances?.length ?? 'undefined'}`);
if (!options.consolidatedAccounts || options.consolidatedAccounts.length === 0) {
```

If this log shows `consolidatedAccounts=0` or `consolidatedAccounts=undefined`, then the DB query is returning no data — the issue is upstream (no balance uploaded, or session pointing to wrong data).

### Fix 2 (CRITICAL — isLeaf consistency): Replace `account.isLeaf` check in `excelRewriter.ts` with dynamic detection
**File**: `I:\Proyectos2025\xbrl-generator\app\src\lib\xbrl\official\excelRewriter.ts`

All occurrences of `if (!account.isLeaf) continue;` in the inline R414 matching code (lines 200, 222, 247, 274, 325) should use the same dynamic leaf detection that `BaseTemplateService.sumAccountsByPrefix()` uses. Pre-compute `codesWithChildren` set once before the mapping loops, same as lines 241-245 in `baseTemplateService.ts`.

### Fix 3 (MEDIUM — Interface unification): Unify the two `TemplateWithDataOptions` interfaces
There are currently two files defining `TemplateWithDataOptions`:
- `app/src/lib/xbrl/types.ts` line 188: has `accounts: AccountData[]` (required)
- `app/src/lib/xbrl/official/interfaces.ts` line 53: has `consolidatedAccounts?: AccountData[]` (optional)

Either:
a) Rename `types.ts` version to `BaseTemplateWithDataOptions` and have `interfaces.ts` version be the authoritative one for the download path, OR
b) Add `consolidatedAccounts` as an alias to `types.ts` and update `baseTemplateService.ts` to read from `consolidatedAccounts ?? accounts`

**File**: `I:\Proyectos2025\xbrl-generator\app\src\lib\xbrl\shared\baseTemplateService.ts` lines 152-157 — change `options.accounts` to `options.consolidatedAccounts ?? options.accounts` if the types are reconciled.

### Fix 4 (LOW — Dead code): Either wire or remove `excelDataFiller.ts`
**File**: `I:\Proyectos2025\xbrl-generator\app\src\lib\xbrl\official\excelDataFiller.ts`
This file uses SheetJS which destroys xlsx structure. It is currently dead code (not called in any active path). It should either be deleted or marked with a prominent comment warning that it must NOT be used.

### Fix 5 (LOW — Missing distribution): Pass actual distribution to `r414Opts` in Hoja9/Hoja10
**File**: `I:\Proyectos2025\xbrl-generator\app\src\lib\xbrl\official\excelRewriter.ts` lines 1747-1755

Change:
```ts
const r414Opts = {
  ...
  distribution: {},  // ← BUG: empty, no service percentages
} as R414Options;
```
To:
```ts
const r414Opts = {
  ...
  distribution: options.activeServices
    ? Object.fromEntries(options.activeServices.map(s => [s, 1]))
    : {},
} as R414Options;
```

## Summary: Most Likely Scenario for "Empty Data"

The most likely actual cause (in order of probability):

1. **The `isLeaf` flag is filtering out all accounts** because the uploaded balance has a format where leaf accounts are flagged as non-leaf in the DB. The `excelRewriter.ts` inline code for R414 uses `!account.isLeaf` to skip accounts, while `BaseTemplateService` uses dynamic leaf detection. If all accounts have `isLeaf = false`, ALL cells will compute as 0 and `writeCellSafe()` will skip them (due to `if (totalValue !== 0)` guards on lines 208 and 228).

2. **The `consolidatedAccounts` guard fires** because the session was in `uploaded` status (not `distributed`), so `serviceBalances` table is empty and `consolidatedAccounts` may also be zero rows. Check if distribution step was completed before downloading.

3. **PUC prefix mismatch**: The uploaded balance uses a different PUC numbering than the R414 mappings expect (e.g., 6-digit subcodes like `131802` vs. `1318` summary code). The strict prefix matching in `esfMappings.ts` rows 19-20 would produce zeros. However, this would only affect those specific rows, not all data.

4. **template path resolution failure**: If `public/templates/r414/` does not contain the template files, `loadBinaryTemplate()` throws. But this would cause an error (exception), not silent empty output.
