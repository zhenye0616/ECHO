import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';
import { REPO } from './_helpers.js';

interface ReviewerBinding {
  reviewer: string;
  mode: 'headless-cli' | 'host-subagent' | 'ide-manual';
  argv?: string[];
  stdin_from?: string;
  agent_sandbox: 'read-only' | 'workspace-write' | 'danger-full-access';
  commit_policy: 'child' | 'wrapper';
}

interface ReviewerBindingsConfig {
  kind: 'reviewer';
  bindings: ReviewerBinding[];
}

interface LegacyReviewer {
  name: string;
  mode: 'headless' | 'ide';
  slash_command: string;
  invoke_command?: string;
}

interface LegacyReviewersConfig {
  reviewers: LegacyReviewer[];
}

const bindingsPath = join(REPO, 'tools/review-queue/reviewer-bindings.json');
const bindingsSchemaPath = join(REPO, 'tools/review-queue/schemas/reviewer-bindings.schema.json');
const reviewersPath = join(REPO, 'tools/review-queue/reviewers.json');
const gatePath = join(REPO, 'tools/review-queue/_reviewer_gate.py');
const runReviewerPath = join(REPO, 'tools/review-queue/_run_reviewer.sh');
const installerPath = join(REPO, 'tools/review-queue/_install_reviewer_launchd.sh');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function config(): ReviewerBindingsConfig {
  return readJson<ReviewerBindingsConfig>(bindingsPath);
}

function binding(slug: string): ReviewerBinding {
  const found = config().bindings.find((b) => b.reviewer === slug);
  if (!found) throw new Error(`binding not found for ${slug}`);
  return found;
}

function legacyReviewer(slug: string): LegacyReviewer {
  const reviewers = readJson<LegacyReviewersConfig>(reviewersPath).reviewers;
  const found = reviewers.find((r) => r.name === slug);
  if (!found) throw new Error(`legacy reviewer not found for ${slug}`);
  return found;
}

function gateBuffer(args: string[], env: Record<string, string>) {
  return spawnSync('python3', [gatePath, ...args], {
    cwd: REPO,
    env: { ...process.env, ...env },
  });
}

function gateText(args: string[], env: Record<string, string>) {
  return spawnSync('python3', [gatePath, ...args], {
    cwd: REPO,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
}

function parseNulDelimited(stdout: Buffer): string[] {
  return stdout.toString('utf-8').split('\0').filter(Boolean);
}

describe('087 reviewer-bindings.json contract', () => {
  it('parses and validates against the reviewer-bindings schema', () => {
    const schema = readJson<Record<string, unknown>>(bindingsSchemaPath);
    const cfg = config();
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema);

    expect(validate(cfg), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(cfg.kind).toBe('reviewer');
    expect(cfg.bindings.map((b) => b.reviewer)).toEqual(['codex', 'cursor', 'codex-ops', 'claude']);
  });

  it('records current sandbox and child commit reality without flipping behavior', () => {
    for (const slug of ['codex', 'codex-ops']) {
      const b = binding(slug);
      expect(b.agent_sandbox).toBe('danger-full-access');
      expect(b.commit_policy).toBe('child');
      expect(b.argv).toEqual([
        'codex',
        'exec',
        '-C',
        '{{WT}}',
        '--sandbox',
        'danger-full-access',
        '-',
      ]);
    }
    expect(binding('cursor').mode).toBe('ide-manual');
    expect(binding('cursor').argv).toBeUndefined();
  });

  it('keeps prompt paths out of headless argv and routes prompts through stdin_from', () => {
    for (const slug of ['codex', 'codex-ops', 'claude']) {
      const b = binding(slug);
      expect(b.mode).toBe('headless-cli');
      expect(b.stdin_from).toBe('.claude/commands/review-queue-{{REVIEWER}}.md');
      expect(b.argv?.join('\0')).not.toContain('{{PROMPT}}');
      expect(b.argv?.join('\0')).not.toContain('.claude/commands');
    }
    expect(binding('codex').argv?.at(-1)).toBe('-');
    expect(binding('claude').argv).toEqual(['claude', '--dangerously-skip-permissions', '-p']);
  });

  it('preserves current reviewer executable, flags, worktree routing, and sandbox values', () => {
    expect(legacyReviewer('codex').invoke_command).toBe(
      'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
    );
    expect(legacyReviewer('codex-ops').invoke_command).toBe(
      'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
    );
    expect(legacyReviewer('claude').invoke_command).toBe(
      'claude --dangerously-skip-permissions -p < {{PROMPT}}',
    );

    const wt = '/tmp/echo wt';
    const codexArgv = ['codex', 'exec', '-C', wt, '--sandbox', 'danger-full-access', '-'];
    for (const slug of ['codex', 'codex-ops']) {
      const r = gateBuffer(['--print', 'argv_nul'], { REVIEWER_NAME: slug, WT: wt });
      expect(r.status, r.stderr.toString()).toBe(0);
      expect(parseNulDelimited(r.stdout as Buffer)).toEqual(codexArgv);
      const sandbox = gateText(['--print', 'agent_sandbox'], { REVIEWER_NAME: slug, WT: wt });
      expect(sandbox.stdout.trim()).toBe('danger-full-access');
    }

    const claude = gateBuffer(['--print', 'argv_nul'], { REVIEWER_NAME: 'claude', WT: wt });
    expect(claude.status, claude.stderr.toString()).toBe(0);
    expect(parseNulDelimited(claude.stdout as Buffer)).toEqual([
      'claude',
      '--dangerously-skip-permissions',
      '-p',
    ]);
  });

  it('resolves stdin_from from reviewer-bindings.json, not reviewers.json slash_command', () => {
    const dir = mkdtempSync(join(tmpdir(), 'echo-rq-087-bindings-'));
    try {
      const customReviewers = join(dir, 'reviewers.json');
      const customBindings = join(dir, 'reviewer-bindings.json');
      writeFileSync(
        customReviewers,
        JSON.stringify(
          {
            reviewers: [
              {
                name: 'codex',
                mode: 'headless',
                required: true,
                timeout_hours: null,
                slash_command: 'wrong-prompt',
                invoke_command: 'codex - < {{PROMPT}}',
              },
            ],
          },
          null,
          2,
        ),
      );
      writeFileSync(
        customBindings,
        JSON.stringify(
          {
            kind: 'reviewer',
            bindings: [
              {
                reviewer: 'codex',
                mode: 'headless-cli',
                argv: ['codex', '-'],
                stdin_from: 'binding-owned/prompt.md',
                cwd: '{{WT}}',
                agent_sandbox: 'danger-full-access',
                commit_policy: 'child',
                timeout_sec: null,
                capture: {
                  kind: 'committed_file',
                  final_message_path: 'backlog/reviews/{{ITEM}}/{{ROUND}}/{{REVIEWER}}.md',
                  stdout_path: 'stdout',
                  stderr_path: 'stderr',
                  rc_path: 'rc',
                },
                expected_artifact: {
                  path: 'backlog/reviews/{{ITEM}}/{{ROUND}}/{{REVIEWER}}.md',
                  schema_ref: 'tools/review-queue/schemas/reviewer.schema.json',
                },
              },
            ],
          },
          null,
          2,
        ),
      );

      const r = gateText(['--print', 'stdin_from'], {
        REVIEWER_NAME: 'codex',
        WT: '/tmp/wt',
        ECHO_REVIEWERS_CONFIG: customReviewers,
        ECHO_REVIEWER_BINDINGS_CONFIG: customBindings,
      });
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout.trim()).toBe('/tmp/wt/binding-owned/prompt.md');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails invalid binding configs before emitting argv', () => {
    const dir = mkdtempSync(join(tmpdir(), 'echo-rq-087-invalid-'));
    try {
      const invalidBindings = join(dir, 'reviewer-bindings.json');
      writeFileSync(invalidBindings, JSON.stringify({ kind: 'reviewer', bindings: [] }));
      const r = gateBuffer(['--print', 'argv_nul'], {
        REVIEWER_NAME: 'codex',
        WT: '/tmp/wt',
        ECHO_REVIEWER_BINDINGS_CONFIG: invalidBindings,
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr.toString()).toMatch(/codex not found in reviewer-bindings\.json/);
      expect((r.stdout as Buffer).length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runtime scripts use argv_nul and no removed shell-string dispatch seam', () => {
    const runner = readFileSync(runReviewerPath, 'utf-8');
    const installer = readFileSync(installerPath, 'utf-8');

    expect(runner).toContain('--print argv_nul');
    expect(runner).toContain('gate_rc=$?');
    expect(runner).toContain('[ ! -s "$argv_file" ]');
    expect(runner).toContain('echo_effect codex-exec -- "${INVOKE_ARGV[@]}" < "$STDIN_FROM"');
    expect(runner).not.toContain('--print invoke_command');
    expect(runner).not.toContain('bash -c "$INVOKE_CMD"');

    expect(installer).toContain('--print argv_nul');
    expect(installer).not.toContain('--print invoke_command');
  });

  it('ships reviewer-bindings.json in the npm package file whitelist', () => {
    const pkg = readJson<{ files: string[] }>(join(REPO, 'package.json'));
    expect(pkg.files).toContain('tools/review-queue/reviewer-bindings.json');
  });
});
