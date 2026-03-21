# Research: Grupos NIIF 1, 2, 3 and Resolución 533 — Implementation Requirements

**Author**: Claude Sonnet 4.6 (Domain Research Agent)
**Date**: 2026-03-21
**Branch**: claude/magical-chaplygin
**Codebase state**: R414 production-ready, IFE 95% complete, Grupos partially implemented

---

## Table of Contents

1. [Template Files by Group](#1-template-files-by-group)
2. [Sheet Structure by Group](#2-sheet-structure-by-group)
3. [Existing PUC Mappings in Codebase](#3-existing-puc-mappings-in-codebase)
4. [NIIF Group Differences](#4-niif-group-differences)
5. [Grupo 3 vs R414 Account Structure](#5-grupo-3-vs-r414-account-structure)
6. [grupoEsfErRewriter.ts — Functional Assessment](#6-grupoesfErrRewriterts--functional-assessment)
7. [Resolución 533 — Research Findings](#7-resolución-533--research-findings)
8. [Implementation Gap Analysis](#8-implementation-gap-analysis)
9. [Feasibility Summary](#9-feasibility-summary)

---

## 1. Template Files by Group

All template files are confirmed present in `app/public/templates/`. Each group has a complete 4-file set in `.xbrl`, `.xbrlt`, `.xlsx`, `.xml` format.

### Grupo 1 (`app/public/templates/grupo1/`)

| File | Description |
|------|-------------|
| `Grupo1_Individual_Directo_ID20037_2024-12-31.xlsx` | Excel template — 66 sheets, ~195 KB |
| `Grupo1_Individual_Directo_ID20037_2024-12-31.xml` | XBRL Express cell-to-concept mapping |
| `Grupo1_Individual_Directo_ID20037_2024-12-31.xbrlt` | XBRL template with contexts and dimensions |
| `Grupo1_Individual_Directo_ID20037_2024-12-31.xbrl` | Entry point instance (small, references .xsd on SUI) |

The filename suffix `Directo` indicates this template uses the **direct method** for the Statement of Cash Flows (EFE Directo). There is no `Indirecto` variant for Grupo 1 in the current templates folder; XBRL Express can also generate the indirect method variant via `PuntoEntrada_G1_Individual-2024-EFEIndirecto.xsd`.

### Grupo 2 (`app/public/templates/grupo2/`)

| File | Description |
|------|-------------|
| `Grupo2_Individual_Indirecto_ID20037_2024-12-31.xlsx` | Excel template — 45 sheets, ~150 KB |
| `Grupo2_Individual_Indirecto_ID20037_2024-12-31.xml` | XBRL Express cell-to-concept mapping |
| `Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrlt` | XBRL template with contexts and dimensions |
| `Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrl` | Entry point instance |

The filename suffix `Indirecto` indicates this template uses the **indirect method** for EFE. Unlike Grupo 1, the `templatePaths.ts` code hardcodes the indirect variant for Grupo 2, which means a user requiring the direct method would need a different template. This is a known gap.

### Grupo 3 (`app/public/templates/grupo3/`)

| File | Description |
|------|-------------|
| `Grupo3_ID20037_2024-12-31.xlsx` | Excel template — 30 sheets, ~90 KB |
| `Grupo3_ID20037_2024-12-31.xml` | XBRL Express cell-to-concept mapping |
| `Grupo3_ID20037_2024-12-31.xbrlt` | XBRL template with contexts and dimensions |
| `Grupo3_ID20037_2024-12-31.xbrl` | Entry point instance |

Grupo 3 has no EFE suffix in the filename — the microenterprise taxonomy does not separate cash flow methods. The smaller template size (90 KB vs 195 KB for Grupo 1) reflects the significantly simpler structure.

### Entry Point URLs (from `taxonomyConfig.ts`)

```
Grupo 1: http://www.sui.gov.co/xbrl/Corte_2024/grupo1/PuntoEntrada_G1_Individual-2024-EFEDirecto.xsd
Grupo 2: http://www.sui.gov.co/xbrl/Corte_2024/grupo2/PuntoEntrada_G2_Individual-2024-EFEDirecto.xsd
Grupo 3: http://www.sui.gov.co/xbrl/Corte_2024/grupo3/PuntoEntrada_G3_Individual-2024-EFEDirecto.xsd
```

The `getEntryPointUrl()` function in `taxonomyConfig.ts` correctly generates year-dynamic URLs for all three groups, appending `-EFEDirecto` or `-EFEIndirecto` based on `cashFlowType` parameter.

---

## 2. Sheet Structure by Group

Source: `docs/analisis_comparativo_niif.md` + `app/src/lib/xbrl/official/templatePaths.ts` SHEET_MAPPING.

### Sheet Count Summary

| Group | Total Sheets | Automatable Sheets | Manual/Notes Sheets |
|-------|-----------:|------------------:|-------------------:|
| Grupo 1 (NIIF Plenas) | 66 | ~15 | ~51 |
| Grupo 2 (NIIF PYMES) | 45 | ~11 | ~34 |
| Grupo 3 (Microempresas) | 30 | ~8 | ~22 |
| R414 (Sector Público) | 43 | ~11 | ~32 |

### Grupo 1 — Mapped Sheets in SHEET_MAPPING

```
Hoja1   [110000]  Información general
Hoja2   [210000]  Estado de Situación Financiera (ESF)
Hoja3   [310000]  Estado de Resultados (ER)
Hoja38  [900017a] FC01-1 Gastos Acueducto
Hoja39  [900017b] FC01-2 Gastos Alcantarillado
Hoja40  [900017c] FC01-3 Gastos Aseo
Hoja44  [900017g] FC01-7 Gastos Total (Consolidado)
Hoja45  [900019]  FC02 Complementario ingresos
Hoja46  [900021]  FC03-1 CXC Acueducto (por estrato)
Hoja47  [900022]  FC03-2 CXC Alcantarillado (por estrato)
Hoja48  [900023]  FC03-3 CXC Aseo (por estrato)
Hoja54  [900028]  FC05 Acreedores (texto, no numérico)
Hoja55  [900028b] FC05b Pasivos por edades de vencimiento
Hoja58  [900031]  FC08 Conciliación ingresos
Hoja59  [900032]  FC09 Detalle costo ventas
```

Hojas 4–37, 41–43, 49–53, 56–57, 60–66 contain EFE (Cash Flow), ECPN (Equity Changes), ORI (Other Comprehensive Income), and approximately 40+ note disclosure sheets that require manual input by the accountant.

### Grupo 2 — Mapped Sheets in SHEET_MAPPING

```
Hoja1   [110000]  Información general
Hoja2   [210000]  ESF
Hoja3   [310000]  ER
Hoja18  [900017a] FC01-1 Gastos Acueducto
Hoja19  [900017b] FC01-2 Gastos Alcantarillado
Hoja20  [900017c] FC01-3 Gastos Aseo
Hoja24  [900017g] FC01-7 Gastos Total
Hoja25  [900019]  FC02 Complementario ingresos
Hoja26  [900021]  FC03-1 CXC Acueducto
Hoja27  [900022]  FC03-2 CXC Alcantarillado
Hoja28  [900023]  FC03-3 CXC Aseo
```

Grupo 2 has NO FC05b (pasivos por edades) and NO FC08 (conciliación ingresos) — these are Grupo 1 exclusive sheets.

### Grupo 3 — Mapped Sheets in SHEET_MAPPING

```
Hoja1   [110000]  Información general
Hoja2   [210000]  ESF
Hoja3   [310000]  ER
Hoja10  [900017a] FC01-1 Gastos Acueducto
Hoja11  [900017b] FC01-2 Gastos Alcantarillado
Hoja12  [900017c] FC01-3 Gastos Aseo
Hoja16  [900017g] FC01-7 Gastos Total
Hoja17  [900019]  FC02 Complementario ingresos
```

Grupo 3 has NO FC03 (CxC por estrato), NO FC05b, and NO FC08. It is the simplest structure: only ESF + ER + FC01 + FC02 are auto-fillable.

### Key Observations

- The same XBRL codes (`900017a`, `900017b`, etc.) map to different Excel sheet numbers across groups. This is handled correctly in `SHEET_MAPPING` in `templatePaths.ts`.
- All groups share `Hoja1`, `Hoja2`, `Hoja3` for general info, ESF and ER respectively.
- Grupo 1's FC sheets start at Hoja38 because sheets 4–37 are EFE, ECPN, ORI, and notes (required by NIIF Full).
- Grupo 2's FC sheets start at Hoja18 — fewer intermediate sheets than Grupo 1.
- Grupo 3's FC sheets start at Hoja10 — very compact structure.

---

## 3. Existing PUC Mappings in Codebase

### ESF (Estado de Situación Financiera) — `taxonomyConfig.ts`

The `ESF_CONCEPTS` array in `taxonomyConfig.ts` contains **full PUC → XBRL concept mappings for Grupo 1** (70 rows covering Assets, Liabilities, Equity). These are shared by all three Grupos via the `findESFConceptByPUC()` function and `rewriteGrupoESF()` in `grupoEsfErRewriter.ts`.

The PUC codes used are **NIIF private sector PUC** (1-digit class + sub-account notation):
- Class 1 (Assets): `11`, `1110`, `13`, `1305`, `1310`, `14`, `15`, `16`, `17`, `19`, etc.
- Class 2 (Liabilities): `21`, `22`, `2205`, `24`, `25`, `26`, `27`, `28`, etc.
- Class 3 (Equity): `31`, `32`, `33`, `34`, `35`, `36`, `37`, `38`, etc.

The `PUC_TO_XBRL_MAP` record provides additional prefix-to-concept lookups.

### ER (Estado de Resultados) — `grupos/mappings/index.ts`

```typescript
// GRUPO_ER_MAPPINGS — 7 line items
Row 15: Ingresos actividades ordinarias   → pucPrefixes: ['41']
Row 16: Otros ingresos operacionales      → pucPrefixes: ['42']
Row 17: Costo de ventas                   → pucPrefixes: ['61']
Row 21: Gastos de administración          → pucPrefixes: ['51']
Row 22: Gastos de ventas                  → pucPrefixes: ['52']
Row 25: Gastos financieros                → pucPrefixes: ['53']
Row 26: Ingresos financieros              → pucPrefixes: ['4210']
```

These rows are **the same for Grupo 1, 2 and 3** — the ER structure is identical across all three groups in terms of cell positions. This is a simplification; the actual Grupo 1 template has more ER line items than Grupo 3, but the mapped rows cover the automatable portion.

### FC01 (Gastos por Servicio) — `grupos/mappings/index.ts`

```typescript
// GRUPO_FC01_EXPENSE_MAPPINGS — 10 rows (rows 13–22)
Row 13: Sueldos y salarios       → ['5105', '510506', '510503', '510509']
Row 14: Prestaciones sociales    → ['5110', '5115', '5120', '5125']
Row 15: Servicios públicos       → ['5135', '513525', '513530']
Row 16: Seguros                  → ['5130']
Row 17: Servicios técnicos       → ['5140', '5145']
Row 18: Mantenimiento            → ['5150', '515005', '515010']
Row 19: Depreciaciones           → ['5260', '526005', '526010']
Row 20: Amortizaciones           → ['5265']
Row 21: Transporte y viajes      → ['5165', '5170']
Row 22: Otros gastos             → ['5195', '5295']
```

Cost rows (`fc01CostRow: 18`) map PUC class 6 to column F. These mappings are shared across Grupo 1/2/3. `GRUPO_FC01_ZERO_F_ROWS` zeroes out column F for non-cost rows to avoid contamination.

### What is NOT Mapped

The following items from the Grupo FC sheets are **not yet implemented** in the codebase:

| Sheet | Content | Status |
|-------|---------|--------|
| Hoja59 / FC09 [900032] | Detalle costo de ventas | Not mapped, not called |
| FC01 aseo disposal row | Row for disposición final Aseo | `fc01AseoDisposalRow: null` in `getGrupoConfig()` |
| Grupo 1 Hoja4–Hoja9 | EFE (Cash Flow Statement) | No auto-fill; manual |
| Grupo 1 Hoja10–Hoja15 | ECPN, ORI | No auto-fill; manual |

---

## 4. NIIF Group Differences

### Regulatory Framework

| Aspect | Grupo 1 | Grupo 2 | Grupo 3 |
|--------|---------|---------|---------|
| Standard | NIIF Plenas (Full IFRS) | NIIF para PYMES (IFRS for SMEs) | Contabilidad Simplificada (microenterprise) |
| Target entities | Large public-interest entities, large ESP | Mid-size ESP not in Grupo 1 | Small/micro ESP |
| XBRL namespace | `niif/ef/core/2024-12-31` | `niif/ef/pymes/2024-12-31` | `niif/ef/micro/2024-12-31` |
| XBRL prefix | `co-sspd-ef-Grupo1` | `co-sspd-ef-Grupo2` | `co-sspd-ef-Grupo3` (or `co-sspd-ef-G3`) |
| Sheet count | 66 | 45 | 30 |

### Financial Statement Structure Differences

| Statement | Grupo 1 | Grupo 2 | Grupo 3 |
|-----------|---------|---------|---------|
| ESF (Balance) | Full corriente/no corriente split, 55+ concepts | Simplified split, ~35 concepts | Minimal split, ~20 concepts |
| ER (Results) | Multi-line with ORI | Simplified, no ORI separation | Single-column, minimal |
| EFE (Cash Flow) | Direct OR indirect method | Indirect method | Simplified (often absent) |
| ECPN (Equity changes) | Full matrix | Simplified | Not required |
| Revelaciones (Notes) | ~40 notes sheets | ~20 notes sheets | ~10 notes sheets |
| FC03 (CxC by stratum) | Required | Required | NOT required |
| FC05b (Aging payables) | Required | NOT required | NOT required |
| FC08 (Income reconciliation) | Required | NOT required | NOT required |

### Column Layout (Common to All Groups)

All three groups use the **same service column layout** in ESF and ER:
- Column I = Total consolidado
- Column J = Acueducto
- Column K = Alcantarillado
- Column L = Aseo
- Columns M–P = Energía, Gas, GLP, Otras (if applicable)

This differs from R414 which uses I/J/K for services and P for total.

---

## 5. Grupo 3 vs R414 Account Structure

### Critical Difference

**Grupo 3 uses NIIF private-sector PUC codes. R414 uses the public-sector PUC (Resolución 414).**

| Aspect | Grupo 3 | R414 |
|--------|---------|------|
| Account standard | NIIF simplified (private) | Resolución 414 de 2014 (public sector) |
| Class 1 sub-accounts | `11`, `13`, `14`, `15`, `16` | `1105`, `1110`, `1205`, `1305`, `1605`, `1615`, `1620` etc. |
| Class 5 (Expenses) | `51`, `52`, `53` | `51`, `52`, `53` (similar but more granular) |
| Class 4 (Income) | `41`, `42` | `41`, `42`, `48` (transfers) |
| ESF structure | Corriente/No corriente | Specific public-sector accounts |
| Who uses it | Small private ESP | Public entities, municipalities |

The key implication: **the same ESF_CONCEPTS and GRUPO_ER_MAPPINGS used for Grupo 1 and Grupo 2 also apply to Grupo 3**, because all three use private-sector NIIF PUC. An entity using R414 has a completely different PUC chart and cannot use Grupo 1/2/3 templates.

The codebase correctly handles this — `rewriteGrupoESF()` and `rewriteGrupoER()` use the same mappings for all three private groups, while R414 has its own separate mapping in `r414/mappings/esfMappings.ts` and `erMappings.ts`.

---

## 6. grupoEsfErRewriter.ts — Functional Assessment

**Verdict: The rewriter is functionally implemented and correctly wired, but untested end-to-end.**

### What Works

The file at `app/src/lib/xbrl/grupos/grupoEsfErRewriter.ts` is **not a stub** — it contains full working logic:

1. `rewriteGrupoESF()`: Iterates `ESF_CONCEPTS`, calls `findESFConceptByPUC()` for each account, sums values by concept, and writes to the correct row in Hoja2 for both total (column I) and per-service columns (J/K/L).

2. `rewriteGrupoER()`: Iterates `GRUPO_ER_MAPPINGS`, matches by PUC prefix, writes to Hoja3.

3. Both functions use `workbook.getWorksheet('Hoja2')` and `workbook.getWorksheet('Hoja3')` — these sheet names are shared across all three groups (confirmed in SHEET_MAPPING).

### The Dispatch Chain (Confirmed Working)

```
excelRewriter.ts:1771
  └─ if (options.niifGroup === 'grupo1' || 'grupo2' || 'grupo3')
       └─ rewriteGrupoData(workbook, options)   [grupos/index.ts]
            ├─ rewriteGrupoESF(...)              [grupoEsfErRewriter.ts]
            ├─ rewriteGrupoER(...)               [grupoEsfErRewriter.ts]
            ├─ rewriteGrupoFC01(...)             [grupoFcRewriter.ts]
            ├─ rewriteGrupoFC02(...)             [grupoFcRewriter.ts]
            ├─ rewriteGrupoFC03(...)             [grupoFcRewriter.ts]
            ├─ rewriteGrupoFC05b(...)            [grupoFcRewriter.ts]
            └─ rewriteGrupoFC08(...)             [grupoFcRewriter.ts]
```

The dispatch is complete and all FC sub-functions are implemented. The orchestration in `grupos/index.ts:rewriteGrupoData()` is fully wired.

### Potential Issues (Not Bugs, but Risks)

1. **ESF row numbers assumed identical across groups**: The `ESF_CONCEPTS` rows (15–70) are defined once in `taxonomyConfig.ts` and reused for Grupo 1/2/3. This is valid if the actual Excel templates have the same row layout for ESF in Hoja2. Given all three use `Hoja2` for ESF with the same XBRL concepts, the row numbers should be consistent, but this has not been verified by running against real XBRL Express validation.

2. **ER row numbers**: `GRUPO_ER_MAPPINGS` hardcodes rows 15, 16, 17, 21, 22, 25, 26. These match Grupo 1's ER structure and are assumed to be the same for Grupo 2 and 3.

3. **FC01 cost row**: `getGrupoConfig()` returns `fc01CostRow: 18` for all groups. This is a fixed constant not verified per-group against the actual templates.

4. **FC02 ingresos column references**: `rewriteGrupoFC02()` reads `sheet3.getCell('J15')`, `K15`, `L15` — the same source cells for all groups. Valid only if ER row 15 (Ingresos actividades ordinarias) is consistently at row 15 in Hoja3 for all groups.

5. **Hoja1 metadata**: `excelRewriter.ts` fills Hoja1 cells `C4`, `E12–E19` for grupo1/2/3 using the same R414 cell addresses. These likely differ between groups — Hoja1 for Grupo 1 may have different cell layout than R414's Hoja1.

---

## 7. Resolución 533 — Research Findings

### What is Resolución 533?

**Resolución 533 de 2015** was issued by the **Contaduría General de la Nación (CGN)** — not SSPD — and incorporates the "Marco Normativo para Entidades de Gobierno" (Government Entities Accounting Framework) into the Public Accounting Regime.

### Which Entities Use R533?

R533 applies to **government entities** (entidades de gobierno) within Colombia's public accounting regime, including:
- Municipalities (municipios) that operate water/sanitation as a direct municipal service rather than through a separate ESP
- Departments (departamentos) providing public utility services directly
- Government-organized public utility enterprises (empresas industriales y comerciales del Estado — EICE) that fall under the government accounting regime rather than NIIF private standards

Critically: **most formal ESP (Empresas de Servicios Públicos) are private companies and do NOT use R533**. They use Grupo 1, 2, or 3. R533 is specifically for municipal/government entities that haven't incorporated as separate ESPs.

### Does SSPD Require XBRL for R533?

**Yes — SSPD has published a separate XBRL taxonomy for R533 entities.** The web research confirms that SSPD developed 5 taxonomies covering all regulatory frameworks, including R533. The taxonomy exists at the SUI.

The `taxonomyConfig.ts` already has the R533 entry configured:

```typescript
r533: {
  name: 'Resolución 533 - Marco Normativo',
  prefix: 'co-sspd-ef-R533',
  namespace: 'http://www.superservicios.gov.co/xbrl/niif/ef/r533/2024-12-31',
  entryPoint: 'http://www.sui.gov.co/xbrl/Corte_2024/r533/PuntoEntrada_R533_Individual-2024-EFEDirecto.xsd',
  ...
}
```

### URL Pattern for R533 Entry Points

Based on the pattern in `taxonomyConfig.ts` and `getEntryPointUrl()`:

```
http://www.sui.gov.co/xbrl/Corte_{YEAR}/r533/PuntoEntrada_R533_{ReportType}-{YEAR}-EFEDirecto.xsd
http://www.sui.gov.co/xbrl/Corte_{YEAR}/r533/PuntoEntrada_R533_{ReportType}-{YEAR}-EFEIndirecto.xsd
```

Note: This differs from R414 (which uses `res414` not `r414` and has no EFE suffix). R533 appears to follow the same pattern as Grupo 1/2/3.

### R533 Financial Statements vs R414 and Grupos

| Statement | R533 (Government) | R414 (Public ESP) | Grupos 1/2/3 (Private ESP) |
|-----------|-------------------|-------------------|---------------------------|
| ESF | Estado de Situación Financiera | Estado de Situación Financiera | Estado de Situación Financiera |
| ER | Estado de Actividad Financiera, Económica, Social y Ambiental | Estado de Resultados | Estado de Resultados |
| EFE | Estado de Flujo de Efectivo | Estado de Flujo de Efectivo | Estado de Flujo de Efectivo |
| ECPN | Estado de Cambios en el Patrimonio | Estado de Cambios en el Patrimonio | Estado de Cambios en el Patrimonio |
| Presupuesto | **Required** — Estado de Ejecución Presupuestal | Not required | Not required |
| PUC | **Marco Normativo Gobierno** (CGN catalog) | Resolución 414 PUC | NIIF private-sector PUC |

The key structural difference for R533 is:
1. The account codes are from the **Marco Normativo para Entidades de Gobierno** — completely different from both R414 PUC and NIIF private PUC
2. Requires budget execution statements (ejecución presupuestal) that R414 and Grupos do not
3. Income statement concept is "actividad financiera, económica, social y ambiental" (not simply ER)

### R533 Template Files

There are **no R533 template files** in the codebase. The `TEMPLATE_PATHS` in `templatePaths.ts` explicitly marks r533 as empty:

```typescript
r533: {
  xbrlt: '',
  xml:   '',
  xlsx:  '',
  xbrl:  '',
  basePrefix: 'R533_Individual',
  outputPrefix: 'R533_Individual',
},
```

And `SHEET_MAPPING.r533` is `{}` (empty object).

---

## 8. Implementation Gap Analysis

### Grupo 1 — What's Missing

| Gap | Severity | Effort |
|-----|----------|--------|
| Hoja1 cell addresses for Grupo 1 differ from R414 | **High** — wrong metadata will fail XBRL Express validation | Low (verify + fix cell addresses) |
| ER row numbers need verification against actual template | **Medium** — if rows differ from hardcoded values | Low (open xlsx, check) |
| FC01 cost row (`fc01CostRow: 18`) needs verification | **Medium** — may differ between Grupo1/Grupo2/Grupo3 | Low (open xlsx, check) |
| FC02 income source cell references | **Medium** — reads J/K/L15 from Hoja3, needs verification | Low (open xlsx, check) |
| ESF row numbers (same for all groups) | **Medium** — assumed identical, unverified | Low (open xlsx, check) |
| No EFE (Cash Flow) auto-fill | **Low** — accepted limitation, manual | High (not in scope) |
| FC09 (Costo ventas detail) not implemented | **Low** — sheet exists in SHEET_MAPPING but not called | Medium |
| End-to-end XBRL Express validation not done | **High** — unknown if output passes validation | Test effort only |

**Summary**: Grupo 1 is ~70% implemented. The core data-writing logic is complete. What remains is: (a) verifying cell addresses against actual templates, (b) fixing any discovered mismatches, and (c) running XBRL Express validation.

### Grupo 2 — What's Missing

| Gap | Severity | Effort |
|-----|----------|--------|
| Same Hoja1 cell address question as Grupo 1 | **High** | Low |
| Template uses Indirecto; entry point URL needs to match | **Medium** — `templatePaths.ts` uses "Indirecto" but `taxonomyConfig.ts` defaults to "directo" | Low (align constants) |
| FC03 present (CxC by stratum) — same as Grupo 1 | OK — already implemented in `rewriteGrupoFC03()` | — |
| FC05b and FC08 absent — correct per group | OK — `getGrupoConfig()` returns null for these | — |
| End-to-end XBRL Express validation not done | **High** | Test effort only |

**Summary**: Grupo 2 is ~65% implemented. Primary gap is the Directo/Indirecto mismatch between the template file and the URL pattern, plus the same cell verification work as Grupo 1.

### Grupo 3 — What's Missing

| Gap | Severity | Effort |
|-----|----------|--------|
| Hoja1 cell addresses | **High** | Low |
| ESF/ER row verification | **Medium** | Low |
| FC03 correctly absent | OK | — |
| No FC05b, FC08 — correct | OK | — |
| FC01 aseo disposal row is null — may cause incomplete fill | **Low** — Grupo 3 ESP with aseo may be missing a row | Low (verify) |
| End-to-end XBRL Express validation not done | **High** | Test effort only |

**Summary**: Grupo 3 is the simplest and closest to complete — approximately **75% implemented**. Fewer sheets to fill, no FC03/FC05b/FC08 complications.

### Common Gap Across All Groups: Hoja1 Cell Layout

The most critical unresolved issue is `excelRewriter.ts` lines 135–153:

```typescript
} else if (options.niifGroup !== 'ife') {
  // Para grupo1/2/3: llenar metadatos básicos con ExcelJS
  const sheet1 = workbook.getWorksheet('Hoja1');
  if (sheet1) {
    writeCellSafe(sheet1, 'C4', options.companyId);
    writeCellSafe(sheet1, 'E12', options.companyName);
    writeCellSafe(sheet1, 'E13', options.companyId);
    writeCellSafe(sheet1, 'E14', options.nit);
    writeCellSafe(sheet1, 'E18', options.reportDate);
    writeCellSafe(sheet1, 'E19', roundingLabels[...]);
  }
}
```

This uses the **same cell addresses as R414's Hoja1** for all three Grupos. R414 Hoja1 cell layout (`E12`=companyName, `E13`=RUPS, etc.) was empirically verified by field testing. The Grupo 1/2/3 Hoja1 cell layout has **not been independently verified**. If the Grupo templates have metadata at different cells, the XBRL Express validation will fail on the info sheet.

**Action required**: Open each grupo template xlsx and confirm cell addresses for company name, RUPS ID, NIT, report date, and rounding degree.

---

## 9. Feasibility Summary

### Grupos 1, 2, 3 — Feasibility: HIGH

**The implementation is substantially done.** The following work remains:

1. **Cell address verification** (~2h): Open each template xlsx, locate Hoja1 metadata cells, verify ESF/ER row numbers, and confirm FC01 cost row. Update any discrepancies in `excelRewriter.ts` and `grupos/mappings/index.ts`.

2. **Directo/Indirecto alignment for Grupo 2** (~1h): The template file is `Indirecto` but `taxonomyConfig.ts` defaults to `directo`. Either obtain the Directo template or align the default to Indirecto. Also consider whether the UI should expose this choice.

3. **XBRL Express end-to-end test** (~4h per group): Generate an output ZIP for each group with known test data, load into XBRL Express, validate, fix any errors. This is the critical path.

4. **FC09 (optional, ~4h)**: Implement the Grupo 1 FC09 Costo de Ventas sheet (currently skipped). Low business impact as the main automatable sheets are already covered.

**Estimated total effort to production-ready**: 15–25 hours (primarily validation and testing).

### Resolución 533 — Feasibility: LOW (Out of Scope for This Project)

R533 is **not feasible to implement** within this project's scope for the following reasons:

1. **No template files exist** — Unlike Grupos 1/2/3 which already have `.xlsx`, `.xml`, `.xbrlt`, `.xbrl` files, R533 has none. Obtaining official templates requires downloading from SUI or generating via XBRL Express with a real R533-classified entity.

2. **Different PUC** — R533 uses the Marco Normativo para Entidades de Gobierno account codes (issued by Contaduría General de la Nación), which are completely different from the NIIF private-sector PUC used by Grupos 1/2/3 and the R414 public-sector PUC. New mappings from scratch would be required.

3. **Different user base** — R533 entities are municipalities and government bodies, not private ESP companies. The current user flow (upload balance, distribute by service, generate XBRL) is oriented toward private ESP. Municipal entities have additional requirements (presupuesto execution statements) that the current UI and backend do not support.

4. **Budget statements required** — R533 requires `Estado de Ejecución Presupuestal` — a budget execution statement with no equivalent in the current codebase.

5. **Scope mismatch** — The project's stated purpose (private ESP companies, NIIF Grupos 1/2/3/R414) does not include government municipal entities. The `r533` type already exists in `NiifGroup` and `taxonomyConfig.ts` as a placeholder but with empty template paths and no sheet mappings, correctly signaling it is not yet implemented.

**Recommendation**: R533 should remain as a placeholder in the type system but should not be selectable in the UI until a full implementation plan (separate from Grupos 1/2/3) is undertaken. Estimated effort if undertaken separately: 60–80 hours (new templates, new PUC mappings, UI additions for presupuesto, full testing).

---

## Sources

- [Manuales NIF - XBRL - SUI](http://www.sui.gov.co/web/empresas-prestadoras/manuales-nif-xbrl)
- [Cartilla Orientadora para el Reporte de Información Financiera NIF - SUI](https://sui.superservicios.gov.co/sites/default/files/inline-files/Cartilla-orientadora-para-el-reporte-de-informaci%C3%B3n-financiera-NIF-a-la-Superservicios-V1.pdf)
- [Manual de usuario cargue NIIF - XBRL - SUI](https://sui.superservicios.gov.co/sites/default/files/2022-07/Manual%20de%20usuario%20cargue%20NIIF%20-%20XBRL.pdf)
- [Entidades sujetas al ámbito Resolución 533/2015 - Contaduría General de la Nación](https://www.contaduria.gov.co/entidades-sujetas-al-ambito-de-la-resolucion-no-533-2015-y-sus-modificaciones)
- [Marco Normativo para Entidades de Gobierno - Contaduría General de la Nación](https://www.contaduria.gov.co/marco-normativo-para-entidades-de-gobierno)
- [Catálogo de cuentas Resolución 533 de 2015 - INCP](https://incp.org.co/publicaciones/infoincp-publicaciones/informacion-para-empresas/contable/2015/12/catalogo-general-de-cuentas-para-entidades-de-gobierno-bajo-el-ambito-de-aplicacion-de-la-resolucion-533-de-2015/)
- [Normas de Información Financiera y XBRL - SUI](http://sui.superservicios.gov.co/Normas-de-Informacion-Financiera-y-Lenguaje-de-Informacion-XBRL)
