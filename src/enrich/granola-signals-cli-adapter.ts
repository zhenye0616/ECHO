import { isAbsolute } from 'node:path';
import { parseBrainName, preflightBrain, runBrain, type BrainName } from '../brain/brain.js';
import {
  buildExtractionPrompt,
  computeGranolaSignalBrainTimeoutMs,
  DEFAULT_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS,
  parseExtractorAnswer,
  type GranolaSignalAdapter,
  type GranolaSignalWorkerOptions,
} from './granola-signals.js';

export interface LabGranolaSignalAdapterConfig {
  brain: BrainName;
  contextRepoPath: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}

export interface LabGranolaSignalAdapterDependencies {
  preflight: typeof preflightBrain;
  run: typeof runBrain;
}

const DEFAULT_DEPENDENCIES: LabGranolaSignalAdapterDependencies = {
  preflight: preflightBrain,
  run: runBrain,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveLabGranolaSignalAdapterConfig(
  env: NodeJS.ProcessEnv,
): LabGranolaSignalAdapterConfig {
  const brain = parseBrainName(env['ECHO_GRANOLA_SIGNAL_BRAIN'] ?? env['ECHO_CEO_BRAIN']);
  const contextRepoPath =
    env['ECHO_GRANOLA_SIGNAL_CONTEXT_REPO_PATH'] ??
    env['ECHO_CEO_CONTEXT_REPO_PATH'] ??
    process.cwd();
  if (!isAbsolute(contextRepoPath)) {
    throw new Error('ECHO_GRANOLA_SIGNAL_CONTEXT_REPO_PATH must be absolute when set');
  }
  return {
    brain,
    contextRepoPath,
    timeoutMs: parsePositiveInt(
      env['ECHO_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS'],
      DEFAULT_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS,
    ),
    env,
  };
}

export function createLabGranolaSignalAdapter(
  config: LabGranolaSignalAdapterConfig,
  dependencies: LabGranolaSignalAdapterDependencies = DEFAULT_DEPENDENCIES,
): GranolaSignalAdapter {
  return {
    id: `lab-cli:${config.brain}`,
    preflight: () => dependencies.preflight(config.brain, config.env),
    extract: async (input) => {
      const prompt = buildExtractionPrompt(input);
      const result = await dependencies.run(prompt, {
        brain: config.brain,
        contextRepoPath: config.contextRepoPath,
        timeoutMs: computeGranolaSignalBrainTimeoutMs(config.timeoutMs, prompt.length),
        env: config.env,
      });
      if (!result.ok || result.answer === undefined) {
        throw new Error(result.reason ?? result.outcome);
      }
      return parseExtractorAnswer(result.answer);
    },
  };
}

export function createLabGranolaSignalOptions(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: LabGranolaSignalAdapterDependencies = DEFAULT_DEPENDENCIES,
): GranolaSignalWorkerOptions {
  return {
    adapter: createLabGranolaSignalAdapter(
      resolveLabGranolaSignalAdapterConfig(env),
      dependencies,
    ),
  };
}
