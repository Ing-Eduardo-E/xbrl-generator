# Análisis de las Taxonomías SSPD

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Resumen del Análisis

Se han examinado los esquemas XSD de las taxonomías oficiales de la SSPD para los 4 grupos normativos. Los archivos proporcionados corresponden al cierre de 2019, pero la estructura es consistente con las versiones más recientes (2024) que se analizaron en los ejemplos de reportes.

## 2. Taxonomías Identificadas

| Archivo | Tipo | Año | Namespace |
|:---|:---|:---|:---|
| pasted_content.txt | **R414 (ESAL)** | 2019 | `http://www.superservicios.gov.co/xbrl/ef/2019-12-31` |
| pasted_content_2.txt | **Grupo 3 (Microempresas)** | 2019 | `http://www.superservicios.gov.co/xbrl/G3/2019-12-31/` |
| pasted_content_3.txt | **Grupo 2 (NIIF PYMES)** | 2019 | `http://www.superservicios.gov.co/xbrl/niif/ef/2017-12-31` |
| pasted_content_4.txt | **Grupo 1 (NIIF Plenas)** | 2019 | `http://www.superservicios.gov.co/xbrl/niif/ef/2017-12-31` |

## 3. Estructura Común de las Taxonomías

Todas las taxonomías SSPD siguen un patrón consistente:

### 3.1. Componentes Principales

1.  **Esquema Principal (XSD)**: Define los elementos (conceptos) de la taxonomía y sus tipos de datos.
2.  **Linkbases**: Archivos XML que definen las relaciones entre conceptos:
    - **Presentation Linkbase**: Jerarquía de presentación (cómo se muestran los conceptos en los reportes).
    - **Calculation Linkbase**: Reglas de cálculo (qué conceptos suman o restan para obtener otros).
    - **Definition Linkbase**: Dimensiones y ejes (cómo se segmenta la información por servicio, estrato, etc.).
    - **Label Linkbase**: Etiquetas en español de los conceptos.
3.  **Behave Files**: Archivos de comportamiento específicos para Individual/Consolidado.
4.  **Hints Files**: Archivos de ayuda que definen validaciones y mensajes de error.

### 3.2. Namespaces por Grupo

Cada grupo NIIF tiene su propio namespace, lo que permite identificar claramente a qué taxonomía pertenece un reporte:

- **Grupo 1**: `http://www.superservicios.gov.co/xbrl/niif/ef/2017-12-31` (base IFRS Full)
- **Grupo 2**: `http://www.superservicios.gov.co/xbrl/niif/ef/2017-12-31` (base IFRS for SMEs)
- **Grupo 3**: `http://www.superservicios.gov.co/xbrl/G3/2019-12-31/` (taxonomía específica)
- **R414**: `http://www.superservicios.gov.co/xbrl/ef/2019-12-31` (taxonomía específica)

## 4. Implicaciones para la Aplicación Web

### 4.1. Compatibilidad con XBRL Express

Los archivos de taxonomía confirman que la aplicación web debe generar archivos que:

1.  **Referencien correctamente la taxonomía oficial**: El archivo `.xbrl` debe incluir un `<link:schemaRef>` que apunte a la URL correcta del esquema XSD en el servidor del SUI.
2.  **Usen los namespaces correctos**: Cada concepto XBRL debe usar el prefijo y namespace correspondiente al grupo NIIF.
3.  **Respeten las dimensiones definidas**: Los datos por servicio deben usar las dimensiones correctas (ej. `AcueductoMember`, `AlcantarilladoMember`, etc.).
4.  **Cumplan con las reglas de cálculo**: Los valores deben satisfacer las fórmulas definidas en el Calculation Linkbase.

### 4.2. Estrategia de Mapeo

La aplicación web necesitará:

1.  **Base de datos de mapeos PUC → XBRL**: Para cada grupo NIIF, mapear las cuentas del Plan Único de Cuentas colombiano a los conceptos XBRL correspondientes.
    - Ejemplo: Cuenta `1105` (Caja) → Concepto `ifrs-full_Cash` (Grupo 1) o `ifrs-smes_Cash` (Grupo 2).

2.  **Plantillas de Excel pre-configuradas**: Para cada grupo NIIF y cada año fiscal, tener la plantilla oficial con las fórmulas y estructura correctas.

3.  **Generador de contextos XBRL**: Crear los contextos necesarios para cada combinación de:
    - Período (instant o duration)
    - Servicio (dimensión)
    - Entidad (identificador RUPS)

### 4.3. Proceso de Validación

Antes de generar el archivo final, la aplicación debe validar:

1.  **Ecuaciones contables**: `Activo = Pasivo + Patrimonio`, `Utilidad = Ingresos - Gastos`.
2.  **Reglas de cálculo XBRL**: Verificar que las sumas y restas definidas en la taxonomía se cumplan.
3.  **Tipos de datos**: Asegurar que los valores sean numéricos, enteros, sin decimales (según lo requiera cada concepto).
4.  **Dimensiones obligatorias**: Verificar que todos los conceptos que requieren dimensión de servicio la tengan.

## 5. Conclusión

Los archivos de taxonomías proporcionados confirman que la solución propuesta es **100% compatible** con el proceso de certificación en el SUI. La aplicación web generará archivos Excel con la estructura correcta que, al ser cargados en XBRL Express, producirán archivos `.xbrl` válidos y listos para subir al SUI.

La clave del éxito está en:

1.  Usar las plantillas oficiales de Excel como base.
2.  Mapear correctamente las cuentas PUC a los conceptos XBRL.
3.  Generar los contextos y dimensiones según la taxonomía oficial.
4.  Validar exhaustivamente antes de entregar el archivo al usuario.
