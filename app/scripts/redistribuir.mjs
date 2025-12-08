/**
 * Script para redistribuir los balances usando el algoritmo Largest Remainder
 * Esto corrige el error de redondeo de 1 peso
 * 
 * Uso: node scripts/redistribuir.mjs
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

// Distribución 40/35/25
const services = [
  { name: 'acueducto', percentage: 40 },
  { name: 'alcantarillado', percentage: 35 },
  { name: 'aseo', percentage: 25 },
];

console.log('🔄 REDISTRIBUCIÓN CON ALGORITMO LARGEST REMAINDER');
console.log('='.repeat(60));
console.log('Distribución: Acueducto 40%, Alcantarillado 35%, Aseo 25%');

async function redistribute() {
  try {
    // 1. Obtener todas las cuentas de working_accounts
    console.log('\n📊 Obteniendo cuentas de working_accounts...');
    const accounts = await sql`SELECT * FROM working_accounts ORDER BY code`;
    console.log(`  Total cuentas: ${accounts.length}`);

    // 2. Limpiar service_balances
    console.log('\n🗑️  Limpiando service_balances...');
    await sql`DELETE FROM service_balances`;

    // 3. Distribuir usando Largest Remainder Method
    console.log('\n🔄 Distribuyendo con Largest Remainder Method...');
    
    const distributedAccounts = [];
    let totalOriginal = 0;
    let totalDistribuido = 0;

    for (const account of accounts) {
      const originalValue = Number(account.value);
      totalOriginal += originalValue;
      
      // Calculate raw (decimal) values for each service
      const rawValues = services.map(service => ({
        service: service.name,
        rawValue: originalValue * (service.percentage / 100),
        floorValue: Math.floor(originalValue * (service.percentage / 100)),
        remainder: (originalValue * (service.percentage / 100)) % 1,
      }));

      // Calculate the difference between original and sum of floors
      const sumOfFloors = rawValues.reduce((sum, v) => sum + v.floorValue, 0);
      let remainder = originalValue - sumOfFloors;

      // Sort by remainder descending to distribute extra units
      const sortedByRemainder = [...rawValues].sort((a, b) => b.remainder - a.remainder);

      // Create final values, adding 1 to those with largest remainders
      const finalValues = {};
      for (const item of sortedByRemainder) {
        if (remainder > 0) {
          finalValues[item.service] = item.floorValue + 1;
          remainder--;
        } else {
          finalValues[item.service] = item.floorValue;
        }
      }

      // Add to distributed accounts
      for (const service of services) {
        const value = finalValues[service.name];
        totalDistribuido += value;
        
        distributedAccounts.push({
          service: service.name,
          code: account.code,
          name: account.name,
          value: value,
          is_leaf: account.is_leaf,
          level: account.level,
          class: account.class,
        });
      }
    }

    // 4. Insertar en lotes con múltiples VALUES
    console.log('\n📥 Insertando datos distribuidos...');
    
    const batchSize = 200;
    let inserted = 0;
    
    for (let i = 0; i < distributedAccounts.length; i += batchSize) {
      const batch = distributedAccounts.slice(i, i + batchSize);
      
      // Construir VALUES manualmente
      const valuesStr = batch.map(a => {
        const escapedName = a.name.replace(/'/g, "''");
        const escapedClass = a.class ? a.class.replace(/'/g, "''") : '';
        return `('${a.service}', '${a.code}', '${escapedName}', ${a.value}, ${a.is_leaf}, ${a.level}, '${escapedClass}')`;
      }).join(',\n');
      
      await sql.unsafe(`
        INSERT INTO service_balances (service, code, name, value, is_leaf, level, class)
        VALUES ${valuesStr}
      `);
      
      inserted += batch.length;
      process.stdout.write(`\r  Insertados: ${inserted}/${distributedAccounts.length}`);
    }
    console.log('\n');

    // 5. Verificar resultados
    console.log('📊 VERIFICACIÓN POST-REDISTRIBUCIÓN');
    console.log('-'.repeat(40));
    
    const verificacion = await sql`
      SELECT 
        (SELECT COALESCE(SUM(value), 0) FROM working_accounts WHERE is_leaf = true AND code LIKE '1%') as activos_consolidado,
        (SELECT COALESCE(SUM(value), 0) FROM service_balances WHERE is_leaf = true AND code LIKE '1%') as activos_servicios
    `;
    
    const consolidado = Number(verificacion[0].activos_consolidado);
    const servicios = Number(verificacion[0].activos_servicios);
    
    console.log(`  Activos consolidado: ${consolidado.toLocaleString('es-CO')}`);
    console.log(`  Activos servicios:   ${servicios.toLocaleString('es-CO')}`);
    console.log(`  Diferencia:          ${(consolidado - servicios).toLocaleString('es-CO')}`);
    
    if (consolidado === servicios) {
      console.log('\n  ✅ ¡PERFECTO! SERVICIOS COINCIDEN EXACTAMENTE CON CONSOLIDADO');
    } else {
      console.log('\n  ❌ Aún hay diferencia');
    }

    // Verificar por servicio
    console.log('\n📊 TOTALES POR SERVICIO (Activos is_leaf=true)');
    console.log('-'.repeat(40));
    const porServicio = await sql`
      SELECT 
        service,
        SUM(value) as total
      FROM service_balances 
      WHERE is_leaf = true AND code LIKE '1%'
      GROUP BY service
      ORDER BY service
    `;
    
    let sumaServicios = 0;
    for (const row of porServicio) {
      const total = Number(row.total);
      sumaServicios += total;
      const pct = (total / consolidado * 100).toFixed(2);
      console.log(`  ${row.service.padEnd(15)}: ${total.toLocaleString('es-CO').padStart(15)} (${pct}%)`);
    }
    console.log(`  ${'TOTAL'.padEnd(15)}: ${sumaServicios.toLocaleString('es-CO').padStart(15)}`);
    console.log(`  ${'CONSOLIDADO'.padEnd(15)}: ${consolidado.toLocaleString('es-CO').padStart(15)}`);

    console.log('\n✅ Redistribución completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sql.end();
  }
}

redistribute();
