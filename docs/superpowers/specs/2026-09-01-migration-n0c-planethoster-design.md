# Migration hébergement + base de données : Vercel/Neon → PlanetHoster N0C (World)

**Date :** 2026-09-01
**Statut :** Design validé — en attente de relecture avant plan d'implémentation
**Type :** Architectural (change l'infrastructure transverse : runtime, cron, déploiement, base de données)

## Contexte

Le starter tourne aujourd'hui sur **Vercel** (serverless) + **Neon** (Postgres managé), avec Upstash Redis, Cloudinary, Brevo, Bictorys et Sentry comme services HTTP externes.

Objectif : déplacer **l'hébergement** et **la base de données** vers un compte **PlanetHoster N0C (offre World, mutualisé)**. Les autres services externes ne bougent pas.

### Capacités N0C confirmées par l'utilisateur

- **PostgreSQL** disponible dans le panel N0C (section Bases de données).
- **Gestionnaire d'applications Node.js**, Node **v24** max, via CloudLinux Selector + **Passenger**.
- **Accès SSH** activé.
- **Cron** via le panel N0C (syntaxe cron standard, curl/wget/php). N0C déconseille l'exécution *every-minute* en journée.

### Décisions de cadrage

| Sujet | Décision |
|---|---|
| Exécution Next.js | Sortie `output: 'standalone'` + wrapper Passenger `app.js` (approche A) |
| Déploiement | CI/CD GitHub Actions : build → `rsync` SSH → `prisma migrate deploy` → restart Passenger |
| Reprise de données | **Aucune** — base neuve, `prisma migrate deploy` sur base vide |
| Vercel | **Retiré complètement** après 48 h de stabilité sur N0C |
| Crons fréquents (`outbox-drain`, `email-queue-drain`) | Passent de 1 min à **5 min** |
| Redis / Cloudinary / Brevo / Bictorys / Sentry | **Inchangés** (Upstash conservé) |
| Tripwire `deploy-shape.test.ts` | **Ajouté** |

## Approches envisagées

- **A — `output: 'standalone'` + wrapper Passenger** *(retenue)* : upload ~30-50 Mo, aucun `pnpm install` applicatif sur le serveur, redémarrages rapides, chemin idiomatique N0C. Contre : servir `.next/static` + `public` demande que la CI place ces dossiers à la racine de l'app.
- **B — `next start` + `node_modules` complet** : comportement le plus proche de Vercel, mais upload/install de centaines de Mo, pression sur le quota d'inodes du mutualisé, redémarrages lents. Rejetée.
- **C — standalone sous PM2 + reverse-proxy** : le mutualisé CloudLinux tue les process longs hors gestionnaire d'applications. Rejetée.

## Architecture cible

### Arborescence sur N0C

Application Node.js créée depuis le panel N0C :
- *Application Root* : `~/apps/habitatafriko`
- *Application Startup File* : `app.js`
- *Node version* : 24
- *Environment* : Production

```
~/apps/habitatafriko/
├── app.js                     # point d'entrée Passenger (nouveau, versionné)
├── node_modules/              # @prisma/client + prisma (résolus par le standalone interne)
├── frontend/
│   ├── server.js              # depuis .next/standalone/frontend/ (rsync CI)
│   ├── .next/
│   │   ├── standalone/        # (contenu aplati à la racine par la CI)
│   │   └── static/            # assets buildés (rsync CI)
│   ├── public/                # assets publics (rsync CI)
│   └── prisma/                # schema + migrations (pour `migrate deploy`)
├── .env                       # secrets, créé une fois via SSH, jamais commité
└── tmp/restart.txt            # touch = redémarrage Passenger
```

### Point d'entrée Passenger — `app.js`

**Nuance monorepo pnpm :** dans un workspace, `next build` place le serveur standalone sous `frontend/.next/standalone/frontend/server.js` avec les `node_modules` à `frontend/.next/standalone/node_modules`. La CI aplatit ça : le contenu de `.next/standalone/` est copié à la racine de `deploy/` en préservant cette structure, et `app.js` (versionné à la racine du repo) référence `./frontend/server.js`. Le chemin exact est figé par un test de la CI (étape 4) avant le premier déploiement.

Next `standalone` génère un `server.js` qui écoute sur `process.env.PORT` / `process.env.HOSTNAME`. Passenger fournit le port via un socket Unix. `app.js` :

- charge `.env` si Passenger ne l'a pas fait (`require('dotenv').config()` défensif) ;
- `process.env.NODE_ENV ||= 'production'` ;
- `process.env.HOSTNAME ||= '127.0.0.1'` (le serveur standalone plante si `HOSTNAME` vaut une valeur non résolvable) ;
- `require('./frontend/server.js')` — le serveur standalone Next sert l'application **et** `.next/static` + `public` dès lors que ces dossiers sont présents au bon niveau (garanti par la CI, cf. étape 4) ;
- ne touche pas à `instrumentation.ts` : Next appelle `register()` au boot du serveur standalone, donc Sentry s'initialise normalement.

`frontend/next.config.ts` : ajout de `output: 'standalone'`. Aucun autre changement de config.

### Base de données

- Base + rôle créés depuis le panel N0C.
- `DATABASE_URL = postgresql://<user>:<pwd>@localhost:5432/<db>?schema=public&connection_limit=5`
  - `connection_limit` bas **obligatoire** : le mutualisé plafonne les connexions concurrentes, pas de PgBouncer disponible ici.
  - **Risque à lever au 1er déploiement** : si N0C n'expose Postgres qu'en socket Unix (pas de TCP `localhost`), adapter l'URL (`host=/var/run/postgresql` ou chemin fourni par le panel).
- `frontend/prisma/schema.prisma` **inchangé** (`provider = "postgresql"`). `pg_advisory_xact_lock(hashtext(...))` et les transactions `Serializable` fonctionnent sur un Postgres standard → invariants retraits (`withdrawals/lock.ts`) et idempotence webhook (`webhook/handler.ts`) préservés sans modification.
- Application du schéma : la CI exécute `pnpm --filter frontend exec prisma migrate deploy` par SSH après l'upload, avant le restart. Base vide au départ.

### Crons (panel N0C)

Chaque cron appelle la route HTTPS correspondante avec le `CRON_SECRET` :

```
curl -fsS -m 30 -H "Authorization: Bearer <CRON_SECRET>" https://<domaine>/api/cron/<name> >/dev/null 2>&1
```

| Route | Fréquence Vercel | Fréquence N0C |
|---|---|---|
| `outbox-drain` | 1 min | ***/5 min** |
| `email-queue-drain` | 1 min | ***/5 min** |
| `order-expiration` | 5 min | 5 min |
| `verification-cleanup` | horaire | horaire |
| `webhook-log-purge` | quotidien | quotidien (nuit) |
| `email-job-purge` | quotidien | quotidien (nuit) |

- `verifyCronSecret` et les handlers `app/api/cron/*` **inchangés**.
- `frontend/vercel.json` : suppression de la section `crons` (le fichier peut être supprimé entièrement s'il ne contient plus rien d'utile).
- `docs/deploy/n0c-crons.md` : les 6-7 lignes cron exactes à coller dans le panel N0C.

Conséquence fonctionnelle acceptée : latence outbox / file d'e-mails jusqu'à ~5 min au lieu de ~1 min.

### Variables d'environnement

`.env` créé **une seule fois** par SSH dans `~/apps/habitatafriko/`, jamais commité. Passenger charge `.env` à l'*Application Root* automatiquement ; `app.js` a un `require('dotenv').config()` défensif en secours.

Inventaire (repris de Vercel, `DATABASE_URL` nouveau) : `DATABASE_URL`, `JWT_SECRET`, `COOKIE_PREFIX`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDINARY_*`, `BREVO_*`, `BICTORYS_API_KEY`, `BICTORYS_PRIVATE_KEY`, `BICTORYS_*` (webhook), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (→ nouveau domaine), `SENTRY_DSN`, `NEXT_PUBLIC_*`.

Secrets GitHub Actions (déploiement uniquement, aucun secret applicatif) : `N0C_SSH_HOST`, `N0C_SSH_USER`, `N0C_SSH_KEY` (clé privée dédiée), `N0C_APP_PATH`. Les `NEXT_PUBLIC_*` nécessaires au build sont ajoutés comme secrets CI si besoin.

### Pipeline GitHub Actions — `.github/workflows/deploy-n0c.yml`

Déclencheur : `push` sur `main` + `workflow_dispatch`.

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` — bloquant
3. `pnpm build` (`output: 'standalone'`)
4. Assemblage `deploy/` (un test échoue si un chemin source attendu manque) :
   - `frontend/.next/standalone/*` → racine de `deploy/` (conserve le sous-dossier `frontend/` interne)
   - `frontend/.next/static` → `deploy/frontend/.next/static`
   - `frontend/public` → `deploy/frontend/public`
   - `frontend/prisma/` (schema + migrations) → `deploy/frontend/prisma/`
   - `app.js` → `deploy/app.js`
5. `rsync -az --delete` `deploy/` → `N0C_APP_PATH` par SSH (exclut `.env`, `tmp/`)
6. SSH : `cd $N0C_APP_PATH/frontend && npx prisma migrate deploy` (utilise `node_modules/prisma` + `DATABASE_URL` du `.env`)
7. SSH : `mkdir -p tmp && touch tmp/restart.txt`
8. Smoke check : `curl -f https://<domaine>/` (ou `/api/health` si créée)

**Rollback :** `rsync` idempotent → `git revert` + re-push redéploie l'état précédent. Migrations Prisma non auto-rollback : convention migrations toujours additives (déjà la norme du starter).

**Gestion d'erreur :** toute étape 2-8 en échec fait échouer le job avant `restart.txt` → l'app en production reste sur la version précédente (déploiement atomique côté restart).

### Bascule DNS & retrait Vercel

1. Déploiement complet sur sous-domaine temporaire (URL N0C par défaut ou `staging.<domaine>`) — validation bout en bout.
2. TTL DNS abaissé à 300 s ~24 h avant bascule.
3. Jour J : `A` / `CNAME` du domaine principal → N0C. SSL Let's Encrypt via panel N0C (auto).
4. Repointer l'URL de webhook Bictorys vers le nouveau domaine (dashboard Bictorys). Mettre à jour `GOOGLE_REDIRECT_URI` + la console Google Cloud.
5. Vérification : signup → verify-email → login ; upload Cloudinary ; webhook Bictorys ; un cron déclenché manuellement.
6. Après 48 h stables : suppression du projet Vercel, retrait `frontend/vercel.json`, purge des variables d'env Vercel.
7. `README.md` + `CLAUDE.md` : remplacer les mentions Vercel (Cron, deploy) par la procédure N0C.

## Tests & vérification

- `pnpm test` (555 unit tests) reste vert — aucun code serveur métier modifié.
- **Nouveau tripwire** `frontend/src/lib/server/observability/deploy-shape.test.ts` :
  - vérifie que `frontend/next.config.ts` contient `output: 'standalone'` ;
  - vérifie que `app.js` existe à l'emplacement attendu.
- Tripwires de doc existants (`*shape.test.ts`) : n'imposent que « pas de backend legacy » + inventaire des routes cron + `runtime=nodejs` → aucun ne casse (les routes cron restent, seule leur planification externe change).
- UAT manuel post-bascule : `pnpm smoke:auth` contre le domaine N0C.
- Vérif Passenger : `touch tmp/restart.txt`, charger `/`, logs via panel N0C (mode dev temporaire dans `.htaccess` si erreur au boot).

## Fichiers touchés

**Nouveaux**
- `app.js` — point d'entrée Passenger
- `.github/workflows/deploy-n0c.yml` — pipeline de déploiement
- `docs/deploy/n0c-setup.md` — création de l'app Node.js, base Postgres, `.env`, SSL
- `docs/deploy/n0c-crons.md` — lignes cron exactes pour le panel
- `frontend/src/lib/server/observability/deploy-shape.test.ts` — tripwire

**Modifiés**
- `frontend/next.config.ts` — ajout `output: 'standalone'`
- `frontend/vercel.json` — suppression section `crons` (ou suppression du fichier)
- `README.md`, `CLAUDE.md` — section deploy / cron : Vercel → N0C
- `.gitignore` — `deploy/`, `.env`

**Aucun fichier protégé touché** — `auth.ts`, `crypto.ts`, `logger.ts`, `redis.ts`, `webhook/handler.ts`, `payments/circuit-breaker.ts`, `oauth/google.ts`, `outbox/dispatcher.ts`, `admin/audit.ts`, `middleware/*`, `observability/request-context.ts`, `instrumentation.ts`, `lib/api.ts` restent intacts.

## Risques ouverts (à lever pendant l'implémentation)

1. **Postgres TCP vs socket** sur N0C — adapter `DATABASE_URL` au 1er déploiement.
2. **Passenger + Next.js standalone** — le wrapper `app.js` peut demander un ajustement (variable `PORT` reçue comme chemin de socket) ; tester tôt sur le sous-domaine.
3. **Limite de connexions Postgres du mutualisé** — `connection_limit=5` en point de départ, à ajuster selon le plan.
4. **Quota d'inodes / taille disque** du plan World — vérifier que `.next/standalone` + `node_modules` Prisma tiennent dans le quota.
5. **Fréquence cron** — si N0C bride sous 5 min ou envoie des alertes, basculer certains crons en `*/10`.
