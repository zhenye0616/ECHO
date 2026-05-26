import { createInterface } from 'node:readline/promises';
import { stdin as processStdin, stdout as processStdout } from 'node:process';

export interface PromptImpl {
  readPrompt(message: string, opts?: { default?: string }): Promise<string>;
  readConfirm(message: string, opts?: { default?: boolean }): Promise<boolean>;
  readSelect<T extends string>(message: string, choices: readonly T[]): Promise<T>;
}

export class NonInteractiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonInteractiveError';
  }
}

function confirmFromText(value: string, fallback: boolean | undefined): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 && fallback !== undefined) return fallback;
  if (['y', 'yes', 'true', '1'].includes(normalized)) return true;
  if (['n', 'no', 'false', '0'].includes(normalized)) return false;
  if (fallback !== undefined) return fallback;
  throw new NonInteractiveError(`invalid confirmation answer: ${value}`);
}

export function makeTtyPrompt(): PromptImpl {
  if (!processStdin.isTTY) {
    return {
      async readPrompt(message, opts) {
        if (opts?.default !== undefined) return opts.default;
        throw new NonInteractiveError(`non-interactive prompt has no default: ${message}`);
      },
      async readConfirm(message, opts) {
        if (opts?.default !== undefined) return opts.default;
        throw new NonInteractiveError(`non-interactive confirm has no default: ${message}`);
      },
      async readSelect(message, choices) {
        if (choices[0] !== undefined) return choices[0];
        throw new NonInteractiveError(`non-interactive select has no choices: ${message}`);
      },
    };
  }

  const ask = async (message: string): Promise<string> => {
    const rl = createInterface({ input: processStdin, output: processStdout });
    try {
      return await rl.question(message);
    } finally {
      rl.close();
    }
  };

  return {
    async readPrompt(message, opts) {
      const answer = await ask(opts?.default === undefined ? `${message} ` : `${message} `);
      if (answer.trim().length === 0 && opts?.default !== undefined) return opts.default;
      return answer;
    },
    async readConfirm(message, opts) {
      const suffix =
        opts?.default === true ? ' [Y/n] ' : opts?.default === false ? ' [y/N] ' : ' [y/n] ';
      return confirmFromText(await ask(`${message}${suffix}`), opts?.default);
    },
    async readSelect(message, choices) {
      const answer = await ask(`${message} `);
      const trimmed = answer.trim();
      const byNumber = Number.parseInt(trimmed, 10);
      if (Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= choices.length) {
        return choices[byNumber - 1]!;
      }
      const found = choices.find((choice) => choice === trimmed);
      if (found !== undefined) return found;
      throw new NonInteractiveError(`invalid selection for ${message}: ${trimmed}`);
    },
  };
}

export function makeNonInteractivePrompt(defaults: { [key: string]: unknown }): PromptImpl {
  function lookup(message: string): unknown {
    if (!Object.prototype.hasOwnProperty.call(defaults, message)) {
      throw new NonInteractiveError(`missing non-interactive answer for: ${message}`);
    }
    return defaults[message];
  }

  return {
    async readPrompt(message) {
      const value = lookup(message);
      if (typeof value !== 'string') {
        throw new NonInteractiveError(`non-interactive answer for ${message} is not a string`);
      }
      return value;
    },
    async readConfirm(message) {
      const value = lookup(message);
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return confirmFromText(value, undefined);
      throw new NonInteractiveError(`non-interactive answer for ${message} is not a boolean`);
    },
    async readSelect(message, choices) {
      const value = lookup(message);
      if (typeof value !== 'string') {
        throw new NonInteractiveError(`non-interactive answer for ${message} is not a string`);
      }
      const found = choices.find((choice) => choice === value);
      if (found !== undefined) return found;
      throw new NonInteractiveError(`non-interactive selection for ${message} is invalid`);
    },
  };
}
