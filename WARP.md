# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

XBRL Taxonomy Generator for Colombian public service companies reporting to SSPD (Superintendencia de Servicios Públicos Domiciliarios). This web application automates XBRL taxonomy generation from consolidated financial statements, reducing manual work from 8 hours to 2-3 hours.

### Core Functionality
- Processes Excel balance sheets with PUC (Plan Único de Cuentas) codes
- Distributes accounts across public services (Acueducto, Alcantarillado, Aseo)
- Validates accounting equations (Assets = Liabilities + Equity)
- Generates XBRL-compatible Excel files for SSPD reporting

## Technology Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + shadcn/ui
- **Backend**: Next.js API Routes + tRPC 11 for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Excel Processing**: xlsx (SheetJS) for reading/writing Excel files
- **Validation**: Zod schemas for input validation
- **Package Manager**: pnpm (required)

## Commands

### Development
```bash
cd app
pnpm dev              # Start development server on http://localhost:3000
pnpm type-check       # Type check without emitting files (tsc --noEmit)
pnpm lint            # Run Next.js linting
```

### Database Management
```bash
pnpm db:push         # Push schema to database (creates/updates tables)
pnpm db:generate     # Generate Drizzle migrations
pnpm db:migrate      # Run migrations
pnpm db:studio       # Open Drizzle Studio GUI for database inspection
```

### Building & Production
```bash
pnpm build           # Build for production
pnpm start           # Run production server (requires DATABASE_URL)
```

### Testing
Note: Test infrastructure is mentioned but not currently implemented. Consider adding:
- Vitest for unit tests
- Playwright for E2E tests

## Architecture & Code Organization

### Directory Structure
```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/trpc/[trpc]/   # tRPC API endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main wizard interface
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── WizardLayout.tsx    # 3-step wizard container
│   │   ├── UploadStep.tsx      # Step 1: Excel upload
│   │   ├── DistributeStep.tsx  # Step 2: Service distribution
│   │   └── GenerateStep.tsx    # Step 3: Generate & download
│   ├── lib/
│   │   ├── db/                 # Database client
│   │   ├── services/           # Business logic
│   │   │   ├── excelParser.ts  # Excel file parsing
│   │   │   ├── excelGenerator.ts # Excel generation
│   │   │   └── xbrlExcelGenerator.ts # XBRL format generation
│   │   ├── trpc/               # tRPC client setup
│   │   ├── utils/              # Utility functions
│   │   └── xbrl/               # XBRL-specific logic
│   └── server/
│       ├── routers/
│       │   ├── balance.ts      # Main balance router
│       │   └── index.ts        # Router aggregation
│       └── trpc.ts             # tRPC server setup
├── drizzle/
│   └── schema/
│       └── accounts.ts         # Database schema definitions
└── drizzle.config.ts           # Drizzle configuration
```

### Database Schema

Three main tables (all in PostgreSQL):

1. **`working_accounts`** - Temporary storage for uploaded balance
   - Truncated on each new upload
   - Stores PUC codes, names, values, hierarchy metadata
   - `isLeaf` flag identifies accounts without children

2. **`service_balances`** - Distributed accounts per service  
   - Generated after distribution step
   - One row per account per service
   - Values proportionally distributed

3. **`balance_sessions`** - Track processing sessions
   - Stores upload metadata, NIIF group, distribution percentages
   - Status tracking: uploaded → distributed → completed

### Key Business Logic

#### PUC (Plan Único de Cuentas) Classification
- First digit determines class: 1=Assets, 2=Liabilities, 3=Equity, 4=Income, 5=Expenses, 6=Costs
- Account hierarchy by code length: 1=Class, 2=Group, 4=Account, 6=Sub-account, 7+=Auxiliaries
- Leaf accounts: Accounts with no children (determined during parsing)

#### Distribution Algorithm
- User defines percentages for each service (must sum to 100%)
- Each account value multiplied by (percentage / 100)
- Values rounded to integers
- Only processes after user confirms distribution

#### Accounting Validation
- Assets = Liabilities + Equity (with 1000 peso tolerance)
- Profit = Income - Expenses
- Only sums leaf accounts to avoid double-counting

### API Endpoints (tRPC)

Located in `src/server/routers/balance.ts`:

- `balance.ping` - Health check
- `balance.uploadBalance` - Process Excel upload
- `balance.getTotals` - Get consolidated totals
- `balance.distributeBalance` - Distribute across services
- `balance.getTotalesServicios` - Get all service totals
- `balance.downloadExcel` - Download distributed Excel
- `balance.downloadConsolidated` - Download consolidated only
- `balance.generateXBRL` - Generate XBRL package (if implemented)

### Excel Processing

**Input Format** (`excelParser.ts`):
- Flexible column detection: código/codigo, denominación/nombre, total/valor
- First sheet or sheet named "Consolidado"
- PUC codes cleaned (removes dots/spaces)
- Values parsed (removes currency symbols)

**Output Format** (`excelGenerator.ts`):
- Sheet 1: "Consolidado" - all accounts
- Sheets 2-4: One per service with distributed accounts
- Each sheet includes validation totals
- Pre-configured column widths

## Environment Variables

Required in `.env.local`:
```bash
# PostgreSQL connection (local or Neon.tech)
DATABASE_URL=postgresql://user:password@host:5432/xbrl_generator

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Workflow

1. **Initial Setup**:
   ```bash
   cd app
   cp .env.example .env.local
   # Edit .env.local with DATABASE_URL
   pnpm install
   pnpm db:push
   pnpm dev
   ```

2. **Making Changes**:
   - UI Components: `src/components/` (React components)
   - API Logic: `src/server/routers/` (tRPC procedures)
   - Excel Processing: `src/lib/services/` (Parser/Generator)
   - Database Schema: `drizzle/schema/` (then run `pnpm db:push`)

3. **Testing Flow**:
   - Upload test Excel with PUC accounts
   - Verify totals calculation
   - Test distribution (percentages must sum to 100%)
   - Download and verify generated Excel

## Important Notes

### Stateless Design
- Database used as temporary working storage
- `working_accounts` truncated on each upload
- `service_balances` truncated on each distribution
- No permanent user data storage

### NIIF Groups Support
- Grupo 1: NIIF Plenas (66 forms)
- Grupo 2: NIIF PYMES (45 forms)
- Grupo 3: Microempresas (30 forms)
- R414: ESAL (43 forms)

### Known Limitations
- Fixed distribution percentages (not selective by account type)
- Values rounded to integers (no decimals)
- Only processes first sheet or "Consolidado" sheet
- XBRL generation partially implemented

### Performance Considerations
- Batch inserts (500-1000 records) to prevent memory issues
- Leaf account detection optimized with proper indexing
- Excel files processed in memory (base64 encoding)

## Common Development Tasks

### Add New Service Type
1. Update service options in `DistributeStep.tsx`
2. Modify distribution logic in `balance.distributeBalance`
3. Update Excel generator to create new service sheet

### Modify PUC Classification
1. Update `getAccountClass()` in `src/lib/utils`
2. Adjust parsing logic in `excelParser.ts`
3. Update validation rules if needed

### Debug Database Issues
```bash
pnpm db:studio  # Visual database browser
# Or check logs in server console
```

### Test with Sample Data
Sample Excel files available in `documentos/` directory with various PUC account structures.

## Related Documentation

- **CLAUDE.md**: Additional context for Claude AI assistant
- **docs/**: Technical documentation about XBRL, PUC structure, SSPD requirements
- **app/README.md**: Quick start guide for the Next.js application
- **DOCUMENTACION.md**: Comprehensive project documentation in Spanish