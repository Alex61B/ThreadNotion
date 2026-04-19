import { sweepExpiredGracePeriods } from '../../billing/graceSweeper';

export async function runGraceSweep(): Promise<void> {
  await sweepExpiredGracePeriods();
}
