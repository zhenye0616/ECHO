// Launch helpers — clipboard + open external AI tool + (optional) autopaste.
// Direction C of the unified-overlay design: ECHO compresses ambiguity into a
// packet, then hands it to the user's real AI tool. ECHO never finishes the work.

import { Clipboard, Toast, getFrontmostApplication, open, showToast } from "@raycast/api";

export type LaunchTargetId = "cursor" | "claude_app" | "claude_web" | "chatgpt" | "copy";

export interface LaunchTarget {
  id: LaunchTargetId;
  label: string;
  shortLabel: string;
}

export const LAUNCH_TARGETS: readonly LaunchTarget[] = [
  { id: "cursor", label: "Send to Cursor", shortLabel: "Cursor" },
  { id: "claude_app", label: "Send to Claude (app)", shortLabel: "Claude" },
  { id: "claude_web", label: "Send to Claude.ai", shortLabel: "Claude.ai" },
  { id: "chatgpt", label: "Send to ChatGPT", shortLabel: "ChatGPT" },
  { id: "copy", label: "Copy context + prompt", shortLabel: "Clipboard" },
] as const;

export interface PrimaryDetection {
  id: LaunchTargetId;
  hint: string;
}

// Read the frontmost app when the overlay opens; if it's a known AI surface,
// that becomes the primary launch target for this session.
export async function detectPrimary(): Promise<PrimaryDetection | null> {
  try {
    const front = await getFrontmostApplication();
    const name = front.name;
    if (/cursor/i.test(name)) return { id: "cursor", hint: `${name} · frontmost` };
    if (/^claude$/i.test(name)) return { id: "claude_app", hint: `${name} · frontmost` };
    if (/chatgpt|chat\s*gpt/i.test(name)) return { id: "chatgpt", hint: `${name} · frontmost` };
  } catch {
    // ignore — Raycast may not have frontmost permission yet
  }
  return null;
}

export interface LaunchPacket {
  question: string;
  answer: string;
  evidenceMarkdown?: string;
}

export function buildPacketMarkdown(p: LaunchPacket): string {
  const parts: string[] = [];
  parts.push(`**Question:** ${p.question}`);
  parts.push("");
  parts.push(p.answer.trim());
  if (p.evidenceMarkdown !== undefined && p.evidenceMarkdown.trim().length > 0) {
    parts.push("");
    parts.push("---");
    parts.push("");
    parts.push("**Context from ECHO memory:**");
    parts.push("");
    parts.push(p.evidenceMarkdown.trim());
  }
  return parts.join("\n");
}

export interface LaunchOutcome {
  bytes: number;
  target: LaunchTargetId;
  mode?: "copy" | "paste";
}

// Copy the packet to clipboard and open the destination. Returns metadata for the
// post-launch confirmation. Pasting into the destination app is the user's last
// step — Raycast modals dismiss on action invocation, so the destination becomes
// frontmost and ⌘V completes the move.
export async function launchTo(target: LaunchTargetId, packet: LaunchPacket): Promise<LaunchOutcome> {
  const md = buildPacketMarkdown(packet);
  await Clipboard.copy(md);
  switch (target) {
    case "cursor":
      await open("cursor://");
      break;
    case "claude_app":
      await openApp("Claude");
      break;
    case "claude_web":
      await open("https://claude.ai/new");
      break;
    case "chatgpt":
      await open("https://chatgpt.com/");
      break;
    case "copy":
      // clipboard already populated
      break;
  }
  return { bytes: md.length, target };
}

export async function pasteIntoFrontmost(packet: LaunchPacket): Promise<LaunchOutcome> {
  const md = buildPacketMarkdown(packet);
  await Clipboard.copy(md);
  await Clipboard.paste(md);
  return { bytes: md.length, target: "cursor", mode: "paste" };
}

async function openApp(appName: string): Promise<void> {
  try {
    await open(`/Applications/${appName}.app`);
  } catch {
    // fall back to URL scheme if installed under a different path
    await open(`https://claude.ai/new`);
  }
}

export async function showLaunchToast(outcome: LaunchOutcome): Promise<void> {
  const titles: Record<LaunchTargetId, string> = {
    cursor: "Sent to Cursor",
    claude_app: "Sent to Claude",
    claude_web: "Sent to Claude.ai",
    chatgpt: "Sent to ChatGPT",
    copy: "Packet copied",
  };
  const message = outcome.target === "cursor" && outcome.mode === "paste"
    ? `${outcome.bytes} chars on clipboard — auto-pasted into Cursor`
    : `${outcome.bytes} chars on clipboard — paste in your AI tool`;
  await showToast({
    style: Toast.Style.Success,
    title: titles[outcome.target],
    message,
  });
}
