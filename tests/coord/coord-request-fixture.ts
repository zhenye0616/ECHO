import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const COORD_REQUEST_PATH = 'backlog/reviews/2026-05-16-057b/r1/request.md';

export function installCoordRequestFixture(): () => void {
  const abs = join(process.cwd(), COORD_REQUEST_PATH);
  mkdirSync(join(process.cwd(), 'backlog/reviews/2026-05-16-057b/r1'), {
    recursive: true,
  });
  writeFileSync(abs, '---\nitem_id: "2026-05-16-057b"\nround: 1\n---\n');
  return () => {
    rmSync(join(process.cwd(), 'backlog/reviews/2026-05-16-057b'), {
      recursive: true,
      force: true,
    });
  };
}
