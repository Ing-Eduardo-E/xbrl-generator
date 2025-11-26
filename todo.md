# TODO - Generador de Taxonomías XBRL

## Estado Actual del Proyecto (v2.0)

**Última Actualización**: 2025-11-25
**Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + tRPC + Drizzle ORM

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

## En Desarrollo

- [ ] Generación de archivo de mapeo XML
- [ ] Generación de archivo XBRLT
- [ ] Empaquetado XBRL en archivo ZIP
- [ ] Integración con plantillas oficiales SSPD

## Mejoras Futuras

- [ ] Soporte para los 4 grupos NIIF (Grupo 1, 2, 3, R414)
- [ ] Guardado de configuraciones en localStorage
- [ ] Exportación/importación de configuraciones
- [ ] Validaciones avanzadas de datos
- [ ] Soporte para múltiples períodos fiscales
- [ ] Testing unitario e integración
- [ ] Dark mode toggle

## Migración a Next.js (v2.0) - COMPLETADO

- [x] Migración de Vite/React a Next.js 15 con App Router
- [x] Configuración de tRPC con Next.js API Routes
- [x] Configuración de Drizzle ORM con PostgreSQL
- [x] Implementación de componentes shadcn/ui
- [x] Parser de Excel con detección flexible de columnas
- [x] Generador de Excel con múltiples hojas
- [x] Wizard de 3 pasos responsive
- [x] Integración de Sonner para notificaciones

## API Endpoints (tRPC)

- [x] `balance.ping` - Health check
- [x] `balance.uploadBalance` - Cargar y procesar Excel
- [x] `balance.getTotals` - Obtener totales consolidados
- [x] `balance.distributeBalance` - Distribuir por servicios
- [x] `balance.getTotalesServicios` - Totales por servicio
- [x] `balance.downloadExcel` - Descargar Excel distribuido
- [x] `balance.downloadConsolidated` - Descargar solo consolidado

## Correcciones Aplicadas

- [x] Procesador de Excel con encabezados con tildes (CÓDIGO, DENOMINACIÓN)
- [x] Detección de cuentas hoja para evitar doble contabilización
- [x] Validación de ecuaciones contables
- [x] Corrección de error de accesibilidad en input de archivo
- [x] Corrección de tsconfig.json (lib ESNext)

