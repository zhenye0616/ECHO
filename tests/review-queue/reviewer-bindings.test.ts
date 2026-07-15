import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  capture: {
    kind: 'committed_file' | 'stdout_json' | 'stdout_text' | 'stderr_text' | 'none';
    final_message_path: string;
    stdout_path: string;
    stderr_path: string;
    rc_path: string;
  };
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
const canonicalProtectedArgv = [
  'codex',
  'exec',
  '-C',
  '{{WT}}',
  '--sandbox',
  'read-only',
  '--json',
  '-',
];
const nonCanonicalProtectedArgvCases: Array<[string, string[]]> = [
  [
    'path-qualified codex argv0',
    ['/tmp/evil/codex', 'exec', '-C', '{{WT}}', '--sandbox', 'read-only', '--json', '-'],
  ],
  [
    'bare differently-named shim argv0',
    ['codex-shim', 'exec', '-C', '{{WT}}', '--sandbox', 'read-only', '--json', '-'],
  ],
  [
    'dangerous sandbox bypass flag',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--dangerously-bypass-approvals-and-sandbox',
      '--json',
      '-',
    ],
  ],
  [
    '-c sandbox override',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '-c',
      'sandbox=danger-full-access',
      '--json',
      '-',
    ],
  ],
  [
    '--config sandbox override',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--config',
      'sandbox=danger-full-access',
      '--json',
      '-',
    ],
  ],
  [
    '--config=sandbox override',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--config=sandbox=danger-full-access',
      '--json',
      '-',
    ],
  ],
  [
    '--profile override',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--profile',
      'unsafe',
      '--json',
      '-',
    ],
  ],
  ['-s sandbox alias', ['codex', 'exec', '-C', '{{WT}}', '-s', 'read-only', '--json', '-']],
  [
    'duplicate read-only --sandbox',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--sandbox',
      'read-only',
      '--json',
      '-',
    ],
  ],
  [
    'duplicate non-read-only --sandbox',
    [
      'codex',
      'exec',
      '-C',
      '{{WT}}',
      '--sandbox',
      'read-only',
      '--sandbox',
      'workspace-write',
      '--json',
      '-',
    ],
  ],
  [
    'separated non-read-only --sandbox',
    ['codex', 'exec', '-C', '{{WT}}', '--sandbox', 'workspace-write', '--json', '-'],
  ],
  [
    'glued non-read-only --sandbox',
    ['codex', 'exec', '-C', '{{WT}}', '--sandbox=workspace-write', '--json', '-'],
  ],
  [
    'extra unknown trailing flag',
    ['codex', 'exec', '-C', '{{WT}}', '--sandbox', 'read-only', '--json', '-', '--unexpected'],
  ],
  [
    'reordered otherwise-read-only flags',
    ['codex', 'exec', '--json', '-C', '{{WT}}', '--sandbox', 'read-only', '-'],
  ],
];
const poisonedDefaultProtectedArgvCases = nonCanonicalProtectedArgvCases.filter(([label]) =>
  [
    'dangerous sandbox bypass flag',
    '-c sandbox override',
    '--config sandbox override',
    '--profile override',
  ].includes(label),
);

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

function protectedReviewerBindingConfig(reviewer: 'codex' | 'codex-ops', argv: string[]) {
  return {
    kind: 'reviewer',
    bindings: [
      {
        reviewer,
        mode: 'headless-cli',
        argv,
        stdin_from: `.claude/commands/review-queue-${reviewer}.md`,
        cwd: '{{WT}}',
        agent_sandbox: 'read-only',
        commit_policy: 'wrapper',
        timeout_sec: null,
        capture: {
          kind: 'stdout_json',
          final_message_path: 'raw/internal/review-queue/{{RUN_ID}}/{{REVIEWER}}.final.md',
          stdout_path: 'stdout',
          stderr_path: 'stderr',
          rc_path: 'rc',
        },
        expected_artifact: {
          path: '{{REVIEWS_ROOT}}/{{ITEM}}/{{ROUND}}/{{REVIEWER}}.md',
          schema_ref: 'tools/review-queue/schemas/reviewer.schema.json',
        },
      },
    ],
  };
}

function gateWithProtectedBinding(reviewer: 'codex' | 'codex-ops', argv: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'echo-rq-087b-protected-argv-'));
  const bindings = join(dir, `${reviewer}.json`);
  writeFileSync(bindings, JSON.stringify(protectedReviewerBindingConfig(reviewer, argv), null, 2));
  const result = gateBuffer(['--print', 'argv_nul'], {
    REVIEWER_NAME: reviewer,
    WT: '/tmp/wt',
    ECHO_REVIEWER_BINDINGS_CONFIG: bindings,
  });
  rmSync(dir, { recursive: true, force: true });
  return result;
}

function gateWithMutatedDefaultProtectedBinding(reviewer: 'codex' | 'codex-ops', argv: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'echo-rq-087b-default-bindings-'));
  const toolDir = join(dir, 'review-queue');
  cpSync(join(REPO, 'tools/review-queue'), toolDir, { recursive: true });
  rmSync(join(toolDir, '__pycache__'), { recursive: true, force: true });

  const tempBindingsPath = join(toolDir, 'reviewer-bindings.json');
  const cfg = readJson<ReviewerBindingsConfig>(tempBindingsPath);
  const entry = cfg.bindings.find((b) => b.reviewer === reviewer);
  if (!entry) throw new Error(`binding not found for ${reviewer}`);
  entry.argv = argv;
  writeFileSync(tempBindingsPath, `${JSON.stringify(cfg, null, 2)}\n`);

  const env: NodeJS.ProcessEnv = { ...process.env, REVIEWER_NAME: reviewer, WT: '/tmp/wt' };
  delete env.ECHO_REVIEWER_BINDINGS_CONFIG;
  delete env.ECHO_REVIEWERS_CONFIG;
  const result = spawnSync('python3', [join(toolDir, '_reviewer_gate.py'), '--print', 'argv_nul'], {
    cwd: REPO,
    env,
  });
  rmSync(dir, { recursive: true, force: true });
  return result;
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

  it('records codex and codex-ops as read-only children with wrapper-owned commit', () => {
    for (const slug of ['codex', 'codex-ops']) {
      const b = binding(slug);
      expect(b.agent_sandbox).toBe('read-only');
      expect(b.commit_policy).toBe('wrapper');
      expect(b.capture.kind).toBe('stdout_json');
      expect(b.capture.final_message_path).toBe(
        'raw/internal/review-queue/{{RUN_ID}}/{{REVIEWER}}.final.md',
      );
      expect(b.argv).toEqual([
        'codex',
        'exec',
        '-C',
        '{{WT}}',
        '--sandbox',
        'read-only',
        '--json',
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
    expect(binding('claude').argv).toEqual([
      'claude',
      '--model',
      'fable',
      '--dangerously-skip-permissions',
      '-p',
    ]);
  });

  it('resolves codex and codex-ops to read-only argv while pinning claude to fable', () => {
    expect(legacyReviewer('codex').invoke_command).toBe(
      'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
    );
    expect(legacyReviewer('codex-ops').invoke_command).toBe(
      'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
    );
    expect(legacyReviewer('claude').invoke_command).toBe(
      'claude --model fable --dangerously-skip-permissions -p < {{PROMPT}}',
    );

    const wt = '/tmp/echo wt';
    const codexArgv = ['codex', 'exec', '-C', wt, '--sandbox', 'read-only', '--json', '-'];
    for (const slug of ['codex', 'codex-ops']) {
      const r = gateBuffer(['--print', 'argv_nul'], { REVIEWER_NAME: slug, WT: wt });
      expect(r.status, r.stderr.toString()).toBe(0);
      expect(parseNulDelimited(r.stdout as Buffer)).toEqual(codexArgv);
      const sandbox = gateText(['--print', 'agent_sandbox'], { REVIEWER_NAME: slug, WT: wt });
      expect(sandbox.stdout.trim()).toBe('read-only');
      const policy = gateText(['--print', 'commit_policy'], { REVIEWER_NAME: slug, WT: wt });
      expect(policy.stdout.trim()).toBe('wrapper');
    }

    const claude = gateBuffer(['--print', 'argv_nul'], { REVIEWER_NAME: 'claude', WT: wt });
    expect(claude.status, claude.stderr.toString()).toBe(0);
    expect(parseNulDelimited(claude.stdout as Buffer)).toEqual([
      'claude',
      '--model',
      'fable',
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
                argv: ['codex', 'exec', '-C', '{{WT}}', '--sandbox', 'read-only', '--json', '-'],
                stdin_from: 'binding-owned/prompt.md',
                cwd: '{{WT}}',
                agent_sandbox: 'read-only',
                commit_policy: 'wrapper',
                timeout_sec: null,
                capture: {
                  kind: 'stdout_json',
                  final_message_path: 'raw/internal/review-queue/{{RUN_ID}}/{{REVIEWER}}.final.md',
                  stdout_path: 'stdout',
                  stderr_path: 'stderr',
                  rc_path: 'rc',
                },
                expected_artifact: {
                  path: '{{REVIEWS_ROOT}}/{{ITEM}}/{{ROUND}}/{{REVIEWER}}.md',
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

  it.each(['codex', 'codex-ops'] as const)(
    'allows the exact canonical protected argv for %s',
    (reviewer) => {
      const r = gateWithProtectedBinding(reviewer, canonicalProtectedArgv);
      expect(r.status, r.stderr.toString()).toBe(0);
      expect(parseNulDelimited(r.stdout as Buffer)).toEqual([
        'codex',
        'exec',
        '-C',
        '/tmp/wt',
        '--sandbox',
        'read-only',
        '--json',
        '-',
      ]);
    },
  );

  it.each(nonCanonicalProtectedArgvCases)(
    'rejects protected reviewer non-canonical argv: %s',
    (_label, argv) => {
      for (const reviewer of ['codex', 'codex-ops'] as const) {
        const r = gateWithProtectedBinding(reviewer, argv);
        expect(r.status).not.toBe(0);
        expect(r.stderr.toString()).toMatch(/gate-owned read-only template/);
        expect((r.stdout as Buffer).length).toBe(0);
      }
    },
  );

  it.each(poisonedDefaultProtectedArgvCases)(
    'rejects poisoned default reviewer-bindings.json for protected reviewers: %s',
    (_label, argv) => {
      for (const reviewer of ['codex', 'codex-ops'] as const) {
        const r = gateWithMutatedDefaultProtectedBinding(reviewer, argv);
        expect(r.status).not.toBe(0);
        expect(r.stderr.toString()).toMatch(
          /canonical reviewer-bindings\.json: 'codex(?:-ops)?' protected argv must match gate-owned read-only template/,
        );
        expect((r.stdout as Buffer).length).toBe(0);
      }
    },
  );

  it('runtime scripts use argv_nul and no removed shell-string dispatch seam', () => {
    const runner = readFileSync(runReviewerPath, 'utf-8');
    const installer = readFileSync(installerPath, 'utf-8');

    expect(runner).toContain('--print argv_nul');
    expect(runner).toContain('--print commit_policy');
    expect(runner).toContain('gate_rc=$?');
    expect(runner).toContain('[ ! -s "$argv_file" ]');
    expect(runner).toContain('commit_policy=wrapper');
    expect(runner).toContain('capture.kind=stdout_json');
    expect(runner).toContain('commit-reviewer-response.sh');
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
