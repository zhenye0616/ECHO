import type { ArtifactRef } from './types.js';

const GIT_SSH_RE = /^git@([^:]+):(.+?)(?:\.git)?\/?$/i;
const SCHEME_RE = /^[a-z][a-z0-9+\-.]*:\/\//i;

export function normalizeRemoteUrl(remote: string): string {
  const trimmed = remote.trim();
  if (trimmed.length === 0) return trimmed;
  const ssh = GIT_SSH_RE.exec(trimmed);
  if (ssh !== null) {
    const host = (ssh[1] as string).toLowerCase();
    const path = (ssh[2] as string).replace(/\/+$/, '');
    return `https://${host}/${path}`.replace(/\.git$/i, '');
  }
  let url = trimmed;
  url = url.replace(/\.git$/i, '');
  url = url.replace(/\/+$/, '');
  if (SCHEME_RE.test(url)) {
    const colonIdx = url.indexOf('://');
    const scheme = url.slice(0, colonIdx).toLowerCase();
    const rest = url.slice(colonIdx + 3);
    const slashIdx = rest.indexOf('/');
    if (slashIdx === -1) {
      return `${scheme}://${rest.toLowerCase()}`;
    }
    const host = rest.slice(0, slashIdx).toLowerCase();
    const path = rest.slice(slashIdx);
    return `${scheme}://${host}${path}`;
  }
  return url;
}

export function repoArtifact(
  remoteUrl: string | null,
  localRoot: string,
): ArtifactRef {
  if (remoteUrl !== null && remoteUrl.length > 0) {
    const id = normalizeRemoteUrl(remoteUrl);
    return {
      type: 'repo',
      provider: deriveRemoteProvider(id),
      id,
      label: deriveRepoLabel(id),
      locator: localRoot,
    };
  }
  return {
    type: 'repo',
    provider: 'local',
    id: `local:${localRoot}`,
    label: deriveLocalRepoLabel(localRoot),
    locator: localRoot,
  };
}

function deriveRemoteProvider(normalizedUrl: string): string {
  const host = hostOf(normalizedUrl);
  if (host === null) return 'git';
  if (host.endsWith('github.com')) return 'github';
  if (host.endsWith('gitlab.com')) return 'gitlab';
  if (host.endsWith('bitbucket.org')) return 'bitbucket';
  return 'git';
}

function hostOf(url: string): string | null {
  const m = /^[a-z][a-z0-9+\-.]*:\/\/([^/]+)/i.exec(url);
  return m === null ? null : (m[1] as string).toLowerCase();
}

function deriveRepoLabel(normalizedUrl: string): string {
  const m = /\/([^/]+)$/.exec(normalizedUrl);
  return m === null ? normalizedUrl : (m[1] as string);
}

function deriveLocalRepoLabel(localRoot: string): string {
  const m = /\/([^/]+)\/?$/.exec(localRoot);
  return m === null ? localRoot : (m[1] as string);
}

export function fileArtifact(
  repoId: string | null,
  absPath: string,
  repoRoot?: string,
): ArtifactRef {
  if (repoId !== null && repoRoot !== undefined && isInsideRoot(absPath, repoRoot)) {
    const rel = stripRoot(absPath, repoRoot);
    return {
      type: 'file',
      provider: 'local_fs',
      id: `${repoId}::${rel}`,
      label: rel,
      locator: absPath,
    };
  }
  return {
    type: 'file',
    provider: 'local_fs',
    id: `abs:${absPath}`,
    label: basename(absPath),
    locator: absPath,
  };
}

function isInsideRoot(absPath: string, root: string): boolean {
  const normalizedRoot = root.replace(/\/+$/, '');
  return (
    absPath === normalizedRoot ||
    absPath.startsWith(`${normalizedRoot}/`)
  );
}

function stripRoot(absPath: string, root: string): string {
  const normalizedRoot = root.replace(/\/+$/, '');
  if (absPath === normalizedRoot) return '';
  return absPath.slice(normalizedRoot.length + 1);
}

function basename(p: string): string {
  const m = /\/([^/]+)\/?$/.exec(p);
  return m === null ? p : (m[1] as string);
}

export function branchArtifact(repoId: string, branch: string): ArtifactRef {
  return {
    type: 'branch',
    provider: 'git',
    id: `${repoId}::${branch}`,
    label: branch,
  };
}

export function commitArtifact(repoId: string, sha: string): ArtifactRef {
  return {
    type: 'commit',
    provider: 'git',
    id: `${repoId}::${sha}`,
    label: sha.slice(0, 7),
    locator: sha,
  };
}

export function conversationArtifact(
  provider: string,
  sessionId: string,
): ArtifactRef {
  return {
    type: 'conversation',
    provider,
    id: `${provider}:${sessionId}`,
    label: sessionId,
  };
}
