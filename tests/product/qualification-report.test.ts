import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSanitizedChild } from '../../src/product/spawn-sanitized-child.js';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const VALIDATOR = join(REPO_ROOT, 'tools/product/validate-qualification.mjs');
const LEGACY_SCHEMA = join(REPO_ROOT, 'schemas/product/qualification-report.v1.schema.json');
const LEGACY_MATRIX_PATH = join(REPO_ROOT, 'schemas/product/qualification-matrix.v1.json');
const CURRENT_SCHEMA = join(REPO_ROOT, 'schemas/product/qualification-report.v2.schema.json');
const CURRENT_MATRIX_PATH = join(REPO_ROOT, 'schemas/product/qualification-matrix.v2.json');
type QualificationMatrix = {
  schema_version: number;
  cells: Array<{
    id: string;
    authority: 'machine' | 'independent-reviewer' | 'founder';
  }>;
};
const MATRIX = JSON.parse(readFileSync(CURRENT_MATRIX_PATH, 'utf8')) as QualificationMatrix;
const LEGACY_MATRIX = JSON.parse(readFileSync(LEGACY_MATRIX_PATH, 'utf8')) as QualificationMatrix;
const temporaryRoot = mkdtempSync(join(tmpdir(), 'echo-qualification-report-'));
let sequence = 0;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function completeDraft(matrix: QualificationMatrix = MATRIX): Record<string, unknown> {
  const sourceSha = '1'.repeat(40);
  const artifactSha = 'a'.repeat(64);
  return {
    schema_version: matrix.schema_version,
    report_kind: 'ci-draft',
    capability_id: 'team-meeting-to-brief',
    spec_id: '2026-07-13-132-product-graduation-foundation',
    product_boundary_version: 1,
    source_sha: sourceSha,
    reviewed_qualification_sha: null,
    artifact: {
      version: '0.1.0-dev.132',
      sha256: artifactSha,
      manifest_sha256: 'b'.repeat(64),
      dependency_lock_sha256: 'c'.repeat(64),
    },
    ci: {
      run_id: 'fixture-run-132',
      run_attempt: 1,
      workflow: 'product-qualification',
      source_sha: sourceSha,
      artifact_sha256: artifactSha,
    },
    declared_platform: { os: 'darwin', architecture: 'arm64', node: '22.22.1' },
    unexpected_skip_count: 0,
    maturity: 'DEV',
    result: 'incomplete',
    cells: matrix.cells.map((definition) =>
      definition.authority === 'machine'
        ? {
            id: definition.id,
            authority: definition.authority,
            status: 'pass',
            evidence_refs: [`fixture:${definition.id}`],
          }
        : {
            id: definition.id,
            authority: definition.authority,
            status: 'pending',
            evidence_refs: [],
            reason: 'human-authority evidence is not available in a CI draft',
          },
    ),
  };
}

async function validate(
  report: Record<string, unknown>,
  artifactManifest?: string,
  contract?: { schema: string; matrix: string },
): Promise<{ status: number | null; result: { ok: boolean; errors: string[] } }> {
  const reportPath = join(temporaryRoot, `report-${sequence++}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const args = [VALIDATOR, '--report', reportPath];
  if (artifactManifest !== undefined) args.push('--artifact-manifest', artifactManifest);
  if (contract !== undefined) {
    args.push('--schema', contract.schema, '--matrix', contract.matrix);
  }
  const child = spawnSanitizedChild(process.execPath, args, { cwd: REPO_ROOT });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => (stdout += chunk));
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const status = await new Promise<number | null>((resolveStatus, reject) => {
    child.once('error', reject);
    child.once('close', resolveStatus);
  });
  expect(stderr).toBe('');
  return { status, result: JSON.parse(stdout) as { ok: boolean; errors: string[] } };
}

function cells(report: Record<string, unknown>): Array<Record<string, unknown>> {
  return report.cells as Array<Record<string, unknown>>;
}

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('qualification report validator', () => {
  it('uses INTERNAL LIVE vocabulary for the active qualification matrix', () => {
    const currentSchema = JSON.parse(readFileSync(CURRENT_SCHEMA, 'utf8')) as {
      properties: { schema_version: { const: number }; maturity: { enum: string[] } };
    };
    expect(MATRIX.schema_version).toBe(2);
    expect(currentSchema.properties.schema_version.const).toBe(2);
    expect(currentSchema.properties.maturity.enum).toEqual([
      'DEV',
      'INTERNAL LIVE',
      'QUALIFIED',
      'CLIENT LIVE',
    ]);
    const ids = MATRIX.cells.map((cell) => cell.id);
    expect(ids).toContain('internal-live-evidence');
    expect(ids).toContain('internal-staging-smoke');
    expect(ids.filter((id) => id.endsWith('live-evidence'))).toEqual(['internal-live-evidence']);
    expect(ids.filter((id) => id.endsWith('staging-smoke'))).toEqual(['internal-staging-smoke']);
  });

  it('still validates historical v1 reports against the explicit v1 contract', async () => {
    const legacySchema = JSON.parse(readFileSync(LEGACY_SCHEMA, 'utf8')) as {
      properties: { maturity: { enum: string[] } };
    };
    const report = completeDraft(LEGACY_MATRIX);
    expect(report.schema_version).toBe(1);
    expect(legacySchema.properties.maturity.enum).toContain('FOUNDER LIVE');
    expect(LEGACY_MATRIX.cells.map((cell) => cell.id)).toEqual(
      expect.arrayContaining(['founder-live-evidence', 'founder-staging-smoke']),
    );
    expect(
      await validate(report, undefined, { schema: LEGACY_SCHEMA, matrix: LEGACY_MATRIX_PATH }),
    ).toEqual({ status: 0, result: { ok: true, errors: [] } });
  });

  it('keeps release authorization founder-owned', async () => {
    expect(MATRIX.cells.find((cell) => cell.id === 'release-authorization')?.authority).toBe(
      'founder',
    );
    const report = completeDraft();
    const releaseAuthorization = cells(report).find((cell) => cell.id === 'release-authorization')!;
    releaseAuthorization.authority = 'machine';
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toContain(
      'release-authorization: authority must be founder, received machine',
    );
  });

  it('accepts a complete machine-cell CI draft with human cells visibly pending', async () => {
    const response = await validate(completeDraft());
    expect(response).toEqual({ status: 0, result: { ok: true, errors: [] } });
  });

  it('rejects a missing mandatory matrix cell', async () => {
    const report = completeDraft();
    report.cells = cells(report).filter((cell) => cell.id !== 'distribution');
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toContain('missing mandatory matrix cell: distribution');
  });

  it('enforces nested schema closure without checkout dependencies', async () => {
    const report = completeDraft();
    (report.artifact as Record<string, unknown>).undeclared = true;
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toContain(
      "/artifact must NOT have additional property 'undeclared'",
    );
  });

  it('rejects a CI-authored pass in a human-authority cell', async () => {
    const report = completeDraft();
    const cell = cells(report).find((candidate) => candidate.id === 'release-authorization')!;
    Object.assign(cell, {
      status: 'pass',
      evidence_refs: ['ci:false-human-pass'],
      attestation: {
        actor: 'ci',
        authority: 'founder',
        binding: {
          source_sha: report.source_sha,
          artifact_version: (report.artifact as { version: string }).version,
          artifact_sha256: (report.artifact as { sha256: string }).sha256,
        },
      },
    });
    delete cell.reason;
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toContain(
      'release-authorization: CI drafts cannot pass human-authority cells',
    );
  });

  it('rejects illegal not_applicable and permits only approved first-release upgrade N/A', async () => {
    const illegal = completeDraft();
    Object.assign(cells(illegal).find((cell) => cell.id === 'product-tests')!, {
      status: 'not_applicable',
      reason: 'fixture waiver',
      evidence_refs: [],
      not_applicable_approvals: [
        { authority: 'founder', rationale: 'fixture' },
        { authority: 'independent-reviewer', rationale: 'fixture' },
      ],
    });
    const rejected = await validate(illegal);
    expect(rejected.status).toBe(1);
    expect(rejected.result.errors).toContain('product-tests: not_applicable is forbidden');

    const controlled = completeDraft();
    Object.assign(cells(controlled).find((cell) => cell.id === 'upgrade-from-previous')!, {
      status: 'not_applicable',
      reason: 'first release has no previous qualified artifact',
      evidence_refs: [],
      not_applicable_approvals: [
        { authority: 'founder', rationale: 'no predecessor exists' },
        {
          authority: 'independent-reviewer',
          rationale: 'confirmed first-release lineage',
        },
      ],
    });
    expect(await validate(controlled)).toEqual({
      status: 0,
      result: { ok: true, errors: [] },
    });
  });

  it('rejects CI/source and CI/artifact identity disagreement', async () => {
    const report = completeDraft();
    (report.ci as { source_sha: string; artifact_sha256: string }).source_sha = '2'.repeat(40);
    (report.ci as { source_sha: string; artifact_sha256: string }).artifact_sha256 = 'd'.repeat(64);
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toEqual(
      expect.arrayContaining(['CI/source identity mismatch', 'CI/artifact identity mismatch']),
    );
  });

  it('rejects unexpected test skips', async () => {
    const report = completeDraft();
    report.unexpected_skip_count = 1;
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toContain('unexpected_skip_count must be zero, received 1');
  });

  it('rejects a premature QUALIFIED result while required cells remain pending', async () => {
    const report = completeDraft();
    report.report_kind = 'qualified-release';
    report.maturity = 'QUALIFIED';
    report.result = 'qualified';
    report.reviewed_qualification_sha = '3'.repeat(40);
    const response = await validate(report);
    expect(response.status).toBe(1);
    expect(response.result.errors).toEqual(
      expect.arrayContaining([
        'qualified result has a non-green cell: internal-live-evidence',
        'qualified result has a non-green cell: independent-evidence-review',
        'qualified result has a non-green cell: release-authorization',
      ]),
    );
  });

  it('binds report identity to an artifact manifest when supplied', async () => {
    const report = completeDraft();
    const manifestPath = join(temporaryRoot, 'artifact-manifest.json');
    const manifest = {
      source_sha: report.source_sha,
      version: (report.artifact as { version: string }).version,
      product_boundary_version: report.product_boundary_version,
      declared_platform: report.declared_platform,
      dependency_lock_sha256: (report.artifact as { dependency_lock_sha256: string })
        .dependency_lock_sha256,
      artifact: { sha256: (report.artifact as { sha256: string }).sha256 },
    };
    const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
    writeFileSync(manifestPath, serialized);
    (report.artifact as { manifest_sha256: string }).manifest_sha256 = hash(serialized);
    expect(await validate(report, manifestPath)).toEqual({
      status: 0,
      result: { ok: true, errors: [] },
    });

    manifest.source_sha = '4'.repeat(40);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    (report.artifact as { manifest_sha256: string }).manifest_sha256 = hash(
      readFileSync(manifestPath, 'utf8'),
    );
    const mismatch = await validate(report, manifestPath);
    expect(mismatch.status).toBe(1);
    expect(mismatch.result.errors).toContain('artifact-manifest/source identity mismatch');
  });
});
