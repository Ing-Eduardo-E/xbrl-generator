# XBRL Express Compatibility & Template Inventory

Research date: 2026-03-21
Researcher: Claude (claude-sonnet-4-6)

---

## Template Files Inventory

| Taxonomy | Folder | .xbrlt | .xml | .xlsx | .xbrl | Status |
|---|---|---|---|---|---|---|
| **r414** | `public/templates/r414/` | R414Ind_ID20037_2024-12-31.xbrlt | R414Ind_ID20037_2024-12-31.xml | R414Ind_ID20037_2024-12-31.xlsx | R414Ind_ID20037_2024-12-31.xbrl | Complete |
| **ife** | `public/templates/ife/` | IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt | IFE_SegundoTrimestre_ID20037_2025-06-30.xml | IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx | IFE_SegundoTrimestre_ID20037_2025-06-30.xbrl | Complete (2T only) |
| **grupo1** | `public/templates/grupo1/` | Grupo1_Individual_Directo_ID20037_2024-12-31.xbrlt | Grupo1_Individual_Directo_ID20037_2024-12-31.xml | Grupo1_Individual_Directo_ID20037_2024-12-31.xlsx | Grupo1_Individual_Directo_ID20037_2024-12-31.xbrl | Complete |
| **grupo2** | `public/templates/grupo2/` | Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrlt | Grupo2_Individual_Indirecto_ID20037_2024-12-31.xml | Grupo2_Individual_Indirecto_ID20037_2024-12-31.xlsx | Grupo2_Individual_Indirecto_ID20037_2024-12-31.xbrl | Complete |
| **grupo3** | `public/templates/grupo3/` | Grupo3_ID20037_2024-12-31.xbrlt | Grupo3_ID20037_2024-12-31.xml | Grupo3_ID20037_2024-12-31.xlsx | Grupo3_ID20037_2024-12-31.xbrl | Complete |
| **r533** | (none) | — | — | — | — | **MISSING - not implemented** |

Additional files in `public/templates/`:
- `Plantilla_XBRL.xlsx` — generic reference workbook (not used for generation)
- `PuntoEntrada_R414_Individual-2024.xbrlt` and `PuntoEntrada_R414_Individual-2024_1.xlsx` — legacy root-level files, not used in generation

A reference copy of the IFE 1st-trimestre set also exists at `IFE Trimestral/IFE_PrimerTrimestre_ID0_2025-03-31.*` (outside the app — used for comparison, not for generation).

---

## R414 Template Structure

### XML Mapping File (`R414Ind_ID20037_2024-12-31.xml`)

- **Schema**: `XBRLDataSourceExcelMapSchema.xsd` (Reporting Standard)
- **Total `<map>` entries**: **13,415**
- **Namespace prefix**: `co-sspd-ef-Res414` → namespace `http://www.superservicios.gov.co/xbrl/ef/core/2024-12-31`
- **Taxonomy entry point XSD**: `http://www.sui.gov.co/xbrl/Corte_2024/res414/PuntoEntrada_R414_Individual-2024.xsd`

Each `<map>` element pairs a XBRL concept ID with a single Excel cell reference:

```xml
<map>
  <mapId>co-sspd-ef-Res414_EfectivoYEquivalentesAlEfectivo</mapId>
  <cell>Hoja2!I15</cell>
</map>
```

### Sheets referenced in R414 XML (37 distinct sheets)

`Hoja1` through `Hoja41` (with gaps — Hoja12, Hoja13, Hoja40 not present):

| Sheet | Purpose (from SHEET_MAPPING) |
|---|---|
| Hoja1 | Información general (110000) |
| Hoja2 | Estado de Situación Financiera (210000) |
| Hoja3 | Estado de Resultados (310000) |
| Hoja4–Hoja9 | Additional financial statements |
| Hoja10–Hoja11 | Supporting schedules |
| Hoja14–Hoja15 | Additional data |
| Hoja16 | Gastos Acueducto (900017a) |
| Hoja17 | Gastos Alcantarillado (900017b) |
| Hoja18 | Gastos Aseo (900017c) |
| Hoja19–Hoja21 | Additional gastos/FC schedules |
| Hoja22 | Gastos Total (900017g) |
| Hoja23 | FC02 Complementario ingresos (900019) |
| Hoja24 | FC03-1 CXC Acueducto (900021) |
| Hoja25 | FC03-2 CXC Alcantarillado (900022) |
| Hoja26 | FC03-3 CXC Aseo (900023) |
| Hoja27–Hoja39 | Notes and supplementary schedules |
| Hoja41 | Provisiones/Tarifa schedule |

### XBRLT File (`R414Ind_ID20037_2024-12-31.xbrlt`)

- **Total lines**: 17,941
- **Total `<item>` fact entries**: **13,415** (mirrors XML mapping count)
- **Contexts**: Multiple, covering:
  - Annual period 2024-01-01 to 2024-12-31 (duration)
  - Instant 2024-12-31 (balance sheet)
  - Instant 2023-12-31 (prior year comparison)
  - Instant 2022-12-31 (ante-prior year)
  - Per-service dimensions: AcueductoMember, AlcantarilladoMember, AseoMember, EnergiaElectricaMember, GasNaturalMember, GasLicuadoDePetroleoMember, OtrasActividadesNoVigiladasMember
  - Cross: each of the above per year (2024, 2023) for ESF; per period (2024, 2023) for ER and FC
- **Unit**: COP (Colombian peso) via `unitRef="id1145"`
- **Entry point**: `http://www.sui.gov.co/xbrl/Corte_2024/res414/PuntoEntrada_R414_Individual-2024.xsd`

### Column Layout in R414

| Column | Service |
|---|---|
| I | Total |
| J | Acueducto |
| K | Alcantarillado |
| L | Aseo |
| M | Energía eléctrica |
| N | Gas natural |
| O | Gas licuado de petróleo |
| P | Otras actividades no vigiladas |

Hoja3 (Estado de Resultados) uses different columns: E=Acueducto, F=Alcantarillado, G=Aseo, L=Total.

---

## IFE Template Structure

### XML Mapping File (`IFE_SegundoTrimestre_ID20037_2025-06-30.xml`)

- **Total `<map>` entries**: **1,738**
- **Namespace prefix**: `co-sspd-ife` → namespace `http://www.superservicios.gov.co/xbrl/ef/core/2025-03-31`
- **Sheets referenced**: Hoja1, Hoja2, Hoja3, Hoja4, Hoja5, Hoja6, Hoja7, Hoja8 (8 sheets total)

| IFE Sheet | Code | Content |
|---|---|---|
| Hoja1 | 110000t | Información general (NIT, RUPS, nombre, contacto, empleados, RL, marco normativo) |
| Hoja2 | 120000t | Información adicional (variaciones efectivo, revelaciones, ajustes trimestres anteriores) |
| Hoja3 | 210000t | Estado de Situación Financiera por servicio |
| Hoja4 | 310000t | Estado de Resultados por servicio |
| Hoja5 | 900020t | FC03t – CXC por rangos de vencimiento |
| Hoja6 | 900028t | FC05t – CXP detallado |
| Hoja7 | 900050t | FC08t – Ingresos y Gastos |
| Hoja8 | 900060t | FC09t – Deterioro de activos |

### XBRLT File (`IFE_SegundoTrimestre_ID20037_2025-06-30.xbrlt`)

- **Total lines**: 2,498
- **Total `<item>` entries**: **1,738**
- **Entry point**: `http://www.sui.gov.co/xbrl/Corte_2025/IFE/IFE_PuntoEntradaSegundoTrimestre-2025.xsd`
- **Contexts**: Trimestral — period 2025-04-01/2025-06-30, instant 2025-06-30 (end), instant 2025-03-31 (start of quarter / prior period), per service dimensions: Acueducto, Alcantarillado, Aseo, EnergiaElectrica, GasNatural, GasLicuadoPetroleo, XMM (OperadorDelSistema), OtrasActividadesNoVigiladas

---

## Grupo 1/2/3 Template Sizes

| Taxonomy | XML maps | XBRLT items | XBRLT lines | Distinct sheets in XML |
|---|---|---|---|---|
| grupo1 | 16,237 | 16,237 | 23,274 | 61 |
| grupo2 | 13,355 | 13,355 | 17,647 | 40 |
| grupo3 | 7,520 | 7,520 | 9,541 | 27 |
| r414 | 13,415 | 13,415 | 17,941 | 37 |
| ife | 1,738 | 1,738 | 2,498 | 8 |

---

## Missing Template Files

### R533 (Resolución 533) — Completely Missing

`templatePaths.ts` declares r533 with empty strings for all four file paths. The `officialTemplateService.ts` throws an error at runtime for r533: `"No hay plantillas oficiales disponibles para r533"`.

No R533 template files exist anywhere in the repository. No R533 taxonomy schemas were found. The `r533` key is present in all TypeScript type unions (`NiifGroup`, `SHEET_MAPPING`, `TEMPLATE_PATHS`) as a stub.

### IFE — Only 2T Template Available

The IFE template stored under `public/templates/ife/` is specifically the **2nd trimestre (Q2)** template. The `IFETemplateService.ts` handles all 4 quarters by:
1. Replacing dates in the `.xbrlt` based on the report month
2. Replacing the entry point XSD URL (regex: `IFE_PuntoEntradaSegundoTrimestre-{year}.xsd` → `IFE_PuntoEntrada{TrimName}-{year}.xsd`)
3. Replacing filenames referencing `IFE_SegundoTrimestre_...` in the `.xbrlt` config attribute

**However**, the `templateCustomizers.ts` (used by the official template flow) does NOT perform the entry-point URL substitution. It only replaces dates. This means for 1T, 3T, and 4T, the `.xbrlt` will reference `IFE_PuntoEntradaSegundoTrimestre-2025.xsd` instead of the correct quarter-specific entry point — **a compatibility bug for non-Q2 IFE generation via the official flow**.

---

## XBRL/XBRLT Customization — What Gets Replaced

The customization is done in `templateCustomizers.ts` (`customizeXbrlt`, `customizeXml`, `customizeExcel`).

### In `.xbrlt` files

| Original value | Replaced with | Field |
|---|---|---|
| `<company>20037</company>` | `<company>{companyId}</company>` | Company identifier in `<contexts>` |
| `<xbrli:identifier scheme="_">_</xbrli:identifier>` | `<xbrli:identifier scheme="http://www.sui.gov.co/rups">{companyId}</xbrli:identifier>` | Every context entity block |
| `config="R414Ind_ID20037_2024-12-31.xml"` | `config="{outputFileName}.xml"` | Datasource config reference |
| `<instant>2024-12-31</instant>` | `<instant>{reportYear}-12-31</instant>` | Annual instant dates |
| `<startDate>2024-01-01</startDate>` | `<startDate>{reportYear}-01-01</startDate>` | Period start dates |
| `<endDate>2024-12-31</endDate>` | `<endDate>{reportYear}-12-31</endDate>` | Period end dates |
| `<instant>2023-12-31</instant>` | `<instant>{reportYear-1}-12-31</instant>` | Prior year instant |
| `<startDate>2023-01-01</startDate>` | `<startDate>{reportYear-1}-01-01</startDate>` | Prior year period start |
| `<endDate>2023-12-31</endDate>` | `<endDate>{reportYear-1}-12-31</endDate>` | Prior year period end |
| `<instant>2022-12-31</instant>` | `<instant>{reportYear-2}-12-31</instant>` | Ante-prior year instant |

**Critical note**: Taxonomy namespace URLs (e.g., `http://www.sui.gov.co/xbrl/Corte_2024/...`) are intentionally NOT updated when the report year changes, because SSPD publishes taxonomies annually and the 2024 taxonomy is the most recent confirmed available.

### For IFE `.xbrlt` only

| Original | Replaced with |
|---|---|
| `<startDate>2025-04-01</startDate>` | Start date of the selected quarter |
| `<endDate>2025-06-30</endDate>` | End date of the selected quarter |
| `<instant>2025-06-30</instant>` | End instant of the quarter |
| `<instant>2025-03-31</instant>` | Prior period instant (start of quarter or end of prior quarter) |

### In `.xml` files

The `customizeXml()` function **returns the content unchanged** — no replacements are made. The XML mapping file is used as-is from the template.

### In `.xlsx` files

The Excel workbook is populated via ExcelJS (`rewriteFinancialDataWithExcelJS`) then the internal ZIP structure is restored via `preserveOriginalStructure()` to prevent XBRL Express compatibility issues caused by ExcelJS modifying `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, and `[Content_Types].xml`.

Key fields written to Excel:
- Hoja1: company name, RUPS ID, NIT, report date, rounding degree, business nature, start date, restated period
- Hoja2–Hoja26 (R414): financial data by service using column layout above
- For IFE: Hoja1 contact/employee/representative data, Hoja3/4/5 financial data

---

## ZIP Output Requirements

The ZIP produced by `officialTemplateService.ts` must contain these files **in the same flat directory** (no subdirectories):

| File | Purpose | Required |
|---|---|---|
| `{prefix}_ID{companyId}_{date}.xbrlt` | XBRL mapper configuration (XBRL Express opens this) | **Mandatory** |
| `{prefix}_ID{companyId}_{date}.xml` | Cell-to-concept mapping (ExcelDataSource config) | **Mandatory** |
| `{prefix}_ID{companyId}_{date}.xlsx` | Pre-filled Excel workbook | **Mandatory** |
| `{prefix}_ID{companyId}_{date}.xbrl` | XBRL instance reference file (minimal, schemaRef only) | **Mandatory** |
| `README.txt` | User instructions | Optional |

XBRL Express opens the `.xbrlt` file and automatically locates the `.xml` and `.xlsx` by name (the `config=` attribute in `.xbrlt` must match the `.xml` filename exactly). All four files must have the same base name, differing only in extension.

### Internal XLSX Structure Requirements

XBRL Express is sensitive to the internal OOXML structure of the `.xlsx`:
- `xl/sharedStrings.xml` must be present (SheetJS was found to delete it — this broke XBRL Express)
- `xl/styles.xml` must retain full format definitions (~14KB, not the ~1KB version SheetJS regenerates)
- `xl/workbook.xml` must reference only sheets that exist (ExcelJS added a phantom `xl/theme/theme1.xml` reference that broke loading)
- `xl/theme/theme1.xml` must NOT be referenced unless it actually exists in the archive

These are handled by `preserveOriginalStructure()` in `officialTemplateService.ts`.

---

## Template Path Resolution

`templatePaths.ts` maps each `NiifGroup` to relative paths under `public/templates/`. Path resolution in `fileLoaders.ts` uses `path.join(process.cwd(), 'public', 'templates', relativePath)`.

### Path validation regex

```typescript
const SAFE_TEMPLATE_PATH_RE = /^[a-zA-Z0-9/_\-]+\.(xbrlt?|xml|xlsx)$/;
```

This regex accepts `.xbrlt`, `.xbrl`, `.xml`, and `.xlsx` extensions. It rejects paths with spaces, `..`, or special characters — appropriate security measure.

### Path resolution issues found

1. **R533 — empty paths**: All four `r533` paths are empty strings (`''`). The regex will reject them (`throw new Error("Invalid template path")`), but the guard in `officialTemplateService.ts` (`if (!templatePaths.xbrlt)`) catches this first and throws the proper user-facing error. No crash, but r533 is non-functional.

2. **IFE — entry point URL not updated per trimestre in official flow**: The `templateCustomizers.ts` used by the official template route replaces only dates in the `.xbrlt`. For IFE, the entry point URL must also be updated from `IFE_PuntoEntradaSegundoTrimestre-2025.xsd` to the quarter-specific URL. This substitution exists in `IFETemplateService.ts` (the IFE-specific flow) but NOT in the generic `templateCustomizers.ts`. If the official flow is used for IFE (e.g., via `officialTemplateService`), the `.xbrlt` will point to the wrong entry point for quarters 1, 3, and 4.

3. **IFE — only 2T template available**: There is no dedicated 1T, 3T, or 4T template. The system relies on runtime substitution. This is architecturally intentional but must work correctly (see issue #2 above).

4. **Grupo1/2/3 naming convention**: Paths are hardcoded with `ID20037` and `2024-12-31`. The `outputFileName` generation replaces `ID20037` with the actual company ID and `2024-12-31` with the report date. The `.xml` file is never renamed at source — XBRL Express links to it via the `config=` attribute in the `.xbrlt`, which is correctly updated.

---

## Resolución 533 Requirements

Resolución 533 (issued 2014-12-27) establishes the regulatory accounting framework for public entities (entidades de gobierno). It applies to water/sanitation companies classified under the public sector NIIF framework.

### What would be needed to implement R533

1. **Official templates from SSPD**: Obtain the four SSPD-published files for R533 from `http://www.sui.gov.co/xbrl/Corte_2024/res533/` (or equivalent year). The expected filenames would follow the convention: `R533Ind_ID{sample}_2024-12-31.{xbrlt|xml|xlsx|xbrl}`.

2. **Template directory**: Create `public/templates/r533/` and place the four files there.

3. **Update `templatePaths.ts`**: Replace the empty-string values for `r533` with the real relative paths.

4. **Sheet mapping**: Define `SHEET_MAPPING['r533']` in `templatePaths.ts` with the actual Hoja→XBRL-code mappings. R533 has a different chart structure from R414 — it targets government entities rather than private/mixed public service companies.

5. **ESF/ER mappings**: Create PUC→row mappings for R533's balance sheet and income statement sheets. R533 uses public sector accounting (Resolución 365 chart of accounts), not the commercial PUC, so mappings would differ significantly from R414.

6. **`excelRewriter.ts` / `R533TemplateService`**: Add data-filling logic for R533 sheets (analogous to `r414/R414TemplateService.ts`).

7. **Taxonomy namespace**: R533 uses namespace `http://www.superservicios.gov.co/xbrl/ef/res533/core/{year}-12-31` (exact URL must be confirmed from SSPD catalog).

### Key difference from R414

R533 is for government entities using Resolución 365 accounts (public sector chart), while R414 is for companies using the commercial PUC (private/mixed). The account code prefixes and hierarchies are entirely different.

---

## Summary of Critical Compatibility Issues

| Issue | Severity | Status |
|---|---|---|
| IFE entry point URL not updated per trimestre in `templateCustomizers.ts` | High — XBRL Express will reject 1T/3T/4T packages if this code path is used | Bug in official flow; fixed in `IFETemplateService.ts` |
| R533 templates missing entirely | Medium — r533 is non-functional | By design (not yet implemented) |
| XLSX internal structure must be preserved | High — XBRL Express cannot read SheetJS-modified files | Fixed via `preserveOriginalStructure()` |
| Taxonomy namespace URLs stay at 2024 even for 2025+ reports | Low — intentional; 2025 taxonomy not confirmed available | Documented design decision |
| `.xml` config file is never modified | Low — file names are handled via `config=` attribute update in `.xbrlt` | Correct behavior |
