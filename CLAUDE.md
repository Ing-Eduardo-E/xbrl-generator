# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XBRL Taxonomy Generator for Colombian public service companies. This web application automates XBRL taxonomy generation from consolidated financial statements, reducing preparation time from 8 hours to 10 minutes. The system processes Excel balance sheets, distributes accounts across services (Acueducto, Alcantarillado, Aseo), validates accounting equations, and generates XBRL-compatible files for SSPD reporting.

**Status (2025-06-04)**: Production-ready MVP deployed on Vercel. Core distribution and XBRL generation fully implemented.

## Current Priority: IFE Trimestral (95% complete)

IFE (Informe Financiero Especial) is the quarterly taxonomy required by SSPD since 2020.

### IFE vs Annual Reports:
- **Quarterly** (1T, 2T, 3T, 4T) vs Annual
- **8 simplified sheets** vs 60+ full sheets  
- **NO users by stratum or subsidies required** - simplified flow
- **CxC by aging ranges** (auto-distributed: 55%/25%/20%/0%/0%)

### IFE Implementation Status:
- ✅ All TypeScript types and configurations
- ✅ UI selectors (IFE + trimester)
- ✅ Backend router and date handling
- ✅ Data filling for Hoja1, Hoja3, Hoja4, Hoja5
- ✅ Simplified DistributeStep (hides usuarios/subsidios for IFE)
- ⏳ End-to-end testing with XBRL Express

## Technology Stack

- **Framework**: Next.js 15.5.7 (App Router)
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

## Security (Last Update: 2025-06-04)

- ✅ **CVE-2025-55182 PATCHED** - Critical RCE vulnerability in React Server Components (CVSS 10.0)
  - Updated React 19.2.0 → 19.2.1
  - Updated Next.js 15.5.6 → 15.5.7

## Commands

### Development
```bash
cd app                # Enter the Next.js app directory
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production (validates types)
pnpm check            # Type check without emitting files
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
client/src/
  components/ui/       # shadcn/ui components
  pages/Home.tsx       # Main 3-step wizard interface
  lib/
    trpc.ts           # tRPC client setup

server/
  routers.ts          # tRPC API routes (balance.cargar, balance.distribuir, etc.)
  db.ts               # Database operations (truncate, insert, calculate totals)
  excelProcessor.ts   # Excel file parsing (flexible column detection)
  excelGenerator.ts   # Excel file generation (consolidated + per-service sheets)
  index.ts            # Express server (static file serving only)
  *.test.ts          # Vitest test files

server/_core/
  index.ts            # Main server entry (NOT used in production - see server/index.ts)
  trpc.ts            # tRPC setup
  context.ts         # Request context
  env.ts             # Environment variables

drizzle/
  schema.ts          # Database schema definitions
  relations.ts       # Drizzle relations (if any)

shared/
  types.ts           # Shared types between client/server
  const.ts           # Shared constants
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
