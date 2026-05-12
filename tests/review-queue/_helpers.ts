import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

export const REPO = process.cwd();

let cachedPython: { cmd: string; args: string[] } | null = null;

function tryPython(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, [...args, '-c', 'import jsonschema, yaml'], { stdio: 'ignore' });
  return r.status === 0;
}

/**
 * Resolves a python3 invocation that can import jsonschema + yaml.
 *
 * On the founder's machine, vitest's node binary is x86_64 (running under
 * Rosetta on Apple Silicon). Direct `python3 ...` invocation from such a
 * process inherits the x86_64 architecture preference, which then fails to
 * load arm64-only wheels installed in the user's site-packages. The fallback
 * tries `arch -arm64 python3` to force the native architecture.
 */
export function pythonInvocation(): { cmd: string; args: string[] } {
  if (cachedPython) return cachedPython;
  if (tryPython('python3', [])) {
    cachedPython = { cmd: 'python3', args: [] };
  } else if (process.platform === 'darwin' && tryPython('arch', ['-arm64', 'python3'])) {
    cachedPython = { cmd: 'arch', args: ['-arm64', 'python3'] };
  } else {
    throw new Error('python3 with jsonschema + yaml not available');
  }
  return cachedPython;
}

export function runPython(scriptArgs: string[]): { code: number; stdout: string; stderr: string } {
  const { cmd, args } = pythonInvocation();
  try {
    const stdout = execFileSync(cmd, [...args, ...scriptArgs], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof err.status === 'number' ? err.status : 1,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : '',
    };
  }
}

export function validatorPath(): string {
  return join(REPO, 'tools/review-queue/validate.py');
}

export function requestScript(): string {
  return join(REPO, 'tools/review-queue/request.py');
}

export function combineScript(): string {
  return join(REPO, 'tools/review-queue/combine.py');
}

export function dispatchScript(): string {
  return join(REPO, 'tools/review-queue/dispatch-next-round.py');
}
