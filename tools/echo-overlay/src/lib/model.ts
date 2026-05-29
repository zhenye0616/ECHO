import type { OverlayBridge } from "./bridge";
import { ambientDotState, composeFleetGlance, type DotState, type FleetGlance } from "./fleet";
import { coordStatus, EchoDaemonError, pendingDecisions } from "./mcp";
import { InvalidRepoPathError, normalizeRepoPath } from "./repo-path";
import type { CoordStatusResult, PendingDecisionsResult } from "./types";

export const REPO_PATH_STORAGE_KEY = "echo.overlay.repoPath";

export interface OverlayConfig {
  repoPath?: string;
}

export interface OverlayData {
  repoPath: string;
  pending: PendingDecisionsResult;
  coord: CoordStatusResult;
  glance: FleetGlance;
}

export interface OverlayServices {
  homeDir: () => Promise<string>;
  pendingDecisions: (repoPath: string) => Promise<PendingDecisionsResult>;
  coordStatus: () => Promise<CoordStatusResult>;
  readInFlightSnapshot: OverlayBridge["readInFlightSnapshot"];
}

export type OverlayErrorKind = "repo_path" | "daemon" | "unknown";

export interface OverlayErrorView {
  kind: OverlayErrorKind;
  message: string;
}

export function servicesFromBridge(bridge: OverlayBridge): OverlayServices {
  return {
    homeDir: bridge.homeDir,
    pendingDecisions,
    coordStatus,
    readInFlightSnapshot: bridge.readInFlightSnapshot,
  };
}

export async function resolveRepoPath(config: OverlayConfig, services: Pick<OverlayServices, "homeDir">): Promise<string> {
  const home = await services.homeDir();
  const result = normalizeRepoPath(config.repoPath, home);
  if (!result.ok) throw new InvalidRepoPathError(result.code, result.message);
  return result.path;
}

export async function loadOverlayData(config: OverlayConfig, services: OverlayServices): Promise<OverlayData> {
  const repoPath = await resolveRepoPath(config, services);
  const [pending, coord, snapshot] = await Promise.all([
    services.pendingDecisions(repoPath),
    services.coordStatus(),
    services.readInFlightSnapshot(repoPath),
  ]);
  return {
    repoPath,
    pending,
    coord,
    glance: composeFleetGlance({
      pending,
      coord,
      inFlightItems: snapshot.items,
      reviewRequests: snapshot.reviewRequests,
      scannedReviewRoots: snapshot.scannedReviewRoots,
    }),
  };
}

export async function loadAmbientDot(config: OverlayConfig, services: OverlayServices): Promise<DotState> {
  const repoPath = await resolveRepoPath(config, services);
  const pending = await services.pendingDecisions(repoPath);
  return ambientDotState(pending);
}

export function classifyOverlayError(err: unknown): OverlayErrorView {
  if (err instanceof InvalidRepoPathError) {
    return { kind: "repo_path", message: err.message };
  }
  if (err instanceof EchoDaemonError) {
    return { kind: "daemon", message: err.message };
  }
  return { kind: "unknown", message: err instanceof Error ? err.message : String(err) };
}

export function readOverlayConfig(storage: Storage | undefined = globalThis.localStorage): OverlayConfig {
  const fromEnv = import.meta.env.VITE_ECHO_REPO_PATH as string | undefined;
  try {
    return { repoPath: storage?.getItem(REPO_PATH_STORAGE_KEY) ?? fromEnv };
  } catch {
    return { repoPath: fromEnv };
  }
}
