# Final-review fix wave — N0C migration — implementation report

Branch: `feat/migration-n0c-planethoster`. No application server code changed
(only the two named test files + the `schema.prisma` `generator` block +
`app.js` dead-code removal, all explicitly permitted by the brief).

---

## Per-finding changes

### C1 — `prisma migrate deploy` step (no CLI / no env / no PATH)
`.github/workflows/deploy-n0c.yml`
- `Prisma migrate deploy` step (`.github/workflows/deploy-n0c.yml:84-98`) rewritten:
  `source '$N0C_NODE_ACTIVATE'` (nodevenv), `set -a; . '$N0C_APP_PATH/.env'; set +a`
  (exports `DATABASE_URL` + `DIRECT_URL`), `cd '$N0C_APP_PATH/frontend'`, then
  `npx --yes prisma@5.22.0 migrate deploy --schema prisma/schema.prisma` (pinned to
  v5). A comment line `# Effective command: prisma migrate deploy (via npx
  prisma@5.22.0).` (`:90`) keeps the literal substring the `deploy-shape.test.ts`
  tripwire asserts (the pin `prisma@5.22.0 migrate deploy` alone would have broken
  `/prisma migrate deploy/`).
- New GitHub secret `N0C_NODE_ACTIVATE` documented in `docs/deploy/n0c-setup.md`
  §4.1 with the discovery one-liner `ls ~/nodevenv/*/24/bin/activate`.
- `touch tmp/restart.txt` step left as-is (no node needed).

### C2 — Prisma query engine platform
`frontend/prisma/schema.prisma:1-8` — `generator client` block only: added
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` with an inline comment on how to
adjust it (`openssl version` → `rhel-openssl-1.0.x`/`1.1.x`). `datasource` block
untouched. `prisma validate` + `prisma format` both clean (format made no further
changes).
- `docs/deploy/n0c-setup.md` §5 step 4 — numbered "verify on first deploy" check for
  the `Query engine ... could not be found` error.
- Spec `docs/superpowers/specs/2026-09-01-migration-n0c-planethoster-design.md`
  "Risques ouverts" — added item 6 (Prisma binaryTarget / `openssl version`).

### C3 — `app.js` dead dotenv fallback
`app.js:11-16` — removed the entire `try { require('./node_modules/dotenv')… }
catch` block + its comment; replaced with the 4-line comment from the brief
(env comes from the N0C panel; Next standalone additionally loads its own
`.env`). `NODE_ENV` default, `HOSTNAME` normalisation and
`require('./frontend/server.js')` kept verbatim.
- `docs/deploy/n0c-setup.md` §3 rewritten — runtime env vars go in the **N0C panel
  Node.js app "Environment variables" UI**; the `$N0C_APP_PATH/.env` file is kept
  only so the C1 migrate step can source it.

### I1 — `NEXT_PUBLIC_*` not injected at build time
- Enumerated the real set actually read in `frontend/src` + `frontend/sentry.*`:
  `NEXT_PUBLIC_COOKIE_PREFIX`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE`,
  `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_SAMPLE_RATE`.
- `.github/workflows/deploy-n0c.yml:36-51` — added an `env:` block to the `Build`
  step. Non-secret values ← `${{ vars.* }}`; `NEXT_PUBLIC_SENTRY_DSN` ← `${{ secrets.* }}`.
- `docs/deploy/n0c-setup.md` §3 (runtime) vs §4.1/§4.2 (build-time secrets vs
  variables) split; explicit warning that `COOKIE_PREFIX` (runtime) ===
  `NEXT_PUBLIC_COOKIE_PREFIX` (build-time).
- `WORKFLOW.md` étape 3 — one line noting `NEXT_PUBLIC_*` live in GitHub
  secrets/variables, not only the panel.

### I2 — `rsync --delete` unprotected
- `.github/workflows/deploy-n0c.yml:79` — added `--exclude='.htaccess'` (kept
  `--exclude='.env' --exclude='tmp/'`).
- `docs/deploy/n0c-setup.md` §5 step 2 — `ls -la $N0C_APP_PATH` check before the
  first `--delete` deploy; add one `--exclude=` per panel-managed entry.

### I3 — no rollback path
- `docs/deploy/n0c-setup.md` new "## 10. Rollback" — re-run workflow via
  Actions → Run workflow at an earlier ref; `prisma@5.22.0 migrate resolve
  --rolled-back <name>` (env sourced as in C1); note migrations are additive so
  code-only rollback is usually safe.

### I4 — onboarding docs still on Vercel/Neon
- `WORKFLOW.md` — line 7 (Neon → PostgreSQL/N0C), line 13 (Neon Postgres → N0C
  panel), étape 3 fully rewritten "Déploie sur Vercel" → "Déploie sur PlanetHoster
  N0C" (push `main` → `deploy-n0c.yml` → `docs/deploy/n0c-setup.md`); removed
  `vercel.json` / Neon `-pooler` references.
- `.claude/skills/setup-kit/SKILL.md` — frontmatter description, Purpose (L12), L14,
  L16, audit table (L54), audit checklist (L86), L109 "Pas de Vercel CLI", **Phase 3
  fully rewritten** (Neon signup/`-pooler` two-URL flow → N0C panel → Bases de
  données, single string reused for `DATABASE_URL` + `DIRECT_URL`), Phase 4 step 3,
  Phase 7 hand-off (L246), failure-mode table (2 rows), Docker FAQ row. The
  inverted claim is fixed: `env-shape.test.ts` now described as "locks `.env.example`
  to the N0C local-Postgres shape and forbids `neon.tech`".
- `PRUNING.md` — "## Step 4 — Update vercel.json" → "## Step 4 — Update
  docs/deploy/n0c-crons.md" + `vercel-json-shape.test.ts` cross-check →
  `n0c-crons-shape.test.ts`.
- `.planning/features.json` — 3× `vercel-json-shape.test.ts` →
  `n0c-crons-shape.test.ts` in `tripwires_to_update`; `core.always_required`
  `"vercel.json cron schedules + tripwire test"` → `"docs/deploy/n0c-crons.md cron
  table + tripwire test"`; `$pruning_protocol` `cron_entries removed from
  vercel.json` → `… from docs/deploy/n0c-crons.md`. JSON re-validated
  (`JSON.parse` OK).
- Spec "Fichiers touchés → Modifiés" — appended `WORKFLOW.md`,
  `.claude/skills/setup-kit/SKILL.md`, `PRUNING.md`, `.planning/features.json`
  (plus `schema.prisma` generator + `app.js` for completeness), and corrected the
  stale "`schema.prisma` inchangé" sentence.

### I5 — runbook silent on "no data migration"
- `docs/deploy/n0c-setup.md` §0 — "**Base neuve — aucune reprise de données.**" note.
- `docs/deploy/n0c-setup.md` §9 (renamed "Retrait de l'ancien hébergement") — ⚠️
  `pg_dump` + reprise plan BEFORE deleting the old env.

### I6 — CRON_SECRET visible on shared hosting
- `docs/deploy/n0c-crons.md` new "## Sécurité — secret exposé sur hébergement
  mutualisé" — `~/.n0c-cron-auth` at `chmod 600` + `curl -H @/home/USER/.n0c-cron-auth …`
  alternative command form.

### Minors (all applied)
- `.env.example` — Unix-socket note rewritten (placeholder authority kept, add
  `?host=/var/run/postgresql`, not "replace host+port"); `UPLOAD_MAX_BYTES`
  comment de-Vercel'd; `SMOKE_BASE_URL` example → `https://<ton-domaine>`.
  **NOT done: dropping `connection_limit=5` from `DIRECT_URL`** — see Concerns.
- `frontend/next.config.ts` — "Vercel's edge" → "the CDN edge"; "a Vercel build
  scoped to the `frontend` Root Directory" → "a build scoped to the `frontend`
  package"; added `TODO(next16)` comment above the `eslint:` block (Next 16 no
  longer reads it → move to ESLint-in-CI-only). No config values changed; no
  `Dockerfile` token introduced.
- `.gitattributes` — new file at repo root: `* text=auto eol=lf`.
- `README.md` — "### Handlers cron — 5 routes" → "6 routes"; added
  `/api/cron/email-job-purge | quotidien` row.
- `CLAUDE.md` — L9 "Prisma 5 + Neon" → "Prisma 5 + PostgreSQL"; L15 "plug a Neon
  `DATABASE_URL`" → "plug a PostgreSQL `DATABASE_URL` (PlanetHoster N0C by
  default)"; L70 frequent-drains parenthetical now `(outbox-drain,
  email-queue-drain, order-expiration)`. No "Express" token introduced;
  `claude-md-shape` green.
- `.github/workflows/deploy-n0c.yml` smoke step — added `--retry-all-errors
  --retry-connrefused`.
- `.github/workflows/deploy-n0c.yml` Setup SSH — key now passed via `env:
  N0C_SSH_KEY` + `printf '%s\n' "$N0C_SSH_KEY" > ~/.ssh/id_deploy`.
- `frontend/src/lib/server/observability/n0c-crons-shape.test.ts` — `*/1` guard
  regex `/\*\/1(\s|$)/` → `/^\*\/1\s/`; `!== '* * * * *'` guard kept.
- `frontend/src/lib/server/observability/env-shape.test.ts` — added a non-vacuous
  `it('DATABASE_URL et DIRECT_URL ont la MÊME valeur …')` asserting
  `direct[1] === db[1]`; header comment refreshed. No existing assertion weakened.
- `.gitignore` — removed redundant `/.env` line (bare `.env` at line 8 covers it);
  de-Neon'd the `.pg-local/` comment. `.vercel` line left as-is.
- `docs/deploy/n0c-setup.md` §8 — "+ test manuel :" stray list item → "Puis, test
  manuel : …". §7.5 — Bictorys webhook route pinned to
  `https://<domaine>/api/webhooks/bictorys` ("ou la route réelle" dropped).
- `docs/deploy/n0c-crons.md` — "Répéter en changeant le dernier segment" replaced
  with the 6 explicit copy-paste `curl` lines.
- 2 pre-existing build warnings left; `TODO(next16)` comment added next to the
  `eslint:` block (block not removed).

---

## Gate outputs

| Gate | Result |
|---|---|
| `pnpm --filter frontend exec vitest run src/lib/server/observability/` | **11 files / 147 tests passed** |
| `pnpm --filter frontend exec prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| `pnpm lint` | clean (eslint src/, no output) |
| `pnpm typecheck` | clean (tsc --noEmit, no output) |
| `pnpm test` (full suite) | **116 files / 976 tests passed, exit 0** |
| `deploy-n0c.yml` YAML parse (js-yaml) | parses; `on` = `{push:{branches:[main]}, workflow_dispatch}` — **no `schedule:`**; `/prisma migrate deploy/` present; `/tmp\/restart\.txt/` present |
| `grep -rni "vercel\|neon"` on README/WORKFLOW/PRUNING/setup-kit SKILL/CLAUDE.md/.env.example | only allowed mentions remain: `@vercel/otel` package name (README L47) + `neon.tech` named as the **forbidden** token in setup-kit SKILL (3 hits, all "forbids/interdit neon.tech"). No active Vercel/Neon hosting or DB guidance. |

Full-suite `pnpm test` count: **116 test files / 976 tests passed (exit 0)**.

`pnpm format:check` — **fails on ~499 files** (pre-existing Windows CRLF churn on
this branch, unrelated to this wave; the `.gitattributes` minor is the mitigation).
My individually-touched TS/config files (`env-shape.test.ts`,
`n0c-crons-shape.test.ts`, `next.config.ts`) are Prettier-clean; `schema.prisma`
is `prisma format`-clean.

---

## "Verify on first deploy" items added (need the real N0C environment)

Added to `docs/deploy/n0c-setup.md` (new "Points à vérifier au 1er déploiement"
section + inline §5 checks) and mirrored in the spec's "Risques ouverts" (items
6–8):
1. **Exact `activate` path for `N0C_NODE_ACTIVATE`** — depends on the panel-generated
   app name; `ls ~/nodevenv/*/24/bin/activate`.
2. **Server OpenSSL version** — decides the Prisma `binaryTargets` value
   (`rhel-openssl-3.0.x` assumed); `openssl version`.
3. **Panel-managed files in the app root** (`.htaccess`, `node_modules` symlink,
   `passenger_wsgi.py`, `tmp/`…) — `ls -la $N0C_APP_PATH` before the first
   `rsync --delete`, add one `--exclude=` per non-CI entry.
4. **Postgres TCP `localhost` vs Unix socket** — adjust `DATABASE_URL` / `DIRECT_URL`.

---

## Files changed

- `.github/workflows/deploy-n0c.yml`
- `frontend/prisma/schema.prisma` (generator block only)
- `app.js`
- `frontend/next.config.ts`
- `frontend/src/lib/server/observability/env-shape.test.ts`
- `frontend/src/lib/server/observability/n0c-crons-shape.test.ts`
- `.env.example`
- `.gitignore`
- `.gitattributes` (new)
- `README.md`, `CLAUDE.md`, `WORKFLOW.md`, `PRUNING.md`
- `.claude/skills/setup-kit/SKILL.md`
- `.planning/features.json`
- `docs/deploy/n0c-setup.md`, `docs/deploy/n0c-crons.md`
- `docs/superpowers/specs/2026-09-01-migration-n0c-planethoster-design.md`

---

## Concerns

1. **`.env.example` DIRECT_URL vs equality assertion — deliberate deviation.**
   The minors list says "Drop `connection_limit=5` from `DIRECT_URL`" but the same
   brief (I1 sub-bullet + hard constraints + gate) requires a new assertion that
   `DATABASE_URL` and `DIRECT_URL` values are **actually equal**, and the existing
   `env-shape.test.ts` + `.env.example` comment both state DIRECT_URL is
   "identique à DATABASE_URL" (non-pooled N0C Postgres). These are mutually
   exclusive. I kept the two URLs byte-identical and added the equality assertion.
   The `connection_limit=5` drop was not applied. If the reviewer prefers the
   drop, the equality assertion must be removed or softened instead.
2. **`pnpm format:check` red on ~499 files** — pre-existing CRLF churn on the
   branch, not introduced here. `.gitattributes` is added per the brief but
   `git add --renormalize` was intentionally not run (brief says it is not
   needed / out of scope). The deploy workflow's own `Quality gate` runs
   `format:check` and will stay red until that churn is normalised separately.
3. **`js-yaml` / `yaml` / Python not available locally** — the workflow YAML was
   parsed with a `js-yaml` installed in a throwaway temp dir; result is
   authoritative (parses, no `schedule:`).
