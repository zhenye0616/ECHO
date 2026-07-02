import { describe, expect, it } from 'vitest';

import {
  extractIntakeFields,
  runIntakeBrain,
} from '../../src/surfaces/ceo-slack-responder/brain.js';
import { renderIssueTitle } from '../../src/surfaces/ceo-slack-responder/issue-render.js';

describe('numbered follow-up reply parsing', () => {
  it('captures a single-question reply even when the text contains a prose "N." token', () => {
    const fields = extractIntakeFields(
      "We promised Acme the fix by July 3. It's blocking their launch.",
      { expectedFollowupFields: ['why'], inferRequest: false },
    );

    expect(fields.why).toBe("We promised Acme the fix by July 3. It's blocking their launch.");
  });

  it('does not split a numbered answer at a mid-sentence "N." token', () => {
    const fields = extractIntakeFields(
      '1. We promised the fix by June 2. Client demo is blocked',
      { expectedFollowupFields: ['why', 'clientOutcome'], inferRequest: false },
    );

    expect(fields.why).toBe('We promised the fix by June 2. Client demo is blocked');
    expect(fields.clientOutcome).toBeUndefined();
  });

  it('ignores mid-sentence "N)" chatter that is not a numbered answer', () => {
    const fields = extractIntakeFields('we discussed this at standup, option 2) works for me', {
      expectedFollowupFields: ['why', 'clientOutcome', 'evidence', 'doneWhen'],
      inferRequest: false,
    });

    expect(fields.clientOutcome).toBeUndefined();
  });

  it('does not map a prose ordinal beyond the two questions actually asked', () => {
    const fields = extractIntakeFields('aim for June 5. maybe sooner', {
      expectedFollowupFields: ['why', 'clientOutcome', 'evidence', 'doneWhen', 'urgency'],
      inferRequest: false,
    });

    expect(fields.urgency).toBeUndefined();
  });

  it('treats "1. 2. answer" as an answer to question 2, not question 1', () => {
    const fields = extractIntakeFields('1. 2. fixed already', {
      expectedFollowupFields: ['why', 'clientOutcome'],
      inferRequest: false,
    });

    expect(fields.clientOutcome).toBe('fixed already');
    expect(fields.why).toBeUndefined();
  });

  it('routes a labeled answer inside a numbered reply to the labeled field', () => {
    const fields = extractIntakeFields('1. urgency: high\n2. done when: alerts ship', {
      expectedFollowupFields: ['why', 'clientOutcome'],
      inferRequest: false,
    });

    expect(fields.urgency).toBe('high');
    expect(fields.doneWhen).toBe('alerts ship');
    expect(fields.why).toBeUndefined();
    expect(fields.clientOutcome).toBeUndefined();
  });

  it('does not fill the expected field from a reply that labels a different field', () => {
    const fields = extractIntakeFields('urgency: high', {
      expectedFollowupFields: ['why'],
      inferRequest: false,
    });

    expect(fields.urgency).toBe('high');
    expect(fields.why).toBeUndefined();
  });
});

describe('request inference', () => {
  it('recovers the real request when the meta ask and the request share a colon sentence', () => {
    const result = runIntakeBrain(
      'Can you file a linear ticket for this: search results show deleted items',
    );

    expect(result.fields.request).toBe('search results show deleted items');
  });

  it('skips a meta Linear ask sentence whose modal verb follows the keyword', () => {
    const result = runIntakeBrain('File this in Linear please. Login is broken.');

    expect(result.fields.request).toBe('Login is broken.');
  });

  it('still infers a request when prose contains multiple date-like tokens', () => {
    const result = runIntakeBrain(
      'Ship the login fix by June 2. Acme launch is on July 3. It keeps failing.',
    );

    expect(result.fields.request).toBe('Ship the login fix by June 2.');
  });
});

describe('issue rendering bounds', () => {
  it('bounds the Linear issue title below the 255-char API limit', () => {
    const title = renderIssueTitle({
      clientProject: 'claudia',
      request: 'add export receipts to the billing page '.repeat(12),
      why: 'audit proof',
      clientOutcome: 'operators can show delivery proof',
      evidence: 'current exports have no receipt',
      doneWhen: 'a receipt appears after export',
      urgency: 'high',
      clientFacing: 'yes',
    });

    expect(title.length).toBeLessThanOrEqual(255);
    expect(title.trim()).not.toBe('');
  });
});

describe('pinned behavior for untested branches', () => {
  it('prefers a contentful sentence over a known-project-only line', () => {
    const result = runIntakeBrain('Claudia\nAdd export receipts to the billing page.', {
      knownProjectNames: ['claudia'],
    });

    expect(result.fields.request).toBe('Add export receipts to the billing page.');
  });

  it('infers no request from an urgency-only message', () => {
    const result = runIntakeBrain('urgent');

    expect(result.fields.request).toBeUndefined();
    expect(result.missing).toContain('request');
  });

  it('assigns a plain unnumbered reply to the single expected field', () => {
    const fields = extractIntakeFields('a receipt appears after export', {
      expectedFollowupFields: ['doneWhen'],
      inferRequest: false,
    });

    expect(fields.doneWhen).toBe('a receipt appears after export');
  });

  it('strips a matching field label inside a numbered answer but keeps unknown labels', () => {
    const stripped = extractIntakeFields('1. Why: compliance needs it', {
      expectedFollowupFields: ['why'],
      inferRequest: false,
    });
    const kept = extractIntakeFields('1. Note: keep the old export', {
      expectedFollowupFields: ['why'],
      inferRequest: false,
    });

    expect(stripped.why).toBe('compliance needs it');
    expect(kept.why).toBe('Note: keep the old export');
  });
});
