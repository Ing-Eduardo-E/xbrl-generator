# TODO - Generador de Taxonomías XBRL

## Estado Actual del Proyecto (v2.3)

**Última Actualización**: 2025-01-27
**Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + tRPC + Drizzle ORM

## 🆕 Automatización de Hojas XBRL (EN PROGRESO)

### Nueva Integración de Datos Financieros
Se implementó la integración de datos del balance distribuido directamente en las
plantillas oficiales XBRL, automatizando el llenado de las siguientes hojas:

**Hojas Automatizadas:**
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
Se usa [900028b] FC05b para datos de pasivos.

**Flujo Actualizado:**
1. Usuario sube balance consolidado
2. Sistema detecta cuentas PUC y niveles
3. Usuario configura porcentajes de distribución
4. Sistema distribuye por servicios (Acueducto, Alcantarillado, Aseo)
5. **Usuario descarga plantilla oficial PRE-LLENADA**
6. Excel ya tiene datos financieros → Solo copiar/pegar a XBRL Express

### Archivos Modificados
- `app/src/lib/xbrl/officialTemplateService.ts` - Nueva función `generateOfficialTemplatePackageWithData`
- `app/src/server/routers/balance.ts` - Actualizado `downloadOfficialTemplates` para incluir datos

## Implementación de Plantillas Oficiales SSPD (COMPLETADO)

### Sistema de Plantillas Oficiales
Se implementó un enfoque que utiliza las plantillas oficiales de XBRL Express
proporcionadas por la SSPD, garantizando 100% de compatibilidad con el catálogo de taxonomías.

**Grupos de Taxonomía Soportados:**
- ✅ **Grupo 1** - NIIF Plenas (Grandes empresas)
- ✅ **Grupo 2** - NIIF PYMES (Pequeñas y medianas empresas)  
- ✅ **Grupo 3** - Microempresas (Contabilidad simplificada)
- ✅ **R414** - Resolución 414 de 2014 (Sector Público/Contaduría General de la Nación)

### Archivos Implementados
- `app/src/lib/xbrl/officialTemplateService.ts` - Servicio de plantillas oficiales
- `app/public/templates/grupo1/` - Plantillas Grupo 1 (NIIF Plenas)
- `app/public/templates/grupo2/` - Plantillas Grupo 2 (NIIF PYMES)
- `app/public/templates/grupo3/` - Plantillas Grupo 3 (Microempresas)
- `app/public/templates/r414/` - Plantillas R414 (Sector Público)

## Funcionalidades Principales

- [x] Interfaz de usuario con 3 pasos (Cargar, Configurar, Generar)
- [x] Carga de archivo Excel (balance consolidado)
- [x] Validación de estructura del balance
- [x] **Selección de grupo NIIF (grupo1, grupo2, grupo3, r414)**
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
- [x] **Descarga de plantillas oficiales SSPD personalizadas**

## Taxonomías Soportadas (Con Plantillas Oficiales)

- [x] **Grupo 1** - NIIF Plenas (Grandes empresas) - `co-sspd-ef-Grupo1`
- [x] **Grupo 2** - NIIF PYMES (Pequeñas y medianas) - `co-sspd-ef-Grupo2`
- [x] **Grupo 3** - Microempresas (Contabilidad simplificada) - `co-sspd-ef-G3`
- [x] **R414** - Resolución 414 de 2014 (Sector Público) - `co-sspd-ef-Res414`

## API Endpoints (tRPC)

- [x] `balance.ping` - Health check
- [x] `balance.uploadBalance` - Cargar y procesar Excel
- [x] `balance.getTotals` - Obtener totales consolidados
- [x] `balance.distributeBalance` - Distribuir por servicios
- [x] `balance.getTotalesServicios` - Totales por servicio
- [x] `balance.downloadExcel` - Descargar Excel distribuido
- [x] `balance.downloadConsolidated` - Descargar solo consolidado
- [x] `balance.downloadXBRLExcel` - Descargar Excel formato XBRL Express
- [x] `balance.downloadXBRL` - Descargar paquete XBRL completo
- [x] `balance.getSessionInfo` - Información de sesión actual
- [x] `balance.getTaxonomyList` - Lista de taxonomías disponibles
- [x] **`balance.downloadOfficialTemplates`** - Descargar plantillas oficiales SSPD

## Mejoras Futuras

- [ ] Guardado de configuraciones en localStorage
- [ ] Exportación/importación de configuraciones
- [ ] Validaciones avanzadas de datos
- [ ] Soporte para múltiples períodos fiscales
- [ ] Testing unitario e integración
- [ ] Dark mode toggle
- [ ] Soporte para R533 e IFE cuando SSPD publique plantillas

## Correcciones Aplicadas

- [x] Procesador de Excel con encabezados con tildes (CÓDIGO, DENOMINACIÓN)
- [x] Detección de cuentas hoja para evitar doble contabilización
- [x] Validación de ecuaciones contables
- [x] Corrección de error de accesibilidad en input de archivo
- [x] Corrección de tsconfig.json (lib ESNext)
- [x] Corrección de URL de taxonomía (xbrlCorte -> xbrl/Corte)
- [x] Corrección de valor GradoDeRedondeo (formato "N - Descripcion")
- [x] Agregar contexts y entity info al archivo .xbrl
- [x] **Uso de plantillas oficiales para compatibilidad con catálogo XBRL Express**
- [x] **Fix: Error "no contiene datos de la empresa" en XBRL Express**
  - Reemplazo de 590 placeholders `<xbrli:identifier scheme="_">_</xbrli:identifier>` con valores reales
  - Pre-llenado de Hoja1 (110000) del Excel con datos del formulario (E13-E22)
  - Actualización de fechas según año del reporte del usuario

