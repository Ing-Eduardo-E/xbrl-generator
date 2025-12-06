# Documento de Continuidad - Refactorización de Taxonomías

**Fecha de Creación**: 2025-12-05
**Última Actualización**: 2025-12-06
**Branch**: `desarrollo` (sincronizado con `focused-dubinsky`)
**Estado**: Fases 1-4 completadas, Fase 5 pendiente

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

### ✅ Fase 3: Crear R414TemplateService - COMPLETADA
- [x] Crear `r414/R414TemplateService.ts` que extienda `BaseTemplateService`
- [x] Implementar `fillESFSheet()` para R414
- [x] Implementar `fillERSheet()` para R414
- [x] Implementar `fillHoja7Sheet()` para notas (PPE, Intangibles, Efectivo, Provisiones, Beneficios)
- [x] Actualizar `r414/index.ts` para exportar el servicio
- [x] Actualizar `xbrl/index.ts` para exportar R414TemplateService
- [x] Verificar que compila sin errores (`pnpm type-check`)

### ✅ Fase 4: Hojas FC01-FC03 y FC05b - COMPLETADA
- [x] Crear `r414/mappings/fc01Mappings.ts` con mapeos de gastos
- [x] Implementar `fillFC01Sheet()` para gastos por servicio individual
- [x] Implementar `fillFC01TotalSheet()` para Hoja22 (suma de Hoja16, 17, 18)
- [x] Implementar `fillFC02Sheet()` para complementario de ingresos (Hoja23)
- [x] Implementar `fillFC03Sheet()` para CXC por estrato (Hoja24, 25, 26)
- [x] Implementar `fillFC05bSheet()` para pasivos por edades (Hoja32)
- [x] Actualizar override de `fillExcelData()` para llamar todos los métodos
- [x] Actualizar `types.ts` para incluir campos no residenciales en UsuariosEstrato
- [x] Verificar que compila sin errores (`pnpm type-check`)

### ⏳ Fase 5: Integración y Limpieza - PENDIENTE
- [ ] Modificar `officialTemplateService.ts` para delegar a R414TemplateService
- [ ] Pruebas de integración con datos reales
- [ ] Validar con XBRL Express
- [ ] Eliminar código duplicado de `officialTemplateService.ts`

---

## Estructura Actual de Archivos

```
app/src/lib/xbrl/
├── index.ts                    # ✅ ACTUALIZADO - Exports incluyendo R414TemplateService
├── types.ts                    # ✅ ACTUALIZADO - Incluye UsuariosEstrato con campos no residenciales
├── shared/
│   ├── index.ts               # ✅ NUEVO
│   ├── baseTemplateService.ts # ✅ NUEVO - Clase abstracta base
│   ├── excelUtils.ts          # ✅ NUEVO - Utilidades Excel
│   └── pucUtils.ts            # ✅ NUEVO - Utilidades PUC
├── r414/
│   ├── index.ts               # ✅ ACTUALIZADO - Config y exports R414
│   ├── R414TemplateService.ts # ✅ COMPLETO - 725 líneas con todos los métodos
│   └── mappings/
│       ├── index.ts           # ✅ ACTUALIZADO - Exports todos los mapeos
│       ├── esfMappings.ts     # ✅ NUEVO - ESF (Activos, Pasivos, Patrimonio)
│       ├── erMappings.ts      # ✅ NUEVO - Estado de Resultados
│       ├── ppeMappings.ts     # ✅ NUEVO - PPE, Intangibles, Efectivo, Provisiones
│       └── fc01Mappings.ts    # ✅ NUEVO - Mapeos FC01 (Gastos por servicio)
├── grupo1/mappings/           # Carpeta creada (vacía)
├── grupo2/mappings/           # Carpeta creada (vacía)
├── grupo3/mappings/           # Carpeta creada (vacía)
├── ife/mappings/              # Carpeta creada (vacía)
│
├── officialTemplateService.ts # ORIGINAL - 4,914 líneas (pendiente de delegación)
├── taxonomyConfig.ts          # ORIGINAL
├── xbrlGenerator.ts           # ORIGINAL
└── xbrlExcelGenerator.ts      # ORIGINAL
```

---

## R414TemplateService - Métodos Implementados

El servicio R414 ahora tiene 725 líneas y contiene todos los métodos necesarios:

### Métodos de Hoja Principal
- `fillESFSheet()` - Estado de Situación Financiera (Hoja2)
- `fillERSheet()` - Estado de Resultados (Hoja3)
- `fillHoja7Sheet()` - Notas (PPE, Intangibles, Efectivo, Provisiones, Beneficios)

### Métodos FC01 (Gastos por Servicio)
- `fillFC01Sheet()` - Llena una hoja FC01 individual (Hoja16, 17, 18)
- `fillFC01TotalSheet()` - Suma de Hoja16, 17, 18 → Hoja22

### Métodos FC02/FC03/FC05b
- `fillFC02Sheet()` - Complementario de Ingresos (Hoja23)
- `fillFC03Sheet()` - CXC por estrato (Hoja24, 25, 26)
- `fillFC05bSheet()` - Pasivos por edades (Hoja32)

### Override Principal
- `fillExcelData()` - Orquesta todas las llamadas anteriores

---

## Próximos Pasos para Continuar

### Fase 5: Integración y Limpieza

1. **Modificar `officialTemplateService.ts`**:
   - En la función `generateOfficialTemplatePackageWithData()`:
   - Agregar: `if (options.niifGroup === 'r414') { return new R414TemplateService().generateTemplatePackage(options); }`

2. **Pruebas de Integración**:
   - Probar la generación de R414 en el navegador
   - Comparar salida con la generación anterior
   - Validar el archivo generado en XBRL Express

3. **Limpieza**:
   - Eliminar código duplicado de `officialTemplateService.ts`
   - Documentar las diferencias

### Opción Alternativa: Continuar con Otras Taxonomías

Si prefieres expandir a otras taxonomías antes de la integración:
- Analizar `officialTemplateService.ts` para Grupo1/2/3
- Crear servicios similares a R414TemplateService

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
