import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runSlackResponder,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';

type Listener = (event: unknown) => void;

class FakeSocket {
  static instances: FakeSocket[] = [];
  readonly url: string;
  readonly sent: string[] = [];
  private readonly listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

interface FetchHarness {
  releasePosts: () => void;
  pendingPostCount: () => number;
}

function stubSlackFetch(): FetchHarness {
  let released = false;
  const pending: Array<(value: unknown) => void> = [];
  const okResponse = (body: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      if (String(url).includes('apps.connections.open')) {
        return okResponse({ ok: true, url: 'wss://fake.socket' });
      }
      if (released) return okResponse({ ok: true });
      return new Promise((resolve) => {
        pending.push(() => resolve(okResponse({ ok: true })));
      });
    }),
  );
  return {
    releasePosts: () => {
      released = true;
      for (const release of pending.splice(0)) release(undefined);
    },
    pendingPostCount: () => pending.length,
  };
}

function config(): ResponderConfig {
  return {
    slackAppToken: 'xapp-token',
    slackBotToken: 'xoxb-token',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/Users/zhenye/justinian.ai',
    allowedChannelIds: ['CENG'],
    eventLogPath: 'raw/internal/ceo-loop-events.md',
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 180000,
    intakeOnly: true,
    cofounderIdentities: [],
  };
}

function questionEnvelope(): string {
  return JSON.stringify({
    envelope_id: 'env-1',
    type: 'events_api',
    payload: {
      event_id: 'ev-1',
      team_id: 'T1',
      event: {
        type: 'app_mention',
        channel: 'CENG',
        user: 'UREQ',
        text: '<@UBOT> hello there',
        ts: '100.1',
      },
    },
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Slack socket lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakeSocket.instances.length = 0;
    process.exitCode = undefined;
  });

  it('exits the process after the Slack socket closes while idle', async () => {
    stubSlackFetch();
    vi.stubGlobal('WebSocket', FakeSocket);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await runSlackResponder(config());
    const socket = FakeSocket.instances[0]!;
    socket.emit('close', { code: 1000, reason: 'server closed', type: 'close' });
    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    expect(process.exitCode).toBe(1);
  });

  it('drains in-flight Slack work before exiting on socket close', async () => {
    const harness = stubSlackFetch();
    vi.stubGlobal('WebSocket', FakeSocket);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await runSlackResponder(config());
    const socket = FakeSocket.instances[0]!;
    socket.emit('message', { data: questionEnvelope() });
    await vi.waitFor(() => {
      expect(harness.pendingPostCount()).toBeGreaterThan(0);
    });
    expect(socket.sent.some((frame) => frame.includes('env-1'))).toBe(true);

    socket.emit('close', { code: 1000, reason: 'server closed', type: 'close' });
    await wait(150);
    expect(exitSpy).not.toHaveBeenCalled();

    harness.releasePosts();
    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
