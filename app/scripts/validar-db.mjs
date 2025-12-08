/**
 * Script de Validación de Base de Datos
 * Ejecuta consultas de diagnóstico contra Neon PostgreSQL
 * 
 * Uso: node scripts/validar-db.mjs
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

console.log('🔍 VALIDACIÓN DE BASE DE DATOS XBRL GENERATOR');
console.log('='.repeat(60));

async function runValidation() {
  try {
    // 1. Conteo de registros
    console.log('\n📊 1. CONTEO DE REGISTROS');
    console.log('-'.repeat(40));
    const conteo = await sql`
      SELECT 
        (SELECT COUNT(*) FROM working_accounts) as total_working,
        (SELECT COUNT(*) FROM working_accounts WHERE is_leaf = true) as hojas_working,
        (SELECT COUNT(*) FROM service_balances) as total_service,
        (SELECT COUNT(*) FROM service_balances WHERE is_leaf = true) as hojas_service
    `;
    console.log(`  Working Accounts: ${conteo[0].total_working} (hojas: ${conteo[0].hojas_working})`);
    console.log(`  Service Balances: ${conteo[0].total_service} (hojas: ${conteo[0].hojas_service})`);

    // 2. Totales consolidados por clase
    console.log('\n📊 2. TOTALES CONSOLIDADOS POR CLASE (is_leaf=true)');
    console.log('-'.repeat(40));
    const totalesClase = await sql`
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
        END as nombre,
        COUNT(*) as num_cuentas,
        SUM(value) as total
      FROM working_accounts 
      WHERE is_leaf = true
      GROUP BY SUBSTRING(code, 1, 1)
      ORDER BY clase
    `;
    for (const row of totalesClase) {
      console.log(`  ${row.clase} - ${row.nombre.padEnd(12)}: ${Number(row.total).toLocaleString('es-CO')} (${row.num_cuentas} cuentas)`);
    }

    // 3. Totales por servicio
    console.log('\n📊 3. TOTALES POR SERVICIO (is_leaf=true)');
    console.log('-'.repeat(40));
    const totalesServicio = await sql`
      SELECT 
        service,
        SUBSTRING(code, 1, 1) as clase,
        CASE SUBSTRING(code, 1, 1)
          WHEN '1' THEN 'Activos'
          WHEN '2' THEN 'Pasivos'
          WHEN '3' THEN 'Patrimonio'
        END as nombre,
        SUM(value) as total
      FROM service_balances 
      WHERE is_leaf = true AND SUBSTRING(code, 1, 1) IN ('1', '2', '3')
      GROUP BY service, SUBSTRING(code, 1, 1)
      ORDER BY service, clase
    `;
    let currentService = '';
    for (const row of totalesServicio) {
      if (row.service !== currentService) {
        console.log(`\n  📁 ${row.service.toUpperCase()}`);
        currentService = row.service;
      }
      console.log(`     ${row.clase} - ${row.nombre.padEnd(12)}: ${Number(row.total).toLocaleString('es-CO')}`);
    }

    // 4. Verificación ecuación contable
    console.log('\n\n📊 4. VERIFICACIÓN ECUACIÓN CONTABLE');
    console.log('-'.repeat(40));
    const ecuacion = await sql`
      SELECT 
        (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos,
        (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '2%') as pasivos,
        (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '3%') as patrimonio
    `;
    const activos = Number(ecuacion[0].activos);
    const pasivos = Number(ecuacion[0].pasivos);
    const patrimonio = Number(ecuacion[0].patrimonio);
    const pasivos_mas_patrimonio = pasivos + patrimonio;
    
    console.log(`  Activos (A):              ${activos.toLocaleString('es-CO')}`);
    console.log(`  Pasivos (P):              ${pasivos.toLocaleString('es-CO')}`);
    console.log(`  Patrimonio (Pt):          ${patrimonio.toLocaleString('es-CO')}`);
    console.log(`  P + Pt:                   ${pasivos_mas_patrimonio.toLocaleString('es-CO')}`);
    console.log(`  Diferencia (A - P - Pt):  ${(activos - pasivos_mas_patrimonio).toLocaleString('es-CO')}`);
    
    if (activos === pasivos_mas_patrimonio) {
      console.log('\n  ✅ ECUACIÓN CONTABLE CUMPLE: A = P + Pt');
    } else {
      console.log('\n  ❌ ECUACIÓN CONTABLE NO CUMPLE');
    }

    // 5. Verificación contra valor esperado
    console.log('\n📊 5. VERIFICACIÓN VS VALOR ESPERADO');
    console.log('-'.repeat(40));
    const VALOR_ESPERADO = 65921695;
    const diferencia = activos - VALOR_ESPERADO;
    
    console.log(`  Valor esperado:  ${VALOR_ESPERADO.toLocaleString('es-CO')}`);
    console.log(`  Valor calculado: ${activos.toLocaleString('es-CO')}`);
    console.log(`  Diferencia:      ${diferencia.toLocaleString('es-CO')}`);
    
    if (Math.abs(diferencia) <= 1) {
      console.log('\n  ✅ ACTIVOS COINCIDEN CON VALOR ESPERADO');
    } else {
      console.log('\n  ❌ ACTIVOS NO COINCIDEN CON VALOR ESPERADO');
    }

    // 6. Consistencia servicios vs consolidado
    console.log('\n📊 6. CONSISTENCIA SERVICIOS VS CONSOLIDADO');
    console.log('-'.repeat(40));
    const consistencia = await sql`
      SELECT 
        (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos_consolidado,
        (SELECT COALESCE(SUM(value), 0) FROM service_balances WHERE is_leaf = true AND code LIKE '1%') as activos_servicios
    `;
    const consolidado = Number(consistencia[0].activos_consolidado);
    const servicios = Number(consistencia[0].activos_servicios);
    
    console.log(`  Activos consolidado: ${consolidado.toLocaleString('es-CO')}`);
    console.log(`  Activos servicios:   ${servicios.toLocaleString('es-CO')}`);
    console.log(`  Diferencia:          ${(consolidado - servicios).toLocaleString('es-CO')}`);
    
    if (consolidado === servicios) {
      console.log('\n  ✅ SERVICIOS COINCIDEN CON CONSOLIDADO');
    } else {
      console.log('\n  ❌ SERVICIOS NO COINCIDEN CON CONSOLIDADO');
    }

    // 7. Cuentas con isLeaf potencialmente incorrecto
    console.log('\n📊 7. CUENTAS CON isLeaf POTENCIALMENTE INCORRECTO');
    console.log('-'.repeat(40));
    const isLeafIncorrecto = await sql`
      SELECT 
        wa.code,
        wa.name,
        wa.value,
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
      ORDER BY wa.code
      LIMIT 10
    `;
    
    if (isLeafIncorrecto.length === 0) {
      console.log('  ✅ No hay cuentas con isLeaf incorrecto');
    } else {
      console.log(`  ⚠️  Encontradas ${isLeafIncorrecto.length} cuentas con isLeaf=true pero tienen hijos:`);
      for (const row of isLeafIncorrecto) {
        console.log(`     ${row.code} - ${row.name.substring(0, 30)} (${row.num_hijos} hijos)`);
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE VALIDACIÓN');
    console.log('='.repeat(60));
    
    const ecuacionOk = activos === pasivos_mas_patrimonio;
    const valorOk = Math.abs(activos - VALOR_ESPERADO) <= 1;
    const consistenciaOk = consolidado === servicios;
    
    console.log(`  Ecuación contable (A = P + Pt):     ${ecuacionOk ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
    console.log(`  Activos = 65,921,695:               ${valorOk ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
    console.log(`  Servicios = Consolidado:            ${consistenciaOk ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
    
    if (ecuacionOk && valorOk && consistenciaOk) {
      console.log('\n🎉 TODAS LAS VALIDACIONES PASARON');
    } else {
      console.log('\n⚠️  HAY VALIDACIONES QUE NO PASAN');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

runValidation();
