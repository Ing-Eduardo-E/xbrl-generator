/**
 * Módulo de reescritura ExcelJS para grupo1, grupo2, grupo3.
 *
 * Función principal: rewriteGrupoData()
 * Orquesta ESF, ER y FC para los 3 grupos NIIF sector privado.
 */
import type ExcelJS from 'exceljs';
import type { TemplateWithDataOptions, ServiceBalanceData } from '../official/interfaces';
import { buildCodesWithChildren } from '../shared/excelUtils';
import { getGrupoConfig } from './mappings';
import { rewriteGrupoESF, rewriteGrupoER } from './grupoEsfErRewriter';
import {
  rewriteGrupoFC01,
  rewriteGrupoFC02,
  rewriteGrupoFC03,
  rewriteGrupoFC05b,
  rewriteGrupoFC08,
} from './grupoFcRewriter';

// Re-exports
export { getGrupoConfig } from './mappings';
export type { GrupoConfig } from './mappings';
export { rewriteGrupoESF, rewriteGrupoER } from './grupoEsfErRewriter';
export {
  rewriteGrupoFC01,
  rewriteGrupoFC02,
  rewriteGrupoFC03,
  rewriteGrupoFC05b,
  rewriteGrupoFC08,
} from './grupoFcRewriter';

/**
 * Función principal: reescribe todos los datos financieros para grupo1/2/3.
 * Llamada desde excelRewriter.ts cuando niifGroup es grupo1, grupo2 o grupo3.
 */
export function rewriteGrupoData(
  workbook: ExcelJS.Workbook,
  options: TemplateWithDataOptions
): void {
  const config = getGrupoConfig(options.niifGroup);
  if (!config) {
    console.log(`[ExcelJS-Grupo] No hay configuración para ${options.niifGroup}, saltando.`);
    return;
  }

  const consolidatedAccounts = options.consolidatedAccounts || [];
  const serviceBalances = options.serviceBalances || [];
  const activeServices = options.activeServices || ['acueducto', 'alcantarillado', 'aseo'];

  // Agrupar cuentas por servicio
  const accountsByService: Record<string, ServiceBalanceData[]> = {};
  for (const service of activeServices) {
    accountsByService[service] = (serviceBalances as ServiceBalanceData[]).filter(
      sb => sb.service === service
    );
  }

  console.log(`[ExcelJS-Grupo] Inicio reescritura ${config.name}...`);
  console.log(`[ExcelJS-Grupo] Cuentas consolidadas: ${consolidatedAccounts.length}`);
  console.log(`[ExcelJS-Grupo] Servicios activos: ${activeServices.join(', ')}`);

  // Detección dinámica de hojas: una cuenta es hoja si su código NO es prefijo de otra
  const codesWithChildren = buildCodesWithChildren(consolidatedAccounts);

  // 1. ESF (Hoja2)
  rewriteGrupoESF(workbook, consolidatedAccounts, serviceBalances as ServiceBalanceData[], activeServices, accountsByService, codesWithChildren, config.esfRowMap);

  // 2. ER (Hoja3)
  rewriteGrupoER(workbook, consolidatedAccounts, activeServices, accountsByService, codesWithChildren, config.erColumns, config.erMappings);

  // 3. FC01 - Gastos por servicio
  rewriteGrupoFC01(workbook, accountsByService, activeServices, config);

  // 4. FC02 - Complementario de ingresos
  rewriteGrupoFC02(workbook, config);

  // 5. FC03 - CxC por estrato (grupo1/grupo2 only)
  rewriteGrupoFC03(workbook, config, options.usuariosEstrato);

  // 6. FC05b - Pasivos por edades (grupo1 only)
  rewriteGrupoFC05b(workbook, consolidatedAccounts, config, codesWithChildren);

  // 7. FC08 - Conciliación de ingresos (grupo1 only)
  rewriteGrupoFC08(workbook, config);

  console.log(`[ExcelJS-Grupo] Reescritura ${config.name} completada.`);
}