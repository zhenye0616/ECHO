// Fixture for the loop-dashboard entry-guard regression test (item 122, AC1).
//
// Run as a vite-node ENTRY point that merely IMPORTS a helper from
// tools/loop-dashboard.ts. With a correct entry guard, importing the module
// must NOT start the HTTP server, so this fixture reaches its sentinel print
// and exits 0. If the guard were broken (server started on import), the process
// would print the "ready at" banner and stay alive (a listening server keeps
// the event loop open), so the test would see the banner and/or time out.
import { DEFAULT_LOOP_DASHBOARD_PORT } from '../../../tools/loop-dashboard.js';

if (typeof DEFAULT_LOOP_DASHBOARD_PORT !== 'number') {
  process.stderr.write('FIXTURE_HELPER_MISSING\n');
  process.exit(3);
}

process.stdout.write('LOOP_DASHBOARD_IMPORT_ONLY_OK\n');
