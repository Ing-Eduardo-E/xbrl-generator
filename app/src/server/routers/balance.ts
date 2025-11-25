import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { router, publicProcedure } from '../trpc';
import { db } from '@/lib/db';
import { workingAccounts, serviceBalances, balanceSessions } from '../../../drizzle/schema';
import { parseExcelFile } from '@/lib/services/excelParser';

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
   */
  getTotalesServicios: publicProcedure.query(async () => {
    try {
      const services = ['acueducto', 'alcantarillado', 'aseo'];
      const result: Record<string, { activos: number; pasivos: number; patrimonio: number }> = {};

      for (const service of services) {
        const totals = await db
          .select({
            firstDigit: sql<string>`substring(${serviceBalances.code}, 1, 1)`,
            total: sql<number>`sum(${serviceBalances.value})`,
          })
          .from(serviceBalances)
          .where(eq(serviceBalances.service, service))
          .groupBy(sql`substring(${serviceBalances.code}, 1, 1)`);

        result[service] = {
          activos: 0,
          pasivos: 0,
          patrimonio: 0,
        };

        for (const row of totals) {
          const total = Number(row.total) || 0;
          if (row.firstDigit === '1') result[service]!.activos = total;
          if (row.firstDigit === '2') result[service]!.pasivos = total;
          if (row.firstDigit === '3') result[service]!.patrimonio = total;
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Error al obtener totales de servicios'
      );
    }
  }),
});
