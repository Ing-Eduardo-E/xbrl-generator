# Arquitectura de la Solución: Plataforma de Automatización XBRL

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Visión General

La arquitectura propuesta está diseñada para ser **robusta, escalable y mantenible**, utilizando un stack tecnológico moderno basado en Python y React. El objetivo es separar claramente las responsabilidades entre el frontend (interfaz de usuario), el backend (API y lógica de negocio) y el procesamiento asíncrono (tareas pesadas).

![Diagrama de Arquitectura](https://manus.im/api/v1/files/get/9e7e8c4f-1c4b-4b1a-9b1e-2e8c4f1c4b1a.png)

## 2. Componentes de la Arquitectura

### 2.1. Frontend (Interfaz de Usuario)

- **Tecnología**: **React** con **Vite** para un desarrollo rápido y un rendimiento optimizado.
- **Librería de UI**: **Material-UI** (MUI) para componentes de alta calidad y diseño consistente.
- **Responsabilidades**:
  - Proporcionar una interfaz de usuario limpia e intuitiva.
  - Gestionar la carga de archivos del balance consolidado.
  - Permitir la configuración de servicios y porcentajes de distribución.
  - Mostrar el estado del procesamiento de las taxonomías.
  - Presentar los resultados de la validación y los errores de forma clara.
  - Facilitar la descarga del paquete XBRL final.

### 2.2. Backend (API y Lógica de Negocio)

- **Tecnología**: **Python** con **FastAPI** por su alto rendimiento y facilidad para construir APIs.
- **Responsabilidades**:
  - **API Gateway**: Exponer endpoints seguros para todas las operaciones del frontend.
  - **Gestión de Usuarios**: Autenticación (JWT), roles y permisos.
  - **Lógica de Negocio Principal**: Orquestar el flujo de trabajo completo, desde la carga del balance hasta la generación de archivos.
  - **Delegación de Tareas Pesadas**: Enviar las tareas de procesamiento intensivo (distribución, validación, generación XBRL) a un worker asíncrono.

### 2.3. Lógica de Negocio (Módulos Clave)

La lógica de negocio se implementará en módulos de Python bien definidos:

1.  **Parser de Excel**: Utilizando la librería `openpyxl`, leerá y validará la estructura del balance consolidado cargado por el usuario.
2.  **Validador de Porcentajes**: Asegurará que la suma de los porcentajes de distribución sea siempre 100%.
3.  **Distribuidor por Servicios**: Aplicará los porcentajes a cada cuenta del balance, ajustando por redondeo para mantener la consistencia.
4.  **Validador de Ecuaciones Contables**: Verificará que `Activo = Pasivo + Patrimonio` y `Utilidad = Ingresos - Gastos` en todos los balances generados.
5.  **Mapeador a Plantilla XBRL**: Utilizando una base de datos de mapeos (extraída de los archivos `.xml` analizados), diligenciará automáticamente las hojas de la plantilla Excel oficial.
6.  **Generador de Archivos XBRL**: Creará el paquete completo de archivos (`.xlsx`, `.xml`, `.xbrlt`, `.xbrl`) compatibles con XBRL Express.

### 2.4. Procesamiento Asíncrono

- **Tecnología**: **Celery** (worker) y **Redis** (cola de tareas).
- **Propósito**: Evitar que la interfaz de usuario se bloquee mientras se realizan operaciones pesadas.
- **Flujo**:
  1. El usuario solicita la generación de una taxonomía.
  2. El backend (FastAPI) crea una tarea y la envía a la cola de Redis.
  3. Un worker de Celery, que está escuchando la cola, toma la tarea.
  4. El worker ejecuta los pasos de distribución, validación y generación de archivos.
  5. Una vez completado, el worker actualiza el estado de la tarea en la base de datos.
  6. El frontend, que está sondeando el estado de la tarea, notifica al usuario que el proceso ha finalizado y habilita la descarga.

### 2.5. Almacenamiento

- **Base de Datos**: **PostgreSQL** para almacenar:
  - Información de usuarios y empresas.
  - Configuraciones de distribución (servicios y porcentajes).
  - Metadatos de las taxonomías generadas (estado, fecha, etc.).
  - Mapeos de cuentas PUC a conceptos XBRL.
- **Almacenamiento de Archivos**: **Amazon S3** o una alternativa compatible como **MinIO** para guardar:
  - Los balances consolidados originales cargados por el usuario.
  - Los paquetes `.zip` finales con los archivos XBRL generados.

## 3. Stack Tecnológico Recomendado

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Frontend** | React, Material-UI, Vite | Ecosistema maduro, desarrollo rápido, excelente experiencia de usuario. |
| **Backend** | Python, FastAPI | Alto rendimiento, ideal para I/O, fácil de aprender y usar. |
| **Base de Datos** | PostgreSQL | Robusto, confiable, excelente para datos relacionales. |
| **Tareas Asíncronas** | Celery, Redis | Estándar de la industria en Python para procesamiento en segundo plano. |
| **Almacenamiento** | Amazon S3 / MinIO | Escalable, seguro y desacoplado del backend. |
| **Contenerización** | Docker | Estandariza el entorno de desarrollo y producción. |
| **Orquestación** | Kubernetes | Permite escalar los servicios de forma independiente según la carga. |

## 4. Ventajas de esta Arquitectura

- **Escalabilidad**: Cada componente (frontend, backend, workers) puede escalarse de forma independiente.
- **Resiliencia**: Si un worker falla, la tarea puede reintentarse sin afectar al resto del sistema.
- **Mantenibilidad**: La separación de responsabilidades facilita la actualización y el mantenimiento de cada componente.
- **Rendimiento**: El procesamiento asíncrono garantiza que la interfaz de usuario sea siempre rápida y responsiva.
- **Seguridad**: El uso de tecnologías estándar y probadas facilita la implementación de buenas prácticas de seguridad.
