/**
 * Validación completa de mapeos IFE vs datos en BD
 * 
 * Verifica que los nuevos mapeos CGN capturen correctamente
 * todos los datos financieros.
 */

import postgres from 'postgres';

const connectionString = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(connectionString);

// Mapeos ESF actualizados con CGN
const ESF_MAPPINGS = [
  { row: 15, prefixes: ['11'], excludes: ['1132'], desc: 'Efectivo y equivalentes' },
  { row: 16, prefixes: ['12'], excludes: ['1208'], desc: 'Inversiones e instrumentos derivados' },
  { row: 19, prefixes: ['131801', '131802', '131803', '131804', '131805', '131806'], desc: 'CxC comerciales - servicios' },
  { row: 20, prefixes: ['131807', '131808', '131809', '131810', '131811', '131812'], desc: 'Subsidios por cobrar' },
  { row: 23, prefixes: ['13'], excludes: ['1318', '138'], desc: 'Otras CxC corrientes' },
  { row: 27, prefixes: ['15'], excludes: ['1580'], desc: 'Inventarios' },
  { row: 29, prefixes: ['17', '19'], desc: 'Otros activos no financieros corrientes' },
  { row: 34, prefixes: ['16'], desc: 'PPE (neto)' },
  { row: 40, prefixes: ['18'], desc: 'Activos intangibles' },
  { row: 47, prefixes: ['23'], desc: 'CxP comerciales' },
  { row: 48, prefixes: ['21', '22'], desc: 'Obligaciones financieras' },
  { row: 50, prefixes: ['24', '25'], desc: 'Pasivos laborales y provisiones' },
  { row: 54, prefixes: ['27'], desc: 'Impuestos y contribuciones' },
  { row: 62, prefixes: ['3105'], desc: 'Capital social' },
  { row: 67, prefixes: ['32'], desc: 'Resultados ejercicios anteriores' },
];

// Mapeos ER actualizados con CGN
const ER_MAPPINGS = [
  { row: 14, prefixes: ['41', '42', '43'], desc: 'Ingresos ordinarios' },
  { row: 15, prefixes: ['62', '63'], desc: 'Costo de ventas' },
  { row: 17, prefixes: ['51', '52', '56'], desc: 'Gastos admin y ventas' },
  { row: 18, prefixes: ['44', '48'], desc: 'Otros ingresos' },
  { row: 19, prefixes: ['53', '58'], desc: 'Otros gastos' },
];

async function main() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('='.repeat(80));
    console.log('VALIDACIÓN COMPLETA DE MAPEOS IFE');
    console.log('='.repeat(80));

    // Total general por clase
    console.log('\n📊 TOTALES POR CLASE (working_accounts):\n');
    const clasesResult = await client.query(`
      SELECT 
        LEFT(codigo, 1) as clase,
        CASE LEFT(codigo, 1)
          WHEN '1' THEN 'ACTIVOS'
          WHEN '2' THEN 'PASIVOS'
          WHEN '3' THEN 'PATRIMONIO'
          WHEN '4' THEN 'INGRESOS'
          WHEN '5' THEN 'GASTOS'
          WHEN '6' THEN 'COSTOS'
          ELSE 'OTROS'
        END as tipo,
        COUNT(*) as cuentas,
        SUM(saldo_final) as total
      FROM working_accounts
      WHERE empresa_id = 20037
      GROUP BY LEFT(codigo, 1)
      ORDER BY LEFT(codigo, 1)
    `);
    
    console.log('Clase | Tipo        | Cuentas | Total');
    console.log('-'.repeat(50));
    for (const row of clasesResult.rows) {
      console.log(`  ${row.clase}   | ${row.tipo.padEnd(11)} | ${row.cuentas.toString().padStart(7)} | ${Number(row.total).toLocaleString('es-CO')}`);
    }

    // Validar ESF
    console.log('\n' + '='.repeat(80));
    console.log('📋 VALIDACIÓN ESF (Estado Situación Financiera)');
    console.log('='.repeat(80));
    
    let totalActivosMaped = 0;
    let totalPasivosMaped = 0;
    let totalPatrimonioMaped = 0;

    for (const mapping of ESF_MAPPINGS) {
      const prefixConditions = mapping.prefixes.map(p => `codigo LIKE '${p}%'`).join(' OR ');
      let excludeCondition = '';
      if (mapping.excludes && mapping.excludes.length > 0) {
        excludeCondition = ' AND NOT (' + mapping.excludes.map(e => `codigo LIKE '${e}%'`).join(' OR ') + ')';
      }
      
      const query = `
        SELECT SUM(saldo_final) as total, COUNT(*) as count
        FROM working_accounts
        WHERE empresa_id = 20037 AND (${prefixConditions})${excludeCondition}
      `;
      
      const result = await client.query(query);
      const total = Number(result.rows[0].total) || 0;
      const count = result.rows[0].count;
      
      const status = total !== 0 ? '✅' : '⚠️';
      console.log(`${status} Fila ${mapping.row}: ${mapping.desc}`);
      console.log(`   Prefijos: [${mapping.prefixes.join(', ')}]${mapping.excludes ? ` excluye [${mapping.excludes.join(', ')}]` : ''}`);
      console.log(`   Cuentas: ${count} | Total: ${total.toLocaleString('es-CO')}`);
      console.log('');
      
      // Clasificar
      const primeraClase = mapping.prefixes[0][0];
      if (primeraClase === '1') totalActivosMaped += total;
      else if (primeraClase === '2') totalPasivosMaped += total;
      else if (primeraClase === '3') totalPatrimonioMaped += total;
    }

    // Validar ER
    console.log('\n' + '='.repeat(80));
    console.log('📋 VALIDACIÓN ER (Estado de Resultados)');
    console.log('='.repeat(80));
    
    for (const mapping of ER_MAPPINGS) {
      const prefixConditions = mapping.prefixes.map(p => `codigo LIKE '${p}%'`).join(' OR ');
      
      const query = `
        SELECT SUM(ABS(saldo_final)) as total, COUNT(*) as count
        FROM working_accounts
        WHERE empresa_id = 20037 AND (${prefixConditions})
      `;
      
      const result = await client.query(query);
      const total = Number(result.rows[0].total) || 0;
      const count = result.rows[0].count;
      
      const status = total !== 0 ? '✅' : '⚠️';
      console.log(`${status} Fila ${mapping.row}: ${mapping.desc}`);
      console.log(`   Prefijos: [${mapping.prefixes.join(', ')}]`);
      console.log(`   Cuentas: ${count} | Total ABS: ${total.toLocaleString('es-CO')}`);
      console.log('');
    }

    // Resumen y validación ecuación
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN Y VALIDACIÓN ECUACIÓN CONTABLE');
    console.log('='.repeat(80));
    
    // Obtener totales reales
    const activosQuery = await client.query(`
      SELECT SUM(saldo_final) as total FROM working_accounts
      WHERE empresa_id = 20037 AND codigo LIKE '1%'
    `);
    const pasivosQuery = await client.query(`
      SELECT SUM(saldo_final) as total FROM working_accounts
      WHERE empresa_id = 20037 AND codigo LIKE '2%'
    `);
    const patrimonioQuery = await client.query(`
      SELECT SUM(saldo_final) as total FROM working_accounts
      WHERE empresa_id = 20037 AND codigo LIKE '3%'
    `);
    
    const activos = Number(activosQuery.rows[0].total) || 0;
    const pasivos = Number(pasivosQuery.rows[0].total) || 0;
    const patrimonio = Number(patrimonioQuery.rows[0].total) || 0;
    
    console.log(`\nTotales en BD:`);
    console.log(`  Activos (1):     ${activos.toLocaleString('es-CO')}`);
    console.log(`  Pasivos (2):     ${pasivos.toLocaleString('es-CO')}`);
    console.log(`  Patrimonio (3):  ${patrimonio.toLocaleString('es-CO')}`);
    
    console.log(`\nTotales Mapeados ESF:`);
    console.log(`  Activos mapeados:     ${totalActivosMaped.toLocaleString('es-CO')}`);
    console.log(`  Pasivos mapeados:     ${totalPasivosMaped.toLocaleString('es-CO')}`);
    console.log(`  Patrimonio mapeado:   ${totalPatrimonioMaped.toLocaleString('es-CO')}`);
    
    const cobertura = {
      activos: ((totalActivosMaped / activos) * 100).toFixed(1),
      pasivos: ((totalPasivosMaped / pasivos) * 100).toFixed(1),
      patrimonio: ((totalPatrimonioMaped / patrimonio) * 100).toFixed(1)
    };
    
    console.log(`\nCobertura de mapeos:`);
    console.log(`  Activos:     ${cobertura.activos}%`);
    console.log(`  Pasivos:     ${cobertura.pasivos}%`);
    console.log(`  Patrimonio:  ${cobertura.patrimonio}%`);
    
    // Ecuación contable
    const ecuacion = activos - pasivos - patrimonio;
    console.log(`\n📐 Ecuación: A - P - PT = ${ecuacion.toLocaleString('es-CO')}`);
    console.log(`   ${Math.abs(ecuacion) < 1 ? '✅ BALANCEADO' : '❌ DESBALANCE'}`);

    // Análisis de cobertura detallado
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CUENTAS NO CUBIERTAS POR MAPEOS');
    console.log('='.repeat(80));
    
    // Buscar cuentas de activo no cubiertas
    const noCubiertasQuery = await client.query(`
      SELECT codigo, nombre, saldo_final
      FROM working_accounts
      WHERE empresa_id = 20037 
        AND codigo LIKE '1%'
        AND saldo_final != 0
        AND NOT (
          codigo LIKE '11%' OR codigo LIKE '12%' OR codigo LIKE '13%' 
          OR codigo LIKE '15%' OR codigo LIKE '16%' OR codigo LIKE '17%' 
          OR codigo LIKE '18%' OR codigo LIKE '19%'
        )
      ORDER BY ABS(saldo_final) DESC
      LIMIT 10
    `);
    
    if (noCubiertasQuery.rows.length > 0) {
      console.log('\nActivos potencialmente no cubiertos:');
      for (const row of noCubiertasQuery.rows) {
        console.log(`  ${row.codigo} - ${row.nombre}: ${Number(row.saldo_final).toLocaleString('es-CO')}`);
      }
    } else {
      console.log('\n✅ Todas las cuentas de activo están cubiertas por los mapeos');
    }

    // Validar service_balances
    console.log('\n' + '='.repeat(80));
    console.log('📋 VALIDACIÓN SERVICE_BALANCES (por servicios)');
    console.log('='.repeat(80));
    
    const servicesQuery = await client.query(`
      SELECT 
        service_type,
        LEFT(codigo, 2) as prefix,
        COUNT(*) as cuentas,
        SUM(service_balance) as total
      FROM service_balances
      WHERE empresa_id = 20037 AND service_balance != 0
      GROUP BY service_type, LEFT(codigo, 2)
      ORDER BY service_type, LEFT(codigo, 2)
    `);
    
    console.log('\nServicio      | Prefijo | Cuentas | Total');
    console.log('-'.repeat(55));
    for (const row of servicesQuery.rows) {
      console.log(`${row.service_type.padEnd(13)} | ${row.prefix.padEnd(7)} | ${row.cuentas.toString().padStart(7)} | ${Number(row.total).toLocaleString('es-CO')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ VALIDACIÓN COMPLETADA');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();