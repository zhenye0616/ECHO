import { afterEach, describe, expect, it, vi } from "vitest";
import { hasTauriRuntime, tauriBridge } from "../src/lib/bridge";

describe("tauriBridge browser fallback", () => {
  afterEach(() => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("does not call Tauri internals when the app is rendered outside the desktop shell", async () => {
    expect(hasTauriRuntime()).toBe(false);

    await expect(tauriBridge.setAmbientDot("unknown")).resolves.toBeUndefined();
    await expect(tauriBridge.dismissOverlay()).resolves.toBeUndefined();
    await expect(tauriBridge.readInFlightSnapshot("/tmp/Project_echo")).resolves.toEqual({
      items: [],
      reviewRequests: [],
      scannedReviewRoots: [],
    });
  });

  it("uses no-op overlay event listeners outside the desktop shell", async () => {
    const handler = vi.fn();

    const unlistenShown = await tauriBridge.onOverlayShown(handler);
    const unlistenHidden = await tauriBridge.onOverlayHidden(handler);

    expect(handler).not.toHaveBeenCalled();
    expect(unlistenShown()).toBeUndefined();
    expect(unlistenHidden()).toBeUndefined();
  });

  it("falls back when a partial Tauri internals object exists without IPC functions", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};

    expect(hasTauriRuntime()).toBe(false);
    await expect(tauriBridge.setAmbientDot("unknown")).resolves.toBeUndefined();
    await expect(tauriBridge.onOverlayShown(vi.fn())).resolves.toEqual(expect.any(Function));
  });
});
