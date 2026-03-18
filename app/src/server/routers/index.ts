import { router } from '../trpc';
import { balanceRouter } from './balance';
import { projectionRouter } from './projection';

export const appRouter = router({
  balance: balanceRouter,
  projection: projectionRouter,
});

export type AppRouter = typeof appRouter;
