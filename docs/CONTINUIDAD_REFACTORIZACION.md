# Documento de Continuidad - Refactorización de Taxonomías

**Fecha de Creación**: 2025-12-05
**Última Actualización**: 2025-12-06
**Branch**: `desarrollo` (sincronizado con `focused-dubinsky`)
**Estado**: Fase 1 y 2 completadas, Fase 3 en progreso

---

## Progreso Actual

### ✅ Fase 1: Preparación - COMPLETADA
- [x] Crear estructura de carpetas nueva
- [x] Crear `types.ts` con interfaces compartidas
- [x] Crear `shared/baseTemplateService.ts` con clase abstracta
- [x] Crear `shared/excelUtils.ts` extrayendo funciones comunes
- [x] Crear `shared/pucUtils.ts` extrayendo funciones de PUC
- [x] Crear `shared/index.ts` para exportaciones

### ✅ Fase 2: Extracción Mapeos R414 - COMPLETADA
- [x] Extraer `R414_ESF_ACTIVOS` a `r414/mappings/esfMappings.ts`
- [x] Extraer `R414_ESF_PASIVOS` a `r414/mappings/esfMappings.ts`
- [x] Extraer `R414_ESF_PATRIMONIO` a `r414/mappings/esfMappings.ts`
- [x] Extraer `R414_ER_MAPPINGS` a `r414/mappings/erMappings.ts`
- [x] Extraer `R414_PPE_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Extraer `R414_INTANGIBLES_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Extraer `R414_EFECTIVO_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Extraer `R414_PROVISIONES_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Extraer `R414_OTRAS_PROVISIONES_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Extraer `R414_BENEFICIOS_EMPLEADOS_MAPPINGS` a `r414/mappings/ppeMappings.ts`
- [x] Crear `r414/index.ts` con configuración de plantillas

### 🔄 Fase 3: Crear R414TemplateService - EN PROGRESO
- [ ] Crear `r414/R414TemplateService.ts` que extienda `BaseTemplateService`
- [ ] Implementar `fillESFSheet()` para R414
- [ ] Implementar `fillERSheet()` para R414
- [ ] Implementar `fillHoja7Sheet()` para notas
- [ ] Modificar `officialTemplateService.ts` para delegar a R414TemplateService

---

## Estructura Actual de Archivos

```
app/src/lib/xbrl/
├── index.ts                    # Exports principales (actualizado)
├── types.ts                    # ✅ NUEVO - Tipos compartidos
├── shared/
│   ├── index.ts               # ✅ NUEVO
│   ├── baseTemplateService.ts # ✅ NUEVO - Clase abstracta base
│   ├── excelUtils.ts          # ✅ NUEVO - Utilidades Excel
│   └── pucUtils.ts            # ✅ NUEVO - Utilidades PUC
├── r414/
│   ├── index.ts               # ✅ NUEVO - Config y exports R414
│   └── mappings/
│       ├── index.ts           # ✅ NUEVO
│       ├── esfMappings.ts     # ✅ NUEVO - ESF (Activos, Pasivos, Patrimonio)
│       ├── erMappings.ts      # ✅ NUEVO - Estado de Resultados
│       └── ppeMappings.ts     # ✅ NUEVO - PPE, Intangibles, Efectivo, Provisiones
├── grupo1/mappings/           # Carpeta creada (vacía)
├── grupo2/mappings/           # Carpeta creada (vacía)
├── grupo3/mappings/           # Carpeta creada (vacía)
├── ife/mappings/              # Carpeta creada (vacía)
│
├── officialTemplateService.ts # ORIGINAL - 4,914 líneas (aún sin modificar)
├── taxonomyConfig.ts          # ORIGINAL
├── xbrlGenerator.ts           # ORIGINAL
└── xbrlExcelGenerator.ts      # ORIGINAL
```

---

## Próximos Pasos para Continuar

### Opción A: Crear R414TemplateService (Recomendado)

1. **Crear `r414/R414TemplateService.ts`**:
```typescript
import { BaseTemplateService } from '../shared/baseTemplateService';
import { R414_ESF_MAPPINGS, R414_ER_MAPPINGS, R414_SERVICE_COLUMNS } from './mappings';
import type { NiifGroup, TemplatePaths, ESFMapping, SheetMapping } from '../types';

export class R414TemplateService extends BaseTemplateService {
  readonly group: NiifGroup = 'r414';

  readonly templatePaths: TemplatePaths = {
    xbrlt: 'r414/R414Ind_ID20037_2024-12-31.xbrlt',
    xml: 'r414/R414Ind_ID20037_2024-12-31.xml',
    xlsx: 'r414/R414Ind_ID20037_2024-12-31.xlsx',
    xbrl: 'r414/R414Ind_ID20037_2024-12-31.xbrl',
    basePrefix: 'R414Ind',
    outputPrefix: 'R414_Individual',
  };

  getESFMappings(): ESFMapping[] {
    return R414_ESF_MAPPINGS;
  }

  getServiceColumns() {
    return R414_SERVICE_COLUMNS;
  }

  getSheetMapping(): SheetMapping {
    return {
      '110000': 'Hoja1',
      '210000': 'Hoja2',
      '310000': 'Hoja3',
      // ... etc
    };
  }

  fillESFSheet(worksheet, accounts, serviceBalances, distribution) {
    // Copiar lógica de officialTemplateService.ts líneas 1181-1242
  }

  fillERSheet(worksheet, accounts, serviceBalances, distribution) {
    // Copiar lógica de officialTemplateService.ts líneas 1297-1358
  }
}
```

2. **Modificar `officialTemplateService.ts`**:
   - En la función `generateOfficialTemplatePackageWithData()`:
   - Agregar: `if (options.niifGroup === 'r414') { return new R414TemplateService().generateTemplatePackage(options); }`

3. **Verificar**:
   - Ejecutar `pnpm type-check`
   - Probar la generación de R414 en el navegador
   - Validar el archivo generado en XBRL Express

### Opción B: Continuar Extrayendo Mapeos de Otras Taxonomías

Si prefieres primero extraer todos los mapeos antes de crear los servicios:
- Analizar `officialTemplateService.ts` para Grupo1/2/3
- Crear archivos en `grupo1/mappings/`, etc.

---

## Comandos para Verificar Estado

```bash
# Ver estado del repositorio
cd C:\Users\rekin\.claude-worktrees\xbrl-generator\focused-dubinsky
git status
git log --oneline -5

# Verificar que compila
cd app && pnpm type-check

# Iniciar servidor de desarrollo para probar
pnpm dev
```

---

## Archivos Clave Creados

### types.ts (298 líneas)
Contiene todas las interfaces compartidas:
- `NiifGroup`, `TaxonomyYear`, `ReportType`
- `ESFMapping`, `ServiceColumnMapping`, `SheetMapping`
- `AccountData`, `ServiceBalanceData`
- `TaxonomyProcessor` (interface para Strategy pattern)

### shared/baseTemplateService.ts (410 líneas)
Clase abstracta base con métodos:
- `generateTemplatePackage()` - Genera el ZIP completo
- `fillExcelData()` - Llena datos en workbook
- `loadTemplate()`, `loadBinaryTemplate()` - Carga archivos
- `sumAccountsByPrefix()`, `sumServiceAccountsByPrefix()` - Cálculos
- `customizeXbrlt()`, `customizeXml()`, `customizeXbrl()` - Personalización
- Métodos abstractos: `fillESFSheet()`, `fillERSheet()`, `getESFMappings()`, etc.

### r414/mappings/esfMappings.ts (~380 líneas)
- `R414_SERVICE_COLUMNS` - Columnas por servicio (I, J, K, P)
- `R414_ESF_ACTIVOS` - Mapeos de activos (filas 15-31)
- `R414_ESF_PASIVOS` - Mapeos de pasivos (filas 69-108)
- `R414_ESF_PATRIMONIO` - Mapeos de patrimonio (filas 113-130)
- `R414_ESF_MAPPINGS` - Combinación de todos

### r414/mappings/erMappings.ts (~120 líneas)
- `R414_ER_COLUMNS` - Columnas ER (E, F, G, L)
- `R414_ER_MAPPINGS` - Mapeos de Estado de Resultados

### r414/mappings/ppeMappings.ts (~505 líneas)
- `R414_PPE_MAPPINGS` - Propiedad, Planta y Equipo (filas 14-34)
- `R414_INTANGIBLES_MAPPINGS` - Intangibles y Plusvalía (filas 37-48)
- `R414_EFECTIVO_MAPPINGS` - Efectivo y Equivalentes (filas 51-60)
- `R414_PROVISIONES_MAPPINGS` - Provisiones (filas 63-73)
- `R414_OTRAS_PROVISIONES_MAPPINGS` - Otras Provisiones (filas 75-77)
- `R414_BENEFICIOS_EMPLEADOS_MAPPINGS` - Beneficios a Empleados (filas 79-83)

---

## Commits Realizados

```
2e45c02 refactor(r414): agregar mapeos faltantes de Hoja7 (Efectivo, Provisiones, Beneficios)
90e0a7b refactor(r414): extraer mapeos R414 a carpeta independiente - Fase 2
7b7e143 refactor(xbrl): implementar Fase 1 - estructura base y utilidades compartidas
904b8e8 docs: agregar plan de refactorización y documentación de continuidad
d510ff2 docs: actualizar CLAUDE.md con stack tecnológico y arquitectura actual
```

---

## Notas Importantes

1. **El código original NO ha sido modificado** - `officialTemplateService.ts` sigue intacto
2. **R414 sigue funcionando en producción** - Los nuevos archivos son adicionales
3. **Los mapeos extraídos son 100% compatibles** - Mismos valores que el original
4. **Próximo paso crítico**: Crear `R414TemplateService` y hacer que `officialTemplateService.ts` delegue a él

---

## Contexto Técnico

### Stack
- Next.js 15 con App Router
- React 19 + TypeScript
- tRPC 11 para API
- ExcelJS + xlsx para manipulación Excel
- JSZip para generar paquetes

### Flujo de Datos
1. Usuario sube Excel con balance consolidado
2. Backend procesa y almacena en `working_accounts`
3. Usuario define distribución por servicio (%)
4. Backend distribuye cuentas a `service_balances`
5. Al generar: se carga plantilla XBRL, se llenan datos, se genera ZIP

### Cómo se usa R414TemplateService (una vez creado)
```typescript
// En officialTemplateService.ts:
export async function generateOfficialTemplatePackageWithData(options) {
  if (options.niifGroup === 'r414') {
    const service = new R414TemplateService();
    return service.generateTemplatePackage(options);
  }
  // ... resto de código para otros grupos
}
```

---

*Actualizado: 2025-12-06 - Fases 1 y 2 completadas, Fase 3 en progreso*
