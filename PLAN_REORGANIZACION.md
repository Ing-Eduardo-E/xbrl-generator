# Plan de Reorganización del Proyecto XBRL Generator

## 📋 Resumen Ejecutivo

Este documento presenta un análisis completo de los problemas actuales y una propuesta de reorganización del proyecto con las mejores prácticas modernas.

**Fecha de Análisis**: 2024-11-24
**Backup Creado**: `backup_proyecto_original_20251124/`
**Estado Actual**: MVP con errores de configuración

---

## 🔍 Análisis de Problemas Actuales

### 1. Errores Críticos Identificados

#### A. Variables de Entorno No Definidas
```
❌ OAUTH_SERVER_URL - OAuth no funcional
❌ VITE_APP_LOGO - Causando URIError
❌ VITE_APP_TITLE - Variables sin valor por defecto
❌ VITE_ANALYTICS_ENDPOINT - Errores en Express router
❌ VITE_ANALYTICS_WEBSITE_ID - Opcional pero causa warnings
```

**Impacto**:
- Express falla al intentar decodificar URLs con `%VITE_*%`
- Frontend muestra valores literales en lugar de configuración
- OAuth completamente inoperativo

#### B. Arquitectura Inconsistente
```
❌ Documentación contradictoria (con/sin BD)
❌ Base de datos como "temporal" pero necesaria
❌ Stateless philosophy vs. MySQL dependency
```

#### C. Funcionalidad Incompleta
```
✅ Distribución de cuentas (40% implementado)
❌ Generación de archivos XBRL (60% pendiente)
❌ Integración con plantillas oficiales SSPD
❌ Mapeo PUC → XBRL concepts
```

---

## 🏗️ Nueva Estructura Propuesta

### Filosofía de Diseño

1. **Separación de Concerns** - Arquitectura de microservicios modulares
2. **Type Safety First** - TypeScript estricto en todo el stack
3. **Environment-Aware** - Configuración por entorno robusta
4. **Test-Driven** - Cobertura mínima del 80%
5. **Documentation** - Documentación inline y externa
6. **Performance** - Optimización desde el diseño

### Stack Tecnológico Modernizado

#### Frontend
```typescript
- React 19 ✅ (mantener)
- TypeScript 5.9+ ✅ (modo strict)
- TanStack Router (reemplazar wouter)
- TanStack Query v5 ✅ (mantener)
- Tailwind CSS 4 ✅ (mantener)
- shadcn/ui ✅ (mantener)
- Zod ✅ (validación)
- React Hook Form ✅ (mantener)
```

**Justificación cambios**:
- **TanStack Router**: Type-safe routing, mejor DX, file-based routing
- **Modo strict TypeScript**: Prevenir errores en runtime

#### Backend
```typescript
- Node.js 20 LTS (recomendado vs. 24)
- Express ✅ (mantener - probado)
- tRPC v11 ✅ (mantener - excelente)
- Drizzle ORM ✅ (mantener)
- MySQL 8.0+ ✅ (mantener)
- Vitest ✅ (mantener)
- tsx ✅ (mantener)
```

**Sin cambios** - Stack backend sólido

#### Nuevas Dependencias Recomendadas

```json
{
  "dotenv-safe": "^9.1.0",        // Variables env obligatorias
  "envalid": "^8.0.0",            // Validación de env vars
  "winston": "^3.11.0",           // Logging estructurado
  "pino": "^8.17.0",              // Alternativa logger (más rápido)
  "p-limit": "^5.0.0",            // Control de concurrencia
  "archiver": "^6.0.0",           // Generación de ZIP para XBRL
  "@tanstack/router": "^1.58.0",  // Router type-safe
  "msw": "^2.0.0"                 // Mock Service Worker (testing)
}
```

---

## 📁 Nueva Estructura de Directorios

```
xbrl-generator/
├── .github/                      # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── apps/                         # Aplicaciones (monorepo approach)
│   ├── web/                      # Frontend React
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/              # App entry point
│   │   │   ├── features/         # Feature-based modules
│   │   │   │   ├── balance/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── api/
│   │   │   │   │   └── types.ts
│   │   │   │   ├── distribution/
│   │   │   │   └── xbrl/
│   │   │   ├── shared/           # Componentes compartidos
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── utils/
│   │   │   ├── lib/              # Librerías core
│   │   │   │   ├── trpc.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── router.ts
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                      # Backend Express + tRPC
│       ├── src/
│       │   ├── modules/          # Feature modules
│       │   │   ├── balance/
│       │   │   │   ├── balance.router.ts
│       │   │   │   ├── balance.service.ts
│       │   │   │   ├── balance.repository.ts
│       │   │   │   ├── balance.schema.ts
│       │   │   │   └── balance.test.ts
│       │   │   ├── distribution/
│       │   │   ├── xbrl/
│       │   │   └── auth/
│       │   ├── core/             # Core functionality
│       │   │   ├── config/
│       │   │   │   ├── env.ts
│       │   │   │   ├── database.ts
│       │   │   │   └── server.ts
│       │   │   ├── middleware/
│       │   │   │   ├── auth.ts
│       │   │   │   ├── error.ts
│       │   │   │   └── logger.ts
│       │   │   ├── trpc/
│       │   │   │   ├── context.ts
│       │   │   │   ├── trpc.ts
│       │   │   │   └── router.ts
│       │   │   └── utils/
│       │   │       ├── logger.ts
│       │   │       └── errors.ts
│       │   ├── server.ts         # Express app setup
│       │   └── index.ts          # Entry point
│       ├── tests/
│       │   ├── integration/
│       │   ├── unit/
│       │   └── fixtures/
│       ├── esbuild.config.ts
│       └── package.json
│
├── packages/                     # Shared packages
│   ├── database/                 # Drizzle schema & migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── services.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api.ts
│   │   │   ├── domain.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── validators/               # Zod schemas shared
│   │   ├── src/
│   │   │   ├── balance.ts
│   │   │   ├── distribution.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── excel/                    # Excel processing utilities
│       ├── src/
│       │   ├── parser/
│       │   │   ├── balanceParser.ts
│       │   │   ├── pucDetector.ts
│       │   │   └── index.ts
│       │   ├── generator/
│       │   │   ├── excelGenerator.ts
│       │   │   ├── xbrlGenerator.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tests/
│       └── package.json
│
├── docs/                         # Documentación (mantener)
├── config/                       # Configuraciones compartidas
│   ├── eslint-config/
│   ├── typescript-config/
│   └── prettier-config/
│
├── scripts/                      # Scripts de utilidad
│   ├── seed-database.ts
│   ├── generate-mappings.ts
│   └── validate-xbrl.ts
│
├── .env.example                  # Template de variables
├── .env.development.example
├── .env.production.example
├── docker-compose.yml            # MySQL local
├── pnpm-workspace.yaml           # Monorepo config
├── turbo.json                    # Turborepo (opcional)
├── package.json                  # Root package
└── README.md
```

---

## 🔧 Configuración de Variables de Entorno

### Archivo `.env.example` (Nuevo)

```bash
# =============================================================================
# XBRL Generator - Configuración de Entorno
# =============================================================================
# Copiar este archivo como .env.development o .env.production
# y completar los valores requeridos

# -----------------------------------------------------------------------------
# API Server
# -----------------------------------------------------------------------------
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# -----------------------------------------------------------------------------
# Database (MySQL)
# -----------------------------------------------------------------------------
DATABASE_URL=mysql://user:password@localhost:3306/xbrl_generator
DB_POOL_MIN=2
DB_POOL_MAX=10

# -----------------------------------------------------------------------------
# OAuth (Manus Integration)
# -----------------------------------------------------------------------------
OAUTH_SERVER_URL=https://auth.manus.example.com
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback

# -----------------------------------------------------------------------------
# Frontend (Vite)
# -----------------------------------------------------------------------------
VITE_APP_TITLE=XBRL Taxonomy Generator
VITE_APP_LOGO=/logo.svg
VITE_API_URL=http://localhost:3000

# -----------------------------------------------------------------------------
# Analytics (Opcional - Umami)
# -----------------------------------------------------------------------------
VITE_ANALYTICS_ENABLED=false
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# -----------------------------------------------------------------------------
# Features Flags
# -----------------------------------------------------------------------------
ENABLE_XBRL_GENERATION=false
ENABLE_MULTI_PERIOD=false
ENABLE_STRATIFIED_ACCOUNTS=false

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
LOG_LEVEL=debug
LOG_FORMAT=pretty

# -----------------------------------------------------------------------------
# File Upload
# -----------------------------------------------------------------------------
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=xlsx,xls

# -----------------------------------------------------------------------------
# AWS S3 (Opcional para almacenamiento)
# -----------------------------------------------------------------------------
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

### Validación de Variables con `envalid`

```typescript
// apps/api/src/core/config/env.ts
import { cleanEnv, str, port, bool, num, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  PORT: port({ default: 3000 }),
  API_BASE_URL: url(),

  // Database
  DATABASE_URL: str(),
  DB_POOL_MIN: num({ default: 2 }),
  DB_POOL_MAX: num({ default: 10 }),

  // OAuth
  OAUTH_SERVER_URL: url({
    devDefault: 'http://localhost:8080', // Mock en desarrollo
  }),
  OAUTH_CLIENT_ID: str(),
  OAUTH_CLIENT_SECRET: str(),

  // Features
  ENABLE_XBRL_GENERATION: bool({ default: false }),

  // Logging
  LOG_LEVEL: str({
    choices: ['error', 'warn', 'info', 'debug'],
    default: 'info',
  }),
});
```

---

## 🎯 Plan de Migración por Fases

### Fase 0: Preparación (1 día)
- [x] Crear backup del proyecto actual
- [x] Actualizar .gitignore
- [ ] Crear `.env.example` con todas las variables
- [ ] Documentar dependencias actuales
- [ ] Configurar valores por defecto para desarrollo

### Fase 1: Reorganización Básica (2-3 días)
- [ ] Crear estructura de monorepo
- [ ] Mover código a `apps/web` y `apps/api`
- [ ] Extraer schemas a `packages/database`
- [ ] Extraer tipos a `packages/types`
- [ ] Configurar workspaces en pnpm
- [ ] Actualizar imports y path aliases
- [ ] Verificar que todo compile

### Fase 2: Configuración Robusta (1-2 días)
- [ ] Implementar validación de env vars con envalid
- [ ] Crear valores por defecto seguros
- [ ] Añadir logger estructurado (Winston/Pino)
- [ ] Configurar error handling global
- [ ] Añadir middleware de validación

### Fase 3: Testing & Quality (2-3 días)
- [ ] Configurar Vitest para monorepo
- [ ] Escribir tests unitarios para módulos críticos
- [ ] Configurar MSW para mocks de API
- [ ] Añadir tests de integración
- [ ] Configurar CI/CD en GitHub Actions
- [ ] Lograr >80% cobertura

### Fase 4: Módulo XBRL (5-7 días)
- [ ] Diseñar arquitectura de generación XBRL
- [ ] Crear módulo `packages/excel/xbrl`
- [ ] Implementar mapeo PUC → XBRL concepts
- [ ] Integrar plantillas oficiales SSPD
- [ ] Generar archivos XML/XBRLT/XBRL
- [ ] Implementar ZIP packaging
- [ ] Validar contra taxonomías oficiales

### Fase 5: Documentación & Deploy (2-3 días)
- [ ] Actualizar README con nueva estructura
- [ ] Documentar API con OpenAPI/tRPC docs
- [ ] Crear guías de desarrollo
- [ ] Configurar Docker para producción
- [ ] Documentar proceso de deploy
- [ ] Crear scripts de migración

**Tiempo Total Estimado**: 15-20 días laborables

---

## 🚀 Mejoras Técnicas Clave

### 1. Feature-Based Architecture

En lugar de separar por tipo técnico (components/, services/), organizamos por features:

```
features/balance/
  ├── components/           # UI del balance
  ├── hooks/               # Hooks específicos
  ├── api/                 # Llamadas tRPC
  ├── types.ts            # Tipos del dominio
  └── utils.ts            # Utilidades
```

**Beneficios**:
- Colocalización de código relacionado
- Más fácil de escalar
- Mejor para trabajo en equipo
- Módulos independientes

### 2. Type-Safe Environment Variables

```typescript
// ❌ Antes
const url = process.env.OAUTH_SERVER_URL; // string | undefined

// ✅ Después
import { env } from '@/config/env';
const url = env.OAUTH_SERVER_URL; // string (validado)
```

### 3. Logging Estructurado

```typescript
// ❌ Antes
console.log('User loaded balance');

// ✅ Después
logger.info('Balance loaded', {
  userId: user.id,
  filename: file.name,
  accountsCount: accounts.length,
  duration: Date.now() - startTime,
});
```

### 4. Error Handling Consistente

```typescript
// apps/api/src/core/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, 500, details);
  }
}
```

### 5. Monorepo con Shared Packages

```json
// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Beneficios**:
- Reutilización de código entre apps
- Versionado independiente
- Builds optimizados (solo lo que cambió)
- Testing más granular

---

## 📊 Comparación: Antes vs. Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Estructura** | Flat, por tipo técnico | Monorepo, por feature |
| **Type Safety** | Parcial | Total (strict mode) |
| **Env Vars** | Sin validación | Validadas con envalid |
| **Logging** | console.log | Winston/Pino estructurado |
| **Testing** | Tests básicos | >80% cobertura + MSW |
| **Error Handling** | Inconsistente | Clases de error + middleware |
| **Documentation** | Markdown externo | Inline + external + OpenAPI |
| **CI/CD** | Manual | GitHub Actions automatizado |
| **Modules** | Acoplados | Desacoplados en packages |
| **Routing** | wouter | TanStack Router (type-safe) |

---

## 🔐 Seguridad

### Variables de Entorno Sensibles
- Nunca commitear archivos `.env`
- Usar `.env.example` como template
- Validar en CI que no haya secrets en código

### Validación de Inputs
```typescript
// Todos los inputs validados con Zod
export const uploadBalanceSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'File must be less than 10MB'
  ),
  niifGroup: z.enum(['grupo1', 'grupo2', 'grupo3', 'r414']),
});
```

### Rate Limiting
```typescript
// Proteger endpoints con rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
});

app.use('/api/', limiter);
```

---

## 📈 Métricas de Éxito

- ✅ 0 errores de TypeScript en modo strict
- ✅ 0 errores de variables de entorno undefined
- ✅ >80% cobertura de tests
- ✅ Tiempo de build <2 minutos
- ✅ Tiempo de respuesta API <500ms p99
- ✅ Todos los módulos documentados
- ✅ CI passing en todas las branches

---

## 🤝 Siguientes Pasos Recomendados

1. **Revisar y aprobar este plan**
2. **Decidir sobre el alcance de Fase 1**
3. **Configurar entorno de desarrollo con `.env.development`**
4. **Comenzar migración gradual**
5. **Mantener backup funcional durante transición**

---

## 📚 Referencias

- [tRPC Best Practices](https://trpc.io/docs/server/introduction)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [TanStack Router](https://tanstack.com/router)
- [Monorepo with pnpm](https://pnpm.io/workspaces)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

**Autor**: Claude Code
**Fecha**: 2024-11-24
**Versión**: 1.0
