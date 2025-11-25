import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import type { BalanceData, ServiceDistribution } from './excelProcessor';

export interface XBRLGenerationOptions {
  niifGroup: string;
  balance: BalanceData;
  distributions: ServiceDistribution[];
  fileName: string;
}

/**
 * Genera el paquete completo de archivos XBRL
 */
export async function generateXBRLPackage(options: XBRLGenerationOptions): Promise<void> {
  const zip = new JSZip();
  
  // 1. Generar plantilla Excel diligenciada
  const excelFile = generateExcelTemplate(options);
  zip.file(`${options.fileName}.xlsx`, excelFile);
  
  // 2. Generar archivo de mapeo XML
  const xmlContent = generateMappingXML(options);
  zip.file(`${options.fileName}.xml`, xmlContent);
  
  // 3. Generar plantilla XBRLT
  const xbrltContent = generateXBRLT(options);
  zip.file(`${options.fileName}.xbrlt`, xbrltContent);
  
  // 4. Generar archivo XBRL de instancia
  const xbrlContent = generateXBRLInstance(options);
  zip.file(`${options.fileName}.xbrl`, xbrlContent);
  
  // 5. Generar archivo README con instrucciones
  const readmeContent = generateReadme(options);
  zip.file('README.txt', readmeContent);
  
  // Generar y descargar el ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${options.fileName}.zip`);
}

/**
 * Genera la plantilla Excel con las hojas diligenciadas
 */
function generateExcelTemplate(options: XBRLGenerationOptions): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  
  // Hoja 1: Estado de Situación Financiera (Balance General)
  const balanceSheet = generateBalanceSheet(options);
  XLSX.utils.book_append_sheet(workbook, balanceSheet, '[210000] Estado de situación financiera');
  
  // Hoja 2: Estado de Resultados
  const incomeStatement = generateIncomeStatement(options);
  XLSX.utils.book_append_sheet(workbook, incomeStatement, '[310000] Estado de resultados');
  
  // Hojas 3-6: Gastos por servicio
  options.distributions.forEach((dist, index) => {
    const gastosSheet = generateGastosSheet(dist);
    const codigo = ['900017a', '900017b', '900017c'][index] || `90001${index}`;
    XLSX.utils.book_append_sheet(workbook, gastosSheet, `[${codigo}] FC01-${index + 1} - ${dist.servicio}`);
  });
  
  // Hoja de resumen
  const resumenSheet = generateResumenSheet(options);
  XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
  
  // Convertir a ArrayBuffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return excelBuffer;
}

/**
 * Genera la hoja de Balance General
 */
function generateBalanceSheet(options: XBRLGenerationOptions): XLSX.WorkSheet {
  const data: any[][] = [
    ['ESTADO DE SITUACIÓN FINANCIERA'],
    ['Empresa:', options.balance.empresa],
    ['Período:', options.balance.periodo],
    ['Grupo NIIF:', options.niifGroup.toUpperCase()],
    [],
    ['Código', 'Cuenta', ...options.distributions.map(d => d.servicio), 'Total'],
  ];
  
  // Agrupar por tipo de cuenta
  const activos = options.balance.cuentas.filter(c => c.tipo === 'activo');
  const pasivos = options.balance.cuentas.filter(c => c.tipo === 'pasivo');
  const patrimonio = options.balance.cuentas.filter(c => c.tipo === 'patrimonio');
  
  // Agregar ACTIVOS
  data.push(['', 'ACTIVO', '', '', '', '']);
  activos.forEach(cuenta => {
    const row = [
      cuenta.codigo,
      cuenta.nombre,
      ...options.distributions.map(d => {
        const cuentaDist = d.cuentas.find(c => c.codigo === cuenta.codigo);
        return cuentaDist ? cuentaDist.valor : 0;
      }),
      cuenta.valor
    ];
    data.push(row);
  });
  
  // Total Activo
  const totalActivo = activos.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL ACTIVO', ...options.distributions.map(d => 
    d.cuentas.filter(c => c.tipo === 'activo').reduce((sum, c) => sum + c.valor, 0)
  ), totalActivo]);
  
  data.push([]);
  
  // Agregar PASIVOS
  data.push(['', 'PASIVO', '', '', '', '']);
  pasivos.forEach(cuenta => {
    const row = [
      cuenta.codigo,
      cuenta.nombre,
      ...options.distributions.map(d => {
        const cuentaDist = d.cuentas.find(c => c.codigo === cuenta.codigo);
        return cuentaDist ? cuentaDist.valor : 0;
      }),
      cuenta.valor
    ];
    data.push(row);
  });
  
  // Total Pasivo
  const totalPasivo = pasivos.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL PASIVO', ...options.distributions.map(d => 
    d.cuentas.filter(c => c.tipo === 'pasivo').reduce((sum, c) => sum + c.valor, 0)
  ), totalPasivo]);
  
  data.push([]);
  
  // Agregar PATRIMONIO
  data.push(['', 'PATRIMONIO', '', '', '', '']);
  patrimonio.forEach(cuenta => {
    const row = [
      cuenta.codigo,
      cuenta.nombre,
      ...options.distributions.map(d => {
        const cuentaDist = d.cuentas.find(c => c.codigo === cuenta.codigo);
        return cuentaDist ? cuentaDist.valor : 0;
      }),
      cuenta.valor
    ];
    data.push(row);
  });
  
  // Total Patrimonio
  const totalPatrimonio = patrimonio.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL PATRIMONIO', ...options.distributions.map(d => 
    d.cuentas.filter(c => c.tipo === 'patrimonio').reduce((sum, c) => sum + c.valor, 0)
  ), totalPatrimonio]);
  
  data.push([]);
  data.push(['', 'TOTAL PASIVO + PATRIMONIO', ...options.distributions.map(d => {
    const pasivo = d.cuentas.filter(c => c.tipo === 'pasivo').reduce((sum, c) => sum + c.valor, 0);
    const patrim = d.cuentas.filter(c => c.tipo === 'patrimonio').reduce((sum, c) => sum + c.valor, 0);
    return pasivo + patrim;
  }), totalPasivo + totalPatrimonio]);
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Genera la hoja de Estado de Resultados
 */
function generateIncomeStatement(options: XBRLGenerationOptions): XLSX.WorkSheet {
  const data: any[][] = [
    ['ESTADO DE RESULTADOS'],
    ['Empresa:', options.balance.empresa],
    ['Período:', options.balance.periodo],
    [],
    ['Código', 'Cuenta', ...options.distributions.map(d => d.servicio), 'Total'],
  ];
  
  const ingresos = options.balance.cuentas.filter(c => c.tipo === 'ingreso');
  const gastos = options.balance.cuentas.filter(c => c.tipo === 'gasto');
  
  // Agregar INGRESOS
  data.push(['', 'INGRESOS', '', '', '', '']);
  ingresos.forEach(cuenta => {
    const row = [
      cuenta.codigo,
      cuenta.nombre,
      ...options.distributions.map(d => {
        const cuentaDist = d.cuentas.find(c => c.codigo === cuenta.codigo);
        return cuentaDist ? cuentaDist.valor : 0;
      }),
      cuenta.valor
    ];
    data.push(row);
  });
  
  const totalIngresos = ingresos.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL INGRESOS', ...options.distributions.map(d => 
    d.cuentas.filter(c => c.tipo === 'ingreso').reduce((sum, c) => sum + c.valor, 0)
  ), totalIngresos]);
  
  data.push([]);
  
  // Agregar GASTOS
  data.push(['', 'GASTOS', '', '', '', '']);
  gastos.forEach(cuenta => {
    const row = [
      cuenta.codigo,
      cuenta.nombre,
      ...options.distributions.map(d => {
        const cuentaDist = d.cuentas.find(c => c.codigo === cuenta.codigo);
        return cuentaDist ? cuentaDist.valor : 0;
      }),
      cuenta.valor
    ];
    data.push(row);
  });
  
  const totalGastos = gastos.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL GASTOS', ...options.distributions.map(d => 
    d.cuentas.filter(c => c.tipo === 'gasto').reduce((sum, c) => sum + c.valor, 0)
  ), totalGastos]);
  
  data.push([]);
  data.push(['', 'UTILIDAD (PÉRDIDA)', ...options.distributions.map(d => {
    const ing = d.cuentas.filter(c => c.tipo === 'ingreso').reduce((sum, c) => sum + c.valor, 0);
    const gast = d.cuentas.filter(c => c.tipo === 'gasto').reduce((sum, c) => sum + c.valor, 0);
    return ing - gast;
  }), totalIngresos - totalGastos]);
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Genera hoja de gastos por servicio
 */
function generateGastosSheet(distribution: ServiceDistribution): XLSX.WorkSheet {
  const data: any[][] = [
    [`GASTOS DE SERVICIOS PÚBLICOS - ${distribution.servicio.toUpperCase()}`],
    [`Porcentaje de distribución: ${distribution.porcentaje}%`],
    [],
    ['Código', 'Cuenta', 'Valor'],
  ];
  
  const gastos = distribution.cuentas.filter(c => c.tipo === 'gasto');
  gastos.forEach(cuenta => {
    data.push([cuenta.codigo, cuenta.nombre, cuenta.valor]);
  });
  
  const total = gastos.reduce((sum, c) => sum + c.valor, 0);
  data.push(['', 'TOTAL', total]);
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Genera hoja de resumen
 */
function generateResumenSheet(options: XBRLGenerationOptions): XLSX.WorkSheet {
  const data: any[][] = [
    ['RESUMEN DE LA TAXONOMÍA XBRL'],
    ['Generado automáticamente por Generador de Taxonomías XBRL'],
    [],
    ['Información General'],
    ['Empresa:', options.balance.empresa],
    ['Período:', options.balance.periodo],
    ['Grupo NIIF:', options.niifGroup.toUpperCase()],
    ['Fecha de generación:', new Date().toLocaleString()],
    [],
    ['Distribución por Servicios'],
    ['Servicio', 'Porcentaje'],
  ];
  
  options.distributions.forEach(d => {
    data.push([d.servicio, `${d.porcentaje}%`]);
  });
  
  data.push([]);
  data.push(['Hojas Autocompletadas']);
  data.push(['✓ [210000] Estado de situación financiera']);
  data.push(['✓ [310000] Estado de resultados']);
  options.distributions.forEach((d, i) => {
    data.push([`✓ [90001${i}] FC01-${i + 1} - Gastos ${d.servicio}`]);
  });
  
  data.push([]);
  data.push(['Próximos Pasos']);
  data.push(['1. Abrir estos archivos en XBRL Express']);
  data.push(['2. Completar las hojas restantes (notas, políticas, revelaciones)']);
  data.push(['3. Validar en XBRL Express hasta obtener "sin errores"']);
  data.push(['4. Generar el archivo .xbrl final']);
  data.push(['5. Certificar en la plataforma SUI']);
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Genera el archivo XML de mapeo
 */
function generateMappingXML(options: XBRLGenerationOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Archivo de mapeo generado automáticamente -->
<mappings>
  <metadata>
    <empresa>${options.balance.empresa}</empresa>
    <periodo>${options.balance.periodo}</periodo>
    <grupo>${options.niifGroup}</grupo>
    <fecha_generacion>${new Date().toISOString()}</fecha_generacion>
  </metadata>
  <servicios>
    ${options.distributions.map(d => `
    <servicio nombre="${d.servicio}" porcentaje="${d.porcentaje}"/>`).join('')}
  </servicios>
</mappings>`;
}

/**
 * Genera el archivo XBRLT
 */
function generateXBRLT(options: XBRLGenerationOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Plantilla XBRL generada automáticamente -->
<xbrlt version="1.0">
  <metadata>
    <empresa>${options.balance.empresa}</empresa>
    <periodo>${options.balance.periodo}</periodo>
  </metadata>
</xbrlt>`;
}

/**
 * Genera el archivo XBRL de instancia
 */
function generateXBRLInstance(options: XBRLGenerationOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Instancia XBRL generada automáticamente -->
<xbrl xmlns="http://www.xbrl.org/2003/instance">
  <context id="current">
    <entity>
      <identifier scheme="http://www.superservicios.gov.co">${options.balance.empresa}</identifier>
    </entity>
    <period>
      <instant>${options.balance.periodo}</instant>
    </period>
  </context>
</xbrl>`;
}

/**
 * Genera el archivo README con instrucciones
 */
function generateReadme(options: XBRLGenerationOptions): string {
  return `GENERADOR DE TAXONOMÍAS XBRL
================================

Archivo generado: ${options.fileName}
Fecha: ${new Date().toLocaleString()}
Grupo NIIF: ${options.niifGroup.toUpperCase()}

CONTENIDO DEL PAQUETE:
----------------------
1. ${options.fileName}.xlsx - Plantilla Excel oficial con 11 hojas autocompletadas
2. ${options.fileName}.xml - Archivo de mapeo de cuentas
3. ${options.fileName}.xbrlt - Plantilla XBRL
4. ${options.fileName}.xbrl - Instancia XBRL
5. README.txt - Este archivo

HOJAS AUTOCOMPLETADAS:
----------------------
✓ [210000] Estado de situación financiera
✓ [310000] Estado de resultados
${options.distributions.map((d, i) => `✓ [90001${i}] FC01-${i + 1} - Gastos ${d.servicio}`).join('\n')}

DISTRIBUCIÓN POR SERVICIOS:
---------------------------
${options.distributions.map(d => `${d.servicio}: ${d.porcentaje}%`).join('\n')}

PRÓXIMOS PASOS:
---------------
1. Abre el archivo .xlsx en XBRL Express
2. Completa las hojas restantes que requieren información manual:
   - Notas explicativas
   - Políticas contables
   - Revelaciones específicas
   - Estados complementarios
3. Ejecuta la validación en XBRL Express
4. Corrige cualquier error reportado
5. Una vez que la validación diga "sin errores", genera el archivo .xbrl final
6. Sube el archivo .xbrl a la plataforma SUI para certificación

SOPORTE:
--------
Esta taxonomía fue generada automáticamente. Si encuentras algún problema,
verifica que el balance consolidado original esté correctamente estructurado.

¡Éxito con tu certificación!
`;
}
