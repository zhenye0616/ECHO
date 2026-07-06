// Fixture for the intake-terminal entry-guard regression test (item 121, AC2).
//
// Run as a vite-node ENTRY point that merely IMPORTS a helper from
// tools/intake-terminal.ts — the exact shape of the 2026-07-06 incident. With a
// correct entry guard, importing the module must NOT start the tool, so this
// fixture reaches its sentinel print and exits 0.
//
// The regression test invokes this fixture with a deliberately invalid CLI arg.
// Under the OLD `process.env.VITEST === undefined` guard, importing the module
// runs main(), whose parseArgs rejects the invalid arg and prints USAGE + exits
// 2 before this sentinel is ever written — which is how the test fails against
// the old guard.
import { terminalSeedStorePath } from '../../../tools/intake-terminal.js';

if (typeof terminalSeedStorePath !== 'function') {
  process.stderr.write('FIXTURE_HELPER_MISSING\n');
  process.exit(3);
}

process.stdout.write('INTAKE_TERMINAL_IMPORT_ONLY_OK\n');
