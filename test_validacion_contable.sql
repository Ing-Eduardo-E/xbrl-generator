-- ================================================================================
-- SCRIPT DE PRUEBA PARA VALIDACIÓN CONTABLE EXHAUSTIVA
-- Sistema XBRL Generator - Datos de Prueba
-- 
-- ESTRUCTURA REAL DE TABLAS:
--   working_accounts: code, name, value, is_leaf, level, class
--   service_balances: service, code, name, value, is_leaf, level, class
--   (service: 'acueducto', 'alcantarillado', 'aseo' en minúsculas)
--
-- Descripción: Crea datos de prueba para validar el funcionamiento del script
--              de validación contable exhaustiva
-- ================================================================================

-- Limpiar datos existentes de prueba
TRUNCATE TABLE working_accounts RESTART IDENTITY CASCADE;
TRUNCATE TABLE service_balances RESTART IDENTITY CASCADE;

-- ================================================================================
-- DATOS DE PRUEBA PARA working_accounts
-- Usando campos reales: code, name, value, is_leaf, level, class
-- ================================================================================

-- Insertar datos de Activos (clase 1) - Total esperado: 65,921,695
INSERT INTO working_accounts (code, name, value, is_leaf, level, class) VALUES
('1105', 'Caja', 1500000, true, 2, '1'),
('1110', 'Bancos', 8500000, true, 2, '1'),
('1305', 'Cuentas por cobrar', 12000000, true, 2, '1'),
('1310', 'Deudores comerciales', 8000000, true, 2, '1'),
('1405', 'Inventarios', 15000000, true, 2, '1'),
('1495', 'Inventarios en tránsito', 2000000, true, 2, '1'),
('1504', 'Propiedades planta y equipo', 18000000, true, 2, '1'),
('1592', 'Depreciación acumulada', -2000000, true, 2, '1'),
('1705', 'Activos por impuestos', 1500000, true, 2, '1'),
('1905', 'Otros activos', 1421695, true, 2, '1');

-- Insertar datos de Pasivos (clase 2) - Total: 45,000,000
INSERT INTO working_accounts (code, name, value, is_leaf, level, class) VALUES
('2105', 'Obligaciones financieras', 12000000, true, 2, '2'),
('2205', 'Proveedores', 15000000, true, 2, '2'),
('2335', 'Gastos acumulados', 3000000, true, 2, '2'),
('2365', 'Impuestos por pagar', 2000000, true, 2, '2'),
('2408', 'Pasivos por impuestos', 3000000, true, 2, '2'),
('2705', 'Ingresos diferidos', 5000000, true, 2, '2'),
('2805', 'Otros pasivos', 5000000, true, 2, '2');

-- Insertar datos de Patrimonio (clase 3) - Total: 20,921,695
INSERT INTO working_accounts (code, name, value, is_leaf, level, class) VALUES
('3105', 'Capital social', 10000000, true, 2, '3'),
('3205', 'Prima de emisión', 2000000, true, 2, '3'),
('3305', 'Reservas', 3000000, true, 2, '3'),
('3605', 'Utilidades acumuladas', 5000000, true, 2, '3'),
('3705', 'Utilidad del ejercicio', 921695, true, 2, '3');

-- ================================================================================
-- DATOS DE PRUEBA PARA service_balances
-- Usando campos reales: service, code, name, value, is_leaf, level, class
-- service en MINÚSCULAS: 'acueducto', 'alcantarillado', 'aseo'
-- ================================================================================

-- Distribución: Acueducto 40%, Alcantarillado 35%, Aseo 25%
-- Total activos: 65,921,695
-- Acueducto: 26,368,678 (40%)
-- Alcantarillado: 23,072,593 (35%)
-- Aseo: 16,480,424 (25%)

-- Insertar datos para ACUEDUCTO (40% de distribución = 26,368,678)
INSERT INTO service_balances (service, code, name, value, is_leaf, level, class) VALUES
-- Activos Acueducto
('acueducto', '1105', 'Caja', 600000, true, 2, '1'),
('acueducto', '1110', 'Bancos', 3400000, true, 2, '1'),
('acueducto', '1305', 'Cuentas por cobrar', 4800000, true, 2, '1'),
('acueducto', '1310', 'Deudores comerciales', 3200000, true, 2, '1'),
('acueducto', '1405', 'Inventarios', 6000000, true, 2, '1'),
('acueducto', '1495', 'Inventarios en tránsito', 800000, true, 2, '1'),
('acueducto', '1504', 'Propiedades planta y equipo', 7200000, true, 2, '1'),
('acueducto', '1592', 'Depreciación acumulada', -800000, true, 2, '1'),
('acueducto', '1705', 'Activos por impuestos', 600000, true, 2, '1'),
('acueducto', '1905', 'Otros activos', 568678, true, 2, '1'),
-- Pasivos Acueducto
('acueducto', '2105', 'Obligaciones financieras', 4800000, true, 2, '2'),
('acueducto', '2205', 'Proveedores', 6000000, true, 2, '2'),
('acueducto', '2335', 'Gastos acumulados', 1200000, true, 2, '2'),
('acueducto', '2365', 'Impuestos por pagar', 800000, true, 2, '2'),
('acueducto', '2408', 'Pasivos por impuestos', 1200000, true, 2, '2'),
('acueducto', '2705', 'Ingresos diferidos', 2000000, true, 2, '2'),
('acueducto', '2805', 'Otros pasivos', 2000000, true, 2, '2'),
-- Patrimonio Acueducto
('acueducto', '3105', 'Capital social', 4000000, true, 2, '3'),
('acueducto', '3205', 'Prima de emisión', 800000, true, 2, '3'),
('acueducto', '3305', 'Reservas', 1200000, true, 2, '3'),
('acueducto', '3605', 'Utilidades acumuladas', 2000000, true, 2, '3'),
('acueducto', '3705', 'Utilidad del ejercicio', 368678, true, 2, '3');

-- Insertar datos para ALCANTARILLADO (35% de distribución = 23,072,593)
INSERT INTO service_balances (service, code, name, value, is_leaf, level, class) VALUES
-- Activos Alcantarillado
('alcantarillado', '1105', 'Caja', 525000, true, 2, '1'),
('alcantarillado', '1110', 'Bancos', 2975000, true, 2, '1'),
('alcantarillado', '1305', 'Cuentas por cobrar', 4200000, true, 2, '1'),
('alcantarillado', '1310', 'Deudores comerciales', 2800000, true, 2, '1'),
('alcantarillado', '1405', 'Inventarios', 5250000, true, 2, '1'),
('alcantarillado', '1495', 'Inventarios en tránsito', 700000, true, 2, '1'),
('alcantarillado', '1504', 'Propiedades planta y equipo', 6300000, true, 2, '1'),
('alcantarillado', '1592', 'Depreciación acumulada', -700000, true, 2, '1'),
('alcantarillado', '1705', 'Activos por impuestos', 525000, true, 2, '1'),
('alcantarillado', '1905', 'Otros activos', 497593, true, 2, '1'),
-- Pasivos Alcantarillado
('alcantarillado', '2105', 'Obligaciones financieras', 4200000, true, 2, '2'),
('alcantarillado', '2205', 'Proveedores', 5250000, true, 2, '2'),
('alcantarillado', '2335', 'Gastos acumulados', 1050000, true, 2, '2'),
('alcantarillado', '2365', 'Impuestos por pagar', 700000, true, 2, '2'),
('alcantarillado', '2408', 'Pasivos por impuestos', 1050000, true, 2, '2'),
('alcantarillado', '2705', 'Ingresos diferidos', 1750000, true, 2, '2'),
('alcantarillado', '2805', 'Otros pasivos', 1750000, true, 2, '2'),
-- Patrimonio Alcantarillado
('alcantarillado', '3105', 'Capital social', 3500000, true, 2, '3'),
('alcantarillado', '3205', 'Prima de emisión', 700000, true, 2, '3'),
('alcantarillado', '3305', 'Reservas', 1050000, true, 2, '3'),
('alcantarillado', '3605', 'Utilidades acumuladas', 1750000, true, 2, '3'),
('alcantarillado', '3705', 'Utilidad del ejercicio', 322593, true, 2, '3');

-- Insertar datos para ASEO (25% de distribución = 16,480,424)
INSERT INTO service_balances (service, code, name, value, is_leaf, level, class) VALUES
-- Activos Aseo
('aseo', '1105', 'Caja', 375000, true, 2, '1'),
('aseo', '1110', 'Bancos', 2125000, true, 2, '1'),
('aseo', '1305', 'Cuentas por cobrar', 3000000, true, 2, '1'),
('aseo', '1310', 'Deudores comerciales', 2000000, true, 2, '1'),
('aseo', '1405', 'Inventarios', 3750000, true, 2, '1'),
('aseo', '1495', 'Inventarios en tránsito', 500000, true, 2, '1'),
('aseo', '1504', 'Propiedades planta y equipo', 4500000, true, 2, '1'),
('aseo', '1592', 'Depreciación acumulada', -500000, true, 2, '1'),
('aseo', '1705', 'Activos por impuestos', 375000, true, 2, '1'),
('aseo', '1905', 'Otros activos', 355424, true, 2, '1'),
-- Pasivos Aseo
('aseo', '2105', 'Obligaciones financieras', 3000000, true, 2, '2'),
('aseo', '2205', 'Proveedores', 3750000, true, 2, '2'),
('aseo', '2335', 'Gastos acumulados', 750000, true, 2, '2'),
('aseo', '2365', 'Impuestos por pagar', 500000, true, 2, '2'),
('aseo', '2408', 'Pasivos por impuestos', 750000, true, 2, '2'),
('aseo', '2705', 'Ingresos diferidos', 1250000, true, 2, '2'),
('aseo', '2805', 'Otros pasivos', 1250000, true, 2, '2'),
-- Patrimonio Aseo
('aseo', '3105', 'Capital social', 2500000, true, 2, '3'),
('aseo', '3205', 'Prima de emisión', 500000, true, 2, '3'),
('aseo', '3305', 'Reservas', 750000, true, 2, '3'),
('aseo', '3605', 'Utilidades acumuladas', 1250000, true, 2, '3'),
('aseo', '3705', 'Utilidad del ejercicio', 230424, true, 2, '3');

-- ================================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ================================================================================

-- Verificar totales de working_accounts
SELECT 'WORKING_ACCOUNTS' as tabla,
       SUBSTRING(code, 1, 1) as clase,
       CASE SUBSTRING(code, 1, 1)
           WHEN '1' THEN 'Activos'
           WHEN '2' THEN 'Pasivos'
           WHEN '3' THEN 'Patrimonio'
       END as nombre,
       COUNT(*) as num_cuentas,
       SUM(value) as total
FROM working_accounts
WHERE is_leaf = true
GROUP BY SUBSTRING(code, 1, 1)
ORDER BY clase;

-- Verificar totales de service_balances
SELECT 'SERVICE_BALANCES' as tabla,
       service,
       SUBSTRING(code, 1, 1) as clase,
       COUNT(*) as num_cuentas,
       SUM(value) as total
FROM service_balances
WHERE is_leaf = true
GROUP BY service, SUBSTRING(code, 1, 1)
ORDER BY service, clase;

-- Resumen final
SELECT 
    'Verificación completada' as mensaje,
    (SELECT COUNT(*) FROM working_accounts) as total_working,
    (SELECT COUNT(*) FROM service_balances) as total_service,
    (SELECT SUM(value) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos_consolidado,
    (SELECT SUM(value) FROM service_balances WHERE is_leaf = true AND code LIKE '1%') as activos_servicios;
('Alcantarillado', '1705', 'Activos por impuestos', 300000, true, 2, '1', '1705'),
('Alcantarillado', '1905', 'Otros activos', 84339, true, 2, '1', '1905'),

-- Pasivos Alcantarillado
('Alcantarillado', '2105', 'Obligaciones financieras', 2400000, true, 2, '2', '2105'),
('Alcantarillado', '2205', 'Proveedores', 3000000, true, 2, '2', '2205'),
('Alcantarillado', '2335', 'Gastos acumulados', 600000, true, 2, '2', '2335'),
('Alcantarillado', '2365', 'Impuestos por pagar', 400000, true, 2, '2', '2365'),
('Alcantarillado', '2408', 'Pasivos por impuestos', 600000, true, 2, '2', '2408'),
('Alcantarillado', '2705', 'Ingresos diferidos', 1000000, true, 2, '2', '2705'),
('Alcantarillado', '2805', 'Otros pasivos', 1000000, true, 2, '2', '2805'),

-- Patrimonio Alcantarillado
('Alcantarillado', '3105', 'Capital social', 2000000, true, 2, '3', '3105'),
('Alcantarillado', '3205', 'Prima de emisión', 400000, true, 2, '3', '3205'),
('Alcantarillado', '3305', 'Reservas', 600000, true, 2, '3', '3305'),
('Alcantarillado', '3605', 'Utilidades acumuladas', 1000000, true, 2, '3', '3605'),
('Alcantarillado', '3705', 'Utilidad del ejercicio', 184339, true, 2, '3', '3705');

-- Insertar datos para Aseo (40% de distribución)
INSERT INTO service_balances (service, code, name, value, is_leaf, level, class, account_type) VALUES
-- Activos Aseo
('Aseo', '1105', 'Caja', 600000, true, 2, '1', '1105'),
('Aseo', '1110', 'Bancos', 3400000, true, 2, '1', '1110'),
('Aseo', '1305', 'Cuentas por cobrar', 4800000, true, 2, '1', '1305'),
('Aseo', '1310', 'Deudores comerciales', 3200000, true, 2, '1', '1310'),
('Aseo', '1405', 'Inventarios', 6000000, true, 2, '1', '1405'),
('Aseo', '1504', 'Propiedades planta y equipo', 7200000, true, 2, '1', '1504'),
('Aseo', '1592', 'Depreciación acumulada', -800000, true, 2, '1', '1592'),
('Aseo', '1705', 'Activos por impuestos', 600000, true, 2, '1', '1705'),
('Aseo', '1905', 'Otros activos', 168678, true, 2, '1', '1905'),

-- Pasivos Aseo
('Aseo', '2105', 'Obligaciones financieras', 4800000, true, 2, '2', '2105'),
('Aseo', '2205', 'Proveedores', 6000000, true, 2, '2', '2205'),
('Aseo', '2335', 'Gastos acumulados', 1200000, true, 2, '2', '2335'),
('Aseo', '2365', 'Impuestos por pagar', 800000, true, 2, '2', '2365'),
('Aseo', '2408', 'Pasivos por impuestos', 1200000, true, 2, '2', '2408'),
('Aseo', '2705', 'Ingresos diferidos', 2000000, true, 2, '2', '2705'),
('Aseo', '2805', 'Otros pasivos', 2000000, true, 2, '2', '2805'),

-- Patrimonio Aseo
('Aseo', '3105', 'Capital social', 4000000, true, 2, '3', '3105'),
('Aseo', '3205', 'Prima de emisión', 800000, true, 2, '3', '3205'),
('Aseo', '3305', 'Reservas', 1200000, true, 2, '3', '3305'),
('Aseo', '3605', 'Utilidades acumuladas', 2000000, true, 2, '3', '3605'),
('Aseo', '3705', 'Utilidad del ejercicio', 368678, true, 2, '3', '3705');

-- ================================================================================
-- VERIFICACIÓN DE DATOS DE PRUEBA
-- ================================================================================

-- Verificar totales en working_accounts
SELECT 
    'WORKING_ACCOUNTS' as tabla,
    class as clase,
    SUM(value) as total,
    CASE 
        WHEN class = '1' THEN 65921695  -- Valor esperado para activos
        WHEN class = '2' THEN 45000000  -- Valor esperado para pasivos
        WHEN class = '3' THEN 20921695  -- Valor esperado para patrimonio
        ELSE 0
    END as valor_esperado
FROM working_accounts 
GROUP BY class
ORDER BY class;

-- Verificar totales por servicio
SELECT 
    'SERVICE_BALANCES' as tabla,
    service,
    SUM(CASE WHEN account_type LIKE '1%' THEN value ELSE 0 END) as activos,
    SUM(CASE WHEN account_type LIKE '2%' THEN value ELSE 0 END) as pasivos,
    SUM(CASE WHEN account_type LIKE '3%' THEN value ELSE 0 END) as patrimonio
FROM service_balances 
GROUP BY service
ORDER BY service;

-- Verificar consistencia total
SELECT 
    'CONSISTENCIA TOTAL' as concepto,
    SUM(CASE WHEN class = '1' THEN value ELSE 0 END) as total_activos_wa,
    SUM(CASE WHEN class = '2' THEN value ELSE 0 END) as total_pasivos_wa,
    SUM(CASE WHEN class = '3' THEN value ELSE 0 END) as total_patrimonio_wa,
    SUM(CASE WHEN account_type LIKE '1%' THEN value ELSE 0 END) as total_activos_sb,
    SUM(CASE WHEN account_type LIKE '2%' THEN value ELSE 0 END) as total_pasivos_sb,
    SUM(CASE WHEN account_type LIKE '3%' THEN value ELSE 0 END) as total_patrimonio_sb
FROM working_accounts wa
FULL OUTER JOIN service_balances sb ON 1=1;

RAISE NOTICE '';
RAISE NOTICE '✅ Datos de prueba creados exitosamente';
RAISE NOTICE '📊 Totales working_accounts:';
RAISE NOTICE '   Activos: 65,921,695 (esperado)';
RAISE NOTICE '   Pasivos: 45,000,000';
RAISE NOTICE '   Patrimonio: 20,921,695';
RAISE NOTICE '';
RAISE NOTICE '📊 Distribución por servicio:';
RAISE NOTICE '   Acueducto: 40% (26,368,678)';
RAISE NOTICE '   Alcantarillado: 20% (13,184,339)';
RAISE NOTICE '   Aseo: 40% (26,368,678)';
RAISE NOTICE '';
RAISE NOTICE '🔄 Ahora ejecute el script de validación: validacion_contable_exhaustiva.sql';