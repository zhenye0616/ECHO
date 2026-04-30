import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerEchoPing(server: McpServer): void {
  server.registerTool(
    'echo_ping',
    {
      description:
        'Connectivity check: returns pong with the received message and a timestamp.',
      inputSchema: { message: z.string().optional() },
    },
    async ({ message }) => {
      const result = {
        pong: true,
        received: message,
        ts: new Date().toISOString(),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    },
  );
}
