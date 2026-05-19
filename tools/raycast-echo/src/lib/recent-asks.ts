// Recent asks — last 3 entries, persisted across Raycast sessions via LocalStorage.
// Surfaces in the empty state as a re-launchable list. Not a chat thread; each
// entry is a packet pointer the user can re-run with today's memory.

import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { LaunchTargetId } from "./launch";

const KEY = "echo.recent-asks";
const MAX = 3;

export interface RecentAsk {
  id: string;
  question: string;
  launchedTo: LaunchTargetId;
  at: string;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<RecentAsk[]> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY);
    if (raw === undefined || raw === null || raw.length === 0) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentAsk).slice(0, MAX);
  } catch {
    return [];
  }
}

function isRecentAsk(v: unknown): v is RecentAsk {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string"
    && typeof o.question === "string"
    && typeof o.launchedTo === "string"
    && typeof o.at === "string";
}

async function writeAll(items: readonly RecentAsk[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
}

export function useRecentAsks() {
  const [items, setItems] = useState<RecentAsk[]>([]);

  useEffect(() => {
    void readAll().then(setItems);
  }, []);

  const record = useCallback(async (question: string, launchedTo: LaunchTargetId) => {
    const next: RecentAsk = { id: makeId(), question: question.trim(), launchedTo, at: new Date().toISOString() };
    const current = await readAll();
    const deduped = current.filter((it) => it.question.trim() !== next.question);
    const out = [next, ...deduped].slice(0, MAX);
    await writeAll(out);
    setItems(out);
  }, []);

  return { items, record };
}
