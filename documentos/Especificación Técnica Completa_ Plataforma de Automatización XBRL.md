# Especificación Técnica Completa: Plataforma de Automatización XBRL

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Introducción

Este documento consolida los requisitos, la arquitectura y el flujo de usuario para la aplicación web de automatización de taxonomías XBRL. Sirve como la guía maestra para el equipo de desarrollo.

## 2. Requisitos Funcionales

*Incluye el contenido completo de `requisitos_aplicacion_xbrl_web.md`*

## 3. Arquitectura de la Solución

*Incluye el contenido completo de `arquitectura_solucion_xbrl_web.md`*

## 4. Flujo de Usuario Optimizado

*Incluye el contenido completo de `flujo_usuario_optimizado.md`*

## 5. Modelo de Datos

Se propone el siguiente modelo de datos simplificado para la base de datos PostgreSQL:

**Tabla `users`**
- `id` (PK)
- `email` (UNIQUE)
- `password_hash`
- `full_name`
- `created_at`

**Tabla `companies`**
- `id` (PK)
- `user_id` (FK a `users`)
- `name`
- `nit` (UNIQUE)
- `niif_group` (Enum: G1, G2, G3, R414)
- `default_distribution` (JSONB)

**Tabla `reports`**
- `id` (PK)
- `company_id` (FK a `companies`)
- `reporting_period` (Date)
- `status` (Enum: PENDING, PROCESSING, COMPLETED, FAILED)
- `source_file_path` (Ruta al balance consolidado en S3)
- `final_package_path` (Ruta al .zip final en S3)
- `error_log` (TEXT)
- `created_at`

**Tabla `xbrl_mappings`**
- `id` (PK)
- `puc_code` (VARCHAR)
- `xbrl_concept` (VARCHAR)
- `niif_group` (Enum)
- `sheet_name` (VARCHAR)
- `cell_address` (VARCHAR)

## 6. Plan de Implementación (Estimado)

| Fase | Duración | Hitos Clave |
| :--- | :--- | :--- |
| **1. Setup y Prototipado** | 2 semanas | - Configuración de repositorios (Git), CI/CD, Docker. <br> - Prototipo de carga de Excel y parsing básico. |
| **2. Desarrollo del Backend** | 6 semanas | - API para usuarios, empresas y reportes. <br> - Implementación de la lógica de distribución y validación. <br> - Integración con Celery y Redis. |
| **3. Desarrollo del Frontend** | 6 semanas | - Interfaz de usuario para todo el flujo. <br> - Conexión con el backend API. <br> - Visualización de estados y errores. |
| **4. Módulo XBRL** | 4 semanas | - Creación de la base de datos de mapeos. <br> - Implementación del generador de plantillas Excel. <br> - Generación de los archivos `.xml` y `.xbrlt`. |
| **5. Integración y Pruebas** | 4 semanas | - Pruebas End-to-End del flujo completo. <br> - Pruebas de carga y rendimiento. <br> - Corrección de bugs. |
| **6. Despliegue y Capacitación** | 2 semanas | - Despliegue en producción (Kubernetes). <br> - Capacitación al usuario. <br> - Monitoreo inicial. |
| **Total Estimado** | **~6 meses** | - |

## 7. Consideraciones Adicionales

- **Seguridad**: Implementar autenticación JWT, validación de entradas en todos los endpoints, y políticas de CORS estrictas.
- **Pruebas**: Se debe apuntar a una cobertura de pruebas unitarias superior al 80% para la lógica de negocio crítica.
- **Monitoreo**: Configurar herramientas como Sentry para la captura de errores y Grafana/Prometheus para el monitoreo de rendimiento.
