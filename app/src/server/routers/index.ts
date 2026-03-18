import { router } from '../trpc';
import { balanceRouter } from './balance';
import { projectionRouter } from './projection';
import { converterRouter } from './converter';

export const appRouter = router({
  balance: balanceRouter,
  projection: projectionRouter,
  converter: converterRouter,
});

export type AppRouter = typeof appRouter;
