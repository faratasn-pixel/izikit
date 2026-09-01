# Migration hébergement + base de données → PlanetHoster N0C — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer l'hébergement de Vercel vers PlanetHoster N0C (mutualisé World, Node 24 + Passenger) et la base de données de Neon vers le PostgreSQL de N0C, sans toucher au code serveur métier ni aux invariants du starter.

**Architecture :** Next.js reste buildé en `output: 'standalone'` (déjà configuré). Un point d'entrée `app.js` versionné à la racine du repo boote le serveur standalone sous Passenger. Un workflow GitHub Actions build → `rsync` SSH → `prisma migrate deploy` → `touch tmp/restart.txt`. Les 6 crons Vercel deviennent des tâches cron du panel N0C appelant les routes `/api/cron/*` en HTTPS avec `CRON_SECRET`, à fréquence ≥ 5 min. Les tripwires CI qui verrouillent l'ancienne infra (Vercel/Neon) sont réécrits pour la cible N0C.

**Tech Stack :** Next.js 16, Node 24, Prisma 5, PostgreSQL (N0C), Passenger (CloudLinux selector), GitHub Actions, `rsync`/SSH, Vitest.

**Spec :** [docs/superpowers/specs/2026-09-01-migration-n0c-planethoster-design.md](../specs/2026-09-01-migration-n0c-planethoster-design.md)

## Global Constraints

- **Ne jamais modifier** les fichiers protégés listés dans `CLAUDE.md` : `auth.ts`, `crypto.ts`, `logger.ts`, `redis.ts`, `rate-limit-store.ts`, `slug.ts`, `zod-helpers.ts`, `webhook/handler.ts`, `payments/circuit-breaker.ts`, `oauth/google.ts` (+ ses routes), `outbox/dispatcher.ts`, `admin/audit.ts`, `middleware/index.ts`, `middleware/require-admin.ts`, `middleware/require-org-role.ts`, `observability/request-context.ts`, `instrumentation.ts`, `lib/api.ts`.
- **`frontend/prisma/schema.prisma` : inchangé.** Le datasource garde `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- **Aucun code applicatif serveur modifié** — uniquement config de build/déploiement, fichiers de tests tripwire, docs, `.env.example`.
- **Chaque Route Handler garde `export const runtime = 'nodejs'`** (aucune route touchée, mais le tripwire `runtime-enforcement.test.ts` reste actif).
- **Gate avant chaque commit :** `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. Le hook husky lance déjà `typecheck` ; lancer les autres à la main.
- **`pnpm build` prend ~14 min** — le lancer détaché (ne pas laisser le timeout outil le tuer). Ne pas builder sur le serveur N0C.
- **Fréquence cron sur N0C : jamais `*/1`.** Les 2 crons « minute » (`outbox-drain`, `email-queue-drain`) passent à `*/5`.
- **6 crons canoniques**, noms inchangés : `outbox-drain`, `email-queue-drain`, `verification-cleanup`, `order-expiration`, `webhook-log-purge`, `email-job-purge`.
- **`DIRECT_URL` = `DATABASE_URL`** sur N0C (Postgres non poolé, une seule URL).
- Node cible : **24**. `HOSTNAME` doit valoir `127.0.0.1` au boot du serveur standalone (sinon crash `getaddrinfo`).

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `app.js` (racine repo) | Point d'entrée Passenger : normalise l'env puis `require('./frontend/server.js')` | Créer |
| `.github/workflows/deploy-n0c.yml` | CI : build → bundle `deploy/` → rsync SSH → migrate deploy → restart | Créer |
| `frontend/src/lib/server/observability/deploy-shape.test.ts` | Tripwire : `output: 'standalone'`, `app.js` présent + forme, workflow présent + étapes clés | Créer |
| `frontend/src/lib/server/observability/n0c-crons-shape.test.ts` | Tripwire : `docs/deploy/n0c-crons.md` documente les 6 crons, chaque route existe, aucun `*/1` | Créer (remplace `vercel-json-shape.test.ts`) |
| `frontend/src/lib/server/observability/vercel-json-shape.test.ts` | Ancien tripwire Vercel | Supprimer |
| `frontend/vercel.json` | Déclaration crons Vercel | Supprimer |
| `frontend/src/lib/server/observability/env-shape.test.ts` | Assertions `.env.example` : Neon → N0C ; blocs Phase 4/5 conservés | Modifier |
| `frontend/src/lib/server/observability/readme-shape.test.ts` | Assertion `neon.tech` → PlanetHoster N0C ; « zéro Docker » conservée | Modifier |
| `.env.example` (racine repo) | `DATABASE_URL`/`DIRECT_URL` forme N0C ; commentaires Neon → N0C | Modifier |
| `frontend/next.config.ts` | Nettoyer le commentaire obsolète référant `frontend/Dockerfile` | Modifier |
| `README.md` | Sections « base de données » + « Déploiement » : Neon/Vercel → N0C | Modifier |
| `CLAUDE.md` | Section stratégie cron + phrases « Vercel Cron » → N0C ; garder mots-clés surveillés | Modifier |
| `.gitignore` (racine repo) | Ajouter `deploy/` et `.env` | Modifier |
| `docs/deploy/n0c-crons.md` | Les 6 lignes cron exactes pour le panel N0C | Créer |
| `docs/deploy/n0c-setup.md` | Runbook : app Node.js, Postgres, `.env`, clés SSH, 1er déploiement, bascule DNS | Créer |

---

## Task 1 : Point d'entrée Passenger + tripwire `deploy-shape`

**Files:**
- Create: `app.js` (racine du repo)
- Modify: `frontend/next.config.ts` (commentaire obsolète, lignes 20-22)
- Test: `frontend/src/lib/server/observability/deploy-shape.test.ts` (create)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `app.js` à la racine du repo — exécutable par `node app.js` depuis un dossier contenant `frontend/server.js` + `frontend/.next/` + `node_modules/`.
  - `deploy-shape.test.ts` exporte (via Vitest) les tripwires ; Task 2 y **ajoute** un `describe` pour le workflow.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `frontend/src/lib/server/observability/deploy-shape.test.ts` :

```ts
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
```

- [ ] **Step 2: Lancer le test — vérifier l'échec**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/deploy-shape.test.ts`
Expected: FAIL — `app.js existe à la racine du repo` échoue (fichier absent) ; `ne référence plus un Dockerfile` échoue (commentaire présent).

- [ ] **Step 3: Créer `app.js` à la racine du repo**

```js
// app.js — point d'entrée Phusion Passenger (PlanetHoster N0C, CloudLinux selector).
//
// Passenger lance ce fichier avec `node app.js`, fournit le port d'écoute via
// process.env.PORT (souvent un chemin de socket Unix) et attend que le process
// écoute dessus. Le serveur standalone de Next (frontend/server.js) lit
// process.env.PORT / process.env.HOSTNAME et sert l'app + .next/static + public.
//
// Ce wrapper se contente de normaliser l'environnement puis de déléguer.
'use strict';

// 1. Charger .env si Passenger ne l'a pas déjà injecté (défensif — le panel N0C
//    charge .env à l'Application Root, mais pas toujours selon la config).
try {
  require('./frontend/node_modules/dotenv').config({ path: __dirname + '/.env' });
} catch (_) {
  /* dotenv absent en local hors bundle : les vars viennent alors du shell */
}

// 2. Production par défaut.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 3. Le serveur standalone Next fait `hostname ?? '0.0.0.0'` mais certaines
//    versions passent la valeur à server.listen() telle quelle ; sur CloudLinux
//    une valeur non résolvable fait crasher `getaddrinfo`. On fige une IPv4 locale.
if (!process.env.HOSTNAME || process.env.HOSTNAME === '0.0.0.0') {
  process.env.HOSTNAME = '127.0.0.1';
}

// 4. Déléguer au serveur standalone généré par `next build`.
//    Layout monorepo pnpm : .next/standalone/frontend/server.js.
require('./frontend/server.js');
```

- [ ] **Step 4: Nettoyer le commentaire obsolète de `next.config.ts`**

Remplacer (lignes ~20-23) :

```ts
  // Standalone output bundles a self-contained server.js + minimal node_modules
  // into .next/standalone — required by the Docker runtime image (frontend/Dockerfile).
  // Has no impact on `next dev` / `next start` workflows.
  output: 'standalone',
```

par :

```ts
  // Standalone output bundles a self-contained server.js + minimal node_modules
  // into .next/standalone. Consumed by the PlanetHoster N0C deployment: the
  // Passenger entrypoint (repo-root app.js) requires ./frontend/server.js from
  // this bundle. No impact on `next dev` / `next start`.
  output: 'standalone',
```

- [ ] **Step 5: Lancer le test — vérifier le succès**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/deploy-shape.test.ts`
Expected: PASS (5 assertions du `describe` « deploy shape »).

- [ ] **Step 6: Smoke local du bundle standalone** (optionnel mais recommandé)

Run (build détaché s'il n'a pas déjà tourné) :
```bash
pnpm build
cp app.js frontend/.next/standalone/app.js
cd frontend/.next/standalone && PORT=4123 HOSTNAME=127.0.0.1 node app.js &
sleep 5 && curl -sSf http://127.0.0.1:4123/ -o /dev/null && echo "OK standalone boot"
kill %1
```
Expected: `OK standalone boot`. Si échec `Cannot find module './frontend/server.js'` → vérifier le layout réel de `.next/standalone/` (`ls frontend/.next/standalone`) et ajuster le `require` de `app.js` + l'assertion du test en conséquence.

- [ ] **Step 7: Commit**

```bash
git add app.js frontend/next.config.ts frontend/src/lib/server/observability/deploy-shape.test.ts
git commit -m "feat(deploy): Passenger entrypoint app.js + deploy-shape tripwire"
```

---

## Task 2 : Workflow GitHub Actions `deploy-n0c.yml`

**Files:**
- Create: `.github/workflows/deploy-n0c.yml`
- Modify: `frontend/src/lib/server/observability/deploy-shape.test.ts` (ajout d'un `describe`)
- Test: le même fichier

**Interfaces:**
- Consumes: `app.js` (Task 1), `deploy-shape.test.ts` (Task 1).
- Produces: workflow déclenché sur `push` vers `main` + `workflow_dispatch`. Secrets requis (à créer côté GitHub, hors code) : `N0C_SSH_HOST`, `N0C_SSH_USER`, `N0C_SSH_KEY`, `N0C_APP_PATH`, `N0C_DEPLOY_URL`.

- [ ] **Step 1: Ajouter les assertions workflow au test (échec attendu)**

Ajouter à la fin de `deploy-shape.test.ts` :

```ts
describe('deploy shape — GitHub Actions workflow', () => {
  const WORKFLOW = resolve(REPO_ROOT, '.github/workflows/deploy-n0c.yml');

  it('le workflow de déploiement N0C existe', () => {
    expect(existsSync(WORKFLOW)).toBe(true);
  });

  it('le workflow applique les migrations Prisma et redémarre Passenger', () => {
    const src = readFileSync(WORKFLOW, 'utf8');
    expect(src).toMatch(/prisma migrate deploy/);
    expect(src).toMatch(/tmp\/restart\.txt/);
  });

  it('le workflow ne planifie aucun cron (les crons vivent dans le panel N0C)', () => {
    const src = readFileSync(WORKFLOW, 'utf8');
    expect(src).not.toMatch(/^\s*schedule:/m);
  });
});
```

- [ ] **Step 2: Lancer le test — vérifier l'échec**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/deploy-shape.test.ts`
Expected: FAIL — `le workflow de déploiement N0C existe` échoue.

- [ ] **Step 3: Créer `.github/workflows/deploy-n0c.yml`**

```yaml
name: Deploy to PlanetHoster N0C

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-n0c
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Quality gate
        run: |
          pnpm format:check
          pnpm lint
          pnpm typecheck
          pnpm test

      - name: Build
        run: pnpm build

      - name: Assemble deploy bundle
        run: |
          set -euo pipefail
          rm -rf deploy && mkdir -p deploy
          # .next/standalone conserve son sous-dossier frontend/ interne
          cp -r frontend/.next/standalone/. deploy/
          mkdir -p deploy/frontend/.next
          cp -r frontend/.next/static deploy/frontend/.next/static
          if [ -d frontend/public ]; then cp -r frontend/public deploy/frontend/public; fi
          cp -r frontend/prisma deploy/frontend/prisma
          cp app.js deploy/app.js
          test -f deploy/frontend/server.js  # garde-fou layout standalone

      - name: Setup SSH
        run: |
          set -euo pipefail
          mkdir -p ~/.ssh
          echo "${{ secrets.N0C_SSH_KEY }}" > ~/.ssh/id_deploy
          chmod 600 ~/.ssh/id_deploy
          ssh-keyscan -H "${{ secrets.N0C_SSH_HOST }}" >> ~/.ssh/known_hosts 2>/dev/null

      - name: Rsync to N0C
        run: |
          rsync -az --delete \
            --exclude='.env' --exclude='tmp/' \
            -e "ssh -i ~/.ssh/id_deploy" \
            deploy/ \
            "${{ secrets.N0C_SSH_USER }}@${{ secrets.N0C_SSH_HOST }}:${{ secrets.N0C_APP_PATH }}/"

      - name: Prisma migrate deploy
        run: |
          ssh -i ~/.ssh/id_deploy \
            "${{ secrets.N0C_SSH_USER }}@${{ secrets.N0C_SSH_HOST }}" \
            "cd '${{ secrets.N0C_APP_PATH }}/frontend' && npx --yes prisma migrate deploy"

      - name: Restart Passenger
        run: |
          ssh -i ~/.ssh/id_deploy \
            "${{ secrets.N0C_SSH_USER }}@${{ secrets.N0C_SSH_HOST }}" \
            "cd '${{ secrets.N0C_APP_PATH }}' && mkdir -p tmp && touch tmp/restart.txt"

      - name: Smoke check
        run: |
          sleep 15
          curl -fsS --retry 5 --retry-delay 5 "${{ secrets.N0C_DEPLOY_URL }}/" -o /dev/null
          echo "Deploy OK"
```

- [ ] **Step 4: Lancer le test — vérifier le succès**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/deploy-shape.test.ts`
Expected: PASS (tous les `describe`).

- [ ] **Step 5: Valider la syntaxe YAML du workflow**

Run: `node -e "const y=require('js-yaml'); y.load(require('fs').readFileSync('.github/workflows/deploy-n0c.yml','utf8')); console.log('YAML OK')"`
(si `js-yaml` absent à la racine : `pnpm --filter frontend exec node -e "..."` — la lib est une dépendance transitive de Vitest.)
Expected: `YAML OK`.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy-n0c.yml frontend/src/lib/server/observability/deploy-shape.test.ts
git commit -m "ci(deploy): GitHub Actions workflow build+rsync+migrate to N0C"
```

---

## Task 3 : Crons N0C — retirer `vercel.json`, nouveau tripwire, doc

**Files:**
- Delete: `frontend/vercel.json`, `frontend/src/lib/server/observability/vercel-json-shape.test.ts`
- Create: `frontend/src/lib/server/observability/n0c-crons-shape.test.ts`, `docs/deploy/n0c-crons.md`
- Test: `n0c-crons-shape.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `docs/deploy/n0c-crons.md` — table markdown listant 6 crons `| <name> | <cron-expr> | /api/cron/<name> |`. Le tripwire parse ce fichier.

- [ ] **Step 1: Créer `docs/deploy/n0c-crons.md`**

```markdown
# Crons — panel PlanetHoster N0C

Ces 6 tâches remplacent les schedules `vercel.json`. À créer dans le panel N0C
(section **Cron**), une par une. Chaque commande appelle la route HTTPS avec le
secret partagé `CRON_SECRET` (même valeur que dans le `.env` de l'app).

Remplacer `<DOMAIN>` par le domaine de production et `<CRON_SECRET>` par le secret.

| Cron | Expression | Route |
|------|------------|-------|
| outbox-drain | `*/5 * * * *` | /api/cron/outbox-drain |
| email-queue-drain | `*/5 * * * *` | /api/cron/email-queue-drain |
| order-expiration | `*/5 * * * *` | /api/cron/order-expiration |
| verification-cleanup | `0 * * * *` | /api/cron/verification-cleanup |
| webhook-log-purge | `0 3 * * *` | /api/cron/webhook-log-purge |
| email-job-purge | `0 3 * * *` | /api/cron/email-job-purge |

## Commande type (à coller dans le champ « Commande » du panel)

```
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/outbox-drain >/dev/null 2>&1
```

Répéter en changeant le dernier segment de l'URL pour chaque route.

## Notes

- N0C déconseille l'exécution *toutes les minutes* en journée : `outbox-drain` et
  `email-queue-drain` passent de `*/1` (Vercel) à `*/5`. Latence outbox/e-mail
  acceptée : jusqu'à ~5 min.
- Les purges tournent la nuit (`0 3 * * *`) pour lisser la charge.
- Si le panel envoie des e-mails sur stdout : garder le `>/dev/null 2>&1`.
```

- [ ] **Step 2: Écrire le tripwire `n0c-crons-shape.test.ts` (échec attendu)**

Créer `frontend/src/lib/server/observability/n0c-crons-shape.test.ts` :

```ts
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
const ROW_RE = /^\|\s*([a-z][a-z0-9-]*)\s*\|\s*`([^`]+)`\s*\|\s*\/api\/cron\/([a-z][a-z0-9-]*)\s*\|/gm;

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
      expect(r.expr, `${r.name} utilise une cadence every-minute`).not.toMatch(/\*\/1(\s|$)/);
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
```

- [ ] **Step 3: Lancer le test — vérifier l'échec**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/n0c-crons-shape.test.ts`
Expected: FAIL sur `frontend/vercel.json a été retiré` (fichier encore présent). Les autres assertions passent déjà (la doc est créée au Step 1).

- [ ] **Step 4: Supprimer `vercel.json` et l'ancien tripwire**

```bash
git rm frontend/vercel.json frontend/src/lib/server/observability/vercel-json-shape.test.ts
```

- [ ] **Step 5: Lancer la suite observability complète**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/`
Expected: PASS. En particulier `n0c-crons-shape.test.ts` vert et plus aucune référence à `vercel-json-shape`.

- [ ] **Step 6: Commit**

```bash
git add docs/deploy/n0c-crons.md frontend/src/lib/server/observability/n0c-crons-shape.test.ts
git commit -m "ci(deploy): replace vercel.json crons with N0C panel cron doc + tripwire"
```

---

## Task 4 : `.env.example` + tripwire `env-shape` → forme N0C

**Files:**
- Modify: `.env.example` (racine repo)
- Modify: `frontend/src/lib/server/observability/env-shape.test.ts`
- Test: `env-shape.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `.env.example` avec `DATABASE_URL` Postgres local N0C + `DIRECT_URL` identique. Les blocs Phase 4/5 (`WITHDRAWAL_BALANCE_CHECK`, `CLOUDINARY_*`, `UPLOAD_*`, `WEBHOOK_LOG_RETENTION_DAYS`, `ORDER_EXPIRATION_MINUTES`, `CRON_SECRET`) restent **inchangés**.

- [ ] **Step 1: Réécrire les assertions Neon de `env-shape.test.ts` (échec attendu ensuite)**

Dans `frontend/src/lib/server/observability/env-shape.test.ts`, remplacer le premier `describe` (`.env.example shape (OPS-01, OPS-04)`) par :

```ts
describe('.env.example shape — cible PlanetHoster N0C (OPS-01, OPS-04)', () => {
  const src = readFileSync(ENV_EXAMPLE, 'utf8');

  it(`DATABASE_URL est une URL postgres locale N0C, sans pooler Neon (file: ${ENV_EXAMPLE})`, () => {
    const m = src.match(/^DATABASE_URL="([^"]+)"/m);
    expect(m, `DATABASE_URL introuvable dans ${ENV_EXAMPLE}`).not.toBeNull();
    const url = m![1]!;
    expect(url).toMatch(/^postgresql:\/\//);
    expect(url).not.toMatch(/neon\.tech/);
    expect(url).not.toContain('pgbouncer=true');
    expect(url).toContain('schema=public');
  });

  it('DIRECT_URL est présent et documenté comme identique à DATABASE_URL sur N0C', () => {
    expect(src).toMatch(/^DIRECT_URL="postgresql:\/\/[^"]+"/m);
    expect(src.toLowerCase()).toContain('migrate deploy');
    expect(src).toMatch(/identique à DATABASE_URL|même valeur que DATABASE_URL/i);
  });

  it('déclare CRON_SECRET avec défaut vide + indice openssl', () => {
    expect(src).toMatch(/^CRON_SECRET=""/m);
    expect(src).toContain('openssl rand -base64 32');
  });
});
```

(Les 3 `describe` suivants — Phase 4, Phase 5 — restent **inchangés**.)

- [ ] **Step 2: Lancer le test — vérifier l'échec**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/env-shape.test.ts`
Expected: FAIL — `.env.example` contient encore l'URL Neon `-pooler` + `pgbouncer=true`.

- [ ] **Step 3: Mettre à jour `.env.example`**

Remplacer le bloc `DATABASE_URL` (commentaire + ligne) par :

```
# Postgres — PlanetHoster N0C fournit un PostgreSQL local (panel N0C → Bases de
# données). Le mutualisé plafonne les connexions concurrentes et n'a pas de
# PgBouncer : garder connection_limit bas (5 au départ, ajuster selon le plan).
#
# Si N0C n'expose Postgres qu'en socket Unix, remplacer host+port par
# `host=/var/run/postgresql` (ou le chemin donné par le panel).
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DBNAME?schema=public&connection_limit=5"
```

Remplacer le bloc `DIRECT_URL` par :

```
# Direct (non-poolé) — REQUIS par `prisma migrate deploy` (le schéma Prisma
# déclare directUrl = env("DIRECT_URL")). Le Postgres N0C n'étant pas poolé,
# mettre ici la MÊME VALEUR QUE DATABASE_URL.
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/DBNAME?schema=public&connection_limit=5"
```

Corriger aussi le commentaire `CRON_SECRET` : `Vercel Cron auth shared secret.` → `Cron auth shared secret (tâches cron du panel N0C).`

- [ ] **Step 4: Lancer le test — vérifier le succès**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/env-shape.test.ts`
Expected: PASS (les 4 `describe` : N0C + Phase 4 ×2 + Phase 5).

- [ ] **Step 5: Commit**

```bash
git add .env.example frontend/src/lib/server/observability/env-shape.test.ts
git commit -m "chore(env): .env.example + env-shape tripwire target N0C Postgres (drop Neon)"
```

---

## Task 5 : README — base de données + déploiement → N0C

**Files:**
- Modify: `README.md`
- Modify: `frontend/src/lib/server/observability/readme-shape.test.ts`
- Test: `readme-shape.test.ts`

**Interfaces:**
- Consumes: `docs/deploy/n0c-setup.md` référencé (créé en Task 7 — le lien peut précéder le fichier, `readme-shape` ne vérifie pas la cible du lien).
- Produces: README dont la section « Déploiement » décrit N0C. Assertions conservées : quickstart (`cp .env.example …`, `pnpm install`, `pnpm dev`), `CRON_SECRET`, `frontend/src/app/api`, `pnpm smoke:auth`, zéro Docker, contexte Express historique toléré.

- [ ] **Step 1: Adapter `readme-shape.test.ts` (échec attendu ensuite)**

Remplacer l'assertion :

```ts
  it('points users at Neon for the Postgres database (no Docker)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/neon\.tech/i);
  });
```

par :

```ts
  it('points users at PlanetHoster N0C for hosting + Postgres (no Docker)', () => {
    const content = readFileSync(README_PATH, 'utf8');
    expect(content).toMatch(/planethoster|N0C/i);
  });
```

Laisser **inchangée** l'assertion `contains zero Docker references`.

- [ ] **Step 2: Lancer le test — vérifier l'échec**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/readme-shape.test.ts`
Expected: FAIL — le README ne mentionne pas encore PlanetHoster/N0C (et mentionne encore `neon.tech`).

- [ ] **Step 3: Réécrire les passages infra du README**

Éditer `README.md` :

1. **Ligne 3** (chapô) : `… Next.js 16 + Prisma 5 + Neon + Upstash …` → `… Next.js 16 + Prisma 5 + PostgreSQL + Upstash …` ; `Une seule app Next.js déployable` inchangé.
2. **Ligne 19** : `déploiement Vercel` → `déploiement PlanetHoster N0C`.
3. **Ligne ~25** (« cloud-only par design ») : remplacer le paragraphe Neon par :
   > Le starter tourne sur un hébergement Node.js standard. **La cible documentée est [PlanetHoster N0C](https://www.planethoster.com/) (mutualisé World, Node 24 + Passenger)** avec son PostgreSQL intégré. Le SQL est standard (Postgres) — Supabase, Railway, Render, RDS ou un Postgres self-hosted fonctionnent aussi. Détails et runbook : [docs/deploy/n0c-setup.md](docs/deploy/n0c-setup.md).
4. **Ligne ~30-32** (quickstart) : garder `cp .env.example frontend/.env.local`, `pnpm install`, `pnpm dev` ; `pnpm db:migrate:deploy` — remplacer le commentaire `sur ta DB Neon` → `sur ta DB Postgres`.
5. **Ligne ~39** : remplacer l'explication `DATABASE_URL + DIRECT_URL` Neon par :
   > Pour `DATABASE_URL` + `DIRECT_URL` : crée une base Postgres dans le panel N0C (section Bases de données) et utilise la même chaîne de connexion pour les deux (le Postgres N0C n'est pas poolé). Exemples dans `.env.example`.
6. **Ligne ~44** : `Postgres / Neon serverless via URL -pooler + DIRECT_URL` → `PostgreSQL (PlanetHoster N0C) via DATABASE_URL ; DIRECT_URL = même valeur pour prisma migrate`.
7. **Ligne ~47** : retirer `@vercel/otel pour les traces distribuées` → `traces distribuées via l'instrumentation OpenTelemetry de Sentry`. (Vérifier au passage que `@vercel/otel` n'est pas importé dans le code — si oui, hors périmètre : laisser une note, ne pas retirer la dépendance ici.)
8. **Lignes ~54-55** (table env) : `URL pooler Neon (…)` → `URL Postgres N0C (schema=public&connection_limit=5)` ; `URL Neon directe (non-poolée) pour prisma migrate` → `Identique à DATABASE_URL (Postgres N0C non poolé) — requise par prisma migrate`.
9. **Ligne ~127** : `| Path | Schedule (vercel.json) |` → `| Path | Schedule (panel N0C — voir docs/deploy/n0c-crons.md) |` et mettre `outbox-drain` / `email-queue-drain` / `order-expiration` à `*/5 * * * *`.
10. **Ligne ~166** : `SMOKE_BASE_URL=https://my-preview.vercel.app pnpm smoke:auth` → `SMOKE_BASE_URL=https://<ton-domaine> pnpm smoke:auth`.
11. **Section « ## Déploiement Vercel » (lignes ~171-175)** : remplacer le titre par `## Déploiement (PlanetHoster N0C)` et le corps par :
    > Le déploiement est automatisé par [`.github/workflows/deploy-n0c.yml`](.github/workflows/deploy-n0c.yml) : à chaque push sur `main`, GitHub Actions build en `output: 'standalone'`, `rsync` le bundle vers N0C par SSH, applique `prisma migrate deploy`, puis redémarre l'app Passenger (`touch tmp/restart.txt`).
    >
    > Prérequis (une fois) : suivre [docs/deploy/n0c-setup.md](docs/deploy/n0c-setup.md) — créer l'application Node.js et la base Postgres dans le panel N0C, déposer le `.env`, générer une clé SSH de déploiement, renseigner les secrets GitHub `N0C_SSH_HOST` / `N0C_SSH_USER` / `N0C_SSH_KEY` / `N0C_APP_PATH` / `N0C_DEPLOY_URL`.
    >
    > Les 6 crons se créent dans le panel N0C : [docs/deploy/n0c-crons.md](docs/deploy/n0c-crons.md).
12. **Ligne ~212** (arbo) : `│   ├── vercel.json              schedules cron (5 entrées)` → supprimer la ligne.
13. **Ligne ~233** : `Décision Vercel-first — tout le background tourne en route handlers planifiés` → `Hébergement Node.js standard — tout le background tourne en route handlers appelés par les crons du panel N0C`.

- [ ] **Step 4: Lancer les tripwires doc**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/readme-shape.test.ts`
Expected: PASS — y compris `mentions pnpm smoke:auth`, `zero Docker references`, `quickstart command sequence`, `points at frontend/src/app/api`.

- [ ] **Step 5: Grep de contrôle anti-résidu**

Run: `grep -n -i "vercel\|neon" README.md`
Expected: plus aucune occurrence, **sauf** éventuellement une phrase historique explicitement de négation. Corriger tout résidu actif.

- [ ] **Step 6: Commit**

```bash
git add README.md frontend/src/lib/server/observability/readme-shape.test.ts
git commit -m "docs(readme): hosting + database sections target PlanetHoster N0C"
```

---

## Task 6 : CLAUDE.md + .gitignore

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.gitignore` (racine repo)
- Test: `frontend/src/lib/server/observability/claude-md-shape.test.ts` (non modifié — doit rester vert)

**Interfaces:**
- Consumes: rien.
- Produces: `CLAUDE.md` dont la stratégie cron et les phrases deploy décrivent N0C. **Contraintes du tripwire `claude-md-shape.test.ts`** : garder au moins une occurrence de `cron`, `webhook`, `withdrawal`, `upload` ; zéro `Express` hors « no separate Express backend anymore » ; zéro `backend/src` ; zéro `express.json(` ; zéro `middleware-order`.

- [ ] **Step 1: Éditer `CLAUDE.md` — section « Cron strategy »**

Remplacer la phrase :

> Background work runs as **Vercel Cron** routes under `app/api/cron/<name>/route.ts`, each gated by `Authorization: Bearer ${CRON_SECRET}`.

par :

> Background work runs as cron routes under `app/api/cron/<name>/route.ts`, each gated by `Authorization: Bearer ${CRON_SECRET}`. On PlanetHoster N0C these are scheduled from the panel's Cron section (see `docs/deploy/n0c-crons.md`); the frequent drains (`outbox-drain`, `email-queue-drain`) run every 5 minutes (N0C discourages every-minute jobs).

Puis parcourir le reste du fichier et remplacer les autres mentions `Vercel` :
- « No `setInterval` loops — Next.js / Vercel doesn't keep long-lived processes. » → « No `setInterval` loops — the Node.js host (Passenger on N0C) recycles processes and won't keep long-lived timers. »
- « replace with a Redis-backed variant for multi-pod prod » : inchangé (pas de Vercel).
- Toute autre occurrence littérale de « Vercel » → reformuler sans le nom, ou « the Node.js host ».

Ne PAS retirer les mots `cron`, `webhook`, `withdrawal`, `upload`.

- [ ] **Step 2: Éditer `CLAUDE.md` — section « Provider recommendations » / mentions déploiement**

- Ligne « The starter is Vercel/serverless-first: long-lived sockets… » → « The starter targets a standard Node.js host (Passenger on PlanetHoster N0C): long-lived sockets, in-memory pub/sub, and `setInterval` loops still don't survive process recycling and will break in production. »
- Tableau « Background jobs / queues » : « drained by Vercel Cron » → « drained by the N0C panel cron ».
- « Cron handlers … Vercel Cron » ailleurs → « the panel cron ».

- [ ] **Step 3: Éditer `CLAUDE.md` — commandes / `vercel.json`**

Rechercher `vercel.json` dans `CLAUDE.md` (section « What is fair to modify » → « Cron handlers … add new schedules to `frontend/vercel.json` »). Remplacer par :

> **Cron handlers** (`frontend/src/app/api/cron/`) — add a sibling route and document its schedule line in `docs/deploy/n0c-crons.md` (created in the panel).

- [ ] **Step 4: Lancer le tripwire CLAUDE.md**

Run: `pnpm --filter frontend exec vitest run src/lib/server/observability/claude-md-shape.test.ts`
Expected: PASS (6 assertions). Si `contains zero errant Express references` casse → une reformulation a introduit « Express » : le retirer.

- [ ] **Step 5: Grep de contrôle**

Run: `grep -n -i "vercel" CLAUDE.md`
Expected: 0 occurrence (ou uniquement une mention historique de négation explicite).

- [ ] **Step 6: Mettre à jour `.gitignore`**

Ajouter sous la section « Local cruft » :

```
# Bundle de déploiement assemblé par la CI (jamais commité)
/deploy/
# Fichier d'env de production (déposé manuellement sur le serveur)
/.env
```

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md .gitignore
git commit -m "docs(claude): cron + deploy guidance target PlanetHoster N0C; gitignore deploy/"
```

---

## Task 7 : Runbook `docs/deploy/n0c-setup.md` + gate complet

**Files:**
- Create: `docs/deploy/n0c-setup.md`
- Test: gate complet `pnpm format && pnpm lint && pnpm typecheck && pnpm test` + `pnpm build`

**Interfaces:**
- Consumes: `app.js` (T1), `deploy-n0c.yml` (T2), `docs/deploy/n0c-crons.md` (T3).
- Produces: procédure manuelle exécutable par l'utilisateur (panel + SSH). Pas de test automatisé — le livrable est le document.

- [ ] **Step 1: Écrire `docs/deploy/n0c-setup.md`**

Contenu (sections, chacune avec les commandes exactes) :

```markdown
# Mise en ligne sur PlanetHoster N0C — runbook

## 0. Prérequis
- Plan World avec : PostgreSQL activé, gestionnaire d'applications Node.js (Node 24), SSH activé.
- Accès au panel N0C (https://mg.n0c.com) et au repo GitHub (droits sur les secrets Actions).

## 1. Base de données
1. Panel N0C → Bases de données → PostgreSQL → créer une base + un utilisateur, noter user / mot de passe / nom de base.
2. Construire la chaîne : `postgresql://USER:PWD@localhost:5432/DB?schema=public&connection_limit=5`.
   - Si la connexion TCP `localhost` échoue au step 5, essayer `?schema=public&connection_limit=5&host=/var/run/postgresql` (socket) ou le host indiqué par le panel.

## 2. Application Node.js
1. Panel N0C → Applications Node.js → Créer :
   - Application root : `~/apps/habitatafriko`
   - Startup file : `app.js`
   - Node version : 24
   - Environment : Production
2. Noter le chemin absolu de l'app root (ex. `/home/USER/apps/habitatafriko`) → c'est `N0C_APP_PATH`.
3. Noter l'URL par défaut de l'app → `N0C_DEPLOY_URL` (temporaire jusqu'à la bascule DNS).

## 3. Fichier .env sur le serveur
```bash
ssh USER@HOST
mkdir -p ~/apps/habitatafriko
nano ~/apps/habitatafriko/.env      # coller toutes les clés (cf. .env.example), DATABASE_URL + DIRECT_URL identiques
```
Clés à renseigner : `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `COOKIE_PREFIX`, `APP_ORIGIN`/`NEXT_PUBLIC_*`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDINARY_*`, `BREVO_*`, `BICTORYS_API_KEY`, `BICTORYS_PRIVATE_KEY`, `BICTORYS_*` webhook, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (→ nouveau domaine), `SENTRY_DSN`.

## 4. Clé SSH de déploiement + secrets GitHub
```bash
ssh-keygen -t ed25519 -f ~/.ssh/n0c_deploy -N ""
cat ~/.ssh/n0c_deploy.pub >> ~/.ssh/authorized_keys   # sur le serveur N0C
```
Dans GitHub → Settings → Secrets and variables → Actions, créer :
- `N0C_SSH_HOST` = hôte SSH N0C
- `N0C_SSH_USER` = user SSH
- `N0C_SSH_KEY` = contenu de `~/.ssh/n0c_deploy` (clé privée)
- `N0C_APP_PATH` = chemin app root (step 2.2)
- `N0C_DEPLOY_URL` = URL app par défaut (step 2.3)

## 5. Premier déploiement
1. Lancer le workflow : GitHub → Actions → « Deploy to PlanetHoster N0C » → Run workflow (branche `main`).
2. Si le job échoue à « Prisma migrate deploy » avec une erreur de connexion → ajuster `DATABASE_URL`/`DIRECT_URL` (socket vs TCP) dans `~/apps/habitatafriko/.env`, relancer.
3. Si l'app ne boote pas (502 Passenger) → activer le mode dev dans le `.htaccess` de l'app (`PassengerAppEnv development`), recharger, lire l'erreur dans les logs du panel, corriger, remettre `production`.
4. Vérifier : `curl -I https://<N0C_DEPLOY_URL>/` → 200.

## 6. Crons
Suivre `docs/deploy/n0c-crons.md` — créer les 6 tâches dans le panel N0C.
Test manuel : depuis le panel, exécuter `outbox-drain` une fois, vérifier le code retour 200.

## 7. Bascule DNS
1. Baisser le TTL DNS du domaine à 300 s, attendre la propagation (~24 h).
2. Panel N0C : ajouter le domaine de production à l'application, générer le certificat Let's Encrypt.
3. Pointer l'enregistrement `A`/`CNAME` du domaine vers N0C.
4. Mettre à jour `GOOGLE_REDIRECT_URI` dans `.env` + la console Google Cloud (URL de redirection autorisée).
5. Repointer l'URL de webhook Bictorys vers `https://<domaine>/api/webhooks/bictorys` (ou la route réelle).
6. `touch ~/apps/habitatafriko/tmp/restart.txt`.

## 8. Vérification post-bascule
```bash
SMOKE_BASE_URL=https://<domaine> pnpm smoke:auth
```
+ test manuel : signup → verify-email → login ; upload Cloudinary ; paiement test Bictorys (webhook reçu) ; un cron déclenché à la main.

## 9. Retrait de Vercel
Après 48 h stables : supprimer le projet Vercel et purger ses variables d'environnement.
```

- [ ] **Step 2: Lien de contrôle**

Run: `grep -n "n0c-setup.md" README.md`
Expected: au moins une occurrence (ajoutée en Task 5). Si absente, l'ajouter à la section Déploiement.

- [ ] **Step 3: Gate qualité complet**

Run:
```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```
Expected: tout vert. Points d'attention :
- `vitest run src/lib/server/observability/` : `deploy-shape`, `n0c-crons-shape`, `env-shape`, `readme-shape`, `claude-md-shape`, `schema-direct-url`, `next-config-clean`, `runtime-enforcement` tous verts.
- aucun `vercel-json-shape` résiduel.

- [ ] **Step 4: Build de production détaché**

Run: `pnpm build` (le lancer en tâche de fond — ~14 min ; ne pas interrompre).
Expected: build OK, `frontend/.next/standalone/frontend/server.js` présent.

- [ ] **Step 5: Commit**

```bash
git add docs/deploy/n0c-setup.md README.md
git commit -m "docs(deploy): N0C provisioning + cutover runbook"
```

---

## Task 8 : Provisioning réel + première mise en ligne (exécution manuelle)

> Cette tâche s'exécute **hors dépôt**, sur le panel N0C et en SSH, après merge des Tasks 1-7 sur `main`. Elle suit `docs/deploy/n0c-setup.md` pas à pas. À cocher au fur et à mesure ; aucun commit.

- [ ] **Step 1:** Base Postgres créée dans le panel N0C ; chaîne de connexion notée.
- [ ] **Step 2:** Application Node.js créée (`~/apps/habitatafriko`, `app.js`, Node 24, Production) ; `N0C_APP_PATH` + `N0C_DEPLOY_URL` notés.
- [ ] **Step 3:** `~/apps/habitatafriko/.env` déposé avec toutes les clés (`DATABASE_URL` = `DIRECT_URL`).
- [ ] **Step 4:** Clé SSH de déploiement générée ; 5 secrets GitHub Actions renseignés.
- [ ] **Step 5:** Workflow « Deploy to PlanetHoster N0C » lancé ; vert jusqu'au « Smoke check ».
- [ ] **Step 6:** `curl -I https://<N0C_DEPLOY_URL>/` → 200 ; parcours auth manuel OK.
- [ ] **Step 7:** 6 crons créés dans le panel ; `outbox-drain` testé → 200.
- [ ] **Step 8:** TTL DNS abaissé ; domaine ajouté à l'app + certificat Let's Encrypt émis.
- [ ] **Step 9:** `A`/`CNAME` pointés vers N0C ; `GOOGLE_REDIRECT_URI` + console Google Cloud mis à jour ; webhook Bictorys repointé.
- [ ] **Step 10:** `SMOKE_BASE_URL=https://<domaine> pnpm smoke:auth` OK ; paiement test Bictorys → webhook reçu et traité.
- [ ] **Step 11:** Après 48 h stables : projet Vercel supprimé, variables d'env Vercel purgées.

---

## Self-Review

**1. Couverture du spec**

| Section du spec | Task(s) |
|---|---|
| Arborescence N0C + `app.js` + `next.config` | 1 |
| Point d'entrée Passenger (quirk `PORT`/`HOSTNAME`) | 1 (steps 3, 6) |
| Base de données (DATABASE_URL / DIRECT_URL / socket vs TCP) | 4 (.env.example) + 7 (runbook step 1) |
| `schema.prisma` inchangé + `schema-direct-url.test.ts` vert | 4 (step 4), 7 (step 3) |
| Crons N0C (6, ≥ 5 min, doc + tripwire) | 3 |
| Suppression `vercel.json` + tripwire réécrit | 3 |
| Variables d'env + secrets GitHub | 4 (.env.example) + 7 (runbook steps 3-4) |
| Pipeline GitHub Actions (build → rsync → migrate → restart → smoke) | 2 |
| Rollback / gestion d'erreur | 2 (workflow : gate bloquant avant restart) |
| Bascule DNS & retrait Vercel | 7 (runbook steps 7-9) + 8 |
| Tests : `deploy-shape` ajouté | 1, 2 |
| Tests : `vercel-json-shape` → `n0c-crons-shape` | 3 |
| Tests : `env-shape` Neon → N0C | 4 |
| Tests : `readme-shape` neon → N0C | 5 |
| Tests : `claude-md-shape` surveillé | 6 |
| Gate `format+lint+typecheck+test+build` | 7 |
| Docs README + CLAUDE.md | 5, 6 |
| Runbook `n0c-setup.md` + `n0c-crons.md` | 3, 7 |
| Aucun fichier protégé touché | toutes (Global Constraints) |

Aucune section du spec sans tâche.

**2. Placeholders** : aucun `TBD`/`TODO`/« handle edge cases » ; chaque step de code porte le contenu réel (test + fichier). Les valeurs à remplacer par l'utilisateur (`USER`, `PASSWORD`, `<DOMAIN>`) sont des paramètres de runbook explicitement marqués, pas des trous de plan.

**3. Cohérence des types / noms** :
- fichier test `deploy-shape.test.ts` : créé en Task 1, étendu en Task 2 (même chemin, mêmes constantes `REPO_ROOT`/`FRONTEND_ROOT`).
- `n0c-crons-shape.test.ts` : liste `CANONICAL` = 6 noms, identiques à `docs/deploy/n0c-crons.md` (Task 3 step 1) et à `README.md` step 3.9 et à `CLAUDE.md` (Task 6).
- `DIRECT_URL` == `DATABASE_URL` : cohérent entre spec, `.env.example` (Task 4), `env-shape.test.ts` (Task 4), runbook (Task 7), README (Task 5 step 3.5/3.8).
- secrets GitHub : `N0C_SSH_HOST` / `N0C_SSH_USER` / `N0C_SSH_KEY` / `N0C_APP_PATH` / `N0C_DEPLOY_URL` — même liste dans le workflow (Task 2), le README (Task 5) et le runbook (Task 7).
- `touch tmp/restart.txt` : identique dans workflow (Task 2), test (Task 2 step 1), runbook (Task 7).
```
