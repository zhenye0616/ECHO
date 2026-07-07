// Fixture for the trace-card entry-guard regression test (item 123 AC3).
//
// Run as a vite-node ENTRY point that merely IMPORTS a helper from
// tools/trace-card.ts. With a correct entry guard, importing the module must
// NOT start the tool, so this fixture reaches its sentinel print and exits 0.
//
// The regression test invokes this fixture with a deliberately invalid CLI arg.
// If the module wrongly ran its main path on import, parseTraceCardArgs would
// reject the invalid arg and the tool would print USAGE + exit 2 before this
// sentinel is ever written — which is how the test fails against a broken guard.
import { parseTraceCardArgs } from '../../../tools/trace-card.js';

if (typeof parseTraceCardArgs !== 'function') {
  process.stderr.write('FIXTURE_HELPER_MISSING\n');
  process.exit(3);
}

process.stdout.write('TRACE_CARD_IMPORT_ONLY_OK\n');
