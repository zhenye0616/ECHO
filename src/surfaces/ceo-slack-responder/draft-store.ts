import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  ConfirmedDecisionInput,
  DecisionSourceApp,
  TeamDecisionAtom,
} from './decision-store.js';
import type { LinearIssueCloseResult, LinearIssueCreated } from './linear-client.js';

export type DecisionDraftStatus = 'pending' | 'confirmed' | 'dismissed';

export interface DecisionDraft {
  draft_id: string;
  subject: string;
  decision: string;
  rationale?: string;
  author: string;
  source_app: DecisionSourceApp;
  status: DecisionDraftStatus;
  created_at: string;
  updated_at: string;
  action_ts?: string;
  decision_atom_id?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  dismissed_by?: string;
  dismissed_at?: string;
}

export interface DecisionDraftInput {
  subject: string;
  decision: string;
  rationale?: string;
  author: string;
  source_app: DecisionSourceApp;
}

export interface DecisionDraftStore {
  createDraft(input: DecisionDraftInput): Promise<DecisionDraft>;
  getDraft(draftId: string): Promise<DecisionDraft | null>;
  editDraft(
    draftId: string,
    patch: Pick<DecisionDraftInput, 'subject' | 'decision'> &
      Partial<Pick<DecisionDraftInput, 'rationale'>>,
  ): Promise<DecisionDraft>;
  dismissDraft(draftId: string, dismissedBy: string, dismissedAt?: string): Promise<DecisionDraft>;
  confirmDraft(
    draftId: string,
    confirmedBy: string,
    append: (input: ConfirmedDecisionInput) => Promise<TeamDecisionAtom>,
    confirmedAt?: string,
  ): Promise<DecisionDraft>;
}

export type DecisionType = 'executable' | 'directional' | 'negative' | 'conditional';
export type ChangesetDraftStatus = 'pending' | 'applying' | 'applied' | 'dismissed';

export interface ChangesetMeetingProvenance {
  note_id: string;
  meeting_title: string;
  meeting_date?: string;
  web_url?: string;
}

export interface ChangesetCloseTarget {
  issue_id: string;
  issue_key?: string;
  title?: string;
  close_state_id: string;
}

export type ChangesetMutation =
  | {
      kind: 'create';
      title: string;
      project_id?: string;
      project_name?: string;
      assignee_id?: string;
      assignee_label?: string;
    }
  | { kind: 'close'; targets: ChangesetCloseTarget[]; needs_input?: boolean }
  | { kind: 'ledger'; reason: 'directional' | 'conditional'; tripwire?: string };

export interface ChangesetLine {
  line_id: string;
  line_key: string;
  subject: string;
  decision: string;
  decision_type: DecisionType;
  rationale?: string;
  mutation: ChangesetMutation;
  struck: boolean;
  decision_atom_id?: string;
  created_issue?: LinearIssueCreated;
  close_results?: Record<string, LinearIssueCloseResult>;
}

export interface ChangesetLineInput {
  subject: string;
  decision: string;
  decision_type: DecisionType;
  rationale?: string;
  mutation: ChangesetMutation;
}

export type ChangesetEditOp =
  | { kind: 'retitle'; line_id: string; title: string }
  | { kind: 'reassign'; line_id: string; assignee_id?: string; assignee_label?: string }
  | { kind: 'reproject'; line_id: string; project_id?: string; project_name?: string }
  | { kind: 'retype'; line_id: string; decision_type: DecisionType; mutation?: ChangesetMutation }
  | { kind: 'retarget'; line_id: string; targets: ChangesetCloseTarget[] }
  | { kind: 'strike'; line_id: string }
  | { kind: 'restore'; line_id: string }
  | { kind: 'split'; line_id: string; lines: ChangesetLineInput[] }
  | { kind: 'add'; line: ChangesetLineInput };

export interface ChangesetEditHistoryEntry {
  edit_seq: number;
  source_event_key: string;
  status: 'accepted' | 'failed';
  op?: ChangesetEditOp;
  error?: string;
  revision_before: number;
  revision_after: number;
}

export interface ChangesetDraft {
  draft_id: string;
  note_id: string;
  revision: number;
  meeting: ChangesetMeetingProvenance;
  channel_id?: string;
  thread_ts?: string;
  message_ts?: string;
  lines: ChangesetLine[];
  edit_history: ChangesetEditHistoryEntry[];
  status: ChangesetDraftStatus;
  owner_token?: string;
  lease_at?: string;
  applied_at?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChangesetDraftInput {
  note_id: string;
  meeting: Omit<ChangesetMeetingProvenance, 'note_id'>;
  lines: ChangesetLineInput[];
  channel_id?: string;
  thread_ts?: string;
}

export type ChangesetEditResult =
  | { outcome: 'accepted'; draft: ChangesetDraft; entry: ChangesetEditHistoryEntry }
  | { outcome: 'failed'; draft: ChangesetDraft; entry: ChangesetEditHistoryEntry }
  | { outcome: 'duplicate'; draft: ChangesetDraft; entry: ChangesetEditHistoryEntry };

export type BeginChangesetApplyResult =
  | { outcome: 'acquired'; draft: ChangesetDraft; owner_token: string }
  | { outcome: 'stale_revision'; draft: ChangesetDraft }
  | { outcome: 'in_progress'; draft: ChangesetDraft }
  | { outcome: 'already_applied'; draft: ChangesetDraft }
  | { outcome: 'dismissed'; draft: ChangesetDraft }
  | { outcome: 'needs_input'; draft: ChangesetDraft; line_ids: string[] };

export interface ChangesetDraftStore {
  createChangesetDraft(
    input: CreateChangesetDraftInput,
  ): Promise<{ draft: ChangesetDraft; created: boolean }>;
  getChangesetDraft(draftId: string): Promise<ChangesetDraft | null>;
  findChangesetDraftByNoteId(noteId: string): Promise<ChangesetDraft | null>;
  findChangesetDraftByThread(channelId: string, threadTs: string): Promise<ChangesetDraft | null>;
  markChangesetMessage(draftId: string, messageTs: string): Promise<ChangesetDraft>;
  applyChangesetEdit(
    draftId: string,
    sourceEventKey: string,
    op: ChangesetEditOp | null,
    failure?: string,
  ): Promise<ChangesetEditResult>;
  dismissChangesetDraft(
    draftId: string,
    dismissedBy: string,
    dismissedAt?: string,
  ): Promise<ChangesetDraft>;
  beginChangesetApply(
    draftId: string,
    revision: number,
    ownerToken: string,
    now?: string,
    staleAfterMs?: number,
  ): Promise<BeginChangesetApplyResult>;
  fenceChangesetApply(
    draftId: string,
    ownerToken: string,
    now?: string,
  ): Promise<ChangesetDraft | null>;
  recordChangesetLineAtom(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    atomId: string,
  ): Promise<ChangesetDraft>;
  recordChangesetCreate(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    issue: LinearIssueCreated,
  ): Promise<ChangesetDraft>;
  recordChangesetClose(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    issueId: string,
    result: LinearIssueCloseResult,
  ): Promise<ChangesetDraft>;
  finishChangesetApply(
    draftId: string,
    ownerToken: string,
    appliedAt?: string,
  ): Promise<ChangesetDraft>;
}

interface DraftFile {
  schema_version: 1;
  drafts: Record<string, DecisionDraft>;
  changeset_drafts?: Record<string, ChangesetDraft>;
}

export class FileDecisionDraftStore implements DecisionDraftStore {
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly filePath: string) {}

  async createDraft(input: DecisionDraftInput): Promise<DecisionDraft> {
    validateDraftInput(input);
    const now = new Date().toISOString();
    const draft: DecisionDraft = {
      draft_id: randomUUID(),
      subject: input.subject.trim(),
      decision: input.decision.trim(),
      ...(input.rationale !== undefined && input.rationale.trim() !== ''
        ? { rationale: input.rationale.trim() }
        : {}),
      author: input.author.trim(),
      source_app: input.source_app,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    const file = await this.readFile();
    file.drafts[draft.draft_id] = draft;
    await this.writeFile(file);
    return draft;
  }

  async getDraft(draftId: string): Promise<DecisionDraft | null> {
    const file = await this.readFile();
    return file.drafts[draftId] ?? null;
  }

  async editDraft(
    draftId: string,
    patch: Pick<DecisionDraftInput, 'subject' | 'decision'> &
      Partial<Pick<DecisionDraftInput, 'rationale'>>,
  ): Promise<DecisionDraft> {
    return this.withDraftLock(draftId, async () => {
      validateDraftPatch(patch);
      const file = await this.readFile();
      const draft = requireDraft(file, draftId);
      ensurePending(draft);
      const next: DecisionDraft = {
        ...draft,
        subject: patch.subject.trim(),
        decision: patch.decision.trim(),
        ...(patch.rationale !== undefined && patch.rationale.trim() !== ''
          ? { rationale: patch.rationale.trim() }
          : {}),
        updated_at: new Date().toISOString(),
      };
      if (patch.rationale !== undefined && patch.rationale.trim() === '') {
        delete next.rationale;
      }
      file.drafts[draftId] = next;
      await this.writeFile(file);
      return next;
    });
  }

  async dismissDraft(
    draftId: string,
    dismissedBy: string,
    dismissedAt = new Date().toISOString(),
  ): Promise<DecisionDraft> {
    return this.withDraftLock(draftId, async () => {
      const file = await this.readFile();
      const draft = requireDraft(file, draftId);
      if (draft.status === 'confirmed' || draft.status === 'dismissed') return draft;
      const next: DecisionDraft = {
        ...draft,
        status: 'dismissed',
        dismissed_by: requiredString(dismissedBy, 'dismissed_by'),
        dismissed_at: dismissedAt,
        action_ts: dismissedAt,
        updated_at: dismissedAt,
      };
      file.drafts[draftId] = next;
      await this.writeFile(file);
      return next;
    });
  }

  async confirmDraft(
    draftId: string,
    confirmedBy: string,
    append: (input: ConfirmedDecisionInput) => Promise<TeamDecisionAtom>,
    confirmedAt = new Date().toISOString(),
  ): Promise<DecisionDraft> {
    return this.withDraftLock(draftId, async () => {
      const file = await this.readFile();
      const draft = requireDraft(file, draftId);
      if (draft.status === 'confirmed') return draft;
      ensurePending(draft);

      const atom = await append({
        draft_id: draft.draft_id,
        subject: draft.subject,
        decision: draft.decision,
        ...(draft.rationale !== undefined ? { rationale: draft.rationale } : {}),
        author: draft.author,
        confirmed_by: requiredString(confirmedBy, 'confirmed_by'),
        confirmed_at: confirmedAt,
        source_app: draft.source_app,
      });

      const latest = await this.readFile();
      const current = requireDraft(latest, draftId);
      const next: DecisionDraft = {
        ...current,
        status: 'confirmed',
        confirmed_by: requiredString(confirmedBy, 'confirmed_by'),
        confirmed_at: confirmedAt,
        action_ts: confirmedAt,
        decision_atom_id: atom.atom_id,
        updated_at: confirmedAt,
      };
      latest.drafts[draftId] = next;
      await this.writeFile(latest);
      return next;
    });
  }

  private async withDraftLock<T>(draftId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(draftId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous
      .catch(() => undefined)
      .then(() => next)
      .then(() => undefined);
    this.locks.set(draftId, current);
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(draftId) === current) this.locks.delete(draftId);
    }
  }

  private async readFile(): Promise<DraftFile> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        return { schema_version: 1, drafts: {} };
      }
      throw err;
    }
    const parsed = JSON.parse(raw) as DraftFile;
    if (
      parsed.schema_version !== 1 ||
      typeof parsed.drafts !== 'object' ||
      parsed.drafts === null
    ) {
      throw new Error(`${this.filePath}: invalid decision draft store`);
    }
    return parsed;
  }

  private async writeFile(file: DraftFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    await rename(tmp, this.filePath);
  }
}

export class FileChangesetDraftStore implements ChangesetDraftStore {
  private readonly locks = new Map<string, Promise<void>>();
  private fileLock: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async createChangesetDraft(
    input: CreateChangesetDraftInput,
  ): Promise<{ draft: ChangesetDraft; created: boolean }> {
    return this.withFileLock(async () => {
      validateChangesetInput(input);
      const file = await this.readFile();
      const existing = Object.values(file.changeset_drafts ?? {}).find(
        (draft) => draft.note_id === input.note_id.trim(),
      );
      if (existing !== undefined) return { draft: existing, created: false };

      const now = new Date().toISOString();
      const draftId = randomUUID();
      const noteId = input.note_id.trim();
      const draft: ChangesetDraft = {
        draft_id: draftId,
        note_id: noteId,
        revision: 1,
        meeting: {
          note_id: noteId,
          meeting_title: requiredString(input.meeting.meeting_title, 'meeting_title'),
          ...(input.meeting.meeting_date === undefined
            ? {}
            : { meeting_date: requiredString(input.meeting.meeting_date, 'meeting_date') }),
          ...(input.meeting.web_url === undefined
            ? {}
            : { web_url: requiredString(input.meeting.web_url, 'web_url') }),
        },
        ...(input.channel_id === undefined
          ? {}
          : { channel_id: requiredString(input.channel_id, 'channel_id') }),
        ...(input.thread_ts === undefined
          ? {}
          : { thread_ts: requiredString(input.thread_ts, 'thread_ts') }),
        lines: input.lines.map((line, index) =>
          createChangesetLine(noteId, draftId, `c${index + 1}`, `L${index + 1}`, line),
        ),
        edit_history: [],
        status: 'pending',
        created_at: now,
        updated_at: now,
      };
      const changesets = file.changeset_drafts ?? {};
      changesets[draftId] = draft;
      file.changeset_drafts = changesets;
      await this.writeFile(file);
      return { draft, created: true };
    });
  }

  async getChangesetDraft(draftId: string): Promise<ChangesetDraft | null> {
    const file = await this.readFile();
    return file.changeset_drafts?.[draftId] ?? null;
  }

  async findChangesetDraftByNoteId(noteId: string): Promise<ChangesetDraft | null> {
    const trimmed = noteId.trim();
    if (trimmed === '') return null;
    const file = await this.readFile();
    return (
      Object.values(file.changeset_drafts ?? {}).find((draft) => draft.note_id === trimmed) ?? null
    );
  }

  async findChangesetDraftByThread(
    channelId: string,
    threadTs: string,
  ): Promise<ChangesetDraft | null> {
    const channel = channelId.trim();
    const thread = threadTs.trim();
    if (channel === '' || thread === '') return null;
    const file = await this.readFile();
    return (
      Object.values(file.changeset_drafts ?? {}).find(
        (draft) =>
          draft.channel_id === channel &&
          (draft.thread_ts === thread || draft.message_ts === thread),
      ) ?? null
    );
  }

  async markChangesetMessage(draftId: string, messageTs: string): Promise<ChangesetDraft> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireChangesetDraft(file, draftId);
        const next = {
          ...draft,
          message_ts: requiredString(messageTs, 'message_ts'),
          updated_at: new Date().toISOString(),
        };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return next;
      }),
    );
  }

  async applyChangesetEdit(
    draftId: string,
    sourceEventKey: string,
    op: ChangesetEditOp | null,
    failure?: string,
  ): Promise<ChangesetEditResult> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const sourceKey = requiredString(sourceEventKey, 'source_event_key');
        const file = await this.readFile();
        const draft = requireChangesetDraft(file, draftId);
        ensureChangesetPending(draft);
        const duplicate = draft.edit_history.find((entry) => entry.source_event_key === sourceKey);
        if (duplicate !== undefined) return { outcome: 'duplicate', draft, entry: duplicate };

        const editSeq = draft.edit_history.length + 1;
        const revisionBefore = draft.revision;
        if (op === null) {
          const entry: ChangesetEditHistoryEntry = {
            edit_seq: editSeq,
            source_event_key: sourceKey,
            status: 'failed',
            error: requiredString(failure ?? 'Could not parse changeset edit reply', 'failure'),
            revision_before: revisionBefore,
            revision_after: revisionBefore,
          };
          const next = {
            ...draft,
            edit_history: [...draft.edit_history, entry],
            updated_at: new Date().toISOString(),
          };
          putChangesetDraft(file, next);
          await this.writeFile(file);
          return { outcome: 'failed', draft: next, entry };
        }

        const lines = applyEditToLines(draft, op, editSeq);
        const entry: ChangesetEditHistoryEntry = {
          edit_seq: editSeq,
          source_event_key: sourceKey,
          status: 'accepted',
          op,
          revision_before: revisionBefore,
          revision_after: revisionBefore + 1,
        };
        const next = {
          ...draft,
          revision: revisionBefore + 1,
          lines,
          edit_history: [...draft.edit_history, entry],
          updated_at: new Date().toISOString(),
        };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return { outcome: 'accepted', draft: next, entry };
      }),
    );
  }

  async dismissChangesetDraft(
    draftId: string,
    dismissedBy: string,
    dismissedAt = new Date().toISOString(),
  ): Promise<ChangesetDraft> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireChangesetDraft(file, draftId);
        if (draft.status === 'applied' || draft.status === 'dismissed') return draft;
        const next: ChangesetDraft = {
          ...draft,
          status: 'dismissed',
          dismissed_by: requiredString(dismissedBy, 'dismissed_by'),
          dismissed_at: dismissedAt,
          updated_at: dismissedAt,
        };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return next;
      }),
    );
  }

  async beginChangesetApply(
    draftId: string,
    revision: number,
    ownerToken: string,
    now = new Date().toISOString(),
    staleAfterMs = 10 * 60 * 1000,
  ): Promise<BeginChangesetApplyResult> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireChangesetDraft(file, draftId);
        if (draft.status === 'applied') return { outcome: 'already_applied', draft };
        if (draft.status === 'dismissed') return { outcome: 'dismissed', draft };
        if (draft.status === 'applying') {
          if (!leaseIsStale(draft.lease_at, now, staleAfterMs)) {
            return { outcome: 'in_progress', draft };
          }
          const next: ChangesetDraft = {
            ...draft,
            owner_token: requiredString(ownerToken, 'owner_token'),
            lease_at: now,
            updated_at: now,
          };
          putChangesetDraft(file, next);
          await this.writeFile(file);
          return { outcome: 'acquired', draft: next, owner_token: ownerToken };
        }
        if (draft.revision !== revision) return { outcome: 'stale_revision', draft };
        const blocked = unresolvedLineIds(draft);
        if (blocked.length > 0) return { outcome: 'needs_input', draft, line_ids: blocked };
        const next: ChangesetDraft = {
          ...draft,
          status: 'applying',
          owner_token: requiredString(ownerToken, 'owner_token'),
          lease_at: now,
          updated_at: now,
        };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return { outcome: 'acquired', draft: next, owner_token: ownerToken };
      }),
    );
  }

  async fenceChangesetApply(
    draftId: string,
    ownerToken: string,
    now = new Date().toISOString(),
  ): Promise<ChangesetDraft | null> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireChangesetDraft(file, draftId);
        if (draft.status !== 'applying' || draft.owner_token !== ownerToken) return null;
        const next = { ...draft, lease_at: now, updated_at: now };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return next;
      }),
    );
  }

  async recordChangesetLineAtom(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    atomId: string,
  ): Promise<ChangesetDraft> {
    return this.updateOwnedLine(draftId, ownerToken, lineKey, (line) => ({
      ...line,
      decision_atom_id: requiredString(atomId, 'atom_id'),
    }));
  }

  async recordChangesetCreate(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    issue: LinearIssueCreated,
  ): Promise<ChangesetDraft> {
    return this.updateOwnedLine(draftId, ownerToken, lineKey, (line) => ({
      ...line,
      created_issue: issue,
    }));
  }

  async recordChangesetClose(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    issueId: string,
    result: LinearIssueCloseResult,
  ): Promise<ChangesetDraft> {
    return this.updateOwnedLine(draftId, ownerToken, lineKey, (line) => ({
      ...line,
      close_results: {
        ...(line.close_results ?? {}),
        [requiredString(issueId, 'issue_id')]: result,
      },
    }));
  }

  async finishChangesetApply(
    draftId: string,
    ownerToken: string,
    appliedAt = new Date().toISOString(),
  ): Promise<ChangesetDraft> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireOwnedApplyingDraft(file, draftId, ownerToken);
        const next: ChangesetDraft = {
          ...draft,
          status: 'applied',
          applied_at: appliedAt,
          lease_at: appliedAt,
          updated_at: appliedAt,
        };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return next;
      }),
    );
  }

  private async updateOwnedLine(
    draftId: string,
    ownerToken: string,
    lineKey: string,
    update: (line: ChangesetLine) => ChangesetLine,
  ): Promise<ChangesetDraft> {
    return this.withDraftLock(draftId, async () =>
      this.withFileLock(async () => {
        const file = await this.readFile();
        const draft = requireOwnedApplyingDraft(file, draftId, ownerToken);
        const key = requiredString(lineKey, 'line_key');
        let found = false;
        const lines = draft.lines.map((line) => {
          if (line.line_key !== key) return line;
          found = true;
          return update(line);
        });
        if (!found) throw new Error(`changeset line not found: ${key}`);
        const next = { ...draft, lines, updated_at: new Date().toISOString() };
        putChangesetDraft(file, next);
        await this.writeFile(file);
        return next;
      }),
    );
  }

  private async withDraftLock<T>(draftId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(draftId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous
      .catch(() => undefined)
      .then(() => next)
      .then(() => undefined);
    this.locks.set(draftId, current);
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(draftId) === current) this.locks.delete(draftId);
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

  private async readFile(): Promise<DraftFile> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        return { schema_version: 1, drafts: {}, changeset_drafts: {} };
      }
      throw err;
    }
    const parsed = JSON.parse(raw) as DraftFile;
    if (
      parsed.schema_version !== 1 ||
      typeof parsed.drafts !== 'object' ||
      parsed.drafts === null
    ) {
      throw new Error(`${this.filePath}: invalid decision draft store`);
    }
    if (
      parsed.changeset_drafts !== undefined &&
      (typeof parsed.changeset_drafts !== 'object' || parsed.changeset_drafts === null)
    ) {
      throw new Error(`${this.filePath}: invalid changeset draft store`);
    }
    parsed.changeset_drafts ??= {};
    return parsed;
  }

  private async writeFile(file: DraftFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    await rename(tmp, this.filePath);
  }
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function validateDraftInput(input: DecisionDraftInput): void {
  requiredString(input.subject, 'subject');
  requiredString(input.decision, 'decision');
  requiredString(input.author, 'author');
  if (input.source_app !== 'claude-code' && input.source_app !== 'codex') {
    throw new Error('source_app must be claude-code or codex');
  }
}

function validateDraftPatch(
  patch: Pick<DecisionDraftInput, 'subject' | 'decision'> &
    Partial<Pick<DecisionDraftInput, 'rationale'>>,
): void {
  requiredString(patch.subject, 'subject');
  requiredString(patch.decision, 'decision');
}

function requiredString(value: string, field: string): string {
  if (value.trim() === '') throw new Error(`${field} is required`);
  return value.trim();
}

function requireDraft(file: DraftFile, draftId: string): DecisionDraft {
  const draft = file.drafts[draftId];
  if (draft === undefined) throw new Error(`decision draft not found: ${draftId}`);
  return draft;
}

function ensurePending(draft: DecisionDraft): void {
  if (draft.status !== 'pending') {
    throw new Error(`decision draft ${draft.draft_id} is ${draft.status}`);
  }
}

function validateChangesetInput(input: CreateChangesetDraftInput): void {
  requiredString(input.note_id, 'note_id');
  requiredString(input.meeting.meeting_title, 'meeting_title');
  if (input.lines.length === 0) throw new Error('changeset draft requires at least one line');
  for (const line of input.lines) validateChangesetLineInput(line);
}

function validateChangesetLineInput(input: ChangesetLineInput): void {
  requiredString(input.subject, 'subject');
  requiredString(input.decision, 'decision');
  validateDecisionType(input.decision_type);
  validateMutation(input.mutation);
}

function validateDecisionType(value: DecisionType): void {
  if (
    value !== 'executable' &&
    value !== 'directional' &&
    value !== 'negative' &&
    value !== 'conditional'
  ) {
    throw new Error(`unsupported decision_type: ${value}`);
  }
}

function validateMutation(mutation: ChangesetMutation): void {
  if (mutation.kind === 'create') {
    requiredString(mutation.title, 'title');
    return;
  }
  if (mutation.kind === 'close') {
    for (const target of mutation.targets) {
      requiredString(target.issue_id, 'issue_id');
      requiredString(target.close_state_id, 'close_state_id');
    }
    return;
  }
  if (mutation.kind === 'ledger') {
    if (mutation.reason !== 'directional' && mutation.reason !== 'conditional') {
      throw new Error(`unsupported ledger reason: ${mutation.reason}`);
    }
    return;
  }
  mutation satisfies never;
}

function createChangesetLine(
  noteId: string,
  draftId: string,
  keySuffix: string,
  lineId: string,
  input: ChangesetLineInput,
): ChangesetLine {
  validateChangesetLineInput(input);
  return {
    line_id: lineId,
    line_key: `${noteId}:${draftId}:${keySuffix}`,
    subject: input.subject.trim(),
    decision: input.decision.trim(),
    decision_type: input.decision_type,
    ...(input.rationale === undefined || input.rationale.trim() === ''
      ? {}
      : { rationale: input.rationale.trim() }),
    mutation: compactMutation(input.mutation),
    struck: false,
  };
}

function compactMutation(mutation: ChangesetMutation): ChangesetMutation {
  if (mutation.kind === 'create') {
    return {
      kind: 'create',
      title: requiredString(mutation.title, 'title'),
      ...(mutation.project_id === undefined
        ? {}
        : { project_id: requiredString(mutation.project_id, 'project_id') }),
      ...(mutation.project_name === undefined
        ? {}
        : { project_name: requiredString(mutation.project_name, 'project_name') }),
      ...(mutation.assignee_id === undefined
        ? {}
        : { assignee_id: requiredString(mutation.assignee_id, 'assignee_id') }),
      ...(mutation.assignee_label === undefined
        ? {}
        : { assignee_label: requiredString(mutation.assignee_label, 'assignee_label') }),
    };
  }
  if (mutation.kind === 'close') {
    return {
      kind: 'close',
      targets: mutation.targets.map(compactCloseTarget),
      ...(mutation.needs_input === true ? { needs_input: true } : {}),
    };
  }
  return {
    kind: 'ledger',
    reason: mutation.reason,
    ...(mutation.tripwire === undefined || mutation.tripwire.trim() === ''
      ? {}
      : { tripwire: mutation.tripwire.trim() }),
  };
}

function compactCloseTarget(target: ChangesetCloseTarget): ChangesetCloseTarget {
  return {
    issue_id: requiredString(target.issue_id, 'issue_id'),
    ...(target.issue_key === undefined
      ? {}
      : { issue_key: requiredString(target.issue_key, 'issue_key') }),
    ...(target.title === undefined ? {} : { title: requiredString(target.title, 'title') }),
    close_state_id: requiredString(target.close_state_id, 'close_state_id'),
  };
}

function requireChangesetDraft(file: DraftFile, draftId: string): ChangesetDraft {
  const draft = file.changeset_drafts?.[draftId];
  if (draft === undefined) throw new Error(`changeset draft not found: ${draftId}`);
  return draft;
}

function requireOwnedApplyingDraft(
  file: DraftFile,
  draftId: string,
  ownerToken: string,
): ChangesetDraft {
  const draft = requireChangesetDraft(file, draftId);
  if (draft.status !== 'applying') {
    throw new Error(`changeset draft ${draftId} is ${draft.status}`);
  }
  if (draft.owner_token !== ownerToken) {
    throw new Error(`changeset draft ${draftId} owner token mismatch`);
  }
  return draft;
}

function putChangesetDraft(file: DraftFile, draft: ChangesetDraft): void {
  const changesets = file.changeset_drafts ?? {};
  changesets[draft.draft_id] = draft;
  file.changeset_drafts = changesets;
}

function ensureChangesetPending(draft: ChangesetDraft): void {
  if (draft.status !== 'pending') {
    throw new Error(`changeset draft ${draft.draft_id} is ${draft.status}`);
  }
}

function applyEditToLines(
  draft: ChangesetDraft,
  op: ChangesetEditOp,
  editSeq: number,
): ChangesetLine[] {
  if (op.kind === 'add') {
    const nextId = `L${draft.lines.length + 1}`;
    return [
      ...draft.lines,
      createChangesetLine(draft.note_id, draft.draft_id, `e${editSeq}`, nextId, op.line),
    ];
  }

  const index = draft.lines.findIndex((line) => line.line_id === op.line_id);
  if (index < 0) throw new Error(`changeset line not found: ${op.line_id}`);
  const line = draft.lines[index]!;

  if (op.kind === 'split') {
    if (op.lines.length === 0) throw new Error('split requires at least one replacement line');
    const replacement = op.lines.map((input, replacementIndex) =>
      createChangesetLine(
        draft.note_id,
        draft.draft_id,
        `e${editSeq}-${replacementIndex + 1}`,
        `L${draft.lines.length + replacementIndex + 1}`,
        input,
      ),
    );
    return [
      ...draft.lines.slice(0, index),
      { ...line, struck: true },
      ...draft.lines.slice(index + 1),
      ...replacement,
    ];
  }

  return draft.lines.map((candidate) =>
    candidate.line_id === op.line_id ? applySingleLineEdit(candidate, op) : candidate,
  );
}

function applySingleLineEdit(
  line: ChangesetLine,
  op: Exclude<ChangesetEditOp, { kind: 'add' }>,
): ChangesetLine {
  if (op.kind === 'retitle') {
    if (line.mutation.kind !== 'create') throw new Error('retitle applies only to create lines');
    return {
      ...line,
      mutation: { ...line.mutation, title: requiredString(op.title, 'title') },
    };
  }
  if (op.kind === 'reassign') {
    if (line.mutation.kind !== 'create') throw new Error('reassign applies only to create lines');
    return {
      ...line,
      mutation: {
        ...line.mutation,
        ...(op.assignee_id === undefined
          ? { assignee_id: undefined }
          : { assignee_id: requiredString(op.assignee_id, 'assignee_id') }),
        ...(op.assignee_label === undefined
          ? {}
          : { assignee_label: requiredString(op.assignee_label, 'assignee_label') }),
      },
    };
  }
  if (op.kind === 'reproject') {
    if (line.mutation.kind !== 'create') throw new Error('reproject applies only to create lines');
    return {
      ...line,
      mutation: {
        ...line.mutation,
        ...(op.project_id === undefined
          ? { project_id: undefined }
          : { project_id: requiredString(op.project_id, 'project_id') }),
        ...(op.project_name === undefined
          ? {}
          : { project_name: requiredString(op.project_name, 'project_name') }),
      },
    };
  }
  if (op.kind === 'retype') {
    validateDecisionType(op.decision_type);
    return {
      ...line,
      decision_type: op.decision_type,
      mutation:
        op.mutation === undefined
          ? defaultMutationForType(line, op.decision_type)
          : compactMutation(op.mutation),
    };
  }
  if (op.kind === 'retarget') {
    return {
      ...line,
      decision_type: 'negative',
      mutation: { kind: 'close', targets: op.targets.map(compactCloseTarget) },
    };
  }
  if (op.kind === 'strike') return { ...line, struck: true };
  if (op.kind === 'restore') return { ...line, struck: false };
  throw new Error(`unsupported single-line edit: ${op.kind}`);
}

function defaultMutationForType(
  line: ChangesetLine,
  decisionType: DecisionType,
): ChangesetMutation {
  if (decisionType === 'executable') {
    return {
      kind: 'create',
      title: line.mutation.kind === 'create' ? line.mutation.title : line.decision,
    };
  }
  if (decisionType === 'negative') return { kind: 'close', targets: [], needs_input: true };
  if (decisionType === 'conditional') return { kind: 'ledger', reason: 'conditional' };
  return { kind: 'ledger', reason: 'directional' };
}

function unresolvedLineIds(draft: ChangesetDraft): string[] {
  return draft.lines
    .filter((line) => !line.struck)
    .filter(
      (line) =>
        line.mutation.kind === 'close' &&
        (line.mutation.needs_input === true || line.mutation.targets.length === 0),
    )
    .map((line) => line.line_id);
}

function leaseIsStale(leaseAt: string | undefined, now: string, staleAfterMs: number): boolean {
  if (leaseAt === undefined) return true;
  const age = Date.parse(now) - Date.parse(leaseAt);
  return Number.isNaN(age) || age >= staleAfterMs;
}
