/**
 * R414TemplateService - Servicio de plantillas para taxonomía R414.
 * Extiende BaseTemplateService con lógica específica para R414
 * (Resolución 414 CGN - Sector Público / SSPD).
 */
import type ExcelJS from 'exceljs';
import { BaseTemplateService } from '../shared/baseTemplateService';
import type {
  NiifGroup, TemplatePaths, ESFMapping,
  ServiceColumnMapping, SheetMapping, TemplateWithDataOptions,
} from '../types';
import { R414_SERVICE_COLUMNS, R414_ESF_MAPPINGS } from './mappings/esfMappings';
import { R414_SHEET_MAPPING, R414_TEMPLATE_PATHS } from './config';

/** Servicio de plantillas para R414. */
export class R414TemplateService extends BaseTemplateService {
  readonly group: NiifGroup = 'r414';
  readonly templatePaths: TemplatePaths = R414_TEMPLATE_PATHS;

  getESFMappings(): ESFMapping[] { return R414_ESF_MAPPINGS; }
  getServiceColumns(): ServiceColumnMapping { return R414_SERVICE_COLUMNS; }
  getSheetMapping(): SheetMapping { return R414_SHEET_MAPPING; }

  fillHoja9Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja9 (Notas - Lista de Notas)...');

    const companyName = options.companyName;
    const reportDate = options.reportDate;

    // Definir todas las notas con sus respuestas
    const notas: Array<{ celda: string; contenido: string }> = [
      // E11: Información a revelar sobre notas y otra información explicativa
      {
        celda: 'E11',
        contenido: `Las presentes notas forman parte integral de los estados financieros de ${companyName}. Contienen información adicional sobre las políticas contables aplicadas, los juicios y estimaciones realizados por la administración, así como explicaciones detalladas sobre las partidas significativas presentadas en el Estado de Situación Financiera y el Estado de Resultados. La empresa opera como prestador de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo bajo la regulación de la Ley 142 de 1994 y la supervisión de la Superintendencia de Servicios Públicos Domiciliarios.`
      },
      // E12: Información a revelar sobre juicios y estimaciones contables
      {
        celda: 'E12',
        contenido: `La preparación de los estados financieros requiere que la administración realice juicios, estimaciones y supuestos que afectan la aplicación de las políticas contables y los valores reportados. Las principales estimaciones incluyen: la vida útil de los activos de infraestructura de acueducto y alcantarillado (redes, plantas de tratamiento, tanques de almacenamiento), la provisión para cuentas de difícil cobro de usuarios de servicios públicos, las obligaciones por beneficios a empleados, y las provisiones para litigios y contingencias regulatorias. Estas estimaciones se revisan periódicamente y los ajustes se reconocen en el período en que se realiza la revisión.`
      },
      // E13: Información a revelar sobre remuneración de los auditores
      {
        celda: 'E13',
        contenido: `Los honorarios por servicios de auditoría externa corresponden a la revisión de los estados financieros anuales y la evaluación del sistema de control interno. No se han contratado servicios adicionales que puedan comprometer la independencia del auditor. Los honorarios se establecen mediante contrato y corresponden a tarifas de mercado para empresas de servicios públicos de similar tamaño y complejidad.`
      },
      // E14: Información a revelar sobre la autorización de los estados financieros
      {
        celda: 'E14',
        contenido: `Los estados financieros de ${companyName} correspondientes al periodo terminado el ${reportDate} fueron autorizados para su emisión por la Junta Directiva y el Representante Legal en reunión celebrada con posterioridad a la fecha de cierre. Los estados financieros se preparan de conformidad con las Normas de Información Financiera aplicables en Colombia (NCIF) y la Resolución 414 de 2014 de la Contaduría General de la Nación.`
      },
      // E15: Información a revelar sobre efectivo y equivalentes al efectivo
      {
        celda: 'E15',
        contenido: `El efectivo y equivalentes al efectivo comprende el dinero en caja, depósitos bancarios a la vista y otras inversiones de alta liquidez con vencimiento original de tres meses o menos. La empresa mantiene sus recursos principalmente en cuentas corrientes y de ahorro en entidades financieras vigiladas por la Superintendencia Financiera de Colombia. Los recursos se utilizan principalmente para cubrir los costos operativos del servicio, el mantenimiento de la infraestructura de acueducto y alcantarillado, y la gestión integral de residuos sólidos.`
      },
      // E16: Información a revelar sobre el estado de flujos de efectivo
      {
        celda: 'E16',
        contenido: `El estado de flujos de efectivo se prepara utilizando el método indirecto. Los flujos de efectivo de actividades de operación provienen principalmente del recaudo de tarifas por la prestación de los servicios de acueducto, alcantarillado y aseo a usuarios residenciales, comerciales e industriales. Las actividades de inversión incluyen la adquisición y mejora de infraestructura de captación, tratamiento, distribución y disposición final. Las actividades de financiación comprenden los préstamos obtenidos para expansión de cobertura y mejoramiento del servicio.`
      },
      // E17: Información a revelar sobre activos contingentes
      {
        celda: 'E17',
        contenido: `No Aplica`
      },
      // E18: Información a revelar sobre compromisos y pasivos contingentes
      {
        celda: 'E18',
        contenido: `La empresa tiene compromisos derivados de contratos de operación, mantenimiento y expansión de infraestructura. Existen pasivos contingentes relacionados con procesos judiciales y administrativos ante la Superintendencia de Servicios Públicos Domiciliarios, reclamaciones de usuarios por calidad del servicio, y posibles sanciones regulatorias. La administración evalúa periódicamente la probabilidad de ocurrencia y el impacto financiero de estas contingencias, reconociendo provisiones cuando es probable una salida de recursos.`
      },
      // E19: Información a revelar sobre gastos por depreciación y amortización
      {
        celda: 'E19',
        contenido: `Los activos de infraestructura de servicios públicos se deprecian utilizando el método de línea recta durante su vida útil estimada. Las principales vidas útiles son: plantas de tratamiento de agua (30-50 años), redes de distribución de acueducto y alcantarillado (30-50 años), equipos de bombeo (15-20 años), vehículos recolectores de residuos (8-10 años), edificaciones (50 años), y equipos de cómputo (5 años). Los activos intangibles con vida útil finita se amortizan durante el período del contrato o concesión.`
      },
      // E20: Información a revelar sobre instrumentos financieros derivados
      {
        celda: 'E20',
        contenido: `No Aplica`
      },
      // E21: Información a revelar sobre el efecto de las variaciones en las tasas de cambio
      {
        celda: 'E21',
        contenido: `No Aplica`
      },
      // E22: Información a revelar sobre beneficios a los empleados
      {
        celda: 'E22',
        contenido: `La empresa reconoce los beneficios a empleados de corto plazo (salarios, prestaciones sociales, vacaciones, primas) en el período en que se presta el servicio. Los beneficios post-empleo incluyen las contribuciones a fondos de pensiones y cesantías administrados por terceros. Se reconocen provisiones por beneficios de largo plazo cuando corresponde por convenciones colectivas o políticas de la empresa. El personal operativo incluye fontaneros, operadores de plantas, conductores y personal de aseo, quienes reciben capacitación continua en seguridad industrial y manejo de equipos especializados.`
      },
      // E23: Información a revelar sobre hechos ocurridos después del periodo
      {
        celda: 'E23',
        contenido: `Entre la fecha de cierre de los estados financieros y la fecha de autorización para su emisión, no se han presentado hechos significativos que requieran ajuste o revelación adicional. La empresa continúa sus operaciones normales de prestación de servicios públicos domiciliarios y no se han identificado eventos que afecten materialmente la situación financiera o los resultados del período reportado.`
      },
      // E24: Información a revelar sobre gastos
      {
        celda: 'E24',
        contenido: `Los gastos de la empresa se clasifican en: gastos operacionales (personal operativo, mantenimiento de infraestructura, insumos químicos para tratamiento de agua, combustibles para vehículos recolectores, disposición final de residuos), gastos administrativos (personal administrativo, servicios públicos de oficinas, honorarios profesionales), y otros gastos (provisiones, deterioro de cartera). Los gastos se reconocen cuando se incurren, independientemente del momento del pago.`
      },
      // E25: Información a revelar sobre ingresos (costos) financieros
      {
        celda: 'E25',
        contenido: `Los ingresos financieros provienen principalmente de rendimientos de inversiones temporales y cuentas de ahorro. Los costos financieros incluyen intereses por préstamos bancarios para financiación de infraestructura, comisiones bancarias, e intereses de mora pagados. La empresa también reconoce ingresos por financiación de usuarios cuando se otorgan facilidades de pago por deudas de servicios públicos.`
      },
      // E26: Información a revelar sobre instrumentos financieros
      {
        celda: 'E26',
        contenido: `Los instrumentos financieros de la empresa incluyen: efectivo y equivalentes, cuentas por cobrar a usuarios de servicios públicos (clasificadas por estrato socioeconómico y antigüedad), cuentas por pagar a proveedores de bienes y servicios, y obligaciones financieras con entidades bancarias. Las cuentas por cobrar se miden inicialmente al precio de la transacción y posteriormente al costo amortizado menos deterioro. Los pasivos financieros se miden al costo amortizado utilizando el método de la tasa de interés efectiva.`
      },
      // E27: Información a revelar sobre gestión del riesgo financiero
      {
        celda: 'E27',
        contenido: `La empresa gestiona los siguientes riesgos financieros: riesgo de crédito (asociado a la cartera de usuarios, mitigado mediante cortes de servicio y gestión de cobro), riesgo de liquidez (gestionado mediante presupuesto de caja y líneas de crédito disponibles), y riesgo de tasa de interés (para préstamos a tasa variable). No existe exposición significativa a riesgo cambiario. La Junta Directiva aprueba las políticas de gestión de riesgo y supervisa su cumplimiento.`
      },
      // E28: Información a revelar sobre la adopción por primera vez del marco normativo
      {
        celda: 'E28',
        contenido: `No Aplica`
      },
      // E29: Información a revelar sobre información general sobre los estados financieros
      {
        celda: 'E29',
        contenido: `${companyName} es una empresa de servicios públicos domiciliarios constituida conforme a las leyes colombianas, cuyo objeto social principal es la prestación de los servicios de acueducto, alcantarillado y/o aseo. Opera bajo el marco regulatorio de la Ley 142 de 1994 y sus decretos reglamentarios, y está sujeta a la vigilancia y control de la Superintendencia de Servicios Públicos Domiciliarios. Los estados financieros se preparan bajo el supuesto de negocio en marcha y cumplen con los requisitos de la Resolución 414 de 2014 de la Contaduría General de la Nación.`
      },
      // E30: Información a revelar sobre la plusvalía
      {
        celda: 'E30',
        contenido: `No Aplica`
      },
      // E31: Información a revelar sobre subvenciones del gobierno
      {
        celda: 'E31',
        contenido: `La empresa recibe subsidios del gobierno para cubrir la diferencia entre las tarifas plenas y las tarifas subsidiadas cobradas a usuarios de estratos 1, 2 y 3, de conformidad con la Ley 142 de 1994. Estos subsidios son transferidos por el municipio y se reconocen como ingresos en el período en que se presta el servicio subsidiado. Adicionalmente, la empresa puede recibir aportes para expansión de infraestructura que se reconocen como ingresos diferidos y se amortizan durante la vida útil de los activos financiados.`
      },
      // E32: Descripción de la naturaleza y cuantía de las subvenciones reconocidas
      {
        celda: 'E32',
        contenido: `Las subvenciones reconocidas corresponden a: subsidios para estratos 1, 2 y 3 por los servicios de acueducto, alcantarillado y aseo, calculados como la diferencia entre la tarifa de referencia y la tarifa subsidiada según los porcentajes establecidos por la normativa (hasta 70% para estrato 1, 40% para estrato 2 y 15% para estrato 3). El valor de los subsidios reconocidos en el período se detalla en las notas complementarias por servicio.`
      },
      // E33: Descripción de las condiciones cumplidas, por cumplir y otras contingencias
      {
        celda: 'E33',
        contenido: `Las condiciones para el reconocimiento de subsidios incluyen: estar debidamente registrado ante la SSPD, reportar información al Sistema Único de Información (SUI), aplicar correctamente las metodologías tarifarias de la CRA, mantener los estratos socioeconómicos actualizados, y cumplir con los indicadores de calidad del servicio. No existen contingencias significativas relacionadas con la devolución de subsidios recibidos.`
      },
      // E34: Periodos que cubre las subvención, así como los montos amortizados y por amortizar
      {
        celda: 'E34',
        contenido: `Los subsidios operativos se reconocen mensualmente en el período en que se presta el servicio, sin generar montos diferidos. Los aportes de capital recibidos para infraestructura se amortizan durante la vida útil de los activos financiados (generalmente entre 20 y 50 años dependiendo del tipo de infraestructura). El saldo por amortizar corresponde a aportes para redes, plantas y equipos que aún se encuentran en operación.`
      },
      // E35: Descripción de las subvenciones a las que no se les haya podido asignar un valor
      {
        celda: 'E35',
        contenido: `No Aplica`
      },
      // E36: Descripción de otro tipo de ayudas gubernamentales
      {
        celda: 'E36',
        contenido: `La empresa puede beneficiarse de exenciones tributarias aplicables a empresas de servicios públicos, así como de programas de financiación con tasas preferenciales a través de Findeter u otras entidades de fomento para proyectos de expansión de cobertura y mejoramiento de la calidad del servicio. También puede acceder a recursos del Sistema General de Participaciones y del Sistema General de Regalías para proyectos de agua potable y saneamiento básico.`
      },
      // E37: Información a revelar sobre deterioro de valor de activos
      {
        celda: 'E37',
        contenido: `La empresa evalúa al cierre de cada período si existe algún indicio de deterioro del valor de sus activos. Para los activos de infraestructura de servicios públicos, se considera deterioro cuando existen indicios de obsolescencia tecnológica, daño físico significativo, cambios adversos en el entorno regulatorio, o cuando los flujos de efectivo futuros esperados son menores al valor en libros. Durante el período no se identificaron indicios de deterioro significativo en los activos operativos.`
      },
      // E38: Información a revelar sobre impuestos a las ganancias
      {
        celda: 'E38',
        contenido: `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la base gravable del período aplicando las tarifas vigentes. El impuesto diferido surge de las diferencias temporarias entre el valor en libros de los activos y pasivos para propósitos financieros y su base fiscal, principalmente por diferencias en la depreciación de activos fijos y la provisión de cartera. La empresa aplica las tarifas de impuesto de renta establecidas para el régimen ordinario.`
      },
      // E39: Información a revelar sobre empleados
      {
        celda: 'E39',
        contenido: `La planta de personal de la empresa incluye personal administrativo, operativo y técnico necesario para la prestación de los servicios de acueducto, alcantarillado y aseo. El personal operativo comprende fontaneros, operadores de plantas de tratamiento, lectores de medidores, personal de mantenimiento de redes, conductores de vehículos recolectores y operarios de aseo. La empresa cumple con todas las obligaciones laborales y de seguridad social de conformidad con la legislación colombiana.`
      },
      // E40: Información a revelar sobre personal clave de la gerencia
      {
        celda: 'E40',
        contenido: `El personal clave de la gerencia incluye al Gerente General, los directores de área (Comercial, Técnica, Administrativa y Financiera) y los miembros de la Junta Directiva. La remuneración del personal clave comprende salarios, prestaciones sociales, bonificaciones por cumplimiento de metas, y contribuciones a seguridad social. No existen beneficios post-empleo especiales ni pagos basados en acciones para el personal directivo.`
      },
      // E41: Información a revelar sobre activos intangibles
      {
        celda: 'E41',
        contenido: `Los activos intangibles incluyen principalmente software de gestión comercial, facturación y control de pérdidas, así como derechos de uso sobre licencias y servidumbres necesarias para la operación de la infraestructura. Los intangibles se amortizan durante su vida útil estimada o el término del contrato de licencia. No existen activos intangibles de vida útil indefinida. Los costos de desarrollo de software se capitalizan cuando cumplen los criterios de reconocimiento.`
      },
      // E42: Información a revelar sobre gastos por intereses
      {
        celda: 'E42',
        contenido: `Los gastos por intereses corresponden principalmente a obligaciones financieras contraídas para la financiación de proyectos de infraestructura de acueducto, alcantarillado y aseo. Incluyen intereses de préstamos bancarios, créditos de fomento a través de Findeter, y otros pasivos financieros. Los intereses se reconocen utilizando el método de la tasa de interés efectiva durante el período del préstamo.`
      },
      // E43: Información a revelar sobre ingresos por intereses
      {
        celda: 'E43',
        contenido: `Los ingresos por intereses provienen de rendimientos financieros de inversiones temporales, cuentas de ahorro, e intereses de mora cobrados a usuarios por pagos tardíos de facturas de servicios públicos. Los intereses se reconocen utilizando el método de la tasa de interés efectiva. La política de la empresa establece el cobro de intereses de mora de acuerdo con las tasas máximas permitidas por la regulación.`
      },
      // E44: Información a revelar sobre inventarios
      {
        celda: 'E44',
        contenido: `Los inventarios comprenden principalmente materiales para mantenimiento de redes (tuberías, válvulas, accesorios, medidores), insumos químicos para tratamiento de agua (cloro, sulfato de aluminio, polímeros), repuestos para equipos de bombeo y plantas de tratamiento, y materiales de aseo. Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina utilizando el método de promedio ponderado.`
      },
      // E45: Información a revelar sobre propiedades de inversión
      {
        celda: 'E45',
        contenido: `No Aplica`
      },
      // E46: Información a revelar sobre inversiones contabilizadas utilizando el método de la participación
      {
        celda: 'E46',
        contenido: `No Aplica`
      },
      // E47: Información a revelar sobre inversiones distintas de las contabilizadas utilizando el método de la participación
      {
        celda: 'E47',
        contenido: `No Aplica`
      },
      // E48: Información a revelar sobre arrendamientos
      {
        celda: 'E48',
        contenido: `La empresa puede tener contratos de arrendamiento operativo para vehículos, equipos de cómputo y oficinas administrativas. Los arrendamientos de corto plazo y de activos de bajo valor se reconocen como gasto de forma lineal durante el término del contrato. Para arrendamientos significativos, se reconoce un activo por derecho de uso y un pasivo por arrendamiento. No existen arrendamientos financieros significativos sobre activos de infraestructura.`
      },
      // E49: Información a revelar sobre préstamos y anticipos a bancos
      {
        celda: 'E49',
        contenido: `No Aplica`
      },
      // E50: Información a revelar sobre préstamos y anticipos a clientes
      {
        celda: 'E50',
        contenido: `No Aplica`
      },
      // E51: Información a revelar sobre objetivos, políticas y procesos para la gestión del capital
      {
        celda: 'E51',
        contenido: `El objetivo de la gestión del capital es mantener una estructura financiera sólida que permita la sostenibilidad del servicio público y la expansión de cobertura. La política de la empresa busca mantener un nivel de endeudamiento prudente, reinvertir las utilidades en mejoramiento de infraestructura, y asegurar la capacidad de pago de obligaciones. La Junta Directiva revisa periódicamente los indicadores de capital de trabajo, endeudamiento y rentabilidad.`
      },
      // E52: Información a revelar sobre otros activos corrientes
      {
        celda: 'E52',
        contenido: `Los otros activos corrientes incluyen anticipos a contratistas y proveedores, gastos pagados por anticipado (seguros, arrendamientos), anticipos de impuestos y retenciones a favor, y otros derechos de cobro de corto plazo. Estos activos se miden al costo o al valor recuperable si existe evidencia de deterioro.`
      },
      // E53: Información a revelar sobre otros pasivos corrientes
      {
        celda: 'E53',
        contenido: `Los otros pasivos corrientes incluyen ingresos recibidos por anticipado (conexiones facturadas no instaladas, depósitos de usuarios), retenciones y aportes por pagar (retención en la fuente, IVA, aportes a seguridad social), provisiones de corto plazo, y otros acreedores diversos. Se reconocen al valor de la obligación estimada.`
      },
      // E54: Información a revelar sobre otros activos no corrientes
      {
        celda: 'E54',
        contenido: `Los otros activos no corrientes incluyen depósitos en garantía, cuentas por cobrar de largo plazo con acuerdos de pago, activos por impuesto diferido, y otros derechos cuya realización se espera después de doce meses. Se miden al costo amortizado o al valor presente cuando el efecto del valor temporal del dinero es significativo.`
      },
      // E55: Información a revelar sobre otros pasivos no corrientes
      {
        celda: 'E55',
        contenido: `Los otros pasivos no corrientes incluyen ingresos diferidos por aportes de capital para infraestructura, provisiones de largo plazo (beneficios a empleados, litigios), pasivos por impuesto diferido, y otras obligaciones cuyo vencimiento es superior a doce meses. Se miden al valor presente de los flujos de efectivo futuros cuando corresponde.`
      },
      // E56: Información a revelar sobre otros ingresos (gastos) de operación
      {
        celda: 'E56',
        contenido: `Los otros ingresos de operación incluyen reconexiones, venta de materiales, arrendamiento de infraestructura, servicios complementarios, y recuperación de cartera castigada. Los otros gastos de operación comprenden provisiones para contingencias, pérdidas por deterioro de cartera, gastos legales, y otros gastos no clasificados en las categorías principales. Se reconocen cuando se incurren.`
      },
      // E57: Información a revelar sobre anticipos y otros activos
      {
        celda: 'E57',
        contenido: `Los anticipos comprenden pagos realizados a contratistas por obras de infraestructura en ejecución, anticipos a proveedores de insumos y materiales, y pagos por cuenta de terceros. Se reconocen como activo hasta que se reciben los bienes o servicios correspondientes, momento en el cual se reclasifican al costo del activo o al gasto según corresponda.`
      },
      // E58: Información a revelar sobre ganancias (pérdidas) por actividades de operación
      {
        celda: 'E58',
        contenido: `El resultado de actividades de operación refleja la diferencia entre los ingresos por prestación de servicios públicos (incluyendo subsidios y contribuciones) y los costos y gastos necesarios para la operación. Los principales factores que afectan el resultado operacional incluyen: nivel de recaudo de cartera, eficiencia operativa, costos de energía para bombeo, costos de disposición final de residuos, y mantenimiento de infraestructura.`
      },
      // E59: Información a revelar sobre propiedades, planta y equipo
      {
        celda: 'E59',
        contenido: `Las propiedades, planta y equipo comprenden los activos de infraestructura para la prestación de servicios públicos: plantas de tratamiento de agua potable y residual, redes de acueducto y alcantarillado, estaciones de bombeo, tanques de almacenamiento, vehículos recolectores, equipos para disposición final de residuos, terrenos, edificaciones y equipos administrativos. Se miden al costo menos depreciación acumulada y deterioro. Las adiciones y mejoras que incrementan la vida útil o capacidad se capitalizan.`
      },
      // E60: Información a revelar sobre provisiones
      {
        celda: 'E60',
        contenido: `Las provisiones incluyen obligaciones presentes por litigios laborales y civiles, reclamaciones de usuarios, posibles sanciones regulatorias, obligaciones ambientales, y beneficios a empleados de largo plazo. Se reconoce una provisión cuando existe una obligación presente, es probable la salida de recursos, y el monto puede estimarse de forma fiable. Las provisiones se revisan al cierre de cada período y se ajustan según la mejor estimación disponible.`
      },
      // E61: Información a revelar sobre gastos de investigación y desarrollo
      {
        celda: 'E61',
        contenido: `No Aplica`
      },
      // E62: Información a revelar sobre reservas dentro de patrimonio
      {
        celda: 'E62',
        contenido: `Las reservas del patrimonio incluyen la reserva legal (constituida con el 10% de las utilidades hasta alcanzar el 50% del capital), reservas estatutarias según los estatutos sociales, y otras reservas aprobadas por la Asamblea de Accionistas. Las reservas se utilizan para absorber pérdidas, capitalizar la empresa, o distribuir como dividendos según decisión del máximo órgano social.`
      },
      // E63: Información a revelar sobre efectivo y equivalentes al efectivo restringidos
      {
        celda: 'E63',
        contenido: `No Aplica`
      },
      // E64: Información a revelar sobre ingresos de actividades ordinarias
      {
        celda: 'E64',
        contenido: `Los ingresos ordinarios provienen de la facturación por prestación de servicios de acueducto (cargo fijo y consumo), alcantarillado (cargo fijo y vertimiento), y aseo (cargo fijo, recolección y disposición final). Los ingresos se reconocen cuando el servicio se presta, medido según el consumo de agua o la frecuencia de recolección. También se incluyen las contribuciones de solidaridad de estratos 5 y 6, los subsidios recibidos del gobierno, y los cargos por conexión y reconexión de servicios.`
      },
      // E65: Información a revelar sobre cuentas por cobrar y por pagar por impuestos
      {
        celda: 'E65',
        contenido: `Las cuentas por cobrar por impuestos incluyen saldos a favor de retención en la fuente, IVA descontable, y anticipos de impuesto de renta. Las cuentas por pagar por impuestos incluyen impuesto de renta corriente, impuesto diferido, IVA por pagar, retenciones practicadas, impuesto de industria y comercio, y contribuciones a la SSPD y CRA. Se reconocen según las disposiciones tributarias vigentes.`
      },
      // E66: Información a revelar sobre acreedores comerciales y otras cuentas por pagar
      {
        celda: 'E66',
        contenido: `Los acreedores comerciales corresponden a obligaciones con proveedores de insumos químicos, materiales de construcción, repuestos, combustibles, y contratistas de obras y servicios. Las otras cuentas por pagar incluyen honorarios profesionales, servicios públicos, arrendamientos, y otros gastos acumulados por pagar. Se miden al valor nominal o al costo amortizado cuando el plazo de pago genera un componente financiero significativo.`
      },
      // E67: Información a revelar sobre deudores comerciales y otras cuentas por cobrar
      {
        celda: 'E67',
        contenido: `Los deudores comerciales corresponden a la cartera por facturación de servicios públicos a usuarios residenciales (estratos 1 a 6), comerciales, industriales y oficiales. Se clasifican por servicio, estrato y antigüedad de la deuda. Se reconoce deterioro para cuentas de difícil cobro con base en la antigüedad y el análisis histórico de recuperación. Las otras cuentas por cobrar incluyen anticipos de subsidios, deudores varios, y cuentas por cobrar a empleados.`
      },
    ];

    // Escribir todas las notas en el worksheet
    for (const nota of notas) {
      this.writeCell(worksheet, nota.celda, nota.contenido);
    }

    console.log(`[R414] Hoja9 completada - ${notas.length} notas escritas (E11 a E67).`);
  }

  /**
   * Llena la Hoja10 (Formulario [800600] Notas - Lista de Políticas).
   * 
   * Contiene las políticas contables significativas.
   * Celdas D11 a D43 con respuestas predefinidas para empresas de servicios públicos.
   */
  fillHoja10Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja10 (Notas - Lista de Políticas)...');

    const companyName = options.companyName;

    // Definir todas las políticas contables con sus respuestas
    const politicas: Array<{ celda: string; contenido: string }> = [
      // D11: Información a revelar sobre un resumen de las políticas contables significativas
      {
        celda: 'D11',
        contenido: `${companyName} prepara sus estados financieros de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la Contaduría General de la Nación. Las políticas contables significativas se aplican de manera uniforme para todos los períodos presentados. Los estados financieros se preparan sobre la base del costo histórico, excepto por ciertos instrumentos financieros que se miden a valor razonable. La empresa opera como prestador de servicios públicos domiciliarios de acueducto, alcantarillado y/o aseo bajo la regulación de la Ley 142 de 1994.`
      },
      // D12: Descripción de la política contable de activos financieros disponibles para la venta
      {
        celda: 'D12',
        contenido: `No Aplica`
      },
      // D13: Descripción de la política contable para costos de financiación
      {
        celda: 'D13',
        contenido: `Los costos de financiación directamente atribuibles a la adquisición, construcción o producción de activos de infraestructura de servicios públicos que requieren un período sustancial para estar listos para su uso, se capitalizan como parte del costo del activo. Los demás costos de financiación se reconocen como gasto en el período en que se incurren. Los costos de financiación incluyen intereses calculados utilizando el método de la tasa de interés efectiva, cargas financieras por arrendamientos, y diferencias en cambio originadas en préstamos en moneda extranjera en la medida en que se consideren un ajuste a los costos por intereses.`
      },
      // D14: Descripción de la política contable para préstamos por pagar
      {
        celda: 'D14',
        contenido: `Los préstamos por pagar se reconocen inicialmente al valor razonable del efectivo recibido menos los costos de transacción directamente atribuibles. Posteriormente se miden al costo amortizado utilizando el método de la tasa de interés efectiva. La empresa obtiene préstamos principalmente de entidades financieras para financiar proyectos de expansión y mejoramiento de la infraestructura de acueducto, alcantarillado y aseo, incluyendo créditos de fomento a través de Findeter para proyectos de agua potable y saneamiento básico.`
      },
      // D15: Descripción de la política contable para instrumentos financieros derivados
      {
        celda: 'D15',
        contenido: `No Aplica`
      },
      // D16: Descripción de la política contable para beneficios a los empleados
      {
        celda: 'D16',
        contenido: `Los beneficios a empleados de corto plazo (salarios, prestaciones sociales legales, vacaciones, bonificaciones) se reconocen como gasto y pasivo cuando el empleado ha prestado el servicio. Los beneficios post-empleo incluyen contribuciones definidas a fondos de pensiones y cesantías administrados por terceros, reconocidas como gasto cuando se incurren. Los beneficios de largo plazo (quinquenios, primas de antigüedad) se reconocen como provisión cuando existe una obligación legal o implícita. Las indemnizaciones por terminación se reconocen cuando la empresa está comprometida a terminar el empleo.`
      },
      // D17: Descripción de la política contable para gastos
      {
        celda: 'D17',
        contenido: `Los gastos se reconocen cuando se incurren, independientemente del momento del pago, siguiendo el principio de devengo. Los gastos operacionales incluyen los costos necesarios para la prestación de servicios de acueducto, alcantarillado y aseo: personal operativo, mantenimiento de infraestructura, insumos químicos, energía eléctrica para bombeo, combustibles, y disposición final de residuos. Los gastos administrativos incluyen personal administrativo, honorarios profesionales, y gastos generales de oficina. Los gastos se clasifican por naturaleza en el estado de resultados.`
      },
      // D18: Descripción de la política contable para conversión de moneda extranjera
      {
        celda: 'D18',
        contenido: `No Aplica`
      },
      // D19: Descripción de la política contable para la moneda funcional
      {
        celda: 'D19',
        contenido: `La moneda funcional y de presentación de la empresa es el peso colombiano (COP), que es la moneda del entorno económico principal en el que opera. Todas las transacciones se registran en pesos colombianos. La empresa no mantiene operaciones significativas en moneda extranjera dado que sus actividades de servicios públicos domiciliarios se desarrollan exclusivamente en el territorio colombiano.`
      },
      // D20: Descripción de la política contable para la plusvalía
      {
        celda: 'D20',
        contenido: `No Aplica`
      },
      // D21: Descripción de las políticas contables para subvenciones gubernamentales
      {
        celda: 'D21',
        contenido: `Las subvenciones gubernamentales se reconocen cuando existe seguridad razonable de que se cumplirán las condiciones asociadas y que la subvención será recibida. Los subsidios operativos para cubrir la diferencia entre tarifas plenas y subsidiadas de estratos 1, 2 y 3 se reconocen como ingreso en el período en que se presta el servicio subsidiado. Los aportes de capital para infraestructura se reconocen inicialmente como ingreso diferido y se amortizan sistemáticamente durante la vida útil del activo financiado. Las contribuciones de solidaridad de estratos 5 y 6 se reconocen como ingreso cuando se facturan.`
      },
      // D22: Descripción de la política contable para deterioro del valor de activos
      {
        celda: 'D22',
        contenido: `Al cierre de cada período se evalúa si existe algún indicio de deterioro del valor de los activos. Si existe tal indicio, se estima el valor recuperable del activo (mayor entre valor razonable menos costos de venta y valor en uso). Si el valor en libros excede el valor recuperable, se reconoce una pérdida por deterioro. Para activos de infraestructura de servicios públicos, los indicios de deterioro incluyen obsolescencia tecnológica, daño físico, cambios regulatorios adversos, o reducción significativa en la demanda del servicio. Las pérdidas por deterioro se reversan si las circunstancias que las originaron dejan de existir.`
      },
      // D23: Descripción de la política contable para impuestos a las ganancias
      {
        celda: 'D23',
        contenido: `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la renta líquida gravable del período aplicando las tarifas vigentes. El impuesto diferido se reconoce sobre las diferencias temporarias entre el valor en libros de los activos y pasivos y su base fiscal, utilizando las tarifas que se espera aplicar cuando las diferencias se reviertan. Las principales diferencias temporarias surgen por depreciación de activos fijos, provisión de cartera, y beneficios a empleados. Los activos por impuesto diferido se reconocen solo cuando es probable su recuperación.`
      },
      // D24: Descripción de la política contable para activos intangibles
      {
        celda: 'D24',
        contenido: `Los activos intangibles adquiridos separadamente se miden inicialmente al costo. Los intangibles generados internamente (excepto costos de desarrollo capitalizados) se reconocen como gasto cuando se incurren. Los activos intangibles con vida útil finita se amortizan durante su vida útil estimada y se evalúan para deterioro cuando hay indicios. Los principales intangibles incluyen software de gestión comercial y facturación, licencias de uso, derechos de servidumbre, y costos de desarrollo de sistemas de información. La amortización se calcula por el método de línea recta durante el menor entre la vida útil estimada y el término del contrato.`
      },
      // D25: Descripción de las políticas contables para inversiones en asociadas
      {
        celda: 'D25',
        contenido: `No Aplica`
      },
      // D26: Descripción de la política contable para inversiones en negocios conjuntos
      {
        celda: 'D26',
        contenido: `No Aplica`
      },
      // D27: Descripción de la política contable para propiedades de inversión
      {
        celda: 'D27',
        contenido: `No Aplica`
      },
      // D28: Descripción de la política contable para el capital emitido
      {
        celda: 'D28',
        contenido: `El capital social se reconoce al valor nominal de las acciones o cuotas emitidas. Las primas en colocación de acciones se reconocen en el patrimonio como prima de emisión. Los costos directamente atribuibles a la emisión de instrumentos de patrimonio se reconocen como deducción del patrimonio. La distribución de dividendos se reconoce como pasivo cuando es aprobada por el máximo órgano social. Las reservas legales y estatutarias se constituyen según los requisitos legales y los estatutos de la empresa.`
      },
      // D29: Descripción de la política contable para arrendamientos
      {
        celda: 'D29',
        contenido: `La empresa evalúa al inicio del contrato si este contiene un arrendamiento. Para arrendamientos en los que la empresa es arrendataria, se reconoce un activo por derecho de uso y un pasivo por arrendamiento, excepto para arrendamientos de corto plazo (12 meses o menos) y de activos de bajo valor, que se reconocen como gasto de forma lineal. El activo por derecho de uso se deprecia durante el menor entre la vida útil del activo y el plazo del arrendamiento. Los principales arrendamientos incluyen vehículos, equipos de cómputo, y oficinas administrativas.`
      },
      // D30: Descripción de la política contable para préstamos y cuentas por cobrar
      {
        celda: 'D30',
        contenido: `Las cuentas por cobrar comerciales (cartera de usuarios de servicios públicos) se reconocen inicialmente al precio de transacción y posteriormente al costo amortizado menos deterioro. El deterioro se determina utilizando el modelo de pérdidas crediticias esperadas, basado en la experiencia histórica de recaudo, la antigüedad de la cartera, y las condiciones económicas actuales y proyectadas. La cartera se clasifica por servicio (acueducto, alcantarillado, aseo), por tipo de usuario (residencial por estratos, comercial, industrial, oficial), y por antigüedad. Se castigan las cuentas incobrables después de agotar la gestión de cobro.`
      },
      // D31: Descripción de las políticas contables para la medición de inventarios
      {
        celda: 'D31',
        contenido: `Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina utilizando el método de promedio ponderado e incluye los costos de adquisición y otros costos incurridos para darles su condición y ubicación actuales. Los inventarios incluyen materiales para mantenimiento de redes (tuberías, válvulas, accesorios, medidores), insumos químicos para tratamiento de agua, repuestos de equipos, y materiales de aseo. Se reconoce deterioro cuando el valor neto realizable es inferior al costo o cuando los inventarios están dañados, obsoletos o de lento movimiento.`
      },
      // D32: Descripción de la política contable para activos de petróleo y gas
      {
        celda: 'D32',
        contenido: `No Aplica`
      },
      // D33: Descripción de la política contable para propiedades, planta y equipo
      {
        celda: 'D33',
        contenido: `Las propiedades, planta y equipo se reconocen inicialmente al costo, que incluye el precio de adquisición, aranceles, impuestos no recuperables, y costos directamente atribuibles para poner el activo en condiciones de uso. Posteriormente se miden al costo menos depreciación acumulada y deterioro. La depreciación se calcula por el método de línea recta durante la vida útil estimada: plantas de tratamiento (30-50 años), redes de acueducto y alcantarillado (30-50 años), equipos de bombeo (15-20 años), vehículos recolectores (8-10 años), edificaciones (50 años), muebles y equipos de oficina (10 años), equipos de cómputo (5 años). Los costos de mantenimiento se reconocen como gasto; las mejoras que incrementan vida útil o capacidad se capitalizan.`
      },
      // D34: Descripción de la política contable para provisiones
      {
        celda: 'D34',
        contenido: `Se reconoce una provisión cuando la empresa tiene una obligación presente (legal o implícita) como resultado de un evento pasado, es probable que se requiera una salida de recursos para liquidar la obligación, y el monto puede estimarse de manera fiable. Las provisiones se miden por la mejor estimación del desembolso requerido para cancelar la obligación a la fecha del balance. Incluyen provisiones por litigios laborales y civiles, reclamaciones de usuarios, sanciones regulatorias, obligaciones ambientales, garantías, y beneficios a empleados de largo plazo. Las provisiones se revisan cada período y se ajustan para reflejar la mejor estimación actual.`
      },
      // D35: Descripción de las políticas contables para el reconocimiento de ingresos de actividades ordinarias
      {
        celda: 'D35',
        contenido: `Los ingresos se reconocen cuando se transfiere el control del servicio al cliente. Para servicios de acueducto, alcantarillado y aseo, los ingresos se reconocen en el período en que se presta el servicio: el consumo de agua medido (o estimado para usuarios sin medidor), el vertimiento de aguas residuales, y la recolección de residuos sólidos. Los ingresos incluyen cargo fijo y cargo por consumo/uso según las tarifas aprobadas por la CRA. Las contribuciones de solidaridad de estratos 5 y 6 se reconocen cuando se facturan. Los subsidios se reconocen cuando se presta el servicio subsidiado. Los cargos por conexión y reconexión se reconocen cuando se realiza el servicio.`
      },
      // D36: Descripción de la política contable para gastos de investigación y desarrollo
      {
        celda: 'D36',
        contenido: `No Aplica`
      },
      // D37: Descripción de la política contable para el efectivo y equivalentes al efectivo restringido
      {
        celda: 'D37',
        contenido: `No Aplica`
      },
      // D38: Descripción de la política contable para acreedores comerciales y otras cuentas por pagar
      {
        celda: 'D38',
        contenido: `Los acreedores comerciales y otras cuentas por pagar se reconocen inicialmente al valor razonable y posteriormente al costo amortizado utilizando el método de la tasa de interés efectiva. Cuando el plazo de pago es corto y no existe un componente financiero significativo, se miden al valor nominal. Incluyen obligaciones con proveedores de insumos químicos, materiales, repuestos, contratistas de obras y servicios, honorarios profesionales, y otros acreedores. Se dan de baja cuando la obligación se liquida, cancela o expira.`
      },
      // D39: Descripción de la política contable para transacciones con partes relacionadas
      {
        celda: 'D39',
        contenido: `Las transacciones con partes relacionadas (accionistas, administradores, empresas vinculadas, personal clave de la gerencia) se realizan en condiciones equivalentes a las que existen para transacciones entre partes independientes. Se revelan la naturaleza de la relación, el tipo de transacciones, los montos involucrados, y los saldos pendientes al cierre. Las partes relacionadas incluyen los accionistas con influencia significativa, los miembros de la Junta Directiva, el Gerente General, los directores de área, y las empresas del mismo grupo empresarial si aplica.`
      },
      // D40: Descripción de otras políticas contables relevantes para comprender los estados financieros
      {
        celda: 'D40',
        contenido: `Otras políticas contables relevantes incluyen: (a) Hechos posteriores: se ajustan los estados financieros por eventos que proporcionan evidencia de condiciones existentes al cierre; los eventos que no requieren ajuste se revelan. (b) Negocio en marcha: los estados financieros se preparan bajo el supuesto de que la empresa continuará operando indefinidamente. (c) Materialidad: las partidas se consideran materiales cuando su omisión o error puede influir en las decisiones económicas de los usuarios. (d) Compensación: los activos y pasivos, e ingresos y gastos, no se compensan excepto cuando lo requiere o permite una norma.`
      },
      // D41: Descripción de la política contable de inversiones de administración de liquidez
      {
        celda: 'D41',
        contenido: `Las inversiones de administración de liquidez comprenden instrumentos financieros de alta liquidez y bajo riesgo que se mantienen para cubrir necesidades de efectivo de corto plazo. Incluyen depósitos a término fijo, certificados de depósito, y otros instrumentos de renta fija con vencimiento original menor a un año. Se miden al costo amortizado cuando se mantienen para cobrar flujos contractuales de principal e intereses. Los rendimientos se reconocen como ingreso financiero utilizando el método de la tasa de interés efectiva durante el período de la inversión.`
      },
      // D42: Descripción de la política contable para préstamos por cobrar
      {
        celda: 'D42',
        contenido: `No Aplica`
      },
      // D43: Descripción de la política contable para el reconocimiento de ingresos por contratos de construcción
      {
        celda: 'D43',
        contenido: `No Aplica`
      },
    ];

    // Escribir todas las políticas en el worksheet
    for (const politica of politicas) {
      this.writeCell(worksheet, politica.celda, politica.contenido);
    }

    console.log(`[R414] Hoja10 completada - ${politicas.length} políticas escritas (D11 a D43).`);
  }

  // ============================================
  // HOJA11: [810000] Notas - Información de la Entidad
  // ============================================

  /**
   * Llena la Hoja11 (Formulario [810000] Notas - Información de la entidad
   * y declaración de cumplimiento con el marco normativo).
   *
   * Celdas E11-E32 con datos de la entidad, declaración de cumplimiento,
   * políticas significativas y sostenibilidad.
   */
  fillHoja11Sheet(
    worksheet: ExcelJS.Worksheet,
    options: TemplateWithDataOptions
  ): void {
    console.log('[R414] Escribiendo datos en Hoja11 (810000 - Información de la Entidad)...');

    const companyName = options.companyName;
    const domicilio = options.r414CompanyData?.domicilio || 'No reportado';
    const direccion = options.r414CompanyData?.direccion || 'No reportada';
    const emailInstitucional = options.r414CompanyData?.emailInstitucional || 'No reportado';

    const celdas: Array<{ celda: string; contenido: string }> = [
      {
        celda: 'E11',
        contenido: `Las presentes notas contienen información adicional a la presentada en los estados financieros de ${companyName}. Incluyen descripciones narrativas y detalladas de las principales partidas, así como la declaración de cumplimiento del marco normativo aplicable.`,
      },
      { celda: 'E12', contenido: companyName },
      { celda: 'E13', contenido: domicilio },
      { celda: 'E14', contenido: direccion },
      { celda: 'E15', contenido: emailInstitucional },
      {
        celda: 'E16',
        contenido: `${companyName} declara que los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia, la Resolución 414 de 2014 y sus modificatorios expedidos por la Contaduría General de la Nación, y demás disposiciones legales vigentes. La empresa cumple con todos los requerimientos de estas normas y no existen desviaciones significativas en su aplicación.`,
      },
      { celda: 'E17', contenido: 'No Aplica' },
      { celda: 'E18', contenido: 'No Aplica' },
      { celda: 'E20', contenido: 'No Aplica' },
      { celda: 'E21', contenido: 'No' },
      { celda: 'E22', contenido: '' },
      {
        celda: 'E23',
        contenido: `Las políticas contables significativas aplicadas en la preparación de los estados financieros se describen en las notas correspondientes. Se aplican de manera uniforme para todos los períodos presentados y son consistentes con las adoptadas en períodos anteriores.`,
      },
      {
        celda: 'E24',
        contenido: `Los estados financieros se preparan sobre la base del costo histórico, excepto por ciertos instrumentos financieros medidos a valor razonable. Las bases de medición se aplican conforme a lo establecido en el marco técnico normativo vigente para empresas de servicios públicos domiciliarios.`,
      },
      { celda: 'E25', contenido: 'No Aplica' },
      { celda: 'E26', contenido: 'No Aplica' },
      { celda: 'E28', contenido: 'No Aplica' },
      { celda: 'E29', contenido: 'No' },
      { celda: 'E30', contenido: 'SSPD - Superintendencia de Servicios Públicos Domiciliarios' },
      { celda: 'E31', contenido: 'No Aplica' },
      { celda: 'E32', contenido: 'No Aplica' },
    ];

    for (const item of celdas) {
      this.writeCell(worksheet, item.celda, item.contenido);
    }

    console.log(`[R414] Hoja11 completada - ${celdas.length} celdas escritas (E11 a E32).`);
  }

  // ============================================
  // HOJA35: FC08 - Conciliación de Ingresos [900031]
  // ============================================

  /**
   * Llena la Hoja35 [900031] FC08 - Conciliación de ingresos.
   * 
   * Esta hoja desglosa los ingresos de actividades ordinarias del Estado de Resultados
   * por tipo de ingreso para cada servicio (Acueducto, Alcantarillado, Aseo).
   * 
   * Estructura de columnas:
   * - G: Acueducto
   * - H: Alcantarillado
   * - I: Aseo
   * - J: Energía Eléctrica
   * - K: Gas combustible por redes
   * 
   * Para empresas de acueducto, alcantarillado y aseo, el ingreso principal proviene
   * de la prestación de servicios públicos domiciliarios (fila 26), que corresponde
   * a los "Ingresos de actividades ordinarias" del Estado de Resultados.
   * 
   * @param worksheet Hoja35 del workbook
   * @param sheet3 Hoja3 (Estado de Resultados) para obtener los valores de ingresos
   */
  protected fillFC08Sheet(
    worksheet: ExcelJS.Worksheet,
    sheet3: ExcelJS.Worksheet
  ): void {
    console.log('[R414] Llenando Hoja35 [900031] FC08 - Conciliación de ingresos...');

    // Mapeo de columnas Hoja3 (ER) → Hoja35 (FC08)
    // En Hoja3: E=Acueducto, F=Alcantarillado, G=Aseo
    // En Hoja35: G=Acueducto, H=Alcantarillado, I=Aseo
    const servicios = [
      { nombre: 'Acueducto', columnaER: 'E', columnaFC08: 'G' },
      { nombre: 'Alcantarillado', columnaER: 'F', columnaFC08: 'H' },
      { nombre: 'Aseo', columnaER: 'G', columnaFC08: 'I' },
    ];

    // Fila 14 en Hoja3 = "Ingresos de actividades ordinarias"
    // Esta fila se mapea a la fila 26 en Hoja35 = "Ingresos por prestación de servicios públicos domiciliarios"
    const filaIngresosER = 14;
    const filaIngresosFC08 = 26;

    for (const servicio of servicios) {
      // Obtener el valor de ingresos del Estado de Resultados
      const celdaER = `${servicio.columnaER}${filaIngresosER}`;
      const valorIngresos = safeNumericValue(sheet3.getCell(celdaER));

      if (valorIngresos !== 0) {
        // Escribir en la celda de "Ingresos por prestación de servicios públicos domiciliarios"
        const celdaFC08 = `${servicio.columnaFC08}${filaIngresosFC08}`;
        this.writeCell(worksheet, celdaFC08, valorIngresos);
        console.log(`  ${servicio.nombre}: ${valorIngresos.toLocaleString('es-CO')} -> ${celdaFC08}`);
      }
    }

    console.log('[R414] Hoja35 FC08 completada.');
  }

  // ============================================
  // HOJA37: FC15 - Información sobre el cálculo del IUS [900040]
  // ============================================

  /**
   * Llena la Hoja37 [900040] FC15 - Información sobre el cálculo del IUS.
   * 
   * El IUS (Índice Único Sectorial) es un indicador regulatorio de la CRA.
   * Esta hoja contiene:
   * - Caracterización de la empresa (segmento, calificación crediticia)
   * - Variables para el cálculo del IUS (recaudo, ingresos, costos, etc.)
   * 
   * Estructura de columnas:
   * - E: Acueducto
   * - F: Alcantarillado
   * - G: Total Empresa
   * - H: Información adicional
   * 
   * @param worksheet Hoja37 del workbook
   * @param sheet3 Hoja3 (Estado de Resultados) para obtener los ingresos
   */
}

// Exportar instancia por defecto
export const r414TemplateService = new R414TemplateService();

// Exportar también la clase para testing
export default R414TemplateService;
