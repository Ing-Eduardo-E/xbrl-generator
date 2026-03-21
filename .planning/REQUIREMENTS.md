# Requirements: XBRL Taxonomy Generator — Colombia SSPD

**Defined:** 2026-03-21
**Core Value:** Generar archivos XBRL válidos que pasen XBRL Express y puedan radicarse en SUI sin errores — reduciendo el tiempo de preparación de 8 horas a 10 minutos.

---

## v1 Requirements

### Testing & Safety Net (deben ejecutarse ANTES de cualquier refactorización)

- [ ] **TEST-01**: Existe test de pipeline E2E para IFE que verifica que `preserveOriginalStructure()` produce un ZIP con 4 archivos de nombres correctos y celdas ESF/ER no vacías
- [ ] **TEST-02**: Existe test de pipeline E2E para R414 que verifica que `generateOfficialTemplatePackageWithData()` produce un ZIP con celdas ESF y ER pobladas (valores ≠ 0 para cuentas de prueba)
- [ ] **TEST-03**: Existe test unitario para `generateOfficialTemplatePackageWithData()` que verifica la forma del ZIP de salida (4 archivos, nombres correctos, estructura interna)

### Bug Fixes (prioridad #1 — bloquean el valor core del producto)

- [ ] **BUG-01**: R414 genera archivos .xlsx con datos reales en celdas ESF y ER — el bug de `isLeaf` DB flag vs. detección dinámica de cuentas hoja está corregido usando `codesWithChildren` Set como en `BaseTemplateService`
- [ ] **BUG-02**: IFE actualiza correctamente la URL del entry point XSD para todos los trimestres (1T, 2T, 3T, 4T) en `templateCustomizers.ts` — no solo Q2

### Architecture & Refactoring (prerequisito para módulos limpios)

- [ ] **ARCH-01**: Las dos interfaces `TemplateWithDataOptions` (en `types.ts` y `official/interfaces.ts`) están unificadas en una sola en `shared/types.ts` con todos los campos necesarios
- [ ] **ARCH-02**: `official/excelDataFiller.ts` (1,580 líneas de código SheetJS muerto) está eliminado del proyecto — sin referencias rotas
- [ ] **ARCH-03**: `writeCellSafe()` existe una sola vez en `shared/excelUtils.ts` y es importado por todos los módulos que lo necesiten (no duplicado en excelRewriter.ts)
- [ ] **ARCH-04**: `official/excelRewriter.ts` (actualmente 2,463 líneas) está dividido en un dispatcher de <150 líneas + archivos de lógica por taxonomía, ninguno >600 líneas
- [ ] **ARCH-05**: `r414/R414TemplateService.ts` (actualmente 1,891 líneas) está dividido en mínimo 4 archivos enfocados (<600 líneas c/u): `R414EsfSheet.ts`, `R414ErSheet.ts`, `R414Fc01Sheets.ts`, `R414NotesSheets.ts`
- [ ] **ARCH-06**: `ife/IFETemplateService.ts` (actualmente 1,061 líneas) está dividido en archivos <600 líneas, preservando toda la funcionalidad trimestral existente
- [ ] **ARCH-07**: La lógica de empaquetado ZIP (`preserveOriginalStructure()`) está movida a `shared/zipBuilder.ts` como función utilitaria reutilizable por todos los módulos
- [ ] **ARCH-08**: Cada módulo de taxonomía (`r414/`, `ife/`, `grupo1/`, `grupo2/`, `grupo3/`) tiene su propio `index.ts` con exports limpios y no importa directamente de otros módulos de taxonomía (solo de `shared/`)

### Resolución 414 — Datos Completos (anuales)

- [ ] **R414-01**: El output Excel de R414 tiene el Estado de Situación Financiera (Hoja2) completamente poblado con los saldos distribuidos por servicio
- [ ] **R414-02**: El output Excel de R414 tiene el Estado de Resultados (Hoja3) completamente poblado con ingresos, gastos y costos por servicio
- [ ] **R414-03**: El output Excel de R414 tiene los Formularios Complementarios FC01 (gastos por servicio: Hoja16-Hoja22) con valores distribuidos correctamente para Acueducto, Alcantarillado y Aseo
- [ ] **R414-04**: El output Excel de R414 tiene la Hoja1 (información general) con todos los campos de empresa correctamente diligenciados (NIT, nombre, dirección, fecha, responsable)
- [ ] **R414-05**: El paquete ZIP de R414 generado se abre en XBRL Express v2.8.4 sin errores y muestra los datos financieros correctos al importar el Excel con la plantilla .xbrlt

### Grupos NIIF 1, 2, 3 — Taxonomías Anuales

- [ ] **NIIF-01**: Las coordenadas de celdas de Hoja1 (información general) en las plantillas Excel de Grupo 1, 2 y 3 están verificadas contra los archivos .xlsx reales y son correctas en el código
- [ ] **NIIF-02**: El output Excel de Grupo 1 (NIIF Plenas) tiene ESF, ER y FC01 completamente poblados — el paquete ZIP se abre en XBRL Express sin errores
- [ ] **NIIF-03**: El output Excel de Grupo 2 (NIIF PYMES) tiene ESF, ER y FC01 completamente poblados — el paquete ZIP se abre en XBRL Express sin errores
- [ ] **NIIF-04**: El output Excel de Grupo 3 (Contabilidad Simplificada) tiene ESF, ER y FC01 completamente poblados — el paquete ZIP se abre en XBRL Express sin errores
- [ ] **NIIF-05**: Los módulos `grupo1/`, `grupo2/`, `grupo3/` son independientes entre sí; comparten únicamente utilidades de `shared/`

### IFE Trimestral — Completar el 5% faltante

- [ ] **IFE-01**: IFE Trimestral pasa testing E2E completo en XBRL Express para los 4 trimestres (1T, 2T, 3T, 4T) con datos reales de prueba
- [ ] **IFE-02**: Hoja6 (CxP por antigüedad) de IFE tiene llenado de datos implementado y verificado

---

## v2 Requirements (diferidos a siguiente milestone)

### Resolución 533

- **R533-01**: Módulo completo para Resolución 533 (entidades de gobierno) — requiere obtener plantillas oficiales de SSPD, implementar PUC del Marco Normativo CGN (completamente diferente), ~60-80h adicionales

### Formularios FC Adicionales R414

- **R414-FC-01**: FC02 (Ingresos complementarios), FC03 (CxC por estrato), FC04 (Subsidios), FC05 (CxP) completamente poblados
- **R414-FC-02**: Información actuarial (FC08) y otros formularios especializados

### Mejoras UI/UX

- **UI-01**: Validación en tiempo real de la ecuación contable al cargar el Excel
- **UI-02**: Preview de datos antes de generar el ZIP (tabla de cuentas clasificadas)
- **UI-03**: Historial de reportes generados por sesión

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Resolución 533 (v1) | Requiere PUC completamente diferente (CGN Gobierno); sin plantillas disponibles; entidades municipales, no ESP; ~60-80h adicionales. Queda como v2. |
| Módulo de Proyección Trimestral | No es taxonomía XBRL — funcionalidad diferente, módulo separado existente |
| Convertidor de Plantillas | No es taxonomía XBRL — funcionalidad legacy |
| Validación XBRL interna | XBRL Express es la herramienta oficial de SSPD; no replicar su validador |
| Autenticación multi-usuario | No es el core del producto en este milestone |
| Modo consolidado vs. individual (multi-entidad) | Solo reportes individuales en v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 — Safety Net & Bug Fixes | Pending |
| TEST-02 | Phase 1 — Safety Net & Bug Fixes | Pending |
| TEST-03 | Phase 1 — Safety Net & Bug Fixes | Pending |
| BUG-01 | Phase 1 — Safety Net & Bug Fixes | Pending |
| BUG-02 | Phase 1 — Safety Net & Bug Fixes | Pending |
| ARCH-01 | Phase 2 — Architecture Cleanup | Pending |
| ARCH-02 | Phase 2 — Architecture Cleanup | Pending |
| ARCH-03 | Phase 2 — Architecture Cleanup | Pending |
| ARCH-04 | Phase 3 — Modular Decomposition | Pending |
| ARCH-05 | Phase 3 — Modular Decomposition | Pending |
| ARCH-06 | Phase 3 — Modular Decomposition | Pending |
| ARCH-07 | Phase 3 — Modular Decomposition | Pending |
| ARCH-08 | Phase 3 — Modular Decomposition | Pending |
| R414-01 | Phase 1 — Safety Net & Bug Fixes | Pending |
| R414-02 | Phase 1 — Safety Net & Bug Fixes | Pending |
| R414-03 | Phase 2 — Architecture Cleanup | Pending |
| R414-04 | Phase 1 — Safety Net & Bug Fixes | Pending |
| R414-05 | Phase 4 — Grupos NIIF Completion | Pending |
| NIIF-01 | Phase 4 — Grupos NIIF Completion | Pending |
| NIIF-02 | Phase 4 — Grupos NIIF Completion | Pending |
| NIIF-03 | Phase 4 — Grupos NIIF Completion | Pending |
| NIIF-04 | Phase 4 — Grupos NIIF Completion | Pending |
| NIIF-05 | Phase 3 — Modular Decomposition | Pending |
| IFE-01 | Phase 1 — Safety Net & Bug Fixes | Pending |
| IFE-02 | Phase 2 — Architecture Cleanup | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓
- Phase 5 (Integration & Polish): no new requirements — delivers integration of all prior phase work

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability phase names updated after roadmap creation*
