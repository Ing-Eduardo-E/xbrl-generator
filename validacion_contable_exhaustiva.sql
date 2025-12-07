-- ================================================================================
-- SCRIPT DE VALIDACIÓN CONTABLE EXHAUSTIVA
-- Sistema XBRL Generator - Validación de Integridad Financiera
-- 
-- Descripción: Realiza validación contable exhaustiva de datos financieros
--              Verifica integridad de working_accounts y service_balances
-- 
-- ESTRUCTURA REAL DE TABLAS:
--   working_accounts: code, name, value, is_leaf, level, class
--   service_balances: service, code, name, value, is_leaf, level, class
--   (service: 'acueducto', 'alcantarillado', 'aseo' en minúsculas)
--
-- Requisitos: PostgreSQL 12+, tablas working_accounts y service_balances
-- Autor: Sistema XBRL Generator
-- Fecha: 2024-12-07
-- ================================================================================

-- BLOQUE 1: CONFIGURACIÓN INICIAL Y CONEXIÓN
-- ================================================================================

SET client_min_messages TO NOTICE;
SET search_path TO public;

-- ================================================================================
-- BLOQUE 2: DECLARACIÓN DE VARIABLES Y CONSTANTES
-- ================================================================================

DO $$
DECLARE
    -- Variables para totales por categoría contable (usando verificación dinámica)
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
    
    -- Variables para control de flujo
    v_error_message TEXT;
    v_count_working INT := 0;
    v_count_service INT := 0;

BEGIN
    -- ================================================================================
    -- BLOQUE 3: VERIFICACIÓN DE ESTRUCTURA DE TABLAS
    -- ================================================================================
    
    SELECT COUNT(*) INTO v_count_working FROM working_accounts;
    SELECT COUNT(*) INTO v_count_service FROM service_balances;
    
    IF v_count_working = 0 THEN
        RAISE EXCEPTION 'ERROR: La tabla working_accounts está vacía';
    END IF;
    
    IF v_count_service = 0 THEN
        RAISE EXCEPTION 'ERROR: La tabla service_balances está vacía';
    END IF;
    
    RAISE NOTICE 'Registros en working_accounts: %', v_count_working;
    RAISE NOTICE 'Registros en service_balances: %', v_count_service;
    
    -- ================================================================================
    -- BLOQUE 4: CÁLCULO DE TOTALES POR CATEGORÍA (working_accounts)
    -- USANDO VERIFICACIÓN DINÁMICA (no depende de is_leaf)
    -- ================================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE 'Iniciando cálculos de working_accounts (verificación dinámica)...';
    
    -- Calcular total de Activos (código empieza con 1)
    -- Solo suma cuentas que NO tienen hijos más específicos en los datos
    SELECT COALESCE(SUM(wa.value), 0) 
    INTO v_total_activos
    FROM working_accounts wa
    WHERE wa.code LIKE '1%'
      AND NOT EXISTS (
          SELECT 1 FROM working_accounts hijo
          WHERE hijo.code LIKE wa.code || '%'
            AND hijo.code <> wa.code
            AND LENGTH(hijo.code) > LENGTH(wa.code)
      );
    
    RAISE NOTICE '✓ Total Activos calculado: %', TO_CHAR(v_total_activos, 'FM999,999,999');
    
    -- Calcular total de Pasivos (código empieza con 2)
    SELECT COALESCE(SUM(wa.value), 0) 
    INTO v_total_pasivos
    FROM working_accounts wa
    WHERE wa.code LIKE '2%'
      AND NOT EXISTS (
          SELECT 1 FROM working_accounts hijo
          WHERE hijo.code LIKE wa.code || '%'
            AND hijo.code <> wa.code
            AND LENGTH(hijo.code) > LENGTH(wa.code)
      );
    
    RAISE NOTICE '✓ Total Pasivos calculado: %', TO_CHAR(v_total_pasivos, 'FM999,999,999');
    
    -- Calcular total de Patrimonio (código empieza con 3)
    SELECT COALESCE(SUM(wa.value), 0) 
    INTO v_total_patrimonio
    FROM working_accounts wa
    WHERE wa.code LIKE '3%'
      AND NOT EXISTS (
          SELECT 1 FROM working_accounts hijo
          WHERE hijo.code LIKE wa.code || '%'
            AND hijo.code <> wa.code
            AND LENGTH(hijo.code) > LENGTH(wa.code)
      );
    
    RAISE NOTICE '✓ Total Patrimonio calculado: %', TO_CHAR(v_total_patrimonio, 'FM999,999,999');
    
    -- ================================================================================
    -- BLOQUE 5: CÁLCULO DE ACTIVOS POR SERVICIO (service_balances)
    -- USANDO VERIFICACIÓN DINÁMICA POR SERVICIO
    -- ================================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE 'Iniciando cálculos de service_balances (verificación dinámica)...';
    
    -- Calcular activos para Acueducto
    SELECT COALESCE(SUM(sb.value), 0)
    INTO v_activos_acueducto
    FROM service_balances sb
    WHERE sb.service = 'acueducto'
      AND sb.code LIKE '1%'
      AND NOT EXISTS (
          SELECT 1 FROM service_balances hijo
          WHERE hijo.service = 'acueducto'
            AND hijo.code LIKE sb.code || '%'
            AND hijo.code <> sb.code
            AND LENGTH(hijo.code) > LENGTH(sb.code)
      );
          
    RAISE NOTICE '✓ Activos Acueducto calculados: %', TO_CHAR(v_activos_acueducto, 'FM999,999,999');
    
    -- Calcular activos para Alcantarillado
    SELECT COALESCE(SUM(sb.value), 0)
    INTO v_activos_alcantarillado
    FROM service_balances sb
    WHERE sb.service = 'alcantarillado'
      AND sb.code LIKE '1%'
      AND NOT EXISTS (
          SELECT 1 FROM service_balances hijo
          WHERE hijo.service = 'alcantarillado'
            AND hijo.code LIKE sb.code || '%'
            AND hijo.code <> sb.code
            AND LENGTH(hijo.code) > LENGTH(sb.code)
      );
          
    RAISE NOTICE '✓ Activos Alcantarillado calculados: %', TO_CHAR(v_activos_alcantarillado, 'FM999,999,999');
    
    -- Calcular activos para Aseo
    SELECT COALESCE(SUM(sb.value), 0)
    INTO v_activos_aseo
    FROM service_balances sb
    WHERE sb.service = 'aseo'
      AND sb.code LIKE '1%'
      AND NOT EXISTS (
          SELECT 1 FROM service_balances hijo
          WHERE hijo.service = 'aseo'
            AND hijo.code LIKE sb.code || '%'
            AND hijo.code <> sb.code
            AND LENGTH(hijo.code) > LENGTH(sb.code)
      );
          
    RAISE NOTICE '✓ Activos Aseo calculados: %', TO_CHAR(v_activos_aseo, 'FM999,999,999');
    
    -- Calcular total de activos por servicio
    v_total_activos_servicios := v_activos_acueducto + v_activos_alcantarillado + v_activos_aseo;
    
    RAISE NOTICE '✓ Total Activos por Servicios: %', TO_CHAR(v_total_activos_servicios, 'FM999,999,999');
    
    -- ================================================================================
    -- BLOQUE 6: VALIDACIONES CONTABLES
    -- ================================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE 'Iniciando validaciones contables...';
    
    -- VALIDACIÓN 1: TOTAL ACTIVOS VS VALOR ESPERADO
    v_diferencia1 := ABS(v_total_activos - c_valor_esperado_activos);
    v_validacion1_exitosa := v_diferencia1 <= c_tolerancia;
    
    -- VALIDACIÓN 2: ECUACIÓN CONTABLE FUNDAMENTAL
    v_diferencia2 := ABS(v_total_activos - (v_total_pasivos + v_total_patrimonio));
    v_validacion2_exitosa := v_diferencia2 <= c_tolerancia;
    
    -- VALIDACIÓN 3: CONSISTENCIA DE ACTIVOS POR SERVICIO
    v_diferencia3 := ABS(v_total_activos - v_total_activos_servicios);
    v_validacion3_exitosa := v_diferencia3 <= c_tolerancia;
    
    -- ================================================================================
    -- BLOQUE 7: REPORTE FINAL
    -- ================================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'REPORTE DE VALIDACIÓN CONTABLE - %', TO_CHAR(v_fecha_ejecucion, 'YYYY-MM-DD HH24:MI:SS');
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '';
    
    -- Mostrar totales por categoría
    RAISE NOTICE 'TOTALES POR CATEGORÍA CONTABLE:';
    RAISE NOTICE '  Activos:     %', TO_CHAR(v_total_activos, 'FM999,999,999');
    RAISE NOTICE '  Pasivos:     %', TO_CHAR(v_total_pasivos, 'FM999,999,999');
    RAISE NOTICE '  Patrimonio:  %', TO_CHAR(v_total_patrimonio, 'FM999,999,999');
    RAISE NOTICE '  P + Pt:      %', TO_CHAR(v_total_pasivos + v_total_patrimonio, 'FM999,999,999');
    RAISE NOTICE '';
    
    -- Mostrar totales por servicio
    RAISE NOTICE 'TOTALES DE ACTIVOS POR SERVICIO:';
    RAISE NOTICE '  Acueducto:       %', TO_CHAR(v_activos_acueducto, 'FM999,999,999');
    RAISE NOTICE '  Alcantarillado:  %', TO_CHAR(v_activos_alcantarillado, 'FM999,999,999');
    RAISE NOTICE '  Aseo:            %', TO_CHAR(v_activos_aseo, 'FM999,999,999');
    RAISE NOTICE '  TOTAL SERVICIOS: %', TO_CHAR(v_total_activos_servicios, 'FM999,999,999');
    RAISE NOTICE '';
    
    -- Mostrar resultados de validaciones
    RAISE NOTICE 'RESULTADOS DE VALIDACIONES:';
    RAISE NOTICE '';
    RAISE NOTICE '  1. Total Activos vs Esperado (65,921,695):';
    RAISE NOTICE '     Calculado:  %', TO_CHAR(v_total_activos, 'FM999,999,999');
    RAISE NOTICE '     Esperado:   %', TO_CHAR(c_valor_esperado_activos, 'FM999,999,999');
    RAISE NOTICE '     Diferencia: %', TO_CHAR(v_diferencia1, 'FM999,999,999');
    RAISE NOTICE '     Estado:     %', CASE WHEN v_validacion1_exitosa THEN '✓ PASO' ELSE '✗ FALLO' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '  2. Ecuación Contable (Activos = Pasivos + Patrimonio):';
    RAISE NOTICE '     Activos:    %', TO_CHAR(v_total_activos, 'FM999,999,999');
    RAISE NOTICE '     P + Pt:     %', TO_CHAR(v_total_pasivos + v_total_patrimonio, 'FM999,999,999');
    RAISE NOTICE '     Diferencia: %', TO_CHAR(v_diferencia2, 'FM999,999,999');
    RAISE NOTICE '     Estado:     %', CASE WHEN v_validacion2_exitosa THEN '✓ PASO' ELSE '✗ FALLO' END;
    RAISE NOTICE '';
    
    RAISE NOTICE '  3. Consistencia Activos por Servicio:';
    RAISE NOTICE '     Consolidado: %', TO_CHAR(v_total_activos, 'FM999,999,999');
    RAISE NOTICE '     Servicios:   %', TO_CHAR(v_total_activos_servicios, 'FM999,999,999');
    RAISE NOTICE '     Diferencia:  %', TO_CHAR(v_diferencia3, 'FM999,999,999');
    RAISE NOTICE '     Estado:      %', CASE WHEN v_validacion3_exitosa THEN '✓ PASO' ELSE '✗ FALLO' END;
    RAISE NOTICE '';
    
    -- Resumen final
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'RESUMEN FINAL:';
    RAISE NOTICE '  Validaciones exitosas: % de 3', 
        CASE WHEN v_validacion1_exitosa THEN 1 ELSE 0 END + 
        CASE WHEN v_validacion2_exitosa THEN 1 ELSE 0 END + 
        CASE WHEN v_validacion3_exitosa THEN 1 ELSE 0 END;
    
    IF v_validacion1_exitosa AND v_validacion2_exitosa AND v_validacion3_exitosa THEN
        RAISE NOTICE '  Estado: ✅ TODAS LAS VALIDACIONES PASARON';
    ELSE
        RAISE NOTICE '  Estado: ❌ HAY VALIDACIONES QUE FALLARON';
        IF NOT v_validacion1_exitosa THEN
            RAISE NOTICE '    ⚠️  Val.1: Activos no coinciden con esperado (diff: %)', v_diferencia1;
        END IF;
        IF NOT v_validacion2_exitosa THEN
            RAISE NOTICE '    ⚠️  Val.2: Ecuación contable no balancea (diff: %)', v_diferencia2;
        END IF;
        IF NOT v_validacion3_exitosa THEN
            RAISE NOTICE '    ⚠️  Val.3: Servicios no coinciden con consolidado (diff: %)', v_diferencia3;
        END IF;
    END IF;
    RAISE NOTICE '================================================================================';

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION '❌ ERROR CRÍTICO: %', v_error_message;
END $$;

-- ================================================================================
-- CONSULTAS AUXILIARES PARA DIAGNÓSTICO
-- ================================================================================

-- Ver totales por clase (método simple con is_leaf)
SELECT 
    SUBSTRING(code, 1, 1) as clase,
    CASE SUBSTRING(code, 1, 1)
        WHEN '1' THEN 'Activos'
        WHEN '2' THEN 'Pasivos'
        WHEN '3' THEN 'Patrimonio'
        WHEN '4' THEN 'Ingresos'
        WHEN '5' THEN 'Gastos'
        WHEN '6' THEN 'Costos'
        ELSE 'Otros'
    END as nombre_clase,
    COUNT(*) as num_cuentas,
    SUM(value) as total_con_isleaf
FROM working_accounts 
WHERE is_leaf = true
GROUP BY SUBSTRING(code, 1, 1)
ORDER BY clase;

-- Ver totales por servicio y clase
SELECT 
    service,
    SUBSTRING(code, 1, 1) as clase,
    COUNT(*) as num_cuentas,
    SUM(value) as total
FROM service_balances 
WHERE is_leaf = true
GROUP BY service, SUBSTRING(code, 1, 1)
ORDER BY service, clase;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'ERROR calculando activos de alcantarillado: %', v_error_message;
    END;
    
    -- Calcular activos para Aseo (cuentas que empiezan con 1)
    BEGIN
        SELECT COALESCE(SUM(balance), 0)
        INTO v_activos_aseo
        FROM service_balances 
        WHERE service = 'Aseo' 
          AND account_type LIKE '1%' 
          AND balance IS NOT NULL;
          
        RAISE NOTICE '✓ Activos Aseo calculados: %', TO_CHAR(v_activos_aseo, '999,999,999');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'ERROR calculando activos de aseo: %', v_error_message;
    END;
    
    -- Calcular total de activos por servicio
    v_total_activos_servicios := v_activos_acueducto + v_activos_alcantarillado + v_activos_aseo;
    
    RAISE NOTICE '✓ Total Activos por Servicios: %', TO_CHAR(v_total_activos_servicios, '999,999,999');
    
    -- ================================================================================
    -- BLOQUE 6: VALIDACIONES CONTABLES
    -- ================================================================================
    
    RAISE NOTICE 'Iniciando validaciones contables...';
    
    -- VALIDACIÓN 1: TOTAL ACTIVOS VS VALOR ESPERADO
    v_diferencia1 := ABS(v_total_activos - c_valor_esperado_activos);
    v_validacion1_exitosa := v_diferencia1 <= c_tolerancia;
    
    RAISE NOTICE 'Validación 1 - Total Activos vs Esperado:';
    RAISE NOTICE '  Calculado: %', TO_CHAR(v_total_activos, '999,999,999');
    RAISE NOTICE '  Esperado:  %', TO_CHAR(c_valor_esperado_activos, '999,999,999');
    RAISE NOTICE '  Diferencia: %', TO_CHAR(v_diferencia1, '999,999,999');
    RAISE NOTICE '  Estado: %', CASE WHEN v_validacion1_exitosa THEN 'PASO' ELSE 'FALLO' END;
    
    -- VALIDACIÓN 2: ECUACIÓN CONTABLE FUNDAMENTAL
    v_diferencia2 := ABS(v_total_activos - (v_total_pasivos + v_total_patrimonio));
    v_validacion2_exitosa := v_diferencia2 <= c_tolerancia;
    
    RAISE NOTICE 'Validación 2 - Ecuación Contable (Activos = Pasivos + Patrimonio):';
    RAISE NOTICE '  Activos: %', TO_CHAR(v_total_activos, '999,999,999');
    RAISE NOTICE '  Pasivos + Patrimonio: %', TO_CHAR(v_total_pasivos + v_total_patrimonio, '999,999,999');
    RAISE NOTICE '  Diferencia: %', TO_CHAR(v_diferencia2, '999,999,999');
    RAISE NOTICE '  Estado: %', CASE WHEN v_validacion2_exitosa THEN 'PASO' ELSE 'FALLO' END;
    
    -- VALIDACIÓN 3: CONSISTENCIA DE ACTIVOS POR SERVICIO
    v_diferencia3 := ABS(v_total_activos - v_total_activos_servicios);
    v_validacion3_exitosa := v_diferencia3 <= c_tolerancia;
    
    RAISE NOTICE 'Validación 3 - Consistencia Activos por Servicio:';
    RAISE NOTICE '  Total Activos Consolidado: %', TO_CHAR(v_total_activos, '999,999,999');
    RAISE NOTICE '  Total Activos por Servicios: %', TO_CHAR(v_total_activos_servicios, '999,999,999');
    RAISE NOTICE '  Diferencia: %', TO_CHAR(v_diferencia3, '999,999,999');
    RAISE NOTICE '  Estado: %', CASE WHEN v_validacion3_exitosa THEN 'PASO' ELSE 'FALLO' END;
    
    -- ================================================================================
    -- BLOQUE 7: FORMATO DE RESULTADOS
    -- ================================================================================
    
    -- Crear tabla temporal para resultados
    BEGIN
        DROP TABLE IF EXISTS tmp_resultados_validacion;
    EXCEPTION WHEN OTHERS THEN
        -- La tabla no existe, continuar
    END;
    
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
    
    -- ================================================================================
    -- BLOQUE 8: REPORTE FINAL
    -- ================================================================================
    
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
            THEN '✅ TODAS LAS VALIDACIONES PASARON'
            ELSE '❌ HAY VALIDACIONES QUE FALLARON - REVISAR DETALLES'
        END;
    
    -- Mostrar detalles de fallos si existen
    IF NOT v_validacion1_exitosa THEN
        RAISE NOTICE '  ⚠️  Validación 1 falló: Diferencia de % pesos', TO_CHAR(v_diferencia1, '999,999,999');
    END IF;
    
    IF NOT v_validacion2_exitosa THEN
        RAISE NOTICE '  ⚠️  Validación 2 falló: Ecuación contable no balancea por % pesos', TO_CHAR(v_diferencia2, '999,999,999');
    END IF;
    
    IF NOT v_validacion3_exitosa THEN
        RAISE NOTICE '  ⚠️  Validación 3 falló: Inconsistencia de % pesos entre consolidado y servicios', TO_CHAR(v_diferencia3, '999,999,999');
    END IF;
    
    RAISE NOTICE '================================================================================';
    
    -- ================================================================================
    -- BLOQUE 9: CREACIÓN DE OBJETOS PERMANENTES
    -- ================================================================================
    
    -- Crear función para ejecución repetida
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
        -- Ejecutar la validación y retornar resultados
        RETURN QUERY 
        SELECT 
            rv.seccion,
            rv.concepto,
            rv.valor_calculado,
            rv.valor_esperado,
            rv.diferencia,
            rv.estado
        FROM tmp_resultados_validacion rv
        ORDER BY rv.seccion, rv.concepto;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Crear vista para fácil acceso
    CREATE OR REPLACE VIEW vw_resultados_validacion AS
    SELECT * FROM fn_validacion_contable_exhaustiva();
    
    -- ================================================================================
    -- BLOQUE 10: ÍNDICES DE OPTIMIZACIÓN
    -- ================================================================================
    
    -- Crear índices para mejorar rendimiento
    CREATE INDEX IF NOT EXISTS idx_working_accounts_class_balance 
    ON working_accounts(account_class, balance) 
    WHERE balance IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_service_balances_service_type 
    ON service_balances(service, account_type) 
    WHERE balance IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Script de validación contable completado exitosamente';
    RAISE NOTICE '📊 Para ver resultados detallados: SELECT * FROM vw_resultados_validacion;';
    RAISE NOTICE '🔄 Para ejecutar nuevamente: SELECT * FROM fn_validacion_contable_exhaustiva();';
    RAISE NOTICE '📈 Índices de optimización creados para mejorar rendimiento futuro';
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION '❌ ERROR CRÍTICO en validación contable: %', v_error_message;
    ROLLBACK;
END $$;

-- Restaurar configuración normal
SET session_replication_role = DEFAULT;

-- ================================================================================
-- INSTRUCCIONES DE USO
-- ================================================================================

/*
EJECUCIÓN DEL SCRIPT:

1. Ejecución directa (una vez):
   - Copiar y pegar todo el contenido en PostgreSQL

2. Ejecución como función:
   SELECT * FROM fn_validacion_contable_exhaustiva();

3. Consulta de resultados:
   SELECT * FROM vw_resultados_validacion;

4. Ejecución programada (requiere pg_cron):
   SELECT cron.schedule('validacion-contable-diaria', '0 2 * * *', 
       'SELECT * FROM fn_validacion_contable_exhaustiva();');

REQUISITOS:
- PostgreSQL 12 o superior
- Tablas working_accounts y service_balances
- Permisos: SELECT, CREATE FUNCTION, CREATE VIEW

NOTAS:
- Tolerancia configurada a 1,000 pesos
- Valor esperado de activos: 65,921,695
- Manejo automático de valores nulos
- Transacciones con rollback automático en caso de error
*/