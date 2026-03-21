# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XBRL Taxonomy Generator for Colombian public service companies. This web application automates XBRL taxonomy generation from consolidated financial statements, reducing preparation time from 8 hours to 10 minutes. The system processes Excel balance sheets, distributes accounts across services (Acueducto, Alcantarillado, Aseo), validates accounting equations, and generates XBRL-compatible files for SSPD reporting.

**Status (2025-06-21)**: Production-ready. All 5 GSD ROADMAP phases complete. 345 tests passing. R414 module fully self-contained.

## Refactoring Status: GSD ROADMAP (ALL 5 PHASES COMPLETE)

### Phase 1: Safety Net & Bug Fixes ✅
- IFE pipeline safety-net tests, ZIP shape tests, R414 ESF data-presence tests
- Fix: IFE XSD entry-point URL substitution per trimestre
- Fix: dynamic codesWithChildren detection (replaces DB isLeaf flag)
- Dead SheetJS code removed, writeCellSafe extracted to shared

### Phase 2: Architecture Cleanup ✅
- excelRewriter.ts → dispatcher + writers
- Eliminated 1061 lines of dead IFETemplateService.ts
- Extracted preserveOriginalStructure() to shared/zipBuilder.ts

### Phase 3: Modular Decomposition ✅
- R414 module fully self-contained under r414/

### Phase 4: Grupos NIIF ✅
- Fixed ESF/ER column/row bugs per-grupo, dynamic esfRowMap

### Phase 5: Integration & Polish ✅
- Unified sumByPrefixes, preserveOriginalStructure tests

### R414 Module Independence ✅ (Latest)
- Split 1318-line monolith into 6 focused writers (798 lines total)
- All files under 600 lines, zero DRY violations

## Technology Stack

- **Framework**: Next.js 15.5.9 (App Router)
- **Frontend**: React 19.2.1 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: tRPC for type-safe API
- **Database**: SQLite with Drizzle ORM (dev), Turso for production
- **Excel Processing**: xlsx library
- **Package Manager**: pnpm (required)
- **Deployment**: Vercel (master branch)

## Branch Strategy

- **desarrollo**: Development branch (local testing)
- **master**: Production branch (auto-deploys to Vercel)
- Always work on `desarrollo`, merge to `master` when ready for production

## Security (Last Update: 2025-06-21)

- ✅ **CVE-2025-55182 PATCHED** - Critical RCE vulnerability in React Server Components (CVSS 10.0)
  - Updated React 19.2.0 → 19.2.1
  - Updated Next.js 15.5.6 → 15.5.7
- ✅ **CVE-2025-55184 PATCHED** - DoS via infinite loop in App Router (High Severity)
- ✅ **CVE-2025-55183 PATCHED** - Source code exposure via Server Functions (Medium Severity)
- ✅ **CVE-2025-67779 PATCHED** - Complete DoS fix (supersedes CVE-2025-55184)
  - Updated Next.js 15.5.7 → 15.5.9

## Commands

### Development
```bash
cd app                # Enter the Next.js app directory
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production (validates types)
pnpm check            # Type check without emitting files
```

### Testing
```bash
cd app
pnpm test             # Run all 345 tests (Vitest)
pnpm test -- --reporter=verbose  # Verbose output
```

### Database
```bash
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio
```

## Architecture

### Overall Flow
1. **Upload**: User uploads consolidated balance Excel file
2. **Process**: Backend extracts accounts using PUC codes, marks leaf accounts, calculates totals
3. **Distribute**: User defines service distribution percentages (must sum to 100%)
4. **Generate**: System distributes accounts proportionally across services
5. **Download**: User downloads Excel files with consolidated + distributed balances

### Database Schema

Three main tables:

1. **`cuentas_trabajo`** (working accounts table)
   - Temporary storage for currently loaded balance
   - Truncated on each new file upload
   - Stores PUC account codes, names, values, and hierarchy metadata
   - `esHoja` flag identifies leaf accounts (accounts without sub-accounts)

2. **`balances_servicio`** (service balances table)
   - Generated after distribution step
   - Contains proportionally distributed accounts per service
   - One row per account per service

3. **`users`** (authentication)
   - OAuth-based authentication with Manus
   - Supports user/admin roles

### Key Business Logic

**PUC Classification (Colombian Chart of Accounts)**:
- First digit determines class: 1=Assets, 2=Liabilities, 3=Equity, 4=Income, 5=Expenses, 6=Costs
- Account hierarchy determined by code length: 1=Class, 2=Group, 4=Account, 6=Sub-account
- Leaf accounts: accounts with no children in the hierarchy (detected via SQL query)

**Distribution Algorithm**:
- Only processes accounts after user confirms distribution percentages
- Multiplies each account value by (percentage / 100) for each service
- Values rounded to integers (Math.round)
- Inserts in batches of 1000 to prevent memory issues

**Accounting Validation**:
- Assets = Liabilities + Equity
- Profit = Income - Expenses
- Only sums leaf accounts to avoid double-counting parent totals

### Code Organization

```
app/src/
  components/ui/         # shadcn/ui components
  app/                   # Next.js App Router pages
  lib/
    trpc.ts             # tRPC client setup
    xbrl/
      types.ts          # Shared XBRL types
      excelUtils.ts     # Legacy Excel utilities
      shared/
        baseTemplateService.ts  # Base class for all template services
        excelUtils.ts           # writeCellSafe, matchesPrefixes, DataWriterContext
        zipBuilder.ts           # preserveOriginalStructure()
        index.ts                # Barrel exports
      official/
        excelRewriter.ts        # Dispatcher: routes to grupo/r414 writers
        interfaces.ts           # TemplateWithDataOptions, UsuariosEstrato
        grupoDataWriter.ts      # Writer for Grupo 1/2/3
      r414/                     # Self-contained R414 module (<600 lines per file)
        index.ts                # Public API exports
        config.ts               # Template paths, sheet mapping
        R414TemplateService.ts  # Extends BaseTemplateService (585 lines)
        mappings/
          index.ts              # Barrel: ESF, ER, PPE, FC01 mappings
          esfMappings.ts        # ESF row/column mappings
          erMappings.ts         # ER row/column mappings
          ppeMappings.ts        # PPE, Intangibles, Efectivo, Provisiones
          fc01Mappings.ts       # FC01 gastos por servicio
        writers/
          index.ts              # Orchestrator (32 lines)
          writeFinancialStmts.ts  # Hoja2 ESF + Hoja3 ER (100 lines)
          writeNotesData.ts       # Hoja7 notes (98 lines)
          writeServiceExpenses.ts # Hoja16/17/18/22 gastos (169 lines)
          writeCxcData.ts         # Hoja24/25/26 CxC (203 lines)
          writeSupplementary.ts   # FC02/FC04/FC05b/FC08/Notas (196 lines)
      grupo1/              # Grupo 1 NIIF Plenas config
      grupo2/              # Grupo 2 NIIF PYMES config
      grupo3/              # Grupo 3 Microempresas config
      ife/                 # IFE trimestral config
  server/
    routers/balance.ts   # tRPC API routes
  db/                    # Drizzle ORM schema and operations

app/src/lib/xbrl/__tests__/  # 10 test files, 345 tests (Vitest)
```

### Excel Processing

**Input Format** (`excelProcessor.ts`):
- Expects columns: CÓDIGO (or "codigo"), DENOMINACIÓN (or "nombre"), Total
- First sheet or sheet named "Consolidado"
- PUC codes cleaned (removes dots/spaces)
- Values parsed (removes currency symbols, commas)
- Flexible column detection handles variations in header names

**Output Format** (`excelGenerator.ts`):
- First sheet: "Consolidado" with all accounts
- Subsequent sheets: One per service with distributed accounts
- Each service sheet includes summary header with validation totals
- Column widths pre-configured for readability

### tRPC API Routes

Located in `server/routers.ts`:

- `balance.cargar`: Upload and process Excel file
- `balance.getTotales`: Get consolidated balance totals
- `balance.getCuentasHoja`: Get leaf accounts (debugging)
- `balance.distribuir`: Distribute accounts across services
- `balance.getTotalesServicios`: Get totals for all services
- `balance.getTotalesServicio`: Get totals for specific service
- `balance.descargarExcel`: Download Excel with all balances
- `balance.descargarConsolidado`: Download consolidated balance only

### State Management

Frontend uses React hooks + tRPC mutations:
- No global state management library
- Form state managed locally in `Home.tsx`
- File upload converts to base64 before API call
- Download converts base64 response back to Blob

## Important Notes

### Stateless Design
- Database acts as temporary working storage, not permanent records
- `cuentas_trabajo` truncated on each upload
- `balances_servicio` truncated on each distribution
- No user data persistence beyond authentication

### Known Limitations (from README)
- Fixed distribution percentages (not selective by account type)
- Values rounded to integers (no decimals)
- Only processes first sheet or "Consolidado" sheet
- No XBRL validation (must be done in XBRL Express)

### Production Deployment
- Requires MySQL database (DATABASE_URL environment variable)
- Static frontend served by Express in production
- Database lazy-loaded (app works without DB for local tooling)
- Uses esbuild for server bundle, Vite for client bundle

### Testing
- Test files: `server/*.test.ts`
- Tests cover: balance loading, service distribution, accounting equations, auth logout
- Run with `pnpm test`

## Path Aliases

Configured in `vite.config.ts`:
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`
