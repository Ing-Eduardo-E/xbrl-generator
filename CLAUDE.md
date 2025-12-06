# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XBRL Taxonomy Generator for Colombian public service companies. This web application automates XBRL taxonomy generation from consolidated financial statements, reducing preparation time from 8 hours to 2-3 hours. The system processes Excel balance sheets, distributes accounts across services (Acueducto, Alcantarillado, Aseo), validates accounting equations, and generates XBRL-compatible files for SSPD reporting.

**Status**: v2.5 - Fully functional with official SSPD template support. R414 in production. IFE (quarterly reporting) almost complete. Code refactoring in progress.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19 + TypeScript + Tailwind CSS 3.4 + shadcn/ui
- **API**: tRPC 11 (type-safe API)
- **Database**: PostgreSQL with Drizzle ORM
- **Excel Processing**: xlsx + exceljs libraries
- **File Compression**: jszip for XBRL packages
- **Package Manager**: pnpm (required)

## Commands

All commands run from the `app/` directory:

### Development
```bash
pnpm dev              # Start Next.js dev server (http://localhost:3000)
pnpm type-check       # Type check without emitting files (tsc --noEmit)
pnpm lint             # Run ESLint
```

### Building
```bash
pnpm build            # Build for production
pnpm start            # Run production server
```

### Database
```bash
pnpm db:push          # Push schema to database (dev)
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio GUI
```

## Architecture

### Overall Flow
1. **Upload**: User uploads consolidated balance Excel file + selects NIIF group
2. **Process**: Backend extracts accounts using PUC codes, marks leaf accounts, calculates totals
3. **Distribute**: User defines service distribution percentages (must sum to 100%)
4. **Generate**: System distributes accounts proportionally across services
5. **Download**: User downloads official SSPD templates pre-filled with data

### Database Schema

Located in `app/src/db/schema/accounts.ts`:

1. **`working_accounts`** (temporary storage)
   - Truncated on each new file upload
   - Stores PUC account codes, names, values, hierarchy metadata
   - `is_leaf` flag identifies leaf accounts (accounts without sub-accounts)

2. **`service_balances`** (distributed accounts)
   - Generated after distribution step
   - Contains proportionally distributed accounts per service
   - One row per account per service

3. **`balance_sessions`** (session tracking)
   - Tracks file uploads and processing status
   - Stores distribution percentages, usuarios por estrato, subsidios as JSON

### Key Business Logic

**PUC Classification (Colombian Chart of Accounts)**:
- First digit determines class: 1=Assets, 2=Liabilities, 3=Equity, 4=Income, 5=Expenses, 6=Costs
- Account hierarchy determined by code length: 1=Class, 2=Group, 4=Account, 6=Sub-account
- Leaf accounts: accounts with no children in the hierarchy

**Distribution Algorithm**:
- Only processes accounts after user confirms distribution percentages
- Multiplies each account value by (percentage / 100) for each service
- Values rounded to integers (Math.round)
- Inserts in batches to prevent memory issues

**Accounting Validation**:
- Assets = Liabilities + Equity
- Profit = Income - Expenses
- Only sums leaf accounts to avoid double-counting parent totals

### Code Organization

```
app/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── api/trpc/[trpc]/route.ts  # tRPC API handler
│   │   ├── layout.tsx                 # Root layout with providers
│   │   └── page.tsx                   # Main wizard page
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── WizardLayout.tsx          # 3-step wizard container
│   │   ├── UploadStep.tsx            # Step 1: File upload + NIIF selection
│   │   ├── DistributeStep.tsx        # Step 2: Distribution percentages
│   │   ├── GenerateStep.tsx          # Step 3: Download results
│   │   └── UsuariosEstratoForm.tsx   # User count by stratum form
│   │
│   ├── lib/
│   │   ├── db/index.ts               # Drizzle database client
│   │   ├── services/
│   │   │   ├── excelParser.ts        # Excel file parsing
│   │   │   ├── excelGenerator.ts     # Excel file generation
│   │   │   └── xbrlExcelGenerator.ts # XBRL-compatible Excel
│   │   ├── trpc/
│   │   │   ├── client.ts             # tRPC React client
│   │   │   └── index.ts              # Exports
│   │   ├── xbrl/
│   │   │   ├── officialTemplateService.ts  # Official SSPD templates
│   │   │   ├── taxonomyConfig.ts     # Taxonomy configuration
│   │   │   ├── xbrlGenerator.ts      # XBRL file generation
│   │   │   └── index.ts              # Exports
│   │   └── utils.ts                  # Utility functions (cn, formatCurrency, etc.)
│   │
│   ├── db/
│   │   └── schema/
│   │       ├── accounts.ts           # Database schema definitions
│   │       └── index.ts              # Schema exports
│   │
│   └── server/
│       ├── trpc.ts                   # tRPC initialization
│       └── routers/
│           ├── index.ts              # App router
│           └── balance.ts            # Balance procedures
│
├── public/
│   └── templates/                    # Official SSPD templates
│       ├── grupo1/                   # NIIF Plenas
│       ├── grupo2/                   # NIIF PYMES
│       ├── grupo3/                   # Microempresas
│       ├── r414/                     # Resolución 414
│       └── ife/                      # IFE Trimestral
│
├── drizzle.config.ts                 # Drizzle configuration
└── package.json
```

### tRPC API Routes

Located in `app/src/server/routers/balance.ts`:

| Procedure | Type | Description |
|-----------|------|-------------|
| `ping` | Query | Health check |
| `uploadBalance` | Mutation | Upload and process Excel file |
| `getTotals` | Query | Get consolidated balance totals |
| `distributeBalance` | Mutation | Distribute accounts across services |
| `getTotalesServicios` | Query | Get totals for all services |
| `downloadExcel` | Query | Download Excel with distributed balances |
| `downloadConsolidated` | Query | Download consolidated balance only |
| `downloadXBRLExcel` | Query | Download XBRL-compatible Excel |
| `downloadOfficialTemplates` | Mutation | Download official SSPD templates pre-filled |
| `getSessionInfo` | Query | Get current session info |
| `getSessionUsuariosSubsidios` | Query | Get usuarios/subsidios from session |
| `getTaxonomyList` | Query | List available taxonomies |

### Supported Taxonomies

| Group | Name | Description |
|-------|------|-------------|
| grupo1 | NIIF Plenas | Large companies |
| grupo2 | NIIF PYMES | Small/medium companies |
| grupo3 | Microempresas | Simplified accounting |
| r414 | Resolución 414 | Public sector (CGN) |
| ife | IFE | Quarterly financial report |

### Automated XBRL Sheets

The system pre-fills the following sheets in official templates:

- **[110000] Hoja1** - General information (company metadata)
- **[210000] Hoja2** - Statement of Financial Position (ESF)
- **[310000] Hoja3** - Income Statement
- **[900017a] FC01-1** - Acueducto Expenses
- **[900017b] FC01-2** - Alcantarillado Expenses
- **[900017c] FC01-3** - Aseo Expenses
- **[900017g] FC01-7** - Total Services Expenses
- **[900019] FC02** - Complementary Income
- **[900021] FC03-1** - CxC Acueducto (by stratum)
- **[900022] FC03-2** - CxC Alcantarillado (by stratum)
- **[900023] FC03-3** - CxC Aseo (by stratum)
- **[900028b] FC05b** - Liabilities by maturity

## IFE (Quarterly Reporting) - In Progress

IFE is the mandatory quarterly taxonomy from SSPD since 2020. Key differences from annual reports:

- **Periodicity**: Quarterly (1T, 2T, 3T, 4T) vs Annual
- **CxC**: By maturity ranges vs by service type
- **Structure**: 8 simplified sheets vs 60+ complete sheets

### Default CxC Distribution by Maturity:
- Not due: 55%
- 1-90 days: 25%
- 91-180 days: 20%
- 181-360 days: 0%
- >360 days: 0%

## Important Notes

### Stateless Design
- Database acts as temporary working storage, not permanent records
- `working_accounts` truncated on each upload
- `service_balances` truncated on each distribution
- Session data stored temporarily for current workflow

### Known Limitations
- Fixed distribution percentages (not selective by account type)
- Values rounded to integers (no decimals)
- Only processes first sheet or "Consolidado" sheet
- Final XBRL validation must be done in XBRL Express

### Environment Variables

Create `.env.local` from `.env.example`:

```bash
# PostgreSQL (Neon recommended for production)
DATABASE_URL=postgresql://user:password@host:5432/xbrl_generator

# Next.js (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `src/*`
- `@/db/*` → `src/db/*`

## Refactoring In Progress

The codebase is being refactored to separate each taxonomy into independent files.

### Problem
`officialTemplateService.ts` has **4,914 lines** with all taxonomy logic mixed together.

### Solution
Create separate folders for each taxonomy:
```
app/src/lib/xbrl/
├── shared/           # Shared utilities
├── r414/             # R414 taxonomy (in production)
├── grupo1/           # NIIF Plenas
├── grupo2/           # NIIF PYMES
├── grupo3/           # Microempresas
└── ife/              # Quarterly reports
```

### Documentation
- `docs/plan_refactorizacion_taxonomias.md` - Detailed refactoring plan
- `docs/CONTINUIDAD_REFACTORIZACION.md` - Continuity document for handoff

### Key Files to Refactor
| File | Lines | Content |
|------|-------|---------|
| `officialTemplateService.ts` | 4,914 | All taxonomy mappings mixed |
| `xbrlExcelGenerator.ts` | 1,430 | Generic PUC mappings |
| `taxonomyConfig.ts` | 812 | All taxonomy configs |
| `xbrlGenerator.ts` | 815 | Mixed generation logic |

## Documentation

See `docs/` folder for detailed documentation:
- `plan_refactorizacion_taxonomias.md` - Refactoring plan
- `CONTINUIDAD_REFACTORIZACION.md` - Continuity document
- `analisis_taxonomias_sspd.md` - SSPD taxonomy analysis
- `analisis_comparativo_niif.md` - NIIF groups comparison
- `arquitectura_simplificada_sin_bd.md` - Architecture design
- `estructura_puc_colombia.md` - PUC structure reference
- `flujo_usuario_optimizado.md` - User flow documentation
