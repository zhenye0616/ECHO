import { homedir } from 'node:os';
import { isNonEmptyString } from '../guards.js';

export const CAPTURED_SOURCES = {
  apps: {},
  domains: {},
  fs_paths: ['~/Library/Application Support/Cursor/User/workspaceStorage/', '~/.claude/projects/'],
  apis: [],
} as const;

export type Source =
  | { kind: 'app'; bundleId: keyof typeof CAPTURED_SOURCES.apps }
  | { kind: 'domain'; host: keyof typeof CAPTURED_SOURCES.domains }
  | { kind: 'fs'; path: string }
  | { kind: 'api'; name: string };

const HOME = homedir();

export function expandTilde(p: string): string {
  if (p === '~') return HOME;
  if (p.startsWith('~/')) return HOME + p.slice(1);
  return p;
}

export function _isAllowedAppIn(
  bundleId: unknown,
  apps: Readonly<Record<string, unknown>>,
): boolean {
  if (!isNonEmptyString(bundleId)) return false;
  return Object.prototype.hasOwnProperty.call(apps, bundleId);
}

export function _isAllowedDomainIn(
  host: unknown,
  domains: Readonly<Record<string, unknown>>,
): boolean {
  if (!isNonEmptyString(host)) return false;
  return Object.prototype.hasOwnProperty.call(domains, host);
}

export function _isAllowedPathIn(path: unknown, fsPaths: ReadonlyArray<string>): boolean {
  if (!isNonEmptyString(path)) return false;
  const expanded = expandTilde(path);
  return fsPaths.some((entry) => expanded.startsWith(expandTilde(entry)));
}

export function _isAllowedApiIn(name: unknown, apis: ReadonlyArray<string>): boolean {
  if (!isNonEmptyString(name)) return false;
  return apis.includes(name);
}

export function isAllowedApp(bundleId: string): boolean {
  return _isAllowedAppIn(bundleId, CAPTURED_SOURCES.apps);
}

export function isAllowedDomain(host: string): boolean {
  return _isAllowedDomainIn(host, CAPTURED_SOURCES.domains);
}

export function isAllowedPath(path: string): boolean {
  return _isAllowedPathIn(path, CAPTURED_SOURCES.fs_paths);
}

export function isAllowedApi(name: string): boolean {
  return _isAllowedApiIn(name, CAPTURED_SOURCES.apis);
}
