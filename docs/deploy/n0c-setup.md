# Mise en ligne sur PlanetHoster N0C — runbook

## 0. Prérequis
- Plan World avec : PostgreSQL activé, gestionnaire d'applications Node.js (Node 24), SSH activé.
- Accès au panel N0C (https://mg.n0c.com) et au repo GitHub (droits sur les secrets Actions).

> **Base neuve — aucune reprise de données.** On applique les migrations Prisma sur une base vide ; il n'y a pas de `pg_dump` d'un ancien hébergeur vers N0C. Les comptes / commandes existants ne sont pas repris (décision de cadrage).

## 1. Base de données
1. Panel N0C → Bases de données → PostgreSQL → créer une base + un utilisateur, noter user / mot de passe / nom de base.
2. Construire la chaîne : `postgresql://USER:PWD@localhost:5432/DB?schema=public&connection_limit=5`.
   - `DATABASE_URL` **et** `DIRECT_URL` prennent la **même valeur** (le Postgres N0C n'est pas poolé).
   - Si la connexion TCP `localhost` échoue au step 5 : Prisma exige quand même une autorité factice dans l'URL (`USER:PWD@localhost`) — ne pas retirer host+port, mais **ajouter** le paramètre `?schema=public&connection_limit=5&host=/var/run/postgresql` (socket Unix, ou le chemin donné par le panel).

## 2. Application Node.js
1. Panel N0C → Applications Node.js → Créer :
   - Application root : `~/apps/habitatafriko`
   - Startup file : `app.js`
   - Node version : 24
   - Environment : Production
2. Noter le chemin absolu de l'app root (ex. `/home/USER/apps/habitatafriko`) → c'est `N0C_APP_PATH`.
3. Noter l'URL par défaut de l'app → `N0C_DEPLOY_URL` (temporaire jusqu'à la bascule DNS).

## 3. Variables d'environnement de l'app (runtime)

L'app en cours d'exécution lit ses variables depuis l'**UI du panel N0C** : Applications Node.js → ton app → **« Environment variables »**. C'est le mécanisme fiable — Passenger les injecte dans le process (`app.js` ne charge plus aucun `.env` lui-même).

```bash
ssh USER@HOST
mkdir -p ~/apps/habitatafriko
```

Clés runtime à renseigner dans l'UI du panel : `DATABASE_URL`, `DIRECT_URL` (même valeur), `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `COOKIE_PREFIX`, `APP_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDINARY_*`, `BREVO_API_KEY`, `EMAIL_FROM`, `BICTORYS_API_KEY`, `BICTORYS_PRIVATE_KEY`, `BICTORYS_WEBHOOK_SECRET`, `BICTORYS_MERCHANT_SECRET_CODE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (→ nouveau domaine), `SENTRY_DSN`.

> ⚠️ **`COOKIE_PREFIX` (runtime, ci-dessus) et `NEXT_PUBLIC_COOKIE_PREFIX` (build-time, cf. §4) DOIVENT avoir la même valeur.** Sinon le cookie CSRF côté serveur et côté navigateur portent des noms différents → chaque mutation renvoie 403.

En plus de l'UI du panel, il faut un **fichier `.env` à `$N0C_APP_PATH/.env`** (PAS `.../frontend/.env`) : l'étape « Prisma migrate deploy » du workflow le source pour donner `DATABASE_URL` + `DIRECT_URL` au process de migration. Le garder synchronisé avec l'UI pour ces deux clés au minimum.

```bash
nano ~/apps/habitatafriko/.env      # au minimum : DATABASE_URL + DIRECT_URL (valeurs identiques)
```

## 4. Clé SSH de déploiement + secrets GitHub
```bash
ssh-keygen -t ed25519 -f ~/.ssh/n0c_deploy -N ""
cat ~/.ssh/n0c_deploy.pub >> ~/.ssh/authorized_keys   # sur le serveur N0C
```

### 4.1 Secrets (GitHub → Settings → Secrets and variables → Actions → *Secrets*)
- `N0C_SSH_HOST` = hôte SSH N0C
- `N0C_SSH_USER` = user SSH
- `N0C_SSH_KEY` = contenu de `~/.ssh/n0c_deploy` (clé privée)
- `N0C_APP_PATH` = chemin app root (step 2.2)
- `N0C_DEPLOY_URL` = URL app par défaut (step 2.3)
- `N0C_NODE_ACTIVATE` = chemin absolu du script d'activation nodevenv CloudLinux. Le SSH non interactif n'a ni `node` ni `npx` dans le `PATH` tant que ce script n'est pas sourcé. Le trouver après avoir créé l'app Node.js (step 2) :
  ```bash
  ls ~/nodevenv/*/24/bin/activate
  # ex. /home/USER/nodevenv/apps_habitatafriko/24/bin/activate
  ```
- `NEXT_PUBLIC_SENTRY_DSN` = DSN Sentry navigateur (si Sentry client activé ; sinon laisser vide).

### 4.2 Variables build-time (GitHub → *Variables*, valeurs non secrètes inlinées dans le bundle client)
Les `NEXT_PUBLIC_*` sont **inlinées au moment du `next build`** — GitHub Actions ne les transmet pas automatiquement, l'étape « Build » du workflow les mappe explicitement depuis ces entrées :
- `NEXT_PUBLIC_COOKIE_PREFIX` — **doit être identique** à `COOKIE_PREFIX` (runtime, §3)
- `NEXT_PUBLIC_API_URL` — vide pour un monolithe same-origin
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_SAMPLE_RATE` — optionnels (Sentry client)

## 5. Premier déploiement
1. Lancer le workflow : GitHub → Actions → « Deploy to PlanetHoster N0C » → Run workflow (branche `main`).
2. **`ls -la $N0C_APP_PATH`** avant le premier déploiement avec `--delete` : noter tout fichier déposé par le panel (`.htaccess`, symlink `node_modules`, `passenger_wsgi.py`, `tmp/`…). Ajouter un `--exclude=` dans l'étape « Rsync to N0C » du workflow pour chaque entrée qui n'est **pas** produite par la CI. Le workflow exclut déjà `.env`, `tmp/` et `.htaccess`.
3. Si le job échoue à « Prisma migrate deploy » avec une erreur de connexion → ajuster `DATABASE_URL`/`DIRECT_URL` (socket vs TCP, cf. §1) dans `~/apps/habitatafriko/.env` **et** dans l'UI du panel, relancer.
4. Si le premier appel DB renvoie `Query engine ... rhel-openssl-... could not be found` → `openssl version` sur le serveur, ajuster `binaryTargets` dans `frontend/prisma/schema.prisma` (`rhel-openssl-1.0.x` / `1.1.x` / `3.0.x` selon la version OpenSSL), recommit, relancer le workflow.
5. Si l'app ne boote pas (502 Passenger) → activer le mode dev dans le `.htaccess` de l'app (`PassengerAppEnv development`), recharger, lire l'erreur dans les logs du panel, corriger, remettre `production`.
6. Vérifier : `curl -I https://<N0C_DEPLOY_URL>/` → 200.

## 6. Crons
Suivre `docs/deploy/n0c-crons.md` — créer les 6 tâches dans le panel N0C.
Puis, test manuel : depuis le panel, exécuter `outbox-drain` une fois, vérifier le code retour 200.

## 7. Bascule DNS
1. Baisser le TTL DNS du domaine à 300 s, attendre la propagation (~24 h).
2. Panel N0C : ajouter le domaine de production à l'application, générer le certificat Let's Encrypt.
3. Pointer l'enregistrement `A`/`CNAME` du domaine vers N0C.
4. Mettre à jour `GOOGLE_REDIRECT_URI` (UI du panel + `.env`) + la console Google Cloud (URL de redirection autorisée).
5. Repointer l'URL de webhook Bictorys vers `https://<domaine>/api/webhooks/bictorys`.
6. `touch ~/apps/habitatafriko/tmp/restart.txt`.

## 8. Vérification post-bascule
```bash
SMOKE_BASE_URL=https://<domaine> pnpm smoke:auth
```
Puis, test manuel : signup → verify-email → login ; upload Cloudinary ; paiement test Bictorys (webhook reçu) ; un cron déclenché à la main.

## 9. Retrait de l'ancien hébergement
⚠️ Avant de supprimer l'ancien environnement (Vercel/Neon ou autre) : **la migration ne reprend PAS les données.** Si l'ancien environnement contient des données réelles à conserver, fais un `pg_dump` et un plan de reprise **AVANT** cette étape.

Après 48 h stables : supprimer l'ancien projet et purger ses variables d'environnement.

## 10. Rollback
- **Code seul** : GitHub → Actions → « Deploy to PlanetHoster N0C » → **Run workflow**, en ciblant un commit / une ref antérieurs (le trigger `workflow_dispatch` accepte une ref). Le workflow re-rsync le bundle de cette ref et redémarre Passenger.
- **Migration fautive** : sur le serveur, env sourcé comme dans l'étape « Prisma migrate deploy » du workflow (`source $N0C_NODE_ACTIVATE` ; `set -a; . $N0C_APP_PATH/.env; set +a`), puis :
  ```bash
  cd "$N0C_APP_PATH/frontend"
  npx --yes prisma@5.22.0 migrate resolve --rolled-back <migration_name>
  ```
  puis redéployer la ref antérieure.
- Les migrations du projet sont censées être **additives** (norme du projet), donc un rollback code-seul est généralement sûr sans rollback DB.

## Valeurs relevées sur l'environnement actuel (node210-eu.n0c.com, compte yktzqjpndr)
- `N0C_SSH_HOST` = `node210-eu.n0c.com` — **port SSH 5022** (le workflow lit `vars.N0C_SSH_PORT`, défaut `5022`).
- `N0C_APP_PATH` = `/home/yktzqjpndr/apps/habitatafriko`
- `N0C_NODE_ACTIVATE` = `/home/yktzqjpndr/nodevenv/apps/habitatafriko/24/bin/activate`
- `N0C_DEPLOY_URL` = `https://habitatafrik.izichop.xyz`
- **OpenSSL 1.1.1k** → `binaryTargets = ["native", "rhel-openssl-1.1.x"]` dans `frontend/prisma/schema.prisma` (déjà appliqué).
- `.htaccess` Passenger : dans `~/habitatafrik/` (docroot du sous-domaine), **pas** dans l'app root → `rsync --delete` sur l'app root ne l'affecte pas.
- App root géré par le panel : `app.js` (stub par défaut, écrasé par la CI), `public/` (Passenger sert le statique depuis là → `rsync` l'exclut + `mkdir -p public` au restart), `tmp/restart.txt`.

## Points encore à vérifier au 1er déploiement
- **TCP `localhost` vs socket Unix** pour Postgres — si `migrate deploy` échoue en connexion, ajouter `&host=/var/run/postgresql` à `DATABASE_URL`/`DIRECT_URL` (cf. §1), dans le `.env` **et** l'UI du panel.
- **`node_modules` symlink** éventuellement recréé par le panel dans l'app root après un restart — `ls -la $N0C_APP_PATH` ; si présent, `--exclude='node_modules'` casserait le bundle standalone (qui embarque son propre `node_modules`), donc au contraire **laisser** la CI l'écraser.
