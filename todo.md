# TODO - Generador de Taxonomías XBRL

## Estado Actual del Proyecto (v2.6)

**Última Actualización**: 2025-12-06
**Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4 + shadcn/ui + tRPC 11 + Drizzle ORM + PostgreSQL

---

## 🔴 PROBLEMA ACTUAL - Error ExcelJS Shared Formulas

### Descripción del Error
Al generar plantillas IFE, ExcelJS lanza el error:
```
"Shared Formula master must exist above and or left of clone for cell L26"
```

### Causa Raíz
- Las plantillas Excel de la SSPD tienen **fórmulas compartidas** (shared formulas)
- Estas fórmulas se crean cuando se "arrastra" una fórmula en Excel
- ExcelJS no maneja bien estas fórmulas cuando se intenta escribir en celdas relacionadas
- El error ocurre en `workbook.xlsx.writeBuffer()`, no en `writeCell()`

### Intentos de Solución Realizados
1. ✅ Modificar `writeCell()` para limpiar fórmulas compartidas antes de escribir
2. ❓ Pendiente: Verificar si el error persiste después del fix

### Posibles Soluciones Adicionales
1. **Modificar la plantilla Excel** - Reescribir fórmulas manualmente (no arrastradas)
2. **Evitar escribir en celdas con fórmulas** - Identificar qué celdas tienen fórmulas y saltarlas
3. **Usar otra librería** - SheetJS (xlsx) o similar que maneje mejor este caso

### Celda Problemática
- **L26** en alguna hoja de IFE (probablemente Hoja7 - Detalle ingresos/gastos)
- Columna L = servicio "xmm" (no usado normalmente)

---

## 🟡 REFACTORIZACIÓN COMPLETADA

### Objetivo
Separar el código por taxonomía para que cada una (R414, Grupo1, Grupo2, Grupo3, IFE) tenga sus propios archivos independientes.

### Problema Actual
El archivo `officialTemplateService.ts` tiene **4,914 líneas** con toda la lógica mezclada.

### Documentación de Refactorización
- `docs/plan_refactorizacion_taxonomias.md` - Plan detallado completo
- `docs/CONTINUIDAD_REFACTORIZACION.md` - Documento de continuidad

### Nueva Estructura Propuesta
```
app/src/lib/xbrl/
├── shared/                    # Utilidades compartidas
│   ├── baseTemplateService.ts
│   ├── excelUtils.ts
│   └── pucUtils.ts
├── r414/                      # Taxonomía R414 [PRODUCCIÓN]
│   ├── mappings/esf.ts
│   ├── mappings/er.ts
│   └── templateService.ts
├── grupo1/                    # Similar estructura
├── grupo2/
├── grupo3/
└── ife/
```

### Fases de Implementación

#### Fase 1: Preparación
- [ ] Crear estructura de carpetas nueva
- [ ] Crear `types.ts` con interfaces compartidas
- [ ] Crear `shared/baseTemplateService.ts`
- [ ] Crear utilidades compartidas
- [ ] Escribir tests de snapshot para R414

#### Fase 2: Extracción R414 (Crítico - En Producción)
- [ ] Extraer mapeos ESF (~300 líneas)
- [ ] Extraer mapeos ER (~60 líneas)
- [ ] Extraer mapeos PPE, Intangibles, etc.
- [ ] Crear `R414TemplateService`
- [ ] Tests de regresión
- [ ] Validar con XBRL Express en staging

#### Fase 3: Grupos 1-3
- [ ] Migrar Grupo 1
- [ ] Migrar Grupo 2
- [ ] Migrar Grupo 3

#### Fase 4: IFE
- [ ] Migrar configuraciones IFE
- [ ] Completar pruebas XBRL Express

#### Fase 5: Limpieza
- [ ] Eliminar código legacy de `officialTemplateService.ts`
- [ ] Actualizar imports
- [ ] Actualizar documentación

---

## 🟡 IFE - Informe Financiero Especial Trimestral (EN PRUEBAS)

### Descripción
IFE es la taxonomía trimestral obligatoria de la SSPD desde 2020. Las empresas deben reportar
4 veces al año (por trimestre) además del reporte anual R414/Grupo.

### Diferencias IFE vs R414/Grupos:
- **Periodicidad**: Trimestral (1T, 2T, 3T, 4T) vs Anual
- **CxC**: Por rangos de vencimiento vs por tipo de servicio
- **Estructura**: 8 hojas simplificadas vs 60+ hojas completas

### Implementación Completada:
- [x] Tipos TypeScript para trimestres (`IFETrimestre`)
- [x] Configuración de entry points por trimestre
- [x] Funciones para generar URLs IFE dinámicas
- [x] Configuración de rangos de vencimiento CxC/CxP
- [x] Plantillas IFE copiadas a `public/templates/ife/`
- [x] Configuración de TEMPLATE_PATHS y SHEET_MAPPING para IFE
- [x] UI: Selector de IFE en UploadStep
- [x] UI: Selector de año y trimestre en UploadStep (captura única)
- [x] Backend: Router balance acepta 'ife' como grupo + metadata
- [x] Backend: customizeXbrlt maneja fechas trimestrales IFE
- [x] Implementar llenado de Hoja1 IFE (información general) - 25+ campos
- [x] Implementar llenado de Hoja3 IFE (ESF por servicio)
- [x] Implementar llenado de Hoja4 IFE (ER por servicio)
- [x] Implementar llenado de Hoja5 IFE (CxC por rangos vencimiento)
- [x] Formulario IFECompanyInfoForm con todos los campos SSPD
- [x] Flujo de 4 pasos para IFE (Upload → Distribute → Company-Info → Generate)
- [x] Conexión datos formulario IFE → fillInfoSheetIFE
- [ ] **⚠️ BLOQUEADO: Error ExcelJS Shared Formulas** (ver sección arriba)
- [ ] Pruebas con XBRL Express (pendiente resolver error)

### Distribución CxC por Vencimiento (por defecto):
- No vencidas: 55%
- 1-90 días: 25%
- 91-180 días: 20%
- 181-360 días: 0%
- >360 días: 0%

---

## 🟢 Automatización de Hojas XBRL (COMPLETADO)

### Hojas Automatizadas (12 hojas):
- ✅ **[110000] Hoja1** - Información general (metadatos de empresa)
- ✅ **[210000] Hoja2** - Estado de Situación Financiera (ESF)
- ✅ **[310000] Hoja3** - Estado de Resultados
- ✅ **[900017a] FC01-1** - Gastos Acueducto
- ✅ **[900017b] FC01-2** - Gastos Alcantarillado
- ✅ **[900017c] FC01-3** - Gastos Aseo
- ✅ **[900017g] FC01-7** - Gastos Total servicios
- ✅ **[900019] FC02** - Complementario de ingresos
- ✅ **[900021] FC03-1** - CXC Acueducto (por estrato)
- ✅ **[900022] FC03-2** - CXC Alcantarillado (por estrato)
- ✅ **[900023] FC03-3** - CXC Aseo (por estrato)
- ✅ **[900028b] FC05b** - Pasivos por edades de vencimiento

**Nota:** La hoja [900028] FC05 es una revelación textual, no numérica.

### Flujo Actualizado:
1. Usuario sube balance consolidado
2. Sistema detecta cuentas PUC y niveles
3. Usuario configura porcentajes de distribución
4. Sistema distribuye por servicios (Acueducto, Alcantarillado, Aseo)
5. Usuario descarga plantilla oficial PRE-LLENADA
6. Excel ya tiene datos financieros → Solo importar a XBRL Express

---

## 🟢 Plantillas Oficiales SSPD (COMPLETADO)

### Grupos de Taxonomía Soportados:
- ✅ **Grupo 1** - NIIF Plenas (Grandes empresas) - `co-sspd-ef-Grupo1`
- ✅ **Grupo 2** - NIIF PYMES (Pequeñas y medianas) - `co-sspd-ef-Grupo2`
- ✅ **Grupo 3** - Microempresas (Contabilidad simplificada) - `co-sspd-ef-G3`
- ✅ **R414** - Resolución 414 de 2014 (Sector Público) - `co-sspd-ef-Res414` **[EN PRODUCCIÓN]**
- 🔄 **IFE** - Informe Financiero Especial (Trimestral) - Casi completo

### Archivos de Plantillas:
- `app/public/templates/grupo1/` - Plantillas Grupo 1
- `app/public/templates/grupo2/` - Plantillas Grupo 2
- `app/public/templates/grupo3/` - Plantillas Grupo 3
- `app/public/templates/r414/` - Plantillas R414
- `app/public/templates/ife/` - Plantillas IFE

---

## 🟢 Funcionalidades Principales (COMPLETADO)

- [x] Interfaz de usuario con 3 pasos (Cargar, Configurar, Generar)
- [x] Carga de archivo Excel (balance consolidado)
- [x] Validación de estructura del balance
- [x] Selección de grupo NIIF (grupo1, grupo2, grupo3, r414, ife)
- [x] Configuración de porcentajes de distribución por servicios
- [x] Validación de que los porcentajes sumen 100%
- [x] Procesamiento y distribución de cuentas por servicios
- [x] Validación de ecuaciones contables (Activo = Pasivo + Patrimonio)
- [x] Generación de Excel con balance distribuido (4 hojas)
- [x] Descarga del archivo Excel generado
- [x] Indicador de progreso durante el procesamiento
- [x] Manejo de errores y mensajes informativos (Sonner toasts)
- [x] Generación de paquete XBRL (Excel + XML + xbrlt)
- [x] Soporte para selección de año de taxonomía (2017-2025)
- [x] Soporte para grado de redondeo
- [x] Descarga de plantillas oficiales SSPD personalizadas

---

## API Endpoints (tRPC)

| Endpoint | Tipo | Descripción |
|----------|------|-------------|
| `balance.ping` | Query | Health check |
| `balance.uploadBalance` | Mutation | Cargar y procesar Excel |
| `balance.getTotals` | Query | Obtener totales consolidados |
| `balance.distributeBalance` | Mutation | Distribuir por servicios |
| `balance.getTotalesServicios` | Query | Totales por servicio |
| `balance.downloadExcel` | Query | Descargar Excel distribuido |
| `balance.downloadConsolidated` | Query | Descargar solo consolidado |
| `balance.downloadXBRLExcel` | Query | Descargar Excel formato XBRL |
| `balance.downloadOfficialTemplates` | Mutation | Descargar plantillas oficiales |
| `balance.getSessionInfo` | Query | Información de sesión |
| `balance.getSessionUsuariosSubsidios` | Query | Usuarios/subsidios de sesión |
| `balance.getTaxonomyList` | Query | Lista de taxonomías |

---

## Mejoras Futuras

- [ ] **REFACTORIZACIÓN**: Separar código por taxonomía (en progreso)
- [ ] Pruebas IFE con XBRL Express
- [ ] Guardado de configuraciones en localStorage
- [ ] Exportación/importación de configuraciones
- [ ] Validaciones avanzadas de datos
- [ ] Soporte para múltiples períodos fiscales
- [ ] Testing unitario e integración
- [ ] Dark mode toggle
- [ ] Soporte para R533 cuando SSPD publique plantillas

---

## Correcciones Aplicadas

- [x] Procesador de Excel con encabezados con tildes (CÓDIGO, DENOMINACIÓN)
- [x] Detección de cuentas hoja para evitar doble contabilización
- [x] Validación de ecuaciones contables
- [x] Corrección de error de accesibilidad en input de archivo
- [x] Corrección de tsconfig.json (lib ESNext)
- [x] Corrección de URL de taxonomía (xbrlCorte -> xbrl/Corte)
- [x] Corrección de valor GradoDeRedondeo (formato "N - Descripcion")
- [x] Agregar contexts y entity info al archivo .xbrl
- [x] Uso de plantillas oficiales para compatibilidad con XBRL Express
- [x] Fix: Error "no contiene datos de la empresa" en XBRL Express
- [x] Migración de schema Drizzle a `src/db/schema` para Vercel
- [x] Actualización de seguridad React/Next.js (CVE-2025-55182)

---

## Documentación

| Archivo | Descripción |
|---------|-------------|
| `CLAUDE.md` | Guía para Claude Code |
| `README.md` | Instrucciones de uso |
| `docs/plan_refactorizacion_taxonomias.md` | Plan de refactorización |
| `docs/CONTINUIDAD_REFACTORIZACION.md` | Documento de continuidad |
| `docs/analisis_taxonomias_sspd.md` | Análisis de taxonomías |
| `docs/estructura_puc_colombia.md` | Estructura PUC Colombia |
| `docs/arquitectura_simplificada_sin_bd.md` | Arquitectura del sistema |
