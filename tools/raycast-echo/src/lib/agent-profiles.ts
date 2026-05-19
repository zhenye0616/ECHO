export type AgentKind = "codex" | "claude" | "custom";

export interface AgentProfilePreferences {
  agentKind?: string;
  customCommand?: string;
  claudeOauthToken?: string;
}

export interface AgentInvocation {
  binary: string;
  args: string[];
  stdin: string;
  cwd?: string;
  env?: Record<string, string>;
}

export class AgentProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentProfileError";
  }
}

export function resolveAgentInvocation(
  kind: string | undefined,
  preferences: AgentProfilePreferences,
  repoPath: string,
  prompt: string,
): AgentInvocation {
  const agentKind = normalizeAgentKind(kind ?? preferences.agentKind);
  if (agentKind === "claude") {
    const token = preferences.claudeOauthToken?.trim();
    const env = token !== undefined && token.length > 0 ? { CLAUDE_CODE_OAUTH_TOKEN: token } : undefined;
    return { binary: "claude", args: ["-p"], stdin: prompt, cwd: repoPath, env };
  }
  if (agentKind === "custom") {
    return resolveCustomInvocation(preferences.customCommand, repoPath, prompt);
  }
  return {
    binary: "codex",
    args: ["exec", "--sandbox", "read-only", "-C", repoPath, "-"],
    stdin: prompt,
  };
}

export function normalizeAgentKind(value: string | undefined): AgentKind {
  if (value === "claude" || value === "custom" || value === "codex") return value;
  return "codex";
}

function resolveCustomInvocation(command: string | undefined, repoPath: string, prompt: string): AgentInvocation {
  const raw = command?.trim();
  if (raw === undefined || raw.length === 0) {
    throw new AgentProfileError("Custom command is required");
  }

  const usesQuestionTemplate = raw.includes("{question}");
  const expanded = raw
    .replaceAll("{repoPath}", repoPath)
    .replaceAll("{question}", prompt);
  const parts = splitShellArgs(expanded);
  if (parts.length === 0 || parts[0] === undefined || parts[0].length === 0) {
    throw new AgentProfileError("Custom command is empty");
  }
  return {
    binary: parts[0],
    args: parts.slice(1),
    stdin: usesQuestionTemplate ? "" : prompt,
  };
}

export function splitShellArgs(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  let escaping = false;

  for (const ch of input) {
    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }

    if (ch === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote !== null) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'" || ch === "\"") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (escaping) current += "\\";
  if (quote !== null) {
    throw new AgentProfileError("Custom command has an unterminated quote");
  }
  if (current.length > 0) parts.push(current);
  return parts;
}
