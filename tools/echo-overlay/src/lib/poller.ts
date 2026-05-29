import { EchoDaemonError } from "./mcp";

export interface PollerTimers {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  now: () => number;
}

export interface PollerOptions<T> {
  load: () => Promise<T>;
  onResult: (result: T) => void;
  onError: (err: unknown) => void;
  intervalMs?: number;
  backoffMs?: number;
  timers?: PollerTimers;
}

export interface PollerHandle {
  stop: () => void;
  tick: () => void;
}

export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_BACKOFF_MS = 15_000;

export function startSingleFlightPoller<T>(options: PollerOptions<T>): PollerHandle {
  const timers = options.timers ?? {
    setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
    clearInterval: (handle: unknown) => globalThis.clearInterval(handle as ReturnType<typeof globalThis.setInterval>),
    now: Date.now,
  };
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  let stopped = false;
  let inFlight = false;
  let backoffUntil = 0;

  const tick = () => {
    if (stopped || inFlight || timers.now() < backoffUntil) return;
    inFlight = true;
    void options
      .load()
      .then((result) => {
        inFlight = false;
        if (stopped) return;
        backoffUntil = 0;
        options.onResult(result);
      })
      .catch((err: unknown) => {
        inFlight = false;
        if (stopped) return;
        if (err instanceof EchoDaemonError) backoffUntil = timers.now() + backoffMs;
        options.onError(err);
      });
  };

  tick();
  const interval = timers.setInterval(tick, intervalMs);
  return {
    stop: () => {
      stopped = true;
      timers.clearInterval(interval);
    },
    tick,
  };
}
