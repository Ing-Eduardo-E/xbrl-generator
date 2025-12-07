-- ================================================================================
-- SCRIPT DE VALIDACIÓN SINTÁCTICA Y CONSULTAS DE DIAGNÓSTICO
-- Sistema XBRL Generator - Verificación de Estructura Real
-- 
-- ESTRUCTURA REAL DE TABLAS:
--   working_accounts: code, name, value, is_leaf, level, class
--   service_balances: service, code, name, value, is_leaf, level, class
--   (service: 'acueducto', 'alcantarillado', 'aseo' en minúsculas)
-- ================================================================================

-- ================================================================================
-- CONSULTA 1: TOTALES CONSOLIDADOS POR CLASE (usando is_leaf)
-- ================================================================================
SELECT 
    '1. TOTALES CONSOLIDADOS (is_leaf=true)' as consulta,
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
    SUM(value) as total
FROM working_accounts 
WHERE is_leaf = true
GROUP BY SUBSTRING(code, 1, 1)
ORDER BY clase;

-- ================================================================================
-- CONSULTA 2: TOTALES POR SERVICIO Y CLASE
-- ================================================================================
SELECT 
    '2. TOTALES POR SERVICIO (is_leaf=true)' as consulta,
    service,
    SUBSTRING(code, 1, 1) as clase,
    CASE SUBSTRING(code, 1, 1)
        WHEN '1' THEN 'Activos'
        WHEN '2' THEN 'Pasivos'
        WHEN '3' THEN 'Patrimonio'
    END as nombre_clase,
    COUNT(*) as num_cuentas,
    SUM(value) as total
FROM service_balances 
WHERE is_leaf = true
GROUP BY service, SUBSTRING(code, 1, 1)
ORDER BY service, clase;

-- ================================================================================
-- CONSULTA 3: CONTEO DE REGISTROS
-- ================================================================================
SELECT 
    '3. CONTEO DE REGISTROS' as consulta,
    (SELECT COUNT(*) FROM working_accounts) as total_working_accounts,
    (SELECT COUNT(*) FROM working_accounts WHERE is_leaf = true) as hojas_working,
    (SELECT COUNT(*) FROM service_balances) as total_service_balances,
    (SELECT COUNT(*) FROM service_balances WHERE is_leaf = true) as hojas_service;

-- ================================================================================
-- CONSULTA 4: VERIFICACIÓN DE ECUACIÓN CONTABLE
-- ================================================================================
SELECT 
    '4. VERIFICACIÓN ECUACIÓN CONTABLE' as consulta,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '2%') as pasivos,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '3%') as patrimonio,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '2%') +
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '3%') as pasivos_mas_patrimonio,
    CASE 
        WHEN (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') =
             (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '2%') +
             (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '3%')
        THEN '✓ CUMPLE'
        ELSE '✗ NO CUMPLE'
    END as ecuacion_a_igual_p_mas_pt;

-- ================================================================================
-- CONSULTA 5: ACTIVOS POR SERVICIO (resumen)
-- ================================================================================
SELECT 
    '5. ACTIVOS POR SERVICIO' as consulta,
    service,
    SUM(value) as activos_servicio
FROM service_balances 
WHERE is_leaf = true AND code LIKE '1%'
GROUP BY service
ORDER BY service;

-- ================================================================================
-- CONSULTA 6: CONSISTENCIA SERVICIOS VS CONSOLIDADO
-- ================================================================================
SELECT 
    '6. CONSISTENCIA SERVICIOS VS CONSOLIDADO' as consulta,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos_consolidado,
    (SELECT COALESCE(SUM(value), 0) FROM service_balances WHERE is_leaf = true AND code LIKE '1%') as activos_servicios,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') -
    (SELECT COALESCE(SUM(value), 0) FROM service_balances WHERE is_leaf = true AND code LIKE '1%') as diferencia,
    CASE 
        WHEN (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') =
             (SELECT COALESCE(SUM(value), 0) FROM service_balances WHERE is_leaf = true AND code LIKE '1%')
        THEN '✓ COINCIDEN'
        ELSE '✗ NO COINCIDEN'
    END as estado;

-- ================================================================================
-- CONSULTA 7: VERIFICACIÓN CONTRA VALOR ESPERADO (65,921,695)
-- ================================================================================
SELECT 
    '7. VERIFICACIÓN VS ESPERADO' as consulta,
    65921695 as valor_esperado,
    (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as valor_calculado,
    65921695 - (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as diferencia,
    CASE 
        WHEN ABS(65921695 - (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%')) <= 1000
        THEN '✓ COINCIDE (tolerancia 1000)'
        ELSE '✗ NO COINCIDE'
    END as estado;

-- ================================================================================
-- CONSULTA 8: CUENTAS CON isLeaf POTENCIALMENTE INCORRECTO
-- (cuentas marcadas como hoja pero que tienen "hijos" en los datos)
-- ================================================================================
SELECT 
    '8. CUENTAS CON isLeaf POTENCIALMENTE INCORRECTO' as consulta,
    wa.code,
    wa.name,
    wa.value,
    wa.is_leaf,
    (SELECT COUNT(*) FROM working_accounts hijo 
     WHERE hijo.code LIKE wa.code || '%' 
       AND hijo.code <> wa.code 
       AND LENGTH(hijo.code) > LENGTH(wa.code)) as num_hijos
FROM working_accounts wa
WHERE wa.is_leaf = true
  AND EXISTS (
      SELECT 1 FROM working_accounts hijo 
      WHERE hijo.code LIKE wa.code || '%' 
        AND hijo.code <> wa.code 
        AND LENGTH(hijo.code) > LENGTH(wa.code)
  )
ORDER BY wa.code;

-- ================================================================================
-- CONSULTA 9: ESTRUCTURA DE CUENTAS (muestra jerarquía)
-- ================================================================================
SELECT 
    '9. ESTRUCTURA DE CUENTAS (primeras 30)' as consulta,
    code,
    name,
    value,
    is_leaf,
    level,
    class,
    LENGTH(code) as longitud_codigo
FROM working_accounts
ORDER BY code
LIMIT 30;
