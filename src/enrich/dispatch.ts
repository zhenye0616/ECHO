import type { Storage } from '../storage/interface.js';
import {
  startGranolaSignalWorker,
  type GranolaSignalWorkerHandle,
  type GranolaSignalWorkerOptions,
} from './granola-signals.js';

export interface EnrichmentDispatchHandle {
  granolaSignals: GranolaSignalWorkerHandle;
  stop: () => Promise<void>;
}

export interface EnrichmentDispatchOptions {
  granolaSignals?: GranolaSignalWorkerOptions;
}

export async function startEnrichmentDispatch(
  storage: Storage,
  options: EnrichmentDispatchOptions = {},
): Promise<EnrichmentDispatchHandle> {
  const granolaSignals = await startGranolaSignalWorker(storage, options.granolaSignals);
  return {
    granolaSignals,
    stop: async () => {
      await granolaSignals.stop();
    },
  };
}
