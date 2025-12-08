/**
 * Script de Diagnóstico IFE - Compara mapeos esperados vs datos reales
 * 
 * Uso: node scripts/diagnostico-ife.mjs
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

// Mapeos IFE actuales (PUC Colombiano estándar) - PROBLEMÁTICOS
const IFE_MAPPINGS_ACTUAL = [
  { row: 15, prefixes: ['11'], excludes: ['1195'], name: 'Efectivo y equivalentes' },
  { row: 16, prefixes: ['1195'], excludes: [], name: 'Efectivo restringido' },
  { row: 19, prefixes: ['1305'], excludes: [], name: 'CxC servicios públicos' },
  { row: 24, prefixes: ['1310'], excludes: [], name: 'CxC venta bienes' },
  { row: 25, prefixes: ['13'], excludes: ['1305', '1310', '1399'], name: 'Otras CxC' },
  { row: 27, prefixes: ['14'], excludes: [], name: 'Inventarios' },
  { row: 28, prefixes: ['12'], excludes: [], name: 'Inversiones' },
  { row: 30, prefixes: ['18'], excludes: [], name: 'Otros activos financieros' },
  { row: 31, prefixes: ['17'], excludes: [], name: 'Otros activos no financieros' },
  { row: 34, prefixes: ['15'], excludes: [], name: 'PPE' },
  { row: 36, prefixes: ['16'], excludes: [], name: 'Intangibles' },
  { row: 49, prefixes: ['19'], excludes: [], name: 'Valorizaciones' },
];

// Mapeos R414 (PUC Resolución 414 CGN) - FUNCIONA CORRECTAMENTE
const R414_MAPPINGS = [
  { row: 15, prefixes: ['11'], excludes: ['1132'], name: 'Efectivo y equivalentes' },
  { row: 16, prefixes: ['1132'], excludes: [], name: 'Efectivo restringido' },
  { row: 19, prefixes: ['131801', '131802', '131803', '131804', '131805', '131806'], excludes: [], name: 'CxC servicios públicos' },
  { row: 20, prefixes: ['131807', '131808', '131809', '131810', '131811', '131812'], excludes: [], name: 'CxC subsidios' },
  { row: 26, prefixes: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'], excludes: ['138401', '138414', '138424'], name: 'Otras CxC' },
  { row: 27, prefixes: ['1386', '1388'], excludes: [], name: 'Deterioro CxC' },
  { row: 28, prefixes: ['15'], excludes: ['1580'], name: 'Inventarios' },
  { row: 30, prefixes: ['12'], excludes: ['1280'], name: 'Otros activos financieros' },
  { row: 31, prefixes: ['19'], excludes: [], name: 'Otros activos no financieros' },
  { row: 34, prefixes: ['16'], excludes: [], name: 'PPE' },
];

console.log('🔍 DIAGNÓSTICO IFE - Comparación de Mapeos PUC vs Datos Reales');
console.log('='.repeat(70));

async function diagnose() {
  try {
    // 1. Ver estructura real de códigos en la BD
    console.log('\n📊 1. PREFIJOS DE ACTIVOS REALES EN service_balances (is_leaf=true)');
    console.log('-'.repeat(70));
    
    const prefixes = await sql`
      SELECT 
        LEFT(code, 2) as prefix2,
        LEFT(code, 4) as prefix4,
        COUNT(*) as count,
        SUM(value) as total
      FROM service_balances
      WHERE is_leaf = true AND code LIKE '1%'
      GROUP BY LEFT(code, 2), LEFT(code, 4)
      ORDER BY prefix2, prefix4
    `;
    
    console.log('Prefix2 | Prefix4 | Count | Total');
    console.log('-'.repeat(70));
    for (const p of prefixes) {
      console.log(`${p.prefix2.padEnd(8)}| ${p.prefix4.padEnd(8)}| ${String(p.count).padEnd(6)}| ${Number(p.total).toLocaleString('es-CO')}`);
    }

    // 2. Verificar qué mapeos IFE encuentran datos
    console.log('\n📊 2. MAPEOS IFE ACTUALES vs DATOS REALES');
    console.log('-'.repeat(70));
    console.log('Fila | Concepto                      | Prefijos           | Valor');
    console.log('-'.repeat(70));

    let totalIFE = 0;
    for (const mapping of IFE_MAPPINGS_ACTUAL) {
      const prefixConditions = mapping.prefixes.map(p => `code LIKE '${p}%'`).join(' OR ');
      const excludeConditions = mapping.excludes.length > 0 
        ? ' AND NOT (' + mapping.excludes.map(p => `code LIKE '${p}%'`).join(' OR ') + ')'
        : '';
      
      const result = await sql.unsafe(`
        SELECT COALESCE(SUM(value), 0) as total
        FROM service_balances
        WHERE is_leaf = true AND (${prefixConditions})${excludeConditions}
      `);
      const value = Number(result[0].total);
      totalIFE += value;
      
      const status = value > 0 ? '✅' : '⚠️ ';
      console.log(`${String(mapping.row).padEnd(5)}| ${mapping.name.padEnd(30)}| ${mapping.prefixes.join(',').substring(0,18).padEnd(19)}| ${status} ${value.toLocaleString('es-CO')}`);
    }
    console.log('-'.repeat(70));
    console.log(`TOTAL ACTIVOS IFE (mapeo actual): ${totalIFE.toLocaleString('es-CO')}`);

    // 3. Verificar qué mapeos R414 encuentran datos
    console.log('\n📊 3. MAPEOS R414 vs DATOS REALES (referencia)');
    console.log('-'.repeat(70));

    let totalR414 = 0;
    for (const mapping of R414_MAPPINGS) {
      const prefixConditions = mapping.prefixes.map(p => `code LIKE '${p}%'`).join(' OR ');
      const excludeConditions = mapping.excludes.length > 0 
        ? ' AND NOT (' + mapping.excludes.map(p => `code LIKE '${p}%'`).join(' OR ') + ')'
        : '';
      
      const result = await sql.unsafe(`
        SELECT COALESCE(SUM(value), 0) as total
        FROM service_balances
        WHERE is_leaf = true AND (${prefixConditions})${excludeConditions}
      `);
      const value = Number(result[0].total);
      totalR414 += value;
      
      const status = value > 0 ? '✅' : '⚠️ ';
      console.log(`${String(mapping.row).padEnd(5)}| ${mapping.name.padEnd(30)}| ${mapping.prefixes.join(',').substring(0,27).padEnd(28)}| ${status} ${value.toLocaleString('es-CO')}`);
    }
    console.log('-'.repeat(70));
    console.log(`TOTAL ACTIVOS R414: ${totalR414.toLocaleString('es-CO')}`);

    // 4. Comparación de totales
    console.log('\n📊 4. COMPARACIÓN DE TOTALES');
    console.log('-'.repeat(70));
    
    const totalReal = await sql`
      SELECT COALESCE(SUM(value), 0) as total
      FROM service_balances
      WHERE is_leaf = true AND code LIKE '1%'
    `;
    const realValue = Number(totalReal[0].total);
    
    console.log(`Total REAL en BD (Activos):     ${realValue.toLocaleString('es-CO')}`);
    console.log(`Total mapeado por IFE actual:   ${totalIFE.toLocaleString('es-CO')}`);
    console.log(`Diferencia IFE vs Real:         ${(realValue - totalIFE).toLocaleString('es-CO')} (${((1 - totalIFE/realValue) * 100).toFixed(1)}% perdido)`);

    // 5. Diagnóstico específico de CxC
    console.log('\n📊 5. DIAGNÓSTICO CxC (Clase 13) - Principal problema');
    console.log('-'.repeat(70));
    
    const cxcDetails = await sql`
      SELECT 
        LEFT(code, 4) as prefix4,
        COUNT(*) as count,
        SUM(value) as total
      FROM service_balances
      WHERE is_leaf = true AND code LIKE '13%'
      GROUP BY LEFT(code, 4)
      ORDER BY prefix4
    `;
    
    console.log('Prefix4 | Count | Total              | Mapeo IFE actual | Mapeo R414');
    console.log('-'.repeat(70));
    for (const c of cxcDetails) {
      const ifeMatch = c.prefix4.startsWith('1305') || c.prefix4.startsWith('1310') ? '✅' : '❌';
      const r414Match = c.prefix4.startsWith('1318') || c.prefix4.startsWith('1311') || c.prefix4.startsWith('1317') ? '✅' : '⚠️';
      console.log(`${c.prefix4.padEnd(8)}| ${String(c.count).padEnd(6)}| ${Number(c.total).toLocaleString('es-CO').padEnd(19)}| ${ifeMatch}               | ${r414Match}`);
    }

    // Conclusión
    console.log('\n' + '='.repeat(70));
    console.log('📋 DIAGNÓSTICO FINAL');
    console.log('='.repeat(70));
    
    const cobertura = ((totalIFE / realValue) * 100).toFixed(2);
    console.log(`\nCobertura actual de mapeos IFE: ${cobertura}%`);
    
    if (totalIFE < realValue * 0.95) {
      console.log('\n⚠️  PROBLEMA CONFIRMADO:');
      console.log('   - Los mapeos IFE usan códigos PUC estándar (ej: 1305, 1310)');
      console.log('   - Los datos en BD usan códigos CGN Res. 414 (ej: 1318, 1311)');
      console.log('\n📌 SOLUCIÓN REQUERIDA:');
      console.log('   - Actualizar esfMappings.ts de IFE para usar códigos CGN');
      console.log('   - Copiar estructura de mapeos de R414 que SÍ funciona');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

diagnose();
