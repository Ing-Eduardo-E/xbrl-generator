# XBRL Generator v2.0

Generador automático de taxonomías XBRL para empresas de servicios públicos colombianas que reportan a la SSPD.

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** 18+ (recomendado: 20 LTS)
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** (local o Neon.tech para cloud)

### Instalación

```bash
# 1. Navegar al directorio del proyecto
cd app

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL

# 4. Crear tablas en la base de datos
pnpm db:push

# 5. Iniciar servidor de desarrollo
pnpm dev

# 6. Abrir http://localhost:3000
```

## 🎯 Objetivo

Automatizar la generación de taxonomías XBRL reduciendo el tiempo de preparación de **8 horas a 2-3 horas** (85% de ahorro).

### Flujo de Trabajo

```
1. CARGA → Usuario sube Excel con Balance General Consolidado
2. VALIDACIÓN → Sistema verifica: Activos = Pasivos + Patrimonio ✅
3. DISTRIBUCIÓN → Usuario define % para cada servicio (debe sumar 100%):
   - Acueducto
   - Alcantarillado
   - Aseo
4. GENERACIÓN → Sistema genera Excel con balances distribuidos
5. DESCARGA → Usuario descarga archivo Excel con 4 hojas
```

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| **Frontend** | Next.js 15 + React 19 | App Router, Server Components |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui | UI Components |
| **API** | tRPC 11 | Type-safe API |
| **Database** | Drizzle ORM + PostgreSQL | Persistencia |
| **Excel** | xlsx (SheetJS) | Lectura/Escritura Excel |
| **Validation** | Zod 4 | Schema validation |

## 📁 Estructura del Proyecto

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/trpc/[trpc]/   # API endpoints tRPC
│   │   ├── layout.tsx          # Layout principal
│   │   └── page.tsx            # Página home (Wizard)
│   ├── components/
│   │   ├── ui/                 # Componentes shadcn/ui
│   │   ├── WizardLayout.tsx    # Layout del wizard
│   │   ├── UploadStep.tsx      # Paso 1: Cargar Excel
│   │   ├── DistributeStep.tsx  # Paso 2: Distribución
│   │   └── GenerateStep.tsx    # Paso 3: Descargar
│   ├── lib/
│   │   ├── db/                 # Cliente de base de datos
│   │   ├── services/           # Servicios (Excel parser/generator)
│   │   ├── trpc/               # Cliente tRPC
│   │   └── utils.ts            # Utilidades
│   └── server/
│       ├── routers/            # tRPC routers
│       └── trpc.ts             # Configuración tRPC
├── drizzle/
│   └── schema/                 # Schema de base de datos
├── .env.example                # Template de variables
├── drizzle.config.ts           # Configuración Drizzle
└── package.json
```

## 🚦 Comandos

```bash
# Desarrollo
pnpm dev              # Servidor en http://localhost:3000

# Base de Datos
pnpm db:push          # Aplicar schema a la BD
pnpm db:studio        # Abrir Drizzle Studio (GUI)

# Producción
pnpm build            # Build para producción
pnpm start            # Iniciar servidor de producción

# Calidad de código
pnpm lint             # ESLint
pnpm type-check       # Verificar tipos TypeScript
```

## 📊 API Endpoints (tRPC)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `balance.ping` | Query | Health check |
| `balance.uploadBalance` | Mutation | Cargar y procesar Excel |
| `balance.getTotals` | Query | Obtener totales consolidados |
| `balance.distributeBalance` | Mutation | Distribuir por servicios |
| `balance.getTotalesServicios` | Query | Totales por servicio |
| `balance.downloadExcel` | Query | Descargar Excel distribuido |
| `balance.downloadConsolidated` | Query | Descargar solo consolidado |

## 🗂️ Base de Datos

### Tablas

```sql
-- Cuentas cargadas (temporal)
working_accounts (
  id, code, name, value, is_leaf, level, class, created_at
)

-- Balances distribuidos por servicio
service_balances (
  id, service, code, name, value, created_at
)

-- Sesiones de balance (tracking)
balance_sessions (
  id, file_name, niif_group, accounts_count, distribution, status, ...
)
```

## 🔐 Variables de Entorno

Crear `.env.local` basado en `.env.example`:

```bash
# PostgreSQL (Neon recomendado para producción)
DATABASE_URL=postgresql://user:password@host:5432/xbrl_generator

# URL de la aplicación (opcional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📚 Conocimiento del Dominio

### Plan Único de Cuentas (PUC)

```
1 dígito  → Clase (1=Activos, 2=Pasivos, 3=Patrimonio, etc.)
2 dígitos → Grupo
4 dígitos → Cuenta
6 dígitos → Subcuenta
7+ dígitos → Auxiliares
```

### Servicios Públicos

1. **Acueducto** - Suministro de agua potable
2. **Alcantarillado** - Tratamiento de aguas residuales
3. **Aseo** - Recolección de residuos sólidos

## 📋 Estado del Proyecto

### ✅ Completado
- [x] Wizard de 3 pasos (Cargar, Distribuir, Generar)
- [x] Parser de Excel flexible
- [x] Validación de ecuaciones contables
- [x] Distribución proporcional por servicios
- [x] Generación de Excel con 4 hojas
- [x] Descarga de archivos

### 🚧 En Desarrollo
- [ ] Generación de archivos XBRL
- [ ] Integración con plantillas SSPD
- [ ] Tests unitarios e integración

---

**Versión**: 2.0.0
**Fecha**: 2025-11-25
**Estado**: Funcional (sin generación XBRL)

