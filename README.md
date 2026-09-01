# izi kit

Starter full-stack headless pour la stack Next.js 16 + Prisma 5 + PostgreSQL + Upstash + Cloudinary + Brevo + Bictorys + Sentry. Une seule app Next.js déployable — aucun backend séparé. Les providers tiers (Cloudinary, Brevo, Bictorys, Google OAuth, Sentry, Upstash) sont gated par variables d'environnement et inertes sans leurs clés ; l'app boote et `/api/auth` fonctionne avec juste `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` et `CRON_SECRET`. Le starter ne ship que de la logique — aucun composant UI, aucune page — chaque fork designe son propre UX.

Voir [STATUS.md](STATUS.md) pour l'historique de migration.

## Workflow débutant (vibe coding)

**Un seul point d'entrée.** Ouvre ce projet dans Claude Code et tape :

```
/setup-kit
```

`/setup-kit` est une skill bundlée dans ce repo. Elle te guide de bout en bout : audit de ton environnement (Git, Node, pnpm, gh CLI), détection des cas piégeux (ZIP-download → blocker explicite, env file au mauvais endroit), installation des 2 plugins Claude Code manquants (superpowers + context-mode — via la palette UI de l'extension ou en fallback paste-ready CLI), création de la base PostgreSQL (PlanetHoster N0C — la **seule** dépendance obligatoire), génération des secrets, `pnpm install`, migrations Prisma. Compte ~5-10 min, principalement à attendre les installs.

Une fois `/setup-kit` terminé : **décris à Claude ce que tu veux construire**. Les 40 routes API (auth, paiements, admin, webhooks, cron, uploads) sont déjà câblées — tu n'as qu'à parler de ton produit, pas du plumbing. Si tu as un design Banani, dis « reproduis ces écrans-là » ; sinon, Claude propose une UI à partir de ta description.

Pour le détail (déploiement PlanetHoster N0C, surfaces optionnelles) : voir [WORKFLOW.md](WORKFLOW.md).

Pré-requis avant de taper `/setup-kit` : avoir **Claude Code** installé (CLI ou extension dans VS Code / Cursor / Windsurf / Antigravity — tous les forks VS Code marchent à l'identique).

## Quickstart

Le starter tourne sur un hébergement Node.js standard. **La cible documentée est [PlanetHoster N0C](https://www.planethoster.com/) (mutualisé World, Node 24 + Passenger)** avec son PostgreSQL intégré. Le SQL est standard (Postgres) — Supabase, Railway, Render, RDS ou un Postgres self-hosted fonctionnent aussi. Détails et runbook : [docs/deploy/n0c-setup.md](docs/deploy/n0c-setup.md).

```bash
gh repo clone faratasn-pixel/izikit my-project   # ou: git clone <fork-url> my-project
cd my-project
cp .env.example frontend/.env.local              # remplis DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, CRON_SECRET au minimum
pnpm install
pnpm db:migrate:deploy                           # applique les migrations versionnées sur ta DB Postgres
pnpm dev                                         # http://localhost:3000
# dans un autre terminal, après le premier signup :
pnpm db:make-superadmin you@example.com
pnpm smoke:auth                                  # vérifie le happy path auth de bout en bout
```

Pour `DATABASE_URL` + `DIRECT_URL` : crée une base Postgres dans le panel N0C (section Bases de données) et utilise la même chaîne de connexion pour les deux (le Postgres N0C n'est pas poolé). Exemples dans `.env.example`.

## Stack

- **App :** Next.js 16 (App Router) + React 19 + TypeScript — full-stack via `app/api/<resource>/route.ts` + Server Actions ; tout dans une seule app
- **Base de données :** Prisma 5 — PostgreSQL (PlanetHoster N0C) via `DATABASE_URL` ; `DIRECT_URL` = même valeur pour `prisma migrate`
- **Infra (toutes optionnelles, env-gated) :** Upstash Redis (rate-limit + leader election + outbox), Cloudinary (média / uploads), Brevo (email), Bictorys (paiements mobile money), Google OAuth via `arctic`
- **Auth :** cookie + CSRF + JWT (access 15min / refresh 7j / csrf 7j)
- **Observabilité :** Sentry via `@sentry/nextjs` (`instrumentation.ts` + `sentry.{client,server,edge}.config.ts`) — no-op silencieux sans `SENTRY_DSN` ; traces distribuées OpenTelemetry via `@vercel/otel` (`registerOTel` dans `instrumentation.ts`) — dépendance à migrer vers l'instrumentation OpenTelemetry native de Sentry
- **Outils :** workspace pnpm (un seul package dans `frontend/`), Vitest, ESLint 9 flat config, Prettier, Node 20+

## Variables d'environnement requises (boot)

| Variable         | Rôle                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | URL Postgres N0C (`schema=public&connection_limit=5`)                                                    |
| `DIRECT_URL`     | Identique à `DATABASE_URL` (Postgres N0C non poolé) — requise par `prisma migrate`                       |
| `JWT_SECRET`     | ≥32 chars, générer avec `openssl rand -base64 32`                                                        |
| `ENCRYPTION_KEY` | 32 bytes base64, générer avec `openssl rand -base64 32`                                                  |
| `CRON_SECRET`    | Bearer token requis par les handlers `/api/cron/*` ; `openssl rand -base64 32`                           |
| `APP_URL`        | Utilisé pour la génération des liens email et la base de redirect OAuth ; défaut `http://localhost:3000` |

Groupes optionnels (set les vars pour activer ; absent = inerte) :

| Groupe               | Vars                                                                                                   | Comportement quand absent                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storage (Cloudinary) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET?`    | `/api/upload` renvoie 503 ; les URLs retournées sont des `secure_url` Cloudinary servies directement par leur CDN. **⚠️ Ces URLs sont publiques — quiconque a l'URL peut lire le fichier. OK pour avatars / posts publics ; pour KYC / factures, ajoute Cloudinary signed delivery ou un proxy auth.** |
| Email (Brevo)        | `BREVO_API_KEY`, `EMAIL_FROM`                                                                          | Les lignes en queue email s'accumulent mais ne partent jamais (drainage au cron suivant dès que la clé arrive)                                                                                                                                                                                         |
| SMS (Brevo)          | `BREVO_API_KEY`, `BREVO_SMS_SENDER`                                                                    | Notifications de correspondance d'alerte : le canal SMS est ignoré (log `warn`), les autres canaux continuent normalement                                                                                                                                                                              |
| WhatsApp (Brevo)     | `BREVO_API_KEY`, `BREVO_WHATSAPP_SENDER_NUMBER`, `BREVO_WHATSAPP_TEMPLATE_ID`                          | Idem — nécessite en plus un template WhatsApp pré-approuvé côté compte Brevo (obligatoire par WhatsApp Business, à configurer manuellement)                                                                                                                                                            |
| Paiements (Bictorys) | `BICTORYS_API_KEY`, `BICTORYS_PRIVATE_KEY`, `BICTORYS_WEBHOOK_SECRET`, `BICTORYS_MERCHANT_SECRET_CODE` | `/api/orders` et `/api/webhooks/bictorys` renvoient 404 ; circuit breaker reste CLOSED                                                                                                                                                                                                                 |
| Google OAuth         | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`                                      | `/api/auth/oauth/google/*` renvoient 404                                                                                                                                                                                                                                                               |
| Sentry               | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE?`, ...                              | No-op silencieux (zéro coût perf)                                                                                                                                                                                                                                                                      |
| Upstash Redis        | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                   | Fallback rate-limit en mémoire avec `logger.warn` au boot — NE PAS lancer en prod sans Upstash                                                                                                                                                                                                         |

Référence env complète avec toutes les flags : voir [`.env.example`](.env.example) à la racine du repo (14 sections, chaque clé documentée avec défaut + impact).

## Inventaire des routes

40 routes sous `frontend/src/app/api/`. Toutes déclarent `export const runtime = 'nodejs'` (enforced par [`frontend/src/lib/server/observability/runtime-enforcement.test.ts`](frontend/src/lib/server/observability/runtime-enforcement.test.ts)).

### Auth (`/api/auth/*`) — 10 routes

| Méthode         | Path               | Auth                               |
| --------------- | ------------------ | ---------------------------------- |
| POST            | `/signup`          | aucune                             |
| POST            | `/login`           | aucune                             |
| POST            | `/logout`          | cookies                            |
| POST            | `/refresh`         | cookie refresh (scope `/api/auth`) |
| GET             | `/me`              | cookie access                      |
| POST            | `/verify-email`    | aucune                             |
| POST            | `/forgot-password` | aucune                             |
| POST            | `/reset-password`  | aucune                             |
| PUT             | `/change-password` | access + CSRF                      |
| GET/POST/DELETE | `/withdrawal-pin`  | access + CSRF                      |

### OAuth — 2 routes

| Méthode | Path                              | Auth         |
| ------- | --------------------------------- | ------------ |
| GET     | `/api/auth/oauth/google/start`    | aucune       |
| GET     | `/api/auth/oauth/google/callback` | cookie state |

### Notifications — 3 routes

| Méthode   | Path                             | Auth                     |
| --------- | -------------------------------- | ------------------------ |
| GET       | `/api/notifications` (liste)     | access                   |
| POST      | `/api/notifications` (mark-read) | access + CSRF            |
| GET       | `/api/notifications/count`       | access                   |
| GET/PATCH | `/api/notifications/prefs`       | access (+CSRF sur PATCH) |

### Orders + Withdrawals — 2 routes

| Méthode  | Path               | Auth                    |
| -------- | ------------------ | ----------------------- |
| POST     | `/api/orders`      | optionnelle             |
| POST/GET | `/api/withdrawals` | access (+CSRF sur POST) |

### Uploads — 1 route

| Méthode | Path          | Auth          |
| ------- | ------------- | ------------- |
| POST    | `/api/upload` | access + CSRF |

Les fichiers uploadés renvoient un `secure_url` Cloudinary servi directement par leur CDN — pas de route proxy côté Next.

### Webhooks — 1 route

| Méthode | Path                     | Auth                              |
| ------- | ------------------------ | --------------------------------- |
| POST    | `/api/webhooks/bictorys` | HMAC provider + replay window 60s |

### Handlers cron — 5 routes (toutes `Authorization: Bearer ${CRON_SECRET}`)

| Path                             | Schedule (panel N0C — voir [docs/deploy/n0c-crons.md](docs/deploy/n0c-crons.md)) |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `/api/cron/outbox-drain`         | `*/5 * * * *`                                                                    |
| `/api/cron/email-queue-drain`    | `*/5 * * * *`                                                                    |
| `/api/cron/verification-cleanup` | toutes les heures                                                                |
| `/api/cron/order-expiration`     | `*/5 * * * *`                                                                    |
| `/api/cron/webhook-log-purge`    | quotidien                                                                        |

### Admin (`/api/admin/*`) — 12 routes

| Méthode | Path                      | Auth                    |
| ------- | ------------------------- | ----------------------- |
| GET     | `/me`                     | ADMIN                   |
| GET     | `/users` (liste)          | ADMIN                   |
| GET     | `/users/:id`              | ADMIN                   |
| PATCH   | `/users/:id/role`         | SUPERADMIN + CSRF       |
| PATCH   | `/users/:id/status`       | ADMIN/SUPERADMIN + CSRF |
| GET     | `/orders`                 | ADMIN                   |
| GET     | `/withdrawals`            | ADMIN                   |
| POST    | `/withdrawals/:id/cancel` | SUPERADMIN + CSRF       |
| GET     | `/audit-log`              | ADMIN                   |
| GET     | `/outbox`                 | ADMIN                   |
| GET     | `/email-queue`            | ADMIN                   |
| GET     | `/rate-limits`            | ADMIN                   |

### Health — 2 routes

| Méthode | Path          | Réponse                                            |
| ------- | ------------- | -------------------------------------------------- |
| GET     | `/api/health` | `{ ok: true, time }` (liveness)                    |
| GET     | `/api/readyz` | `{ ok, db, redis }` (readiness, 503 si l'un tombe) |

Shapes complètes des requêtes/réponses : lis les route handlers sous [`frontend/src/app/api/`](frontend/src/app/api/). Les route handlers SONT le contrat.

## Smoke test

`pnpm smoke:auth` lance [`frontend/scripts/smoke-auth.ts`](frontend/scripts/smoke-auth.ts) contre un `pnpm dev` qui tourne. Le script fait un signup, lit le code de vérification dans la DB via Prisma, vérifie l'email, appelle `GET /api/auth/me`, et déconnecte. Exit 0 sur succès complet ; 1 + log descriptif sur n'importe quel échec.

Override la cible avec `SMOKE_BASE_URL` pour les déploiements preview :

```bash
SMOKE_BASE_URL=https://<ton-domaine> pnpm smoke:auth
```

Le smoke script demande `DATABASE_URL` et `JWT_SECRET` set (il lit le code de vérification directement via Prisma — pas d'endpoint `/api/test/peek-code`). Pas dans la CI ; UAT manuel uniquement.

## Déploiement (PlanetHoster N0C)

Le déploiement est automatisé par [`.github/workflows/deploy-n0c.yml`](.github/workflows/deploy-n0c.yml) : à chaque push sur `main`, GitHub Actions build en `output: 'standalone'`, `rsync` le bundle vers N0C par SSH, applique `prisma migrate deploy`, puis redémarre l'app Passenger (`touch tmp/restart.txt`).

Prérequis (une fois) : suivre [docs/deploy/n0c-setup.md](docs/deploy/n0c-setup.md) — créer l'application Node.js et la base Postgres dans le panel N0C, déposer le `.env`, générer une clé SSH de déploiement, renseigner les secrets GitHub `N0C_SSH_HOST` / `N0C_SSH_USER` / `N0C_SSH_KEY` / `N0C_APP_PATH` / `N0C_DEPLOY_URL`.

Les 6 crons se créent dans le panel N0C : [docs/deploy/n0c-crons.md](docs/deploy/n0c-crons.md).

## Design system — entièrement swappable

Le starter ne ship **aucun composant UI** par design. Ce que tu as :

- [frontend/src/app/page.tsx](frontend/src/app/page.tsx) — dashboard de config par défaut (sections : « what to type next » qui pointe `/setup-kit`, backend status, provider configuration matrix avec ✅/⚠️ par variable env, what's shipped). Remplace par ta vraie homepage dès que tu es orienté
- [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) — font `Inter` + shell `<html>/<body>` + 2 contextes client (`AuthProvider`, `ToastProvider`). Les deux contextes sont **logic-only** (zéro couplage design) — garde-les, restyle les toasts dans tes propres composants
- [frontend/src/app/error.tsx](frontend/src/app/error.tsx) — error boundary stylé Tailwind ; remplace par le tien
- [frontend/src/app/globals.css](frontend/src/app/globals.css) — une seule ligne `@import 'tailwindcss';` (Tailwind v4 zero-config). Vire la ligne + retire `@tailwindcss/postcss` de [postcss.config.mjs](frontend/postcss.config.mjs) pour sortir complètement de Tailwind.
- [examples/frontend-pages/](examples/frontend-pages/) — 11 pages Tailwind de référence (login, signup, verify-email, forgot/reset-password, dashboard, withdrawals, payment-success/failure, auth-error, admin/{layout,users,withdrawals}). Copie et restyle, ou refais à zéro — elles consomment les mêmes routes `/api/*` dans tous les cas.

**Aucune lib serveur ne touche au DOM.** Les routes renvoient `NextResponse.json(...)` uniquement. Tu peux ship un UI React vanilla, un front shadcn/ui, un dashboard Mantine, une app iOS SwiftUI via le même contrat JSON — le backend reste inchangé.

## Skills Claude Code bundlées

Les forks ouverts dans Claude Code récupèrent automatiquement plusieurs skills sous [.claude/skills/](.claude/skills/) — elles comblent le gap « headless = no UI » pour les débutants :

| Skill                                                                                  | Phrases déclencheuses                                                                                             | Ce qu'elle fait                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`setup-kit`](.claude/skills/setup-kit/SKILL.md)                                       | « /setup-kit », « je débute », « qu'est-ce que je dois installer »                                                | Audit Git / Node / pnpm / gh CLI / env vars / Claude Code surface, blocker explicite si l'user a téléchargé le ZIP au lieu de cloner, install paste-ready (UI palette ou CLI) des 2 plugins manquants, PostgreSQL (PlanetHoster N0C) en cible par défaut (alternatives Supabase/Railway/Render documentées mais surfacées seulement à la demande). Mode débutant non-négociable. |
| [`banani-design-implementation`](.claude/skills/banani-design-implementation/SKILL.md) | « build this from Banani », « use the Banani MCP », « reproduce this screen »                                     | Reproduction pixel-perfect 1:1 des écrans Banani sélectionnés via MCP (optionnel — Banani n'est pas requis). Lit `CLAUDE.md` pour la stack, planifie, tracke entre sessions.                                                                                                                                                                                                     |
| [`ui-ux-pro-max`](.claude/skills/ui-ux-pro-max/SKILL.md)                               | « design », « build », « improve », « review UI » + button/modal/navbar/dashboard/landing/SaaS/glassmorphism/etc. | Design intelligence searchable : 67 styles, 96 palettes, 57 paires de fonts, 99 guidelines UX, 25 types de charts sur 13 stacks (Next.js, React, Vue, SwiftUI, Flutter…). Intégration MCP shadcn/ui.                                                                                                                                                                             |
| [`izisaas-payments-handler`](.claude/skills/izisaas-payments-handler/SKILL.md)         | « intégrer Stripe », « ajouter Moneroo », « swap Bictorys pour … », « webhook signature failure »                 | Reference complète pour 4 providers de paiement (Stripe worldwide cards + subscriptions, Moneroo / Bictorys / PayTech mobile money UEMOA). Couvre signature verification, idempotent fulfillment, lifecycle subscriptions, stockage credentials AES-256-GCM, gotchas spécifiques par provider. Surface seulement si le fork swap ou étend le default Bictorys.                   |

Les débutants peuvent donc passer de `gh repo clone` à un UI designé en un seul chat : décris l'écran → une skill prend le relais → les routes API sont déjà câblées.

## Structure du projet

```
izikit/
├── frontend/                    L'app Next.js 16 (full-stack)
│   ├── prisma/                  schema.prisma + migrations
│   ├── scripts/                 make-superadmin.ts, seed-dev.ts, smoke-auth.ts (via tsx)
│   ├── .env.example             référence env
│   └── src/
│       ├── app/api/             route handlers
│       └── lib/
│           ├── api.ts           browser fetch wrapper (PROTÉGÉ)
│           └── server/          libs server-only (auth, crypto, payments, oauth, webhook, outbox, cron, ...)
├── examples/frontend-pages/     UIs de référence à copier et restyler (admin/, auth-error)
├── .planning/                   features.json (manifeste pruning) + audits ponctuels
├── pnpm-workspace.yaml          workspace = frontend/ seulement
└── package.json                 scripts orchestrateurs (proxy `pnpm --filter frontend ...`)
```

## Ce qui n'est PAS livré (hors scope)

Décisions de scope du starter — copié ici pour rendre ce README self-contained.

| Feature                                                              | Raison                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Composants UI / pages                                                | Headless par design — chaque fork construit son propre UX                                                     |
| Multi-provider paiements out-of-the-box                              | L'interface `PaymentProvider` permet le swap par projet ; défaut Bictorys only                                |
| Worker process long-running                                          | Hébergement Node.js standard — tout le background tourne en route handlers appelés par les crons du panel N0C |
| Migration Auth.js / NextAuth                                         | JWT custom + cookies + CSRF gardés pour la parité template complète                                           |
| Runtime Edge / Cloudflare Workers                                    | Toutes les routes sont `runtime='nodejs'`                                                                     |
| Distribution OSS publique (docs site, package npm, CLI bootstrapper) | Usage privé / personnel                                                                                       |
| Framework de test frontend (Playwright / RTL)                        | Vitest couvre `lib/server/**` only ; les tests UI sont per-projet                                             |
| Circuit breaker distribué en v1                                      | Limite single-instance ; reporté à v2                                                                         |
| i18n au-delà des défauts FCFA                                        | Concern per-projet                                                                                            |
| TOTP / 2FA built-in                                                  | Passkeys (v2) les remplacent                                                                                  |

## Invariants critiques

Ce sont les règles que chaque session Claude doit respecter — voir [CLAUDE.md](CLAUDE.md) pour la liste complète. Version courte :

- Chaque Route Handler exporte `runtime = 'nodejs'` (CI-enforced)
- Les webhook handlers lisent le raw body via `req.arrayBuffer()` AVANT tout JSON parse (intégrité HMAC)
- Les notifications passent par `createNotification(prisma, input)` — jamais `prisma.notification.create` directement
- Les withdrawals utilisent `pg_advisory_xact_lock(hashtext(userId))` dans une tx Serializable (appelle `withUserAdvisoryLock`)
- Les side-effects webhook passent par l'outbox via `enqueueOutbox(tx, event)` — jamais fire-and-forget
- Les handlers cron vérifient `Authorization: Bearer ${CRON_SECRET}`
- Le callback OAuth refuse `email_verified !== true`
- Les mutations admin appellent `logAdminAction(prisma, {...})` — bypass = régression compliance
- Le wrapper `api()` frontend retry uniquement `GET`/`HEAD` sur erreur réseau

## Licence

Tout membre ayant obtenu légitimement accès à ce kit est autorisé, de manière non exclusive, mondiale, perpétuelle et sans redevance supplémentaire, à utiliser, copier, modifier et adapter le code afin de créer, déployer et commercialiser ses propres applications, SaaS et projets clients. Ces droits restent acquis pour les versions du kit obtenues pendant la période d’adhésion. La redistribution ou la revente du kit lui-même comme template ou produit concurrent reste interdite.
