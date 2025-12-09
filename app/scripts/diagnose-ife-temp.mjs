import postgres from 'postgres';
const sql = postgres('postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function diagnose() {
  console.log('=== DIAGNÓSTICO IFE ===\n');
  
  // Fila 30 - Prefijo 19
  console.log('FILA 30 - Otros activos financieros (prefijo 19):');
  const f30 = await sql`SELECT service, code, value FROM service_balances WHERE is_leaf = true AND code LIKE '19%' AND value != 0 ORDER BY service, code`;
  for (const r of f30) console.log('  ' + r.service + ': ' + r.code + ' = ' + Number(r.value).toLocaleString());
  
  // Fila 24
  console.log('\nFILA 24 - CxC venta bienes (1316):');
  const f24 = await sql`SELECT service, code, value FROM service_balances WHERE is_leaf = true AND code LIKE '1316%' AND value != 0`;
  console.log(f24.length > 0 ? f24 : '  (vacío)');
  
  // Fila 25
  console.log('\nFILA 25 - Otras CxC:');
  const f25 = await sql`SELECT service, code, value FROM service_balances WHERE is_leaf = true AND (code LIKE '1311%' OR code LIKE '1317%' OR code LIKE '1319%' OR code LIKE '1384%') AND value != 0`;
  for (const r of f25) console.log('  ' + r.service + ': ' + r.code + ' = ' + Number(r.value).toLocaleString());
  
  // Totales acueducto
  console.log('\nTOTALES ACUEDUCTO:');
  const t = await sql`SELECT SUBSTRING(code, 1, 1) as clase, SUM(value) as total FROM service_balances WHERE is_leaf = true AND service = 'acueducto' GROUP BY SUBSTRING(code, 1, 1) ORDER BY clase`;
  for (const r of t) console.log('  Clase ' + r.clase + ': ' + Number(r.total).toLocaleString());
  
  // Ver cuentas con valores grandes en acueducto que podrían ser el problema
  console.log('\nCUENTAS ACUEDUCTO > 100M:');
  const big = await sql`SELECT code, name, value FROM service_balances WHERE is_leaf = true AND service = 'acueducto' AND ABS(value) > 100000000 ORDER BY value DESC`;
  for (const r of big) console.log('  ' + r.code + ': ' + Number(r.value).toLocaleString() + ' - ' + r.name);
  
  // Ver valor especifico 243257273
  console.log('\nBUSCANDO VALOR ~243M EN ACUEDUCTO:');
  const target = await sql`SELECT code, name, value FROM service_balances WHERE service = 'acueducto' AND ABS(value) > 240000000 AND ABS(value) < 250000000`;
  for (const r of target) console.log('  ' + r.code + ': ' + Number(r.value).toLocaleString() + ' - ' + r.name);
  
  // Ver working_accounts con ese valor
  console.log('\nBUSCANDO VALOR ~243M EN WORKING_ACCOUNTS:');
  const target2 = await sql`SELECT code, name, value FROM working_accounts WHERE ABS(value) > 240000000 AND ABS(value) < 250000000`;
  for (const r of target2) console.log('  ' + r.code + ': ' + Number(r.value).toLocaleString() + ' - ' + r.name);
  
  await sql.end();
}
diagnose();
  
  await sql.end();
}
diagnose();
