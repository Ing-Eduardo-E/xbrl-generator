/**
 * Relleno de datos contables en templates Excel XBRL.
 * Contiene customizeExcelWithData y sus helpers.
 * Extraído de officialTemplateService.ts (L1062–2370).
 *
 * DEPENDENCIAS CRUZADAS (funciones en otros rangos del monolito):
 * - getRoundingDegreeLabel() en L1039 (antes del rango)
 * - SHEET_MAPPING (constante) en L97 (antes del rango)
 * - R414_ESF_MAPPINGS (constante) en L502 (antes del rango)
 * - R414_SERVICE_COLUMNS (constante) en L186 (antes del rango)
 * - R414_ER_MAPPINGS (constante) en L542 (antes del rango)
 * - R414_ER_COLUMNS (constante) en L512 (antes del rango)
 * - SERVICE_COLUMNS (constante) en L170 (antes del rango)
 * - getTaxonomyConfig() en taxonomyConfig.ts (importada externamente)
 * - ESF_CONCEPTS en taxonomyConfig.ts (importada externamente)
 * - findESFConceptByPUC() en taxonomyConfig.ts (importada externamente)
 * - R414ESFMapping (interface) en L201 (antes del rango)
 * - NiifGroup (type) en taxonomyConfig.ts
 */
import * as XLSX from 'xlsx';
import { ESF_CONCEPTS, getTaxonomyConfig, findESFConceptByPUC } from '../taxonomyConfig';
import type { NiifGroup } from '../taxonomyConfig';
import type { AccountData, ServiceBalanceData, TemplateCustomization, TemplateWithDataOptions } from './interfaces';
import {
  R414_SERVICE_COLUMNS,
  R414_ESF_MAPPINGS as _R414_ESF_MAPPINGS,
} from '../r414/mappings';
import { SHEET_MAPPING } from './templatePaths';

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — Constantes de mapeo y configuración (~L25-185)
// ═══════════════════════════════════════════════════════════════════════════

// SHEET_MAPPING importado desde templatePaths.ts (fuente canónica).

// DEUDA: SERVICE_COLUMNS está duplicado del monolito (L170). Mover a official/mappings/ e importar directamente en Fase 7.
const SERVICE_COLUMNS: Record<string, string> = {
  total: 'I',
  acueducto: 'J',
  alcantarillado: 'K',
  aseo: 'L',
  energia: 'M',
  gas: 'N',
  glp: 'O',
  otras: 'P',
  other: 'Q',
};

// R414_SERVICE_COLUMNS importado desde r414/mappings (fuente canónica).

// DEUDA: R414_ER_COLUMNS está duplicado del monolito (L512). Mover a official/mappings/ e importar directamente en Fase 7.
const R414_ER_COLUMNS: Record<string, string> = {
  acueducto: 'E',
  alcantarillado: 'F',
  aseo: 'G',
  total: 'L',
};

interface R414ESFMapping {
  row: number;
  label: string;
  pucPrefixes: string[];
  excludePrefixes?: string[];
}

// R414_ESF_MAPPINGS importado desde r414/mappings (fuente canónica).
const R414_ESF_MAPPINGS: R414ESFMapping[] = _R414_ESF_MAPPINGS as R414ESFMapping[];

// DEUDA: R414_ER_MAPPINGS está duplicado del monolito (L542). Mover a official/mappings/ e importar directamente en Fase 7.
const R414_ER_MAPPINGS: R414ESFMapping[] = [
  { row: 14, label: 'Ingresos de actividades ordinarias', pucPrefixes: ['43'] },
  { row: 15, label: 'Costo de ventas', pucPrefixes: ['6', '62', '63'] },
  { row: 17, label: 'Otros ingresos', pucPrefixes: ['41', '42', '44', '47', '48'], excludePrefixes: ['4802', '4807', '4808', '4810', '4815'] },
  { row: 18, label: 'Gastos de administración, operación y ventas', pucPrefixes: ['51', '52'] },
  { row: 19, label: 'Ingresos financieros', pucPrefixes: ['4802', '4807', '4808', '4810', '4815'] },
  { row: 20, label: 'Costos financieros', pucPrefixes: ['5802', '5803', '5807'] },
  { row: 21, label: 'Participación asociadas', pucPrefixes: ['4815', '5815'] },
  { row: 22, label: 'Otros gastos', pucPrefixes: ['53', '54', '56', '58'], excludePrefixes: ['5802', '5803', '5807', '5815', '5410'] },
  { row: 25, label: 'Impuesto a las ganancias corriente', pucPrefixes: ['540101'] },
  { row: 26, label: 'Impuesto a las ganancias diferido', pucPrefixes: ['5410'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — Helpers internos (~L190-223)
// Candidato de extracción: official/helpers/formatHelpers.ts
// ═══════════════════════════════════════════════════════════════════════════

// -----------------------------------------------------------------------
// Helper: getRoundingDegreeLabel
// DEUDA: getRoundingDegreeLabel está duplicado del monolito (L1039). Mover a official/helpers/ e importar directamente en Fase 7.
// -----------------------------------------------------------------------
function getRoundingDegreeLabel(degree: string | undefined): string {
  const labels: Record<string, string> = {
    '1': '1 - Pesos',
    '2': '2 - Miles de pesos',
    '3': '3 - Millones de pesos',
    '4': '4 - Pesos redondeada a miles',
  };
  return labels[degree || '1'] || '1 - Pesos';
}

// -----------------------------------------------------------------------
// Función principal exportada
// -----------------------------------------------------------------------

/**
 * Personaliza el archivo Excel con datos de la empresa Y datos financieros del balance.
 *
 * Llena:
 * - Hoja1 (110000): Metadatos de la empresa
 * - Hoja2 (210000): Estado de Situación Financiera
 * - Hoja3 (310000): Estado de Resultados
 * - Hojas FC01 (900017a-c,g): Gastos por servicio
 * - Hoja FC02 (900019): Complementario de ingresos
 * - Hojas FC03 (900021-23): CXC por servicio
 * - Hoja FC05b (900028b): Pasivos por edades de vencimiento
 * - Hoja9 (800500): Notas — lista de notas
 * - Hoja10 (800600): Notas — políticas contables
 * - Hoja11 (810000): Notas — información de la entidad
 * - Hojas IFE (Hoja3, Hoja4, Hoja5) cuando niifGroup === 'ife'
 *
 * @param xlsxBuffer - Buffer del archivo Excel plantilla
 * @param options - Opciones de personalización incluyendo datos financieros
 * @returns Buffer del archivo Excel modificado
 */
export function customizeExcelWithData(xlsxBuffer: Buffer, options: TemplateWithDataOptions): Buffer {
  // Leer el archivo Excel
  const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' });

  // ===============================================
  // PARTE 1: LLENAR HOJA1 CON METADATOS
  // ===============================================
  const sheet1 = workbook.Sheets['Hoja1'];
  if (sheet1) {
    // Función helper para establecer el valor de una celda de texto
    const setTextCell = (sheet: XLSX.WorkSheet, cell: string, value: string | undefined) => {
      if (value !== undefined && value !== '') {
        sheet[cell] = { t: 's', v: value };
      }
    };

    // C4 contiene el ID de empresa para XBRL Express
    setTextCell(sheet1, 'C4', options.companyId);

    // Llenar los campos de información general
    // NOTA: El orden de campos varía según la taxonomía
    if (options.niifGroup === 'r414') {
      // Orden específico para R414 (según plantilla oficial R414Ind_ID20037_2024-12-31.xlsx):
      // Las etiquetas están en columna C, los valores en columna E
      // E12: Nombre de la entidad
      // E13: Identificación de la Empresa (ID RUPS)
      // E14: NIT
      // E15: Descripción de la naturaleza de los EF ("1. Individual" o "2. Separado")
      // E16: Información sobre la naturaleza del negocio (texto)
      // E17: Fecha de inicio de operaciones (fecha)
      // E18: Fecha de cierre del período (fecha)
      // E19: Grado de redondeo (enumeration)
      // E21: ¿Presenta información reexpresada?
      // E22: Período reexpresado
      setTextCell(sheet1, 'E12', options.companyName);
      setTextCell(sheet1, 'E13', options.companyId);
      setTextCell(sheet1, 'E14', options.nit);
      setTextCell(sheet1, 'E15', '1. Individual'); // Naturaleza de EF
      setTextCell(sheet1, 'E16', options.businessNature || 'Servicios públicos'); // Naturaleza negocio
      setTextCell(sheet1, 'E17', options.startDate || '2005-01-01'); // Fecha inicio
      setTextCell(sheet1, 'E18', options.reportDate); // Fecha cierre
      setTextCell(sheet1, 'E19', getRoundingDegreeLabel(options.roundingDegree)); // Grado redondeo

      // Información reexpresada (filas 21-22)
      if (options.hasRestatedInfo === 'Sí' || options.hasRestatedInfo === '1. Sí') {
        setTextCell(sheet1, 'E21', '1. Sí');
        if (options.restatedPeriod) {
          setTextCell(sheet1, 'E22', options.restatedPeriod);
        }
      } else {
        setTextCell(sheet1, 'E21', '2. No');
      }
    } else if (options.niifGroup === 'ife') {
      // Orden específico para IFE trimestral
      // Según IFE_SegundoTrimestre_ID20037_2025-06-30.xml:
      // E13: NIT
      // E14: ID RUPS
      // E15: Nombre de la entidad
      // E16: Fecha de cierre del período
      // E18: Dirección sede administrativa
      // E19: Ciudad
      // E20: Teléfono fijo
      // E21: Teléfono celular
      // E22: Email corporativo
      // E24: Número de empleados inicio período
      // E25: Número de empleados fin período
      // E26: Promedio empleados
      // E28: Tipo documento RL (Representante Legal)
      // E29: Número documento RL
      // E30: Nombres RL
      // E31: Apellidos RL
      // E33: Grupo de clasificación
      // E34: Declaración de cumplimiento
      // E35: Incertidumbres negocio en marcha
      // E36: No es negocio en marcha
      // E38: Incertidumbres servicios RUPS
      // E39: Finalizó prestación servicios RUPS
      // E40: Detalle finalización servicios
      setTextCell(sheet1, 'E13', options.nit);
      setTextCell(sheet1, 'E14', options.companyId);
      setTextCell(sheet1, 'E15', options.companyName);
      setTextCell(sheet1, 'E16', options.reportDate);

      // Datos de la empresa IFE si están disponibles
      const ife = options.ifeCompanyData;
      if (ife) {
        setTextCell(sheet1, 'E18', ife.address);
        setTextCell(sheet1, 'E19', ife.city);
        setTextCell(sheet1, 'E20', ife.phone);
        setTextCell(sheet1, 'E21', ife.cellphone || ife.phone);
        setTextCell(sheet1, 'E22', ife.email);
        if (ife.employeesStart !== undefined) {
          sheet1['E24'] = { t: 'n', v: ife.employeesStart };
        }
        if (ife.employeesEnd !== undefined) {
          sheet1['E25'] = { t: 'n', v: ife.employeesEnd };
        }
        if (ife.employeesAverage !== undefined) {
          sheet1['E26'] = { t: 'n', v: ife.employeesAverage };
        }
        // Representante legal
        if (ife.representativeDocType) {
          const docTypeMap: Record<string, string> = {
            '01': '01 - CÉDULA DE CIUDADANÍA',
            '02': '02 - CÉDULA DE EXTRANJERÍA',
            '03': '03 - PASAPORTE',
          };
          setTextCell(sheet1, 'E28', docTypeMap[ife.representativeDocType] || ife.representativeDocType);
        }
        setTextCell(sheet1, 'E29', ife.representativeDocNumber);
        setTextCell(sheet1, 'E30', ife.representativeFirstName);
        setTextCell(sheet1, 'E31', ife.representativeLastName);
        // Marco normativo
        if (ife.normativeGroup) {
          const groupMap: Record<string, string> = {
            'R414': 'R. 414',
            'NIIF1': 'Grupo 1 - NIIF Plenas',
            'NIIF2': 'Grupo 2 - NIIF PYMES',
            'NIIF3': 'Grupo 3 - Microempresas',
          };
          setTextCell(sheet1, 'E33', groupMap[ife.normativeGroup] || ife.normativeGroup);
        } else {
          setTextCell(sheet1, 'E33', 'R. 414');
        }
        // Declaración de cumplimiento - XBRL schema: "1. Si cumple" / "2. No cumple"
        setTextCell(sheet1, 'E34', ife.complianceDeclaration ? '1. Si cumple' : '2. No cumple');
        // Incertidumbres negocio en marcha - XBRL schema: "1. Si" / "2. No"
        setTextCell(sheet1, 'E35', ife.goingConcernUncertainty ? '1. Si' : '2. No');
        setTextCell(sheet1, 'E36', ife.goingConcernExplanation || 'NA');
        // Continuidad servicios RUPS
        setTextCell(sheet1, 'E38', '2. No');
        setTextCell(sheet1, 'E39', ife.servicesTermination ? '1. Si' : '2. No');
        setTextCell(sheet1, 'E40', ife.servicesTerminationExplanation || 'NA');
      } else {
        // Valores por defecto cuando no hay datos de empresa IFE
        setTextCell(sheet1, 'E33', 'R. 414');
        // XBRL schema: "1. Si cumple" / "2. No cumple"
        setTextCell(sheet1, 'E34', '1. Si cumple');
        setTextCell(sheet1, 'E35', '2. No');
        setTextCell(sheet1, 'E36', 'NA');
        setTextCell(sheet1, 'E38', '2. No');
        setTextCell(sheet1, 'E39', '2. No');
        setTextCell(sheet1, 'E40', 'NA');
      }
    } else {
      // Orden para Grupo 1, 2, 3 (puede variar ligeramente)
      setTextCell(sheet1, 'E13', options.companyName);
      setTextCell(sheet1, 'E14', options.companyId);
      setTextCell(sheet1, 'E15', options.nit);
      setTextCell(sheet1, 'E16', options.businessNature);
      setTextCell(sheet1, 'E17', options.startDate);
      setTextCell(sheet1, 'E18', options.reportDate);
      setTextCell(sheet1, 'E19', getRoundingDegreeLabel(options.roundingDegree));

      // Información reexpresada
      if (options.hasRestatedInfo === 'Sí' || options.hasRestatedInfo === '1. Sí') {
        setTextCell(sheet1, 'E21', '1. Sí');
        if (options.restatedPeriod) {
          setTextCell(sheet1, 'E22', options.restatedPeriod);
        }
      } else {
        setTextCell(sheet1, 'E21', '2. No');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3 — Hoja2 (ESF) + Hoja3 (ER): Estados financieros principales (~L340-605)
  // Candidato de extracción: official/fillers/financialStatementsFiller.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // ===============================================
  // PARTE 2: LLENAR DATOS FINANCIEROS SI HAY DATOS
  // ===============================================
  if (options.consolidatedAccounts && options.consolidatedAccounts.length > 0) {
    const serviceBalances = options.serviceBalances || [];
    const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _config = getTaxonomyConfig(options.niifGroup);

    // Función para establecer valor numérico en celda
    // PRUEBA: Escribir como TEXTO (t:'s') igual que los campos del 110000
    // para ver si XBRL Express lo lee correctamente
    const setNumericCell = (sheet: XLSX.WorkSheet, cell: string, value: number) => {
      if (value !== 0 && value !== undefined && !isNaN(value)) {
        const stringValue = String(value);
        sheet[cell] = {
          t: 's',  // Tipo STRING en lugar de número
          v: stringValue,
          w: stringValue,
          h: stringValue
        };
      }
    };

    // Agrupar cuentas por servicio
    const accountsByService: Record<string, ServiceBalanceData[]> = {};
    for (const service of activeServices) {
      accountsByService[service] = serviceBalances.filter(sb => sb.service === service);
    }

    // ===============================================
    // HOJA2 (210000): Estado de Situación Financiera
    // ===============================================
    const sheet2Name = SHEET_MAPPING[options.niifGroup]?.['210000'];
    const sheet2 = sheet2Name ? workbook.Sheets[sheet2Name] : null;

    if (sheet2) {
      // Usar mapeo específico para R414, o el genérico para otros grupos
      if (options.niifGroup === 'r414') {
        // ===============================================
        // MAPEO ESPECÍFICO R414
        // Columnas: I=Acueducto, J=Alcantarillado, K=Aseo, P=Total
        // ===============================================

        // Función helper para verificar si una cuenta coincide con los prefijos
        const matchesPrefixes = (code: string, prefixes: string[], excludes?: string[]): boolean => {
          // Primero verificar exclusiones
          if (excludes) {
            for (const exclude of excludes) {
              if (code.startsWith(exclude)) {
                return false;
              }
            }
          }
          // Luego verificar si coincide con algún prefijo
          for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
              return true;
            }
          }
          return false;
        };

        // Procesar cada mapeo del ESF R414
        for (const mapping of R414_ESF_MAPPINGS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              totalValue += account.value;
            }
          }

          // Escribir valor total en columna P (R414)
          if (totalValue !== 0) {
            const totalCell = `${R414_SERVICE_COLUMNS.total}${mapping.row}`;
            setNumericCell(sheet2, totalCell, totalValue);
          }

          // Escribir valores por servicio en columnas I, J, K
          const r414ServiceColumnMap = R414_SERVICE_COLUMNS as unknown as Record<string, string | undefined>;
          for (const service of activeServices) {
            const serviceColumn = r414ServiceColumnMap[service];
            if (!serviceColumn) continue;

            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (matchesPrefixes(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
                serviceValue += account.value;
              }
            }

            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${mapping.row}`;
              setNumericCell(sheet2, serviceCell, serviceValue);
            }
          }
        }
      } else {
        // ===============================================
        // MAPEO GENÉRICO PARA GRUPO 1, 2, 3
        // Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo
        // ===============================================
        for (const concept of ESF_CONCEPTS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            const mappedConcept = findESFConceptByPUC(account.code);
            if (mappedConcept && mappedConcept.concept === concept.concept) {
              totalValue += account.value;
            }
          }

          // Escribir valor total en columna I
          if (totalValue !== 0) {
            const totalCell = `${SERVICE_COLUMNS.total}${concept.row}`;
            setNumericCell(sheet2, totalCell, totalValue);
          }

          // Escribir valores por servicio
          for (const service of activeServices) {
            const serviceColumn = SERVICE_COLUMNS[service];
            if (!serviceColumn) continue;

            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              const mappedConcept = findESFConceptByPUC(account.code);
              if (mappedConcept && mappedConcept.concept === concept.concept) {
                serviceValue += account.value;
              }
            }

            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${concept.row}`;
              setNumericCell(sheet2, serviceCell, serviceValue);
            }
          }
        }
      }
    }

    // ===============================================
    // HOJA3 (310000): Estado de Resultados
    // ===============================================
    const sheet3Name = SHEET_MAPPING[options.niifGroup]?.['310000'];
    const sheet3 = sheet3Name ? workbook.Sheets[sheet3Name] : null;

    if (sheet3) {
      // Usar mapeo específico para R414, o el genérico para otros grupos
      if (options.niifGroup === 'r414') {
        // ===============================================
        // MAPEO ESPECÍFICO R414 - ESTADO DE RESULTADOS
        // Columnas: E=Acueducto, F=Alcantarillado, G=Aseo, L=Total
        // ===============================================

        // Función helper para verificar si una cuenta coincide con los prefijos
        const matchesPrefixesER = (code: string, prefixes: string[], excludes?: string[]): boolean => {
          // Primero verificar exclusiones
          if (excludes) {
            for (const exclude of excludes) {
              if (code.startsWith(exclude)) {
                return false;
              }
            }
          }
          // Luego verificar si coincide con algún prefijo
          for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
              return true;
            }
          }
          return false;
        };

        // Procesar cada mapeo del ER R414
        for (const mapping of R414_ER_MAPPINGS) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixesER(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              totalValue += account.value;
            }
          }

          // Escribir valor total en columna L (R414 ER)
          if (totalValue !== 0) {
            const totalCell = `${R414_ER_COLUMNS.total}${mapping.row}`;
            setNumericCell(sheet3, totalCell, totalValue);
          }

          // Escribir valores por servicio en columnas E, F, G
          for (const service of activeServices) {
            const serviceColumn = R414_ER_COLUMNS[service];
            if (!serviceColumn) continue;

            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (matchesPrefixesER(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
                serviceValue += account.value;
              }
            }

            if (serviceValue !== 0) {
              const serviceCell = `${serviceColumn}${mapping.row}`;
              setNumericCell(sheet3, serviceCell, serviceValue);
            }
          }
        }
      } else {
        // ===============================================
        // MAPEO GENÉRICO PARA GRUPO 1, 2, 3
        // Columnas: I=Total, J=Acueducto, K=Alcantarillado, L=Aseo
        // ===============================================
        const ERMapping = [
          { row: 15, pucPrefix: '41', label: 'Ingresos de actividades ordinarias' },
          { row: 16, pucPrefix: '42', label: 'Otros ingresos operacionales' },
          { row: 17, pucPrefix: '61', label: 'Costo de ventas' },
          { row: 21, pucPrefix: '51', label: 'Gastos de administración' },
          { row: 22, pucPrefix: '52', label: 'Gastos de ventas' },
          { row: 25, pucPrefix: '53', label: 'Gastos financieros' },
          { row: 26, pucPrefix: '4210', label: 'Ingresos financieros' },
        ];

        for (const mapping of ERMapping) {
          // Calcular total consolidado
          let totalValue = 0;
          for (const account of options.consolidatedAccounts) {
            if (!account.isLeaf) continue;
            if (account.code.startsWith(mapping.pucPrefix)) {
              totalValue += account.value;
            }
          }

          if (totalValue !== 0) {
            setNumericCell(sheet3, `${SERVICE_COLUMNS.total}${mapping.row}`, totalValue);
          }

          // Valores por servicio
          for (const service of activeServices) {
            const serviceColumn = SERVICE_COLUMNS[service];
            if (!serviceColumn) continue;

            let serviceValue = 0;
            const serviceAccounts = accountsByService[service] || [];
            for (const account of serviceAccounts) {
              if (!account.isLeaf) continue;
              if (account.code.startsWith(mapping.pucPrefix)) {
                serviceValue += account.value;
              }
            }

            if (serviceValue !== 0) {
              setNumericCell(sheet3, `${serviceColumn}${mapping.row}`, serviceValue);
            }
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 4 — Hojas FC01/FC02/FC03/FC05b: Formularios complementarios (~L610-835)
    // Candidato de extracción: official/fillers/complementaryFormsFiller.ts
    // ═══════════════════════════════════════════════════════════════════════════

    // ===============================================
    // HOJAS FC01 (900017a-c): Gastos por servicio
    // ===============================================
    const FC01_EXPENSE_MAPPING = [
      { row: 13, pucPrefixes: ['5105', '510506', '510503', '510509'], label: 'Sueldos y salarios' },
      { row: 14, pucPrefixes: ['5110', '5115', '5120', '5125'], label: 'Prestaciones sociales' },
      { row: 15, pucPrefixes: ['5135', '513525', '513530'], label: 'Servicios públicos' },
      { row: 16, pucPrefixes: ['5130'], label: 'Seguros' },
      { row: 17, pucPrefixes: ['5140', '5145'], label: 'Servicios técnicos' },
      { row: 18, pucPrefixes: ['5150', '515005', '515010'], label: 'Mantenimiento' },
      { row: 19, pucPrefixes: ['5260', '526005', '526010'], label: 'Depreciaciones' },
      { row: 20, pucPrefixes: ['5265'], label: 'Amortizaciones' },
      { row: 21, pucPrefixes: ['5165', '5170'], label: 'Transporte y viajes' },
      { row: 22, pucPrefixes: ['5195', '5295'], label: 'Otros gastos' },
    ];

    const fc01Services = [
      { sheetCode: '900017a', service: 'acueducto' },
      { sheetCode: '900017b', service: 'alcantarillado' },
      { sheetCode: '900017c', service: 'aseo' },
    ];

    for (const fc01 of fc01Services) {
      const sheetName = SHEET_MAPPING[options.niifGroup]?.[fc01.sheetCode];
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;

      if (sheet && activeServices.includes(fc01.service)) {
        const serviceAccounts = accountsByService[fc01.service] || [];

        for (const mapping of FC01_EXPENSE_MAPPING) {
          let value = 0;
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                value += account.value;
                break;
              }
            }
          }

          // FC01 usa columna E para valores del período actual
          if (value !== 0) {
            setNumericCell(sheet, `E${mapping.row}`, value);
          }
        }
      }
    }

    // ===============================================
    // HOJA FC01-7 (900017g): Total servicios públicos
    // ===============================================
    const fc01TotalSheetName = SHEET_MAPPING[options.niifGroup]?.['900017g'];
    const fc01TotalSheet = fc01TotalSheetName ? workbook.Sheets[fc01TotalSheetName] : null;

    if (fc01TotalSheet) {
      for (const mapping of FC01_EXPENSE_MAPPING) {
        let totalValue = 0;

        // Sumar todos los servicios activos
        for (const service of activeServices) {
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                totalValue += account.value;
                break;
              }
            }
          }
        }

        if (totalValue !== 0) {
          setNumericCell(fc01TotalSheet, `E${mapping.row}`, totalValue);
        }
      }
    }

    // ===============================================
    // HOJA FC02 (900019): Complementario de Ingresos
    // Detalla los ingresos operacionales por servicio
    // ===============================================
    const FC02_INCOME_MAPPING = [
      // Acueducto (filas 15-18)
      { row: 15, service: 'acueducto', pucPrefixes: ['410505', '4105051'], label: 'Abastecimiento' },
      { row: 16, service: 'acueducto', pucPrefixes: ['410510', '4105102'], label: 'Distribución' },
      { row: 17, service: 'acueducto', pucPrefixes: ['410515', '4105153'], label: 'Comercialización' },
      { row: 18, service: 'acueducto', pucPrefixes: ['4105'], label: 'Subtotal Acueducto', isSubtotal: true },
      // Alcantarillado (filas 20-23)
      { row: 20, service: 'alcantarillado', pucPrefixes: ['410520', '4105204'], label: 'Recolección y transporte' },
      { row: 21, service: 'alcantarillado', pucPrefixes: ['410525', '4105255'], label: 'Tratamiento' },
      { row: 22, service: 'alcantarillado', pucPrefixes: ['410530', '4105306'], label: 'Comercialización' },
      { row: 23, service: 'alcantarillado', pucPrefixes: ['4105'], label: 'Subtotal Alcantarillado', isSubtotal: true },
      // Aseo (filas 25-35)
      { row: 25, service: 'aseo', pucPrefixes: ['410535', '4105357'], label: 'Recolección y transporte' },
      { row: 26, service: 'aseo', pucPrefixes: ['410540', '4105408'], label: 'Disposición final' },
      { row: 27, service: 'aseo', pucPrefixes: ['410545', '4105459'], label: 'Tratamiento de lixiviados' },
      { row: 28, service: 'aseo', pucPrefixes: ['410550', '4105510'], label: 'Comercialización' },
      { row: 35, service: 'aseo', pucPrefixes: ['4105'], label: 'Subtotal Aseo', isSubtotal: true },
    ];

    const fc02SheetName = SHEET_MAPPING[options.niifGroup]?.['900019'];
    const fc02Sheet = fc02SheetName ? workbook.Sheets[fc02SheetName] : null;

    if (fc02Sheet) {
      for (const mapping of FC02_INCOME_MAPPING) {
        if (!activeServices.includes(mapping.service)) continue;

        const serviceAccounts = accountsByService[mapping.service] || [];
        let value = 0;

        for (const account of serviceAccounts) {
          if (!account.isLeaf) continue;
          for (const prefix of mapping.pucPrefixes) {
            if (account.code.startsWith(prefix)) {
              value += account.value;
              break;
            }
          }
        }

        if (value !== 0) {
          // FC02 usa columna G para valores del período actual
          setNumericCell(fc02Sheet, `G${mapping.row}`, value);
        }
      }
    }

    // ===============================================
    // HOJAS FC03 (900021-23): CXC por servicio
    // Detalla las cuentas por cobrar por tipo de usuario
    // ===============================================
    const FC03_CXC_MAPPING = [
      { row: 16, pucPrefixes: ['1305', '130505'], label: 'Distribución' },
      { row: 17, pucPrefixes: ['1310', '131005'], label: 'Otros Servicios' },
      { row: 19, pucPrefixes: ['130510', '1305101'], label: 'Residencial Estrato 1' },
      { row: 20, pucPrefixes: ['130515', '1305152'], label: 'Residencial Estrato 2' },
      { row: 21, pucPrefixes: ['130520', '1305203'], label: 'Residencial Estrato 3' },
      { row: 22, pucPrefixes: ['130525', '1305254'], label: 'Residencial Estrato 4' },
      { row: 23, pucPrefixes: ['130530', '1305305'], label: 'Residencial Estrato 5' },
      { row: 24, pucPrefixes: ['130535', '1305356'], label: 'Residencial Estrato 6' },
      { row: 25, pucPrefixes: ['130540', '1305407'], label: 'No residencial industrial' },
      { row: 26, pucPrefixes: ['130545', '1305458'], label: 'No residencial comercial' },
      { row: 27, pucPrefixes: ['130550', '1305509'], label: 'Oficial' },
      { row: 28, pucPrefixes: ['130555', '1305510'], label: 'Otros usuarios' },
    ];

    const fc03Services = [
      { sheetCode: '900021', service: 'acueducto' },
      { sheetCode: '900022', service: 'alcantarillado' },
      { sheetCode: '900023', service: 'aseo' },
    ];

    for (const fc03 of fc03Services) {
      const sheetName = SHEET_MAPPING[options.niifGroup]?.[fc03.sheetCode];
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;

      if (sheet && activeServices.includes(fc03.service)) {
        const serviceAccounts = accountsByService[fc03.service] || [];

        for (const mapping of FC03_CXC_MAPPING) {
          let value = 0;
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                value += account.value;
                break;
              }
            }
          }

          // FC03 usa columna G para valores corrientes
          if (value !== 0) {
            setNumericCell(sheet, `G${mapping.row}`, value);
          }
        }
      }
    }

    // ===============================================
    // HOJA FC05b (900028b): Pasivos por edades de vencimiento
    // Estructura: Fila 15-29 = categorías de pasivo
    // Columnas: D=Corriente, F=No corriente, G=Total pasivos
    // ===============================================
    const FC05B_PAYABLES_MAPPING = [
      { row: 15, pucPrefixes: ['2505', '2510'], label: 'Nómina por pagar' },
      { row: 16, pucPrefixes: ['2515', '2520'], label: 'Prestaciones sociales' },
      { row: 17, pucPrefixes: ['2205', '2210', '22'], label: 'Cuentas comerciales por pagar' },
      { row: 18, pucPrefixes: ['24'], label: 'Impuestos por pagar' },
      { row: 19, pucPrefixes: ['23'], label: 'Cuentas por pagar a partes relacionadas' },
      { row: 20, pucPrefixes: ['21'], label: 'Obligaciones financieras' },
      { row: 21, pucPrefixes: ['27'], label: 'Ingresos recibidos por anticipado' },
      { row: 22, pucPrefixes: ['2404', '2408'], label: 'Pasivos por impuesto diferido' },
      { row: 23, pucPrefixes: ['26'], label: 'Provisiones' },
      { row: 29, pucPrefixes: ['28'], label: 'Otros pasivos' },
    ];

    const fc05bSheetName = SHEET_MAPPING[options.niifGroup]?.['900028b'];
    const fc05bSheet = fc05bSheetName ? workbook.Sheets[fc05bSheetName] : null;

    if (fc05bSheet) {
      for (const mapping of FC05B_PAYABLES_MAPPING) {
        let totalValue = 0;

        // Sumar todos los servicios activos
        for (const service of activeServices) {
          const serviceAccounts = accountsByService[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            for (const prefix of mapping.pucPrefixes) {
              if (account.code.startsWith(prefix)) {
                totalValue += account.value;
                break;
              }
            }
          }
        }

        // Columna G = Total pasivos por balance
        if (totalValue !== 0) {
          setNumericCell(fc05bSheet, `G${mapping.row}`, totalValue);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 5 — Hoja9/10/11: Notas textuales NIIF (~L840-1275)
    // Candidato de extracción: official/fillers/notesFiller.ts
    // ═══════════════════════════════════════════════════════════════════════════

    // ===============================================
    // HOJA9 (800500): Notas - Lista de Notas
    // Bloques de texto para revelaciones NIIF
    // Para empresas de servicios públicos
    // ===============================================
    const sheet9 = workbook.Sheets['Hoja9'];

    if (sheet9) {
      // Función helper para establecer texto en celda de nota
      const setNoteCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };

      // Información de la empresa para usar en notas
      const companyName = options.companyName || 'La empresa';
      const reportDate = options.reportDate || new Date().toISOString().split('T')[0];
      const reportYear = reportDate.split('-')[0];

      // ===== NOTAS CON CONTENIDO ESTÁNDAR =====
      // Estas notas son comunes y cortas para empresas de servicios públicos

      // Fila 11: Información a revelar sobre notas y otra información explicativa [OBLIGATORIO]
      setNoteCell(sheet9, 'E11',
        `Las presentes notas a los estados financieros contienen información adicional a la presentada en el Estado de Situación Financiera y el Estado de Resultados. Proporcionan descripciones narrativas o desagregaciones de partidas presentadas en dichos estados, así como información sobre partidas que no cumplen las condiciones para ser reconocidas en ellos. Las notas se presentan de forma sistemática, haciendo referencia cruzada para cada partida de los estados financieros con cualquier información relacionada en las notas.`
      );

      // Fila 14: Autorización de estados financieros
      setNoteCell(sheet9, 'E14',
        `Los estados financieros de ${companyName} al ${reportDate} fueron autorizados para su emisión por la Junta Directiva en su reunión celebrada en el mes de marzo de ${parseInt(reportYear) + 1}.`
      );

      // Fila 15: Efectivo y equivalentes al efectivo
      setNoteCell(sheet9, 'E15',
        `El efectivo y equivalentes al efectivo incluyen el dinero en caja, depósitos a la vista en bancos y otras inversiones a corto plazo de alta liquidez con vencimiento original de tres meses o menos. Se reconocen al costo.`
      );

      // Fila 19: Gastos por depreciación y amortización
      setNoteCell(sheet9, 'E19',
        `La depreciación se calcula usando el método de línea recta sobre la vida útil estimada de los activos. Las vidas útiles estimadas son: edificaciones 20-50 años, redes y tuberías 20-40 años, maquinaria y equipo 10-15 años, equipo de oficina 5-10 años, equipo de cómputo 3-5 años, vehículos 5-10 años.`
      );

      // Fila 22: Beneficios a los empleados
      setNoteCell(sheet9, 'E22',
        `Los beneficios a empleados de corto plazo incluyen salarios, seguridad social, prestaciones legales y extralegales. Se reconocen como gasto cuando el empleado ha prestado el servicio. Las obligaciones por beneficios definidos se calculan actuarialmente.`
      );

      // Fila 23: Hechos ocurridos después del período
      setNoteCell(sheet9, 'E23',
        `No se han presentado hechos posteriores al cierre del período que requieran ajuste o revelación en los estados financieros.`
      );

      // Fila 29: Información general sobre los estados financieros
      setNoteCell(sheet9, 'E29',
        `${companyName} es una empresa de servicios públicos domiciliarios que opera bajo la regulación de la Ley 142 de 1994 y la supervisión de la Superintendencia de Servicios Públicos Domiciliarios. Los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la CGN.`
      );

      // Fila 38: Impuestos a las ganancias
      setNoteCell(sheet9, 'E38',
        `El gasto por impuesto a las ganancias comprende el impuesto corriente y el impuesto diferido. El impuesto corriente se calcula sobre la base imponible del período usando las tasas vigentes. El impuesto diferido se reconoce sobre las diferencias temporarias entre las bases fiscales y contables de activos y pasivos.`
      );

      // Fila 44: Inventarios
      setNoteCell(sheet9, 'E44',
        `Los inventarios se valoran al menor entre el costo y el valor neto realizable. El costo se determina usando el método promedio ponderado. Incluyen materiales para mantenimiento de redes, químicos para tratamiento de agua y otros suministros operacionales.`
      );

      // Fila 59: Propiedades, planta y equipo
      setNoteCell(sheet9, 'E59',
        `Las propiedades, planta y equipo se reconocen al costo menos depreciación acumulada y pérdidas por deterioro. Incluyen terrenos, edificaciones, redes de acueducto y alcantarillado, plantas de tratamiento, maquinaria, equipos y vehículos. Las mejoras que aumentan la vida útil se capitalizan; el mantenimiento ordinario se reconoce como gasto.`
      );

      // Fila 60: Provisiones
      setNoteCell(sheet9, 'E60',
        `Las provisiones se reconocen cuando existe una obligación presente, legal o implícita, como resultado de un evento pasado, es probable que se requiera una salida de recursos y se puede estimar confiablemente el monto. Incluyen provisiones para litigios, garantías y obligaciones ambientales.`
      );

      // Fila 64: Ingresos de actividades ordinarias
      setNoteCell(sheet9, 'E64',
        `Los ingresos de actividades ordinarias provienen de la prestación de servicios públicos domiciliarios de acueducto, alcantarillado y aseo. Se reconocen cuando el servicio ha sido prestado, el importe puede medirse confiablemente y es probable que los beneficios económicos fluyan a la entidad. Las tarifas se determinan según la regulación de la CRA.`
      );

      // Fila 66: Acreedores comerciales y otras cuentas por pagar
      setNoteCell(sheet9, 'E66',
        `Las cuentas por pagar comerciales incluyen obligaciones con proveedores de bienes y servicios relacionados con la operación. Se reconocen al valor de la factura y se miden posteriormente al costo amortizado. Generalmente tienen vencimientos menores a un año.`
      );

      // Fila 67: Deudores comerciales y otras cuentas por cobrar
      setNoteCell(sheet9, 'E67',
        `Las cuentas por cobrar comerciales corresponden principalmente a la facturación de servicios públicos a usuarios residenciales, comerciales, industriales y oficiales. Se reconocen al valor de la factura y se miden al costo amortizado. Se evalúa el deterioro considerando la antigüedad de cartera y la experiencia histórica de recuperación.`
      );

      // ===== CAMPOS DE SUBVENCIONES DEL GOBIERNO (filas 32-36) =====
      // Estos campos son obligatorios y van dentro de la sección de subvenciones (fila 31)
      // Para empresas que NO reciben subvenciones, se indica "NA"

      // Fila 32: Descripción de la naturaleza y cuantía de las subvenciones reconocidas
      setNoteCell(sheet9, 'E32',
        `NA - La entidad no ha recibido subvenciones del gobierno durante el periodo.`
      );

      // Fila 33: Descripción de las condiciones cumplidas, por cumplir y otras contingencias
      setNoteCell(sheet9, 'E33',
        `NA - No aplica, no se han recibido subvenciones gubernamentales.`
      );

      // Fila 34: Periodos que cubre la subvención, así como los montos amortizados y por amortizar
      setNoteCell(sheet9, 'E34',
        `NA - No aplica, no existen subvenciones por amortizar.`
      );

      // Fila 35: Descripción de las subvenciones a las que no se les haya podido asignar un valor
      setNoteCell(sheet9, 'E35',
        `NA - No aplica, no se han recibido subvenciones.`
      );

      // Fila 36: Descripción de otro tipo de ayudas gubernamentales
      setNoteCell(sheet9, 'E36',
        `NA - La entidad no ha recibido ayudas gubernamentales durante el periodo reportado.`
      );

      // ===== NOTAS CON "NA" (No Aplica) =====
      // Estas notas generalmente no aplican para empresas típicas de servicios públicos

      const notasNA = [
        12, // Juicios y estimaciones contables (muy técnica)
        13, // Remuneración de auditores
        16, // Estado de flujos de efectivo (se llena en otra hoja)
        17, // Activos contingentes
        18, // Compromisos y pasivos contingentes
        20, // Instrumentos financieros derivados
        21, // Variaciones en tasas de cambio
        24, // Gastos (se detalla en otras hojas)
        25, // Ingresos/costos financieros
        26, // Instrumentos financieros
        27, // Gestión del riesgo financiero
        28, // Adopción por primera vez
        30, // Plusvalía
        31, // Subvenciones del gobierno (encabezado general)
        37, // Deterioro de valor de activos
        39, // Empleados (número)
        40, // Personal clave de la gerencia
        41, // Activos intangibles
        42, // Gastos por intereses
        43, // Ingresos por intereses
        45, // Propiedades de inversión
        46, // Inversiones método participación
        47, // Otras inversiones
        48, // Arrendamientos
        49, // Préstamos y anticipos a bancos
        50, // Préstamos y anticipos a clientes
        51, // Gestión del capital
        52, // Otros activos corrientes
        53, // Otros pasivos corrientes
        54, // Otros activos no corrientes
        55, // Otros pasivos no corrientes
        56, // Otros ingresos/gastos de operación
        57, // Anticipos y otros activos
        58, // Ganancias/pérdidas por operación
        61, // Gastos de investigación y desarrollo
        62, // Reservas dentro de patrimonio
        63, // Efectivo restringido
        65, // Cuentas por cobrar/pagar por impuestos
      ];

      for (const row of notasNA) {
        setNoteCell(sheet9, `E${row}`, 'NA');
      }
    }

    // ===============================================
    // HOJA10 (800600): Notas - Lista de Políticas Contables
    // Descripción de las políticas contables aplicadas
    // Para empresas de servicios públicos
    // ===============================================
    const sheet10 = workbook.Sheets['Hoja10'];

    if (sheet10) {
      // Función helper para establecer texto en celda de política
      // NOTA: Hoja10 usa columna D (a diferencia de Hoja09 que usa columna E)
      // porque el encabezado "Periodo Actual" está en D10, no en E10
      const setPolicyCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };

      // ===== POLÍTICAS CON CONTENIDO ESTÁNDAR =====
      // Políticas comunes y aplicables a empresas de servicios públicos

      // Fila 11: Información a revelar sobre un resumen de las políticas contables significativas [OBLIGATORIO]
      setPolicyCell(sheet10, 'D11',
        `Las políticas contables significativas aplicadas en la preparación de estos estados financieros se resumen a continuación. Estas políticas han sido aplicadas consistentemente para todos los períodos presentados, salvo que se indique lo contrario. Los estados financieros han sido preparados de conformidad con las Normas de Información Financiera aplicables en Colombia y la Resolución 414 de 2014 de la CGN para empresas de servicios públicos domiciliarios.`
      );

      // Fila 16: Beneficios a los empleados
      setPolicyCell(sheet10, 'D16',
        `Los beneficios a empleados de corto plazo se reconocen como gasto cuando el empleado presta el servicio. Incluyen salarios, aportes a seguridad social, prestaciones sociales legales y extralegales. Los beneficios post-empleo se reconocen según el tipo de plan: contribución definida (gasto cuando se paga) o beneficio definido (obligación actuarial).`
      );

      // Fila 17: Gastos
      setPolicyCell(sheet10, 'D17',
        `Los gastos se reconocen cuando se incurren, independientemente del momento del pago, aplicando el principio de devengo. Se clasifican en gastos de administración, operación y ventas según su función. Los gastos de operación incluyen costos directamente relacionados con la prestación de servicios públicos.`
      );

      // Fila 22: Deterioro del valor de activos
      setPolicyCell(sheet10, 'D22',
        `Al cierre de cada período se evalúa si existe indicación de deterioro de activos. Si existe, se estima el valor recuperable como el mayor entre el valor razonable menos costos de venta y el valor en uso. Si el valor en libros excede el recuperable, se reconoce una pérdida por deterioro. Para cuentas por cobrar se aplica el modelo de pérdidas crediticias esperadas.`
      );

      // Fila 23: Impuestos a las ganancias
      setPolicyCell(sheet10, 'D23',
        `El gasto por impuesto comprende el impuesto corriente y diferido. El corriente se calcula sobre la renta líquida gravable usando tasas vigentes. El diferido se reconoce sobre diferencias temporarias entre bases contables y fiscales, usando el método del pasivo. Los activos por impuesto diferido se reconocen si es probable obtener ganancias fiscales futuras.`
      );

      // Fila 28: Capital emitido
      setPolicyCell(sheet10, 'D28',
        `El capital social se reconoce al valor nominal de las acciones o aportes suscritos y pagados. Las primas en colocación de acciones se registran en el patrimonio. Los costos de transacción relacionados con emisión de instrumentos de patrimonio se deducen directamente del patrimonio.`
      );

      // Fila 30: Préstamos y cuentas por cobrar
      setPolicyCell(sheet10, 'D30',
        `Las cuentas por cobrar comerciales se reconocen inicialmente al precio de la transacción. Posteriormente se miden al costo amortizado menos deterioro. El deterioro se calcula usando el modelo de pérdidas crediticias esperadas, considerando la experiencia histórica de pérdidas, las condiciones actuales y proyecciones futuras.`
      );

      // Fila 31: Inventarios
      setPolicyCell(sheet10, 'D31',
        `Los inventarios se miden al menor entre el costo y el valor neto realizable. El costo se determina usando el método del promedio ponderado. Incluyen materiales para mantenimiento de redes, químicos para tratamiento de agua, repuestos y suministros. Se evalúa periódicamente la obsolescencia y se reconocen ajustes cuando el valor realizable es menor al costo.`
      );

      // Fila 33: Propiedades, planta y equipo
      setPolicyCell(sheet10, 'D33',
        `Las propiedades, planta y equipo se reconocen al costo menos depreciación acumulada y deterioro. El costo incluye precio de adquisición, costos directamente atribuibles y costos de desmantelamiento. La depreciación se calcula por línea recta sobre la vida útil estimada. Las mejoras se capitalizan; el mantenimiento se reconoce como gasto. Se revisan las vidas útiles y valores residuales anualmente.`
      );

      // Fila 34: Provisiones
      setPolicyCell(sheet10, 'D34',
        `Las provisiones se reconocen cuando existe una obligación presente (legal o implícita) resultado de un evento pasado, es probable una salida de recursos y el monto puede estimarse confiablemente. Se miden al mejor estimado del desembolso requerido. Las provisiones de largo plazo se descuentan a valor presente si el efecto es material.`
      );

      // Fila 35: Reconocimiento de ingresos de actividades ordinarias
      setPolicyCell(sheet10, 'D35',
        `Los ingresos por prestación de servicios públicos se reconocen cuando el servicio ha sido prestado, el importe puede medirse confiablemente y es probable que los beneficios económicos fluyan a la entidad. La facturación se realiza mensualmente según consumo medido o estimado. Los subsidios y contribuciones se reconocen según las disposiciones regulatorias de la CRA.`
      );

      // Fila 38: Acreedores comerciales y otras cuentas por pagar
      setPolicyCell(sheet10, 'D38',
        `Las cuentas por pagar comerciales se reconocen al valor de la factura cuando se reciben los bienes o servicios. Posteriormente se miden al costo amortizado. No se descuentan si el efecto del valor temporal del dinero no es significativo. Incluyen obligaciones con proveedores, contratistas y acreedores varios relacionados con la operación.`
      );

      // Fila 40: Otras políticas contables relevantes
      setPolicyCell(sheet10, 'D40',
        `Bases de preparación: Los estados financieros se preparan bajo NIIF para Pymes adoptadas en Colombia y la Resolución 414 de 2014 de la CGN. Moneda funcional y de presentación: Peso colombiano. Efectivo: Incluye caja, bancos e inversiones de alta liquidez con vencimiento menor a 3 meses. Aportes y contribuciones: Se reconocen según regulación sectorial aplicable a empresas de servicios públicos.`
      );

      // Fila 13: Descripción de la política contable sobre costos de financiación
      setPolicyCell(sheet10, 'D13',
        `Los costos por préstamos directamente atribuibles a la adquisición, construcción o producción de activos aptos se capitalizan como parte del costo del activo. Los demás costos por préstamos se reconocen como gasto en el período en que se incurren. La capitalización se suspende durante períodos prolongados de interrupción de las actividades de desarrollo.`
      );

      // Fila 14: Descripción de la política contable sobre préstamos
      setPolicyCell(sheet10, 'D14',
        `Los préstamos se reconocen inicialmente al valor razonable menos los costos de transacción. Posteriormente se miden al costo amortizado utilizando el método del interés efectivo. Los intereses devengados se reconocen como gasto financiero. Se clasifican como pasivos corrientes o no corrientes según su vencimiento.`
      );

      // Fila 15: Descripción de la política contable sobre instrumentos financieros derivados
      setPolicyCell(sheet10, 'D15',
        `La entidad no utiliza instrumentos financieros derivados para especulación. En caso de utilizarse con fines de cobertura, se reconocen inicialmente al valor razonable y se miden posteriormente según su clasificación. Los cambios en el valor razonable se reconocen en resultados, excepto las coberturas de flujo de efectivo eficaces que se reconocen en otro resultado integral.`
      );

      // Fila 18: Descripción de la política contable sobre conversión de moneda extranjera
      setPolicyCell(sheet10, 'D18',
        `Las transacciones en moneda extranjera se convierten a la moneda funcional usando las tasas de cambio vigentes a la fecha de la transacción. Las partidas monetarias en moneda extranjera al cierre se convierten usando la tasa de cierre. Las diferencias en cambio se reconocen en el resultado del período, excepto las relacionadas con financiamiento de activos aptos.`
      );

      // Fila 19: Descripción de la política contable de la moneda funcional
      setPolicyCell(sheet10, 'D19',
        `La moneda funcional y de presentación de la entidad es el peso colombiano (COP), que es la moneda del entorno económico principal donde opera. Esta determinación se basa en que los ingresos, costos, financiamiento y operaciones se denominan principalmente en pesos colombianos.`
      );

      // Fila 20: Descripción de la política contable sobre plusvalía
      setPolicyCell(sheet10, 'D20',
        `La plusvalía surge de la adquisición de subsidiarias y representa el exceso del costo de adquisición sobre el valor razonable de los activos netos identificables adquiridos. Se mide posteriormente al costo menos pérdidas por deterioro acumuladas. No se amortiza pero se somete a pruebas de deterioro anuales.`
      );

      // Fila 21: Descripción de la política contable para subvenciones del gobierno
      setPolicyCell(sheet10, 'D21',
        `Las subvenciones gubernamentales se reconocen cuando existe seguridad razonable de que se cumplirán las condiciones y que se recibirá la subvención. Se reconocen en resultados sistemáticamente durante los períodos necesarios para asociarlas con los costos relacionados. Las subvenciones para activos se presentan reduciendo el valor en libros del activo o como ingreso diferido.`
      );

      // Fila 24: Descripción de la política contable sobre activos intangibles distintos a la plusvalía
      setPolicyCell(sheet10, 'D24',
        `Los activos intangibles adquiridos separadamente se miden al costo menos amortización y deterioro acumulados. La amortización se calcula por línea recta sobre la vida útil estimada. Los activos con vida útil indefinida no se amortizan pero se someten a pruebas de deterioro anuales. Los activos intangibles generados internamente, excepto costos de desarrollo que cumplan criterios específicos, se reconocen como gasto.`
      );

      // Fila 25: Descripción de la política contable sobre inversiones en asociadas
      setPolicyCell(sheet10, 'D25',
        `Las inversiones en asociadas se reconocen usando el método de participación patrimonial. Se miden inicialmente al costo y posteriormente se ajustan por la participación en los cambios del patrimonio de la asociada. Los dividendos recibidos reducen el valor en libros. Se evalúan indicadores de deterioro anualmente.`
      );

      // Fila 26: Descripción de la política contable para inversiones en negocios conjuntos
      setPolicyCell(sheet10, 'D26',
        `Las inversiones en negocios conjuntos se reconocen usando el método de participación patrimonial. Se miden inicialmente al costo incluyendo costos de transacción. Posteriormente se ajustan por la participación en los resultados y otros cambios en el patrimonio del negocio conjunto.`
      );

      // Fila 27: Descripción de la política contable sobre propiedades de inversión
      setPolicyCell(sheet10, 'D27',
        `Las propiedades de inversión son propiedades mantenidas para obtener rentas o apreciación de capital. Se reconocen inicialmente al costo incluyendo costos de transacción. Posteriormente se miden al modelo del costo (costo menos depreciación acumulada y deterioro). La depreciación se calcula por línea recta sobre la vida útil estimada de los edificios.`
      );

      // Fila 29: Descripción de la política contable sobre arrendamientos
      setPolicyCell(sheet10, 'D29',
        `Los arrendamientos se evalúan al inicio para determinar si transfieren sustancialmente los riesgos y beneficios. Los arrendamientos financieros se reconocen como activo y pasivo al menor entre el valor razonable y el valor presente de los pagos mínimos. Los arrendamientos operativos se reconocen como gasto de forma lineal durante el plazo del arrendamiento.`
      );

      // Fila 37: Descripción de la política contable sobre efectivo restringido
      setPolicyCell(sheet10, 'D37',
        `El efectivo restringido comprende fondos con restricciones de uso por compromisos contractuales, regulatorios o legales. Se clasifica como activo corriente o no corriente según el plazo de la restricción. Las restricciones incluyen fondos para garantías, depósitos en garantía, fondos especiales y recursos con destinación específica.`
      );

      // Fila 39: Descripción de la política contable sobre transacciones con partes relacionadas
      setPolicyCell(sheet10, 'D39',
        `Las transacciones con partes relacionadas se realizan en condiciones de mercado. Se consideran partes relacionadas: accionistas controlantes, subsidiarias, asociadas, directivos clave y sus familiares cercanos. Las transacciones y saldos pendientes se revelan en notas a los estados financieros según los requerimientos de la NIC 24.`
      );

      // Fila 41: Descripción de la política contable para inversiones en administración de liquidez
      setPolicyCell(sheet10, 'D41',
        `Las inversiones de administración de liquidez comprenden instrumentos financieros de alta liquidez fácilmente convertibles en efectivo, con vencimientos mayores a 90 días pero que no forman parte del capital de trabajo operativo. Se miden al costo amortizado o valor razonable según su clasificación y naturaleza del instrumento.`
      );

      // Fila 42: Descripción de la política contable sobre préstamos por cobrar
      setPolicyCell(sheet10, 'D42',
        `Los préstamos por cobrar se reconocen inicialmente al valor razonable más los costos de transacción directamente atribuibles. Posteriormente se miden al costo amortizado usando el método del interés efectivo, menos cualquier deterioro. Se evalúan para deterioro aplicando el modelo de pérdidas crediticias esperadas.`
      );

      // ===== POLÍTICAS CON "NA" (No Aplica) =====
      // Políticas que generalmente no aplican para empresas típicas de servicios públicos

      const politicasNA = [
        12, // Activos financieros disponibles para la venta (no comunes en servicios públicos)
        32, // Activos de petróleo y gas (no aplica a servicios públicos)
        36, // Gastos de investigación y desarrollo (no significativos)
        43, // Ingresos por contratos de construcción (no es contratista)
      ];

      for (const row of politicasNA) {
        setPolicyCell(sheet10, `D${row}`, 'NA');
      }
    }

    // ===============================================
    // HOJA11 (810000): Notas - Información de la entidad
    // y declaración de cumplimiento con el marco normativo
    // Similar a Hoja09 y Hoja10 - Columna E
    // ===============================================
    const sheet11 = workbook.Sheets['Hoja11'];

    if (sheet11) {
      // Función helper para establecer texto en celda
      const setInfoCell = (sheet: XLSX.WorkSheet, cell: string, value: string) => {
        sheet[cell] = { t: 's', v: value };
      };

      // Fila 11: Información a revelar sobre notas y otra información explicativa [bloque de texto]
      // Referencia al archivo de notas HTML
      setInfoCell(sheet11, 'E11', 'Nota2.html');

      // Fila 12: Nombre de la controladora última del grupo
      // Usar el nombre de la empresa de las opciones
      setInfoCell(sheet11, 'E12', options.companyName || '');

      // Fila 13: Ciudad donde se encuentra ubicada la sede administrativa
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E13', '');

      // Fila 14: Dirección de la sede administrativa de la entidad
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E14', '');

      // Fila 15: Email institucional
      // Dejar vacía - se diligencia manualmente
      // setInfoCell(sheet11, 'E15', '');

      // Fila 16: Declaración explícita y sin reservas de cumplimiento del Marco Normativo
      setInfoCell(sheet11, 'E16',
        `La entidad declara que los presentes estados financieros han sido preparados de conformidad con el Marco Normativo para Entidades de Gobierno - Resolución 414 de 2014 de la Contaduría General de la Nación y sus modificaciones, el cual hace parte del Régimen de Contabilidad Pública. La entidad ha aplicado de manera consistente las políticas contables establecidas en dicho marco normativo.`
      );

      // Fila 17: Información sobre incertidumbres o cambios que comprometan su continuidad
      setInfoCell(sheet11, 'E17',
        `A la fecha de emisión de los estados financieros, no existen incertidumbres significativas ni cambios ordenados que comprometan la continuidad de la entidad como supresión, fusión, escisión o liquidación. La entidad continúa operando como empresa de servicios públicos domiciliarios bajo las condiciones normales de operación.`
      );

      // Fila 18: Explicación de porqué no se presume que la actividad se llevara a cabo por tiempo indefinido
      setInfoCell(sheet11, 'E18', 'NA');

      // Fila 20: Información sobre incertidumbres sobre la capacidad de dar continuidad a servicios en RUPS
      setInfoCell(sheet11, 'E20',
        `La entidad no presenta incertidumbres significativas sobre la capacidad de dar continuidad a la prestación de los servicios públicos de acueducto, alcantarillado y aseo inscritos en el Registro Único de Prestadores de Servicios Públicos (RUPS). Los servicios se prestan de manera continua conforme a las condiciones establecidas en los contratos de condiciones uniformes.`
      );

      // Fila 21: ¿Durante el período se informó finalizó la prestación de servicios en RUPS?
      setInfoCell(sheet11, 'E21', '2. No');

      // Fila 22: Detalle sobre la finalización de la prestación de servicios en RUPS
      setInfoCell(sheet11, 'E22', 'NA');

      // Fila 24: Explicación de los criterios de medición utilizados
      setInfoCell(sheet11, 'E24',
        `Los criterios de medición utilizados para la preparación de los estados financieros incluyen: costo histórico para la mayoría de activos y pasivos, costo amortizado para instrumentos financieros, valor razonable para ciertos activos y pasivos financieros según lo requiere el marco normativo. Las estimaciones contables se basan en la mejor información disponible a la fecha del informe.`
      );

      // Fila 25: Descripción de otras políticas contables relevantes
      setInfoCell(sheet11, 'E25',
        `Las políticas contables aplicadas son consistentes con las establecidas en la Resolución 414 de 2014 de la CGN. Se incluyen políticas sobre: reconocimiento de ingresos por servicios públicos, provisión por deterioro de cartera, depreciación de infraestructura de redes, tratamiento de subsidios y contribuciones, y beneficios a empleados. Las políticas se detallan en las notas específicas.`
      );

      // Fila 26: Explicación de supuestos realizados acerca del futuro y otras causas de incertidumbre
      setInfoCell(sheet11, 'E26',
        `Las principales fuentes de incertidumbre en las estimaciones incluyen: vida útil de activos de infraestructura, deterioro de cartera morosa, provisiones por litigios y demandas, y obligaciones por beneficios posempleo. Los supuestos se revisan periódicamente y los ajustes se reconocen prospectivamente cuando corresponde.`
      );

      // Fila 28: ¿La entidad ha implementado programas relacionados con objetivos de desarrollo sostenible?
      setInfoCell(sheet11, 'E28', '2. No');

      // Fila 29: ¿La entidad prepara reportes de sostenibilidad?
      setInfoCell(sheet11, 'E29', '2. No');

      // Fila 30: Si lo presenta como reporte a una entidad de supervisión específica, ¿a cuál?
      setInfoCell(sheet11, 'E30', 'NA');

      // Fila 31: ¿La entidad cuenta con objetivos de desarrollo sostenible para el eje económico?
      setInfoCell(sheet11, 'E31', '2. No');

      // Fila 32: Mencione que indicadores calcula. Explique los elementos que componen cada indicador
      setInfoCell(sheet11, 'E32', 'NA');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6 — IFE trimestral: Hoja3/4/5 IFE (~L1280-1521)
  // Candidato de extracción: official/fillers/ifeDataFiller.ts
  // ═══════════════════════════════════════════════════════════════════════════

  // ===============================================
  // PARTE 3: LLENAR DATOS PARA IFE (TRIMESTRAL)
  // ===============================================
  if (options.niifGroup === 'ife' && options.consolidatedAccounts && options.consolidatedAccounts.length > 0) {
    const serviceBalances = options.serviceBalances || [];
    const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

    // Función para establecer valor numérico en celda
    const setNumericCellIFE = (sheet: XLSX.WorkSheet, cell: string, value: number) => {
      if (value !== 0 && value !== undefined && !isNaN(value)) {
        const stringValue = String(value);
        sheet[cell] = {
          t: 's',  // Tipo STRING
          v: stringValue,
          w: stringValue,
          h: stringValue
        };
      }
    };

    // Agrupar cuentas por servicio
    const accountsByServiceIFE: Record<string, ServiceBalanceData[]> = {};
    for (const service of activeServices) {
      accountsByServiceIFE[service] = serviceBalances.filter(sb => sb.service === service);
    }

    // Función helper para verificar prefijos
    const matchesPrefixesIFE = (code: string, prefixes: string[], excludes?: string[]): boolean => {
      if (excludes) {
        for (const exclude of excludes) {
          if (code.startsWith(exclude)) return false;
        }
      }
      for (const prefix of prefixes) {
        if (code.startsWith(prefix)) return true;
      }
      return false;
    };

    // Columnas de servicio para IFE (Hoja3 ESF y Hoja4 ER)
    const IFE_SERVICE_COLUMNS: Record<string, string> = {
      acueducto: 'I',
      alcantarillado: 'J',
      aseo: 'K',
      energia: 'L',
      gas: 'M',
      glp: 'N',
      xm: 'O',
      otras: 'P',
      total: 'Q',
    };

    // ===============================================
    // HOJA3 IFE (210000t): Estado de Situación Financiera
    // ===============================================
    const sheet3IFE = workbook.Sheets['Hoja3'];
    if (sheet3IFE) {
      // Mapeos ESF alineados con esfMappings.ts — PUC CGN Resolución 414
      // abs: true → usar Math.abs (pasivos y patrimonio tienen saldo crédito negativo)
      const IFE_ESF_MAPPINGS: Array<{row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; abs?: boolean}> = [
        // === ACTIVOS CORRIENTES ===
        { row: 15, label: 'Efectivo y equivalentes', pucPrefixes: ['11'], excludePrefixes: ['1132'] },
        { row: 16, label: 'Efectivo de uso restringido', pucPrefixes: ['1132'] },
        { row: 19, label: 'CXC servicios públicos', pucPrefixes: ['131801', '131802', '131803', '131804', '131805', '131806'] },
        { row: 20, label: 'CXC por subsidios', pucPrefixes: ['131807', '131808', '131809', '131810', '131811', '131812'] },
        { row: 22, label: 'CXC por aprovechamiento', pucPrefixes: ['138424'] },
        { row: 24, label: 'CXC venta de bienes', pucPrefixes: ['1316'] },
        { row: 25, label: 'Otras CXC corrientes', pucPrefixes: ['1311', '1317', '1319', '1322', '1324', '1333', '1384', '1385', '1387'], excludePrefixes: ['138401', '138414', '138424'] },
        { row: 27, label: 'Inventarios corrientes', pucPrefixes: ['15'], excludePrefixes: ['1580'] },
        { row: 28, label: 'Inversiones corrientes', pucPrefixes: ['12'], excludePrefixes: ['1280'] },
        { row: 30, label: 'Otros activos financieros corrientes', pucPrefixes: ['19'], excludePrefixes: ['1970', '1971', '1972', '1973', '1974', '1975'] },
        { row: 31, label: 'Otros activos no financieros corrientes', pucPrefixes: ['17', '18'] },
        // === ACTIVOS NO CORRIENTES ===
        { row: 34, label: 'PPE', pucPrefixes: ['16'] },
        { row: 36, label: 'Intangibles', pucPrefixes: ['1970', '1971', '1972', '1973', '1974', '1975'] },
        { row: 37, label: 'Inversiones no corrientes', pucPrefixes: ['1227', '1230', '1233'] },
        { row: 49, label: 'Otros activos financieros no corrientes', pucPrefixes: ['14'] },
        // === PASIVOS CORRIENTES ===
        { row: 56, label: 'Provisiones corrientes', pucPrefixes: ['25'], abs: true },
        { row: 57, label: 'CxP corrientes', pucPrefixes: ['23'], abs: true },
        { row: 60, label: 'Obligaciones financieras corrientes', pucPrefixes: ['21', '22'], abs: true },
        { row: 61, label: 'Obligaciones laborales corrientes', pucPrefixes: ['24'], abs: true },
        { row: 62, label: 'Pasivo por impuestos corrientes', pucPrefixes: ['27'], abs: true },
        { row: 63, label: 'Otros pasivos corrientes', pucPrefixes: ['26'], abs: true },
        // === PASIVOS NO CORRIENTES — sin mapear, el usuario completa manualmente ===
        // === PATRIMONIO ===
        // '31' como fallback para balances que reportan patrimonio a nivel de grupo
        { row: 77, label: 'Capital', pucPrefixes: ['3105', '3205', '3208', '3210', '3215', '31'], excludePrefixes: ['3109', '3110', '3115', '3120', '3125', '3130', '3145'], abs: true },
        { row: 78, label: 'Inversión suplementaria', pucPrefixes: ['3109'], abs: true },
        { row: 79, label: 'Otras participaciones', pucPrefixes: ['3125', '3110', '3270'], abs: true },
        { row: 80, label: 'Superávit por revaluación', pucPrefixes: ['3115', '3120', '3240', '3245', '3255'], abs: true },
        { row: 81, label: 'Reservas', pucPrefixes: ['3130', '3260'], abs: true },
        { row: 82, label: 'Ganancias acumuladas', pucPrefixes: ['3225', '3230', '32'], excludePrefixes: ['3205', '3208', '3210', '3215', '3240', '3245', '3250', '3255', '3260', '3270'] },
        { row: 83, label: 'Efectos adopción NIF', pucPrefixes: ['3145'], abs: true },
      ];

      for (const mapping of IFE_ESF_MAPPINGS) {
        // Calcular total consolidado
        let totalValue = 0;
        for (const account of options.consolidatedAccounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixesIFE(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += mapping.abs ? Math.abs(account.value) : account.value;
          }
        }

        // Escribir valor total en columna Q
        if (totalValue !== 0) {
          setNumericCellIFE(sheet3IFE, `${IFE_SERVICE_COLUMNS.total}${mapping.row}`, totalValue);
        }

        // Escribir valores por servicio
        for (const service of activeServices) {
          const serviceColumn = IFE_SERVICE_COLUMNS[service];
          if (!serviceColumn) continue;

          let serviceValue = 0;
          const serviceAccounts = accountsByServiceIFE[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixesIFE(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += mapping.abs ? Math.abs(account.value) : account.value;
            }
          }

          if (serviceValue !== 0) {
            setNumericCellIFE(sheet3IFE, `${serviceColumn}${mapping.row}`, serviceValue);
          }
        }
      }

      // --- Ganancias acumuladas (fila 82): si PUC 32 dio 0, calcular desde ER ---
      const cell82 = sheet3IFE[`${IFE_SERVICE_COLUMNS.total}82`];
      const val82 = cell82 ? (typeof cell82.v === 'number' ? cell82.v : 0) : 0;
      if (val82 === 0) {
        const calcERNetSheetJS = (accs: {code: string; value: number; isLeaf: boolean}[]): number => {
          let ing = 0, gas = 0, cos = 0;
          for (const a of accs) {
            if (!a.isLeaf) continue;
            if (a.code.startsWith('4')) ing += Math.abs(a.value);
            if (a.code.startsWith('5')) gas += Math.abs(a.value);
            if (a.code.startsWith('6')) cos += Math.abs(a.value);
          }
          return ing - gas - cos;
        };
        const erTotalSJ = calcERNetSheetJS(options.consolidatedAccounts);
        if (erTotalSJ !== 0) {
          setNumericCellIFE(sheet3IFE, `${IFE_SERVICE_COLUMNS.total}82`, erTotalSJ);
        }
        for (const service of activeServices) {
          const serviceColumn = IFE_SERVICE_COLUMNS[service];
          if (!serviceColumn) continue;
          const svcAccounts = accountsByServiceIFE[service] || [];
          const svcERVal = calcERNetSheetJS(svcAccounts);
          if (svcERVal !== 0) {
            setNumericCellIFE(sheet3IFE, `${serviceColumn}82`, svcERVal);
          }
        }
      }
    }

    // ===============================================
    // HOJA4 IFE (310000t): Estado de Resultados
    // COLUMNAS ER: E=Acueducto, F=Alcantarillado, G=Aseo, H=Energía, I=Gas, J=GLP, K=XM, L=Otras, M=Total
    // (Diferente a ESF que usa I-P)
    // ===============================================
    const sheet4IFE = workbook.Sheets['Hoja4'];
    if (sheet4IFE) {
      // Columnas de servicio específicas para Hoja4 (ER) - DIFERENTES a Hoja3 (ESF)
      const IFE_ER_COLUMNS: Record<string, string> = {
        acueducto: 'E',
        alcantarillado: 'F',
        aseo: 'G',
        energia: 'H',
        gas: 'I',
        glp: 'J',
        xm: 'K',
        otras: 'L',
        total: 'M',
      };

      // Mapeos ER alineados con erMappings.ts — PUC CGN Resolución 414
      // abs: true → las autosumas del template manejan los signos
      const IFE_ER_MAPPINGS: Array<{row: number; label: string; pucPrefixes: string[]; excludePrefixes?: string[]; abs?: boolean}> = [
        { row: 14, label: 'Ingresos ordinarios', pucPrefixes: ['41', '42', '43'], abs: true },
        { row: 15, label: 'Costo de ventas', pucPrefixes: ['62', '63'], abs: true },
        { row: 17, label: 'Gastos admin y ventas', pucPrefixes: ['51', '52', '56'], abs: true },
        { row: 18, label: 'Otros ingresos', pucPrefixes: ['44', '48'], excludePrefixes: ['4802', '4803', '4808'], abs: true },
        { row: 19, label: 'Otros gastos', pucPrefixes: ['53', '58'], excludePrefixes: ['5802', '5803', '5808'], abs: true },
        { row: 21, label: 'Ingresos financieros', pucPrefixes: ['4802', '4803'], abs: true },
        { row: 22, label: 'Costos financieros', pucPrefixes: ['5802', '5803'], abs: true },
        { row: 23, label: 'Otras ganancias/pérdidas', pucPrefixes: ['4808', '5808'], abs: true },
        { row: 25, label: 'Gasto por impuesto', pucPrefixes: ['54'], abs: true },
        { row: 27, label: 'Operaciones discontinuadas', pucPrefixes: ['59'], abs: true },
      ];

      for (const mapping of IFE_ER_MAPPINGS) {
        // Calcular total consolidado
        let totalValue = 0;
        for (const account of options.consolidatedAccounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixesIFE(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
            totalValue += mapping.abs ? Math.abs(account.value) : account.value;
          }
        }

        // Escribir valor total en columna M (total ER)
        if (totalValue !== 0) {
          setNumericCellIFE(sheet4IFE, `${IFE_ER_COLUMNS.total}${mapping.row}`, totalValue);
        }

        // Escribir valores por servicio usando columnas ER (E-L)
        for (const service of activeServices) {
          const serviceColumn = IFE_ER_COLUMNS[service];
          if (!serviceColumn) continue;

          let serviceValue = 0;
          const serviceAccounts = accountsByServiceIFE[service] || [];
          for (const account of serviceAccounts) {
            if (!account.isLeaf) continue;
            if (matchesPrefixesIFE(account.code, mapping.pucPrefixes, mapping.excludePrefixes)) {
              serviceValue += mapping.abs ? Math.abs(account.value) : account.value;
            }
          }

          if (serviceValue !== 0) {
            setNumericCellIFE(sheet4IFE, `${serviceColumn}${mapping.row}`, serviceValue);
          }
        }
      }
    }

    // ===============================================
    // HOJA5 IFE (900020t): CXC por Rangos de Vencimiento
    // Columnas: F=NoVencidas, G=1-90, H=91-180, I=181-360, J=>360, K=Deterioro, L=Total
    // Filas: 17=Acueducto, 18=Alcantarillado, 19=Aseo, 20=Energía, 21=Gas, 22=GLP, 23=XM
    // ===============================================
    const sheet5IFE = workbook.Sheets['Hoja5'];
    if (sheet5IFE) {
      // Mapeo de filas de CXC por servicio
      const IFE_CXC_SERVICE_ROWS: Record<string, number> = {
        acueducto: 17,
        alcantarillado: 18,
        aseo: 19,
        energia: 20,
        gas: 21,
        glp: 22,
        xm: 23,
      };

      // Porcentajes por defecto para distribución de CXC
      // No vencidas 55%, 1-90 días 25%, 91-180 días 20%, resto 0%
      const CXC_PERCENTAGES = [
        { column: 'F', percentage: 55 },  // No vencidas
        { column: 'G', percentage: 25 },  // 1-90 días
        { column: 'H', percentage: 20 },  // 91-180 días
        { column: 'I', percentage: 0 },   // 181-360 días
        { column: 'J', percentage: 0 },   // Más de 360 días
      ];

      // Calcular CXC total por servicio (cuentas 1305, 1310, etc.)
      for (const service of activeServices) {
        const row = IFE_CXC_SERVICE_ROWS[service];
        if (!row) continue;

        // Calcular CXC total del servicio
        let totalCXC = 0;
        const serviceAccounts = accountsByServiceIFE[service] || [];
        for (const account of serviceAccounts) {
          if (!account.isLeaf) continue;
          if (matchesPrefixesIFE(account.code, ['13'], ['1399'])) {
            totalCXC += account.value;
          }
        }

        if (totalCXC !== 0) {
          // Distribuir por rangos de vencimiento según porcentajes
          for (const range of CXC_PERCENTAGES) {
            const rangeValue = Math.round(totalCXC * range.percentage / 100);
            if (rangeValue !== 0) {
              setNumericCellIFE(sheet5IFE, `${range.column}${row}`, rangeValue);
            }
          }

          // Escribir total en columna L
          setNumericCellIFE(sheet5IFE, `L${row}`, totalCXC);
        }
      }
    }
  }

  // Escribir el archivo modificado
  const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(newBuffer);
}
