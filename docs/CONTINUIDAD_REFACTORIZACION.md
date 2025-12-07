# Documento de Continuidad - Refactorizacion de Taxonomias

**Fecha de Creacion**: 2025-12-05
**Ultima Actualizacion**: 2025-12-06
**Branch**: `desarrollo`
**Estado**: ✅ R414 COMPLETADA | 🔄 IFE EN PROGRESO (wizard completo con 4 pasos, pendiente pruebas funcionales)

---

## Resumen Ejecutivo

La refactorizacion de taxonomias esta avanzando con exito:

- **R414**: Completada y validada en produccion
- **IFE**: Estructura backend creada, wizard frontend actualizado, pendiente pruebas funcionales

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

#### Wizard Frontend para IFE
- [x] **page.tsx**: Estado `niifGroup` para pasar entre pasos del wizard
- [x] **page.tsx**: Estado `ifeCompanyData` para datos de empresa IFE
- [x] **page.tsx**: Wizard dinámico con 4 pasos para IFE (upload, distribute, company-info, generate)
- [x] **UploadStep.tsx**: Selector de año IFE (2020-2025)
- [x] **UploadStep.tsx**: Selector de trimestre filtrado por año (2020 solo 2T-4T)
- [x] **UploadStep.tsx**: Notas informativas para IFE
- [x] **UploadStep.tsx**: `onSuccess` ahora pasa `niifGroup` al siguiente paso
- [x] **DistributeStep.tsx**: Recibe prop `niifGroup`
- [x] **DistributeStep.tsx**: Oculta formulario usuarios por estrato para IFE
- [x] **DistributeStep.tsx**: Oculta formulario subsidios para IFE
- [x] **DistributeStep.tsx**: Muestra nota informativa explicando diferencias IFE
- [x] Validacion ajustada: IFE no requiere usuarios por estrato

#### Formulario de Informacion de Empresa IFE (NUEVO)
- [x] **IFECompanyInfoForm.tsx**: Componente completo para información de empresa
- [x] Información básica: NIT, RUPS, nombre, dirección, ciudad, teléfono, email
- [x] Información de empleados: inicio, fin y promedio del periodo
- [x] Representante legal: tipo documento, número, nombres, apellidos
- [x] Marco normativo: grupo normativo, declaración de cumplimiento
- [x] Continuidad: incertidumbre negocio en marcha, finalización de servicios
- [x] Ajustes: ajustes a trimestres anteriores con explicación
- [x] Validación de campos requeridos y condicionales
- [x] Cálculo automático de promedio de empleados

#### WizardLayout Dinámico
- [x] **WizardLayout.tsx**: Acepta `steps` como prop opcional
- [x] **WizardLayout.tsx**: Export de `ifeSteps` para wizard de 4 pasos
- [x] **WizardLayout.tsx**: `WizardStep` type incluye 'company-info'
- [x] **GenerateStep.tsx**: Acepta `ifeCompanyData` opcional
- [x] **GenerateStep.tsx**: Pre-llena formulario con datos de IFE si disponibles

#### Pendiente: Pruebas Funcionales IFE
- [ ] Subir balance de prueba IFE en la aplicacion
- [ ] Verificar que se genera el ZIP correctamente
- [ ] Validar en XBRL Express
- [ ] Comparar con salida esperada

---

## Pendiente

### IFE - Tareas Pendientes

#### Backend / Router
- [x] Actualizar router `balance.ts` para manejar opciones especificas de IFE (año, trimestre)
- [x] Agregar campo `ifeMetadata` en schema `balanceSessions`
- [x] Validacion de año/trimestre en backend (2020 solo 2T-4T)
- [x] `UploadStep.tsx` envia año/trimestre al backend
- [ ] Agregar campos adicionales de informacion de empresa para IFE (futuro)
- [ ] Ajustar `downloadOfficialTemplates` para pasar año/trimestre a IFETemplateService

#### Plantilla Oficial IFE
- [x] Verificar que existe plantilla en `public/templates/ife/`
- [x] Archivos: `.xbrl`, `.xbrlt`, `.xlsx`, `.xml` presentes
- [x] Configuracion en `ife/config.ts` con mapeo de hojas
- [x] Columnas de servicios configuradas (8 servicios: Acueducto, Alcantarillado, Aseo, Energia, Gas, GLP, XMM, Otras)

#### Pruebas
- [ ] Probar flujo completo: Upload → Distribute → Generate para IFE
- [ ] Validar ZIP generado en XBRL Express
- [ ] Comparar con plantilla esperada

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
| Usuarios por estrato | SI requiere | NO requiere |
| Subsidios | SI requiere | NO requiere |
| Informacion empresa | Basica | Extendida |
| Disponible desde | 2017 | 2T 2020 |

### Dependencia Circular Resuelta

El archivo config.ts en cada modulo (r414/, ife/) fue creado para romper dependencias circulares entre index.ts y el TemplateService correspondiente.

### Conversion de Tipos

El dispatcher en officialTemplateService.ts convierte los tipos del router al formato esperado por cada TemplateService mediante funciones convertToR414Options() y convertToIFEOptions().

### Flujo del Wizard por Taxonomia

```
TAXONOMIAS ANUALES (R414, Grupo1, Grupo2, Grupo3) - 3 pasos:
1. Upload → [Seleccionar grupo NIIF + archivo]
2. Distribute → [Usuarios estrato + Subsidios + Porcentajes]
3. Generate → [Datos empresa + Descargar XBRL]

TAXONOMIA TRIMESTRAL (IFE) - 4 pasos:
1. Upload → [Seleccionar IFE + Año + Trimestre + archivo]
2. Distribute → [Solo porcentajes de distribución]
3. Company-Info → [Info empresa extendida: empleados, representante, marco normativo]
4. Generate → [Descargar XBRL con datos pre-llenados]
```

### Archivos Frontend Modificados para IFE

| Archivo | Cambios |
|---------|---------|
| `page.tsx` | Estado `niifGroup` y `ifeCompanyData`, wizard dinámico 4 pasos |
| `WizardLayout.tsx` | Props dinámicas `steps`, export `ifeSteps`, type `company-info` |
| `UploadStep.tsx` | Selectores año/trimestre, filtro 2020 |
| `DistributeStep.tsx` | Prop `niifGroup`, condicionales `isIFE` |
| `GenerateStep.tsx` | Prop `ifeCompanyData`, pre-llenado de formulario |
| `IFECompanyInfoForm.tsx` | **NUEVO** - Formulario completo de info empresa IFE |
| `ui/textarea.tsx` | **NUEVO** - Componente shadcn/ui para áreas de texto |
