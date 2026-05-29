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

export const tauriBridge: OverlayBridge = {
  readInFlightSnapshot: (repoPath) => invoke<InFlightSnapshot>("read_in_flight_snapshot", { repoPath }),
  setAmbientDot: (state) => invoke<void>("set_ambient_dot", { state }),
  openTarget: (target) => invoke<void>("open_target", { target }),
  dismissOverlay: () => invoke<void>("dismiss_overlay"),
  homeDir: () => tauriHomeDir(),
  onOverlayShown: (handler) => listen(OVERLAY_SHOWN_EVENT, handler),
  onOverlayHidden: (handler) => listen(OVERLAY_HIDDEN_EVENT, handler),
};
