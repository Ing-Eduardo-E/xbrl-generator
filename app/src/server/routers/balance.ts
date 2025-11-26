import { z } from 'zod';
import { eq, sql, desc } from 'drizzle-orm';
import { router, publicProcedure } from '../trpc';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances, balanceSessions } from '../../../drizzle/schema';
import { parseExcelFile } from '@/lib/services/excelParser';
import { generateExcelWithDistribution, generateConsolidatedExcel } from '@/lib/services/excelGenerator';
import { generateXBRLCompatibleExcel } from '@/lib/services/xbrlExcelGenerator';
import { generateXBRLPackage, type NiifGroup, type RoundingDegree } from '@/lib/xbrl';

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
        fileData: z.string(), // Base64 encoded
        niifGroup: z.enum(['grupo1', 'grupo2', 'grupo3', 'r414']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Parse Excel file
        const parsed = await parseExcelFile(input.fileData, input.fileName);

        // Truncate working_accounts table
        await db.delete(workingAccounts);

        // Insert accounts in batches
        const batchSize = 500;
        for (let i = 0; i < parsed.accounts.length; i += batchSize) {
          const batch = parsed.accounts.slice(i, i + batchSize);
          await db.insert(workingAccounts).values(
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

        // Create session record
        await db.insert(balanceSessions).values({
          fileName: input.fileName,
          niifGroup: input.niifGroup,
          accountsCount: parsed.accounts.length,
          status: 'uploaded',
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

        const distributedAccounts = [];

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

        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < distributedAccounts.length; i += batchSize) {
          const batch = distributedAccounts.slice(i, i + batchSize);
          await db.insert(serviceBalances).values(batch);
        }

        // Update session status
        await db
          .update(balanceSessions)
          .set({
            distribution: JSON.stringify(input),
            status: 'distributed',
            updatedAt: new Date(),
          })
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
      const services = ['acueducto', 'alcantarillado', 'aseo'];
      const result: Record<string, { activos: number; pasivos: number; patrimonio: number; ingresos: number; gastos: number; costos: number }> = {};

      for (const service of services) {
        const totals = await db
          .select({
            firstDigit: sql<string>`substring(${serviceBalances.code}, 1, 1)`,
            total: sql<number>`sum(${serviceBalances.value})`,
          })
          .from(serviceBalances)
          .where(sql`${serviceBalances.service} = ${service} AND ${serviceBalances.isLeaf} = true`)
          .groupBy(sql`substring(${serviceBalances.code}, 1, 1)`);

        result[service] = {
          activos: 0,
          pasivos: 0,
          patrimonio: 0,
          ingresos: 0,
          gastos: 0,
          costos: 0,
        };

        for (const row of totals) {
          const total = Number(row.total) || 0;
          if (row.firstDigit === '1') result[service]!.activos = total;
          if (row.firstDigit === '2') result[service]!.pasivos = total;
          if (row.firstDigit === '3') result[service]!.patrimonio = total;
          if (row.firstDigit === '4') result[service]!.ingresos = total;
          if (row.firstDigit === '5') result[service]!.gastos = total;
          if (row.firstDigit === '6') result[service]!.costos = total;
        }
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
        companyName: z.string().min(1, 'Nombre de empresa requerido'),
        reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
        nit: z.string().optional(),
        businessNature: z.string().optional(),
        startDate: z.string().optional(),
        roundingDegree: z.string().optional(),
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

        const taxonomyGroup = session[0].niifGroup as 'grupo1' | 'grupo2' | 'grupo3' | 'r414';

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
   * Generar y descargar paquete XBRL completo
   * Incluye: .xbrl, .xbrlt, .xml, README.txt, RESUMEN.txt
   */
  downloadXBRL: publicProcedure
    .input(
      z.object({
        companyId: z.string().min(1, 'ID de empresa requerido'),
        companyName: z.string().min(1, 'Nombre de empresa requerido'),
        reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
        taxonomyYear: z.enum(['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']).optional().default('2024'),
        nit: z.string().optional(),
        businessNature: z.string().optional(),
        startDate: z.string().optional(),
        roundingDegree: z.string().optional(),
        hasRestatedInfo: z.string().optional(),
        restatedPeriod: z.string().optional(),
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

        // Verificar que hay datos distribuidos
        const serviceCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(serviceBalances);

        if (!serviceCount[0] || Number(serviceCount[0].count) === 0) {
          throw new Error('No hay datos distribuidos. Por favor distribuye el balance primero.');
        }

        // Generar el paquete XBRL
        const xbrlPackage = await generateXBRLPackage({
          niifGroup,
          companyId: input.companyId,
          companyName: input.companyName,
          reportDate: input.reportDate,
          taxonomyYear: input.taxonomyYear,
          nit: input.nit,
          businessNature: input.businessNature,
          startDate: input.startDate,
          roundingDegree: input.roundingDegree as RoundingDegree,
          hasRestatedInfo: input.hasRestatedInfo,
          restatedPeriod: input.restatedPeriod,
        });

        return {
          success: true,
          ...xbrlPackage,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Error al generar el paquete XBRL'
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
});
