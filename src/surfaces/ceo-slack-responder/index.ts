import { fileURLToPath } from 'node:url';

import { loadResponderConfig, runSlackResponder } from './responder.js';

export { loadResponderConfig, runSlackResponder } from './responder.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSlackResponder(loadResponderConfig()).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ceo-slack-responder: ${message}\n`);
    process.exitCode = 1;
  });
}
