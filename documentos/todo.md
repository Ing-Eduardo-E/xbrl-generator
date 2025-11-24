# TODO - Generador de Taxonomías XBRL

## Funcionalidades Principales

- [x] Interfaz de usuario con 3 pasos (Cargar, Configurar, Generar)
- [x] Carga de archivo Excel (balance consolidado)
- [x] Validación de estructura del balance
- [x] Configuración de porcentajes de distribución por servicios
- [x] Validación de que los porcentajes sumen 100%
- [x] Procesamiento y distribución de cuentas por servicios
- [x] Validación de ecuaciones contables (Activo = Pasivo + Patrimonio)
- [x] Generación de plantilla Excel XBRL diligenciada
- [x] Generación de archivo de mapeo XML
- [x] Generación de archivo XBRLT
- [x] Empaquetado en archivo ZIP
- [x] Descarga del paquete generado
- [x] Indicador de progreso durante el procesamiento
- [x] Manejo de errores y mensajes informativos

## Mejoras Futuras

- [ ] Soporte para los 4 grupos NIIF (Grupo 1, 2, 3, R414)
- [ ] Guardado de configuraciones en localStorage
- [ ] Exportación/importación de configuraciones
- [ ] Validaciones avanzadas de datos
- [ ] Soporte para múltiples períodos fiscales

## Correcciones y Ajustes

- [x] Ajustar procesador de Excel para soportar encabezados con tildes (CÓDIGO, DENOMINACIÓN)
- [x] Soportar formato con columnas Corriente/No Corriente/Total
- [x] Mejorar detección automática de encabezados

- [x] Corregir lógica de suma para evitar doble contabilización
- [x] Implementar detección de nivel jerárquico (clase/grupo/cuenta/subcuenta)
- [x] Sumar solo las cuentas de nivel más bajo (hojas del árbol contable)

- [x] Simplificar lectura de valores para usar directamente la columna Total

- [x] Investigar estructura del Plan Único de Cuentas (PUC) de Colombia
- [x] Agregar logs de depuración para identificar el problema de suma

- [x] Ajustar procesador para leer archivo simplificado (3 columnas)
- [x] Agregar logs detallados de depuración

- [x] Agregar vista previa de datos cargados en la interfaz de usuario
- [x] Mostrar distribución de cuentas por longitud para depuración

- [x] Identificar y corregir error "Uncaught (in promise) undefined"
- [x] Verificar por qué no se genera balanceData.debug

- [x] Eliminar filtro de longitud mínima (>= 4 dígitos) para leer todas las cuentas

- [x] Analizar por qué la suma da 904M en lugar de 65M con el filtro funcionando
- [x] Verificar si hay valores duplicados o incorrectos en la lectura

- [x] Analizar imagen de cuentas de activos proporcionada por el usuario
- [x] Identificar exactamente qué cuentas deben sumarse
- [x] Corregir lógica de suma para que coincida con el total esperado ($65,921,694.55)

## Migración a Backend con Base de Datos

- [x] Agregar funcionalidad web-db-user al proyecto
- [x] Crear esquema de base de datos con tabla cuentas_trabajo
- [x] Crear endpoint POST /api/cuentas/cargar para procesar Excel (trpc.balance.cargar)
- [x] Implementar lógica de truncate + insert en el backend
- [x] Implementar identificación de cuentas hoja usando SQL (NOT EXISTS)
- [x] Crear endpoint GET /api/cuentas/totales para obtener sumas (trpc.balance.getTotales)
- [x] Actualizar frontend para usar la API en lugar de procesamiento local
- [x] Probar con archivo real del usuario (Activos: $65.92M ✅)
- [x] Corregir bug de cálculos incorrectos (ahora usa SQL en lugar de JavaScript)


## Validación de Ecuaciones Contables

- [x] Verificar que todas las clases (1-9) se calculen correctamente
- [x] Validar ecuación del balance: Activo (1) = Pasivo (2) + Patrimonio (3) ✅
- [x] Validar ecuación de resultados: Utilidad = Ingresos (4) - Gastos (5) - Costos (6) ✅
- [x] Documentar cualquier discrepancia encontrada


## Distribución por Servicios

- [x] Crear tabla balances_servicio en la base de datos
- [x] Implementar lógica de distribución proporcional por servicio
- [x] Crear endpoint para distribuir balance por servicios (trpc.balance.distribuir)
- [x] Validar que las sumas de los servicios coincidan con el consolidado ✅
- [x] Actualizar frontend para enviar configuración de servicios
- [x] Probar con porcentajes: Acueducto 40%, Alcantarillado 20%, Aseo 40% ✅


## Descarga de Datos en Excel

- [x] Crear módulo para generar archivos Excel con xlsx (excelGenerator.ts)
- [x] Crear endpoint para descargar balance consolidado (balance.descargarConsolidado)
- [x] Crear endpoint para descargar balances por servicio (balance.descargarExcel)
- [x] Generar Excel con múltiples hojas (Consolidado + 1 hoja por servicio) ✅
- [x] Actualizar frontend para mostrar botón de descarga
- [x] Probar descarga con datos reales (1.3MB, 4 hojas) ✅
