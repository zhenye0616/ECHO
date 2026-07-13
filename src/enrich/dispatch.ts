import type { Storage } from '../storage/interface.js';
import {
  startGranolaSignalWorker,
  type GranolaSignalWorkerHandle,
  type GranolaSignalWorkerOptions,
} from './granola-signals.js';
import { createLabGranolaSignalOptions } from './granola-signals-cli-adapter.js';
import {
  startDriftSweepWorker,
  type DriftSweepWorkerHandle,
  type DriftSweepWorkerOptions,
} from './decision-drift.js';

export interface EnrichmentDispatchHandle {
  granolaSignals: GranolaSignalWorkerHandle;
  driftSweep: DriftSweepWorkerHandle;
  stop: () => Promise<void>;
}

export interface EnrichmentDispatchOptions {
  granolaSignals?: GranolaSignalWorkerOptions;
  driftSweep?: DriftSweepWorkerOptions;
}

export async function startEnrichmentDispatch(
  storage: Storage,
  options: EnrichmentDispatchOptions = {},
): Promise<EnrichmentDispatchHandle> {
  const labOptions = createLabGranolaSignalOptions(options.granolaSignals?.env ?? process.env);
  const granolaSignals = await startGranolaSignalWorker(storage, {
    ...labOptions,
    ...options.granolaSignals,
  });
  // Item 114 AC1 — the drift sweep is registered here and chained AFTER the
  // signal worker (runSignalsFirst) so each tick reads freshly-extracted signal
  // atoms before judging them against recorded decisions. Fail-closed inside
  // startDriftSweepWorker: OFF by default, misconfigured → disabled handle.
  const driftSweep = await startDriftSweepWorker(storage, {
    runSignalsFirst: () => granolaSignals.run(),
    ...options.driftSweep,
  });
  return {
    granolaSignals,
    driftSweep,
    stop: async () => {
      await driftSweep.stop();
      await granolaSignals.stop();
    },
  };
}
