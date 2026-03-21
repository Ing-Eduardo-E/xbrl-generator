# XBRL Taxonomy Generator — Colombia SSPD

## What This Is

Aplicación web que automatiza la generación de taxonomías XBRL para empresas prestadoras de servicios públicos domiciliarios (ESP) colombianas que reportan a la SSPD. El sistema toma un Excel con el Plan Único de Cuentas (PUC), distribuye los saldos entre servicios (Acueducto, Alcantarillado, Aseo), y genera paquetes ZIP con archivos .xlsx + .xbrlt + .xbrl + .xml compatibles con XBRL Express para radicación en el SUI de la SSPD. Actualmente el módulo IFE Trimestral está operativo; el plan es arreglar R414, implementar Grupos NIIF 1/2/3, y Resolución 533.

## Core Value

Generar archivos XBRL válidos que pasen la validación de XBRL Express y puedan radicarse en el SUI de la SSPD sin errores — reduciendo el tiempo de preparación de 8 horas a 10 minutos.

## Requirements

### Validated

- ✓ IFE Trimestral (8 hojas, 4 trimestres) — operativo al 95%, pendiente testing E2E
- ✓ Carga y procesamiento de Excel PUC (detección flexible de columnas, leaf accounts)
- ✓ Distribución de saldos por servicio usando Largest Remainder Method
- ✓ Validación ecuación contable (Activos = Pasivos + Patrimonio)
- ✓ Empaquetado ZIP con preservación de estructura XBRL Express (hybrid ZIP approach)
- ✓ Wizard UI de 4-5 pasos con shadcn/ui + Tailwind
- ✓ Base de datos SQLite/Turso con esquema de 3 tablas

### Active

- [ ] Diagnosticar y corregir R414: archivos se generan pero celdas del Excel quedan vacías
- [ ] Refactorizar todos los archivos >600 líneas a módulos cohesivos (<600 líneas c/u)
- [ ] Cada taxonomía en su propio módulo independiente (no compartir lógica de negocio)
- [ ] Solo compartir funciones verdaderamente comunes (dateUtils, excelUtils, pucUtils, baseClass)
- [ ] Grupos NIIF 1, 2, 3: implementar llenado de datos completo para taxonomías anuales
- [ ] Resolución 533: crear módulo completo con plantillas y llenado de datos
- [ ] Output anual: .xbrl + .xbrlt + .xlsx que funcionen en XBRL Express para radicación en SUI
- [ ] Testing E2E IFE Trimestral con XBRL Express (completar el 5% faltante)
- [ ] Validación de que los archivos generados se puedan importar y validar en XBRL Express

### Out of Scope

- Módulo de proyección trimestral (proyeccion-trimestral/) — no es taxonomía XBRL
- Módulo convertidor de plantillas (convertir/) — no es taxonomía XBRL
- Resolución 533 en IFE trimestral — la Res. 533 aplica a entidades de gobierno, exentas de IFE
- Autenticación OAuth / gestión de usuarios múltiples — no es el core del producto
- Validación interna XBRL (XBRL Express es la herramienta oficial) — out of scope

## Context

### Estado Actual del Código

**Módulos XBRL existentes** (`src/lib/xbrl/`):
- `ife/` — IFETemplateService.ts (~600 líneas), 8 hojas, FUNCIONANDO al 95%
- `r414/` — R414TemplateService.ts (~1000 líneas), 41 hojas, BUG: datos vacíos
- `grupos/` — grupoEsfErRewriter.ts, grupoFcRewriter.ts, NO probados con archivos reales
- `official/` — excelRewriter.ts (~1200 líneas), excelDataFiller.ts, fileLoaders.ts
- `shared/` — baseTemplateService.ts (~400 líneas), dateUtils, excelUtils, pucUtils

**Problema raíz R414 (hipótesis)**:
El flujo `downloadOfficialTemplates` → `generateOfficialTemplatePackageWithData()` → `R414TemplateService` existe pero los datos del balance de la BD no llegan a las celdas. El `writeCellSafe()` podría estar borrando los valores en lugar de escribirlos, o el mapeo PUC → fila de la hoja no está encontrando coincidencias.

**Archivos >600 líneas que requieren refactorización**:
- `official/excelRewriter.ts`: ~1200 líneas
- `r414/R414TemplateService.ts`: ~1000 líneas
- `r414/config.ts`: ~1400 líneas (mappings)
- `server/routers/balance.ts`: ~600 líneas

### Taxonomías SSPD Colombia

| Grupo | Framework | Entidades | Frecuencia | Estado |
|-------|-----------|-----------|------------|--------|
| IFE | Simplificado | Todos (Grupos 1, 2, R414) | Trimestral | ✅ Operativo |
| Resolución 414 | Marco Normativo Público CGN | ESP ≥50% capital público | Anual | 🐛 Sin datos |
| Grupo 1 | NIIF Plenas | ESP privadas grandes | Anual | ❌ No probado |
| Grupo 2 | NIIF PYMES | ESP privadas medianas | Anual | ❌ No probado |
| Grupo 3 | Contabilidad Simplificada | Microempresas | Anual | ❌ No probado |
| Resolución 533 | Marco Gobierno CGN | Municipios/entidades gobierno | Anual | ❌ Sin implementar |

### Archivos de Plantilla Disponibles

```
public/templates/
├── r414/  R414Ind_ID20037_2024-12-31.{xbrlt,xlsx,xml,xbrl}
├── ife/   IFE_SegundoTrimestre_ID20037_2025-06-30.{xbrlt,xlsx,xml,xbrl}
├── grupo1/ (4 archivos)
├── grupo2/ (4 archivos)
└── grupo3/ (4 archivos)
```
⚠️ Faltan plantillas para Resolución 533

### XBRL Express Workflow

1. App genera ZIP con .xlsx + .xbrlt + .xml + .xbrl
2. Usuario abre .xbrlt en XBRL Express Desktop (Java, v2.8.4)
3. XBRL Express importa datos del .xlsx usando el mapeo .xml
4. Valida contra taxonomía en servidor SUI (`http://www.sui.gov.co/xbrl/...`)
5. Usuario certifica y carga el .xbrl validado al SUI
6. Adjunta PDF firmado (estados financieros + acta)

## Constraints

- **Tech Stack**: Next.js 15.5.9 + React 19.2.1 + tRPC + Drizzle ORM + ExcelJS 4.4.0 + JSZip — no cambiar
- **IFE Intacto**: El módulo IFE Trimestral NO debe romperse durante la refactorización
- **Límite de archivo**: Máx 600 líneas por archivo TypeScript
- **Compatibilidad**: Archivos deben funcionar con XBRL Express v2.8.4 (Apache POI)
- **Deployment**: Vercel (rama master, auto-deploy). Rama desarrollo para trabajo local
- **Pnpm**: Package manager requerido
- **Seguridad**: React 19.2.1 y Next.js 15.5.9 ya tienen CVEs críticos parcheados — no downgrade

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid ZIP approach para XBRL Express | ExcelJS modifica workbook.xml/rels → rompe Apache POI; solución: preservar estructura original, solo reemplazar data sheets | ✓ Funciona para IFE |
| `writeCellSafe()` para escritura de celdas | Limpia shared formulas antes de escribir para evitar "master must exist" en Apache POI | ✓ Probado |
| Módulos separados por taxonomía | Cada taxonomía tiene config, mappings y TemplateService propios; solo shared/ es común | — Pendiente (refactorizar) |
| R414 como primera prioridad | Bug de datos vacíos bloquea el valor core del producto para el segmento más grande de clientes | — Pendiente |
| Resolución 533 en este milestone | Cliente lo pidió explícitamente aunque no hay plantillas aún | — Pendiente investigar plantillas |

---
*Last updated: 2026-03-21 after initialization*
