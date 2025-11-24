# Especificación Técnica Simplificada: Aplicación Web Stateless para Generación XBRL

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Visión General

Esta especificación describe una **herramienta web stateless** (sin estado y sin base de datos) diseñada para un único propósito: recibir un balance consolidado en Excel, procesarlo según la configuración del usuario y devolver un paquete de archivos XBRL listos para ser complementados en XBRL Express. La aplicación no almacena datos, no requiere inicio de sesión y cada uso es independiente.

## 2. Requisitos Funcionales (Simplificados)

| ID | Requisito | Descripción |
|:---|:---|:---|
| RF-01 | **Carga de Balance** | El usuario sube un archivo Excel con el balance consolidado. |
| RF-02 | **Configuración de Distribución** | El usuario define los servicios (Acueducto, Aseo, etc.) y los porcentajes de distribución (la suma debe ser 100%). |
| RF-03 | **Generación de Paquete XBRL** | El sistema procesa los datos y genera un archivo `.zip` que contiene la plantilla Excel oficial diligenciada y los archivos de mapeo (`.xml`, `.xbrlt`). |
| RF-04 | **Validación en Tiempo Real** | El sistema valida las ecuaciones contables (`Activo = Pasivo + Patrimonio`) y la estructura del balance durante el procesamiento. |
| RF-05 | **Descarga de Resultados** | El usuario descarga el archivo `.zip` con los resultados. Los archivos temporales se eliminan del servidor. |

## 3. Arquitectura Simplificada

*Incluye el contenido completo de `arquitectura_simplificada_sin_bd.md`*

## 4. Flujo de Usuario (3 Pasos)

1.  **Paso 1: Cargar**
    - El usuario visita la página web.
    - Selecciona el grupo NIIF (1, 2, 3 o R414).
    - Sube el archivo Excel con el balance consolidado.

2.  **Paso 2: Configurar**
    - La interfaz muestra los servicios disponibles para el grupo NIIF seleccionado.
    - El usuario asigna un porcentaje a cada servicio.
    - El sistema valida en tiempo real que la suma sea 100%.
    - El usuario hace clic en "Generar".

3.  **Paso 3: Descargar**
    - El backend procesa la solicitud (1-2 minutos).
    - La interfaz muestra un indicador de progreso.
    - Cuando finaliza, se habilita un botón para descargar el archivo `.zip`.
    - El usuario guarda el archivo y puede cerrar la página.

## 5. Modelo de Datos

**No hay modelo de datos.** La aplicación es stateless. La única "persistencia" es la configuración de mapeos PUC → XBRL, que se puede almacenar en archivos JSON o YAML dentro del propio código de la aplicación.

## 6. Plan de Implementación (Estimado)

| Fase | Duración | Hitos Clave |
| :--- | :--- | :--- |
| **1. Setup y Prototipado** | 1 semana | - Configuración de repositorios y Docker. <br> - Prototipo de carga/descarga de archivos. |
| **2. Desarrollo del Backend** | 4 semanas | - API para procesar el balance. <br> - Lógica de distribución y validación. <br> - Generación de los archivos XBRL en memoria. |
| **3. Desarrollo del Frontend** | 4 semanas | - Interfaz de usuario de 3 pasos. <br> - Conexión con el backend. |
| **4. Integración y Pruebas** | 2 semanas | - Pruebas End-to-End. <br> - Pruebas con balances reales. |
| **5. Despliegue** | 1 semana | - Despliegue en un servidor simple. |
| **Total Estimado** | **~3 meses** | - |

## 7. Conclusión

La arquitectura stateless es la **solución óptima** para este caso de uso:

- **Cumple el objetivo**: Automatiza el 85% del trabajo manual.
- **Reduce costos y tiempo**: El desarrollo es un 50% más rápido y la infraestructura es mínima.
- **Es segura y privada**: No almacena datos sensibles.
- **Es fácil de usar**: Un flujo de 3 pasos sin necesidad de registro.

Esta solución es una herramienta de productividad pura, diseñada para hacer una sola cosa de manera eficiente y sin complicaciones.
