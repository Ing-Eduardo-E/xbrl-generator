/**
 * Script de Diagnóstico ER - Verifica prefijos de Ingresos/Gastos/Costos
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

async function analyze() {
  try {
    console.log('📊 PREFIJOS INGRESOS/GASTOS/COSTOS EN BD:');
    console.log('-'.repeat(50));
    
    const prefixes = await sql`
      SELECT 
        LEFT(code, 2) as prefix2,
        COUNT(*) as count,
        SUM(value) as total
      FROM service_balances
      WHERE is_leaf = true AND (code LIKE '4%' OR code LIKE '5%' OR code LIKE '6%')
      GROUP BY LEFT(code, 2)
      ORDER BY prefix2
    `;
    
    console.log('prefix | count | total');
    console.log('-'.repeat(50));
    for (const p of prefixes) {
      console.log(`${p.prefix2.padEnd(7)}| ${String(p.count).padEnd(6)}| ${Number(p.total).toLocaleString('es-CO')}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

analyze();
