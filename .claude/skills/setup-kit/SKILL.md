---
name: setup-kit
description: Use when the user wants to bootstrap their dev environment for this Next.js starter from zero. Triggers — "/setup-kit", "je viens d'installer Claude Code", "je débute", "qu'est-ce que je dois installer", "setup my environment", "I just cloned the repo, what now?", "help me start", "I'm a beginner". The kit is cloud-only — there is no Docker, no local Postgres, no MinIO, no Mailpit. **PlanetHoster N0C Postgres (panel → Bases de données) is the default provider** — it is also the documented hosting target, so DB and deploy live on the same account. The webhook handler offloads side-effects to the outbox (keeps transactions short), and `/forgot-password` has a 350ms timing-attack floor (override via `AUTH_FORGOT_TARGET_LATENCY_MS` on a slower DB). The `env-shape.test.ts` tripwire locks `.env.example` to the N0C local-Postgres shape and forbids `neon.tech`. Alternatives (Supabase / Railway / Render / RDS) work but require user-side tuning — don't suggest them unless the user explicitly asks. Every user plugs the connection string into frontend/.env.local, then runs `pnpm dev`. The skill audits Claude Code (CLI or VS Code/Cursor/Windsurf/Antigravity extension) / Git / Node / pnpm / gh CLI / 2 plugins to install (superpowers, context-mode — `ui-ux-pro-max` is bundled in the repo) / env vars, blocks ZIP-download cases (no .git dir), auto-installs what is automatable via Bash (pnpm via Corepack, secret generation), and surfaces UI-clickable + slash-command paths for the plugins. Banani is OPTIONAL (skill asks oui/non/plus tard in Phase 5). GSD is NOT in prereqs — surfaced as level-up after the first feature, not by default. Deploys happen via a GitHub Actions workflow to PlanetHoster N0C — no extra CLI to install locally. Beginner-friendly — assumes zero prior knowledge, explains each step, stops at every human gate with clear instructions. The pitch is **vibe coding**: clone, plug the N0C Postgres, talk to Claude, ship.
---

# Skill — setup-kit

## Purpose

Take a brand-new user from **« Claude Code just installed, repo just cloned »** to **« `pnpm dev` boots green, `pnpm smoke:auth` passes »** in 5-10 minutes, with maximum hand-holding and minimum hidden assumptions.

The kit is **cloud-only by design**. No Docker. No local Postgres. No MinIO. No Mailpit. The only mandatory dependency is a Postgres database — **PlanetHoster N0C Postgres (panel → Bases de données) is the default provider**, and since N0C is also the documented hosting target, the database and the deployed app live on the same account. The webhook handler offloads side-effects to the outbox to keep transactions short, `/forgot-password` calibrates its timing-attack floor at 350ms (override via `AUTH_FORGOT_TARGET_LATENCY_MS` on a slower DB), and the `env-shape.test.ts` tripwire locks `.env.example` to the N0C local-Postgres shape (`schema=public`, no pooler params) and forbids `neon.tech`. Alternatives (Supabase / Railway / Render / RDS / self-hosted) work — the SQL is standard — but **require user-side tuning** (timing floor, connection params); only propose them if the user explicitly insists. The 5 optional providers (Brevo / Cloudinary / Bictorys / Google OAuth / Sentry / Upstash) are env-gated and inert when absent.

This skill exists because [WORKFLOW.md](../../../WORKFLOW.md) lists ~8 pre-requisites (Claude Code itself, Node, pnpm, gh CLI, 4 Claude Code skills, a PlanetHoster N0C Postgres, a Banani account, .mcp.json edit, .env.local creation, secret generation) and a beginner cannot reliably execute that list without guidance. Deploys run through the GitHub Actions workflow `.github/workflows/deploy-n0c.yml` to PlanetHoster N0C, so no extra deploy CLI is required locally.

> **Not a magic button.** Several steps require human action (creating the PlanetHoster N0C Postgres + a Banani account, copying API keys, pasting `/plugin` commands) — the AI cannot do them. The skill makes these gates **explicit, sequential, and unmissable**, instead of letting a beginner discover them via cryptic build errors.

## When to invoke

- User typed `/setup-kit`
- User said any of: « je viens d'installer Claude Code », « je débute », « par où je commence », « qu'est-ce que je dois installer », « I'm a beginner », « help me set up », « I just cloned, what now? »
- The user is clearly lost about pre-requisites (asks « comment lancer le projet ? » with no `node_modules/` and no `.env.local`)

## Beginner Mode — non-negotiable

When this skill is active, you MUST:

1. **Explain every command** before running it (1 line, plain language, no jargon — « pnpm » mérite une phrase, « env var » aussi).
2. **Stop at every human gate** — never silently skip. Print a numbered TODO with URLs the user clicks.
3. **Use French by default** (the kit was authored by a French speaker; switch to English only if the user replies in English).
4. **Never assume prior dev knowledge.**
5. **Verify after each phase** — re-run the relevant check; never proceed on faith.
6. **Maintain a TodoWrite list** with one item per phase. Mark items completed as you go.
7. **Be resumable** — the user may close Claude Code mid-flow. On re-invocation, run the audit first; pick up where it broke.

## Procedure

### Phase 0 — Audit

Run these probes via Bash **in parallel** and build a table.

| Check | Command | Pass criterion |
|---|---|---|
| Claude Code CLI | `claude --version 2>/dev/null \|\| echo MISSING` | semver string (informational — most users run the VS Code extension instead) |
| Git installed | `git --version 2>/dev/null \|\| echo MISSING` | semver string (hard blocker — without Git the user can't push their work) |
| **Repo is a git clone** (not ZIP) | `test -d .git && echo REPO \|\| echo NOT-A-REPO` | REPO (NOT-A-REPO = user downloaded the ZIP from GitHub instead of cloning → can't push later; hard blocker) |
| Node version | `node -v 2>/dev/null \|\| echo MISSING` | starts with `v20.` or higher |
| pnpm version | `pnpm -v 2>/dev/null \|\| echo MISSING` | starts with `9.` or higher |
| GitHub CLI auth | `gh auth status 2>&1 \| head -1` | « Logged in to github.com » present |
| Repo env file | `(test -f frontend/.env.local && echo EXISTS_LOCAL) \|\| (test -f frontend/.env && echo EXISTS_ENV) \|\| echo MISSING` | EXISTS_LOCAL preferred, EXISTS_ENV also accepted (Next.js + Prisma read either; `.env.local` is the convention but `.env` works too) |
| Repo `node_modules` | `test -d frontend/node_modules && echo EXISTS \|\| echo MISSING` | EXISTS |
| MCP config | `test -f .mcp.json && echo EXISTS \|\| echo MISSING` | EXISTS |
| Banani MCP configured (optional) | `node -e 'try{const j=require("./.mcp.json");console.log(Object.keys(j.mcpServers\|\|{}).length?"CONFIGURED":"EMPTY")}catch(e){console.log("MISSING")}'` | EMPTY by default (Banani optional — user opts in in Phase 5). CONFIGURED only if Phase 5 already ran. |
| `DATABASE_URL` set | `cat frontend/.env.local frontend/.env 2>/dev/null \| grep -Eq '^DATABASE_URL="?postgresql://' && echo SET \|\| echo UNSET` | SET (PlanetHoster N0C local-Postgres URL by default — see Phase 3; alternatives are accepted but only when the user explicitly insists). The `cat \| grep` pattern tolerates either file being absent (grep alone returns exit 2 on missing-file → false UNSET). Regex accepts both quoted `DATABASE_URL="postgresql://…"` (`.env.example` style) and unquoted. |

For Claude Code skills, check the system-reminder context loaded at session start — these 3 skill names must appear in the active skills list:
- `superpowers:*` (any — e.g. `superpowers:using-superpowers`)
- `ui-ux-pro-max`
- `context-mode:*` (any — e.g. `context-mode:context-mode`)

GSD (`get-shit-done-cc`) is **not** in the prereqs — it's an optional level-up tool surfaced in Phase 7 when the user finishes their first feature.

Print the result as a checklist:

```
🔍 AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTÈME
  ℹ️  Claude Code CLI (extension VS Code OK aussi)
  ✅ Git installé    ✅ Repo cloné (.git présent)
  ✅ Node 20.x       ❌ pnpm (manquant)
  ⏳ gh CLI (pas authentifié)
  ✅ .mcp.json présent

CLAUDE CODE SKILLS
  ❌ superpowers     ❌ ui-ux-pro-max
  ❌ context-mode    ℹ️  GSD (optionnel — level up)

REPO
  ❌ frontend/.env.local manquant
  ❌ frontend/node_modules manquant
  ❌ DATABASE_URL pas défini (Postgres requis)
  ℹ️  Banani MCP (optionnel — Phase 5)

COMPTES (action humaine requise)
  🙋 Postgres (PlanetHoster N0C)   🙋 GitHub
  ℹ️  Banani (optionnel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **🚨 Blocker NOT-A-REPO** : si la probe « Repo is a git clone » renvoie `NOT-A-REPO`, l'user a téléchargé le ZIP au lieu de cloner. **Stop la Phase 1** et dis-lui : *« Tu as téléchargé le ZIP au lieu de cloner — tu ne pourras pas pousser ton travail sur GitHub plus tard. Ferme VS Code, supprime ce dossier, puis fais l'une de ces 2 options :
> - Terminal : `gh repo clone <owner>/<repo>` (ou `git clone https://github.com/<owner>/<repo>.git`)
> - GitHub Desktop (https://desktop.github.com) si tu préfères cliquer.
> Puis relance Claude Code dans le nouveau dossier et tape `/setup-kit`. »*

### Phase 1 — Outils système

For each MISSING item, take the action below. **NEVER skip a missing one silently.**

| Manquant | Action AI | Action humaine |
|---|---|---|
| **Claude Code (CLI absent)** | — | « Si tu lis ceci, Claude Code tourne déjà — soit en extension VS Code / Cursor / Windsurf / Antigravity (la plupart des gens), soit en CLI. La CLI est optionnelle. Si tu veux quand même la CLI dans le terminal : `npm install -g @anthropic-ai/claude-code` (Node 20+ requis). » |
| **Git absent** | Sur macOS : `brew install git` après confirmation. Sur Linux : `sudo apt install git` (Ubuntu/Debian) ou équivalent. Sur Windows : `winget install Git.Git`. | Sans Git, pas de clone, pas de push, pas de commit — Stop tant que ce n'est pas installé. |
| **NOT-A-REPO** (ZIP download) | — | « Tu as téléchargé le ZIP au lieu de cloner. Ferme VS Code, supprime ce dossier, puis `gh repo clone <owner>/<repo>` (ou `git clone <https-url>` si tu n'as pas gh CLI). Relance `/setup-kit` dans le nouveau dossier. » Stop. |
| **Node < 20** | — | « Va sur https://nodejs.org/en/download → installe la version LTS (≥ 20). Relance `/setup-kit` après. » Stop. |
| **pnpm** | `corepack enable && corepack prepare pnpm@latest --activate` | Aucune (Corepack ship avec Node 20). Sur Windows PowerShell, si erreur `cannot be loaded because running scripts is disabled` : exécuter dans PowerShell admin `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`, puis relancer Corepack. |
| **gh CLI** | Sur macOS : `brew install gh` après confirmation. Sinon afficher https://cli.github.com/ | Puis `gh auth login` — interactif, choisir « GitHub.com » → « HTTPS » → ouvrir le navigateur |

> **Pas de CLI de déploiement à installer.** Le déploiement passe par le workflow GitHub Actions `.github/workflows/deploy-n0c.yml` vers PlanetHoster N0C (provisioning décrit dans `docs/deploy/n0c-setup.md`). Aucun outil local en plus.

After each install, **re-run the matching probe** to confirm. If install fails, do not proceed — explique l'erreur en français simple et propose **une seule** alternative.

### Phase 2 — Plugins Claude Code (2 plugins à activer)

`ui-ux-pro-max` est **déjà bundlé** dans le repo (`.claude/skills/ui-ux-pro-max/`) — Claude Code le charge automatiquement à l'ouverture, rien à installer. Restent 2 plugins externes à activer : **superpowers** et **context-mode**.

**Méthode UI (recommandée — extension VS Code / Cursor / Windsurf / Antigravity)** :

> 1. Ouvre le panneau Claude Code (clique sur l'icône Claude dans la barre latérale de VS Code).
> 2. Dans la zone de chat, tape `/` pour ouvrir la palette de commandes Claude.
> 3. Choisis **Manage plugins** (ou « Plugin marketplace » selon la version).
> 4. Recherche **« superpowers »** → clique **Install** (ou « Activate »).
> 5. Recherche **« context-mode »** → clique **Install**.
> 6. Confirme-moi quand les 2 sont installés.

**Méthode CLI (fallback — si tu lances Claude Code en CLI dans le terminal)** :

Les 2 plugins s'installent via slash commands que **l'IA ne peut PAS taper elle-même**. Copie-colle ces 3 lignes une par une dans le chat (Entrée entre chaque) :

```
/plugin install superpowers@claude-plugins-official
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
```

Une fois confirmé (UI ou CLI) : « **Redémarre Claude Code** pour que les plugins se chargent, puis relance `/setup-kit` pour vérifier.
> - Extension VS Code / Antigravity : `Cmd+Shift+P` (macOS) ou `Ctrl+Shift+P` (Win/Linux) → tape `Developer: Reload Window` → Entrée.
> - CLI : `Ctrl+C` pour quitter, puis relance `claude` dans le terminal. »

> **GSD intentionnellement omis ici.** GSD est un workflow procédural (~30 slash commands, plans/phases/commits atomiques) qui sert vraiment quand le projet devient gros. Pour un premier MVP en vibe coding, c'est de la cérémonie. On le surface en Phase 7 quand le user a terminé sa première feature, pas avant.

### Phase 3 — Base PostgreSQL PlanetHoster N0C (la SEULE dépendance obligatoire)

Le kit est **cloud-only** — pas de Postgres local. **PlanetHoster N0C est le provider par défaut** (c'est aussi la cible d'hébergement documentée : DB + app sur le même compte) :

- Le webhook handler sort les side-effects (emails, notifications) vers l'outbox post-commit pour garder les transactions courtes.
- La mitigation timing-attack de `/forgot-password` calibre son floor à **350ms** — override via `AUTH_FORGOT_TARGET_LATENCY_MS` si tu tournes sur un Postgres plus lent.
- Le tripwire `env-shape.test.ts` **verrouille** `.env.example` au format Postgres local N0C (`schema=public`, pas de params pooler) et **interdit `neon.tech`** (CI bloque tout changement).
- Le Postgres N0C n'est **pas poolé** : `DATABASE_URL` et `DIRECT_URL` prennent la **même valeur**.

**Pousse l'user vers N0C par défaut.** Si l'user demande explicitement un autre provider, c'est supporté (voir « Alternatives » plus bas) mais préviens des caveats.

**Chemin N0C (cas par défaut)** :

1. **Compte N0C** — « Il te faut un plan PlanetHoster World (PostgreSQL activé, app Node.js, SSH). Panel : https://mg.n0c.com. Confirme quand tu y as accès. »
2. **Création de la base** — « Panel N0C → Bases de données → PostgreSQL → crée une base + un utilisateur. Note user / mot de passe / nom de base. »
3. **Construire la chaîne** — `postgresql://USER:PWD@localhost:5432/DB?schema=public&connection_limit=5`. Colle-la ici dans le chat (l'IA l'écrit dans `.env.local` pour toi) — **la même valeur** va dans `DATABASE_URL` et dans `DIRECT_URL`.
4. **AI écrit `.env.local`** — `cp .env.example frontend/.env.local` puis `Edit` pour insérer la chaîne dans `DATABASE_URL` **et** `DIRECT_URL` (valeurs identiques).

> En dev local avant d'avoir un plan N0C : n'importe quel Postgres accessible en `localhost` fait l'affaire pour faire tourner `pnpm dev` et les tests ; la forme N0C n'est requise que pour le déploiement (voir `docs/deploy/n0c-setup.md`).

**Alternatives** (l'user insiste pour ne pas utiliser N0C — par défaut on ne propose PAS, on attend qu'il demande) :

> ⚠️ Avant de pousser une alternative, préviens : *« Le kit est tuned pour le Postgres N0C — sur un autre Postgres le webhook handler reste safe (l'outbox post-commit garde les transactions courtes), mais tu devras peut-être bumper `AUTH_FORGOT_TARGET_LATENCY_MS` si la latence DB dépasse ~150ms. »*

- **Supabase** : Settings → Database → *Connection string*. `DATABASE_URL` = URL "Transaction pooler" (port `6543`) ; `DIRECT_URL` = URL "Session pooler" ou direct connection (port `5432`).
- **Railway / Render** : `DATABASE_URL` = URL Postgres standard, `connection_limit` ~10. `DIRECT_URL` = même URL.
- **RDS / self-hosted** : `postgresql://user:pass@host:5432/db?sslmode=require` deux fois. Ajoute un PgBouncer en façade plus tard si tu scale.

> Note: le tripwire `frontend/src/lib/server/observability/env-shape.test.ts` verrouille `.env.example` au format Postgres local N0C et interdit `neon.tech`. C'est volontaire — il garantit que les forks par défaut restent sur N0C. Les users qui swap pour Supabase modifient leur `.env.local` (gitignored), pas `.env.example`.

### Phase 4 — Install du repo + secrets

Séquentiel (chaque étape dépend de la précédente) :

1. **Install dependencies** — `pnpm install` (« télécharge toutes les librairies, ~2 min la première fois »).
2. **Génère les secrets** — pour `JWT_SECRET` / `ENCRYPTION_KEY` / `CRON_SECRET`, lance `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` une fois par clé. Confirme avec le user puis fait l'`Edit` dans `.env.local`.
3. **Applique le schéma Prisma** — `pnpm db:migrate:deploy` (« crée toutes les tables dans ta base Postgres N0C »). Vérifie que ça finit sans erreur.

Stop si une étape échoue. Lis l'erreur, explique en français simple, propose un fix.

### Phase 5 — Banani MCP (optionnel — design import)

**Demande explicitement à l'user :** *« Tu as un design Banani ? oui / non / plus tard »*

- **non / plus tard** → Skip immédiatement. Dis-lui : *« Pas de souci. Tu pourras décrire ce que tu veux à Claude en français à la prochaine étape, et il construira l'UI à partir de ta description. Ouvre Banani plus tard si tu veux un design plus polish. »* Passe à Phase 6.
- **oui** → continue ci-dessous :
  - URL : https://banani.co — **inscription gratuite, aucune clé payante.**
  - Banani expose son MCP. Demande : *« Banani t'a donné quoi exactement ? Colle-le ici (commande, URL, ou bloc JSON). »*
  - **Détecte le format collé** :
    - **Cas A — commande `claude mcp add ...`** (le format Banani le plus courant aujourd'hui ; user-scope). Exemple : `claude mcp add --transport http banani https://app.banani.co/api/mcp/mcp --header "Authorization: Bearer bnni_XXX"`.
      → **NE LANCE PAS la commande toi-même.** Le token est sensible et la commande écrit dans `~/.claude.json` (config user-level, hors scope du projet). Dis à l'user :
      > *« Cette commande écrit dans ta config Claude Code user-level (`~/.claude.json`), pas dans le repo — ton token reste local à ta machine, jamais committé. Lance-la **toi-même** dans un terminal (le terminal intégré de VS Code marche très bien — `` Ctrl+` ``) :*
      >
      > ```bash
      > <colle ici la commande complète que l'user t'a donnée>
      > ```
      >
      > *Tu verras « Added MCP server 'banani' ». Vérifie avec `claude mcp list`. Confirme-moi quand c'est fait. »*
    - **Cas B — bloc JSON ou URL HTTP/SSE pure** (project-scope). Exemples : `{ "banani": { "url": "https://..." } }` ou juste `https://app.banani.co/api/mcp/mcp`.
      → L'IA met à jour `.mcp.json` à la racine du repo. Si juste une URL : `{ "banani": { "url": "<url>" } }`. Si bloc complet : reproduire tel quel. **Important** : ne mets PAS un Bearer token en clair dans `.mcp.json` — il serait committé. Si l'user veut un token, route-le vers le Cas A (commande `claude mcp add`, user-scope).
    - **En cas de doute** : demande confirmation avant d'écrire/exécuter.
  - Puis (dans les 2 cas) : *« **Redémarre Claude Code** pour que le MCP soit chargé (extension VS Code / Cursor / Windsurf / Antigravity : `Cmd+Shift+P` → `Developer: Reload Window` ; CLI : `Ctrl+C` puis relance `claude`). Au prochain chat, sélectionne tes écrans dans Banani et dis "reproduis ces écrans-là" — le skill `banani-design-implementation` prendra le relais (pixel-perfect 1:1). »*

> **Pourquoi l'IA ne lance pas `claude mcp add` directement** : (1) le token Bearer transiterait dans le contexte LLM ; (2) la commande écrit dans `~/.claude.json` (user-level), hors scope du projet ; (3) le scope user est en fait souhaitable — une fois enregistré, le MCP marche pour TOUS tes projets Claude Code sans avoir à recommencer.

### Phase 6 — Comptes optionnels (skip-friendly)

Pour chaque, demande : « Tu veux activer [feature] dès maintenant ? oui / non / plus tard ». Si `non` ou `plus tard`, skip sans jugement — le kit boote très bien sans (voir CLAUDE.md « Optional providers boot conditionally »).

| Feature | Provider | URL | Clés à coller |
|---|---|---|---|
| Cache / rate-limit | Upstash Redis | https://upstash.com | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| Emails transactionnels | Brevo | https://app.brevo.com/settings/keys/api | `BREVO_API_KEY` + `EMAIL_FROM` |
| Upload de fichiers / média | Cloudinary | https://cloudinary.com | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Sign in with Google | Google Cloud Console | https://console.cloud.google.com | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Paiements mobile money | Bictorys | https://bictorys.com | `BICTORYS_API_KEY` + `BICTORYS_PRIVATE_KEY` (deux clés DISTINCTES — voir CLAUDE.md invariants) |
| Observabilité | Sentry | https://sentry.io | `SENTRY_DSN` |

Pour chaque clé collée, `Edit` `frontend/.env.local` après confirmation. Ne jamais coller les clés dans le chat visible (toujours via Edit).

### Phase 7 — Smoke test final

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

Puis dans un second terminal :

```bash
pnpm dev
```

Puis :

```bash
pnpm smoke:auth
```

Si tout vert : 🎉 imprime un récap félicitations + le hand-off vibe coding :

> *« Tout est prêt. Maintenant, dis-moi simplement ce que tu veux construire — en français, en langage naturel. Exemple : "je veux une page d'accueil avec un bouton créer un compte, un dashboard utilisateur, et une page de paiement." Les 40 routes API sont déjà câblées. Je m'occupe du code. »*
>
> *Si tu as connecté Banani en Phase 5 : sélectionne tes écrans et dis "reproduis ces écrans-là" — le skill `banani-design-implementation` prendra le relais.*
>
> *Pour déployer plus tard sur PlanetHoster N0C : dis-moi "déploie sur N0C" quand tu es prêt (push sur `main` → workflow GitHub Actions `deploy-n0c.yml`). Voir [WORKFLOW.md](../../../WORKFLOW.md) + [docs/deploy/n0c-setup.md](../../../docs/deploy/n0c-setup.md) — la section « Pour aller plus loin » de WORKFLOW.md mentionne aussi GSD comme level-up optionnel quand le projet devient gros.*

Si quelque chose rouge : stop, colle l'output qui échoue, explique en français simple, propose un fix. **Ne dis jamais « tout est prêt »** tant que les 3 commandes ne sont pas vertes.

## Failure modes — be explicit

| Symptôme | Cause probable | Réponse |
|---|---|---|
| `pnpm install` échoue avec EACCES | Permissions npm cassées | Suggère `corepack enable` ; ne **jamais** suggérer `sudo` (mauvaise pratique) |
| `pnpm db:migrate:deploy` échoue avec `P1001 connection refused` | `DATABASE_URL` faux ou base Postgres N0C injoignable | Vérifie l'URL dans `.env.local` (commence par `postgresql://`, contient `schema=public`) ; teste la base depuis le panel N0C |
| `pnpm db:migrate:deploy` échoue avec `env("DIRECT_URL")` manquant | `DIRECT_URL` non renseigné | Sur N0C, `DIRECT_URL` = **même valeur** que `DATABASE_URL` (Postgres non poolé) |
| `pnpm dev` démarre mais `/api/auth/signup` renvoie 500 | `JWT_SECRET` / `ENCRYPTION_KEY` manquants ou trop courts (< 32 chars) | Re-run Phase 4 step 2 (génération de secrets) |
| User dit « les commandes `/plugin` ne marchent pas » | Pas dans Claude Code ou marketplace pas accessible | Vérifier qu'il est dans le chat Claude Code (pas dans le terminal shell) |
| User dit « après `/plugin install` rien ne change » | Skill chargé au prochain démarrage de session | Demande à l'user de redémarrer Claude Code — extension VS Code / Antigravity : `Cmd+Shift+P` → `Developer: Reload Window` ; CLI : `Ctrl+C` puis relance `claude` |
| User demande « pourquoi pas de Docker ? » | Habitude des autres starters | Réponds : « Ce kit est cloud-only par design — une base Postgres managée (PlanetHoster N0C) remplace Postgres local, et tu skip 2 Go de Docker Desktop. » |

## Anti-patterns — ne fais JAMAIS

- ❌ Lancer `sudo` quoi que ce soit
- ❌ Modifier `~/.zshrc` / `~/.bashrc` sans demander
- ❌ Suggérer Docker à un user qui demande pourquoi pas de DB locale (le kit est cloud-only par décision)
- ❌ Installer Node via Homebrew si l'user est sur Windows / Linux (utiliser nodejs.org)
- ❌ Cacher les erreurs avec `|| true` ou `2>/dev/null` (sauf pour les probes Phase 0)
- ❌ Réécrire `.env.local` complet — toujours `Edit` ligne par ligne après avoir lu le fichier
- ❌ Continuer la phase suivante si la précédente est rouge
- ❌ Coller des API keys dans la réponse visible (toujours via Edit dans `.env.local`)

## Notes pour les forks

Ce skill est bundlé dans le starter mais peut diverger par fork :
- Si ton fork retire Bictorys / Banani / etc. via [PRUNING.md](../../../PRUNING.md), mets à jour la Phase 6 pour ne plus proposer ces options.
- Si ton fork ajoute un provider (Stripe, Paystack, etc.), ajoute-le en Phase 6.
- Le manifeste machine-lisible vit dans [.planning/features.json](../../../.planning/features.json) — un futur enhancement de cette skill pourrait dériver Phase 6 automatiquement de ce JSON.
