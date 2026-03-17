# Arquitectura del módulo XBRL oficial

## Historia

`officialTemplateService.ts` fue reducido de 4943 a 253 líneas (95% reducción)
extrayendo lógica cohesiva en 6 módulos especializados.

## Módulos

| Módulo | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `interfaces.ts` | 62 | Tipos y contratos del módulo |
| `templatePaths.ts` | 524 | Rutas a plantillas + constantes de mapeo |
| `fileLoaders.ts` | 84 | I/O de archivos + cache LRU (invalidación por mtime, TTL 1h) |
| `excelDataFiller.ts` | 1551 | Relleno de datos contables en plantillas Excel |
| `excelRewriter.ts` | 1639 | Reescritura financiera completa con ExcelJS |
| `templateCustomizers.ts` | 283 | Personalización de metadatos XBRL/XML |
| `index.ts` | 14 | Barrel de re-exports públicos |

## Secciones internas (módulos grandes)

### excelDataFiller.ts — 6 secciones
- **Sección 1**: Constantes de mapeo y configuración
- **Sección 2**: Helpers internos (formateo, utilidades)
- **Sección 3**: Hoja2 (ESF) + Hoja3 (ER) — estados financieros principales
- **Sección 4**: Hojas FC01/FC02/FC03/FC05b — formularios complementarios
- **Sección 5**: Hoja9/10/11 — notas textuales NIIF
- **Sección 6**: IFE trimestral — Hoja3/4/5 IFE

### excelRewriter.ts — 5 secciones
- **Sección 1**: Función principal, workbook setup, helpers de init
- **Sección 2**: R414 — Hoja2 (ESF) + Hoja3 (ER) + Hoja7 (Notas PPE)
- **Sección 3**: Gastos por servicio — Hoja16/17/18
- **Sección 4**: Consolidados y CxC — Hoja22/23/24/25/26/30
- **Sección 5**: Pasivos y conciliación — Hoja32/35

## Flujo de dependencias

```
officialTemplateService.ts  <- punto de entrada (253L)
├── fileLoaders.ts           <- carga + cache (usa: interfaces, templatePaths)
├── excelDataFiller.ts       <- rellena datos (usa: interfaces, r414/mappings)
├── excelRewriter.ts         <- reescribe finanzas (usa: interfaces, r414/mappings)
└── templateCustomizers.ts   <- personaliza metadatos (usa: interfaces)
```

## Módulo compartido

| Módulo | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `shared/baseTemplateService.ts` | 538 | Clase base con helpers ExcelJS (`sumAccountsByPrefix`, `writeCell`, `customizeXml`) |

## Mappings R414

Las constantes de mapeo viven en `r414/mappings/` como fuente única de verdad:
- `esfMappings.ts` -> `R414_ESF_MAPPINGS`, `R414_SERVICE_COLUMNS`
- `erMappings.ts`  -> `R414_ER_MAPPINGS`, `R414_ER_COLUMNS`
- `ppeMappings.ts` -> `R414_PPE_MAPPINGS`, `R414_INTANGIBLES_MAPPINGS`,
  `R414_EFECTIVO_MAPPINGS`, `R414_PROVISIONES_MAPPINGS`,
  `R414_OTRAS_PROVISIONES_MAPPINGS`, `R414_BENEFICIOS_EMPLEADOS_MAPPINGS`
- `index.ts`       -> re-exporta todo lo anterior

## Deuda técnica documentada

| Item | Ubicacion | Prioridad |
|------|-----------|-----------|
| `xlsxBuffer as any` | `excelRewriter.ts:49` | Baja — limitación de ExcelJS types |
| Copies locales de R414 constants | `templatePaths.ts`, `excelDataFiller.ts` | Baja — no causan bugs |
