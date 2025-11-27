# TODO - Generador de Taxonomías XBRL

## Estado Actual del Proyecto (v2.1)

**Última Actualización**: 2025-11-26
**Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + tRPC + Drizzle ORM

## 🆕 Nuevo Enfoque: Plantillas Oficiales XBRL Express

### Cambio de Metodología
En lugar de generar la estructura XBRL desde cero (muy complejo y propenso a errores),
ahora usamos las **plantillas oficiales de XBRL Express** como base:

1. **Usuario sube balance** → Sistema procesa cuentas PUC
2. **Sistema genera Excel** → Rellena plantilla oficial con datos del balance
3. **Sistema genera .xbrlt** → Adapta plantilla con datos de la empresa
4. **Usuario abre en XBRL Express** → Completa datos faltantes y genera XBRL final

### Archivos Involucrados
- `xbrlTemplateService.ts` - Nuevo servicio de plantillas
- `public/templates/` - Plantillas oficiales por taxonomía
- `PuntoEntrada_R414_Individual-2024.xbrlt` - Template R414
- `PuntoEntrada_R414_Individual-2024_1.xlsx` - Excel R414

## Funcionalidades Principales

- [x] Interfaz de usuario con 3 pasos (Cargar, Configurar, Generar)
- [x] Carga de archivo Excel (balance consolidado)
- [x] Validación de estructura del balance
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

## Taxonomías Soportadas

- [x] **R414** - Resolución 414 de 2014 (Contaduría General de la Nación)
- [ ] **Grupo 1** - NIIF Plenas (Grandes empresas)
- [ ] **Grupo 2** - NIIF PYMES (Pequeñas y medianas)
- [ ] **Grupo 3** - Microempresas (Contabilidad simplificada)

## En Desarrollo

- [ ] Integrar xbrlTemplateService en el endpoint downloadXBRL
- [ ] Mapear celdas Excel R414 a conceptos XBRL
- [ ] UI para seleccionar taxonomía antes de generar
- [ ] Descargar plantillas de otras taxonomías (Grupo1, Grupo2, Grupo3)

## Mejoras Futuras

- [ ] Guardado de configuraciones en localStorage
- [ ] Exportación/importación de configuraciones
- [ ] Validaciones avanzadas de datos
- [ ] Soporte para múltiples períodos fiscales
- [ ] Testing unitario e integración
- [ ] Dark mode toggle

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

## Correcciones Aplicadas

- [x] Procesador de Excel con encabezados con tildes (CÓDIGO, DENOMINACIÓN)
- [x] Detección de cuentas hoja para evitar doble contabilización
- [x] Validación de ecuaciones contables
- [x] Corrección de error de accesibilidad en input de archivo
- [x] Corrección de tsconfig.json (lib ESNext)
- [x] Corrección de URL de taxonomía (xbrlCorte -> xbrl/Corte)
- [x] Corrección de valor GradoDeRedondeo (formato "N - Descripcion")
- [x] Agregar contexts y entity info al archivo .xbrl

