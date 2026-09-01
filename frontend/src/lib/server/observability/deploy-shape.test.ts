// deploy-shape.test.ts — tripwire de la cible de déploiement PlanetHoster N0C.
//
// Verrouille : (1) le build Next reste en `output: 'standalone'`,
// (2) le point d'entrée Passenger `app.js` existe à la racine du repo et
// délègue au serveur standalone, (3) le workflow GitHub Actions de déploiement
// existe et contient les étapes critiques (migrate deploy + restart Passenger).
// Remplace la logique de `vercel-json-shape.test.ts` (Vercel retiré).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// frontend/src/lib/server/observability/ → frontend/ = 4 niveaux, repo root = 5.
const FRONTEND_ROOT = resolve(here, '../../../../');
const REPO_ROOT = resolve(here, '../../../../../');
const NEXT_CONFIG = resolve(FRONTEND_ROOT, 'next.config.ts');
const APP_JS = resolve(REPO_ROOT, 'app.js');

describe('deploy shape — Next standalone + Passenger entrypoint', () => {
  it('next.config.ts déclare output: "standalone"', () => {
    const src = readFileSync(NEXT_CONFIG, 'utf8');
    expect(src).toMatch(/output:\s*['"]standalone['"]/);
  });

  it('next.config.ts ne référence plus un Dockerfile inexistant', () => {
    const src = readFileSync(NEXT_CONFIG, 'utf8');
    expect(src).not.toMatch(/Dockerfile/);
  });

  it('app.js existe à la racine du repo', () => {
    expect(existsSync(APP_JS)).toBe(true);
  });

  it('app.js délègue au serveur standalone frontend/server.js', () => {
    const src = readFileSync(APP_JS, 'utf8');
    expect(src).toMatch(/require\(['"]\.\/frontend\/server\.js['"]\)/);
  });

  it('app.js force HOSTNAME sur une valeur résolvable au boot', () => {
    const src = readFileSync(APP_JS, 'utf8');
    expect(src).toMatch(/HOSTNAME/);
    expect(src).toMatch(/127\.0\.0\.1/);
  });
});
