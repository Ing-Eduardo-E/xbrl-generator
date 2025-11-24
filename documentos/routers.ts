import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { procesarArchivoExcel } from "./excelProcessor";
import { generarExcelBalances, generarExcelConsolidado } from "./excelGenerator";
import {
  truncateCuentasTrabajo,
  insertCuentasTrabajo,
  marcarCuentasHoja,
  calcularTotalesPorClase,
  getCuentasHoja,
  getAllCuentas,
  distribuirPorServicios,
  getTotalesTodosServicios,
  calcularTotalesPorServicio,
} from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * Router para procesamiento de balances y cuentas XBRL
   */
  balance: router({
    /**
     * Carga un archivo Excel, lo procesa y guarda las cuentas en la BD.
     * Sobrescribe (TRUNCATE) la tabla antes de insertar.
     */
    cargar: publicProcedure
      .input(
        z.object({
          // Base64 del archivo Excel
          fileBase64: z.string(),
          filename: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Validar extensión
          if (!input.filename.toLowerCase().endsWith('.xlsx') && !input.filename.toLowerCase().endsWith('.xls')) {
            throw new Error('El archivo debe ser un Excel (.xlsx o .xls)');
          }

          // Convertir base64 a buffer
          const buffer = Buffer.from(input.fileBase64, 'base64');

          // Procesar el archivo Excel
          const cuentas = await procesarArchivoExcel(buffer);

          // Vaciar la tabla
          await truncateCuentasTrabajo();

          // Insertar las cuentas
          await insertCuentasTrabajo(cuentas);

          // Marcar cuentas hoja usando SQL
          await marcarCuentasHoja();

          // Calcular totales
          const totales = await calcularTotalesPorClase();

          // Obtener estadísticas
          const todasCuentas = await getAllCuentas();
          const cuentasHoja = await getCuentasHoja();

          return {
            success: true,
            totalCuentas: todasCuentas.length,
            totalHojas: cuentasHoja.length,
            totales,
          };
        } catch (error) {
          console.error('[API] Error al cargar balance:', error);
          throw new Error(error instanceof Error ? error.message : 'Error al procesar el archivo');
        }
      }),

    /**
     * Obtiene los totales calculados del balance actual.
     */
    getTotales: publicProcedure.query(async () => {
      try {
        const totales = await calcularTotalesPorClase();
        const todasCuentas = await getAllCuentas();
        const cuentasHoja = await getCuentasHoja();

        return {
          totalCuentas: todasCuentas.length,
          totalHojas: cuentasHoja.length,
          totales,
        };
      } catch (error) {
        console.error('[API] Error al obtener totales:', error);
        throw new Error('Error al obtener totales');
      }
    }),

    /**
     * Obtiene todas las cuentas hoja (para depuración).
     */
    getCuentasHoja: publicProcedure.query(async () => {
      try {
        const cuentas = await getCuentasHoja();
        return cuentas;
      } catch (error) {
        console.error('[API] Error al obtener cuentas hoja:', error);
        throw new Error('Error al obtener cuentas hoja');
      }
    }),

    /**
     * Distribuye el balance consolidado en balances por servicio.
     */
    distribuir: publicProcedure
      .input(
        z.object({
          servicios: z.array(
            z.object({
              nombre: z.string(),
              porcentaje: z.number().min(0).max(100),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Validar que los porcentajes sumen 100
          const totalPorcentaje = input.servicios.reduce((sum, s) => sum + s.porcentaje, 0);
          if (Math.abs(totalPorcentaje - 100) > 0.01) {
            throw new Error(`Los porcentajes deben sumar 100%. Suma actual: ${totalPorcentaje}%`);
          }

          // Distribuir por servicios
          await distribuirPorServicios(input.servicios);

          // Obtener los totales de cada servicio
          const totales = await getTotalesTodosServicios();

          return {
            success: true,
            servicios: totales,
          };
        } catch (error) {
          console.error('[API] Error al distribuir balance:', error);
          throw new Error(error instanceof Error ? error.message : 'Error al distribuir balance');
        }
      }),

    /**
     * Obtiene los totales de todos los servicios.
     */
    getTotalesServicios: publicProcedure.query(async () => {
      try {
        const totales = await getTotalesTodosServicios();
        return totales;
      } catch (error) {
        console.error('[API] Error al obtener totales de servicios:', error);
        throw new Error('Error al obtener totales de servicios');
      }
    }),

    /**
     * Obtiene los totales de un servicio específico.
     */
    getTotalesServicio: publicProcedure
      .input(z.object({ servicio: z.string() }))
      .query(async ({ input }) => {
        try {
          const totales = await calcularTotalesPorServicio(input.servicio);
          return totales;
        } catch (error) {
          console.error('[API] Error al obtener totales del servicio:', error);
          throw new Error('Error al obtener totales del servicio');
        }
      }),

    /**
     * Genera y descarga un archivo Excel con todos los balances.
     */
    descargarExcel: publicProcedure.mutation(async () => {
      try {
        const excelBuffer = await generarExcelBalances();
        
        // Convertir el buffer a base64 para enviarlo al frontend
        const base64 = excelBuffer.toString('base64');
        
        return {
          data: base64,
          filename: `balances_${new Date().toISOString().split('T')[0]}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } catch (error) {
        console.error('[API] Error al generar Excel:', error);
        throw new Error('Error al generar archivo Excel');
      }
    }),

    /**
     * Genera y descarga solo el balance consolidado en Excel.
     */
    descargarConsolidado: publicProcedure.mutation(async () => {
      try {
        const excelBuffer = await generarExcelConsolidado();
        
        const base64 = excelBuffer.toString('base64');
        
        return {
          data: base64,
          filename: `balance_consolidado_${new Date().toISOString().split('T')[0]}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } catch (error) {
        console.error('[API] Error al generar Excel consolidado:', error);
        throw new Error('Error al generar archivo Excel');
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
