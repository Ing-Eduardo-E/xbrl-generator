import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { parseExcelFile } from '@/lib/services/excelParser';
import { partitionAccounts } from '@/lib/services/accountClassification';
import { projectQuarterly } from '@/lib/services/projectionEngine';
import { generateQuarterlyExcelFiles } from '@/lib/services/quarterlyExcelGenerator';

const accountSchema = z.object({
  code: z.string(),
  name: z.string(),
  value: z.number(),
  isLeaf: z.boolean(),
  level: z.number(),
  class: z.string(),
});

const projectionConfigSchema = z.object({
  percentages: z.object({
    q1: z.number().min(0).max(100),
    q2: z.number().min(0).max(100),
    q3: z.number().min(0).max(100),
    q4: z.number().min(0).max(100),
  }),
  year: z.number().min(2020).max(2035),
});

export const projectionRouter = router({
  uploadAndClassify: publicProcedure
    .input(z.object({
      fileData: z.string().max(10_000_000),
      fileName: z.string().max(255),
    }))
    .mutation(async ({ input }) => {
      const parsed = await parseExcelFile(input.fileData, input.fileName);
      const { static: staticAccounts, dynamic: dynamicAccounts, summary } = partitionAccounts(parsed.accounts);
      // Totales generales (pueden ser calculados aquí si es necesario)
      const totals = {
        total: parsed.accounts.reduce((sum, acc) => sum + acc.value, 0),
      };
      return {
        accounts: parsed.accounts,
        staticAccounts,
        dynamicAccounts,
        summary,
        totals,
      };
    }),

  previewProjection: publicProcedure
    .input(z.object({
      accounts: z.array(accountSchema),
      config: projectionConfigSchema,
    }))
    .mutation(({ input }) => {
      const projections = projectQuarterly(input.accounts, input.config);
      return {
        projections: projections.map(p => ({
          quarter: p.quarter,
          label: p.label,
          percentage: p.percentage,
          totals: p.totals,
          balanceValidation: p.balanceValidation,
        })),
      };
    }),

  generateExcels: publicProcedure
    .input(z.object({
      accounts: z.array(accountSchema),
      config: projectionConfigSchema,
      companyName: z.string().max(200).optional(),
    }))
    .mutation(({ input }) => {
      const projections = projectQuarterly(input.accounts, input.config);
      const companyName = input.companyName || 'Empresa';
      const files = generateQuarterlyExcelFiles(projections, companyName, input.config.year);
      return files;
    }),
});