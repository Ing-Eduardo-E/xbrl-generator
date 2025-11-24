# Especificación de Requisitos: Plataforma Web para Reportes NIIF-XBRL

**Autor**: Manus AI
**Fecha**: 21 de noviembre de 2025

## 1. Introducción

Este documento define los requisitos funcionales y no funcionales para el desarrollo de una aplicación web destinada a la generación de informes financieros en formato XBRL, de acuerdo con las taxonomías NIIF para los diferentes grupos de empresas en Colombia. La plataforma reemplazará y modernizará el flujo de trabajo actualmente soportado por la aplicación de escritorio `Reporting Standard XBRL`.

El objetivo principal es ofrecer una solución centralizada, colaborativa y fácil de usar que simplifique el proceso de reporte para las empresas, garantizando el cumplimiento con las normativas de la Superintendencia de Servicios Públicos Domiciliarios (SSPD).

## 2. Alcance del Proyecto

La aplicación web deberá soportar el ciclo completo de generación de un informe XBRL, incluyendo:

-   La gestión de las taxonomías oficiales publicadas por el SUI.
-   La provisión de plantillas de Microsoft Excel para la carga de datos.
-   La carga de datos a través de las plantillas diligenciadas.
-   La validación de los datos contra las reglas de la taxonomía.
-   La generación de los archivos finales del reporte XBRL (instancia, mapeo, etc.).
-   La visualización y descarga de los reportes generados y los resultados de la validación.

La plataforma deberá dar soporte a los cuatro grupos normativos analizados: Grupo 1 (NIIF Plenas), Grupo 2 (NIIF para PYMES), Grupo 3 (Microempresas) y R414 (ESAL).

## 3. Requisitos Funcionales

### 3.1. Módulo de Autenticación y Gestión de Usuarios

| ID | Requisito | Descripción |
|:---|:---|:---|
| RF-001 | **Registro de Usuarios** | Los administradores podrán crear cuentas de usuario para los empleados de las empresas reportantes. |
| RF-002 | **Inicio de Sesión** | Los usuarios deberán poder iniciar sesión de forma segura con su correo electrónico y contraseña. |
| RF-003 | **Roles de Usuario** | El sistema deberá soportar al menos dos roles: **Administrador** (gestiona usuarios y taxonomías) y **Usuario Reportante** (crea y gestiona informes). |
| RF-004 | **Gestión de Empresas** | Un usuario podrá estar asociado a una o varias empresas, permitiendo la gestión centralizada de reportes para grupos empresariales. |

### 3.2. Módulo de Gestión de Taxonomías

| ID | Requisito | Descripción |
|:---|:---|:---|
| RF-005 | **Carga de Taxonomías** | El administrador deberá poder cargar las taxonomías oficiales (archivos `.xsd` y relacionados) para cada grupo NIIF y para cada período de reporte. |
| RF-006 | **Catálogo Centralizado** | El sistema mantendrá un catálogo centralizado y versionado de todas las taxonomías disponibles, indicando su vigencia. |
| RF-007 | **Visualización de Taxonomías** | Los usuarios deberán poder explorar la estructura de una taxonomía, visualizando sus conceptos, jerarquías (presentación, cálculo) y dimensiones. |

### 3.3. Módulo de Generación de Reportes

Este es el módulo central de la aplicación y debe seguir un flujo de trabajo claro y guiado.

| ID | Requisito | Descripción |
|:---|:---|:---|
| RF-008 | **Creación de un Nuevo Reporte** | El usuario iniciará el proceso seleccionando la empresa, el período de reporte (ej. 2024) y el grupo NIIF correspondiente. |
| RF-009 | **Descarga de Plantilla Excel** | Basado en la selección anterior, el sistema ofrecerá para descarga la plantilla de Microsoft Excel (`.xlsx`) correcta y pre-configurada para ese grupo y período. |
| RF-010 | **Carga de Plantilla Diligenciada** | Una vez el usuario haya completado los datos en la plantilla de Excel, deberá poder cargar el archivo `.xlsx` a la plataforma. |
| RF-011 | **Procesamiento y Validación** | El backend procesará el archivo Excel cargado. Extraerá los datos y aplicará las reglas de validación definidas en la taxonomía XBRL correspondiente (validación de tipos de dato, reglas de cálculo, aserciones de fórmula, etc.). |
| RF-012 | **Generación de Archivos XBRL** | Si la validación es exitosa, el sistema generará el paquete completo de archivos del reporte: la instancia `.xbrl`, el archivo de mapeo `.xbrlt` y el archivo de configuración `.xml`. |
| RF-013 | **Reporte de Errores de Validación** | Si se encuentran errores durante la validación, el sistema deberá presentar un informe claro y detallado al usuario, indicando la celda del Excel, la regla incumplida y un mensaje descriptivo del error. |
| RF-014 | **Iteración y Corrección** | El usuario deberá poder descargar el reporte de errores, corregir su archivo Excel y volver a cargarlo para un nuevo intento de validación, manteniendo el historial de intentos. |

### 3.4. Módulo de Dashboard y Consulta

| ID | Requisito | Descripción |
|:---|:---|:---|
| RF-015 | **Dashboard de Reportes** | El usuario verá un panel de control con el listado de todos los reportes que ha creado, mostrando su estado (En Proceso, Validado con Errores, Completado). |
| RF-016 | **Visualización de Reporte Completado** | Para un reporte completado, el usuario podrá ver los metadatos del mismo y descargar el paquete de archivos `.zip` con todos los entregables (`.xbrl`, `.xbrlt`, `.xml`, `.xlsx`). |
| RF-017 | **Historial de Versiones** | El sistema guardará un historial de las versiones del archivo Excel cargado para cada reporte, permitiendo la trazabilidad. |

## 4. Requisitos No Funcionales

| ID | Requisito | Descripción |
|:---|:---|:---|
| RNF-001 | **Rendimiento** | La validación de un reporte de Grupo 1 (el más complejo) no deberá tardar más de 5 minutos. La interfaz de usuario debe ser fluida y responsiva. |
| RNF-002 | **Escalabilidad** | La arquitectura deberá poder escalar horizontalmente para soportar un número creciente de usuarios y reportes simultáneos durante las temporadas altas de reporte. |
| RNF-003 | **Seguridad** | La aplicación deberá implementar medidas de seguridad estándar, incluyendo protección contra inyección de código, XSS, CSRF. Los datos de los clientes deben estar aislados y protegidos. Las contraseñas deben almacenarse hasheadas. |
| RNF-004 | **Usabilidad** | La interfaz de usuario debe ser intuitiva y guiar al usuario a través del proceso de reporte, minimizando la necesidad de conocimientos técnicos sobre XBRL. |
| RNF-005 | **Compatibilidad** | El frontend deberá ser compatible con las últimas versiones de los navegadores web modernos (Chrome, Firefox, Edge, Safari). |
| RNF-006 | **Disponibilidad** | El sistema deberá tener una disponibilidad del 99.9%. |

## 5. Flujo de Trabajo del Usuario

1.  El **Administrador** carga las nuevas taxonomías para el período fiscal.
2.  El **Usuario Reportante** inicia sesión en la plataforma.
3.  Navega a la sección "Crear Nuevo Reporte".
4.  Selecciona la empresa, el año fiscal y el grupo NIIF (ej. Grupo 2).
5.  El sistema le ofrece el link para **descargar la plantilla de Excel** para el Grupo 2.
6.  El usuario trabaja offline, diligenciando la plantilla con los datos financieros de la empresa.
7.  Una vez completada, el usuario vuelve a la plataforma y **carga el archivo Excel**.
8.  El sistema pone el reporte en estado "Procesando" y ejecuta la validación en segundo plano.
9.  **Caso A: Validación Exitosa.**
    -   El estado del reporte cambia a "Completado".
    -   El usuario recibe una notificación (ej. por email).
    -   El usuario puede descargar el `.zip` con los archivos XBRL finales.
10. **Caso B: Validación con Errores.**
    -   El estado del reporte cambia a "Validado con Errores".
    -   El usuario recibe una notificación.
    -   En la plataforma, puede ver un **listado detallado de los errores** y descargar un reporte de validación.
    -   El usuario corrige los datos en su archivo Excel y lo vuelve a cargar (repite desde el paso 7).
