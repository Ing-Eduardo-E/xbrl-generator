# Script de Validación Contable Exhaustiva

## Overview

Este sistema de validación contable exhaustiva está diseñado para verificar la integridad de los datos financieros en el sistema XBRL Generator, asegurando que se cumplan las ecuaciones contables fundamentales y que los datos distribuidos por servicio sean consistentes.

## Archivos del Sistema

1. **[`validacion_contable_exhaustiva.sql`](validacion_contable_exhaustiva.sql)** - Script principal de validación
2. **[`test_validacion_contable.sql`](test_validacion_contable.sql)** - Datos de prueba para validación
3. **[`script_validacion_contable.md`](script_validacion_contable.md)** - Especificación técnica completa
4. **[`README_Validacion_Contable.md`](README_Validacion_Contable.md)** - Este documento de instrucciones

## Requisitos del Sistema

### Base de Datos
- **PostgreSQL 12** o superior
- Permisos: SELECT, CREATE FUNCTION, CREATE VIEW
- Tablas requeridas: `working_accounts`, `service_balances`

### Estructura de Tablas

#### working_accounts
```sql
CREATE TABLE working_accounts (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,           -- Código PUC
  name TEXT NOT NULL,           -- Nombre cuenta
  value INTEGER NOT NULL,       -- Valor en pesos
  is_leaf BOOLEAN DEFAULT false,-- Cuenta hoja?
  level INTEGER NOT NULL,       -- Nivel jerárquico
  class TEXT NOT NULL,          -- Clase (1=Activos, 2=Pasivos, 3=Patrimonio)
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### service_balances
```sql
CREATE TABLE service_balances (
  id SERIAL PRIMARY KEY,
  service TEXT NOT NULL,        -- 'acueducto', 'alcantarillado', 'aseo'
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  value INTEGER NOT NULL,
  is_leaf BOOLEAN DEFAULT false,
  level INTEGER DEFAULT 1,
  class TEXT DEFAULT '',
  account_type TEXT NOT NULL,   -- Tipo de cuenta (equivalente a account_class)
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Instalación y Configuración

### Paso 1: Preparar la Base de Datos

```sql
-- Conectarse a PostgreSQL
psql -h localhost -U postgres -d xbrl_generator

-- Verificar que las tablas existan
\dt working_accounts
\dt service_balances
```

### Paso 2: Ejecutar el Script Principal

```bash
# Opción 1: Usar psql
psql -h localhost -U postgres -d xbrl_generator -f validacion_contable_exhaustiva.sql

# Opción 2: Copiar y pegar en cliente SQL
# Abrir el archivo validacion_contable_exhaustiva.sql y ejecutar todo el contenido
```

### Paso 3: (Opcional) Cargar Datos de Prueba

```bash
# Cargar datos de prueba para validación
psql -h localhost -U postgres -d xbrl_generator -f test_validacion_contable.sql
```

## Uso del Sistema

### Ejecución Directa

El script principal se ejecuta una vez y crea objetos permanentes:

```sql
-- Ejecutar script completo (una sola vez)
-- Esto crea la función y la vista automáticamente
```

### Ejecución como Función

Después de la instalación, puede ejecutar la validación repetidamente:

```sql
-- Ejecutar validación completa
SELECT * FROM fn_validacion_contable_exhaustiva();

-- Ver resultados específicos
SELECT * FROM vw_resultados_validacion;
```

### Consultas Útiles

```sql
-- Ver solo validaciones que fallaron
SELECT * FROM vw_resultados_validacion 
WHERE estado = 'FALLO';

-- Ver resumen de totales
SELECT seccion, concepto, valor_calculado 
FROM vw_resultados_validacion 
WHERE estado = 'CALCULADO';

-- Ver timestamp de última ejecución
SELECT * FROM vw_resultados_validacion 
WHERE concepto LIKE '%Validación%' 
LIMIT 1;
```

## Validaciones Implementadas

### Validación 1: Total Activos vs Valor Esperado
- **Propósito**: Verificar que el total de activos coincida con el valor esperado
- **Valor Esperado**: 65,921,695 pesos
- **Tolerancia**: 1,000 pesos
- **Fórmula**: `ABS(total_activos - 65921695) <= 1000`

### Validación 2: Ecuación Contable Fundamental
- **Propósito**: Verificar la ecuación contable básica
- **Fórmula**: `Activos = Pasivos + Patrimonio`
- **Tolerancia**: 1,000 pesos
- **Cálculo**: `ABS(total_activos - (total_pasivos + total_patrimonio)) <= 1000`

### Validación 3: Consistencia de Activos por Servicio
- **Propósito**: Asegurar que la suma de activos por servicio coincida con el total
- **Fórmula**: `Σ(Activos por Servicio) = Total Activos`
- **Tolerancia**: 1,000 pesos
- **Cálculo**: `ABS(total_activos - total_activos_servicios) <= 1000`

## Formato de Salida

El sistema genera un reporte estructurado con:

### Reporte en Consola
```
================================================================================
REPORTE DE VALIDACIÓN CONTABLE - 2024-12-07 22:06:50
================================================================================

TOTALES POR CATEGORÍA CONTABLE:
  Concepto                  Valor Calculado
  ---------                 ---------------
  Activos                     65,921,695
  Pasivos                     45,000,000
  Patrimonio                  20,921,695

TOTALES DE ACTIVOS POR SERVICIO:
  Servicio                  Valor Calculado
  --------                 ---------------
  Acueducto                  26,368,678
  Alcantarillado              13,184,339
  Aseo                       26,368,678
  TOTAL SERVICIOS             65,921,695

RESULTADOS DE VALIDACIONES:
  Validación                           Calculado       Esperado       Diferencia    Estado
  ----------                           ----------       ---------       ----------    ------
  1. Total Activos vs Esperado         65,921,695      65,921,695             0      PASO
  2. Ecuación Contable (A=P+P)        65,921,695      65,921,695             0      PASO
  3. Consistencia Activos Servicios    65,921,695      65,921,695             0      PASO

RESUMEN FINAL:
  Validaciones exitosas: 3 de 3
  Estado general: ✅ TODAS LAS VALIDACIONES PASARON
================================================================================
```

### Tabla de Resultados
| Sección | Concepto | Valor Calculado | Valor Esperado | Diferencia | Estado |
|---------|-----------|-----------------|---------------|-------------|---------|
| TOTALES POR CATEGORÍA | Activos | 65,921,695 | NULL | NULL | CALCULADO |
| TOTALES POR CATEGORÍA | Pasivos | 45,000,000 | NULL | NULL | CALCULADO |
| VALIDACIÓN 1 | Total Activos vs Esperado | 65,921,695 | 65,921,695 | 0 | PASO |
| VALIDACIÓN 2 | Ecuación Contable | 65,921,695 | 65,921,695 | 0 | PASO |

## Automatización

### Ejecución Programada (pg_cron)

```sql
-- Crear job diario a las 2 AM
SELECT cron.schedule('validacion-contable-diaria', '0 2 * * *', 
    'SELECT * FROM fn_validacion_contable_exhaustiva();');

-- Crear job cada hora
SELECT cron.schedule('validacion-contable-horaria', '0 * * * *', 
    'SELECT * FROM fn_validacion_contable_exhaustiva();');
```

### Integración con Aplicaciones

```javascript
// Ejemplo de integración con Node.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/xbrl_generator'
});

async function ejecutarValidacion() {
  const result = await pool.query(
    'SELECT * FROM fn_validacion_contable_exhaustiva()'
  );
  
  const validaciones = result.rows.filter(r => r.seccion.startsWith('VALIDACIÓN'));
  const fallos = validaciones.filter(v => v.estado === 'FALLO');
  
  if (fallos.length > 0) {
    console.error('❌ Validaciones fallaron:', fallos);
    // Enviar alerta
  } else {
    console.log('✅ Todas las validaciones pasaron');
  }
}
```

## Optimización y Rendimiento

### Índices Creados Automáticamente
```sql
-- Índice para working_accounts
CREATE INDEX idx_working_accounts_class_balance 
ON working_accounts(account_class, balance) 
WHERE balance IS NOT NULL;

-- Índice para service_balances
CREATE INDEX idx_service_balances_service_type 
ON service_balances(service, account_type) 
WHERE balance IS NOT NULL;
```

### Configuración de Rendimiento
- `SET client_min_messages TO WARNING` - Reduce logging
- `SET session_replication_role = replica` - Deshabilita triggers
- Uso de `COALESCE` para manejo eficiente de nulos
- Transacciones con rollback automático

## Manejo de Errores

### Tipos de Errores Manejados

1. **Errores de Conexión**: Verificación de existencia de tablas
2. **Errores de Cálculo**: Captura de excepciones por bloque
3. **Errores de Datos**: Manejo de valores nulos con COALESCE
4. **Errores de Transacción**: Rollback automático en caso de fallo

### Mensajes de Error

```sql
-- Ejemplo de manejo de errores
BEGIN
    -- Código que puede fallar
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'ERROR en validación contable: %', v_error_message;
    ROLLBACK;
END;
```

## Extensión y Personalización

### Modificar Valor Esperado

```sql
-- Cambiar valor esperado de activos
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION fn_validacion_contable_exhaustiva() 
             RENAME TO fn_validacion_contable_exhaustiva_old';
    
    -- Crear nueva función con valor modificado
    -- (Copiar función y cambiar c_valor_esperado_activos)
END $$;
```

### Agregar Nuevas Validaciones

```sql
-- Ejemplo: Validación de ratio de liquidez
-- Ratio = Activos Corrientes / Pasivos Corrientes
-- Debe estar entre 1.0 y 2.0
```

### Integración con Sistema XBRL Generator

El script está diseñado para integrarse seamlessly con el sistema existente:

1. **Compatibilidad** con esquema de base de datos existente
2. **Sin efectos secundarios** en datos existentes
3. **Objetos reutilizables** (función y vista)
4. **Logging no intrusivo** usando RAISE NOTICE

## Soporte y Mantenimiento

### Verificación de Instalación

```sql
-- Verificar que los objetos fueron creados
SELECT proname FROM pg_proc WHERE proname = 'fn_validacion_contable_exhaustiva';
SELECT viewname FROM pg_views WHERE viewname = 'vw_resultados_validacion';
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%_validation%';
```

### Actualización del Script

```sql
-- Eliminar objetos existentes
DROP FUNCTION IF EXISTS fn_validacion_contable_exhaustiva();
DROP VIEW IF EXISTS vw_resultados_validacion;
DROP INDEX IF EXISTS idx_working_accounts_class_balance;
DROP INDEX IF EXISTS idx_service_balances_service_type;

-- Ejecutar nueva versión
\i validacion_contable_exhaustiva.sql
```

### Monitoreo

```sql
-- Crear tabla de historial (opcional)
CREATE TABLE validation_history (
    id SERIAL PRIMARY KEY,
    execution_time TIMESTAMP DEFAULT NOW(),
    validation1_result BOOLEAN,
    validation2_result BOOLEAN,
    validation3_result BOOLEAN,
    total_activos BIGINT,
    total_pasivos BIGINT,
    total_patrimonio BIGINT
);

-- Insertar resultado en historial
INSERT INTO validation_history (validation1_result, validation2_result, validation3_result, 
                               total_activos, total_pasivos, total_patrimonio)
SELECT 
    CASE WHEN estado = 'PASO' AND concepto LIKE 'Total Activos%' THEN TRUE ELSE FALSE END,
    CASE WHEN estado = 'PASO' AND concepto LIKE 'Ecuación%' THEN TRUE ELSE FALSE END,
    CASE WHEN estado = 'PASO' AND concepto LIKE 'Consistencia%' THEN TRUE ELSE FALSE END,
    (SELECT valor_calculado FROM vw_resultados_validacion WHERE concepto = 'Activos' LIMIT 1),
    (SELECT valor_calculado FROM vw_resultados_validacion WHERE concepto = 'Pasivos' LIMIT 1),
    (SELECT valor_calculado FROM vw_resultados_validacion WHERE concepto = 'Patrimonio' LIMIT 1);
```

## Licencia y Soporte

Este script es parte del sistema XBRL Generator y está diseñado para uso interno. Para soporte técnico o modificaciones, contactar al equipo de desarrollo.

---

**Versión**: 1.0  
**Fecha**: 2024-12-07  
**Autor**: Sistema XBRL Generator  
**Compatibilidad**: PostgreSQL 12+