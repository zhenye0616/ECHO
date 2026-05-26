import { afterEach, describe, expect, it, vi } from 'vitest';

const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

async function loadTtyPrompt(answers: string[]): Promise<{
  prompt: import('../../src/cli/io/prompt.js').PromptImpl;
  questions: string[];
}> {
  const questions: string[] = [];
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  vi.doMock('node:readline/promises', () => ({
    createInterface: () => ({
      question: async (message: string) => {
        questions.push(message);
        return answers.shift() ?? '';
      },
      close: () => undefined,
    }),
  }));
  const { makeTtyPrompt } = await import('../../src/cli/io/prompt.js');
  return { prompt: makeTtyPrompt(), questions };
}

describe('makeTtyPrompt', () => {
  afterEach(() => {
    if (originalIsTTY === undefined) {
      delete (process.stdin as Partial<typeof process.stdin>).isTTY;
    } else {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    }
    vi.doUnmock('node:readline/promises');
    vi.resetModules();
  });

  it('formats readPrompt with a nonempty default hint', async () => {
    const { prompt, questions } = await loadTtyPrompt(['']);
    await expect(
      prompt.readPrompt('Confirm subset to wire', { default: 'codex,cursor' }),
    ).resolves.toBe('codex,cursor');
    expect(questions).toEqual([
      'Confirm subset to wire [default: codex,cursor; Enter to accept]: ',
    ]);
  });

  it('formats readPrompt with an empty default skip hint', async () => {
    const { prompt, questions } = await loadTtyPrompt(['']);
    await expect(prompt.readPrompt('Pick default project', { default: '' })).resolves.toBe('');
    expect(questions).toEqual(['Pick default project [Enter to skip]: ']);
  });

  it('formats readPrompt without a default as a clean prompt', async () => {
    const { prompt, questions } = await loadTtyPrompt(['typed']);
    await expect(prompt.readPrompt('Project root')).resolves.toBe('typed');
    expect(questions).toEqual(['Project root: ']);
  });
});
