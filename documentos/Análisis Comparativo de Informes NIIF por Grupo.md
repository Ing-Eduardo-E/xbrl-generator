## Análisis Comparativo de Informes NIIF por Grupo

Este documento presenta una comparación detallada de los informes anuales para los cuatro grupos de empresas en Colombia, según la clasificación NIIF. El análisis se basa en los archivos de ejemplo proporcionados.

### Resumen de Características por Grupo

| Característica | Grupo 1 (NIIF Plenas) | Grupo 2 (NIIF PYMES) | Grupo 3 (Microempresas) | R414 (ESAL) |
| :--- | :--- | :--- | :--- | :--- |
| **Descripción** | Entidades de interés público | Empresas que no cotizan en bolsa | Microempresas | Entidades Sin Ánimo de Lucro |
| **Taxonomía Base** | IFRS Full | IFRS for SMEs | Contabilidad Simplificada | Régimen Especial |
| **Punto de Entrada** | `PuntoEntrada_G1_Individual-2024-EFEDirecto.xsd` | `PuntoEntrada_G2_Individual-2024.xsd` | `PuntoEntrada_G3-2024.xsd` | `PuntoEntrada_R414_Individual-2024.xsd` |
| **Prefijo XBRL** | `co-sspd-ef-Grupo1` | `co-sspd-ef-Grupo2` | `co-sspd-ef-G3` | `co-sspd-ef-Res414` |
| **Complejidad** | Muy Alta | Alta | Baja | Media |
| **Hojas en Excel** | 66 | 45 | 30 | 43 |
| **Mapeos XBRL** | 16,237 | 13,355 | 7,520 | 13,415 |
| **Tamaño Excel** | 195 KB | 150 KB | 90 KB | 151 KB |

### Estructura de Archivos

El formato de los archivos generados es consistente en todos los grupos, lo que revela el flujo de trabajo de la aplicación:

1.  **`.xlsx` (Hoja de Cálculo)**: Es el punto de partida. Contiene todos los datos financieros y notas en múltiples hojas. La estructura varía significativamente entre grupos, reflejando los diferentes niveles de detalle requeridos.
2.  **`.xml` (Archivo de Mapeo)**: Define la correspondencia entre las celdas del archivo Excel y los conceptos (elementos) de la taxonomía XBRL. Es el "pegamento" que conecta los datos con el estándar.
3.  **`.xbrlt` (Plantilla XBRL)**: Este es el archivo más importante. Contiene la estructura completa del reporte XBRL, incluyendo los contextos (períodos, dimensiones) y las referencias a los datos que se extraen del Excel a través del archivo de mapeo. Es una instancia XBRL "enriquecida" con las instrucciones de mapeo.
4.  **`.xbrl` (Instancia XBRL Final)**: Es un archivo muy pequeño que actúa como el "punto de entrada" oficial del reporte. Su única función es declarar la taxonomía oficial a la que se adhiere el informe, apuntando al esquema `.xsd` correspondiente alojado en el SUI.

### Comparación de Hojas de Cálculo (Estructura de Datos)

El análisis de las hojas de cálculo revela una estructura jerárquica de complejidad. El Grupo 1 es el más detallado, y la complejidad disminuye hacia el Grupo 3. La siguiente tabla muestra qué hojas están presentes en cada tipo de informe:

| Nombre de Hoja | Grupo 1 | Grupo 2 | Grupo 3 | R414 |
|:---|:---:|:---:|:---:|:---:|
| Hoja1 a Hoja28 | ✅ | ✅ | ✅ | ✅ |
| Hoja29 | ✅ | ✅ | ❌ | ✅ |
| Hoja30 a Hoja41 | ✅ | ✅ | ❌ | ✅ |
| Hoja42 y Hoja43 | ✅ | ✅ | ❌ | ❌ |
| Hoja44 a Hoja64 | ✅ | ❌ | ❌ | ❌ |
| Indice | ✅ | ✅ | ✅ | ✅ |
| Lists | ✅ | ✅ | ✅ | ✅ |

**Observaciones Clave de la Comparación:**

-   **Hojas Comunes (1-28):** Existe un núcleo de aproximadamente 28 hojas que son comunes a todos los grupos, cubriendo los estados financieros básicos (Situación Financiera, Resultados, Flujo de Efectivo, Cambios en el Patrimonio) y notas principales.
-   **Complejidad del Grupo 1:** El Grupo 1 tiene 21 hojas (de la 44 a la 64) que son exclusivas, lo que indica un nivel de detalle y revelaciones mucho mayor, en línea con los requerimientos de NIIF Plenas.
-   **Similitud Grupo 2 y R414:** El Grupo 2 y el R414 comparten una estructura muy similar hasta la hoja 41, diferenciándose principalmente en las revelaciones específicas de cada marco.
-   **Simplicidad del Grupo 3:** El Grupo 3 es el más simple, utilizando solo las primeras 28 hojas, lo que es consistente con los requerimientos para microempresas.

### Conclusiones del Análisis

1.  **Taxonomías Específicas:** Cada grupo utiliza una taxonomía XBRL distinta y específica, publicada por la Superintendencia de Servicios Públicos Domiciliarios (SSPD) a través del SUI. La aplicación web deberá ser capaz de cargar y gestionar estas taxonomías de forma dinámica.

2.  **Flujo de Trabajo Basado en Plantillas:** La aplicación funciona con un modelo de "plantilla Excel". Los usuarios no interactúan directamente con XBRL, sino que completan una hoja de cálculo predefinida. La aplicación web debe replicar esta experiencia de usuario, proporcionando plantillas de Excel para cada grupo.

3.  **Mapeo Centralizado:** La lógica de negocio principal reside en los archivos de mapeo (`.xml` y `.xbrlt`) que traducen los datos del Excel al formato XBRL. La aplicación web deberá internalizar esta lógica de mapeo en su backend.

4.  **Estructura de Datos Variable:** La aplicación web debe ser lo suficientemente flexible para manejar las diferentes estructuras de hojas de cálculo y los distintos niveles de detalle requeridos por cada grupo NIIF.

5.  **Dimensiones XBRL:** Todos los grupos utilizan dimensiones para segmentar la información (por ejemplo, por tipo de servicio público: acueducto, energía, etc.). La aplicación web debe soportar la creación y validación de datos dimensionales.
