/**
 * Script de validación IFE - Mapeos CGN vs Base de Datos
 * 
 * Replica EXACTAMENTE la lógica de esfMappings.ts para verificar
 * que los valores calculados coincidan con los datos reales.
 * 
 * NO depende de TypeScript - consulta BD directamente.
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_PcLTCRh7a6nv@ep-bitter-pine-ae5lzpmn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL);

// ============================================================================
// MAPEOS ESF - EXACTAMENTE como en esfMappings.ts (CGN Resolución 414)
// ============================================================================
const IFE_ESF_MAPPINGS = [
  // ACTIVOS CORRIENTES
  { row: 15, prefixes: ['11'], excludes: ['1132'], desc: 'Efectivo y equivalentes' },
  { row: 16, prefixes: ['1132'], excludes: [], desc: 'Efectivo restringido' },
  { row: 19, prefixes: ['131801', '131802', '131803', '131804', '131805', '131806'], excludes: [], desc: 'CxC servicios públicos' },
  { row: 20, prefixes: ['131807', '131808', '131809', '131810', '131811', '131812'], excludes: [], desc: 'CxC por subsidios' },
  { row: 22, prefixes: ['138424'], excludes: [], desc: 'CxC aprovechamiento' },
  { row: 24, prefixes: ['1316'], excludes: [], desc: 'CxC venta bienes' },
  { row: 25, prefixes: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'], excludes: ['138401', '138414', '138424'], desc: 'Otras CxC' },
  { row: 27, prefixes: ['15'], excludes: ['1580'], desc: 'Inventarios' },
  { row: 28, prefixes: ['12'], excludes: ['1280'], desc: 'Inversiones corrientes' },
  { row: 30, prefixes: ['19'], excludes: [], desc: 'Otros activos financieros' },
  { row: 31, prefixes: ['17', '18'], excludes: [], desc: 'Otros activos no financieros' },
  
  // ACTIVOS NO CORRIENTES
  { row: 34, prefixes: ['16'], excludes: [], desc: 'PPE (neto)' },
  { row: 36, prefixes: ['1970', '1971', '1972', '1973', '1974', '1975'], excludes: [], desc: 'Intangibles' },
  { row: 37, prefixes: ['1227', '1230', '1233'], excludes: [], desc: 'Inversiones no corrientes' },
  { row: 49, prefixes: ['14'], excludes: [], desc: 'Préstamos por cobrar LP' },
  
  // PASIVOS CORRIENTES
  { row: 56, prefixes: ['25'], excludes: [], desc: 'Provisiones', abs: true },
  { row: 57, prefixes: ['23'], excludes: [], desc: 'CxP corrientes', abs: true },
  { row: 60, prefixes: ['21', '22'], excludes: [], desc: 'Obligaciones financieras', abs: true },
  { row: 61, prefixes: ['24'], excludes: [], desc: 'Obligaciones laborales', abs: true },
  { row: 62, prefixes: ['27'], excludes: [], desc: 'Pasivo impuestos', abs: true },
  { row: 63, prefixes: ['26'], excludes: [], desc: 'Otros pasivos', abs: true },
  
  // PATRIMONIO
  { row: 77, prefixes: ['3105'], excludes: [], desc: 'Capital', abs: true },
  { row: 78, prefixes: ['3109'], excludes: [], desc: 'Inversión suplementaria', abs: true },
  { row: 79, prefixes: ['3125', '3110'], excludes: [], desc: 'Otras participaciones', abs: true },
  { row: 80, prefixes: ['3115', '3120'], excludes: [], desc: 'Superávit revaluación', abs: true },
  { row: 81, prefixes: ['3130'], excludes: [], desc: 'Reservas', abs: true },
  { row: 82, prefixes: ['32'], excludes: [], desc: 'Ganancias acumuladas', abs: true },
  { row: 83, prefixes: ['3145'], excludes: [], desc: 'Efectos NIF', abs: true },
];

// Servicios disponibles
const SERVICIOS = ['acueducto', 'alcantarillado', 'aseo'];

/**
 * Calcula valor para un mapeo usando SQL directo
 */
async function calcularValorMapeo(mapping, servicio = null) {
  // Construir condiciones de prefijos
  const prefixConditions = mapping.prefixes.map(p => `code LIKE '${p}%'`).join(' OR ');
  
  // Construir exclusiones
  let excludeCondition = '';
  if (mapping.excludes && mapping.excludes.length > 0) {
    excludeCondition = ' AND NOT (' + mapping.excludes.map(e => `code LIKE '${e}%'`).join(' OR ') + ')';
  }
  
  // Query base
  let query;
  if (servicio) {
    query = `
      SELECT COALESCE(SUM(value), 0) as total
      FROM service_balances
      WHERE is_leaf = true
        AND service = '${servicio}'
        AND (${prefixConditions})${excludeCondition}
    `;
  } else {
    query = `
      SELECT COALESCE(SUM(value), 0) as total
      FROM working_accounts
      WHERE is_leaf = true
        AND (${prefixConditions})${excludeCondition}
    `;
  }
  
  const result = await sql.unsafe(query);
  let valor = Number(result[0]?.total || 0);
  
  // Aplicar valor absoluto si es necesario (pasivos/patrimonio)
  if (mapping.abs) {
    valor = Math.abs(valor);
  }
  
  return valor;
}

/**
 * Obtener totales reales por clase
 */
async function obtenerTotalesReales() {
  const result = await sql`
    SELECT 
      SUBSTRING(code, 1, 1) as clase,
      SUM(value) as total
    FROM working_accounts
    WHERE is_leaf = true
    GROUP BY SUBSTRING(code, 1, 1)
    ORDER BY clase
  `;
  
  const totales = {};
  for (const row of result) {
    totales[row.clase] = Number(row.total);
  }
  return totales;
}

/**
 * Obtener totales por servicio
 */
async function obtenerTotalesPorServicio() {
  const result = await sql`
    SELECT 
      service,
      SUBSTRING(code, 1, 1) as clase,
      SUM(value) as total
    FROM service_balances
    WHERE is_leaf = true
    GROUP BY service, SUBSTRING(code, 1, 1)
    ORDER BY service, clase
  `;
  
  const totales = {};
  for (const row of result) {
    if (!totales[row.service]) totales[row.service] = {};
    totales[row.service][row.clase] = Number(row.total);
  }
  return totales;
}

async function main() {
  console.log('🚀 VALIDACIÓN IFE - MAPEOS CGN vs BASE DE DATOS');
  console.log('='.repeat(80));
  console.log('Este script replica EXACTAMENTE la lógica de esfMappings.ts');
  console.log('='.repeat(80));
  
  // 1. Obtener totales reales de BD
  console.log('\n📊 1. TOTALES REALES POR CLASE (is_leaf=true)');
  console.log('-'.repeat(60));
  const totalesReales = await obtenerTotalesReales();
  
  const claseNombres = {
    '1': 'Activos', '2': 'Pasivos', '3': 'Patrimonio',
    '4': 'Ingresos', '5': 'Gastos', '6': 'Costos'
  };
  
  for (const [clase, total] of Object.entries(totalesReales)) {
    const nombre = claseNombres[clase] || 'Otros';
    console.log(`  Clase ${clase} (${nombre}): ${total.toLocaleString('es-CO')}`);
  }
  
  // 2. Totales por servicio
  console.log('\n📊 2. TOTALES POR SERVICIO (Clase 1 - Activos)');
  console.log('-'.repeat(60));
  const totalesServicio = await obtenerTotalesPorServicio();
  
  let sumaServicios = 0;
  for (const servicio of SERVICIOS) {
    const activos = totalesServicio[servicio]?.['1'] || 0;
    sumaServicios += activos;
    console.log(`  ${servicio.padEnd(15)}: ${activos.toLocaleString('es-CO')}`);
  }
  console.log(`  ${'SUMA SERVICIOS'.padEnd(15)}: ${sumaServicios.toLocaleString('es-CO')}`);
  
  // 3. Calcular valores según mapeos IFE
  console.log('\n📊 3. VALORES CALCULADOS POR MAPEOS IFE (Consolidado)');
  console.log('-'.repeat(80));
  console.log('Fila | Concepto                              | Valor Calculado');
  console.log('-'.repeat(80));
  
  let totalActivosMapeados = 0;
  let totalPasivosMapeados = 0;
  let totalPatrimonioMapeado = 0;
  
  const resultadosPorFila = {};
  
  for (const mapping of IFE_ESF_MAPPINGS) {
    const valor = await calcularValorMapeo(mapping);
    resultadosPorFila[mapping.row] = { ...mapping, valor };
    
    // Clasificar por tipo
    if (mapping.row >= 15 && mapping.row <= 51) {
      totalActivosMapeados += valor;
    } else if (mapping.row >= 56 && mapping.row <= 75) {
      totalPasivosMapeados += valor;
    } else if (mapping.row >= 77 && mapping.row <= 83) {
      totalPatrimonioMapeado += valor;
    }
    
    if (valor !== 0) {
      console.log(`  ${mapping.row.toString().padEnd(4)} | ${mapping.desc.padEnd(38)} | ${valor.toLocaleString('es-CO')}`);
    }
  }
  
  // 4. Resumen y verificación
  console.log('\n' + '='.repeat(80));
  console.log('📋 4. RESUMEN Y VERIFICACIÓN');
  console.log('='.repeat(80));
  
  const activosReales = totalesReales['1'] || 0;
  const pasivosReales = Math.abs(totalesReales['2'] || 0);
  const patrimonioReal = Math.abs(totalesReales['3'] || 0);
  const VALOR_ESPERADO = 65921695;
  
  console.log('\n🎯 ACTIVOS:');
  console.log(`  Valor real BD (Clase 1):     ${activosReales.toLocaleString('es-CO')}`);
  console.log(`  Valor mapeado IFE:           ${totalActivosMapeados.toLocaleString('es-CO')}`);
  console.log(`  Diferencia:                  ${(activosReales - totalActivosMapeados).toLocaleString('es-CO')}`);
  console.log(`  Valor esperado:              ${VALOR_ESPERADO.toLocaleString('es-CO')}`);
  
  console.log('\n🎯 PASIVOS:');
  console.log(`  Valor real BD (Clase 2):     ${pasivosReales.toLocaleString('es-CO')}`);
  console.log(`  Valor mapeado IFE:           ${totalPasivosMapeados.toLocaleString('es-CO')}`);
  console.log(`  Diferencia:                  ${(pasivosReales - totalPasivosMapeados).toLocaleString('es-CO')}`);
  
  console.log('\n🎯 PATRIMONIO:');
  console.log(`  Valor real BD (Clase 3):     ${patrimonioReal.toLocaleString('es-CO')}`);
  console.log(`  Valor mapeado IFE:           ${totalPatrimonioMapeado.toLocaleString('es-CO')}`);
  console.log(`  Diferencia:                  ${(patrimonioReal - totalPatrimonioMapeado).toLocaleString('es-CO')}`);
  
  // 5. Verificación de ecuación contable
  console.log('\n🎯 ECUACIÓN CONTABLE:');
  const pMasPt = pasivosReales + patrimonioReal;
  console.log(`  A = ${activosReales.toLocaleString('es-CO')}`);
  console.log(`  P + Pt = ${pasivosReales.toLocaleString('es-CO')} + ${patrimonioReal.toLocaleString('es-CO')} = ${pMasPt.toLocaleString('es-CO')}`);
  
  // 6. Valores por servicio para filas clave
  console.log('\n📊 5. VALORES POR SERVICIO (Filas clave)');
  console.log('-'.repeat(100));
  
  const filasClaveActivos = IFE_ESF_MAPPINGS.filter(m => m.row >= 15 && m.row <= 51);
  
  console.log('Fila | Concepto                    | Acueducto      | Alcantarillado | Aseo           | TOTAL');
  console.log('-'.repeat(100));
  
  let totalesPorServicioMapeados = { acueducto: 0, alcantarillado: 0, aseo: 0 };
  
  for (const mapping of filasClaveActivos) {
    const valores = {};
    let totalFila = 0;
    
    for (const servicio of SERVICIOS) {
      const valor = await calcularValorMapeo(mapping, servicio);
      valores[servicio] = valor;
      totalFila += valor;
      totalesPorServicioMapeados[servicio] += valor;
    }
    
    if (totalFila !== 0) {
      console.log(
        `  ${mapping.row.toString().padEnd(4)} | ${mapping.desc.substring(0, 27).padEnd(27)} | ` +
        `${valores.acueducto.toLocaleString('es-CO').padStart(14)} | ` +
        `${valores.alcantarillado.toLocaleString('es-CO').padStart(14)} | ` +
        `${valores.aseo.toLocaleString('es-CO').padStart(14)} | ` +
        `${totalFila.toLocaleString('es-CO').padStart(14)}`
      );
    }
  }
  
  console.log('-'.repeat(100));
  console.log(
    `  ${'TOTAL ACTIVOS MAPEADOS'.padEnd(33)} | ` +
    `${totalesPorServicioMapeados.acueducto.toLocaleString('es-CO').padStart(14)} | ` +
    `${totalesPorServicioMapeados.alcantarillado.toLocaleString('es-CO').padStart(14)} | ` +
    `${totalesPorServicioMapeados.aseo.toLocaleString('es-CO').padStart(14)} | ` +
    `${(totalesPorServicioMapeados.acueducto + totalesPorServicioMapeados.alcantarillado + totalesPorServicioMapeados.aseo).toLocaleString('es-CO').padStart(14)}`
  );
  
  // 7. Diagnóstico final
  console.log('\n' + '='.repeat(80));
  console.log('🏁 DIAGNÓSTICO FINAL');
  console.log('='.repeat(80));
  
  const diffActivos = Math.abs(activosReales - totalActivosMapeados);
  const diffPasivos = Math.abs(pasivosReales - totalPasivosMapeados);
  const diffPatrimonio = Math.abs(patrimonioReal - totalPatrimonioMapeado);
  
  if (activosReales === VALOR_ESPERADO) {
    console.log('✅ ACTIVOS coinciden con valor esperado (65,921,695)');
  } else {
    console.log(`❌ ACTIVOS NO coinciden con valor esperado. Diferencia: ${(activosReales - VALOR_ESPERADO).toLocaleString('es-CO')}`);
  }
  
  if (diffActivos === 0) {
    console.log('✅ COBERTURA ACTIVOS: 100% - Los mapeos IFE capturan todos los activos');
  } else {
    console.log(`⚠️  COBERTURA ACTIVOS: ${((totalActivosMapeados / activosReales) * 100).toFixed(2)}% - Faltan ${diffActivos.toLocaleString('es-CO')}`);
  }
  
  if (diffPasivos === 0) {
    console.log('✅ COBERTURA PASIVOS: 100%');
  } else {
    console.log(`⚠️  COBERTURA PASIVOS: ${((totalPasivosMapeados / pasivosReales) * 100).toFixed(2)}% - Faltan ${diffPasivos.toLocaleString('es-CO')}`);
  }
  
  if (diffPatrimonio === 0) {
    console.log('✅ COBERTURA PATRIMONIO: 100%');
  } else {
    console.log(`⚠️  COBERTURA PATRIMONIO: ${((totalPatrimonioMapeado / patrimonioReal) * 100).toFixed(2)}% - Faltan ${diffPatrimonio.toLocaleString('es-CO')}`);
  }
  
  // Verificar suma de servicios
  const sumaTotalServicios = totalesPorServicioMapeados.acueducto + totalesPorServicioMapeados.alcantarillado + totalesPorServicioMapeados.aseo;
  if (sumaTotalServicios === totalActivosMapeados) {
    console.log('✅ CONSISTENCIA: Suma servicios = Total consolidado');
  } else {
    console.log(`⚠️  INCONSISTENCIA: Servicios (${sumaTotalServicios.toLocaleString('es-CO')}) ≠ Consolidado (${totalActivosMapeados.toLocaleString('es-CO')})`);
  }
  
  await sql.end();
  console.log('\n✅ Validación completada');
}

main().catch(err => {
  console.error('❌ Error:', err);
  sql.end();
  process.exit(1);
});