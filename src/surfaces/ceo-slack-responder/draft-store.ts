import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  ConfirmedDecisionInput,
  DecisionSourceApp,
  TeamDecisionAtom,
} from './decision-store.js';

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

interface DraftFile {
  schema_version: 1;
  drafts: Record<string, DecisionDraft>;
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
