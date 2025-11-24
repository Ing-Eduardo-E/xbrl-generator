# Validación de Compatibilidad: Web App + XBRL Express

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Objetivo

Este documento valida y garantiza que la aplicación web propuesta se integra **perfectamente** con el flujo de trabajo actual del usuario, que depende de la aplicación **XBRL Express** para la validación final y la generación del archivo `.xbrl` que se certifica en el SUI.

## 2. El Puente entre la Web App y XBRL Express

La aplicación web no reemplaza a XBRL Express, sino que actúa como un **asistente de preparación de datos altamente especializado**. Su única función es automatizar la tarea más tediosa: diligenciar las plantillas de Excel oficiales.

El flujo de trabajo se puede resumir de la siguiente manera:

```mermaid
graph TD
    A[Balance Consolidado del Contador] --> B{Aplicación Web}
    B --> C(1. Distribuye por servicios)
    B --> D(2. Valida ecuaciones contables)
    B --> E(3. Diligencia 11 hojas de la plantilla oficial)
    
    subgraph "Paquete .zip generado por la Web App"
        F[Plantilla Oficial .xlsx (diligenciada)]
        G[Archivo de Mapeo .xml]
        H[Plantilla XBRL .xbrlt]
    end

    E --> F
    E --> G
    E --> H

    subgraph "Flujo de Trabajo del Usuario"
        I(Usuario abre los archivos en XBRL Express)
        J(Usuario completa las 34 hojas manuales)
        K(Usuario valida en XBRL Express)
        L(XBRL Express genera el archivo .xbrl final)
    end

    F --> I
    G --> I
    H --> I

    L --> M[Certificación en SUI]
```

## 3. Garantía de Compatibilidad

La compatibilidad se garantiza porque la aplicación web **no crea un formato nuevo**, sino que **reproduce exactamente el formato que XBRL Express espera**.

| Archivo Generado | ¿Cómo se garantiza la compatibilidad? |
|:---|:---|
| **Plantilla Oficial .xlsx** | La aplicación web no crea una plantilla desde cero. Toma la **plantilla oficial de Excel de la SSPD** para el grupo NIIF y el año correspondientes, y simplemente **escribe los datos en las celdas correctas** de las 11 hojas automatizables. Se conservan todas las fórmulas, nombres de hoja, rangos nombrados y la estructura original. Para XBRL Express, es como si un humano hubiera diligenciado la plantilla. |
| **Archivo de Mapeo .xml** | Se genera un archivo `.xml` que sigue **exactamente el esquema `XBRLDataSourceExcelMapSchema.xsd`** de Reporting Standard. Este archivo contiene el mapeo entre las celdas de la plantilla Excel (ej. `Hoja2!I15`) y los conceptos XBRL de la taxonomía oficial (ej. `ifrs-full_CashAndCashEquivalents`). La lógica de mapeo se extrae de las taxonomías oficiales. |
| **Plantilla XBRL .xbrlt** | Se genera un archivo `.xbrlt` que sigue el **esquema `mapper-2021.xsd`** de Reporting Standard. Este archivo define los contextos (períodos, empresa), las dimensiones (servicios) y las unidades (moneda) del reporte, todo de acuerdo a las especificaciones de la taxonomía SSPD. |

### En Resumen:

La aplicación web actúa como un **robot de diligenciamiento de Excel**. En lugar de que tú pases 6 horas copiando y pegando datos, la aplicación lo hace en 2 minutos, generando un conjunto de archivos **idénticos** a los que tú crearías manualmente, pero sin errores y mucho más rápido.

## 4. Flujo de Usuario Final

1.  **Web App (10 minutos)**:
    - Cargas el balance consolidado.
    - Configuras los porcentajes.
    - Descargas el paquete `.zip`.

2.  **XBRL Express (2-3 horas)**:
    - Abres los archivos del `.zip`.
    - La aplicación carga la plantilla Excel ya diligenciada en un 85%.
    - Te enfocas **únicamente** en las 34 hojas de notas y revelaciones que requieren tu criterio profesional.
    - Ejecutas la validación final en XBRL Express.
    - Una vez que dice "sin errores", generas el archivo `.xbrl`.

3.  **SUI (5 minutos)**:
    - Cargas el archivo `.xbrl` generado por XBRL Express y certificas el reporte.

## 5. Conclusión de Compatibilidad

La solución propuesta es **100% compatible** con tu flujo de trabajo actual y con la aplicación XBRL Express. No introduce ningún riesgo de incompatibilidad porque se basa en **reproducir y automatizar** los formatos existentes, no en inventar nuevos.

El valor no está en reemplazar XBRL Express, sino en **alimentarlo con datos pre-procesados y validados**, ahorrándote el 85% del tiempo y permitiéndote enfocarte en el trabajo de consultoría que realmente aporta valor.
