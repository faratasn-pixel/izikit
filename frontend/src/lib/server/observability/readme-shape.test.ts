// DOC-02 — README.md doc tripwire.
//
// Asserts the post-rewrite shape of repo-root README.md so refactors that
// strip the quickstart command sequence or the route-inventory pointer fail
// CI. Negation context is allowed for "Express" — historical phrasing
// (the project was PORTED FROM Express to Next.js) is intentional.
//
// Some assertions in this file are the post-Wave-2 target shape and may
// fail in this worktree before plan 06-03 (README rewrite) merges back.
// That is intentional — these are RED-by-design tripwires that gate the
// rewrite. After 06-03 merges back the suite goes fully GREEN.
//
// Path resolution: frontend/src/lib/server/observability/ → 5 levels up
// is repo root (where README.md lives). Uses import.meta.url for portable
// resolution under both ESM and CJS Vitest configs.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const README_PATH = resolve(__dirname, '../../../../../README.md');

describe('README.md doc tripwire (DOC-02) — current-state assertions', () => {
  it(`exists at repo root (file: ${README_PATH})`, () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('contains the quickstart command sequence (.env.example, install, dev)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/cp \.env\.example (frontend\/)?\.env(\.local)?/);
    expect(content).toMatch(/pnpm install/);
    expect(content).toMatch(/pnpm dev/);
  });

  it('points users at PlanetHoster N0C for hosting + Postgres (no Docker)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/planethoster|N0C/i);
  });

  it('contains zero Docker references (Docker support removed 2026-05-13)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).not.toMatch(/\bdocker\b/i);
  });

  it('points at frontend/src/app/api/ for route inventory', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/frontend\/src\/app\/api/);
  });

  it('mentions CRON_SECRET (Phase 5 cron auth)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/CRON_SECRET/);
  });

  it('contains zero errant Express references (historical/negation context allowed)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    // Allowed historical/negation contexts (the project was PORTED FROM
    // an Express monorepo — that history is intentional documentation).
    const lines = content.split('\n');
    const expressHits = lines
      .map((line, idx) => ({ line, idx: idx + 1 }))
      .filter(({ line }) => /\bExpress\b/.test(line))
      .filter(
        ({ line }) =>
          !/(no separate Express|amadou-template.*Express|previous Express|former Express|Express \d+ \+ Next\.js monorepo|no Express error handler|replace the previous Express|There is no.*Express)/i.test(
            line,
          ),
      );
    expect(
      expressHits,
      `Unexpected Express references:\n${expressHits.map((h) => `  L${h.idx}: ${h.line}`).join('\n')}`,
    ).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Post-Wave-2 target shape — these assertions may FAIL in this worktree
// before plan 06-03 (README rewrite) merges back. They are RED-by-design
// tripwires that gate the rewrite.
//
// After 06-03 merge-back, the README rewrite must add:
//   - `pnpm smoke:auth` mention (Phase 6 D-01 / TEST-03 wire-up)
// ───────────────────────────────────────────────────────────────────────
describe('README.md doc tripwire (DOC-02) — post-Wave-2 target shape', () => {
  it('mentions pnpm smoke:auth (added by plan 06-03 README rewrite)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/pnpm smoke:auth|smoke-auth/);
  });
});
