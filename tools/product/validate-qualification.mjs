#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, '../..');
const SCHEMA_PATH = joinRoot('schemas/product/qualification-report.v1.schema.json');
const MATRIX_PATH = joinRoot('schemas/product/qualification-matrix.v1.json');

function joinRoot(path) {
  return resolve(REPO_ROOT, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function samePlatform(left, right) {
  return (
    left?.os === right?.os &&
    left?.architecture === right?.architecture &&
    left?.node === right?.node
  );
}

export function validateQualificationReport(report, options = {}) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateSchema = ajv.compile(readJson(SCHEMA_PATH));
  const errors = [];
  if (!validateSchema(report)) {
    errors.push(
      ...(validateSchema.errors ?? []).map(
        (error) => `${error.instancePath || '/'} ${error.message ?? error.keyword}`,
      ),
    );
    return { ok: false, errors: errors.sort() };
  }

  const matrix = readJson(MATRIX_PATH);
  const definitions = new Map(matrix.cells.map((cell) => [cell.id, cell]));
  const byId = new Map();
  for (const cell of report.cells) {
    if (byId.has(cell.id)) errors.push(`duplicate matrix cell: ${cell.id}`);
    byId.set(cell.id, cell);
    const definition = definitions.get(cell.id);
    if (definition === undefined) {
      errors.push(`unknown matrix cell: ${cell.id}`);
      continue;
    }
    if (cell.authority !== definition.authority) {
      errors.push(
        `${cell.id}: authority must be ${definition.authority}, received ${cell.authority}`,
      );
    }
    if (cell.status === 'pass' && cell.evidence_refs.length === 0) {
      errors.push(`${cell.id}: passing cells require evidence`);
    }
    if (cell.status !== 'pass' && cell.reason === undefined) {
      errors.push(`${cell.id}: non-passing cells require a reason`);
    }
    if (cell.status === 'not_applicable') {
      if (!definition.not_applicable) {
        errors.push(`${cell.id}: not_applicable is forbidden`);
      } else {
        const approvals = cell.not_applicable_approvals ?? [];
        const authorities = new Set(approvals.map((approval) => approval.authority));
        if (!authorities.has('founder') || !authorities.has('independent-reviewer')) {
          errors.push(
            `${cell.id}: not_applicable requires founder and independent-reviewer rationale`,
          );
        }
      }
    }
    if (cell.authority !== 'machine' && cell.status === 'pass') {
      if (report.report_kind === 'ci-draft') {
        errors.push(`${cell.id}: CI drafts cannot pass human-authority cells`);
      }
      const attestation = cell.attestation;
      if (attestation === undefined || attestation.authority !== cell.authority) {
        errors.push(`${cell.id}: human pass requires a matching attestation`);
      } else if (
        attestation.binding.source_sha !== report.source_sha ||
        attestation.binding.artifact_version !== report.artifact.version ||
        attestation.binding.artifact_sha256 !== report.artifact.sha256
      ) {
        errors.push(`${cell.id}: human attestation identity mismatch`);
      }
    }
  }
  for (const definition of matrix.cells) {
    if (!byId.has(definition.id)) errors.push(`missing mandatory matrix cell: ${definition.id}`);
  }

  if (report.unexpected_skip_count !== 0) {
    errors.push(`unexpected_skip_count must be zero, received ${report.unexpected_skip_count}`);
  }
  if (report.ci.source_sha !== report.source_sha) {
    errors.push('CI/source identity mismatch');
  }
  if (report.ci.artifact_sha256 !== report.artifact.sha256) {
    errors.push('CI/artifact identity mismatch');
  }

  if (options.artifactManifestPath !== undefined) {
    const artifactManifestPath = resolve(options.artifactManifestPath);
    const artifactManifest = readJson(artifactManifestPath);
    if (sha256File(artifactManifestPath) !== report.artifact.manifest_sha256) {
      errors.push('artifact-manifest hash mismatch');
    }
    if (artifactManifest.source_sha !== report.source_sha) {
      errors.push('artifact-manifest/source identity mismatch');
    }
    if (artifactManifest.version !== report.artifact.version) {
      errors.push('artifact-manifest/version identity mismatch');
    }
    if (artifactManifest.artifact?.sha256 !== report.artifact.sha256) {
      errors.push('artifact-manifest/artifact identity mismatch');
    }
    if (artifactManifest.dependency_lock_sha256 !== report.artifact.dependency_lock_sha256) {
      errors.push('artifact-manifest/dependency-lock identity mismatch');
    }
    if (
      artifactManifest.product_boundary_version !== report.product_boundary_version ||
      !samePlatform(artifactManifest.declared_platform, report.declared_platform)
    ) {
      errors.push('artifact-manifest/product-boundary identity mismatch');
    }
  }

  if (report.result === 'qualified') {
    if (
      report.report_kind !== 'qualified-release' ||
      report.maturity !== 'QUALIFIED' ||
      report.reviewed_qualification_sha === null
    ) {
      errors.push('qualified result requires a reviewed QUALIFIED release record');
    }
    for (const definition of matrix.cells) {
      const cell = byId.get(definition.id);
      if (
        cell !== undefined &&
        cell.status !== 'pass' &&
        !(cell.status === 'not_applicable' && definition.not_applicable)
      ) {
        errors.push(`qualified result has a non-green cell: ${definition.id}`);
      }
    }
  }

  return { ok: errors.length === 0, errors: errors.sort() };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!['--report', '--artifact-manifest'].includes(flag)) {
      throw new Error(`unknown argument: ${flag}`);
    }
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    args[flag.slice(2)] = value;
  }
  if (!isAbsolute(args.report ?? '')) throw new Error('--report must be absolute');
  if (args['artifact-manifest'] !== undefined && !isAbsolute(args['artifact-manifest'])) {
    throw new Error('--artifact-manifest must be absolute');
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = validateQualificationReport(readJson(args.report), {
    artifactManifestPath: args['artifact-manifest'],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`validate-qualification: ${error.message}\n`);
    process.exitCode = 1;
  }
}
