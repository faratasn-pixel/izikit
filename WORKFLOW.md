# Workflow — du clone au SaaS livré

> **🤖 IA qui lit ceci pour un débutant** : lis ce fichier + [CLAUDE.md](CLAUDE.md), puis demande au débutant où il en est (a-t-il fait `/setup-kit` ? a-t-il une idée écrite ? a-t-il un design Banani ?) et guide-le. Ne fais rien sans validation explicite.

> **👤 Débutant** : ouvre le repo dans Claude Code, tape **`/setup-kit`**, puis décris ce que tu veux. C'est tout.

L'objectif : **vibe coding**. Tu clones, tu plug une DB Neon, tu parles à Claude, tu shippes. Pas de méthodo à apprendre, pas de slash commands à mémoriser.

---

## Étape 1 — `/setup-kit`

Un seul point d'entrée. La skill [.claude/skills/setup-kit/SKILL.md](.claude/skills/setup-kit/SKILL.md) audite ton environnement (Node, pnpm, gh CLI), te fait installer 2 plugins Claude Code (superpowers + context-mode — paste-ready), créer un Neon Postgres gratuit (la **seule** dépendance obligatoire — le kit est cloud-only, pas de Docker), génère les secrets, lance `pnpm install` + applique les migrations Prisma. Puis te demande d'ouvrir un second terminal pour `pnpm dev`.

Sortie : `pnpm dev` boote vert, `pnpm smoke:auth` passe.

---

## Étape 2 — Décris ce que tu veux à Claude

Dans Claude Code, dis simplement ce que tu construis :

> *« Je veux un SaaS de gestion de cagnottes pour le Sénégal. Page d'accueil avec un bouton "Créer une cagnotte", dashboard utilisateur, page publique partageable. Les contributions passent par Wave/Orange Money. »*

Claude code à partir de ta description. Les 40 routes API du starter (auth, paiements, admin, webhooks, cron, uploads) sont déjà câblées — tu n'as qu'à parler de **ton produit**, pas du plumbing.

**Si tu as un design Banani** : sélectionne tes écrans dans Banani, dis *« reproduis ces écrans-là »* et active le skill [`banani-design-implementation`](.claude/skills/banani-design-implementation/SKILL.md) (déjà bundlé) — il lit ta sélection MCP et reproduit pixel-perfect.

**Si tu n'as pas de design** : Claude propose une UI Tailwind/shadcn-style à partir de ta description. Tu itères jusqu'à ce que ça te plaise.

---

## Étape 3 — Déploie sur Vercel

Quand `pnpm dev` te plaît :

> *« Déploie mon app sur Vercel. »*

Claude pousse sur GitHub, importe le repo dans Vercel via leur UI, te demande de coller chaque env var (jamais via terminal pour les secrets), vérifie que `DATABASE_URL` est sur `-pooler` Neon, vérifie les 5 crons dans `vercel.json`, et te donne l'URL de prod.

**Variables non-négociables en prod** : `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`. Tout le reste (Brevo, Cloudinary, Bictorys, Google OAuth, Sentry, Upstash) est optionnel et inerte quand absent.

---

## Surfaces optionnelles

| Surface | Activer = | Désactiver = |
|---|---|---|
| Paiements (Bictorys) | Remplir `BICTORYS_*` | `/api/orders` 404 |
| OAuth Google | Remplir `GOOGLE_*` | `/api/auth/oauth/google/*` 404 |
| Uploads (Cloudinary) | Remplir `CLOUDINARY_*` | `/api/upload` 503 |
| Email Brevo | Remplir `BREVO_API_KEY` | jobs s'accumulent dans la queue |
| Sentry | Remplir `SENTRY_DSN` | no-op |
| Upstash Redis | Remplir `UPSTASH_*` | fallback in-memory |

Manifeste détaillé dans [.planning/features.json](.planning/features.json). Protocole de suppression atomique dans [PRUNING.md](PRUNING.md).

---

## Pour aller plus loin (level up)

Quand ton projet devient sérieux (multi-sessions, dette technique, plusieurs contributeurs), regarde **GSD** — un workflow de gestion par phases avec commits atomiques : `npx get-shit-done-cc@latest`. Ce n'est **pas** requis pour shipper ton premier MVP. Le vibe coding suffit pour 90% des cas.
