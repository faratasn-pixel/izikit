// n0c-crons-shape.test.ts — remplace vercel-json-shape.test.ts.
//
// Tripwire : la doc des crons N0C (docs/deploy/n0c-crons.md) documente
// EXACTEMENT les 6 crons canoniques, chacun pointant vers une route
// app/api/cron/<name>/route.ts réelle, avec une expression cron à 5 champs
// et JAMAIS `*/1` (reco PlanetHoster : pas d'exécution every-minute).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fg from 'fast-glob';

const here = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(here, '../../../../');
const REPO_ROOT = resolve(here, '../../../../../');
const CRONS_DOC = resolve(REPO_ROOT, 'docs/deploy/n0c-crons.md');
const APP_API_CRON = resolve(FRONTEND_ROOT, 'src/app/api/cron');

const CANONICAL = [
  'outbox-drain',
  'email-queue-drain',
  'order-expiration',
  'verification-cleanup',
  'webhook-log-purge',
  'email-job-purge',
].sort();

// lignes de table markdown : | name | `expr` | /api/cron/name |
const ROW_RE =
  /^\|\s*([a-z][a-z0-9-]*)\s*\|\s*`([^`]+)`\s*\|\s*\/api\/cron\/([a-z][a-z0-9-]*)\s*\|/gm;

function parseRows(src: string) {
  const rows: Array<{ name: string; expr: string; route: string }> = [];
  for (const m of src.matchAll(ROW_RE)) {
    rows.push({ name: m[1]!, expr: m[2]!.trim(), route: m[3]! });
  }
  return rows;
}

describe('n0c-crons doc tripwire', () => {
  it('docs/deploy/n0c-crons.md existe', () => {
    expect(existsSync(CRONS_DOC)).toBe(true);
  });

  it('documente exactement les 6 crons canoniques', () => {
    const rows = parseRows(readFileSync(CRONS_DOC, 'utf8'));
    expect(rows.map((r) => r.name).sort()).toEqual(CANONICAL);
  });

  it('chaque ligne : name === segment de route, expr = 5 champs, jamais */1', () => {
    const rows = parseRows(readFileSync(CRONS_DOC, 'utf8'));
    for (const r of rows) {
      expect(r.route, `route ≠ name pour ${r.name}`).toBe(r.name);
      expect(r.expr.split(/\s+/)).toHaveLength(5);
      expect(r.expr, `${r.name} utilise une cadence every-minute`).not.toMatch(/^\*\/1\s/);
      expect(r.expr).not.toBe('* * * * *');
    }
  });

  it('chaque cron documenté correspond à un app/api/cron/<name>/route.ts', async () => {
    const rows = parseRows(readFileSync(CRONS_DOC, 'utf8'));
    const routeFiles = await fg('*/route.ts', { cwd: APP_API_CRON, onlyFiles: true });
    const routeNames = new Set(routeFiles.map((f) => f.split('/')[0]));
    for (const r of rows) {
      expect(routeNames.has(r.name), `pas de route.ts pour ${r.name}`).toBe(true);
    }
  });

  it('frontend/vercel.json a été retiré', () => {
    expect(existsSync(resolve(FRONTEND_ROOT, 'vercel.json'))).toBe(false);
  });
});
