import { parseArgs } from 'node:util';
import type { Writable } from 'node:stream';
import {
  HttpGranolaApiClient,
  pollGranolaOnce,
  resolveGranolaApiKey,
  type GranolaApiClient,
} from '../../capture/surfaces/granola-poller.js';
import { resolveDbPath } from '../../daemon/lifecycle.js';
import {
  clearGranolaSignalFailure,
  startGranolaSignalWorker,
  type GranolaSignalExtractor,
} from '../../enrich/granola-signals.js';
import {
  compilePostMeetingBrief,
  PostMeetingBriefError,
  resolvePostMeetingBriefTarget,
  writePostMeetingBriefArtifacts,
} from '../../enrich/post-meeting-brief.js';
import { SqliteStorage } from '../../storage/sqlite.js';
import type { Storage } from '../../storage/interface.js';

export const BRIEF_HELP = `Usage: echoctl brief [--note <id>] [--force] [--freshness-minutes <n>] [--out-dir <path>]

Generate a local post-meeting brief from the newest fresh Granola note, or from
an explicit note id. Writes brief-<note_id>.json and brief-<note_id>.md.`;

interface ParsedBriefArgs {
  noteId?: string;
  force: boolean;
  freshnessMs: number;
  outDir: string;
}

export interface BriefCommandOptions {
  argv: readonly string[];
  quiet?: boolean;
  stdout?: Pick<Writable, 'write'>;
  stderr?: Pick<Writable, 'write'>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  storage?: Storage;
  client?: GranolaApiClient;
  extractFn?: GranolaSignalExtractor;
  outDir?: string;
  pollCheckpointPath?: string;
  signalCheckpointPath?: string;
  configPath?: string;
}

function print(stream: Pick<Writable, 'write'>, text: string): void {
  stream.write(text.endsWith('\n') ? text : `${text}\n`);
}

function positiveNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseBriefArgs(
  argv: readonly string[],
  fallbackOutDir = process.cwd(),
): ParsedBriefArgs {
  const parsed = parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: false,
    options: {
      note: { type: 'string' },
      force: { type: 'boolean', default: false },
      'freshness-minutes': { type: 'string' },
      'out-dir': { type: 'string' },
    },
  });
  const freshnessMinutes =
    parsed.values['freshness-minutes'] === undefined
      ? 30
      : positiveNumber(parsed.values['freshness-minutes']);
  if (freshnessMinutes === null) {
    throw new Error(`${BRIEF_HELP}\ninvalid --freshness-minutes: expected a positive number`);
  }
  return {
    noteId: parsed.values.note,
    force: parsed.values.force === true,
    freshnessMs: freshnessMinutes * 60_000,
    outDir: parsed.values['out-dir'] ?? fallbackOutDir,
  };
}

function resolveClient(opts: BriefCommandOptions): GranolaApiClient {
  if (opts.client !== undefined) return opts.client;
  const key = resolveGranolaApiKey(opts.env, opts.configPath);
  if (!key.enabled) {
    throw new PostMeetingBriefError(`Granola API key ${key.reason} (${key.source})`);
  }
  return new HttpGranolaApiClient(key.apiKey, {});
}

function resolveStorage(opts: BriefCommandOptions): Storage {
  return opts.storage ?? new SqliteStorage(resolveDbPath({ env: opts.env }));
}

export async function runBrief(opts: BriefCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;
  let args: ParsedBriefArgs;
  try {
    args = parseBriefArgs(opts.argv, opts.outDir ?? process.cwd());
  } catch (err) {
    print(stderr, (err as Error).message);
    return 2;
  }

  try {
    const storage = resolveStorage(opts);
    const poll = await pollGranolaOnce(storage, resolveClient(opts), {
      checkpointPath: opts.pollCheckpointPath,
      now: () => (opts.now ?? (() => new Date()))().toISOString(),
    });
    if (poll.status !== 'ok') {
      print(
        stderr,
        `brief failed: Granola poll ${poll.status}${'reason' in poll ? ` (${poll.reason})` : ''}`,
      );
      return 1;
    }

    const target = await resolvePostMeetingBriefTarget(storage, {
      noteId: args.noteId,
      freshnessMs: args.freshnessMs,
      now: (opts.now ?? (() => new Date()))(),
    });
    if (args.force) {
      await clearGranolaSignalFailure(target.note_id, opts.signalCheckpointPath);
    }

    const worker = await startGranolaSignalWorker(storage, {
      checkpointPath: opts.signalCheckpointPath,
      runOnStart: false,
      settleMs: 0,
      maxNotesPerTick: 1,
      targetNoteId: target.note_id,
      env: opts.env,
      extractFn: opts.extractFn,
    });
    try {
      const extraction = await worker.run();
      if (extraction.status !== 'ok') {
        const reason =
          extraction.status === 'skipped'
            ? extraction.reason
            : `${extraction.reason}: ${extraction.message}`;
        print(stderr, `brief failed: extraction ${reason}`);
        return 1;
      }
    } finally {
      await worker.stop();
    }

    const brief = await compilePostMeetingBrief(storage, {
      noteId: target.note_id,
      generatedAt: (opts.now ?? (() => new Date()))().toISOString(),
    });
    const artifacts = writePostMeetingBriefArtifacts(brief, args.outDir);
    if (opts.quiet !== true) print(stdout, artifacts.markdown);
    return 0;
  } catch (err) {
    print(stderr, `brief failed: ${(err as Error).message}`);
    return 1;
  }
}
