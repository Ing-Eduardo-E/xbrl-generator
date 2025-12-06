/**
 * Mapeos del Estado de Situación Financiera (ESF) para R414.
 *
 * Basado en la plantilla oficial R414Ind_ID20037_2024-12-31.xlsx - Hoja2
 * PUC según Resolución 414 CGN para empresas de servicios públicos.
 *
 * Columnas en Hoja2:
 * - I = Acueducto
 * - J = Alcantarillado
 * - K = Aseo
 * - P = Total
 */

import type { ESFMapping, ServiceColumnMapping } from '../../types';

// ============================================
// CONFIGURACIÓN DE COLUMNAS R414
// ============================================

/**
 * Columnas de servicio para R414 en Hoja2 (ESF).
 */
export const R414_SERVICE_COLUMNS: ServiceColumnMapping = {
  acueducto: 'I',
  alcantarillado: 'J',
  aseo: 'K',
  total: 'P',
};

// ============================================
// MAPEOS DE ACTIVOS
// ============================================

/**
 * Mapeos de Activos Corrientes y No Corrientes.
 */
export const R414_ESF_ACTIVOS: ESFMapping[] = [
  // =====================================================
  // ACTIVOS CORRIENTES (filas 14-32)
  // Basado en PUC Resolución 414 CGN para servicios públicos
  // =====================================================

  // Fila 15: Efectivo y equivalentes al efectivo
  // PUC R414: 11 - Efectivo y equivalentes al efectivo
  // Incluye: 1105 Caja, 1110 Depósitos instituciones financieras, 1120 Fondos en tránsito, 1133 Equivalentes
  // EXCLUIR: 1132 (Efectivo de uso restringido) que va en fila 16
  {
    row: 15,
    label: 'Efectivo y equivalentes al efectivo',
    pucPrefixes: ['11'],
    excludePrefixes: ['1132'],
  },

  // Fila 16: Efectivo de uso restringido corriente
  // PUC R414: 1132 - Efectivo de uso restringido
  {
    row: 16,
    label: 'Efectivo de uso restringido corriente',
    pucPrefixes: ['1132'],
  },

  // Fila 19: CXC por prestación de servicios públicos (SIN subsidios ni aprovechamiento)
  // PUC R414: 1318 - Prestación de servicios públicos
  // 131801 Energía, 131802 Acueducto, 131803 Alcantarillado, 131804 Aseo, 131805 Gas, 131806 Telecom
  // EXCLUIR: 131807-131812 (Subsidios)
  {
    row: 19,
    label: 'CXC servicios públicos (sin subsidios)',
    pucPrefixes: ['131801', '131802', '131803', '131804', '131805', '131806'],
  },

  // Fila 20: CXC por subsidios corrientes
  // PUC R414: 131807-131812 - Subsidios por servicio
  {
    row: 20,
    label: 'CXC subsidios corrientes',
    pucPrefixes: ['131807', '131808', '131809', '131810', '131811', '131812'],
  },

  // Fila 22: CXC por actividad de aprovechamiento corrientes
  // PUC R414: Parte de otras cuentas por cobrar relacionadas con reciclaje/aprovechamiento
  {
    row: 22,
    label: 'CXC aprovechamiento corrientes',
    pucPrefixes: ['138424'],
  },

  // Fila 24: CXC por venta de bienes corrientes
  // PUC R414: 1316 - Venta de bienes
  {
    row: 24,
    label: 'CXC venta de bienes corrientes',
    pucPrefixes: ['1316'],
  },

  // Fila 25: CXC a partes relacionadas corrientes
  // PUC R414: Parte de 1384 - Otras CXC (vinculados económicos)
  {
    row: 25,
    label: 'CXC partes relacionadas corrientes',
    pucPrefixes: ['138401', '138414'],
  },

  // Fila 26: Otras cuentas por cobrar corrientes
  // PUC R414: Todo el resto del grupo 13 que no está en las filas anteriores
  // 1311 Contribuciones/tasas, 1317 Prestación servicios, 1319 Servicios salud, 1324 Subvenciones, 1384 Otras CXC
  // EXCLUIR: 1386 Deterioro (CR), cuentas ya mapeadas arriba
  {
    row: 26,
    label: 'Otras CXC corrientes',
    pucPrefixes: [
      '1311',
      '1317',
      '1319',
      '1322',
      '1324',
      '1333',
      '1384',
      '1385',
      '1387',
    ],
    excludePrefixes: ['138401', '138414', '138424'],
  },

  // Fila 27: Deterioro acumulado de CXC (resta)
  // PUC R414: 1386 - Deterioro acumulado de cuentas por cobrar (CR)
  // 1388 - Deterioro acumulado de CXC a costo amortizado (CR)
  {
    row: 27,
    label: 'Deterioro CXC corrientes',
    pucPrefixes: ['1386', '1388'],
  },

  // Fila 28: Inventarios corrientes
  // PUC R414: 15 - Inventarios
  {
    row: 28,
    label: 'Inventarios corrientes',
    pucPrefixes: ['15'],
    excludePrefixes: ['1580'],
  },

  // Fila 30: Otros activos financieros corrientes
  // PUC R414: 12 - Inversiones e instrumentos derivados
  // EXCLUIR: 1280 Deterioro (CR)
  {
    row: 30,
    label: 'Otros activos financieros corrientes',
    pucPrefixes: ['12'],
    excludePrefixes: ['1280'],
  },

  // Fila 31: Otros activos no financieros corrientes
  // PUC R414: 19 - Otros activos (bienes de arte, etc.) - parte corriente
  {
    row: 31,
    label: 'Otros activos no financieros corrientes',
    pucPrefixes: ['19'],
  },

  // =====================================================
  // ACTIVOS NO CORRIENTES (filas 33-63)
  // =====================================================

  // Fila 34: Propiedades, planta y equipo (NETO)
  // PUC R414: 16 - Propiedades, planta y equipo
  // Incluye depreciación acumulada y deterioro como parte del grupo
  {
    row: 34,
    label: 'Propiedades, planta y equipo',
    pucPrefixes: ['16'],
  },

  // Fila 35: Efectivo de uso restringido no corriente
  // No común en el PUC R414, se usaría parte de inversiones LP restringidas
  {
    row: 35,
    label: 'Efectivo restringido no corriente',
    pucPrefixes: ['113210'],
  },

  // Fila 37: Inversiones en asociadas (método participación)
  // PUC R414: 1230 - Inversiones en asociadas contabilizadas por método de participación patrimonial
  {
    row: 37,
    label: 'Inversiones en asociadas',
    pucPrefixes: ['1230'],
  },

  // Fila 38: Inversiones en negocios conjuntos
  // PUC R414: 1233 - Inversiones en negocios conjuntos contabilizadas por método participación
  {
    row: 38,
    label: 'Inversiones en negocios conjuntos',
    pucPrefixes: ['1233'],
  },

  // Fila 39: Inversiones en controladas (subsidiarias)
  // PUC R414: 1227 - Inversiones en controladas contabilizadas por método participación
  {
    row: 39,
    label: 'Inversiones en controladas',
    pucPrefixes: ['1227'],
  },

  // Fila 40: Inversiones en entidades en liquidación
  // PUC R414: 1216 - Inversiones en entidades en liquidación
  {
    row: 40,
    label: 'Inversiones entidades en liquidación',
    pucPrefixes: ['1216'],
  },

  // Fila 53: Activos por impuestos diferidos
  // PUC R414: No hay cuenta específica en clase 1, se registra en cuentas de orden o ajustes
  // Generalmente vacío para estas entidades o en grupo 19
  {
    row: 53,
    label: 'Activos por impuestos diferidos',
    pucPrefixes: ['1905'],
  },

  // Fila 55: Planes de activos (beneficios empleados LP)
  // PUC R414: No es común, generalmente no aplica
  {
    row: 55,
    label: 'Planes de activos',
    pucPrefixes: ['1920'],
  },

  // Fila 57: Propiedad de inversión
  // PUC R414: 1975 - Bienes en proceso de adquisición, 197505 Terrenos, 197510 Edificaciones
  {
    row: 57,
    label: 'Propiedad de inversión',
    pucPrefixes: ['1975'],
  },

  // Fila 59: Activos intangibles
  // PUC R414: 17 - Bienes de uso público e históricos (para entidades públicas) o
  // Intangibles se registran diferente en sector público
  {
    row: 59,
    label: 'Activos intangibles',
    pucPrefixes: ['17'],
  },

  // Fila 61: Otros activos no corrientes
  // PUC: 19 - Otros activos (bienes de arte, cultura, etc.)
  {
    row: 61,
    label: 'Otros activos no corrientes',
    pucPrefixes: ['19'],
  },
];

// ============================================
// MAPEOS DE PASIVOS
// ============================================

/**
 * Mapeos de Pasivos Corrientes y No Corrientes.
 */
export const R414_ESF_PASIVOS: ESFMapping[] = [
  // =====================================================
  // PASIVOS CORRIENTES (filas 67-88)
  // PUC Resolución 414 CGN para empresas de servicios públicos
  // =====================================================

  // Fila 69: Provisiones corrientes por beneficios a empleados
  // PUC R414: 25 - Beneficios a los empleados
  // 2511 - Beneficios a empleados a corto plazo (nómina, cesantías, vacaciones, etc.)
  {
    row: 69,
    label: 'Provisiones beneficios empleados corrientes',
    pucPrefixes: ['2511'],
  },

  // Fila 70: Otras provisiones corrientes
  // PUC R414: 27 - Provisiones
  // 2701 - Litigios y demandas, 2707 - Garantías, 2790 - Provisiones diversas
  {
    row: 70,
    label: 'Otras provisiones corrientes',
    pucPrefixes: ['27'],
  },

  // Fila 73: Cuentas por pagar por adquisición de servicios
  // PUC R414: 2401 - Adquisición de bienes y servicios nacionales (parte servicios)
  {
    row: 73,
    label: 'Cuentas por pagar servicios',
    pucPrefixes: ['240101'],
  },

  // Fila 74: Cuentas por pagar por adquisición de bienes
  // PUC R414: 2401 - Adquisición de bienes y servicios nacionales (parte bienes)
  // 2406 - Adquisición de bienes y servicios del exterior
  {
    row: 74,
    label: 'Cuentas por pagar proveedores',
    pucPrefixes: ['2401', '2406'],
    excludePrefixes: ['240101'],
  },

  // Fila 75: Cuentas por pagar a partes relacionadas corrientes
  // PUC R414: Parte de 2490 - Otras cuentas por pagar (vinculados, dividendos)
  {
    row: 75,
    label: 'Cuentas por pagar partes relacionadas',
    pucPrefixes: ['249056', '249057'],
  },

  // Fila 76: Otras cuentas comerciales por pagar corrientes
  // PUC R414: 2490 - Otras cuentas por pagar (resto)
  // 2424 - Descuentos de nómina, 2407 - Recursos a favor de terceros
  {
    row: 76,
    label: 'Otras cuentas por pagar',
    pucPrefixes: ['2424', '2407', '2490'],
    excludePrefixes: ['249056', '249057'],
  },

  // Fila 78: Emisión de títulos de deuda corrientes
  // PUC R414: 22 - Emisión y colocación de títulos de deuda
  // 2222 - Financiamiento interno CP, 2224 - Financiamiento externo CP
  {
    row: 78,
    label: 'Títulos de deuda corrientes',
    pucPrefixes: ['2222', '2224'],
  },

  // Fila 79: Préstamos por pagar corrientes
  // PUC R414: 23 - Préstamos por pagar
  // 2313 - Financiamiento interno CP, 2316 - Financiamiento externo CP
  {
    row: 79,
    label: 'Préstamos por pagar corrientes',
    pucPrefixes: ['2313', '2316'],
  },

  // Fila 80: Pasivo por impuesto a las ganancias corriente
  // PUC R414: 244001 - Impuesto sobre la renta y complementarios
  {
    row: 80,
    label: 'Impuesto ganancias por pagar',
    pucPrefixes: ['244001'],
  },

  // Fila 82: Ingresos recibidos por anticipado corrientes
  // PUC R414: 2910 - Ingresos recibidos por anticipado
  {
    row: 82,
    label: 'Ingresos diferidos corrientes',
    pucPrefixes: ['2910'],
  },

  // Fila 83: Pasivos por impuestos diferidos corrientes
  // PUC R414: 2918 - Pasivos por impuestos diferidos
  {
    row: 83,
    label: 'Pasivos impuestos diferidos corrientes',
    pucPrefixes: ['2918'],
  },

  // Fila 86: Otros pasivos financieros corrientes
  // PUC R414: 21 - Operaciones de banca central (si aplica)
  {
    row: 86,
    label: 'Otros pasivos financieros corrientes',
    pucPrefixes: ['21'],
  },

  // Fila 87: Otros pasivos no financieros corrientes
  // PUC R414: 2436 - Retención en la fuente e impuesto de timbre
  // 2440 - Impuestos, contribuciones y tasas (excepto renta)
  // 2445 - IVA, 29 - Otros pasivos
  {
    row: 87,
    label: 'Otros pasivos no financieros corrientes',
    pucPrefixes: ['2436', '2440', '2445', '29'],
    excludePrefixes: ['244001'],
  },

  // =====================================================
  // PASIVOS NO CORRIENTES (filas 89-110)
  // =====================================================

  // Fila 91: Provisiones no corrientes por beneficios a empleados
  // PUC R414: 2512 - Beneficios a empleados a largo plazo
  // 2513 - Beneficios por terminación, 2514 - Pensiones, 2515 - Otros posempleo
  {
    row: 91,
    label: 'Provisiones beneficios empleados LP',
    pucPrefixes: ['2512', '2513', '2514', '2515'],
  },

  // Fila 92: Otras provisiones no corrientes
  // PUC R414: Provisiones LP (generalmente se clasifican todas en 27)
  {
    row: 92,
    label: 'Otras provisiones no corrientes',
    pucPrefixes: ['2790'],
  },

  // Fila 95: Cuentas por pagar por adquisición de bienes no corrientes
  // PUC R414: 2495 - Cuentas por pagar a costo amortizado (LP)
  {
    row: 95,
    label: 'Cuentas por pagar bienes LP',
    pucPrefixes: ['2495'],
  },

  // Fila 100: Emisión de títulos de deuda no corrientes
  // PUC R414: 2223 - Financiamiento interno LP, 2225 - Financiamiento externo LP
  {
    row: 100,
    label: 'Títulos de deuda LP',
    pucPrefixes: ['2223', '2225'],
  },

  // Fila 101: Préstamos por pagar no corrientes
  // PUC R414: 2314 - Financiamiento interno LP, 2317 - Financiamiento externo LP
  {
    row: 101,
    label: 'Préstamos por pagar LP',
    pucPrefixes: ['2314', '2317'],
  },

  // Fila 103: Pasivos por impuestos diferidos no corrientes
  // PUC R414: 2918 - Pasivos por impuestos diferidos (si es LP)
  {
    row: 103,
    label: 'Pasivos por impuestos diferidos LP',
    pucPrefixes: ['2918'],
  },

  // Fila 105: Ingresos recibidos por anticipado no corrientes
  // PUC R414: 2990 - Otros pasivos diferidos
  {
    row: 105,
    label: 'Ingresos diferidos LP',
    pucPrefixes: ['2990'],
  },

  // Fila 108: Otros pasivos financieros no corrientes
  // PUC R414: 26 - Operaciones con instrumentos derivados
  {
    row: 108,
    label: 'Otros pasivos financieros LP',
    pucPrefixes: ['26'],
  },
];

// ============================================
// MAPEOS DE PATRIMONIO
// ============================================

/**
 * Mapeos de Patrimonio.
 */
export const R414_ESF_PATRIMONIO: ESFMapping[] = [
  // =====================================================
  // PATRIMONIO (filas 112-130)
  // PUC Resolución 414 CGN - Clase 32: Patrimonio de las empresas
  // =====================================================

  // Fila 113: Aportes sociales (cooperativas, fondos)
  // PUC R414: 3203 - Aportes sociales
  {
    row: 113,
    label: 'Aportes sociales',
    pucPrefixes: ['3203'],
  },

  // Fila 114: Capital suscrito y pagado
  // PUC R414: 3204 - Capital suscrito y pagado
  {
    row: 114,
    label: 'Capital suscrito y pagado',
    pucPrefixes: ['3204'],
  },

  // Fila 115: Capital fiscal (entidades del estado)
  // PUC R414: 3208 - Capital fiscal
  {
    row: 115,
    label: 'Capital fiscal',
    pucPrefixes: ['3208'],
  },

  // Fila 116: Prima en colocación de acciones
  // PUC R414: 3210 - Prima en colocación de acciones, cuotas o partes de interés social
  {
    row: 116,
    label: 'Prima en colocación',
    pucPrefixes: ['3210'],
  },

  // Fila 117: Reserva legal
  // PUC R414: 321501 - Reservas de Ley
  {
    row: 117,
    label: 'Reserva legal',
    pucPrefixes: ['321501'],
  },

  // Fila 118: Otras reservas
  // PUC R414: 3215 - Reservas (estatutarias, ocasionales, para readquisición)
  {
    row: 118,
    label: 'Otras reservas',
    pucPrefixes: ['3215'],
    excludePrefixes: ['321501'],
  },

  // Fila 119: Dividendos decretados en especie
  // PUC R414: 3220 - Dividendos y participaciones decretados en especie
  {
    row: 119,
    label: 'Dividendos decretados especie',
    pucPrefixes: ['3220'],
  },

  // Fila 120: Ganancias acumuladas (resultados)
  // PUC R414: 3225 - Resultados de ejercicios anteriores
  // 3230 - Resultado del ejercicio
  {
    row: 120,
    label: 'Ganancias acumuladas',
    pucPrefixes: ['3225', '3230'],
  },

  // Fila 121: Impactos por transición al nuevo marco NIIF
  // PUC R414: No hay cuenta específica, generalmente en ORI
  {
    row: 121,
    label: 'Impactos transición NIIF',
    pucPrefixes: ['3290'],
  },

  // Fila 122-130: Otro Resultado Integral (ORI)
  // PUC R414: 3271-3281 - Ganancias o pérdidas en ORI

  // Fila 123: ORI Inversiones valor razonable
  // PUC R414: 3271 - Ganancias o pérdidas en inversiones de administración de liquidez
  {
    row: 123,
    label: 'ORI Inversiones',
    pucPrefixes: ['3271'],
  },

  // Fila 124: ORI Coberturas de flujos de efectivo
  // PUC R414: 3272 - Ganancias o pérdidas por coberturas de flujos de efectivo
  {
    row: 124,
    label: 'ORI Coberturas flujos efectivo',
    pucPrefixes: ['3272'],
  },

  // Fila 126: ORI Método de participación
  // PUC R414: 3274 - G/P por método participación en controladas
  // 3275 - G/P por método participación en asociadas
  // 3276 - G/P por método participación en negocios conjuntos
  {
    row: 126,
    label: 'ORI Método participación',
    pucPrefixes: ['3274', '3275', '3276'],
  },

  // Fila 127: ORI Cobertura inversión neta en extranjero
  // PUC R414: 3273 - Ganancias o pérdidas por cobertura de inversión neta en negocio extranjero
  {
    row: 127,
    label: 'ORI Cobertura inversión extranjero',
    pucPrefixes: ['3273'],
  },

  // Fila 129: ORI Beneficios a empleados (actuariales)
  // PUC R414: 3280 - Ganancias o pérdidas por planes de beneficios a los empleados
  {
    row: 129,
    label: 'ORI Beneficios empleados',
    pucPrefixes: ['3280'],
  },

  // Fila 130: ORI Conversión de estados financieros
  // PUC R414: 3281 - Ganancias o pérdidas por conversión de estados financieros
  {
    row: 130,
    label: 'ORI Conversión estados financieros',
    pucPrefixes: ['3281'],
  },
];

// ============================================
// EXPORTACIÓN COMBINADA
// ============================================

/**
 * Todos los mapeos ESF de R414 combinados.
 */
export const R414_ESF_MAPPINGS: ESFMapping[] = [
  ...R414_ESF_ACTIVOS,
  ...R414_ESF_PASIVOS,
  ...R414_ESF_PATRIMONIO,
];
