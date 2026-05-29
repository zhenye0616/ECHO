export const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";

export type RepoPathErrorCode = "relative" | "empty";

export interface RepoPathOk {
  ok: true;
  path: string;
}

export interface RepoPathError {
  ok: false;
  code: RepoPathErrorCode;
  message: string;
}

export type RepoPathResult = RepoPathOk | RepoPathError;

export class InvalidRepoPathError extends Error {
  readonly code: RepoPathErrorCode;

  constructor(code: RepoPathErrorCode, message: string) {
    super(message);
    this.name = "InvalidRepoPathError";
    this.code = code;
  }
}

export function normalizeRepoPath(input: string | undefined, homeDir: string): RepoPathResult {
  const raw = (input ?? DEFAULT_REPO_PATH).trim();
  if (raw.length === 0) {
    return { ok: false, code: "empty", message: "Repository path is empty" };
  }
  const expanded = expandHome(raw, homeDir);
  if (!isAbsolutePath(expanded)) {
    return {
      ok: false,
      code: "relative",
      message: `Repository path must be absolute before calling pending_decisions: ${raw}`,
    };
  }
  return { ok: true, path: normalizeSlashes(expanded) };
}

export function requireRepoPath(input: string | undefined, homeDir: string): string {
  const result = normalizeRepoPath(input, homeDir);
  if (!result.ok) throw new InvalidRepoPathError(result.code, result.message);
  return result.path;
}

function expandHome(path: string, homeDir: string): string {
  if (path === "~") return homeDir;
  if (path.startsWith("~/")) return `${homeDir}${path.slice(1)}`;
  return path;
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

function normalizeSlashes(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}
