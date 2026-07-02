import type { IntakeFields } from './brain.js';

export interface IssueRenderInput {
  fields: Required<IntakeFields>;
  requester: string;
  slackThreadUrl: string;
  projectName: string;
  projectId: string;
  statusNote?: string;
}

export interface CreatedIssueReceiptInput {
  issueUrl: string;
  projectName: string;
  fields: Required<IntakeFields>;
}

const MAX_TITLE_LENGTH = 255;
const TITLE_TRUNCATE_TARGET = 200;
const FALLBACK_TITLE = 'Untitled intake request';

export function renderIssueTitle(fields: Required<IntakeFields>): string {
  const normalized = fields.request.trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return FALLBACK_TITLE;
  }
  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }
  const sentenceMatch = normalized.match(/^.*?[.!?](?=\s|$)/);
  if (sentenceMatch && sentenceMatch[0].length <= TITLE_TRUNCATE_TARGET) {
    return sentenceMatch[0];
  }
  const hardCut = normalized.slice(0, TITLE_TRUNCATE_TARGET);
  const lastSpace = hardCut.lastIndexOf(' ');
  const wordCut = lastSpace > 0 ? hardCut.slice(0, lastSpace) : hardCut;
  return `${wordCut.trimEnd()}…`;
}

export function renderParentDeliverableIssue(input: IssueRenderInput): string {
  const statusNote =
    input.statusNote ?? 'Intake deliverable. Needs triage/decomposition before engineering starts.';
  return [
    '## Request',
    '',
    input.fields.request,
    '',
    '## Why',
    '',
    input.fields.why,
    '',
    '## Client outcome',
    '',
    input.fields.clientOutcome,
    '',
    '## Scope',
    '',
    input.fields.request,
    '',
    '## Out of scope',
    '',
    'Implementation plan, branch, files, tests, duplicate search, and decomposition are not included in this intake issue.',
    '',
    '## Current state / evidence',
    '',
    input.fields.evidence,
    '',
    '## Done when',
    '',
    `- [ ] ${input.fields.doneWhen}`,
    '- [ ] Any required internal review path works',
    '- [ ] Any known gaps are tracked as sub-issues',
    '- [ ] Production receipt is attached if client-facing',
    '',
    '## Delivery',
    '',
    'Owner: Zhen',
    `Project: ${input.projectName}`,
    `Priority: ${input.fields.urgency}`,
    `Client-facing: ${input.fields.clientFacing}`,
    'Surface: Slack intake gate',
    'Parent:',
    'Branch:',
    'Worktree:',
    'Preview URL:',
    'Production SHA:',
    `Status note: ${statusNote}`,
    'Next action: Zhen triages Inbox, accepts/collapses/cancels, then decomposes if accepted.',
    '',
    '## Dependencies / blockers',
    '',
    'None recorded during intake.',
    '',
    '## Receipts',
    '',
    `Requester: ${input.requester}`,
    `Slack thread: ${input.slackThreadUrl}`,
    'Doc:',
    'PR:',
    'Preview deploy:',
    'Production deploy:',
    'Commit SHA:',
    'Verification:',
    `Linear project ID: ${input.projectId}`,
    '',
  ].join('\n');
}

export function formatCreatedIssueReceipt(input: CreatedIssueReceiptInput): string {
  return [
    `Created ${input.issueUrl} in ${input.projectName}, status Inbox.`,
    '',
    'I included:',
    '- request',
    '- why',
    '- client outcome',
    '- evidence',
    '- done-when',
    '- urgency',
    '- client-facing',
    '- next action for triage',
  ].join('\n');
}
