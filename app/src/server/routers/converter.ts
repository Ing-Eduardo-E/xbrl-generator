import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  analyzeExcel,
  mapToTemplate,
  transformData,
  validateTransformation,
  generateConvertedTemplate,
  type AnalysisResult,
  type TransformResult,
} from '@/lib/services/templateConverter';

let cachedAnalysis: AnalysisResult | null = null;
let cachedTransform: TransformResult | null = null;

export const converterRouter = router({
  analyze: publicProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string().max(10_485_760),
    }))
    .mutation(({ input }) => {
      const result = analyzeExcel(input.fileData, input.fileName);
      cachedAnalysis = result;
      return result;
    }),

  mapAccounts: publicProcedure
    .input(z.object({
      targetTaxonomy: z.string().default('r414'),
    }))
    .mutation(({ input }) => {
      if (!cachedAnalysis) throw new Error('Primero debes analizar un archivo');
      return mapToTemplate(cachedAnalysis.accounts, input.targetTaxonomy);
    }),

  transform: publicProcedure
    .input(z.object({
      acueducto: z.number().min(0).max(100),
      alcantarillado: z.number().min(0).max(100),
      aseo: z.number().min(0).max(100),
    }))
    .mutation(({ input }) => {
      if (!cachedAnalysis) throw new Error('Primero debes analizar un archivo');
      const result = transformData(cachedAnalysis.accounts, input);
      cachedTransform = result;
      return result;
    }),

  validate: publicProcedure
    .mutation(() => {
      if (!cachedAnalysis) throw new Error('Primero debes analizar un archivo');
      if (!cachedTransform) throw new Error('Primero debes transformar los datos');
      return validateTransformation(cachedAnalysis, cachedTransform);
    }),

  generateTemplate: publicProcedure
    .mutation(() => {
      if (!cachedAnalysis) throw new Error('Primero debes analizar un archivo');
      if (!cachedTransform) throw new Error('Primero debes transformar los datos');
      const base64 = generateConvertedTemplate(cachedAnalysis, cachedTransform);
      return { base64, fileName: 'Plantilla_XBRL.xlsx' };
    }),
});
