import { describe, expect, it, vi } from "vitest";
import { EchoDaemonError } from "../src/lib/mcp";
import { startSingleFlightPoller, type PollerTimers } from "../src/lib/poller";

describe("startSingleFlightPoller", () => {
  it("runs single-flight, clears the interval, and suppresses late results after stop", async () => {
    const deferred = defer<string>();
    const load = vi.fn(() => deferred.promise);
    const onResult = vi.fn();
    const onError = vi.fn();
    const timers = fakeTimers();

    const handle = startSingleFlightPoller({ load, onResult, onError, timers });

    expect(load).toHaveBeenCalledTimes(1);
    handle.tick();
    expect(load).toHaveBeenCalledTimes(1);

    handle.stop();
    expect(timers.clearInterval).toHaveBeenCalledWith("interval-1");

    deferred.resolve("late result");
    await flushMicrotasks();

    expect(onResult).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    handle.tick();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("backs off daemon-unreachable failures before the next fetch", async () => {
    const timers = fakeTimers();
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new EchoDaemonError())
      .mockResolvedValueOnce("fresh");
    const onResult = vi.fn();
    const onError = vi.fn();

    const handle = startSingleFlightPoller({
      load,
      onResult,
      onError,
      timers,
      intervalMs: 5_000,
      backoffMs: 15_000,
    });
    await flushMicrotasks();

    expect(load).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    timers.advanceTo(14_999);
    handle.tick();
    expect(load).toHaveBeenCalledTimes(1);

    timers.advanceTo(15_000);
    handle.tick();
    await flushMicrotasks();

    expect(load).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledWith("fresh");
  });
});

function fakeTimers(): PollerTimers & { advanceTo: (next: number) => void; clearInterval: ReturnType<typeof vi.fn> } {
  let now = 0;
  const clearInterval = vi.fn();
  return {
    setInterval: vi.fn(() => "interval-1"),
    clearInterval,
    now: () => now,
    advanceTo: (next: number) => {
      now = next;
    },
  };
}

function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
