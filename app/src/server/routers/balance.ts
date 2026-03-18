import { z } from 'zod';
import { eq, sql, desc } from 'drizzle-orm';
import { router, publicProcedure } from '../trpc';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances, balanceSessions } from '@/db/schema';
import { parseExcelFile } from '@/lib/services/excelParser';
import { generateExcelWithDistribution, generateConsolidatedExcel } from '@/lib/services/excelGenerator';
import { generateXBRLCompatibleExcel } from '@/lib/services/xbrlExcelGenerator';
import {
  generateOfficialTemplatePackageWithData,
  hasOfficialTemplates,
  getAvailableTemplateGroups,
  type NiifGroup,
  type AccountData,
  type ServiceBalanceData,
  type RoundingDegree,
} from '@/lib/xbrl';

export const balanceRouter = router({
  /**
   * Procedimiento de prueba - Ping
   */
  ping: publicProcedure.query(() => {
    return { message: 'pong', timestamp: new Date() };
  }),

  /**
   * Cargar y procesar archivo Excel con balance general
   */
  uploadBalance: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string().max(10_485_760, 'Archivo máximo 10MB en base64'), // Base64 encoded
        niifGroup: z.enum(['grupo1', 'grupo2', 'grupo3', 'r414', 'ife']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Parse Excel file
        const parsed = await parseExcelFile(input.fileData, input.fileName);

        // Truncate + insert en transacción para garantizar atomicidad
        await db.transaction(async (tx) => {
          await tx.delete(workingAccounts);
          const batchSize = 500;
          for (let i = 0; i < parsed.accounts.length; i += batchSize) {
            const batch = parsed.accounts.slice(i, i + batchSize);
            await tx.insert(workingAccounts).values(
              batch.map((account) => ({
                code: account.code,
                name: account.name,
                value: account.value,
                isLeaf: account.isLeaf,
                level: account.level,
                class: account.class,
              }))
            );
          }
          await tx.insert(balanceSessions).values({
            fileName: input.fileName,
            niifGroup: input.niifGroup,
            accountsCount: parsed.accounts.length,
            status: 'uploaded',
          });
        });

        return {
          success: true,
          message: 'Balance cargado exitosamente',
          fileName: input.fileName,
          accountsCount: parsed.accounts.length,
          totals: parsed.totals,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Error al procesar el archivo'
        );
      }
    }),

  /**
   * Obtener totales del balance consolidado
   */
  getTotals: publicProcedure.query(async () => {
    try {
      // Get totals from leaf accounts only
      const results = await db
        .select({
          class: workingAccounts.class,
          total: sql<number>`sum(${workingAccounts.value})`,
        })
        .from(workingAccounts)
        .where(eq(workingAccounts.isLeaf, true))
        .groupBy(workingAccounts.class);

      const totals = {
        activos: 0,
        pasivos: 0,
        patrimonio: 0,
        ingresos: 0,
        gastos: 0,
        costos: 0,
      };

      for (const row of results) {
        const total = Number(row.total) || 0;
        if (row.class === 'Activos') totals.activos = total;
        if (row.class === 'Pasivos') totals.pasivos = total;
        if (row.class === 'Patrimonio') totals.patrimonio = total;
        if (row.class === 'Ingresos') totals.ingresos = total;
        if (row.class === 'Gastos') totals.gastos = total;
        if (row.class === 'Costos') totals.costos = total;
      }

      // Validate accounting equation
      const difference = totals.activos - (totals.pasivos + totals.patrimonio);
      const isValid = Math.abs(difference) < 1000; // Tolerance of 1000 pesos

      return {
        ...totals,
        isValid,
        difference,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al obtener totales'
      );
    }
  }),

  /**
   * Distribuir balance entre servicios
   */
  distributeBalance: publicProcedure
    .input(
      z.object({
        acueducto: z.number().min(0).max(100),
        alcantarillado: z.number().min(0).max(100),
        aseo: z.number().min(0).max(100),
        // Usuarios por estrato y servicio (para distribución proporcional en hojas FC)
        usuariosEstrato: z.object({
          acueducto: z.record(z.string(), z.number()),
          alcantarillado: z.record(z.string(), z.number()),
          aseo: z.record(z.string(), z.number()),
        }).optional(),
        // Subsidios recibidos por servicio
        subsidios: z.object({
          acueducto: z.number(),
          alcantarillado: z.number(),
          aseo: z.number(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const total = input.acueducto + input.alcantarillado + input.aseo;

        if (Math.abs(total - 100) > 0.01) {
          throw new Error('La suma de porcentajes debe ser 100%');
        }

        // Get all accounts from working table
        const accounts = await db.select().from(workingAccounts);

        if (accounts.length === 0) {
          throw new Error('No hay cuentas cargadas. Por favor carga un balance primero.');
        }

        // Truncate service_balances table
        await db.delete(serviceBalances);

        // Prepare distributed accounts
        const services = [
          { name: 'acueducto', percentage: input.acueducto },
          { name: 'alcantarillado', percentage: input.alcantarillado },
          { name: 'aseo', percentage: input.aseo },
        ];

        const distributedAccounts: { service: string; code: string; name: string; value: number; isLeaf: boolean; level: number; class: string }[] = [];

        for (const service of services) {
          for (const account of accounts) {
            const distributedValue = Math.round(
              account.value * (service.percentage / 100)
            );

            distributedAccounts.push({
              service: service.name,
              code: account.code,
              name: account.name,
              value: distributedValue,
              isLeaf: account.isLeaf,
              level: account.level,
              class: account.class,
            });
          }
        }

        // Insert en transacción para garantizar atomicidad
        await db.transaction(async (tx) => {
          const batchSize = 1000;
          for (let i = 0; i < distributedAccounts.length; i += batchSize) {
            const batch = distributedAccounts.slice(i, i + batchSize);
            await tx.insert(serviceBalances).values(batch);
          }
        });

        // Update session status - guardar también usuariosEstrato y subsidios
        if (process.env.NODE_ENV !== 'production') {
          console.log('\n📥 Backend - Datos recibidos en distributeBalance:');
          console.log('  - Distribución:', { acueducto: input.acueducto, alcantarillado: input.alcantarillado, aseo: input.aseo });
          console.log('  - Usuarios por estrato:', input.usuariosEstrato ? 'SÍ (datos presentes)' : 'NO');
          if (input.usuariosEstrato) {
            console.log('    Acueducto:', JSON.stringify(input.usuariosEstrato.acueducto));
            console.log('    Alcantarillado:', JSON.stringify(input.usuariosEstrato.alcantarillado));
            console.log('    Aseo:', JSON.stringify(input.usuariosEstrato.aseo));
          }
          console.log('  - Subsidios:', input.subsidios ? `Acue: ${input.subsidios.acueducto}, Alc: ${input.subsidios.alcantarillado}, Aseo: ${input.subsidios.aseo}` : 'NO');
        }
        
        const sessionData = {
          distribution: JSON.stringify(input),
          usuariosEstrato: input.usuariosEstrato ? JSON.stringify(input.usuariosEstrato) : null,
          subsidios: input.subsidios ? JSON.stringify(input.subsidios) : null,
          status: 'distributed',
          updatedAt: new Date(),
        };
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('  - Guardando en BD:', { usuariosEstrato: sessionData.usuariosEstrato ? 'SÍ' : 'NO', subsidios: sessionData.subsidios ? 'SÍ' : 'NO' });
        }
        
        await db
          .update(balanceSessions)
          .set(sessionData)
          .where(eq(balanceSessions.status, 'uploaded'));

        return {
          success: true,
          message: 'Balance distribuido exitosamente',
          distribution: input,
          accountsDistributed: distributedAccounts.length,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Error al distribuir el balance'
        );
      }
    }),

  /**
   * Obtener totales de todos los servicios
   * IMPORTANTE: Solo suma las cuentas hoja (isLeaf = true) para evitar duplicación
   */
  getTotalesServicios: publicProcedure.query(async () => {
    try {
      // Single query with double GROUP BY instead of 3 separate queries (N+1 → 1)
      const rows = await db
        .select({
          service: serviceBalances.service,
          firstDigit: sql<string>`substring(${serviceBalances.code}, 1, 1)`,
          total: sql<number>`sum(${serviceBalances.value})`,
        })
        .from(serviceBalances)
        .where(eq(serviceBalances.isLeaf, true))
        .groupBy(serviceBalances.service, sql`substring(${serviceBalances.code}, 1, 1)`);

      type ServiceTotals = { activos: number; pasivos: number; patrimonio: number; ingresos: number; gastos: number; costos: number };
      const emptyTotals = (): ServiceTotals => ({
        activos: 0,
        pasivos: 0,
        patrimonio: 0,
        ingresos: 0,
        gastos: 0,
        costos: 0,
      });

      const result: Record<string, ServiceTotals> = {
        acueducto: emptyTotals(),
        alcantarillado: emptyTotals(),
        aseo: emptyTotals(),
      };

      for (const row of rows) {
        const svc = row.service;
        if (!result[svc]) result[svc] = emptyTotals();
        const total = Number(row.total) || 0;
        if (row.firstDigit === '1') result[svc]!.activos = total;
        if (row.firstDigit === '2') result[svc]!.pasivos = total;
        if (row.firstDigit === '3') result[svc]!.patrimonio = total;
        if (row.firstDigit === '4') result[svc]!.ingresos = total;
        if (row.firstDigit === '5') result[svc]!.gastos = total;
        if (row.firstDigit === '6') result[svc]!.costos = total;
      }

      return result;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al obtener totales de servicios'
      );
    }
  }),

  /**
   * Descargar Excel con balance consolidado y distribuido por servicios
   */
  downloadExcel: publicProcedure.query(async () => {
    try {
      const excelBase64 = await generateExcelWithDistribution();
      
      return {
        success: true,
        fileName: `Balance_Distribuido_${new Date().toISOString().split('T')[0]}.xlsx`,
        fileData: excelBase64,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al generar el archivo Excel'
      );
    }
  }),

  /**
   * Descargar Excel solo con balance consolidado
   */
  downloadConsolidated: publicProcedure.query(async () => {
    try {
      const excelBase64 = await generateConsolidatedExcel();
      
      return {
        success: true,
        fileName: `Balance_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`,
        fileData: excelBase64,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al generar el archivo Excel'
      );
    }
  }),

  /**
   * Descargar Excel con formato compatible para XBRL Express
   * Este Excel tiene la estructura exacta que XBRL Express espera:
   * - Hoja1: Información general (columna E, filas 12-22)
   * - Hoja2: Estado de Situación Financiera (columnas I-Q, filas 15-70)
   */
  downloadXBRLExcel: publicProcedure
    .input(
      z.object({
        companyId: z.string().min(1, 'ID de empresa requerido'),
        companyName: z.string().min(1, 'Nombre de empresa requerido').max(500, 'Máximo 500 caracteres'),
        reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
        nit: z.string().max(255).optional(),
        businessNature: z.string().max(5000).optional(),
        startDate: z.string().max(255).optional(),
        roundingDegree: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Obtener el grupo NIIF de la sesión actual
        const session = await db
          .select()
          .from(balanceSessions)
          .orderBy(desc(balanceSessions.createdAt))
          .limit(1);

        if (session.length === 0) {
          throw new Error('No hay una sesión activa. Por favor carga un balance primero.');
        }

        const taxonomyGroup = session[0].niifGroup as 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'ife';

        // Verificar que hay datos distribuidos
        const serviceCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(serviceBalances);

        if (!serviceCount[0] || Number(serviceCount[0].count) === 0) {
          throw new Error('No hay datos distribuidos. Por favor distribuye el balance primero.');
        }

        // Obtener distribución de servicios activos
        const distribution = session[0].distribution 
          ? JSON.parse(session[0].distribution) 
          : { acueducto: 40, alcantarillado: 35, aseo: 25 };
        
        const activeServices = Object.keys(distribution).filter(s => distribution[s] > 0);

        // Generar el Excel con formato XBRL Express
        const excelBase64 = await generateXBRLCompatibleExcel({
          companyId: input.companyId,
          companyName: input.companyName,
          nit: input.nit,
          reportDate: input.reportDate,
          businessNature: input.businessNature,
          startDate: input.startDate,
          roundingDegree: input.roundingDegree as RoundingDegree,
          taxonomyGroup,
          activeServices,
        });

        return {
          success: true,
          fileName: `XBRL_Excel_${input.companyId}_${input.reportDate}.xlsx`,
          fileData: excelBase64,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Error al generar el Excel XBRL'
        );
      }
    }),

  /**
   * Descargar paquete XBRL usando plantillas OFICIALES de la SSPD
   * Este método usa los archivos .xbrlt, .xml, .xlsx y .xbrl originales
   * proporcionados por la SSPD, garantizando 100% compatibilidad con XBRL Express.
   * 
   * AHORA INCLUYE: Datos financieros del balance distribuido en las hojas Excel.
   * 
   * Hojas pre-llenadas automáticamente:
   * - [110000] Información general
   * - [210000] Estado de Situación Financiera
   * - [310000] Estado de Resultados
   * - [900017a-g] Gastos por servicio
   * 
   * Disponible para: grupo1, grupo2, grupo3, r414
   */
  downloadOfficialTemplates: publicProcedure
    .input(
      z.object({
        companyId: z.string().min(1, 'ID de empresa requerido'),
        companyName: z.string().min(1, 'Nombre de empresa requerido').max(500, 'Máximo 500 caracteres'),
        reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
        nit: z.string().max(255).optional(),
        businessNature: z.string().max(5000).optional(),
        startDate: z.string().max(255).optional(),
        roundingDegree: z.string().max(255).optional(),
        hasRestatedInfo: z.string().max(255).optional(),
        restatedPeriod: z.string().max(255).optional(),
        includeFinancialData: z.boolean().optional().default(true),
        // Usuarios por estrato y servicio para distribución proporcional
        usuariosEstrato: z.object({
          acueducto: z.record(z.string(), z.number()),
          alcantarillado: z.record(z.string(), z.number()),
          aseo: z.record(z.string(), z.number()),
        }).optional(),
        // Subsidios recibidos por servicio
        subsidios: z.object({
          acueducto: z.number(),
          alcantarillado: z.number(),
          aseo: z.number(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Obtener el grupo NIIF de la sesión actual
        const session = await db
          .select()
          .from(balanceSessions)
          .orderBy(desc(balanceSessions.createdAt))
          .limit(1);

        if (session.length === 0) {
          throw new Error('No hay una sesión activa. Por favor carga un balance primero.');
        }

        const niifGroup = session[0].niifGroup as NiifGroup;

        // Verificar que el grupo tiene plantillas oficiales
        if (!hasOfficialTemplates(niifGroup)) {
          throw new Error(
            `No hay plantillas oficiales disponibles para ${niifGroup}. ` +
            `Grupos disponibles: ${getAvailableTemplateGroups().join(', ')}`
          );
        }

        // Obtener datos financieros si se solicita
        let consolidatedAccounts: AccountData[] = [];
        let serviceBalancesData: ServiceBalanceData[] = [];
        let activeServices: string[] = [];

        if (input.includeFinancialData !== false) {
          // Obtener cuentas consolidadas
          const accounts = await db.select().from(workingAccounts);
          consolidatedAccounts = accounts.map(acc => ({
            code: acc.code,
            name: acc.name,
            value: acc.value,
            isLeaf: acc.isLeaf ?? false,
            level: acc.level ?? 0,
            class: acc.class ?? '',
          }));

          // Obtener balances por servicio
          const balances = await db.select().from(serviceBalances);
          serviceBalancesData = balances.map(bal => ({
            service: bal.service,
            code: bal.code,
            name: bal.name,
            value: bal.value,
            isLeaf: bal.isLeaf ?? false,
          }));

          // Determinar servicios activos desde la distribución
          const distribution = session[0].distribution 
            ? JSON.parse(session[0].distribution) 
            : { acueducto: 40, alcantarillado: 35, aseo: 25 };
          activeServices = Object.keys(distribution).filter(s => distribution[s] > 0);
        }

        // Obtener usuariosEstrato y subsidios del input o de la sesión
        const usuariosEstrato = input.usuariosEstrato || 
          (session[0].usuariosEstrato ? JSON.parse(session[0].usuariosEstrato) : undefined);
        const subsidios = input.subsidios ||
          (session[0].subsidios ? JSON.parse(session[0].subsidios) : undefined);

        // Generar el paquete con plantillas oficiales Y datos financieros
        const templatePackage = await generateOfficialTemplatePackageWithData({
          niifGroup,
          companyId: input.companyId,
          companyName: input.companyName,
          reportDate: input.reportDate,
          nit: input.nit,
          businessNature: input.businessNature,
          startDate: input.startDate,
          roundingDegree: input.roundingDegree,
          hasRestatedInfo: input.hasRestatedInfo,
          restatedPeriod: input.restatedPeriod,
          consolidatedAccounts: consolidatedAccounts.length > 0 ? consolidatedAccounts : undefined,
          serviceBalances: serviceBalancesData.length > 0 ? serviceBalancesData : undefined,
          activeServices: activeServices.length > 0 ? activeServices : undefined,
          usuariosEstrato,
          subsidios,
        });

        return {
          success: true,
          ...templatePackage,
          accountsProcessed: consolidatedAccounts.length,
          servicesIncluded: activeServices,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Error al generar el paquete de plantillas oficiales'
        );
      }
    }),

  /**
   * Obtener información de la sesión actual
   */
  getSessionInfo: publicProcedure.query(async () => {
    try {
      const session = await db
        .select()
        .from(balanceSessions)
        .orderBy(desc(balanceSessions.createdAt))
        .limit(1);

      if (session.length === 0) {
        return null;
      }

      return {
        fileName: session[0].fileName,
        niifGroup: session[0].niifGroup,
        accountsCount: session[0].accountsCount,
        status: session[0].status,
        distribution: session[0].distribution ? JSON.parse(session[0].distribution) : null,
        createdAt: session[0].createdAt,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al obtener información de sesión'
      );
    }
  }),

  /**
   * DEBUG: Obtener usuarios por estrato y subsidios de la sesión actual
   * Útil para verificar que los datos se están guardando correctamente
   */
  getSessionUsuariosSubsidios: publicProcedure.query(async () => {
    try {
      const session = await db
        .select({
          id: balanceSessions.id,
          fileName: balanceSessions.fileName,
          status: balanceSessions.status,
          usuariosEstrato: balanceSessions.usuariosEstrato,
          subsidios: balanceSessions.subsidios,
          createdAt: balanceSessions.createdAt,
          updatedAt: balanceSessions.updatedAt,
        })
        .from(balanceSessions)
        .orderBy(desc(balanceSessions.createdAt))
        .limit(1);

      if (session.length === 0) {
        return {
          success: false,
          message: 'No hay sesión activa',
          data: null,
        };
      }

      const s = session[0];
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n🔍 DEBUG - Consultando usuarios y subsidios de la sesión:');
        console.log('  - ID:', s.id);
        console.log('  - Archivo:', s.fileName);
        console.log('  - Estado:', s.status);
        console.log('  - Usuarios estrato (raw):', s.usuariosEstrato);
        console.log('  - Subsidios (raw):', s.subsidios);
      }

      return {
        success: true,
        message: 'Datos encontrados',
        data: {
          sessionId: s.id,
          fileName: s.fileName,
          status: s.status,
          usuariosEstrato: s.usuariosEstrato ? JSON.parse(s.usuariosEstrato) : null,
          subsidios: s.subsidios ? JSON.parse(s.subsidios) : null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        },
      };
    } catch (error) {
      console.error('Error consultando usuarios/subsidios:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Error al consultar usuarios/subsidios'
      );
    }
  }),

  /**
   * Obtener lista de taxonomías disponibles
   */
  getTaxonomyList: publicProcedure.query(() => {
    return [
      { id: 'r414', name: 'Resolución 414 de 2014', description: 'Contaduría General de la Nación' },
      { id: 'grupo1', name: 'NIIF Plenas (Grupo 1)', description: 'Grandes empresas' },
      { id: 'grupo2', name: 'NIIF PYMES (Grupo 2)', description: 'Pequeñas y medianas empresas' },
      { id: 'grupo3', name: 'Microempresas (Grupo 3)', description: 'Contabilidad simplificada' },
    ];
  }),
});
