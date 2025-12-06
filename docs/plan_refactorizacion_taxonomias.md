# Plan de Refactorización - Separación por Taxonomía

**Fecha**: 2025-12-05
**Estado**: Propuesta
**Prioridad**: Alta

## Objetivo

Refactorizar el código para que cada taxonomía (R414, Grupo1, Grupo2, Grupo3, IFE) tenga sus propios archivos independientes, facilitando el mantenimiento y actualización de cada una sin afectar las demás.

## Situación Actual

### Archivos Problemáticos

| Archivo | Líneas | Contenido Mezclado |
|---------|--------|-------------------|
| `officialTemplateService.ts` | 4,914 | Mapeos R414, IFE, configuraciones de todos los grupos |
| `xbrlExcelGenerator.ts` | 1,430 | Mapeos PUC genéricos |
| `taxonomyConfig.ts` | 812 | Configuraciones de todas las taxonomías |
| `xbrlGenerator.ts` | 815 | Lógica de generación mezclada |
| `balance.ts` (router) | 646 | Toda la lógica de negocio |

### Problemas Identificados

1. **Acoplamiento alto**: Cambiar R414 puede afectar IFE o Grupo1
2. **Archivos gigantes**: 4,914 líneas en un solo archivo es inmantenible
3. **Duplicación de lógica**: Patrones similares repetidos para cada grupo
4. **Difícil testing**: No se pueden probar taxonomías de forma aislada
5. **Riesgo en producción**: R414 está en producción, cualquier cambio es riesgoso

## Arquitectura Propuesta

### Nueva Estructura de Carpetas

```
app/src/lib/xbrl/
├── index.ts                          # Exports públicos
├── types.ts                          # Tipos compartidos
├── shared/
│   ├── baseTemplateService.ts        # Clase base abstracta
│   ├── excelUtils.ts                 # Utilidades Excel compartidas
│   ├── pucUtils.ts                   # Utilidades PUC compartidas
│   └── xmlUtils.ts                   # Utilidades XML compartidas
│
├── r414/                             # Taxonomía R414 (en producción)
│   ├── index.ts                      # Exports de R414
│   ├── config.ts                     # Configuración específica R414
│   ├── mappings/
│   │   ├── esf.ts                    # Mapeos ESF (Activos, Pasivos, Patrimonio)
│   │   ├── er.ts                     # Mapeos Estado de Resultados
│   │   ├── ppe.ts                    # Mapeos Propiedad, Planta y Equipo
│   │   ├── intangibles.ts            # Mapeos Intangibles
│   │   ├── efectivo.ts               # Mapeos Efectivo
│   │   ├── provisiones.ts            # Mapeos Provisiones
│   │   └── beneficiosEmpleados.ts    # Mapeos Beneficios Empleados
│   ├── templateService.ts            # Servicio de plantillas R414
│   └── generator.ts                  # Generador XBRL R414
│
├── grupo1/                           # Taxonomía Grupo 1 (NIIF Plenas)
│   ├── index.ts
│   ├── config.ts
│   ├── mappings/
│   │   ├── esf.ts
│   │   ├── er.ts
│   │   └── fc.ts                     # Formularios complementarios
│   ├── templateService.ts
│   └── generator.ts
│
├── grupo2/                           # Taxonomía Grupo 2 (NIIF PYMES)
│   ├── index.ts
│   ├── config.ts
│   ├── mappings/
│   │   └── ...
│   ├── templateService.ts
│   └── generator.ts
│
├── grupo3/                           # Taxonomía Grupo 3 (Microempresas)
│   ├── index.ts
│   ├── config.ts
│   ├── mappings/
│   │   └── ...
│   ├── templateService.ts
│   └── generator.ts
│
└── ife/                              # Taxonomía IFE (Trimestral)
    ├── index.ts
    ├── config.ts
    ├── mappings/
    │   ├── esf.ts                    # ESF por servicio
    │   ├── er.ts                     # ER por servicio
    │   ├── cxc.ts                    # CxC por rangos vencimiento
    │   └── cxp.ts                    # CxP detallado
    ├── templateService.ts
    └── generator.ts
```

### Patrón de Diseño: Strategy + Factory

```typescript
// types.ts - Interfaces compartidas
export interface TaxonomyProcessor {
  readonly group: NiifGroup;
  generateTemplatePackage(options: TemplateOptions): Promise<Buffer>;
  fillExcelData(workbook: ExcelJS.Workbook, data: AccountData[]): void;
  getMappings(): TaxonomyMappings;
}

// shared/baseTemplateService.ts - Clase base
export abstract class BaseTemplateService implements TaxonomyProcessor {
  abstract readonly group: NiifGroup;

  // Métodos comunes
  protected loadTemplate(path: string): Promise<Buffer> { ... }
  protected saveToZip(zip: JSZip, content: Buffer): void { ... }

  // Métodos abstractos que cada taxonomía implementa
  abstract fillESF(worksheet: ExcelJS.Worksheet, accounts: AccountData[]): void;
  abstract fillER(worksheet: ExcelJS.Worksheet, accounts: AccountData[]): void;
  abstract getMappings(): TaxonomyMappings;
}

// r414/templateService.ts - Implementación específica
export class R414TemplateService extends BaseTemplateService {
  readonly group = 'r414';

  fillESF(worksheet: ExcelJS.Worksheet, accounts: AccountData[]): void {
    // Lógica específica de R414
    R414_ESF_MAPPINGS.forEach(mapping => {
      const value = this.sumAccountsByPrefix(accounts, mapping.pucPrefixes);
      worksheet.getCell(`${mapping.column}${mapping.row}`).value = value;
    });
  }
}

// Factory
export function getTaxonomyProcessor(group: NiifGroup): TaxonomyProcessor {
  switch (group) {
    case 'r414': return new R414TemplateService();
    case 'grupo1': return new Grupo1TemplateService();
    case 'grupo2': return new Grupo2TemplateService();
    case 'grupo3': return new Grupo3TemplateService();
    case 'ife': return new IFETemplateService();
    default: throw new Error(`Taxonomía no soportada: ${group}`);
  }
}
```

## Plan de Migración

### Fase 1: Preparación (Sin cambios en producción)
1. Crear estructura de carpetas nueva
2. Crear interfaces y tipos compartidos
3. Crear clase base abstracta
4. Escribir tests para R414 actual (snapshot tests)

### Fase 2: Extracción R414 (Crítico - En Producción)
1. Extraer mapeos R414 a `r414/mappings/`
2. Crear `R414TemplateService` extendiendo la base
3. Mantener el archivo original como fallback
4. Ejecutar tests de regresión
5. Deploy a staging y validar con XBRL Express

### Fase 3: Migración Grupos 1-3
1. Extraer configuraciones de cada grupo
2. Crear servicios específicos
3. Validar cada grupo individualmente

### Fase 4: Migración IFE
1. Extraer mapeos y configuraciones IFE
2. Implementar `IFETemplateService`
3. Completar pruebas pendientes con XBRL Express

### Fase 5: Limpieza
1. Eliminar código legacy de `officialTemplateService.ts`
2. Actualizar imports en todo el proyecto
3. Actualizar documentación

## Archivos a Crear/Modificar

### Nuevos Archivos (~25 archivos)

```
app/src/lib/xbrl/
├── types.ts                          # NUEVO
├── shared/
│   ├── baseTemplateService.ts        # NUEVO
│   ├── excelUtils.ts                 # NUEVO
│   ├── pucUtils.ts                   # NUEVO (extraer de utils.ts)
│   └── xmlUtils.ts                   # NUEVO
├── r414/
│   ├── index.ts                      # NUEVO
│   ├── config.ts                     # NUEVO (extraer de taxonomyConfig.ts)
│   ├── mappings/
│   │   ├── esf.ts                    # NUEVO (extraer ~300 líneas)
│   │   ├── er.ts                     # NUEVO (extraer ~60 líneas)
│   │   ├── ppe.ts                    # NUEVO (extraer ~90 líneas)
│   │   ├── intangibles.ts            # NUEVO (extraer ~60 líneas)
│   │   ├── efectivo.ts               # NUEVO (extraer ~50 líneas)
│   │   ├── provisiones.ts            # NUEVO (extraer ~50 líneas)
│   │   └── beneficiosEmpleados.ts    # NUEVO (extraer ~100 líneas)
│   ├── templateService.ts            # NUEVO
│   └── generator.ts                  # NUEVO
└── ... (similar para grupo1, grupo2, grupo3, ife)
```

### Archivos a Eliminar (Después de Migración)

- `officialTemplateService.ts` (4,914 líneas) → Reemplazado por estructura modular

### Archivos a Reducir Significativamente

- `taxonomyConfig.ts` (812 → ~200 líneas) → Solo tipos y constantes compartidas
- `xbrlExcelGenerator.ts` (1,430 → ~400 líneas) → Lógica movida a servicios específicos

## Beneficios Esperados

1. **Mantenibilidad**: Cada taxonomía en ~500-800 líneas vs 4,914 actuales
2. **Independencia**: Cambios en R414 no afectan IFE ni viceversa
3. **Testing**: Tests unitarios por taxonomía
4. **Onboarding**: Más fácil entender una taxonomía específica
5. **Despliegue**: Posibilidad de feature flags por taxonomía
6. **Escalabilidad**: Agregar R533 u otras taxonomías es trivial

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Romper R414 en producción | Media | Alto | Tests de regresión, feature flags |
| Duplicación de código | Media | Bajo | Clase base abstracta, utilidades compartidas |
| Tiempo de desarrollo extenso | Alta | Medio | Migración por fases |
| Incompatibilidad con XBRL Express | Baja | Alto | Validación en staging antes de cada merge |

## Estimación de Esfuerzo

| Fase | Tareas | Complejidad |
|------|--------|-------------|
| Fase 1: Preparación | 4 | Baja |
| Fase 2: R414 | 5 | Alta (producción) |
| Fase 3: Grupos 1-3 | 9 | Media |
| Fase 4: IFE | 4 | Media |
| Fase 5: Limpieza | 3 | Baja |

## Próximos Pasos Inmediatos

1. [ ] Revisar y aprobar este plan
2. [ ] Crear branch `refactor/taxonomy-separation`
3. [ ] Implementar Fase 1 (preparación)
4. [ ] Crear tests de snapshot para R414 actual
5. [ ] Comenzar extracción de R414

---

**Nota**: R414 está en producción. Cualquier cambio debe ser validado exhaustivamente antes del deploy.
