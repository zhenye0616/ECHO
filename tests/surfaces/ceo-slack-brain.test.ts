import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  BRAIN_REGISTRY,
  buildBrainPrompt,
  parseCodexJsonFinalMessage,
  preflightBrain,
  resolveBrainInvocation,
  runBrain,
  runIntakeBrain,
  type BrainRegistry,
} from '../../src/surfaces/ceo-slack-responder/brain.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ceo-slack-responder brain', () => {
  it('resolves codex argv with scoped cwd, read-only sandbox, and JSON capture', () => {
    const invocation = resolveBrainInvocation('why observability?', {
      brain: 'codex',
      contextRepoPath: '/Users/zhenye/justinian.ai',
      timeoutMs: 180000,
    });

    expect(invocation.argv).toEqual([
      'codex',
      'exec',
      '-C',
      '/Users/zhenye/justinian.ai',
      '--sandbox',
      'read-only',
      '--json',
      '-',
    ]);
    expect(invocation.cwd).toBe('/Users/zhenye/justinian.ai');
    expect(invocation.capture).toBe('stdout-json');
    expect(invocation.prompt).toContain('repo_path exactly "/Users/zhenye/justinian.ai"');
  });

  it('builds the same scoped prompt for swappable codex and claude brains', () => {
    const scope = '/Users/zhenye/justinian.ai';
    const codex = resolveBrainInvocation('why JUS-17?', {
      brain: 'codex',
      contextRepoPath: scope,
      timeoutMs: 180000,
    });
    const claude = resolveBrainInvocation('why JUS-17?', {
      brain: 'claude',
      contextRepoPath: scope,
      timeoutMs: 180000,
    });

    expect(codex.prompt).toBe(claude.prompt);
    expect(claude.argv).toEqual(['claude', '--dangerously-skip-permissions', '-p']);
    expect(claude.capture).toBe('stdout-text');
  });

  it('parses the last assistant message from codex JSONL stdout', () => {
    const stdout = [
      JSON.stringify({ type: 'system', message: 'start' }),
      JSON.stringify({ type: 'assistant_message', message: 'first answer' }),
      JSON.stringify({ item: { role: 'assistant', content: [{ text: 'final answer' }] } }),
    ].join('\n');

    expect(parseCodexJsonFinalMessage(stdout)).toBe('final answer');
  });

  it('runs a codex-shaped brain and captures JSON final answer', async () => {
    const dir = await tempDir();
    const script = await writeStub(dir, 'json-brain.mjs', [
      'process.stdin.resume();',
      "process.stdin.on('end', () => {",
      "  console.log(JSON.stringify({ type: 'assistant_message', message: 'A CEO-grade why.' }));",
      '});',
    ]);
    const registry = registryWith('codex', script, 'stdout-json');

    const result = await runBrain('why?', {
      brain: 'codex',
      contextRepoPath: dir,
      timeoutMs: 1000,
      registry,
    });

    expect(result).toMatchObject({
      ok: true,
      outcome: 'ok',
      answer: 'A CEO-grade why.',
    });
  });

  it('runs a claude-shaped brain and captures plain stdout', async () => {
    const dir = await tempDir();
    const script = await writeStub(dir, 'text-brain.mjs', [
      'process.stdin.resume();',
      "process.stdin.on('end', () => console.log('plain answer'));",
    ]);
    const registry = registryWith('claude', script, 'stdout-text');

    const result = await runBrain('why?', {
      brain: 'claude',
      contextRepoPath: dir,
      timeoutMs: 1000,
      registry,
    });

    expect(result).toMatchObject({
      ok: true,
      outcome: 'ok',
      answer: 'plain answer',
    });
  });

  it('returns error outcome for non-zero exits and empty captures', async () => {
    const dir = await tempDir();
    const failing = await writeStub(dir, 'failing.mjs', [
      "console.error('bad failure');",
      'process.exit(2);',
    ]);
    const empty = await writeStub(dir, 'empty.mjs', [
      'process.stdin.resume();',
      "process.stdin.on('end', () => undefined);",
    ]);

    await expect(
      runBrain('why?', {
        brain: 'codex',
        contextRepoPath: dir,
        timeoutMs: 1000,
        registry: registryWith('codex', failing, 'stdout-json'),
      }),
    ).resolves.toMatchObject({ ok: false, outcome: 'error', reason: 'bad failure' });

    await expect(
      runBrain('why?', {
        brain: 'claude',
        contextRepoPath: dir,
        timeoutMs: 1000,
        registry: registryWith('claude', empty, 'stdout-text'),
      }),
    ).resolves.toMatchObject({ ok: false, outcome: 'error', reason: 'empty final answer' });
  });

  it('kills a timed-out brain process group including descendants', async () => {
    const dir = await tempDir();
    const pidPath = join(dir, 'descendant.pid');
    const script = await writeStub(dir, 'fork-descendant.mjs', [
      "import { spawn } from 'node:child_process';",
      "import { writeFileSync } from 'node:fs';",
      `const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });`,
      `writeFileSync(${JSON.stringify(pidPath)}, String(child.pid));`,
      'setInterval(() => {}, 1000);',
    ]);

    const result = await runBrain('why?', {
      brain: 'codex',
      contextRepoPath: dir,
      timeoutMs: 200,
      killGraceMs: 50,
      registry: registryWith('codex', script, 'stdout-json'),
    });

    expect(result).toMatchObject({ ok: false, outcome: 'timeout' });
    const descendantPid = Number.parseInt(await readFile(pidPath, 'utf8'), 10);
    await wait(250);
    expect(pidIsAlive(descendantPid)).toBe(false);
  });

  it('preflights the selected brain executable with a version-style probe', async () => {
    const dir = await tempDir();
    const script = await writeStub(dir, 'version.mjs', ["console.log('fake 1.0.0');"]);

    await expect(
      preflightBrain('codex', process.env, registryWith('codex', script, 'stdout-json')),
    ).resolves.toBeUndefined();
  });

  it('keeps prompt scope explicit and final-answer-only', () => {
    const prompt = buildBrainPrompt('why?', '/Users/zhenye/justinian.ai');

    expect(prompt).toContain('Scope repo path: /Users/zhenye/justinian.ai');
    expect(prompt).toContain('Return only the final Slack-ready answer.');
    expect(prompt).toContain('Question: why?');
  });

  it('infers the real request after a meta Linear issue ask', () => {
    const result = runIntakeBrain(
      ['Can you make a Linear issue for this?', 'Claudia needs real-time amendment alerts.'].join(
        '\n',
      ),
      { knownProjectNames: ['claudia'] },
    );

    expect(result.fields).toMatchObject({
      clientProject: 'claudia',
      request: 'Claudia needs real-time amendment alerts.',
    });
  });

  it('maps numbered follow-up replies to the expected missing fields', () => {
    const result = runIntakeBrain(
      ['1. compliance reviewers need fast amendment visibility', '2. users see changed text'].join(
        '\n',
      ),
      {
        knownProjectNames: ['claudia'],
        expectedFollowupFields: ['why', 'clientOutcome'],
        inferRequest: false,
      },
    );

    expect(result.fields).toEqual({
      why: 'compliance reviewers need fast amendment visibility',
      clientOutcome: 'users see changed text',
    });
  });

  it('parses inline numbered answers when the reply opens with a 1. marker', () => {
    const result = runIntakeBrain(
      '1. claudia 2. hard to evaluate the quality of llm output if content length are inconsistent',
      {
        knownProjectNames: ['claudia'],
        expectedFollowupFields: ['clientProject', 'why'],
        inferRequest: false,
      },
    );

    expect(result.fields).toMatchObject({
      clientProject: 'claudia',
      why: 'hard to evaluate the quality of llm output if content length are inconsistent',
    });
  });

  it('does not treat month-day prose digits as list markers', () => {
    const result = runIntakeBrain('we need this shipped by June 2. the client demo depends on it', {
      expectedFollowupFields: ['why'],
      inferRequest: false,
    });

    expect(result.fields).toEqual({
      why: 'we need this shipped by June 2. the client demo depends on it',
    });
  });

  it('detects adjacent markers so a skipped question does not swallow the next answer', () => {
    const result = runIntakeBrain('1. 2. users see changed text', {
      expectedFollowupFields: ['why', 'clientOutcome'],
      inferRequest: false,
    });

    expect(result.fields).toEqual({ clientOutcome: 'users see changed text' });
  });

  it('assigns a labeled answer to the labeled field instead of the asked field', () => {
    const result = runIntakeBrain('urgency: high', {
      expectedFollowupFields: ['why'],
      inferRequest: false,
    });

    expect(result.fields).toEqual({ urgency: 'high' });
  });

  it('keeps the substantive remainder of a meta ask carrying a colon', () => {
    const result = runIntakeBrain(
      'Can you file a ticket for this: exports lose receipts on retry.',
      {
        knownProjectNames: ['claudia'],
      },
    );

    expect(result.fields).toMatchObject({ request: 'exports lose receipts on retry.' });
  });

  it('filters meta asks where the politeness word follows the Linear keyword', () => {
    const result = runIntakeBrain(
      ['File this in Linear please.', 'The summary length is inconsistent across cards.'].join(
        '\n',
      ),
      { knownProjectNames: ['claudia'] },
    );

    expect(result.fields).toMatchObject({
      request: 'The summary length is inconsistent across cards.',
    });
  });

  it('does not let prose dates suppress request inference', () => {
    const result = runIntakeBrain(
      'Claudia needs the export fixed by June 2. Demo on July 3. is at risk.',
      {
        knownProjectNames: ['claudia'],
      },
    );

    expect(result.fields).toMatchObject({
      clientProject: 'claudia',
      request: 'Claudia needs the export fixed by June 2.',
    });
  });
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-brain-test-'));
  tempDirs.push(dir);
  return dir;
}

async function writeStub(dir: string, name: string, lines: readonly string[]): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
  return path;
}

function registryWith(
  brain: 'codex' | 'claude',
  scriptPath: string,
  capture: 'stdout-json' | 'stdout-text',
): BrainRegistry {
  return {
    ...BRAIN_REGISTRY,
    [brain]: {
      executable: process.execPath,
      versionArgs: [scriptPath],
      argv: (scopeRepoPath: string) => [process.execPath, scriptPath, scopeRepoPath],
      capture,
    },
  };
}

function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
