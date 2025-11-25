import { router } from '../trpc';
import { balanceRouter } from './balance';

export const appRouter = router({
  balance: balanceRouter,
});

export type AppRouter = typeof appRouter;
