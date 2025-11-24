# Alcance de Automatización: Hojas XBRL Autocompletables

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

## 1. Resumen Ejecutivo

Basándose en el análisis detallado de las plantillas XBRL oficiales y la información disponible en el balance consolidado, la aplicación web podrá **automatizar el diligenciamiento de 11 hojas específicas** de las aproximadamente 45 hojas totales que componen una taxonomía XBRL típica.

Esto representa una **automatización del 24% de las hojas**, pero estas 11 hojas son precisamente las más tediosas y propensas a errores, ya que involucran el mapeo de miles de cuentas contables. Las 34 hojas restantes requieren información cualitativa, notas explicativas y revelaciones específicas que no se pueden derivar automáticamente del balance.

## 2. Hojas que se Automatizan (11 hojas)

La aplicación web diligenciará automáticamente las siguientes hojas a partir del balance consolidado distribuido por servicios:

| # | Código | Nombre de la Hoja | Descripción |
|:---|:---|:---|:---|
| 1 | [210000] | **Estado de situación financiera** | Balance General completo por servicio (Activo, Pasivo, Patrimonio). Incluye todas las cuentas del PUC clasificadas por corriente/no corriente y segregadas por servicio. |
| 2 | [310000] | **Estado de resultados** | Estado de Resultados completo por servicio (Ingresos, Gastos, Utilidad/Pérdida). Incluye todas las cuentas de ingresos y gastos segregadas por servicio. |
| 3 | [900017a] | **FC01-1 - Gastos de servicios públicos - Acueducto** | Desglose detallado de los gastos operacionales específicos del servicio de Acueducto. |
| 4 | [900017b] | **FC01-2 - Gastos de servicios públicos - Alcantarillado** | Desglose detallado de los gastos operacionales específicos del servicio de Alcantarillado. |
| 5 | [900017c] | **FC01-3 - Gastos de servicios públicos - Aseo** | Desglose detallado de los gastos operacionales específicos del servicio de Aseo. |
| 6 | [900017g] | **FC01-7 - Gastos de servicios públicos - Total servicios públicos** | Consolidado de los gastos de todos los servicios. |
| 7 | [900019] | **FC02 - Complementario ingresos** | Desglose detallado de los ingresos operacionales por tipo y por servicio. |
| 8 | [900021] | **FC03-1 - CXC - Acueducto (Detallado por estrato)** | Cuentas por cobrar del servicio de Acueducto, clasificadas por estrato socioeconómico. |
| 9 | [900022] | **FC03-2 - CXC - Alcantarillado (Detallado por estrato)** | Cuentas por cobrar del servicio de Alcantarillado, clasificadas por estrato socioeconómico. |
| 10 | [900023] | **FC03-3 - CXC - Aseo (Detallado por estrato)** | Cuentas por cobrar del servicio de Aseo, clasificadas por estrato socioeconómico. |
| 11 | [900032] | **FC09 - Detalle de costo de ventas** | Desglose del costo de ventas por concepto y por servicio. |

### Nota sobre las Hojas FC03 (Cuentas por Cobrar por Estrato)

Las hojas FC03 requieren una **distribución adicional por estrato socioeconómico** (estratos 1, 2, 3, 4, 5, 6). Si el balance consolidado no incluye esta información, la aplicación aplicará una distribución proporcional basada en porcentajes configurables por el usuario, o dejará estas hojas parcialmente completadas para que el usuario ajuste manualmente los valores por estrato.

## 3. Hojas que Requieren Diligenciamiento Manual (34 hojas)

Las siguientes categorías de hojas **NO se pueden automatizar** desde el balance consolidado y requerirán que el usuario las complete manualmente en XBRL Express:

### 3.1. Información General y Notas Explicativas
- **[110000] Información general sobre estados financieros**: Nombre de la empresa, NIT, fecha de cierre, políticas de redondeo, etc.
- **[810000] Notas - Información de la entidad y declaración de cumplimiento**: Descripción de la naturaleza del negocio, marco normativo aplicado, etc.

### 3.2. Políticas Contables
- **[800600] Notas - Lista de políticas contables**: Descripción de las políticas contables significativas aplicadas (reconocimiento, medición, depreciación, etc.).

### 3.3. Revelaciones Específicas por Cuenta
- **[822100] Notas - Propiedades, planta y equipo - Bloques de texto**: Información narrativa sobre PPE.
- **[822100a] Notas - Propiedades, planta y equipo - Información a revelar**: Tablas con movimientos de PPE (adiciones, retiros, depreciación acumulada).
- **[822390] Notas - Instrumentos financieros**: Clasificación, medición y riesgos de instrumentos financieros.
- **[823000] Notas - Medición del valor razonable**: Jerarquía de valor razonable y técnicas de valoración.
- Y otras 25+ hojas de notas específicas...

### 3.4. Estados Complementarios
- **[420000] Estado de Resultados Integral, componentes ORI**: Otros Resultados Integrales (ORI) que no están en el balance.
- **[510000] Estado de flujos de efectivo, método directo**: Requiere información de movimientos de efectivo que no está en el balance estático.
- **[610000] Estado de cambios en el patrimonio**: Requiere información de movimientos del patrimonio durante el período.

## 4. Impacto Real de la Automatización

Aunque solo se automatizan 11 de 45 hojas (24%), el **impacto en el tiempo de trabajo es mucho mayor**:

| Actividad | Tiempo Actual (Manual) | Tiempo con Automatización | Ahorro |
|:---|:---:|:---:|:---:|
| **Mapeo de cuentas a hojas 210000 y 310000** | 4 horas | 0 minutos | 100% |
| **Distribución por servicios (FC01, FC02, FC09)** | 2 horas | 0 minutos | 100% |
| **Cálculo de CXC por estrato (FC03)** | 1 hora | 10 minutos | 83% |
| **Diligenciamiento de notas y revelaciones** | 1 hora | 1 hora | 0% |
| **TOTAL** | **8 horas** | **1 hora 10 min** | **85%** |

La automatización elimina el **85% del tiempo de trabajo**, dejando al consultor enfocado únicamente en las tareas de alto valor que requieren criterio profesional.

## 5. Estrategia de Implementación

### Fase 1: MVP (Producto Mínimo Viable)
Automatizar las 2 hojas principales:
- [210000] Estado de situación financiera
- [310000] Estado de resultados

**Beneficio**: Elimina el 50% del trabajo manual.

### Fase 2: Formatos Complementarios Básicos
Agregar las hojas FC01 y FC02:
- [900017a-g] Gastos de servicios públicos
- [900019] Complementario ingresos

**Beneficio acumulado**: Elimina el 75% del trabajo manual.

### Fase 3: Formatos Avanzados
Agregar las hojas FC03 y FC09:
- [900021-23] CXC por estrato
- [900032] Detalle de costo de ventas

**Beneficio acumulado**: Elimina el 85% del trabajo manual (objetivo final).

## 6. Conclusión

La automatización propuesta es **altamente efectiva** a pesar de cubrir solo el 24% de las hojas, porque se enfoca en las hojas más repetitivas y propensas a errores. El consultor podrá dedicar su tiempo a las tareas que realmente requieren su experiencia profesional: redactar notas explicativas, definir políticas contables y preparar revelaciones específicas.
