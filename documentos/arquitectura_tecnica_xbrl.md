# Arquitectura Técnica - Reporting Standard XBRL

## Resumen Ejecutivo

**Reporting Standard XBRL** es una aplicación de escritorio empresarial desarrollada en Java que proporciona un conjunto completo de herramientas para el procesamiento, validación, generación y visualización de documentos XBRL (eXtensible Business Reporting Language). La aplicación está diseñada para cumplir con los estándares internacionales de reporte financiero y soporta múltiples jurisdicciones regulatorias.

## Arquitectura de Software

### Patrón Arquitectónico

La aplicación sigue una **arquitectura modular basada en procesadores** con los siguientes componentes principales:

**Capa de Presentación**: Interfaz gráfica de usuario (GUI) desarrollada con Java Swing/AWT que proporciona múltiples paneles especializados para diferentes vistas de los datos XBRL. La GUI permite la navegación jerárquica de taxonomías, visualización de relaciones entre conceptos, y edición interactiva de instancias XBRL.

**Capa de Lógica de Negocio**: Implementada mediante un sistema de procesadores especializados que se cargan dinámicamente según las necesidades. Cada procesador es responsable de un aspecto específico del estándar XBRL (core, dimensiones, fórmulas, tablas, etc.). Los procesadores se registran mediante un sistema de factories definido en archivos de propiedades.

**Capa de Acceso a Datos**: Proporciona abstracción para múltiples fuentes de datos incluyendo archivos locales, URLs remotas, y bases de datos relacionales. Soporta almacenamiento y recuperación de instancias XBRL completas en bases de datos para análisis posterior.

**Capa de Integración**: Incluye componentes para importación/exportación de datos desde/hacia Excel, generación de reportes en múltiples formatos, y API programática para integración con otros sistemas.

### Modelo de Objetos (Object Model)

El núcleo de la aplicación se basa en un modelo de objetos robusto que representa todos los elementos del estándar XBRL:

**DTSContainer** (Discoverable Taxonomy Set Container) actúa como el contenedor principal que mantiene toda la información sobre taxonomías cargadas, esquemas, linkbases y sus relaciones. Gestiona el ciclo de vida de los documentos XBRL y proporciona servicios de resolución de referencias.

**XBRLInstance** representa un documento de instancia XBRL completo, conteniendo hechos (facts), contextos, unidades y referencias a pie de página. Proporciona métodos para validación, consulta y manipulación de datos.

**XBRLFact** y sus subclases (XBRLFactItem, XBRLFactNumeric, XBRLFactNonNumeric, XBRLFactTuple) modelan los diferentes tipos de hechos que pueden aparecer en un reporte XBRL. Cada hecho está asociado con un concepto de la taxonomía, un contexto y opcionalmente una unidad.

**XBRLContext** encapsula la información contextual de un hecho, incluyendo entidad reportante, período temporal, y dimensiones aplicables. Implementa las reglas de igualdad contextual (c-equal) definidas en la especificación XBRL.

**Taxonomy y Concept** representan las estructuras de taxonomía, donde cada concepto define un elemento reportable con sus atributos, tipo de dato, y relaciones con otros conceptos.

### Sistema de Procesadores

La aplicación implementa un patrón de cadena de procesadores donde cada procesador es responsable de validar y procesar un aspecto específico del estándar XBRL:

**XBRLCoreProcessor** maneja la validación básica de XBRL 2.1, incluyendo validación de esquemas, linkbases, y reglas fundamentales de consistencia. Verifica que las instancias cumplan con las especificaciones de estructura, tipos de datos, y restricciones definidas en las taxonomías.

**XDTProcessor** (XBRL Dimensions) procesa y valida estructuras dimensionales, incluyendo hypercubos, dimensiones explícitas y tipadas, y miembros de dominio. Implementa las reglas de validación específicas de la especificación de dimensiones.

**XBRLFormulaProcessor** evalúa fórmulas XBRL que permiten definir relaciones matemáticas y lógicas entre hechos, realizar cálculos derivados, y validar reglas de negocio complejas. Utiliza XPath 2.0 y funciones personalizadas para expresar las fórmulas.

**IXBRLProcessor** maneja documentos Inline XBRL donde los datos XBRL están embebidos en documentos HTML legibles por humanos. Extrae los datos XBRL del HTML y los valida contra las taxonomías aplicables.

**XBRLTableProcessor** procesa definiciones de tablas que especifican cómo renderizar datos XBRL en formato tabular. Implementa la especificación XBRL Table Linkbase 1.0 que define ejes, nodos de aspecto, y filtros.

**EFMProcessor, EBAProcessor, ESEFProcessor** implementan validaciones específicas de jurisdicción para SEC/EDGAR (Estados Unidos), European Banking Authority, y European Single Electronic Format respectivamente. Cada uno aplica reglas adicionales más allá del estándar XBRL básico.

### Gestión de Taxonomías

El sistema incluye un **catálogo de taxonomías** que almacena taxonomías oficiales en formato comprimido (ZIP) para optimizar el espacio y acelerar la instalación. El catálogo proporciona resolución local de taxonomías para evitar descargas repetidas desde internet.

El **resolver de XML** implementa el estándar OASIS XML Catalogs para mapear URIs públicos de taxonomías a ubicaciones locales. Esto permite que la aplicación funcione offline una vez que las taxonomías han sido descargadas.

El sistema mantiene un **historial de cambios de taxonomías** que permite rastrear evoluciones en las definiciones de conceptos a lo largo del tiempo, facilitando la migración de reportes entre versiones de taxonomías.

## Stack Tecnológico Detallado

### Procesamiento XML y XSLT

**Saxon EE 9.6.0.7** es el motor central para todo el procesamiento XML, XSLT 2.0/3.0, XPath 2.0/3.0, y XQuery. Saxon Enterprise Edition proporciona optimizaciones de rendimiento críticas para el procesamiento de taxonomías grandes y validación de fórmulas complejas. Incluye soporte para tipos de datos XML Schema y funciones de extensión personalizadas.

La aplicación utiliza múltiples parsers XML para diferentes propósitos: **Woodstox** para parsing StAX de alto rendimiento, **DOM4J** para manipulación de árboles DOM, y **JDOM** para operaciones simplificadas de lectura/escritura XML.

**XMLBeans 2.6.0** proporciona binding entre esquemas XML y objetos Java, permitiendo trabajar con estructuras XML de manera tipada y con validación automática contra esquemas.

### Visualización y Gráficos

**JUNG (Java Universal Network/Graph Framework)** proporciona las capacidades de visualización de grafos necesarias para representar las complejas redes de relaciones entre conceptos en taxonomías XBRL. Permite renderizar árboles de presentación, grafos de cálculo, y redes de definición con algoritmos de layout automático.

Los componentes **jung-algorithms** implementan algoritmos de análisis de grafos como detección de ciclos (crítico para validar relaciones de cálculo), búsqueda de caminos, y clustering. **jung-visualization** proporciona renderizado 2D con soporte para zoom, pan, y selección interactiva de nodos.

**Java3D** (vecmath, j3d-core) habilita visualizaciones tridimensionales opcionales para estructuras dimensionales complejas, permitiendo a los usuarios explorar hypercubos multidimensionales de manera intuitiva.

### Acceso a Datos

La aplicación soporta almacenamiento persistente en múltiples sistemas de bases de datos relacionales:

**PostgreSQL** (9.4+) es la opción recomendada para entornos de producción, proporcionando robustez, rendimiento y soporte completo de transacciones ACID. El conector JDBC permite almacenar instancias XBRL completas incluyendo metadatos y relaciones.

**Oracle** (ojdbc6) soporta entornos empresariales que ya utilizan Oracle como base de datos corporativa. **MySQL** (5.1+) ofrece una alternativa de código abierto para instalaciones de menor escala. **SQL Server** (9.2+) proporciona integración con ecosistemas Microsoft.

**HSQLDB** actúa como base de datos embebida para instalaciones standalone que no requieren servidor de base de datos separado. Permite almacenamiento local de catálogos y caché de taxonomías.

**Proxool** gestiona el pool de conexiones a bases de datos, optimizando el rendimiento mediante reutilización de conexiones y gestión automática de timeouts.

### Integración con Office

**Apache POI 3.17** proporciona capacidades completas de lectura y escritura de documentos Microsoft Office:

**poi-ooxml** maneja formatos modernos de Excel (XLSX) basados en Office Open XML, permitiendo importar datos desde hojas de cálculo complejas con múltiples pestañas, fórmulas, y formato condicional.

**poi-ooxml-schemas** contiene las definiciones de esquemas XML para formatos Office, permitiendo validación y manipulación estructurada de documentos.

El módulo **XBRLizer** utiliza POI para mapear celdas de Excel a conceptos XBRL, soportando expresiones de mapeo que pueden referenciar rangos de celdas, realizar transformaciones de datos, y aplicar lógica condicional.

### Búsqueda y Análisis

**Apache Lucene 6.5.1** proporciona capacidades de búsqueda de texto completo sobre taxonomías y documentos XBRL:

**lucene-analyzers-common** incluye analizadores de texto para múltiples idiomas, permitiendo búsqueda de conceptos en taxonomías multilingües con soporte de stemming y normalización.

**lucene-queryparser** permite a los usuarios construir consultas complejas con operadores booleanos, búsqueda por proximidad, y wildcards para localizar rápidamente conceptos en taxonomías grandes.

El sistema indexa labels, documentación, y referencias de conceptos, permitiendo búsquedas semánticas que van más allá de simples coincidencias de texto.

### Logging y Diagnóstico

**Log4j 1.2.17** proporciona logging configurable con múltiples niveles de severidad y destinos de salida. La aplicación genera logs detallados de operaciones de validación, incluyendo trazas de evaluación de fórmulas y detección de inconsistencias.

El sistema de **notificaciones** (com.ihr.xbrl.notifications) proporciona feedback en tiempo real sobre el progreso de operaciones largas y alertas sobre problemas detectados durante la validación.

## Flujos de Trabajo Principales

### Validación de Instancia XBRL

El proceso de validación sigue un flujo multi-etapa que garantiza conformidad completa con los estándares:

**Etapa 1 - Descubrimiento de DTS**: El sistema analiza la instancia XBRL para identificar todas las taxonomías referenciadas mediante schemaRef. Descarga y carga recursivamente todos los esquemas y linkbases necesarios, construyendo el DTS completo.

**Etapa 2 - Validación de Esquema**: Valida que la instancia es un documento XML bien formado y que cumple con los esquemas XSD de las taxonomías. Verifica tipos de datos, cardinalidades, y restricciones estructurales.

**Etapa 3 - Validación XBRL 2.1**: Aplica las reglas de validación definidas en la especificación XBRL 2.1, incluyendo unicidad de IDs, consistencia de contextos y unidades, y validación de referencias.

**Etapa 4 - Validación de Dimensiones**: Si el DTS incluye dimensiones, valida que los hechos dimensionales están correctamente especificados con hypercubos, dimensiones y miembros válidos. Verifica reglas de closed/open hypercubes.

**Etapa 5 - Evaluación de Fórmulas**: Si existen fórmulas en el DTS, las evalúa para verificar assertions, calcular valores derivados, y validar reglas de negocio. Genera mensajes de error para assertions que fallan.

**Etapa 6 - Validaciones Específicas**: Aplica validaciones adicionales según los procesadores habilitados (EFM, EBA, ESEF, etc.), verificando reglas específicas de cada jurisdicción.

**Etapa 7 - Generación de Reporte**: Produce un reporte de validación detallado con todos los errores, warnings e información encontrados, incluyendo referencias a las ubicaciones exactas en los documentos.

### Generación de Instancia XBRL desde Excel

El proceso de generación automatizada desde hojas de cálculo involucra varios pasos de mapeo y transformación:

**Configuración de Mapeo**: El usuario define un documento de mapeo que especifica qué celdas de Excel corresponden a qué conceptos XBRL, incluyendo reglas para extraer información contextual (períodos, entidades, dimensiones) desde la estructura de la hoja.

**Lectura de Datos**: El sistema lee la hoja de cálculo usando Apache POI, extrayendo valores de celdas junto con su formato y fórmulas. Puede procesar múltiples pestañas y consolidar datos de diferentes secciones.

**Construcción de Contextos**: Basándose en las reglas de mapeo, construye automáticamente los contextos XBRL necesarios, identificando períodos únicos, entidades, y combinaciones dimensionales presentes en los datos.

**Creación de Hechos**: Genera hechos XBRL para cada celda mapeada, asociándolos con el concepto, contexto y unidad apropiados. Aplica transformaciones de formato según sea necesario (ej. conversión de formato de fecha).

**Validación y Refinamiento**: Valida la instancia generada contra las taxonomías y permite al usuario refinar el mapeo si se detectan problemas. Proporciona feedback visual sobre qué celdas se mapearon exitosamente.

**Exportación**: Serializa la instancia XBRL a formato XML, opcionalmente aplicando transformaciones para generar Inline XBRL embebido en HTML.

### Visualización de Taxonomías

La interfaz de visualización proporciona múltiples perspectivas sobre las estructuras de taxonomía:

**Vista de Presentación**: Muestra la jerarquía de conceptos tal como debe presentarse en reportes, respetando las relaciones parent-child definidas en presentation linkbases. Permite expandir/colapsar secciones y navegar por niveles.

**Vista de Cálculo**: Visualiza las relaciones summation-item que definen cómo los conceptos se suman o restan para formar totales. Detecta y resalta inconsistencias de cálculo en instancias.

**Vista de Definición**: Muestra estructuras dimensionales incluyendo hypercubos, dimensiones, y dominios de miembros. Permite explorar qué dimensiones son aplicables a qué conceptos.

**Vista Board (Tablero)**: Proporciona un canvas interactivo donde el usuario puede arrastrar conceptos y visualizar gráficamente todas sus relaciones entrantes y salientes. Útil para análisis exploratorio de taxonomías complejas.

**Panel de Propiedades**: Muestra detalles completos del concepto seleccionado incluyendo tipo de dato, período type, balance type, labels en múltiples idiomas, y documentación de referencia.

## API Programática

La aplicación expone un API Java completo que permite integración programática:

### Clases Principales del API

**DTSContainer** es el punto de entrada principal para operaciones programáticas. Permite cargar taxonomías desde URLs o archivos locales, configurar procesadores, y establecer propiedades de validación.

**XBRLInstance** proporciona métodos para crear, modificar y consultar instancias XBRL. Permite agregar hechos, definir contextos, y ejecutar validaciones programáticamente.

**XBRLProcessor** y sus subclases permiten ejecutar validaciones específicas y acceder a resultados detallados. Cada procesador expone propiedades configurables que controlan su comportamiento.

### Ejemplos de Uso del API

El JAR de samples incluye código de ejemplo que demuestra:

**Comparación Semántica de Instancias**: Compara dos instancias XBRL considerando equivalencia semántica en lugar de igualdad sintáctica. Dos hechos son semánticamente equivalentes si sus contextos son c-equal y sus valores son v-equal.

**Funciones Personalizadas para Fórmulas**: Muestra cómo extender el procesador de fórmulas con funciones personalizadas escritas en Java que pueden ser invocadas desde expresiones XPath en fórmulas.

**Validación de Conformidad**: Ejecuta suites de pruebas de conformidad XBRL, procesando múltiples casos de prueba y generando reportes de resultados.

**Integración con Bases de Datos**: Demuestra cómo almacenar y recuperar instancias XBRL desde bases de datos relacionales, incluyendo consultas sobre hechos almacenados.

## Extensibilidad

El sistema está diseñado para ser extensible en múltiples dimensiones:

### Procesadores Personalizados

Los desarrolladores pueden crear procesadores personalizados implementando interfaces definidas y registrándolos mediante el mecanismo de factories. Esto permite agregar validaciones específicas de organización o soporte para extensiones propietarias de XBRL.

### Funciones de Fórmula Personalizadas

El procesador de fórmulas permite registrar funciones XPath personalizadas escritas en Java. Estas funciones pueden acceder a servicios externos, realizar cálculos complejos, o implementar lógica de negocio específica.

### Validaciones de Calidad Personalizadas

El framework de quality checks permite definir validaciones adicionales que van más allá de las reglas XBRL estándar. Organizaciones pueden implementar sus propias reglas de calidad y consistencia.

### Transformaciones Personalizadas

El sistema soporta transformaciones personalizadas mediante XSLT, permitiendo convertir instancias XBRL a formatos propietarios o aplicar normalizaciones específicas antes de procesamiento.

## Consideraciones de Rendimiento

La aplicación implementa varias optimizaciones para manejar taxonomías y documentos grandes:

**Caché de Taxonomías**: Las taxonomías descargadas se almacenan localmente y se reutilizan en sesiones posteriores. El sistema mantiene un caché en memoria de DTSs frecuentemente usados.

**Parsing Incremental**: Utiliza StAX para parsing incremental de documentos grandes, evitando cargar todo el documento en memoria simultáneamente.

**Evaluación Lazy**: Los linkbases y relaciones se cargan y procesan solo cuando son necesarios, reduciendo el tiempo de inicio y uso de memoria.

**Indexación**: Mantiene índices de conceptos, relaciones y recursos para acelerar búsquedas y navegación.

**Procesamiento Paralelo**: Algunas operaciones como validación de múltiples instancias pueden ejecutarse en paralelo utilizando múltiples threads.

## Limitaciones Arquitectónicas

Como aplicación de escritorio, el sistema tiene limitaciones inherentes:

**Arquitectura Monolítica**: Toda la funcionalidad está empaquetada en una sola aplicación, dificultando el escalado independiente de componentes.

**Estado en Memoria**: El estado de la aplicación se mantiene en memoria local, limitando la cantidad de datos que pueden procesarse simultáneamente al RAM disponible.

**Concurrencia Limitada**: Diseñada para un solo usuario a la vez, sin soporte para colaboración multi-usuario o control de concurrencia.

**Dependencia de JVM**: Requiere Java Runtime Environment instalado, agregando complejidad de deployment y posibles problemas de compatibilidad de versiones.

**Licenciamiento de Saxon EE**: La dependencia de Saxon Enterprise Edition requiere licencias comerciales, aumentando el costo total de propiedad.

**Integración Limitada**: La integración con otros sistemas requiere desarrollo custom usando el API Java, no hay interfaces REST o web services estándar.

## Oportunidades de Modernización

La arquitectura actual proporciona una base sólida que puede modernizarse para entornos web:

**Separación Backend/Frontend**: El modelo de objetos y procesadores pueden migrarse a un backend de servicios, exponiendo funcionalidad vía API REST.

**Reemplazo de Saxon EE**: Saxon-HE (Home Edition, open source) o librerías Python como lxml pueden reemplazar Saxon EE para la mayoría de operaciones, eliminando costos de licenciamiento.

**Microservicios**: Los diferentes procesadores pueden desplegarse como microservicios independientes, permitiendo escalado granular según demanda.

**Frontend Moderno**: React o Vue pueden proporcionar una interfaz web responsive que replique y mejore las capacidades de visualización actuales.

**Almacenamiento Cloud**: Bases de datos cloud-native y object storage pueden reemplazar el almacenamiento local, mejorando disponibilidad y escalabilidad.

**Procesamiento Asíncrono**: Operaciones largas como validación pueden ejecutarse como jobs asíncronos con notificaciones push al completarse.

**Colaboración en Tiempo Real**: WebSockets pueden habilitar edición colaborativa y notificaciones en tiempo real entre múltiples usuarios.

Esta arquitectura modernizada mantendría las fortalezas funcionales de la aplicación actual mientras elimina las limitaciones de la arquitectura de escritorio.
