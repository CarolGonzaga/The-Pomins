import { getEconomyFoundation } from '../economy-foundation/server';
import { projectContinuity } from './model';

export async function getContinuity() {
  // The RPC filters by auth.uid(), derives the latest valid completion from the
  // ledger and supplies clock_timestamp(). No owner/save/date comes from clients.
  return projectContinuity(await getEconomyFoundation());
}
