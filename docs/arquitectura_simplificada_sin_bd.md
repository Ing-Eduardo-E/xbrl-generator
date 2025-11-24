# Arquitectura Simplificada: Aplicación Web Stateless sin Base de Datos

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Cambio de Paradigma

Basándose en la aclaración del usuario de que **no se necesita almacenar historial** ni gestionar empresas de forma persistente, la arquitectura se simplifica radicalmente. La aplicación se convierte en una **herramienta de procesamiento en tiempo real** tipo "converter" o "generator".

## 2. Nueva Arquitectura Simplificada

### Flujo de Trabajo Simplificado

```
Usuario → Carga Balance.xlsx → Configura % → [Procesamiento] → Descarga .zip → FIN
```

No hay registro de usuarios, no hay base de datos, no hay almacenamiento persistente. Cada sesión es completamente independiente.

### Componentes de la Arquitectura

| Componente | Tecnología | Propósito |
|:---|:---|:---|
| **Frontend** | React (SPA) | Interfaz de usuario simple con 3 pasos: Cargar, Configurar, Descargar |
| **Backend** | Python + FastAPI | API REST con un solo endpoint principal: `/generate` |
| **Procesamiento** | Python (openpyxl, lxml) | Lógica de distribución, validación y generación de archivos |
| **Almacenamiento Temporal** | Sistema de archivos local (tmpfs) | Los archivos se guardan temporalmente durante el procesamiento y se eliminan después de la descarga |

### Arquitectura Visual Simplificada

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVEGADOR DEL USUARIO                     │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Paso 1:   │  │  Paso 2:   │  │  Paso 3:   │           │
│  │  Cargar    │→ │ Configurar │→ │ Descargar  │           │
│  │  Balance   │  │ Porcentajes│  │   .zip     │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    HTTP POST /generate
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVIDOR BACKEND (FastAPI)                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Recibir archivo Excel + configuración            │  │
│  │  2. Validar estructura del balance                   │  │
│  │  3. Distribuir por servicios según porcentajes       │  │
│  │  4. Validar ecuaciones contables                     │  │
│  │  5. Diligenciar plantilla oficial XBRL               │  │
│  │  6. Generar archivos .xml, .xbrlt, .xbrl             │  │
│  │  7. Empaquetar en .zip                               │  │
│  │  8. Devolver .zip al usuario                         │  │
│  │  9. Eliminar archivos temporales                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Ventajas de la Arquitectura Simplificada

### 3.1. Desarrollo Más Rápido
- **Sin base de datos**: No hay que diseñar esquemas, migraciones ni consultas complejas.
- **Sin autenticación**: No hay que implementar login, sesiones ni gestión de usuarios.
- **Sin almacenamiento persistente**: No hay que gestionar S3, backups ni limpieza de archivos antiguos.

**Estimado de tiempo de desarrollo**: Se reduce de **6 meses a 3-4 meses**.

### 3.2. Despliegue Más Simple
- **Un solo contenedor Docker**: Backend + Frontend estático.
- **Sin dependencias externas**: No necesita PostgreSQL, Redis, S3, etc.
- **Escalabilidad horizontal trivial**: Cada instancia es completamente independiente.

**Costo de infraestructura**: Un servidor pequeño (2 CPU, 4GB RAM) puede manejar 10-20 procesamiento simultáneos.

### 3.3. Mantenimiento Mínimo
- **Sin datos que gestionar**: No hay que preocuparse por backups, GDPR, retención de datos, etc.
- **Sin estado**: Si el servidor se reinicia, no se pierde nada (los usuarios simplemente vuelven a cargar su archivo).
- **Sin migraciones**: Las actualizaciones son triviales porque no hay esquema de base de datos que mantener.

## 4. Consideraciones de Seguridad y Privacidad

### 4.1. Privacidad por Diseño
Al no almacenar ningún dato, la aplicación es **privacy-first** por defecto:
- Los balances financieros nunca se guardan en disco (excepto temporalmente durante el procesamiento).
- No hay riesgo de fuga de datos porque no hay datos almacenados.
- Cumplimiento automático con regulaciones de protección de datos.

### 4.2. Seguridad del Procesamiento
- Los archivos temporales se guardan en `/tmp` con nombres aleatorios (UUID).
- Se eliminan inmediatamente después de que el usuario descarga el `.zip`.
- Opcionalmente, se puede usar `tmpfs` (RAM disk) para que los archivos nunca toquen el disco físico.

## 5. Limitaciones y Trade-offs

| Aspecto | Con Base de Datos | Sin Base de Datos (Propuesto) |
|:---|:---|:---|
| **Historial de taxonomías** | ✅ Se puede consultar | ❌ No disponible |
| **Reutilización de configuraciones** | ✅ Se cargan automáticamente | ⚠️ El usuario debe recordar los porcentajes |
| **Dashboard de productividad** | ✅ Métricas disponibles | ❌ No hay métricas |
| **Gestión de múltiples empresas** | ✅ Perfiles por empresa | ❌ Cada procesamiento es independiente |
| **Complejidad de desarrollo** | Alta | **Baja** |
| **Tiempo de desarrollo** | 6 meses | **3-4 meses** |
| **Costo de infraestructura** | Alto (DB + Storage) | **Bajo** (solo servidor web) |

## 6. Mitigación de las Limitaciones

### 6.1. Reutilización de Configuraciones
Aunque no hay base de datos, el usuario puede guardar sus configuraciones localmente:
- **Opción 1**: El frontend permite "Exportar Configuración" como un archivo JSON que el usuario guarda en su computadora.
- **Opción 2**: El navegador guarda la última configuración en `localStorage` para que se precargue la próxima vez.

### 6.2. Historial Personal
El usuario puede mantener su propio historial guardando los archivos `.zip` generados en una carpeta organizada por empresa y fecha.

## 7. Stack Tecnológico Simplificado

| Capa | Tecnología | Justificación |
|:---|:---|:---|
| **Frontend** | React + Vite | SPA simple, sin necesidad de gestión de estado compleja |
| **Backend** | Python + FastAPI | Ideal para procesamiento de archivos y generación de XBRL |
| **Procesamiento** | openpyxl, lxml | Librerías estándar para Excel y XML |
| **Despliegue** | Docker + Nginx | Un solo contenedor, fácil de desplegar en cualquier servidor |

## 8. Conclusión

La arquitectura simplificada sin base de datos es **perfecta** para el caso de uso del usuario:
- **Más rápida de desarrollar** (3-4 meses vs. 6 meses)
- **Más barata de operar** (un servidor simple vs. infraestructura compleja)
- **Más fácil de mantener** (sin migraciones, sin backups, sin gestión de datos)
- **Más segura y privada** (no almacena datos sensibles)

El trade-off es que no hay historial ni dashboard, pero según el usuario, **esto no es necesario** porque cada taxonomía se reporta una sola vez y no se vuelve a usar.
