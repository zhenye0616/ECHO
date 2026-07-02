import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

interface PackedFile {
  path: string;
}

interface PackDryRunEntry {
  files: PackedFile[];
}

function parsePackDryRun(stdout: string): PackDryRunEntry[] {
  for (const match of stdout.matchAll(/\[/g)) {
    const start = match.index;
    if (start === undefined) continue;
    try {
      const parsed = JSON.parse(stdout.slice(start).trim()) as unknown;
      if (Array.isArray(parsed)) return parsed as PackDryRunEntry[];
    } catch {
      // npm lifecycle logs can precede the JSON payload; keep scanning.
    }
  }
  throw new Error(`npm pack --dry-run --json did not emit a JSON array:\n${stdout}`);
}

function packedPaths(): string[] {
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  expect(pack.status, pack.stderr).toBe(0);

  const payload = parsePackDryRun(pack.stdout);
  expect(payload).toHaveLength(1);
  return payload[0]!.files.map((file) => file.path.replace(/\\/g, '/')).sort();
}

function relativeRuntimeImports(filePath: string, sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imports: string[] = [];

  function addModuleSpecifier(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier !== undefined && ts.isStringLiteral(specifier)) imports.push(specifier.text);
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
  }

  function visit(node: ts.Node): void {
    addModuleSpecifier(node);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports.filter((specifier) => specifier.startsWith('.'));
}

function resolvePackedRuntimeImport(importerPath: string, specifier: string, packed: ReadonlySet<string>): string {
  const base = posix.normalize(posix.join(dirname(importerPath), specifier));
  const candidates = [base, `${base}.js`, posix.join(base, 'index.js')];
  return candidates.find((candidate) => packed.has(candidate)) ?? base;
}

describe('packed package import closure', () => {
  it('resolves every shipped dist/**/*.js relative import inside the actual npm-packed file set', () => {
    const paths = packedPaths();
    const packed = new Set(paths);
    const shippedJs = paths.filter((filePath) => filePath.startsWith('dist/') && filePath.endsWith('.js'));
    const missing: string[] = [];

    for (const filePath of shippedJs) {
      const sourceText = readFileSync(join(repoRoot, filePath), 'utf8');
      for (const specifier of relativeRuntimeImports(filePath, sourceText)) {
        const resolved = resolvePackedRuntimeImport(filePath, specifier, packed);
        if (!packed.has(resolved)) {
          missing.push(`${filePath} imports ${specifier} -> ${resolved}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
