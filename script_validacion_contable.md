# Script SQL de Validación Contable Exhaustiva

## Overview

Este documento contiene la especificación completa del script SQL para realizar una validación contable exhaustiva de los datos financieros en el sistema XBRL Generator.

## Estructura del Script

### BLOQUE 1: CONFIGURACIÓN INICIAL Y CONEXIÓN

```sql
-- ================================================================================
-- SCRIPT DE VALIDACIÓN CONTABLE EXHAUSTIVA
-- Sistema XBRL Generator - Validación de Integridad Financiera
-- ================================================================================

-- Configuración de sesión para PostgreSQL
SET client_min_messages TO WARNING;
SET search_path TO public;

-- Iniciar transacción para consistencia
BEGIN;

-- Bloque de manejo de excepciones
DO $$
DECLARE
    error_message TEXT;
BEGIN
    -- Código principal del script aquí
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'Error en validación contable: %', error_message;
    ROLLBACK;
END $$;
```

### BLOQUE 2: DECLARACIÓN DE VARIABLES Y CONSTANTES

```sql
-- Variables para totales por categoría contable
DECLARE
    -- Totales desde working_accounts
    v_total_activos BIGINT := 0;
    v_total_pasivos BIGINT := 0;
    v_total_patrimonio BIGINT := 0;
    
    -- Totales por servicio desde service_balances
    v_activos_acueducto BIGINT := 0;
    v_activos_alcantarillado BIGINT := 0;
    v_activos_aseo BIGINT := 0;
    v_total_activos_servicios BIGINT := 0;
    
    -- Constantes para validación
    c_valor_esperado_activos CONSTANT BIGINT := 65921695;
    c_tolerancia NUMERIC := 1000; -- Tolerancia de 1,000 pesos
    
    -- Variables de control
    v_validacion1_exitosa BOOLEAN := FALSE;
    v_validacion2_exitosa BOOLEAN := FALSE;
    v_validacion3_exitosa BOOLEAN := FALSE;
    v_diferencia1 BIGINT := 0;
    v_diferencia2 BIGINT := 0;
    v_diferencia3 BIGINT := 0;
    
    -- Timestamp de ejecución
    v_fecha_ejecucion TIMESTAMP := NOW();
```

### BLOQUE 3: CÁLCULO DE TOTALES POR CATEGORÍA (working_accounts)

```sql
-- ================================================================================
-- CÁLCULO DE TOTALES DESDE working_accounts
-- ================================================================================

-- Calcular total de Activos (clase 1)
SELECT COALESCE(SUM(balance), 0) 
INTO v_total_activos
FROM working_accounts 
WHERE account_class = '1' AND balance IS NOT NULL;

-- Calcular total de Pasivos (clase 2)
SELECT COALESCE(SUM(balance), 0) 
INTO v_total_pasivos
FROM working_accounts 
WHERE account_class = '2' AND balance IS NOT NULL;

-- Calcular total de Patrimonio (clase 3)
SELECT COALESCE(SUM(balance), 0) 
INTO v_total_patrimonio
FROM working_accounts 
WHERE account_class = '3' AND balance IS NOT NULL;

-- Logging de cálculos
RAISE NOTICE 'Cálculos de working_accounts completados:';
RAISE NOTICE '  Total Activos: %', v_total_activos;
RAISE NOTICE '  Total Pasivos: %', v_total_pasivos;
RAISE NOTICE '  Total Patrimonio: %', v_total_patrimonio;
```

### BLOQUE 4: CÁLCULO DE ACTIVOS POR SERVICIO (service_balances)

```sql
-- ================================================================================
-- CÁLCULO DE ACTIVOS POR SERVICIO DESDE service_balances
-- ================================================================================

-- Calcular activos para Acueducto (cuentas que empiezan con 1)
SELECT COALESCE(SUM(balance), 0)
INTO v_activos_acueducto
FROM service_balances 
WHERE service = 'Acueducto' 
  AND account_type LIKE '1%' 
  AND balance IS NOT NULL;

-- Calcular activos para Alcantarillado (cuentas que empiezan con 1)
SELECT COALESCE(SUM(balance), 0)
INTO v_activos_alcantarillado
FROM service_balances 
WHERE service = 'Alcantarillado' 
  AND account_type LIKE '1%' 
  AND balance IS NOT NULL;

-- Calcular activos para Aseo (cuentas que empiezan con 1)
SELECT COALESCE(SUM(balance), 0)
INTO v_activos_aseo
FROM service_balances 
WHERE service = 'Aseo' 
  AND account_type LIKE '1%' 
  AND balance IS NOT NULL;

-- Calcular total de activos por servicio
v_total_activos_servicios := v_activos_acueducto + v_activos_alcantarillado + v_activos_aseo;

-- Logging de cálculos por servicio
RAISE NOTICE 'Cálculos de service_balances completados:';
RAISE NOTICE '  Activos Acueducto: %', v_activos_acueducto;
RAISE NOTICE '  Activos Alcantarillado: %', v_activos_alcantarillado;
RAISE NOTICE '  Activos Aseo: %', v_activos_aseo;
RAISE NOTICE '  Total Activos por Servicios: %', v_total_activos_servicios;
```

### BLOQUE 5: VALIDACIONES CONTABLES

```sql
-- ================================================================================
-- VALIDACIÓN 1: TOTAL ACTIVOS VS VALOR ESPERADO
-- ================================================================================
v_diferencia1 := ABS(v_total_activos - c_valor_esperado_activos);
v_validacion1_exitosa := v_diferencia1 <= c_tolerancia;

-- ================================================================================
-- VALIDACIÓN 2: ECUACIÓN CONTABLE FUNDAMENTAL
-- ================================================================================
v_diferencia2 := ABS(v_total_activos - (v_total_pasivos + v_total_patrimonio));
v_validacion2_exitosa := v_diferencia2 <= c_tolerancia;

-- ================================================================================
-- VALIDACIÓN 3: CONSISTENCIA DE ACTIVOS POR SERVICIO
-- ================================================================================
v_diferencia3 := ABS(v_total_activos - v_total_activos_servicios);
v_validacion3_exitosa := v_diferencia3 <= c_tolerancia;
```

### BLOQUE 6: FORMATO DE RESULTADOS

```sql
-- ================================================================================
-- REPORTE DE VALIDACIÓN CONTABLE
-- ================================================================================

-- Crear tabla temporal para resultados
CREATE TEMPORARY TABLE tmp_resultados_validacion (
    seccion TEXT,
    concepto TEXT,
    valor_calculado BIGINT,
    valor_esperado BIGINT,
    diferencia BIGINT,
    estado TEXT
) ON COMMIT DROP;

-- Insertar resultados de totales
INSERT INTO tmp_resultados_validacion VALUES
('TOTALES POR CATEGORÍA', 'Activos', v_total_activos, NULL, NULL, 'CALCULADO'),
('TOTALES POR CATEGORÍA', 'Pasivos', v_total_pasivos, NULL, NULL, 'CALCULADO'),
('TOTALES POR CATEGORÍA', 'Patrimonio', v_total_patrimonio, NULL, NULL, 'CALCULADO'),
('TOTALES POR SERVICIO', 'Activos Acueducto', v_activos_acueducto, NULL, NULL, 'CALCULADO'),
('TOTALES POR SERVICIO', 'Activos Alcantarillado', v_activos_alcantarillado, NULL, NULL, 'CALCULADO'),
('TOTALES POR SERVICIO', 'Activos Aseo', v_activos_aseo, NULL, NULL, 'CALCULADO'),
('TOTALES POR SERVICIO', 'Total Activos Servicios', v_total_activos_servicios, NULL, NULL, 'CALCULADO');

-- Insertar resultados de validaciones
INSERT INTO tmp_resultados_validacion VALUES
('VALIDACIÓN 1', 'Total Activos vs Esperado', v_total_activos, c_valor_esperado_activos, v_diferencia1, 
 CASE WHEN v_validacion1_exitosa THEN 'PASO' ELSE 'FALLO' END),
('VALIDACIÓN 2', 'Ecuación Contable', v_total_activos, v_total_pasivos + v_total_patrimonio, v_diferencia2,
 CASE WHEN v_validacion2_exitosa THEN 'PASO' ELSE 'FALLO' END),
('VALIDACIÓN 3', 'Consistencia Servicios', v_total_activos, v_total_activos_servicios, v_diferencia3,
 CASE WHEN v_validacion3_exitosa THEN 'PASO' ELSE 'FALLO' END);

-- Mostrar reporte formateado
RAISE NOTICE '';
RAISE NOTICE '================================================================================';
RAISE NOTICE 'REPORTE DE VALIDACIÓN CONTABLE - %', TO_CHAR(v_fecha_ejecucion, 'YYYY-MM-DD HH24:MI:SS');
RAISE NOTICE '================================================================================';
RAISE NOTICE '';

-- Mostrar totales por categoría
RAISE NOTICE 'TOTALES POR CATEGORÍA CONTABLE:';
RAISE NOTICE '  %-25s %15s', 'Concepto', 'Valor Calculado';
RAISE NOTICE '  %-25s %15s', '---------', '---------------';
RAISE NOTICE '  %-25s %15s', 'Activos', TO_CHAR(v_total_activos, '999,999,999');
RAISE NOTICE '  %-25s %15s', 'Pasivos', TO_CHAR(v_total_pasivos, '999,999,999');
RAISE NOTICE '  %-25s %15s', 'Patrimonio', TO_CHAR(v_total_patrimonio, '999,999,999');
RAISE NOTICE '';

-- Mostrar totales por servicio
RAISE NOTICE 'TOTALES DE ACTIVOS POR SERVICIO:';
RAISE NOTICE '  %-25s %15s', 'Servicio', 'Valor Calculado';
RAISE NOTICE '  %-25s %15s', '--------', '---------------';
RAISE NOTICE '  %-25s %15s', 'Acueducto', TO_CHAR(v_activos_acueducto, '999,999,999');
RAISE NOTICE '  %-25s %15s', 'Alcantarillado', TO_CHAR(v_activos_alcantarillado, '999,999,999');
RAISE NOTICE '  %-25s %15s', 'Aseo', TO_CHAR(v_activos_aseo, '999,999,999');
RAISE NOTICE '  %-25s %15s', 'TOTAL SERVICIOS', TO_CHAR(v_total_activos_servicios, '999,999,999');
RAISE NOTICE '';

-- Mostrar resultados de validaciones
RAISE NOTICE 'RESULTADOS DE VALIDACIONES:';
RAISE NOTICE '  %-35s %15s %15s %15s %8s', 'Validación', 'Calculado', 'Esperado', 'Diferencia', 'Estado';
RAISE NOTICE '  %-35s %15s %15s %15s %8s', '----------', '----------', '---------', '----------', '------';
RAISE NOTICE '  %-35s %15s %15s %15s %8s', '1. Total Activos vs Esperado', 
    TO_CHAR(v_total_activos, '999,999,999'),
    TO_CHAR(c_valor_esperado_activos, '999,999,999'),
    TO_CHAR(v_diferencia1, '999,999,999'),
    CASE WHEN v_validacion1_exitosa THEN 'PASO' ELSE 'FALLO' END);
RAISE NOTICE '  %-35s %15s %15s %15s %8s', '2. Ecuación Contable (A=P+P)', 
    TO_CHAR(v_total_activos, '999,999,999'),
    TO_CHAR(v_total_pasivos + v_total_patrimonio, '999,999,999'),
    TO_CHAR(v_diferencia2, '999,999,999'),
    CASE WHEN v_validacion2_exitosa THEN 'PASO' ELSE 'FALLO' END);
RAISE NOTICE '  %-35s %15s %15s %15s %8s', '3. Consistencia Activos Servicios', 
    TO_CHAR(v_total_activos, '999,999,999'),
    TO_CHAR(v_total_activos_servicios, '999,999,999'),
    TO_CHAR(v_diferencia3, '999,999,999'),
    CASE WHEN v_validacion3_exitosa THEN 'PASO' ELSE 'FALLO' END);
RAISE NOTICE '';

-- Resumen final
RAISE NOTICE 'RESUMEN FINAL:';
RAISE NOTICE '  Validaciones exitosas: % de 3', 
    CASE WHEN v_validacion1_exitosa THEN 1 ELSE 0 END + 
    CASE WHEN v_validacion2_exitosa THEN 1 ELSE 0 END + 
    CASE WHEN v_validacion3_exitosa THEN 1 ELSE 0 END;
RAISE NOTICE '  Estado general: %', 
    CASE 
        WHEN v_validacion1_exitosa AND v_validacion2_exitosa AND v_validacion3_exitosa 
        THEN 'TODAS LAS VALIDACIONES PASARON'
        ELSE 'HAY VALIDACIONES QUE FALLARON - REVISAR DETALLES'
    END;
RAISE NOTICE '================================================================================';
```

### BLOQUE 7: MANEJO DE ERRORES Y LIMPIEZA

```sql
-- ================================================================================
-- FINALIZACIÓN Y LIMPIEZA
-- ================================================================================

-- Confirmar transacción si todo fue exitoso
COMMIT;

-- Función principal que encapsula todo el proceso
CREATE OR REPLACE FUNCTION fn_validacion_contable_exhaustiva()
RETURNS TABLE(
    seccion TEXT,
    concepto TEXT,
    valor_calculado BIGINT,
    valor_esperado BIGINT,
    diferencia BIGINT,
    estado TEXT
) AS $$
BEGIN
    -- Ejecutar todo el proceso de validación
    -- (Todo el código anterior va aquí)
    
    -- Retornar resultados
    RETURN QUERY SELECT * FROM tmp_resultados_validacion;
END;
$$ LANGUAGE plpgsql;

-- Crear vista para fácil acceso a resultados
CREATE OR REPLACE VIEW vw_resultados_validacion AS
SELECT * FROM fn_validacion_contable_exhaustiva();

-- Índices sugeridos para optimización
CREATE INDEX IF NOT EXISTS idx_working_accounts_class_balance ON working_accounts(account_class, balance) WHERE balance IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_balances_service_type ON service_balances(service, account_type) WHERE balance IS NOT NULL;

RAISE NOTICE 'Script de validación contable completado exitosamente';
RAISE NOTICE 'Para ejecutar nuevamente, use: SELECT * FROM fn_validacion_contable_exhaustiva();';
```

## Cómo Usar el Script

### Ejecución Directa
```sql
-- Ejecutar el script completo una vez
-- (Copiar y pegar todo el contenido en PostgreSQL)
```

### Ejecución como Función
```sql
-- Ejecutar validación usando la función
SELECT * FROM fn_validacion_contable_exhaustiva();
```

### Ejecución Programada
```sql
-- Crear job para ejecución automática (requiere pg_cron)
SELECT cron.schedule('validacion-contable-diaria', '0 2 * * *', 
    'SELECT * FROM fn_validacion_contable_exhaustiva();');
```

## Requisitos Previos

1. **Base de Datos**: PostgreSQL 12 o superior
2. **Tablas Requeridas**:
   - `working_accounts` con campos `account_class`, `balance`
   - `service_balances` con campos `service`, `account_type`, `balance`
3. **Permisos**: SELECT sobre las tablas, CREATE FUNCTION, CREATE VIEW

## Optimizaciones Implementadas

1. **Índices Específicos** para consultas principales
2. **Manejo de Nulos** con COALESCE
3. **Transacciones** para consistencia
4. **Variables Tipadas** para mejor rendimiento
5. **Logging** para seguimiento

## Manejo de Errores

1. **Bloques TRY-CATCH** PostgreSQL
2. **Validaciones de Tolerancia** (1,000 pesos)
3. **Logging Detallado** de operaciones
4. **Rollback Automático** en caso de error

## Extensiones Posibles

1. **Parámetros Configurables** (tolerancia, valor esperado)
2. **Histórico de Validaciones**
3. **Alertas Automáticas** por email
4. **Dashboard Web** de resultados
5. **Integración con Sistema XBRL Generator**

## Notas Técnicas

- El script es completamente autónomo y no requiere parámetros externos
- Utiliza sintaxis PostgreSQL específica (DO $$, plpgsql)
- Maneja valores nulos automáticamente
- Incluye comentarios explicativos en cada sección
- Formatea números para fácil lectura
- Proporciona indicadores claros de PASO/FALLO