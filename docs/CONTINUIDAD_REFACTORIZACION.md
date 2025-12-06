# Documento de Continuidad - Refactorizacion de Taxonomias

**Fecha de Creacion**: 2025-12-05
**Ultima Actualizacion**: 2025-12-06
**Branch**: `focused-dubinsky`
**Estado**: ✅ R414 COMPLETADA | ✅ IFE IMPLEMENTADA (pendiente pruebas)

---

## Resumen Ejecutivo

La refactorizacion de taxonomias esta avanzando con exito:

- **R414**: Completada y validada en produccion
- **IFE**: Estructura creada, pendiente pruebas funcionales

El archivo `officialTemplateService.ts` ahora es un dispatcher que delega a los servicios especificos de cada taxonomia.

---

## Completado

### R414 - Resolucion 414 CGN (Sector Publico)

#### Fase 1: Preparacion
- [x] Estructura de carpetas (r414/, shared/, etc.)
- [x] types.ts con interfaces compartidas
- [x] BaseTemplateService clase abstracta
- [x] Utilidades (excelUtils.ts, pucUtils.ts)

#### Fase 2: Extraccion Mapeos R414
- [x] esfMappings.ts - ESF (Activos, Pasivos, Patrimonio)
- [x] erMappings.ts - Estado de Resultados
- [x] ppeMappings.ts - PPE, Intangibles, Efectivo, Provisiones
- [x] fc01Mappings.ts - Gastos por servicio

#### Fase 3: R414TemplateService
- [x] Clase que extiende BaseTemplateService
- [x] fillESFSheet() - Hoja2
- [x] fillERSheet() - Hoja3
- [x] fillHoja7Sheet() - Notas

#### Fase 4: Hojas FC
- [x] fillFC01Sheet() - Gastos por servicio (Hoja16, 17, 18)
- [x] fillFC01TotalSheet() - Total servicios (Hoja22)
- [x] fillFC02Sheet() - Complementario ingresos (Hoja23)
- [x] fillFC03Sheet() - CXC por estrato (Hoja24, 25, 26)
- [x] fillFC05bSheet() - Pasivos por edades (Hoja32)

#### Fase 5: Integracion R414
- [x] officialTemplateService.ts convertido a dispatcher
- [x] Dependencia circular resuelta con config.ts
- [x] TypeScript compila sin errores
- [x] Exports correctos en index.ts

#### Fase 6: Pruebas Funcionales R414
- [x] Subir balance de prueba R414 en la aplicacion
- [x] Verificar que se genera el ZIP correctamente
- [x] Validar en XBRL Express
- [x] Confirmar que officialTemplateService.ts delega a R414TemplateService

---

### IFE - Informe Financiero Especial (Trimestral)

#### Estructura Creada
- [x] Carpeta ife/ con estructura similar a r414/
- [x] config.ts - Rutas y mapeo de hojas
- [x] mappings/esfMappings.ts - ESF por servicios (Hoja3)
- [x] mappings/erMappings.ts - ER por servicios (Hoja4)
- [x] mappings/index.ts - Exports centralizados
- [x] IFETemplateService.ts - Servicio completo
- [x] index.ts - Exports del modulo

#### Metodos Implementados en IFETemplateService
- [x] fillESFSheet() - Hoja3 (Estado de Situacion Financiera)
- [x] fillERSheet() - Hoja4 (Estado de Resultados)
- [x] fillCxCSheet() - Hoja5 (CxC por vencimiento)
- [x] fillCxPSheet() - Hoja6 (CxP por vencimiento)
- [x] fillDetalleIngresosGastosSheet() - Hoja7

#### Integracion en Dispatcher
- [x] Importar ifeTemplateService en officialTemplateService.ts
- [x] Agregar case 'ife' en switch dispatcher
- [x] Actualizar hasOfficialTemplates() y getAvailableTemplateGroups()
- [x] TypeScript compila sin errores

#### Pendiente: Pruebas Funcionales IFE
- [ ] Subir balance de prueba IFE en la aplicacion
- [ ] Verificar que se genera el ZIP correctamente
- [ ] Validar en XBRL Express
- [ ] Comparar con salida esperada

---

## Pendiente

### Otras Taxonomias (Futuro)

- [ ] Grupo1 - Crear desde cero cuando se necesite
- [ ] Grupo2 - Crear desde cero cuando se necesite
- [ ] Grupo3 - Crear desde cero cuando se necesite

---

## Estructura de Archivos Actual

```text
app/src/lib/xbrl/
├── officialTemplateService.ts    # ~300 lineas - DISPATCHER
├── types.ts                      # Tipos compartidos
├── index.ts                      # Exports del modulo
├── shared/
│   ├── baseTemplateService.ts    # Clase base abstracta
│   ├── excelUtils.ts
│   └── pucUtils.ts
├── r414/
│   ├── index.ts                  # Exports R414
│   ├── config.ts                 # Rutas y mapeo de hojas
│   ├── R414TemplateService.ts    # 725 lineas - LOGICA COMPLETA
│   └── mappings/
│       ├── index.ts
│       ├── esfMappings.ts        # ~380 lineas
│       ├── erMappings.ts         # ~120 lineas
│       ├── ppeMappings.ts        # ~505 lineas
│       └── fc01Mappings.ts       # ~100 lineas
└── ife/
    ├── index.ts                  # Exports IFE
    ├── config.ts                 # Rutas y mapeo de hojas
    ├── IFETemplateService.ts     # ~350 lineas
    └── mappings/
        ├── index.ts
        ├── esfMappings.ts        # ~340 lineas
        └── erMappings.ts         # ~130 lineas
```

---

## Estadisticas

| Metrica | Antes | Despues |
|---------|-------|---------|
| officialTemplateService.ts | 4,914 lineas | ~300 lineas |
| Modulo R414 completo | - | ~1,830 lineas |
| Modulo IFE completo | - | ~820 lineas |
| Reduccion codigo monolitico | - | 93.9% |

---

## Comandos Utiles

```bash
# Verificar compilacion
cd app && pnpm type-check

# Iniciar servidor desarrollo
cd app && pnpm dev

# Ver logs de errores
# Los errores aparecen en la terminal del servidor
```

---

## Notas Tecnicas

### Diferencias entre R414 e IFE

| Aspecto | R414 | IFE |
|---------|------|-----|
| Hojas | 60+ | 8 |
| Periodicidad | Anual | Trimestral |
| CxC | Por estrato | Por vencimiento |
| Servicios | 3 (Acueducto, Alcantarillado, Aseo) | 8 (incluye Energia, Gas, GLP, XMM) |
| Complejidad | Alta | Media |

### Dependencia Circular Resuelta

El archivo config.ts en cada modulo (r414/, ife/) fue creado para romper dependencias circulares entre index.ts y el TemplateService correspondiente.

### Conversion de Tipos

El dispatcher en officialTemplateService.ts convierte los tipos del router al formato esperado por cada TemplateService mediante funciones convertToR414Options() y convertToIFEOptions().
