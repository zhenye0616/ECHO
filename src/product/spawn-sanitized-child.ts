import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';

const CREDENTIAL_KEY =
  /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|GRANOLA|ANTHROPIC|OPENAI)/i;

export const SANITIZED_CHILD_MARKER = 'ECHO_PRODUCT_SANITIZED_CHILD';

export function sanitizedChildEnvironment(
  overrides: NodeJS.ProcessEnv = {},
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined || CREDENTIAL_KEY.test(key) || key.startsWith('ECHO_')) continue;
    env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || CREDENTIAL_KEY.test(key)) continue;
    env[key] = value;
  }
  return {
    ...env,
    [SANITIZED_CHILD_MARKER]: '1',
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    ALL_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: '',
    npm_config_offline: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
  };
}

export function spawnSanitizedChild(
  command: string,
  args: readonly string[],
  options: SpawnOptionsWithoutStdio = {},
): ChildProcessWithoutNullStreams {
  return spawn(command, [...args], {
    ...options,
    env: sanitizedChildEnvironment(options.env),
    stdio: 'pipe',
  });
}
