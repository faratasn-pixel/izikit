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
