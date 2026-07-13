export interface ToolchainCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface ToolchainPreflightOptions {
  expectedNode: string;
  nodedir: string;
  which?: (command: string) => string | null;
  run?: (command: string, args: readonly string[]) => ToolchainCommandResult;
  exists?: (path: string) => boolean;
  read?: (path: string) => string;
  nodeVersion?: string;
}

export interface ToolchainPreflightCheck {
  name: string;
  status: 'pass' | 'fail';
  resolved?: string;
  version?: string;
  reason?: string;
}

export interface ToolchainPreflightResult {
  schema_version: 1;
  ok: boolean;
  expected_node: string;
  executing_node: string;
  nodedir: string;
  checks: ToolchainPreflightCheck[];
}

export function runToolchainPreflight(options: ToolchainPreflightOptions): ToolchainPreflightResult;
