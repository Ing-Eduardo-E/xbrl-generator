# Especificación de Requisitos: Aplicación Web para Generación Automatizada de Taxonomías XBRL

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025  
**Cliente**: Consultor de Servicios Públicos

## 1. Contexto y Problema a Resolver

### Situación Actual

El usuario es un consultor que debe generar taxonomías XBRL para empresas de servicios públicos en Colombia. El proceso actual consume **1 día completo de trabajo** por cada taxonomía debido a:

1. Los contadores solo entregan balances **consolidados** (sin segregación por servicio)
2. Las taxonomías XBRL requieren información **segregada por tipo de servicio** (Acueducto, Alcantarillado, Aseo, Energía, Gas, etc.)
3. El proceso manual involucra:
   - Copiar datos del balance del contador a una plantilla intermedia
   - Distribuir manualmente con porcentajes a cada servicio
   - Copiar y pegar a 40-66 hojas de la plantilla XBRL oficial
   - Cargar en XBRL Express
   - Validar y corregir errores
   - Repetir hasta obtener "sin errores"

### Objetivo del Proyecto

Desarrollar una **aplicación web** que reduzca el tiempo de procesamiento de **1 día a 2-3 horas** por taxonomía, permitiendo al consultor certificar **4 taxonomías por día** en lugar de 1.

## 2. Requisitos Funcionales Principales

### RF-01: Carga de Balance Consolidado

**Descripción**: El usuario debe poder cargar el balance consolidado que le entrega el contador.

**Detalles**:
- **Formato de entrada**: Archivo Excel (.xlsx) con estructura del Plan Único de Cuentas (PUC)
- **Columnas esperadas**:
  - Código de cuenta (numérico)
  - Denominación de la cuenta (texto)
  - Saldo Corriente (numérico)
  - Saldo No Corriente (numérico)
  - Total (suma de corriente + no corriente)
- **Validaciones**:
  - Verificar que el archivo tenga la estructura esperada
  - Validar que los códigos de cuenta sean válidos según el PUC colombiano
  - Verificar que los totales sean la suma de corriente + no corriente
  - Alertar si faltan cuentas principales (Activo, Pasivo, Patrimonio, Ingresos, Gastos)

**Criterio de aceptación**: El sistema carga el archivo, lo valida y muestra un resumen con el número de cuentas detectadas y los totales por grupo (Activo, Pasivo, Patrimonio, Ingresos, Gastos).

---

### RF-02: Configuración de Servicios y Porcentajes de Distribución

**Descripción**: El usuario debe poder definir los servicios de la empresa y asignar porcentajes de distribución para cada uno.

**Detalles**:
- **Servicios disponibles** (según taxonomías SSPD):
  - Acueducto
  - Alcantarillado
  - Aseo
  - Energía Eléctrica
  - Gas Natural
  - Gas Licuado de Petróleo (GLP)
  - Otras Actividades No Vigiladas
- **Interfaz de configuración**:
  - El usuario selecciona qué servicios aplican para la empresa (mínimo 1, máximo 7)
  - Para cada servicio seleccionado, asigna un porcentaje (%)
  - El sistema muestra en tiempo real la suma de los porcentajes
  - **Validación crítica**: La suma de todos los porcentajes debe ser exactamente 100%
  - El sistema no permite continuar si la suma no es 100%
- **Opciones adicionales**:
  - Guardar configuraciones predefinidas (ej. "Empresa Triple A: 40% Acueducto, 20% Alcantarillado, 40% Aseo")
  - Cargar configuraciones guardadas previamente

**Criterio de aceptación**: El usuario configura los servicios, asigna porcentajes que suman 100%, y el sistema guarda la configuración para aplicarla en la distribución.

---

### RF-03: Distribución Automática por Servicios

**Descripción**: El sistema distribuye automáticamente cada cuenta del balance consolidado a los servicios configurados, aplicando los porcentajes definidos.

**Detalles**:
- **Lógica de cálculo**:
  ```
  Valor_Servicio = ROUND(Valor_Total_Cuenta * Porcentaje_Servicio / 100, 0)
  ```
  - Aplicar redondeo a entero (sin decimales)
  - Aplicar la misma lógica a TODAS las cuentas del PUC
- **Manejo de diferencias por redondeo**:
  - Debido al redondeo, la suma de los servicios puede no coincidir exactamente con el total
  - El sistema debe ajustar la diferencia en el servicio con mayor porcentaje
  - Ejemplo: Si Total = 100 y se distribuye 40-20-40, pero el redondeo da 40-20-39, ajustar a 40-20-40 sumando 1 al último
- **Generación de balances por servicio**:
  - El sistema genera un balance completo para cada servicio
  - Cada balance tiene la misma estructura del PUC original
  - Se generan tanto el Balance General como el Estado de Resultados por servicio

**Criterio de aceptación**: El sistema genera balances distribuidos para cada servicio, los valores son enteros sin decimales, y la suma de todos los servicios coincide con el consolidado (con ajuste por redondeo si es necesario).

---

### RF-04: Validación de Ecuaciones Contables

**Descripción**: El sistema debe validar automáticamente que los balances generados cumplan con las ecuaciones contables fundamentales.

**Detalles**:
- **Validaciones obligatorias**:
  1. **Ecuación del Balance**: `Activo = Pasivo + Patrimonio`
  2. **Ecuación del Resultado**: `Utilidad (o Pérdida) = Ingresos - Gastos`
- **Nivel de validación**:
  - Validar el balance **consolidado** antes de distribuir
  - Validar **cada balance por servicio** después de distribuir
- **Manejo de errores**:
  - Si el balance consolidado no cuadra, mostrar error y no permitir continuar
  - Si algún balance por servicio no cuadra (por redondeo), aplicar ajuste automático en la cuenta de "Utilidad del Ejercicio" o "Pérdida del Ejercicio"
- **Tolerancia**:
  - Permitir una diferencia máxima de ±5 pesos por efecto de redondeo
  - Si la diferencia es mayor, alertar al usuario

**Criterio de aceptación**: El sistema valida las ecuaciones contables, muestra claramente si hay errores, y aplica ajustes automáticos cuando sea necesario por redondeo.

---

### RF-05: Mapeo Automático a Plantilla XBRL

**Descripción**: El sistema debe mapear automáticamente los balances por servicio a un conjunto específico de hojas de la plantilla XBRL oficial. El resto de las hojas deberán ser diligenciadas manualmente por el usuario.

**Detalles**:
- **Hojas a diligenciar automáticamente** (según análisis de las plantillas):
  - **[210000] Estado de situación financiera**: Balance General por servicio.
- **[310000] Estado de resultados**: Estado de Resultados por servicio.
- **[900017a-c, g] FC01 - Gastos de servicios públicos**: Desglose de gastos por cada servicio y el total.
- **[900019] FC02 - Complementario ingresos**: Desglose de ingresos.
- **[900021-23] FC03 - Cuentas por Cobrar (CXC)**: Detalle de cuentas por cobrar por servicio y estrato.
- **[900032] FC09 - Detalle de costo de ventas**: Desglose del costo de ventas.
- **Mapeo inteligente**:
  - El sistema debe conocer la correspondencia entre:
    - Códigos PUC → Conceptos XBRL (ej. cuenta 1105 "Caja" → concepto XBRL "ifrs-full_Cash")
    - Cuentas del balance → Celdas específicas de la plantilla Excel XBRL
  - Utilizar los archivos de mapeo (.xml) analizados como referencia
- **Dimensiones XBRL**:
  - Aplicar correctamente las dimensiones de servicio en cada hoja
  - Ejemplo: Los datos de Acueducto deben ir en las columnas con dimensión "AcueductoMember"

**Criterio de aceptación**: El sistema genera una plantilla Excel XBRL con las hojas principales completamente diligenciadas, respetando la estructura y dimensiones de la taxonomía oficial.

---

### RF-06: Generación de Archivos XBRL

**Descripción**: El sistema debe generar el paquete completo de archivos XBRL listos para cargar en XBRL Express.

**Detalles**:
- **Archivos a generar**:
  1. **Plantilla Excel (.xlsx)**: Con las hojas diligenciadas automáticamente
  2. **Archivo de mapeo (.xml)**: Que define la correspondencia entre celdas Excel y conceptos XBRL
  3. **Archivo de plantilla XBRL (.xbrlt)**: Con los contextos, dimensiones y referencias a los datos
  4. **Instancia XBRL (.xbrl)**: Archivo de referencia que apunta a la taxonomía oficial
- **Compatibilidad**:
  - Los archivos deben ser **100% compatibles** con XBRL Express
  - Deben poder abrirse en XBRL Express sin errores de formato
  - Deben pasar la validación básica de estructura XBRL
- **Descarga**:
  - El usuario puede descargar un archivo .zip con todos los archivos generados
  - Nombre del archivo: `[NombreEmpresa]_[GrupoNIIF]_[Fecha].zip`

**Criterio de aceptación**: El sistema genera un paquete .zip con todos los archivos XBRL, el usuario puede descargarlo, abrirlo en XBRL Express, y las hojas automáticas están correctamente diligenciadas.

---

### RF-07: Identificación de Hojas Pendientes

**Descripción**: El sistema debe indicar claramente al usuario qué hojas de la plantilla XBRL NO fueron diligenciadas automáticamente y requieren intervención manual.

**Detalles**:
- **Categorización de hojas**:
  - **Hojas automáticas**: Completamente diligenciadas por el sistema (marcadas en verde)
  - **Hojas pendientes**: Requieren información adicional del usuario (marcadas en amarillo)
  - **Hojas no aplicables**: No requieren datos para esta empresa (marcadas en gris)
- **Listado de pendientes**:
  - Mostrar un resumen con el nombre de cada hoja pendiente
  - Indicar qué tipo de información se necesita (ej. "Notas explicativas", "Políticas contables", "Revelaciones específicas")
- **Guía de diligenciamiento**:
  - Para cada hoja pendiente, mostrar una breve descripción de qué información se requiere
  - Opcionalmente, proporcionar un enlace a la guía oficial de la SSPD

**Criterio de aceptación**: El usuario ve claramente cuántas hojas fueron diligenciadas automáticamente y cuántas requieren su intervención, con una descripción de qué información falta.

---

### RF-08: Gestión de Múltiples Empresas y Taxonomías

**Descripción**: El sistema debe permitir al usuario gestionar múltiples empresas y generar múltiples taxonomías de forma eficiente.

**Detalles**:
- **Registro de empresas**:
  - Crear un perfil por empresa con:
    - Nombre de la empresa
    - NIT
    - Grupo NIIF (1, 2, 3 o R414)
    - Servicios que presta
    - Configuración de porcentajes predeterminada
- **Historial de taxonomías**:
  - Guardar todas las taxonomías generadas para cada empresa
  - Mostrar fecha de generación, período reportado, estado (En Proceso, Completada, Reportada)
- **Reutilización de configuraciones**:
  - Al generar una nueva taxonomía para una empresa existente, cargar automáticamente la configuración de servicios y porcentajes de la última vez
  - Permitir ajustar si es necesario
- **Dashboard de productividad**:
  - Mostrar cuántas taxonomías se han generado en el día/semana/mes
  - Tiempo promedio de procesamiento
  - Empresas pendientes de reporte

**Criterio de aceptación**: El usuario puede gestionar múltiples empresas, generar taxonomías rápidamente reutilizando configuraciones, y ver un dashboard con su productividad.

---

## 3. Requisitos No Funcionales

### RNF-01: Rendimiento
- La distribución de un balance con 3,700 cuentas a 3 servicios debe completarse en **menos de 30 segundos**
- La generación del paquete XBRL completo debe completarse en **menos de 2 minutos**

### RNF-02: Usabilidad
- La interfaz debe ser **intuitiva** y no requerir capacitación técnica en XBRL
- El flujo completo (desde carga del balance hasta descarga del XBRL) debe completarse en **máximo 10 clics**
- Mensajes de error claros y en español

### RNF-03: Precisión
- **Cero errores** en las ecuaciones contables después de la distribución
- **100% de compatibilidad** con XBRL Express (los archivos deben abrirse sin errores)
- Los valores deben ser **enteros sin decimales** en todos los casos

### RNF-04: Escalabilidad
- El sistema debe soportar al menos **50 empresas** por usuario
- Debe poder procesar **10 taxonomías simultáneamente** sin degradación del rendimiento

## 4. Impacto Esperado

### Antes (Situación Actual)
- **Tiempo por taxonomía**: 1 día completo (8 horas)
- **Taxonomías por día**: 1
- **Proceso**: 100% manual, propenso a errores, no escalable

### Después (Con la Aplicación Web)
- **Tiempo por taxonomía**: 2-3 horas (incluyendo diligenciamiento manual de hojas pendientes)
- **Taxonomías por día**: 4
- **Proceso**: 80-90% automatizado, validación automática, escalable

### ROI (Retorno de Inversión)
- **Incremento de productividad**: 400% (de 1 a 4 taxonomías/día)
- **Reducción de errores**: Estimado 90% (por validación automática)
- **Tiempo ahorrado**: 5-6 horas por taxonomía
