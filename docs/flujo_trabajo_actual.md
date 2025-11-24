# Análisis del Flujo de Trabajo Actual

## Situación Identificada

El usuario enfrenta un **problema de resistencia al cambio** por parte de los contadores de las empresas de servicios públicos. Los contadores:

- Solo manejan información **consolidada** (Balance General y Estado de Resultados unificado)
- Se niegan a diligenciar las plantillas XBRL oficiales (40-66 hojas según el grupo NIIF)
- Argumentan desconocimiento del tema y consideran el proceso muy complejo
- No tienen la información **segregada por tipo de servicio** (acueducto, alcantarillado, aseo, etc.)

## Solución Implementada por el Usuario

El usuario ha desarrollado una **plantilla intermedia** (`PlantillaNIIF.xlsx`) que actúa como puente entre lo que los contadores entregan y lo que la SSPD requiere.

### Estructura de la Plantilla

La plantilla consta de 2 hojas principales:

#### 1. Hoja "Consolidado"
- **Propósito**: Recibir la información tal como la entrega el contador
- **Contenido**: Plan Único de Cuentas (PUC) completo con 3,744 cuentas
- **Columnas**:
  - Código de cuenta
  - Denominación
  - Corriente
  - No Corriente
  - Total (suma de corriente + no corriente)

#### 2. Hoja "AAA" (Acueducto, Alcantarillado, Aseo)
- **Propósito**: Distribuir automáticamente los balances consolidados a los 3 servicios
- **Contenido**: Las mismas 3,744+ cuentas, pero con valores distribuidos
- **Columnas**:
  - Código y Denominación (igual que Consolidado)
  - **Acueducto**: 40% del total
  - **Alcantarillado**: 20% del total
  - **Aseo**: 40% del total
  - **Verificación**: Suma de los 3 servicios (debe coincidir con el consolidado)

### Lógica de Distribución

La distribución se realiza mediante fórmulas de Excel:

```
Acueducto      = ROUND(Balance_Total * 40%, 0)
Alcantarillado = ROUND(Balance_Total * 20%, 0)
Aseo           = ROUND(Balance_Total * 40%, 0)
```

Los porcentajes (40%-20%-40%) son **fijos** y se aplican a **todas las cuentas** por igual.

## Flujo de Trabajo Completo

```
1. CONTADOR
   └─> Entrega Balance Consolidado (Excel simple)
       
2. USUARIO (Consultor)
   └─> Copia datos a hoja "Consolidado" de PlantillaNIIF.xlsx
   └─> Las fórmulas automáticamente distribuyen a hoja "AAA"
   
3. USUARIO (Consultor)
   └─> Copia datos de hoja "AAA" a la plantilla XBRL oficial (40-66 hojas)
   └─> Completa información adicional requerida (notas, revelaciones, etc.)
   
4. USUARIO (Consultor)
   └─> Carga la plantilla XBRL en la aplicación "XBRL Express"
   └─> Genera los archivos .xbrl, .xbrlt, .xml
   
5. USUARIO (Consultor)
   └─> Sube los archivos XBRL al SUI (plataforma de la SSPD)
```

## Puntos Críticos del Proceso Actual

### 1. Trabajo Manual Repetitivo
El usuario debe realizar **múltiples copias y pegados** entre diferentes archivos Excel, lo que:
- Consume mucho tiempo
- Es propenso a errores humanos
- Dificulta el manejo de múltiples empresas

### 2. Distribución Simplificada
Los porcentajes fijos (40%-20%-40%) son una **aproximación**, no reflejan la realidad económica de cada cuenta:
- Algunas cuentas deberían distribuirse de forma diferente
- Activos específicos de un servicio se distribuyen erróneamente
- No hay flexibilidad para ajustar porcentajes por cuenta

### 3. Dependencia del Consultor
Todo el proceso recae en el usuario, convirtiéndolo en un **cuello de botella**:
- No es escalable
- Si el usuario no está disponible, el proceso se detiene
- Dificulta la delegación del trabajo

### 4. Falta de Trazabilidad
No hay un registro claro de:
- Qué datos entregó el contador
- Cuándo se realizó la distribución
- Qué ajustes se hicieron
- Versiones anteriores de los reportes

### 5. Validación Tardía
Los errores solo se detectan al final, cuando se carga el archivo en XBRL Express o en el SUI:
- Si hay errores, hay que volver a empezar
- No hay validación intermedia
- El contador no recibe retroalimentación sobre sus datos

## Oportunidades de Mejora

La situación actual presenta varias oportunidades claras para automatización y mejora del proceso, que se pueden abordar mediante una aplicación web especializada.
