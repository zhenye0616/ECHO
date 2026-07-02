import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { intakeReadyFields, type IntakeFieldKey, type IntakeFields } from './brain.js';
import type { MeetingProvenance } from './intake-seed.js';
import type { LinearIssueCreated } from './linear-client.js';

export type IntakeDraftStatus =
  | 'pending'
  | 'creating'
  | 'created'
  | 'needs-reconcile'
  | 'dismissed';

export interface IntakeThreadKeyParts {
  teamId: string;
  channelId: string;
  rootTs: string;
}

export interface IntakeRequester {
  slack_user_id: string;
  label: string;
}

export interface IntakeFailureEvidence {
  at: string;
  phase: 'linear_create' | 'creating_replay';
  message: string;
}

export interface IntakeDraft {
  key: string;
  team_id: string;
  channel_id: string;
  root_ts: string;
  requester: IntakeRequester;
  fields: IntakeFields;
  asked_fields?: IntakeFieldKey[];
  project_id?: string;
  // Present only for Granola meeting-sourced seeds (item 109). Ties the draft to
  // the originating intake candidate so dismissals are attributable to the seed
  // and the created issue can carry meeting provenance.
  candidate_key?: string;
  meeting_provenance?: MeetingProvenance;
  status: IntakeDraftStatus;
  idempotency_token: string;
  slack_event_ids: string[];
  created_issue?: LinearIssueCreated;
  failure?: IntakeFailureEvidence;
  confirmed_by?: string;
  confirmed_at?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecordIntakeMessageInput {
  key: IntakeThreadKeyParts;
  requester: IntakeRequester;
  eventId: string;
  fields: IntakeFields;
  askedFields?: readonly IntakeFieldKey[];
  projectId?: string;
}

export interface RecordIntakeSeedInput {
  candidateKey: string;
  key: IntakeThreadKeyParts;
  requester: IntakeRequester;
  eventId: string;
  fields: IntakeFields;
  askedFields?: readonly IntakeFieldKey[];
  projectId?: string;
  meetingProvenance?: MeetingProvenance;
}

export type IntakeSeedOutcome = 'created' | 'duplicate_event' | 'duplicate_candidate';

export interface RecordIntakeSeedResult {
  draft: IntakeDraft;
  outcome: IntakeSeedOutcome;
}

export interface IntakeCreateContext {
  draft: IntakeDraft;
  fields: Required<IntakeFields>;
  projectId: string;
}

export type IntakeCreateResult =
  | { outcome: 'created'; draft: IntakeDraft; issue: LinearIssueCreated }
  | { outcome: 'already_created'; draft: IntakeDraft; issue: LinearIssueCreated }
  | { outcome: 'needs_reconcile'; draft: IntakeDraft }
  | { outcome: 'dismissed'; draft: IntakeDraft }
  | { outcome: 'not_ready'; draft: IntakeDraft };

export interface IntakeDraftStore {
  getDraft(key: string): Promise<IntakeDraft | null>;
  recordMessage(
    input: RecordIntakeMessageInput,
  ): Promise<{ draft: IntakeDraft; duplicate: boolean }>;
  /**
   * Durably record a Granola meeting-sourced seed (item 109). Exactly-once draft
   * per candidate key: a second seed carrying an already-seen candidate key is a
   * no-op (`duplicate_candidate`); a redelivered Slack event is a no-op
   * (`duplicate_event`). The candidate key and event id are written in the same
   * durable file write as the draft, so the event-id handled marking lands
   * atomically-with the draft creation — never before it.
   */
  recordSeed(input: RecordIntakeSeedInput): Promise<RecordIntakeSeedResult>;
  runCreateOnce(
    key: string,
    confirmedBy: string,
    create: (context: IntakeCreateContext) => Promise<LinearIssueCreated>,
    confirmedAt?: string,
  ): Promise<IntakeCreateResult>;
  dismissDraft(key: string, dismissedBy: string, dismissedAt?: string): Promise<IntakeDraft>;
}

interface IntakeDraftFile {
  schema_version: 1;
  drafts: Record<string, IntakeDraft>;
}

export class FileIntakeDraftStore implements IntakeDraftStore {
  private readonly locks = new Map<string, Promise<void>>();
  private fileLock: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async getDraft(key: string): Promise<IntakeDraft | null> {
    const file = await this.readFile();
    return file.drafts[key] ?? null;
  }

  async recordMessage(
    input: RecordIntakeMessageInput,
  ): Promise<{ draft: IntakeDraft; duplicate: boolean }> {
    const key = intakeThreadKey(input.key);
    return this.withDraftLock(key, async () => {
      return this.withFileLock(async () => {
        const eventId = requiredString(input.eventId, 'event_id');
        const file = await this.readFile();
        const existing = file.drafts[key];
        if (existing !== undefined && existing.slack_event_ids.includes(eventId)) {
          return { draft: existing, duplicate: true };
        }
        const now = new Date().toISOString();
        const draft =
          existing ??
          createDraft({
            keyParts: input.key,
            requester: input.requester,
            key,
            now,
          });
        const next: IntakeDraft = {
          ...draft,
          requester: draft.requester,
          fields: compactFields({ ...draft.fields, ...input.fields }),
          slack_event_ids: [...draft.slack_event_ids, eventId],
          ...(input.askedFields !== undefined ? { asked_fields: [...input.askedFields] } : {}),
          ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
          updated_at: now,
        };
        file.drafts[key] = next;
        await this.writeFile(file);
        return { draft: next, duplicate: false };
      });
    });
  }

  async recordSeed(input: RecordIntakeSeedInput): Promise<RecordIntakeSeedResult> {
    const candidateKey = requiredString(input.candidateKey, 'candidate_key');
    const key = intakeThreadKey(input.key);
    return this.withDraftLock(key, async () => {
      return this.withFileLock(async () => {
        const eventId = requiredString(input.eventId, 'event_id');
        const file = await this.readFile();

        // Candidate-key dedupe — exactly-once draft per candidate. A duplicate
        // seed (different thread/event, same candidate) never creates a second
        // draft; we still record its event id so a later redelivery is a no-op.
        const existingByCandidate = Object.values(file.drafts).find(
          (draft) => draft.candidate_key === candidateKey,
        );
        if (existingByCandidate !== undefined) {
          if (existingByCandidate.slack_event_ids.includes(eventId)) {
            return { draft: existingByCandidate, outcome: 'duplicate_event' };
          }
          const now = new Date().toISOString();
          const next: IntakeDraft = {
            ...existingByCandidate,
            slack_event_ids: [...existingByCandidate.slack_event_ids, eventId],
            updated_at: now,
          };
          file.drafts[existingByCandidate.key] = next;
          await this.writeFile(file);
          return { draft: next, outcome: 'duplicate_candidate' };
        }

        // Event-id dedupe on the thread key (a redelivered first seed).
        const existing = file.drafts[key];
        if (existing !== undefined && existing.slack_event_ids.includes(eventId)) {
          return { draft: existing, outcome: 'duplicate_event' };
        }

        const now = new Date().toISOString();
        const base =
          existing ??
          createDraft({ keyParts: input.key, requester: input.requester, key, now });
        const next: IntakeDraft = {
          ...base,
          candidate_key: candidateKey,
          fields: compactFields({ ...base.fields, ...input.fields }),
          slack_event_ids: [...base.slack_event_ids, eventId],
          ...(input.askedFields !== undefined ? { asked_fields: [...input.askedFields] } : {}),
          ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
          ...(input.meetingProvenance !== undefined
            ? { meeting_provenance: input.meetingProvenance }
            : {}),
          updated_at: now,
        };
        file.drafts[key] = next;
        await this.writeFile(file);
        return { draft: next, outcome: 'created' };
      });
    });
  }

  async runCreateOnce(
    key: string,
    confirmedBy: string,
    create: (context: IntakeCreateContext) => Promise<LinearIssueCreated>,
    confirmedAt = new Date().toISOString(),
  ): Promise<IntakeCreateResult> {
    return this.withDraftLock(key, async () => {
      const transition = await this.withFileLock(
        async (): Promise<
          | IntakeCreateResult
          | {
              outcome: 'ready_to_create';
              draft: IntakeDraft;
              fields: Required<IntakeFields>;
              projectId: string;
            }
        > => {
          const file = await this.readFile();
          const draft = requireDraft(file, key);
          if (draft.status === 'created' && draft.created_issue !== undefined) {
            return { outcome: 'already_created', draft, issue: draft.created_issue };
          }
          if (draft.status === 'dismissed') return { outcome: 'dismissed', draft };
          if (draft.status === 'needs-reconcile') return { outcome: 'needs_reconcile', draft };
          if (draft.status === 'creating') {
            const next = withFailure(draft, {
              at: confirmedAt,
              phase: 'creating_replay',
              message:
                'Prior Linear create outcome is uncertain; no second create attempted. Manual reconciliation required.',
            });
            file.drafts[key] = next;
            await this.writeFile(file);
            return { outcome: 'needs_reconcile', draft: next };
          }

          const readyFields = intakeReadyFields(draft.fields);
          if (
            readyFields === null ||
            draft.project_id === undefined ||
            draft.project_id.trim() === ''
          ) {
            return { outcome: 'not_ready', draft };
          }

          const projectId = draft.project_id.trim();
          const creating: IntakeDraft = {
            ...draft,
            status: 'creating',
            confirmed_by: requiredString(confirmedBy, 'confirmed_by'),
            confirmed_at: confirmedAt,
            updated_at: confirmedAt,
          };
          file.drafts[key] = creating;
          await this.writeFile(file);
          return {
            outcome: 'ready_to_create',
            draft: creating,
            fields: readyFields,
            projectId,
          };
        },
      );

      if (transition.outcome !== 'ready_to_create') return transition;

      try {
        const issue = await create({
          draft: transition.draft,
          fields: transition.fields,
          projectId: transition.projectId,
        });
        return await this.withFileLock(async () => {
          const latest = await this.readFile();
          const current = requireDraft(latest, key);
          const created: IntakeDraft = {
            ...current,
            status: 'created',
            created_issue: issue,
            updated_at: new Date().toISOString(),
          };
          latest.drafts[key] = created;
          await this.writeFile(latest);
          return { outcome: 'created', draft: created, issue };
        });
      } catch (err) {
        return await this.withFileLock(async () => {
          const latest = await this.readFile();
          const current = requireDraft(latest, key);
          const failed = withFailure(current, {
            at: new Date().toISOString(),
            phase: 'linear_create',
            message: err instanceof Error ? err.message : String(err),
          });
          latest.drafts[key] = failed;
          await this.writeFile(latest);
          return { outcome: 'needs_reconcile', draft: failed };
        });
      }
    });
  }

  async dismissDraft(
    key: string,
    dismissedBy: string,
    dismissedAt = new Date().toISOString(),
  ): Promise<IntakeDraft> {
    return this.withDraftLock(key, async () => {
      return this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireDraft(file, key);
        if (draft.status === 'created' || draft.status === 'dismissed') return draft;
        const next: IntakeDraft = {
          ...draft,
          status: 'dismissed',
          dismissed_by: requiredString(dismissedBy, 'dismissed_by'),
          dismissed_at: dismissedAt,
          updated_at: dismissedAt,
        };
        file.drafts[key] = next;
        await this.writeFile(file);
        return next;
      });
    });
  }

  private async withDraftLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous
      .catch(() => undefined)
      .then(() => next)
      .then(() => undefined);
    this.locks.set(key, current);
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }

  private async withFileLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.fileLock;
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous
      .catch(() => undefined)
      .then(() => next)
      .then(() => undefined);
    this.fileLock = current;
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.fileLock === current) this.fileLock = Promise.resolve();
    }
  }

  private async readFile(): Promise<IntakeDraftFile> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        return { schema_version: 1, drafts: {} };
      }
      throw err;
    }
    const parsed = JSON.parse(raw) as IntakeDraftFile;
    if (
      parsed.schema_version !== 1 ||
      typeof parsed.drafts !== 'object' ||
      parsed.drafts === null
    ) {
      throw new Error(`${this.filePath}: invalid intake draft store`);
    }
    return parsed;
  }

  private async writeFile(file: IntakeDraftFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    await rename(tmp, this.filePath);
  }
}

export function intakeThreadKey(key: IntakeThreadKeyParts): string {
  return [
    requiredString(key.teamId, 'team_id'),
    requiredString(key.channelId, 'channel_id'),
    requiredString(key.rootTs, 'root_ts'),
  ].join(':');
}

export function intakeIdempotencyToken(key: string): string {
  return `linear-intake:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
}

function createDraft(input: {
  keyParts: IntakeThreadKeyParts;
  requester: IntakeRequester;
  key: string;
  now: string;
}): IntakeDraft {
  return {
    key: input.key,
    team_id: requiredString(input.keyParts.teamId, 'team_id'),
    channel_id: requiredString(input.keyParts.channelId, 'channel_id'),
    root_ts: requiredString(input.keyParts.rootTs, 'root_ts'),
    requester: {
      slack_user_id: requiredString(input.requester.slack_user_id, 'requester.slack_user_id'),
      label: requiredString(input.requester.label, 'requester.label'),
    },
    fields: {},
    status: 'pending',
    idempotency_token: `${intakeIdempotencyToken(input.key)}:${randomUUID()}`,
    slack_event_ids: [],
    created_at: input.now,
    updated_at: input.now,
  };
}

function compactFields(fields: IntakeFields): IntakeFields {
  const out: IntakeFields = {};
  for (const [key, value] of Object.entries(fields) as Array<
    [keyof IntakeFields, string | undefined]
  >) {
    if (value !== undefined && value.trim() !== '') out[key] = value.trim();
  }
  return out;
}

function withFailure(draft: IntakeDraft, failure: IntakeFailureEvidence): IntakeDraft {
  return {
    ...draft,
    status: 'needs-reconcile',
    failure,
    updated_at: failure.at,
  };
}

function requireDraft(file: IntakeDraftFile, key: string): IntakeDraft {
  const draft = file.drafts[key];
  if (draft === undefined) throw new Error(`intake draft not found: ${key}`);
  return draft;
}

function requiredString(value: string | undefined, field: string): string {
  if (value === undefined || value.trim() === '') throw new Error(`${field} is required`);
  return value.trim();
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
