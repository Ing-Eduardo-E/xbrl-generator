# Documento de Continuidad - Refactorización de Taxonomías

**Fecha de Creación**: 2025-12-05
**Última Sesión**: 2025-12-05
**Branch**: `desarrollo` (sincronizado con `focused-dubinsky`)
**Estado**: Plan aprobado, listo para Fase 1

---

## Contexto del Proyecto

### ¿Qué es este proyecto?
XBRL Taxonomy Generator - Aplicación web para automatizar la generación de taxonomías XBRL para empresas de servicios públicos colombianas que reportan a la SSPD.

### ¿Por qué refactorizar?
El archivo `officialTemplateService.ts` tiene **4,914 líneas** con toda la lógica de todas las taxonomías mezclada. Esto hace imposible:
- Mantener una taxonomía sin afectar otras
- Hacer testing aislado
- Agregar nuevas taxonomías fácilmente
- Entender el código rápidamente

### Estado Actual de Producción
- **R414**: En producción, funcionando correctamente
- **Grupo 1, 2, 3**: Implementados, pendiente validación completa
- **IFE**: Implementación casi completa, falta pruebas XBRL Express

---

## Análisis Completado

### Archivos Problemáticos Identificados

| Archivo | Líneas | Ubicación |
|---------|--------|-----------|
| `officialTemplateService.ts` | 4,914 | `app/src/lib/xbrl/` |
| `xbrlExcelGenerator.ts` | 1,430 | `app/src/lib/services/` |
| `taxonomyConfig.ts` | 812 | `app/src/lib/xbrl/` |
| `xbrlGenerator.ts` | 815 | `app/src/lib/xbrl/` |
| `balance.ts` | 646 | `app/src/server/routers/` |

### Contenido de officialTemplateService.ts

```
Líneas 34-91:     TEMPLATE_PATHS (rutas por grupo)
Líneas 97-164:    SHEET_MAPPING (mapeo hojas Excel por grupo)
Líneas 170-195:   SERVICE_COLUMNS y R414_SERVICE_COLUMNS
Líneas 201-506:   R414_ESF_MAPPINGS (Activos, Pasivos, Patrimonio)
Líneas 512-600:   R414_ER_MAPPINGS (Estado de Resultados)
Líneas 602-688:   R414_PPE_MAPPINGS (Propiedad, Planta y Equipo)
Líneas 690-748:   R414_INTANGIBLES_MAPPINGS
Líneas 750-800:   R414_EFECTIVO_MAPPINGS
Líneas 801-867:   R414_PROVISIONES_MAPPINGS
Líneas 869-973:   R414_BENEFICIOS_EMPLEADOS_MAPPINGS
Líneas 974-1032:  Funciones auxiliares (getTemplatesBasePath, loadTemplate, etc.)
Líneas 1033-2341: customizeExcelWithData (función gigante)
Líneas 2342-4408: rewriteFinancialDataWithExcelJS (función gigante)
Líneas 4409-4687: customizeExcel, customizeXbrlt, customizeXml, generateReadme
Líneas 4688-4911: Exports públicos
```

---

## Plan de Refactorización Aprobado

### Nueva Estructura Propuesta

```
app/src/lib/xbrl/
├── index.ts                          # Exports públicos
├── types.ts                          # Tipos compartidos
├── shared/
│   ├── baseTemplateService.ts        # Clase base abstracta
│   ├── excelUtils.ts                 # Utilidades Excel
│   ├── pucUtils.ts                   # Utilidades PUC
│   └── xmlUtils.ts                   # Utilidades XML
│
├── r414/                             # Taxonomía R414 (PRODUCCIÓN)
│   ├── index.ts
│   ├── config.ts
│   ├── mappings/
│   │   ├── esf.ts                    # ~300 líneas de R414_ESF_*
│   │   ├── er.ts                     # ~60 líneas
│   │   ├── ppe.ts                    # ~90 líneas
│   │   ├── intangibles.ts            # ~60 líneas
│   │   ├── efectivo.ts               # ~50 líneas
│   │   ├── provisiones.ts            # ~70 líneas
│   │   └── beneficiosEmpleados.ts    # ~100 líneas
│   ├── templateService.ts
│   └── generator.ts
│
├── grupo1/                           # Similar estructura
├── grupo2/
├── grupo3/
└── ife/
```

### Fases de Implementación

#### Fase 1: Preparación (SIN CAMBIOS EN PRODUCCIÓN)
- [ ] Crear estructura de carpetas nueva
- [ ] Crear `types.ts` con interfaces compartidas
- [ ] Crear `shared/baseTemplateService.ts` con clase abstracta
- [ ] Crear `shared/excelUtils.ts` extrayendo funciones comunes
- [ ] Crear `shared/pucUtils.ts` extrayendo funciones de PUC
- [ ] Escribir tests de snapshot para R414 actual

#### Fase 2: Extracción R414 (CRÍTICO)
- [ ] Extraer `R414_ESF_ACTIVOS` a `r414/mappings/esf.ts`
- [ ] Extraer `R414_ESF_PASIVOS` a `r414/mappings/esf.ts`
- [ ] Extraer `R414_ESF_PATRIMONIO` a `r414/mappings/esf.ts`
- [ ] Extraer `R414_ER_MAPPINGS` a `r414/mappings/er.ts`
- [ ] Extraer `R414_PPE_MAPPINGS` a `r414/mappings/ppe.ts`
- [ ] Extraer otros mapeos R414
- [ ] Crear `R414TemplateService` extendiendo base
- [ ] Ejecutar tests de regresión
- [ ] Validar con XBRL Express en staging

#### Fase 3: Migración Grupos 1-3
- [ ] Extraer configuraciones Grupo 1
- [ ] Extraer configuraciones Grupo 2
- [ ] Extraer configuraciones Grupo 3
- [ ] Crear servicios específicos por grupo
- [ ] Validar cada grupo

#### Fase 4: Migración IFE
- [ ] Extraer mapeos y configuraciones IFE
- [ ] Implementar `IFETemplateService`
- [ ] Completar pruebas XBRL Express

#### Fase 5: Limpieza
- [ ] Eliminar código legacy
- [ ] Actualizar imports
- [ ] Actualizar documentación

---

## Cómo Continuar

### 1. Verificar Estado del Repositorio
```bash
cd C:\Users\rekin\.claude-worktrees\xbrl-generator\focused-dubinsky
git status
git log --oneline -5
```

### 2. Sincronizar con desarrollo
```bash
git fetch origin
git log --oneline origin/desarrollo -3
```

### 3. Comenzar Fase 1
Crear la estructura de carpetas:
```bash
mkdir -p app/src/lib/xbrl/shared
mkdir -p app/src/lib/xbrl/r414/mappings
mkdir -p app/src/lib/xbrl/grupo1/mappings
mkdir -p app/src/lib/xbrl/grupo2/mappings
mkdir -p app/src/lib/xbrl/grupo3/mappings
mkdir -p app/src/lib/xbrl/ife/mappings
```

### 4. Primer Archivo a Crear
`app/src/lib/xbrl/types.ts`:
```typescript
/**
 * Tipos compartidos para todas las taxonomías XBRL
 */

export type NiifGroup = 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'r533' | 'ife';
export type TaxonomyYear = '2017' | '2018' | '2019' | '2020' | '2021' | '2022' | '2023' | '2024' | '2025';

export interface ESFMapping {
  row: number;
  label: string;
  pucPrefixes: string[];
  excludePrefixes?: string[];
}

export interface TaxonomyProcessor {
  readonly group: NiifGroup;
  generateTemplatePackage(options: TemplateOptions): Promise<Buffer>;
  fillExcelData(workbook: any, data: AccountData[]): void;
  getMappings(): TaxonomyMappings;
}

// ... más tipos
```

---

## Archivos Importantes de Referencia

### Documentación
- `docs/plan_refactorizacion_taxonomias.md` - Plan detallado
- `CLAUDE.md` - Contexto general del proyecto
- `todo.md` - Estado de tareas
- `README.md` - Instrucciones de uso

### Código Fuente Principal
- `app/src/lib/xbrl/officialTemplateService.ts` - Archivo a refactorizar
- `app/src/lib/xbrl/taxonomyConfig.ts` - Configuraciones actuales
- `app/src/server/routers/balance.ts` - Router tRPC

### Plantillas XBRL
- `app/public/templates/r414/` - Plantillas R414
- `app/public/templates/grupo1/` - Plantillas Grupo 1
- `app/public/templates/grupo2/` - Plantillas Grupo 2
- `app/public/templates/grupo3/` - Plantillas Grupo 3
- `app/public/templates/ife/` - Plantillas IFE

---

## Comandos Útiles

```bash
# Desarrollo
cd app && pnpm dev

# Base de datos
pnpm db:push
pnpm db:studio

# Verificar tipos
pnpm type-check

# Buscar en código
grep -rn "R414_ESF" app/src/
grep -rn "NiifGroup" app/src/

# Contar líneas por archivo
wc -l app/src/lib/xbrl/*.ts
```

---

## Contacto y Recursos

- **Repositorio**: https://github.com/Ing-Eduardo-E/xbrl-generator
- **Branch principal**: `master`
- **Branch desarrollo**: `desarrollo`
- **Worktree actual**: `focused-dubinsky`

---

## Notas Importantes

1. **R414 está en PRODUCCIÓN** - No hacer cambios sin tests de regresión
2. **Usar feature flags** si es posible para migración gradual
3. **Validar con XBRL Express** antes de cada merge a desarrollo
4. **Mantener backwards compatibility** durante la migración

---

*Este documento fue creado para permitir continuidad del trabajo en caso de pérdida de contexto.*
