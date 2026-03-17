# Changelog

Todos los cambios notables del proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

## [Unreleased] — desarrollo → master

### Añadido
- **Feature batch IFE**: generación de los 4 trimestres anuales desde un
  template base en una sola operación, descarga como ZIP con 4 paquetes XBRL
  - `lib/xbrl/shared/dateUtils.ts` — cálculo de rangos trimestrales
  - `lib/xbrl/shared/quarterlyDerivation.ts` — orquestación de opciones batch
  - Procedure tRPC `generateBatchIFE` en `server/routers/balance.ts`
  - Componente `BatchIFECompanyForm` con preview de 4 períodos
  - Selector de modo en `UploadStep` (Individual / Batch 4 trimestres)
- **Suite de tests Vitest**: 30+ tests unitarios e integración para módulos `shared/`
  - `dateUtils.test.ts` — rangos trimestrales y cobertura anual
  - `quarterlyDerivation.test.ts` — generación de opciones batch
  - `integration/batchIFE.test.ts` — continuidad y cobertura temporal

### Mejorado
- **Performance**: `sumAccountsByPrefix` O(N²) → O(1) lookup con Set pre-computado
- **Performance**: `markLeafAccounts` O(N²) → O(N log N) con índice hash
- **DB**: query N+1 en `getTotalesServicios` → 1 query con GROUP BY
- **Cache**: templates XBRL cacheados en memoria con invalidación por mtime + TTL 1h
- **Transacciones**: `uploadBalance` y `distributeBalance` en `db.transaction()`
- **Arquitectura**: `officialTemplateService.ts` reducido de 4943 → 253 líneas,
  extraído en 6 módulos en `lib/xbrl/official/`:
  `templatePaths`, `interfaces`, `fileLoaders`, `excelDataFiller`,
  `excelRewriter`, `templateCustomizers`
- Tipos deduplicados: `excelDataFiller.ts` ahora importa desde `./interfaces`

### Seguridad
- Validación de tamaños en schemas Zod (fileData 10MB, companyName 500, nit 255)
- `escapeXml()` aplicada en campos NIT, companyId y companyName
- Validación de rutas relativas con regex whitelist en `loadTemplate()`
- Logs con datos sensibles protegidos por `NODE_ENV !== 'production'`
- Validación NIT (9-10 dígitos) e ID RUPS (5 dígitos) en formularios
- **CVE-2025-55182 PARCHEADO** — RCE en React Server Components (CVSS 10.0)
  - React 19.2.0 → 19.2.1 · Next.js 15.5.6 → 15.5.7

### Accesibilidad
- `aria-invalid`, `aria-describedby`, `aria-live="polite"` en formularios IFE
- `role="alert"` en mensajes de error, `role="status"` en estados de carga
- `<caption>` y `aria-label` en tabla `UsuariosEstratoForm`

### Pendiente antes de despliegue
- [ ] Rotar credencial DATABASE_URL en Neon → actualizar Vercel env vars → redeploy
- [ ] Ejecutar `pnpm db:push` para aplicar índice `idx_service_is_leaf`
- [ ] Validar generación batch IFE con Excel real en entorno staging

---

## [2.0.0] — 2025-11-25

### Añadido
- Wizard de 3 pasos: Cargar, Distribuir, Generar
- Parser de Excel flexible (detección de columnas por nombre)
- Validación de ecuaciones contables (Activos = Pasivos + Patrimonio)
- Distribución proporcional de cuentas por servicios (Acueducto, Alcantarillado, Aseo)
- Generación de Excel con hoja Consolidada + una hoja por servicio
- Descarga de archivos directamente desde la UI

### Taxonomía IFE (trimestral SSPD)
- Implementación Hoja1 (Balance General)
- Implementación Hoja3 (Flujo de Efectivo)
- Implementación Hoja4 (Estado de Resultados) con fórmulas y distribución por servicios
- Implementación Hoja5 (CxC) con distribución por rangos de antigüedad (55%/25%/20%/0%/0%)
- Implementación Hoja6 (CxP) con distribución por rangos de vencimiento
- Implementación Hoja7 con fórmulas referenciando Hoja4
- Corrección punto de entrada de taxonomía según trimestre seleccionado
- Uso de año de taxonomía 2025 fijo en punto de entrada

### Taxonomía R414 (anual)
- Hoja9: Notas explicativas
- Hoja10: Políticas contables
- Hoja30 FC04: Subsidios
- Hoja35 [900031] FC08: Conciliación de ingresos
- Hoja37 [900040] FC15: Cálculo del IUS

### Stack Tecnológico
- Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- tRPC para API type-safe
- SQLite con Drizzle ORM (dev) · Turso (producción)
- Despliegue en Vercel (rama master)
