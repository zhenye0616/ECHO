import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { homeDir as tauriHomeDir } from "@tauri-apps/api/path";
import type { DotState } from "./fleet";
import type { InFlightSnapshot } from "./types";

export const OVERLAY_SHOWN_EVENT = "overlay:shown";
export const OVERLAY_HIDDEN_EVENT = "overlay:hidden";

export interface OverlayBridge {
  readInFlightSnapshot: (repoPath: string) => Promise<InFlightSnapshot>;
  setAmbientDot: (state: DotState) => Promise<void>;
  openTarget: (target: string) => Promise<void>;
  dismissOverlay: () => Promise<void>;
  homeDir: () => Promise<string>;
  onOverlayShown: (handler: () => void) => Promise<UnlistenFn>;
  onOverlayHidden: (handler: () => void) => Promise<UnlistenFn>;
}

interface TauriInternals {
  invoke?: unknown;
  transformCallback?: unknown;
}

export function hasTauriRuntime(): boolean {
  const internals = tauriInternals();
  return typeof internals?.invoke === "function" && typeof internals.transformCallback === "function";
}

function tauriInternals(): TauriInternals | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  return candidate !== null && typeof candidate === "object" ? candidate : null;
}

const emptyInFlightSnapshot = (): InFlightSnapshot => ({
  items: [],
  reviewRequests: [],
  scannedReviewRoots: [],
});

const noopUnlisten: UnlistenFn = () => undefined;

export const browserBridge: OverlayBridge = {
  readInFlightSnapshot: async () => emptyInFlightSnapshot(),
  setAmbientDot: async () => undefined,
  openTarget: async () => undefined,
  dismissOverlay: async () => undefined,
  homeDir: async () => {
    const configuredHomeDir = import.meta.env.VITE_ECHO_HOME_DIR as string | undefined;
    if (configuredHomeDir !== undefined && configuredHomeDir.trim() !== "") return configuredHomeDir;
    throw new Error("Tauri homeDir is unavailable outside the desktop shell; configure an absolute repo path for web dev.");
  },
  onOverlayShown: async () => noopUnlisten,
  onOverlayHidden: async () => noopUnlisten,
};

export const tauriBridge: OverlayBridge = {
  readInFlightSnapshot: (repoPath) =>
    hasTauriRuntime() ? invoke<InFlightSnapshot>("read_in_flight_snapshot", { repoPath }) : browserBridge.readInFlightSnapshot(repoPath),
  setAmbientDot: (state) => (hasTauriRuntime() ? invoke<void>("set_ambient_dot", { state }) : browserBridge.setAmbientDot(state)),
  openTarget: (target) => (hasTauriRuntime() ? invoke<void>("open_target", { target }) : browserBridge.openTarget(target)),
  dismissOverlay: () => (hasTauriRuntime() ? invoke<void>("dismiss_overlay") : browserBridge.dismissOverlay()),
  homeDir: () => (hasTauriRuntime() ? tauriHomeDir() : browserBridge.homeDir()),
  onOverlayShown: (handler) => (hasTauriRuntime() ? listen(OVERLAY_SHOWN_EVENT, handler) : browserBridge.onOverlayShown(handler)),
  onOverlayHidden: (handler) => (hasTauriRuntime() ? listen(OVERLAY_HIDDEN_EVENT, handler) : browserBridge.onOverlayHidden(handler)),
};
