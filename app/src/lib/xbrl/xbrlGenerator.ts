/**
 * Generador de archivos XBRL para la SSPD Colombia.
 * Genera paquete completo con instancia XBRL, template y mapeos.
 */

import JSZip from 'jszip';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances, balanceSessions } from '../../../drizzle/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { 
  getTaxonomyConfig, 
  getXbrlConcept, 
  getConceptIdWithSuffix,
  getTaxonomyConfigForYear,
  getDecimalsFromRounding,
  getRoundingDescription,
  getRoundingXBRLValue,
  ESF_CONCEPTS,
  INFO_CONCEPTS,
  TAXONOMY_CATALOG,
  ROUNDING_DEGREES,
  type NiifGroup,
  type TaxonomyConfig,
  type TaxonomyYear,
  type RoundingDegree
} from './taxonomyConfig';

export interface XBRLGenerationOptions {
  /** Grupo NIIF (grupo1, grupo2, grupo3, r414, r533, ife) */
  niifGroup: NiifGroup;
  /** ID de la empresa (RUPS) */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** Fecha de corte (YYYY-MM-DD) */
  reportDate: string;
  /** Año de taxonomía SSPD (2017-2025) */
  taxonomyYear?: TaxonomyYear;
  /** NIT de la empresa */
  nit?: string;
  /** Información sobre la naturaleza del negocio */
  businessNature?: string;
  /** Fecha de inicio de operaciones */
  startDate?: string;
  /** Grado de redondeo utilizado (1=Pesos, 2=Miles, 3=Millones, 4=Pesos redondeados a miles) */
  roundingDegree?: RoundingDegree;
  /** ¿Presenta información reexpresada? */
  hasRestatedInfo?: string;
  /** Período de información reexpresada */
  restatedPeriod?: string;
}

export interface XBRLPackage {
  /** Nombre del archivo ZIP */
  fileName: string;
  /** Contenido en base64 */
  fileData: string;
  /** Tipo MIME */
  mimeType: string;
}

interface ServiceData {
  service: string;
  accounts: Array<{
    code: string;
    name: string;
    value: number;
    isLeaf: boolean;
    level: number;
    class: string;
  }>;
}

/**
 * Genera el paquete completo de archivos XBRL
 */
export async function generateXBRLPackage(options: XBRLGenerationOptions): Promise<XBRLPackage> {
  // Usar configuración dinámica por año si se especifica
  const taxonomyYear = options.taxonomyYear || '2024';
  const config = getTaxonomyConfigForYear(options.niifGroup, taxonomyYear);
  const zip = new JSZip();
  
  // Obtener datos de la sesión actual
  const session = await db
    .select()
    .from(balanceSessions)
    .orderBy(desc(balanceSessions.createdAt))
    .limit(1);
  
  const sessionData = session[0];
  
  // Obtener distribución de porcentajes
  let distribution: Record<string, number> = { acueducto: 40, alcantarillado: 35, aseo: 25 };
  if (sessionData?.distribution) {
    try {
      distribution = JSON.parse(sessionData.distribution);
    } catch {
      // Usar distribución por defecto
    }
  }
  
  // Obtener datos de cuentas consolidadas
  const consolidatedAccounts = await db
    .select()
    .from(workingAccounts)
    .orderBy(workingAccounts.code);
  
  // Obtener datos por servicio
  const services = ['acueducto', 'alcantarillado', 'aseo'];
  const serviceDataList: ServiceData[] = [];
  
  for (const serviceName of services) {
    const accounts = await db
      .select()
      .from(serviceBalances)
      .where(eq(serviceBalances.service, serviceName))
      .orderBy(serviceBalances.code);
    
    serviceDataList.push({
      service: serviceName,
      accounts: accounts.map(a => ({
        code: a.code,
        name: a.name,
        value: a.value,
        isLeaf: a.isLeaf ?? false,
        level: a.level ?? 1,
        class: a.class ?? '',
      })),
    });
  }
  
  const baseFileName = `${config.prefix}_Individual_${options.companyId}_${options.reportDate}`;
  
  // Determinar servicios activos desde la distribución
  const activeServices = Object.keys(distribution).filter(s => distribution[s] > 0);
  
  // 1. Generar archivo .xbrl (instancia XBRL)
  const xbrlContent = generateXBRLInstance(options, config, taxonomyYear);
  zip.file(`${baseFileName}.xbrl`, xbrlContent);
  
  // 2. Generar archivo .xbrlt (template de mapeo)
  const xbrltContent = generateXBRLTemplate(options, config, serviceDataList, distribution, taxonomyYear);
  zip.file(`${baseFileName}.xbrlt`, xbrltContent);
  
  // 3. Generar archivo .xml (mapeo Excel-XBRL)
  const xmlContent = generateExcelMapping(options, config, consolidatedAccounts, activeServices);
  zip.file(`${baseFileName}.xml`, xmlContent);
  
  // 4. Generar archivo README
  const readmeContent = generateReadme(options, config, distribution);
  zip.file('README.txt', readmeContent);
  
  // 5. Generar resumen de la generación
  const summaryContent = generateSummary(options, config, consolidatedAccounts, serviceDataList);
  zip.file('RESUMEN.txt', summaryContent);
  
  // Generar el ZIP
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const base64 = Buffer.from(zipBuffer).toString('base64');
  
  return {
    fileName: `${baseFileName}.zip`,
    fileData: base64,
    mimeType: 'application/zip',
  };
}

/**
 * Genera el archivo .xbrl (instancia XBRL)
 * 
 * Este archivo es la instancia XBRL completa con:
 * - Contextos (períodos y dimensiones)
 * - Unidades de medida
 * - Información de la entidad
 */
function generateXBRLInstance(options: XBRLGenerationOptions, config: TaxonomyConfig, taxonomyYear: TaxonomyYear): string {
  const ifrsNamespace = TAXONOMY_CATALOG.ifrsUrl;
  const year = options.reportDate.split('-')[0];
  const endDate = options.reportDate;
  const startDate = options.startDate || `${year}-01-01`;
  
  const decimalsValue = getDecimalsFromRounding(options.roundingDegree);
  const roundingDesc = getRoundingDescription(options.roundingDegree);
  const roundingXBRLValue = getRoundingXBRLValue(options.roundingDegree);
  
  // Generar contextos para el período de reporte
  const instantContextId = 'ctx_instant';
  const durationContextId = 'ctx_duration';
  const prevInstantContextId = 'ctx_prev_instant';
  
  // Contextos por servicio
  const services = ['acueducto', 'alcantarillado', 'aseo'];
  const serviceContexts = services.map(svc => {
    const memberName = svc.charAt(0).toUpperCase() + svc.slice(1) + 'Member';
    return `  <xbrli:context id="ctx_${svc}">
    <xbrli:entity>
      <xbrli:identifier scheme="${TAXONOMY_CATALOG.entityScheme}">${options.companyId}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:instant>${endDate}</xbrli:instant>
    </xbrli:period>
    <xbrli:scenario>
      <xbrldi:explicitMember dimension="${config.prefix}:EstadoSituacionFinancieraEje">${config.prefix}:${memberName}</xbrldi:explicitMember>
    </xbrli:scenario>
  </xbrli:context>`;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ============================================================== -->
<!-- XBRL Instance Document - SSPD Colombia                         -->
<!-- Generated by: XBRL Generator Web App                           -->
<!-- ============================================================== -->
<!-- Empresa: ${escapeXml(options.companyName)} -->
<!-- ID RUPS: ${options.companyId} -->
<!-- NIT: ${options.nit || 'No especificado'} -->
<!-- Fecha de reporte: ${options.reportDate} -->
<!-- Año de taxonomía: ${taxonomyYear} -->
<!-- Grado de redondeo: ${roundingDesc} (decimals=${decimalsValue}) -->
<!-- ============================================================== -->
<xbrli:xbrl 
  xmlns:xbrli="http://www.xbrl.org/2003/instance" 
  xmlns:link="http://www.xbrl.org/2003/linkbase" 
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:${config.prefix}="${config.namespace}"
  xmlns:ifrs-full="${ifrsNamespace}ifrs-full"
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
  xmlns:xbrldi="http://xbrl.org/2006/xbrldi">
  
  <!-- ============================================================== -->
  <!-- SCHEMA REFERENCE                                               -->
  <!-- ============================================================== -->
  <link:schemaRef xlink:type="simple" xlink:href="${config.entryPoint}"/>
  
  <!-- ============================================================== -->
  <!-- CONTEXTS - Períodos y Dimensiones                              -->
  <!-- ============================================================== -->
  
  <!-- Contexto Instant (fecha de corte) -->
  <xbrli:context id="${instantContextId}">
    <xbrli:entity>
      <xbrli:identifier scheme="${TAXONOMY_CATALOG.entityScheme}">${options.companyId}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:instant>${endDate}</xbrli:instant>
    </xbrli:period>
  </xbrli:context>
  
  <!-- Contexto Duration (período del reporte) -->
  <xbrli:context id="${durationContextId}">
    <xbrli:entity>
      <xbrli:identifier scheme="${TAXONOMY_CATALOG.entityScheme}">${options.companyId}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:startDate>${startDate}</xbrli:startDate>
      <xbrli:endDate>${endDate}</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  
  <!-- Contexto Instant Período Anterior (comparativo) -->
  <xbrli:context id="${prevInstantContextId}">
    <xbrli:entity>
      <xbrli:identifier scheme="${TAXONOMY_CATALOG.entityScheme}">${options.companyId}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:instant>${parseInt(year) - 1}-12-31</xbrli:instant>
    </xbrli:period>
  </xbrli:context>
  
  <!-- Contextos por Servicio -->
${serviceContexts}
  
  <!-- ============================================================== -->
  <!-- UNITS - Unidades de Medida                                     -->
  <!-- ============================================================== -->
  <xbrli:unit id="COP">
    <xbrli:measure>iso4217:COP</xbrli:measure>
  </xbrli:unit>
  
  <xbrli:unit id="pure">
    <xbrli:measure>xbrli:pure</xbrli:measure>
  </xbrli:unit>
  
  <!-- ============================================================== -->
  <!-- FACTS - Información General                                    -->
  <!-- ============================================================== -->
  
  <!-- Nombre de la entidad -->
  <ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification contextRef="${durationContextId}">${escapeXml(options.companyName)}</ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification>
  
  <!-- ID RUPS -->
  <${config.prefix}:IdentificacionDeLaEmpresaRUPS contextRef="${durationContextId}">${options.companyId}</${config.prefix}:IdentificacionDeLaEmpresaRUPS>
  
  <!-- NIT -->
  <${config.prefix}:NumeroDeIdentificacionTributariaNIT contextRef="${durationContextId}">${options.nit || ''}</${config.prefix}:NumeroDeIdentificacionTributariaNIT>
  
  <!-- Naturaleza del negocio -->
  <${config.prefix}:InformacionARevelarSobreLaNaturalezaDelNegocioIndividualSeparado contextRef="${durationContextId}">${escapeXml(options.businessNature || 'Servicios públicos domiciliarios')}</${config.prefix}:InformacionARevelarSobreLaNaturalezaDelNegocioIndividualSeparado>
  
  <!-- Fecha de cierre -->
  <ifrs-full:DateOfEndOfReportingPeriod2013 contextRef="${durationContextId}">${endDate}</ifrs-full:DateOfEndOfReportingPeriod2013>
  
  <!-- Grado de redondeo (valor exacto de enumeración TipoGradoRedondeo) -->
  <${config.prefix}:GradoDeRedondeoUtilizadoEnLosEstadosFinancieros contextRef="${durationContextId}">${roundingXBRLValue}</${config.prefix}:GradoDeRedondeoUtilizadoEnLosEstadosFinancieros>
  
  <!-- ============================================================== -->
  <!-- NOTA: Los valores del Estado de Situación Financiera           -->
  <!-- deben ser completados usando XBRL Express después de           -->
  <!-- importar la plantilla Excel generada.                          -->
  <!-- ============================================================== -->
  
</xbrli:xbrl>`;
}

/**
 * Genera el archivo .xbrlt (template de mapeo XBRL)
 * 
 * Este archivo sigue el formato exacto requerido por XBRL Express (Reporting Standard).
 * Los identificadores de entidad usan placeholders (_) que XBRL Express reemplaza
 * con los valores reales de scheme y company definidos fuera de los contextos.
 */
function generateXBRLTemplate(
  options: XBRLGenerationOptions, 
  config: TaxonomyConfig,
  serviceData: ServiceData[],
  distribution: Record<string, number>,
  taxonomyYear: TaxonomyYear
): string {
  const year = options.reportDate.split('-')[0];
  const endDate = options.reportDate;
  const startDate = options.startDate || `${year}-01-01`;
  
  // IDs de contexto siguiendo el patrón de XBRL Express
  // id4 = duration (periodo), id5+ = instant con dimensiones por servicio
  let contextIdCounter = 4;
  
  // Contexto de duración (para información general)
  const durationContextId = `id${contextIdCounter++}`;
  
  // Mapeo de servicios a sus Members XBRL
  const serviceMembers = [
    { id: 'acueducto', member: 'AcueductoMember' },
    { id: 'alcantarillado', member: 'AlcantarilladoMember' },
    { id: 'aseo', member: 'AseoMember' },
    { id: 'energia', member: 'EnergiaElectricaMember' },
    { id: 'gas', member: 'GasNaturalMember' },
    { id: 'glp', member: 'GasLicuadoDePetroleoMember' },
    { id: 'otros', member: 'OtrasActividadesNoVigiladasMember' },
    { id: 'total', member: 'TotalMember' }
  ];
  
  // Generar contextos para cada servicio (instant con dimensión)
  const serviceContexts = serviceMembers.map(svc => {
    const ctxId = `id${contextIdCounter++}`;
    return `      <context id="${ctxId}">
        <entity>
          <xbrli:identifier scheme="_">_</xbrli:identifier>
        </entity>
        <period>
          <instant>${endDate}</instant>
        </period>
        <scenario>
          <xbrldi:explicitMember dimension="${config.prefix}:EstadoSituacionFinancieraEje">${config.prefix}:${svc.member}</xbrldi:explicitMember>
        </scenario>
      </context>`;
  }).join('\n');

  // URLs dinámicas según el año de taxonomía seleccionado
  // IMPORTANTE: Usar "/" entre baseUrl y "Corte_"
  const sspdSchemaUrl = `${TAXONOMY_CATALOG.baseUrl}/Corte_${taxonomyYear}/grupo1/Comun/co-sspd-ef-Grupo1_${taxonomyYear}-12-31.xsd`;
  const ifrsNamespace = TAXONOMY_CATALOG.ifrsUrl;
  const ifrsSchemaUrl = `${TAXONOMY_CATALOG.ifrsUrl}full_ifrs/full_ifrs-cor_2022-03-24.xsd`;
  
  // El schemaLocation debe incluir los esquemas necesarios
  const schemaLocation = `http://www.reportingstandard.com/map/4 https://www.reportingstandard.com/schemas/mapper/mapper-2021.xsd http://xbrl.org/2006/xbrldi http://www.xbrl.org/2006/xbrldi-2006.xsd ${config.namespace} ${sspdSchemaUrl} ${ifrsNamespace}/ifrs-full ${ifrsSchemaUrl}`;

  return `<xbrlMap xmlns="http://www.reportingstandard.com/map/4" xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:${config.prefix}="${config.namespace}" xmlns:ifrs-full="${ifrsNamespace}/ifrs-full" xmlns:iso4217="http://www.xbrl.org/2003/iso4217" xmlns:xbrldi="http://xbrl.org/2006/xbrldi" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${schemaLocation}">
  <datasources>
    <source id="source0" class="com.ihr.xbrl.mapper.source.ExcelDataSource" config="${config.prefix}_Individual_${options.companyId}_${options.reportDate}.xml"/>
  </datasources>
  <keys/>
  <instance>
    <dts>
      <file>${config.entryPoint}</file>
    </dts>
    <contexts>
      <scheme>http://www.sui.gov.co/rups</scheme>
      <company>${options.companyId}</company>
      <context id="${durationContextId}">
        <entity>
          <xbrli:identifier scheme="_">_</xbrli:identifier>
        </entity>
        <period>
          <startDate>${startDate}</startDate>
          <endDate>${endDate}</endDate>
        </period>
      </context>
${serviceContexts}
    </contexts>
    <units>
      <unit id="COP">
        <measure>iso4217:COP</measure>
      </unit>
      <unit id="pure">
        <measure>xbrli:pure</measure>
      </unit>
    </units>
  </instance>
</xbrlMap>`;
}

/**
 * Genera el archivo .xml de mapeo Excel-XBRL
 * 
 * Este archivo define exactamente qué celda del Excel corresponde a qué concepto XBRL.
 * La estructura sigue el formato requerido por XBRL Express.
 * 
 * Estructura:
 * - Hoja1: Información general (columna E, filas 12-22)
 * - Hoja2: ESF (columnas I-Q, filas 15-70)
 *   - Columna I: Total (sin sufijo)
 *   - Columna J: Acueducto (sufijo 16)
 *   - Columna K: Alcantarillado (sufijo 18)
 *   - Columna L: Aseo (sufijo 20)
 *   - Columnas M-Q: Otros servicios
 */
function generateExcelMapping(
  options: XBRLGenerationOptions, 
  config: TaxonomyConfig,
  accounts: Array<{ code: string; name: string; value: number }>,
  activeServices: string[] = ['acueducto', 'alcantarillado', 'aseo']
): string {
  const mappings: string[] = [];
  
  // 1. Mapeos de Información General (Hoja1)
  // Estos van exactamente como en el ejemplo: solo mapId y cell
  for (const infoConcept of INFO_CONCEPTS) {
    const mapEntry = `  <map>
    <mapId>${infoConcept.concept}</mapId>
    <cell>Hoja1!E${infoConcept.row}</cell>
  </map>`;
    mappings.push(mapEntry);
  }
  
  // 2. Mapeos del Estado de Situación Financiera (Hoja2)
  for (const esfConcept of ESF_CONCEPTS) {
    // Mapeo para columna Total (I) - sin sufijo
    const totalMap = `  <map>
    <mapId>${esfConcept.concept}</mapId>
    <cell>Hoja2!I${esfConcept.row}</cell>
  </map>`;
    mappings.push(totalMap);
    
    // Mapeos por servicio activo
    for (const service of config.services) {
      // Saltar el servicio 'total' ya que se manejó arriba
      if (service.id === 'total' || service.id === 'other') continue;
      
      // Solo incluir servicios activos
      if (!activeServices.includes(service.id)) continue;
      
      // Usar el sufijo correcto según el tipo de concepto (IFRS vs SSPD)
      const conceptWithSuffix = getConceptIdWithSuffix(
        esfConcept.concept, 
        service.ifrsSuffix, 
        service.sspdSuffix
      );
      
      const serviceMap = `  <map>
    <mapId>${conceptWithSuffix}</mapId>
    <cell>Hoja2!${service.column}${esfConcept.row}</cell>
  </map>`;
      mappings.push(serviceMap);
    }
  }

  // El formato debe ser exactamente como el ejemplo: sin declaración XML ni comentarios
  return `<!-- Sample configuration file for ExcelDataSource content -->
<XBRLDataSourceExcelMap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.reportingstandard.com/schemas/mapper/XBRLDataSourceExcelMapSchema.xsd">
${mappings.join('\n')}
</XBRLDataSourceExcelMap>`;
}

/**
 * Escapa caracteres especiales para XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera el archivo README con instrucciones
 */
function generateReadme(
  options: XBRLGenerationOptions, 
  config: ReturnType<typeof getTaxonomyConfig>,
  distribution: Record<string, number>
): string {
  return `================================================================================
GENERADOR DE TAXONOMÍAS XBRL - PAQUETE DE ARCHIVOS
================================================================================

Empresa: ${options.companyName}
RUPS: ${options.companyId}
Grupo NIIF: ${config.name}
Fecha de reporte: ${options.reportDate}
Grado de redondeo: ${getRoundingDescription(options.roundingDegree)} (decimals=${getDecimalsFromRounding(options.roundingDegree)})
Generado: ${new Date().toLocaleString('es-CO')}

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

1. ${config.prefix}_Individual_${options.companyId}_${options.reportDate}.xbrl
   → Archivo de instancia XBRL (estructura base)

2. ${config.prefix}_Individual_${options.companyId}_${options.reportDate}.xbrlt  
   → Template de mapeo con contextos y dimensiones

3. ${config.prefix}_Individual_${options.companyId}_${options.reportDate}.xml
   → Archivo de mapeo Excel → conceptos XBRL

4. README.txt
   → Este archivo con instrucciones

5. RESUMEN.txt
   → Resumen de la generación y totales

================================================================================
DISTRIBUCIÓN POR SERVICIOS
================================================================================

${Object.entries(distribution).map(([service, pct]) => 
  `• ${service.charAt(0).toUpperCase() + service.slice(1)}: ${pct}%`
).join('\n')}

================================================================================
INSTRUCCIONES DE USO
================================================================================

PASO 1: Preparar archivos
   1. Extraiga todos los archivos de este ZIP en una carpeta
   2. Descargue también el archivo Excel generado por la aplicación

PASO 2: Abrir en XBRL Express
   1. Abra XBRL Express
   2. Vaya a Archivo → Abrir plantilla (.xbrlt)
   3. Seleccione el archivo .xbrlt de este paquete
   4. XBRL Express cargará la configuración automáticamente

PASO 3: Cargar datos del Excel
   1. Cuando XBRL Express solicite el archivo Excel, seleccione el .xlsx
   2. Los datos se mapearán automáticamente a los conceptos XBRL
   3. Revise que todos los valores estén correctos

PASO 4: Completar hojas restantes
   Las siguientes hojas requieren diligenciamiento manual:
   • Notas explicativas
   • Políticas contables  
   • Revelaciones específicas
   • Estados complementarios

PASO 5: Validar
   1. Use la función de validación de XBRL Express
   2. Corrija cualquier error reportado
   3. Repita hasta que no haya errores

PASO 6: Generar archivo final
   1. Vaya a Archivo → Exportar → XBRL Instance
   2. Guarde el archivo .xbrl final

PASO 7: Certificar en SUI
   1. Ingrese a la plataforma SUI
   2. Suba el archivo .xbrl generado
   3. Complete el proceso de certificación

================================================================================
SOPORTE
================================================================================

Si encuentra problemas:
1. Verifique que el balance consolidado tenga la estructura correcta
2. Revise que los códigos PUC sean válidos
3. Asegúrese de usar la última versión de XBRL Express

================================================================================
`;
}

/**
 * Genera resumen de la generación
 */
function generateSummary(
  options: XBRLGenerationOptions,
  config: ReturnType<typeof getTaxonomyConfig>,
  consolidatedAccounts: Array<{ code: string; value: number; isLeaf: boolean }>,
  serviceData: ServiceData[]
): string {
  // Calcular totales consolidados
  const leafAccounts = consolidatedAccounts.filter(a => a.isLeaf);
  const totals: Record<string, number> = {
    activos: 0,
    pasivos: 0,
    patrimonio: 0,
    ingresos: 0,
    gastos: 0,
    costos: 0,
  };
  
  for (const acc of leafAccounts) {
    const firstDigit = acc.code.charAt(0);
    switch (firstDigit) {
      case '1': totals.activos += acc.value; break;
      case '2': totals.pasivos += acc.value; break;
      case '3': totals.patrimonio += acc.value; break;
      case '4': totals.ingresos += acc.value; break;
      case '5': totals.gastos += acc.value; break;
      case '6': totals.costos += acc.value; break;
    }
  }
  
  // Calcular totales por servicio
  const serviceSummaries = serviceData.map(sd => {
    const leafs = sd.accounts.filter(a => a.isLeaf);
    let activos = 0;
    let pasivos = 0;
    let patrimonio = 0;
    
    for (const acc of leafs) {
      const firstDigit = acc.code.charAt(0);
      switch (firstDigit) {
        case '1': activos += acc.value; break;
        case '2': pasivos += acc.value; break;
        case '3': patrimonio += acc.value; break;
      }
    }
    
    return {
      service: sd.service,
      activos,
      pasivos,
      patrimonio,
      ecuacion: activos - (pasivos + patrimonio),
    };
  });

  const formatNumber = (n: number) => n.toLocaleString('es-CO');

  return `================================================================================
RESUMEN DE GENERACIÓN XBRL
================================================================================

Empresa: ${options.companyName}
RUPS: ${options.companyId}
Grupo NIIF: ${config.name}
Fecha de reporte: ${options.reportDate}
Grado de redondeo: ${getRoundingDescription(options.roundingDegree)} (decimals=${getDecimalsFromRounding(options.roundingDegree)})
Generado: ${new Date().toLocaleString('es-CO')}

================================================================================
TOTALES CONSOLIDADOS (Solo cuentas hoja)
================================================================================

Activos:      $ ${formatNumber(totals.activos)}
Pasivos:      $ ${formatNumber(totals.pasivos)}
Patrimonio:   $ ${formatNumber(totals.patrimonio)}
Ingresos:     $ ${formatNumber(totals.ingresos)}
Gastos:       $ ${formatNumber(totals.gastos)}
Costos:       $ ${formatNumber(totals.costos)}

Validación Ecuación Contable:
  Activo - (Pasivo + Patrimonio) = $ ${formatNumber(totals.activos - (totals.pasivos + totals.patrimonio))}
  ${Math.abs(totals.activos - (totals.pasivos + totals.patrimonio)) < 1000 ? '✓ VÁLIDO' : '⚠ REVISAR'}

================================================================================
TOTALES POR SERVICIO
================================================================================

${serviceSummaries.map(s => `
${s.service.toUpperCase()}
  Activos:      $ ${formatNumber(s.activos)}
  Pasivos:      $ ${formatNumber(s.pasivos)}
  Patrimonio:   $ ${formatNumber(s.patrimonio)}
  Ecuación:     $ ${formatNumber(s.ecuacion)} ${Math.abs(s.ecuacion) < 1000 ? '✓' : '⚠'}
`).join('\n')}

================================================================================
ESTADÍSTICAS
================================================================================

Total de cuentas procesadas: ${consolidatedAccounts.length}
Cuentas hoja (con valores): ${leafAccounts.length}
Servicios distribuidos: ${serviceData.length}

================================================================================
`;
}
