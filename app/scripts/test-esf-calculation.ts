/**
 * Test de verificación de cálculos ESF
 * 
 * Este script consulta la base de datos y verifica que:
 * 1. Los activos totales coincidan con el consolidado esperado (65,921,695)
 * 2. Se cumpla la ecuación contable: Activos = Pasivos + Patrimonio
 * 3. La suma de activos por servicio coincida con el consolidado
 * 
 * Ejecutar: npx tsx scripts/test-esf-calculation.ts
 */

import { config } from 'dotenv';
// Cargar .env.local primero
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Conectar a la base de datos
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

interface AccountRow {
  code: string;
  name: string;
  value: number;
  is_leaf: boolean;
}

interface ServiceBalanceRow extends AccountRow {
  service: string;
}

/**
 * Función de suma con verificación dinámica (NUEVA lógica)
 * No depende de isLeaf, sino que verifica dinámicamente si existe una cuenta más específica
 */
function sumByPrefixDynamic(
  accounts: AccountRow[],
  prefixes: string[],
  excludePrefixes: string[] = []
): number {
  let total = 0;

  for (const account of accounts) {
    // Verificar si coincide con algún prefijo buscado
    const matchesPrefix = prefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );
    if (!matchesPrefix) continue;

    // Verificar si debe excluirse
    const isExcluded = excludePrefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );
    if (isExcluded) continue;

    // Verificación dinámica: ¿Existe una cuenta más específica?
    const hasMoreSpecific = accounts.some(
      (other) =>
        other.code !== account.code &&
        other.code.startsWith(account.code) &&
        other.code.length > account.code.length
    );

    if (!hasMoreSpecific) {
      total += account.value;
    }
  }

  return Math.round(total);
}

/**
 * Función de suma con isLeaf estático (LÓGICA ANTERIOR - para comparar)
 */
function sumByPrefixOld(
  accounts: AccountRow[],
  prefixes: string[],
  excludePrefixes: string[] = []
): number {
  let total = 0;

  for (const account of accounts) {
    if (!account.is_leaf) continue;

    const matchesPrefix = prefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );
    if (!matchesPrefix) continue;

    const isExcluded = excludePrefixes.some((prefix) =>
      account.code.startsWith(prefix)
    );
    if (isExcluded) continue;

    total += account.value;
  }

  return Math.round(total);
}

async function runTest() {
  console.log('\n========================================');
  console.log('TEST: Verificación de cálculo de totales ESF');
  console.log('========================================\n');

  // 1. Consultar working_accounts (consolidado)
  const consolidatedAccounts = await db.execute<AccountRow>(
    sql`SELECT code, name, value, is_leaf FROM working_accounts ORDER BY code`
  ) as unknown as AccountRow[];
  console.log(`Total cuentas en working_accounts: ${consolidatedAccounts.length}`);

  // 2. Consultar service_balances
  const serviceBalances = await db.execute<ServiceBalanceRow>(
    sql`SELECT service, code, name, value, is_leaf FROM service_balances ORDER BY service, code`
  ) as unknown as ServiceBalanceRow[];
  console.log(`Total registros en service_balances: ${serviceBalances.length}`);

  // 3. Calcular totales consolidados con NUEVA lógica (dinámica)
  console.log('\n--- CÁLCULO CON NUEVA LÓGICA (verificación dinámica) ---');

  const activosNuevo = sumByPrefixDynamic(consolidatedAccounts, ['1']);
  const pasivosNuevo = sumByPrefixDynamic(consolidatedAccounts, ['2']);
  const patrimonioNuevo = sumByPrefixDynamic(consolidatedAccounts, ['3']);

  console.log(`Activos (clase 1):     ${activosNuevo.toLocaleString()}`);
  console.log(`Pasivos (clase 2):     ${pasivosNuevo.toLocaleString()}`);
  console.log(`Patrimonio (clase 3):  ${patrimonioNuevo.toLocaleString()}`);
  console.log(
    `Pasivos + Patrimonio:  ${(pasivosNuevo + patrimonioNuevo).toLocaleString()}`
  );

  const ecuacionNueva = activosNuevo === pasivosNuevo + patrimonioNuevo;
  console.log(`Ecuación A = P + Pt:   ${ecuacionNueva ? '✓ CUMPLE' : '✗ NO CUMPLE'}`);

  // 4. Calcular totales con VIEJA lógica (isLeaf) para comparar
  console.log('\n--- CÁLCULO CON LÓGICA ANTERIOR (isLeaf estático) ---');

  const activosViejo = sumByPrefixOld(consolidatedAccounts, ['1']);
  const pasivosViejo = sumByPrefixOld(consolidatedAccounts, ['2']);
  const patrimonioViejo = sumByPrefixOld(consolidatedAccounts, ['3']);

  console.log(`Activos (clase 1):     ${activosViejo.toLocaleString()}`);
  console.log(`Pasivos (clase 2):     ${pasivosViejo.toLocaleString()}`);
  console.log(`Patrimonio (clase 3):  ${patrimonioViejo.toLocaleString()}`);

  const ecuacionVieja = activosViejo === pasivosViejo + patrimonioViejo;
  console.log(`Ecuación A = P + Pt:   ${ecuacionVieja ? '✓ CUMPLE' : '✗ NO CUMPLE'}`);

  // 5. Verificar contra el esperado
  console.log('\n--- VERIFICACIÓN CONTRA VALOR ESPERADO ---');
  const ACTIVOS_ESPERADOS = 65921695;
  console.log(`Activos esperados:     ${ACTIVOS_ESPERADOS.toLocaleString()}`);
  console.log(`Activos calculados:    ${activosNuevo.toLocaleString()}`);
  console.log(
    `Diferencia:            ${(activosNuevo - ACTIVOS_ESPERADOS).toLocaleString()}`
  );
  console.log(
    `Coincide:              ${activosNuevo === ACTIVOS_ESPERADOS ? '✓ SÍ' : '✗ NO'}`
  );

  // 6. Verificar por servicio
  console.log('\n--- TOTALES POR SERVICIO (nueva lógica) ---');
  const services = ['acueducto', 'alcantarillado', 'aseo'];
  let totalActivosServicios = 0;

  for (const service of services) {
    const serviceData = serviceBalances.filter((b) => b.service === service);
    const activos = sumByPrefixDynamic(serviceData, ['1']);
    const pasivos = sumByPrefixDynamic(serviceData, ['2']);
    const patrimonio = sumByPrefixDynamic(serviceData, ['3']);

    totalActivosServicios += activos;

    console.log(`\n${service.toUpperCase()}:`);
    console.log(`  Activos:     ${activos.toLocaleString()}`);
    console.log(`  Pasivos:     ${pasivos.toLocaleString()}`);
    console.log(`  Patrimonio:  ${patrimonio.toLocaleString()}`);
    console.log(`  A = P + Pt:  ${activos === pasivos + patrimonio ? '✓' : '✗'}`);
  }

  console.log(`\nSuma activos servicios: ${totalActivosServicios.toLocaleString()}`);
  console.log(
    `Coincide con consolidado: ${totalActivosServicios === activosNuevo ? '✓ SÍ' : '✗ NO'}`
  );

  // 7. Detalles de cuentas con isLeaf incorrecto
  console.log('\n--- CUENTAS CON isLeaf INCORRECTO ---');
  const cuentasProblematicas: string[] = [];

  for (const acc of consolidatedAccounts) {
    const hasMoreSpecific = consolidatedAccounts.some(
      (other) =>
        other.code !== acc.code &&
        other.code.startsWith(acc.code) &&
        other.code.length > acc.code.length
    );

    // Si isLeaf=true pero tiene hijos (error de cálculo de isLeaf)
    if (acc.is_leaf && hasMoreSpecific) {
      cuentasProblematicas.push(
        `  ${acc.code} - isLeaf=TRUE pero tiene hijos, valor=${acc.value.toLocaleString()}`
      );
    }
  }

  if (cuentasProblematicas.length > 0) {
    console.log(`Encontradas ${cuentasProblematicas.length} cuentas problemáticas:`);
    cuentasProblematicas.forEach((c) => console.log(c));
  } else {
    console.log('No se encontraron cuentas con isLeaf incorrecto.');
  }

  // 8. Resumen final
  console.log('\n========================================');
  console.log('RESUMEN DE RESULTADOS');
  console.log('========================================');
  console.log(`Nueva lógica - Activos:       ${activosNuevo.toLocaleString()}`);
  console.log(`Nueva lógica - Ecuación:      ${ecuacionNueva ? '✓ CUMPLE' : '✗ NO CUMPLE'}`);
  console.log(`Valor esperado:               ${ACTIVOS_ESPERADOS.toLocaleString()}`);
  console.log(`Coincidencia:                 ${activosNuevo === ACTIVOS_ESPERADOS ? '✓ SÍ' : '✗ NO'}`);
  
  if (activosNuevo !== ACTIVOS_ESPERADOS) {
    console.log(`\n⚠️  DIFERENCIA: ${(activosNuevo - ACTIVOS_ESPERADOS).toLocaleString()}`);
  }
  
  console.log('\n========================================\n');

  await client.end();
  
  // Exit code basado en el resultado
  process.exit(activosNuevo === ACTIVOS_ESPERADOS && ecuacionNueva ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
