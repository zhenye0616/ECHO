import { describe, expect, it } from "vitest";
import { ambientDotState } from "../src/lib/fleet";
import { classifyOverlayError, loadAmbientDot } from "../src/lib/model";
import { InvalidRepoPathError, normalizeRepoPath, requireRepoPath } from "../src/lib/repo-path";
import { decisionCard, freshSourceState, pendingResult } from "./fixtures";

describe("repoPath resolution", () => {
  it("resolves the default ~/Desktop/Project_echo against the Tauri home directory", () => {
    expect(normalizeRepoPath(undefined, "/Users/zhenye")).toEqual({
      ok: true,
      path: "/Users/zhenye/Desktop/Project_echo",
    });
  });

  it("passes through an absolute configured path", () => {
    expect(normalizeRepoPath("/tmp/Project_echo", "/Users/zhenye")).toEqual({ ok: true, path: "/tmp/Project_echo" });
  });

  it("rejects relative configured paths before calling pending_decisions", () => {
    const result = normalizeRepoPath("Project_echo", "/Users/zhenye");
    expect(result).toEqual({
      ok: false,
      code: "relative",
      message: "Repository path must be absolute before calling pending_decisions: Project_echo",
    });
    expect(() => requireRepoPath("Project_echo", "/Users/zhenye")).toThrow(InvalidRepoPathError);
  });

  it("classifies invalid repo paths distinctly from daemon-down errors and leaves the dot unknown", async () => {
    const services = {
      homeDir: async () => "/Users/zhenye",
      pendingDecisions: async () => pendingResult(),
      coordStatus: async () => {
        throw new Error("not used");
      },
      readInFlightSnapshot: async () => ({ items: [], reviewRequests: [], scannedReviewRoots: [] }),
    };

    await expect(loadAmbientDot({ repoPath: "relative" }, services)).rejects.toBeInstanceOf(InvalidRepoPathError);
    const view = classifyOverlayError(new InvalidRepoPathError("relative", "bad repo path"));
    expect(view).toEqual({ kind: "repo_path", message: "bad repo path" });
    expect(ambientDotState(null, view)).toBe("unknown");
  });
});

describe("ambient dot predicate", () => {
  it("is lit iff at least one fresh awaiting-founder card exists", () => {
    expect(ambientDotState(pendingResult([decisionCard()]))).toBe("lit");
  });

  it("is confidently dark on a fresh zero-card read", () => {
    expect(ambientDotState(pendingResult([]))).toBe("dark");
  });

  it("is neutral unknown on stale, dirty, partial, or unreachable reads", () => {
    expect(ambientDotState(pendingResult([], { ...freshSourceState, behind: 1 }))).toBe("unknown");
    expect(ambientDotState(pendingResult([], { ...freshSourceState, upstream_stale: true }))).toBe("unknown");
    expect(ambientDotState(pendingResult([], { ...freshSourceState, dirty: true }))).toBe("unknown");
    expect(ambientDotState(pendingResult([], { ...freshSourceState, partial: true }))).toBe("unknown");
    expect(ambientDotState(null, new Error("daemon down"))).toBe("unknown");
  });
});
