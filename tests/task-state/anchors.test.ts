import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAnchors } from '../../src/mcp/parse-anchors.js';

interface Fixture {
  name: string;
  input: string;
  expected: Record<string, unknown>;
}

const fixturesPath = join(process.cwd(), 'tests/task-state/anchors-fixtures.json');
const fixtures: Fixture[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

describe('src/mcp/parse-anchors.ts — fixture-driven', () => {
  for (const fx of fixtures) {
    it(`fixture: ${fx.name}`, () => {
      const got = parseAnchors(fx.input);
      expect(got).toEqual(fx.expected);
    });
  }
});
