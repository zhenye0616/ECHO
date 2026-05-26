#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { AgentKind } from '../echo-home/wizard/detect-agents.js';
import { runDoctor } from './commands/doctor.js';
import { readPackageVersion, runInit } from './commands/init.js';
import { runRun } from './commands/run.js';
import { runUninstall } from './commands/uninstall.js';

interface GlobalOpts {
  json: boolean;
  quiet: boolean;
  color: boolean;
}

const HELP = `Usage: echoctl [--json] [--quiet] [--no-color] <command>

Commands:
  init        Onboard ECHO into local AI clients
  doctor      Check daemon, state, adapter, and agent health
  uninstall   Remove ECHO adapter writes
  run         Run a workflow from ~/.echo/workflows
`;

const COMMAND_HELP: Record<string, string> = {
  init: 'Usage: echoctl init [--json] [--quiet]',
  doctor: 'Usage: echoctl doctor [--json] [--quiet]',
  uninstall: 'Usage: echoctl uninstall [--yes] [--purge-state] [--force-purge] [--json] [--quiet]',
  run: 'Usage: echoctl run <workflow> [--project <path>] [--agent <role>=<agent>] [--json] [--quiet]',
};

function peelGlobal(argv: readonly string[]): { globals: GlobalOpts; rest: string[] } {
  const rest: string[] = [];
  const globalTokens: string[] = [];
  for (const token of argv) {
    if (token === '--json' || token === '--quiet' || token === '--no-color')
      globalTokens.push(token);
    else rest.push(token);
  }
  const parsed = parseArgs({
    args: globalTokens,
    strict: true,
    allowPositionals: false,
    options: {
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
      'no-color': { type: 'boolean', default: false },
    },
  });
  return {
    globals: {
      json: parsed.values.json === true,
      quiet: parsed.values.quiet === true,
      color:
        process.stdout.isTTY === true &&
        process.env['NO_COLOR'] === undefined &&
        parsed.values['no-color'] !== true,
    },
    rest,
  };
}

function print(stream: Pick<NodeJS.WritableStream, 'write'>, text: string): void {
  stream.write(text.endsWith('\n') ? text : `${text}\n`);
}

function parseAgentOverride(value: string): [string, AgentKind] {
  const [role, agent, extra] = value.split('=');
  if (role === undefined || agent === undefined || extra !== undefined || role.length === 0) {
    throw new Error(`invalid --agent override: ${value}`);
  }
  if (agent !== 'codex' && agent !== 'claude-code' && agent !== 'cursor') {
    throw new Error(`invalid --agent kind: ${agent}`);
  }
  return [role, agent];
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const { globals, rest } = peelGlobal(argv);
    if (rest.length === 0 || rest[0] === '--help' || rest[0] === '-h') {
      print(process.stdout, HELP);
      return 0;
    }
    if (rest[0] === '--version' || rest[0] === '-v') {
      print(process.stdout, readPackageVersion());
      return 0;
    }

    const command = rest[0]!;
    const args = rest.slice(1);
    if (args.includes('--help') || args.includes('-h')) {
      print(process.stdout, COMMAND_HELP[command] ?? HELP);
      return COMMAND_HELP[command] === undefined ? 2 : 0;
    }

    if (command === 'init') {
      parseArgs({ args, strict: true, allowPositionals: false, options: {} });
      return await runInit(globals);
    }
    if (command === 'doctor') {
      parseArgs({ args, strict: true, allowPositionals: false, options: {} });
      return await runDoctor(globals);
    }
    if (command === 'uninstall') {
      const parsed = parseArgs({
        args,
        strict: true,
        allowPositionals: false,
        options: {
          yes: { type: 'boolean', default: false },
          'purge-state': { type: 'boolean', default: false },
          'force-purge': { type: 'boolean', default: false },
        },
      });
      return await runUninstall({
        ...globals,
        yes: parsed.values.yes === true,
        purgeState: parsed.values['purge-state'] === true,
        forcePurge: parsed.values['force-purge'] === true,
      });
    }
    if (command === 'run') {
      const parsed = parseArgs({
        args,
        strict: true,
        allowPositionals: true,
        options: {
          project: { type: 'string' },
          agent: { type: 'string', multiple: true, default: [] },
        },
      });
      const workflowName = parsed.positionals[0];
      if (workflowName === undefined || parsed.positionals.length > 1) {
        print(process.stderr, COMMAND_HELP.run);
        return 2;
      }
      const overrides = new Map<string, AgentKind>();
      for (const value of parsed.values.agent ?? []) {
        const [role, agent] = parseAgentOverride(value);
        overrides.set(role, agent);
      }
      return await runRun({
        ...globals,
        workflowName,
        projectFlag: parsed.values.project,
        agentOverrides: overrides,
      });
    }

    print(process.stderr, `unknown command: ${command}\n${HELP}`);
    return 2;
  } catch (err) {
    print(process.stderr, `${(err as Error).message}`);
    return 1;
  }
}

function isDirectInvocation(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}

if (isDirectInvocation()) {
  const code = await main();
  process.exitCode = code;
}
