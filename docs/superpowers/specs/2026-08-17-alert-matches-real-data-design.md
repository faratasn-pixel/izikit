# Alertes secteur — correspondances réelles + suivi de consultation

Date: 2026-08-17

## Contexte

`/alertes` (liste) affiche une section "Correspondances récentes" et deux
stats ("Correspondances ce mois", "Annonces consultées") qui sont **toutes
codées en dur** (`MOCK_MATCHES`, `monthlyMatches = 14`, `viewedListings =
38` dans `frontend/src/app/alertes/page.tsx`), sans lien avec les vraies
alertes de l'utilisateur.

`/alertes/[id]` (détail) est déjà correctement branché au backend pour les
alertes réelles (`apiAlert.matches` vient de `GET /api/alerts/[id]`), sauf
sa stat "Annonces consultées" qui reste hardcodée à `0`
(`frontend/src/app/alertes/[id]/page.tsx:158`) — aucun suivi de
consultation n'existe en base.

Décisions validées avec l'utilisateur :
- "Correspondance" = une `PropertyRequest` (demande immobilière) qui
  matche une alerte, **pas** une nouvelle annonce (`Listing`) — cohérent
  avec le moteur de matching existant (`frontend/src/lib/server/alerts/matching.ts`)
  et avec ce que `/alertes/[id]` affiche déjà.
- La stat renommée **"Demandes consultées"** (pas "Annonces consultées") —
  reflète qu'on compte des demandes, pas des annonces.
- Le marquage "consulté" est déclenché par un clic explicite sur "Voir la
  demande" (lien vers `/demandes/[id]`), pas par le simple affichage de la
  liste.
- "Correspondances ce mois" = mois calendaire (1er du mois courant → 
  aujourd'hui), pas 30 jours glissants.

## Design

### 1. Schéma Prisma

`frontend/prisma/schema.prisma`, modèle `AlertMatch` (ligne ~586) : ajouter
un champ nullable, migration additive (pas de backfill — tout l'existant
reste `null` = "jamais consulté") :

```prisma
model AlertMatch {
  id                String          @id @default(cuid())
  alertId           String
  alert             Alert           @relation(fields: [alertId], references: [id], onDelete: Cascade)
  propertyRequestId String
  propertyRequest   PropertyRequest @relation(fields: [propertyRequestId], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())
  viewedAt  DateTime?

  @@unique([alertId, propertyRequestId])
  @@index([alertId, createdAt])
}
```

Migration SQL (`ADD COLUMN "viewedAt" TIMESTAMP(3)`, nullable, no backfill
needed).

### 2. API — marquer une correspondance comme consultée

Nouveau : `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.ts`

`PATCH` — body `{ viewed: true }` (Zod: `z.object({ viewed: z.literal(true) })`,
seule valeur valide pour l'instant — pas de "un-view"). Vérifie
`requireAuth`, charge le `AlertMatch` par `matchId`, vérifie
`match.alertId === id` ET que l'alerte parente appartient à
`auth.user.sub` (404 sinon, même convention que le reste des routes
`/api/alerts/*`). Si `viewedAt` est déjà défini, ne pas l'écraser
(idempotent — garde la première date de consultation). Retourne
`{ match: { id, viewedAt } }`.

### 3. API — correspondances récentes agrégées (toutes alertes)

Nouveau : `frontend/src/app/api/alerts/matches/recent/route.ts`

`GET` — `requireAuth`, `limit` query param (défaut 5, clamp comme
`clampLimit` existant si adapté, sinon `Math.min(Number(limit) || 5, 20)`).

Requête : tous les `AlertMatch` dont `alert.userId === auth.user.sub`,
triés par `createdAt desc`, `take: limit`, avec `select` incluant l'alerte
parente (`id`, `name`) et la `propertyRequest` (mêmes champs que
`REQUEST_SELECT` dans `matching.ts` : `id, transactionType, propertyType,
country, city, budgetMin, budgetMax, clientName, createdAt`), plus
`viewedAt`.

En parallèle (`Promise.all`, même pattern que `GET /api/alerts`) :
- `monthlyCount` : `prisma.alertMatch.count({ where: { alert: { userId },
  createdAt: { gte: <1er du mois calendaire courant, UTC> } } })`.
- `viewedCount` : `prisma.alertMatch.count({ where: { alert: { userId },
  viewedAt: { not: null } } })`.

Réponse : `{ items: AlertMatchWithAlert[], monthlyCount: number,
viewedCount: number }`.

### 4. Types frontend (`frontend/src/lib/alerts.ts`)

```typescript
export interface AlertMatchItem {
  id: string;
  createdAt: string;
  viewedAt: string | null; // NEW
  propertyRequest: AlertMatchRequest;
}

export interface RecentAlertMatch extends AlertMatchItem { // NEW
  alertId: string;
  alertName: string;
}
```

`AlertDetail` (via `AlertListItem`) inchangé de forme, juste `matches:
AlertMatchItem[]` qui gagne `viewedAt`.

### 5. UI `/alertes` (liste) — `frontend/src/app/alertes/page.tsx`

- Supprimer `MOCK_MATCHES` et l'import `RecentMatch`/mock-data associé.
- Nouveau `useEffect` (ou fusionné avec l'existant via `Promise.all`) qui
  fetch `GET /api/alerts/matches/recent?limit=5` → state
  `{ items: RecentAlertMatch[], monthlyCount: number, viewedCount: number }`.
- `monthlyMatches` (ligne 162) → `recent.monthlyCount`.
- `viewedListings` (ligne 163) → `recent.viewedCount`, **libellé changé**
  de "Annonces consultées" à "Demandes consultées" (ligne ~226).
- Section "Correspondances récentes" (lignes 439-517) : remplacer le
  `.map(MOCK_MATCHES)` par `.map(recent.items)`, afficher les champs réels
  de `propertyRequest` (nom client, ville, budget, type transaction —
  même formatage que `/alertes/[id]`) avec une icône `FileSearch` à la
  place de `<img>` (pas de photo pour une demande). Le bouton "Voir" (Eye,
  actuellement `disabled`) devient un `Link` actif vers `/demandes/[id]`
  qui déclenche le PATCH avant navigation (voir §7).
- Le badge "Nouvelle" utilise `isToday(item.createdAt)` (réutiliser la
  même fonction que `/alertes/[id]`, à extraire si besoin dans
  `frontend/src/lib/alerts.ts` pour éviter la duplication).

### 6. UI `/alertes/[id]` (détail) — `frontend/src/app/alertes/[id]/page.tsx`

- `stats.viewed` (ligne 158, actuellement hardcodé `0`) →
  `apiAlert.matches.filter((m) => m.viewedAt !== null).length`.
- Libellé mini-stat "Annonces consultées" (ligne 366) → "Demandes
  consultées".
- Le lien "Voir la demande" (Eye, lignes 519-527, déjà actif) déclenche le
  PATCH avant/pendant la navigation (voir §7).

### 7. Déclenchement du marquage "consulté"

Petit helper partagé (ex. dans `frontend/src/lib/alerts.ts` ou un nouveau
petit fichier `frontend/src/lib/server` n'est pas nécessaire ici — c'est
client-side) :

```typescript
async function markMatchViewed(alertId: string, matchId: string) {
  try {
    await api(`/api/alerts/${alertId}/matches/${matchId}`, {
      method: 'PATCH',
      body: { viewed: true },
    });
  } catch {
    // best-effort — ne bloque jamais la navigation vers la demande
  }
}
```

Sur le lien "Voir la demande" : `onClick={() => void markMatchViewed(alertId, matchId)}`
sur un `<Link>` normal (la navigation continue immédiatement, le PATCH part
en fire-and-forget — cohérent avec "best-effort" déjà utilisé pour
email/SMS dans `matching.ts`).

### Hors scope

- Pas de bouton "un-view" / marquer comme non-consulté.
- Pas de pagination sur `/api/alerts/matches/recent` (juste un `limit`,
  toujours les N plus récentes).
- `PropertyRequest` lui-même ne gagne aucun champ — le suivi de vue est
  scopé à `AlertMatch` (une demande consultée via une alerte spécifique),
  pas un compteur de vues global sur la demande.

## Tests

- `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.test.ts` :
  PATCH marque `viewedAt`, idempotent (deuxième appel ne change pas la
  date), 404 si le match n'appartient pas à l'utilisateur, 404 si
  `matchId` inexistant.
- `frontend/src/app/api/alerts/matches/recent/route.test.ts` : retourne
  les items triés par date desc, `monthlyCount` ne compte que le mois
  calendaire courant, `viewedCount` ne compte que les `viewedAt` non-null,
  scoping par `userId` (n'inclut pas les matches d'un autre utilisateur).

## Checklist avant merge

`pnpm format && pnpm lint && pnpm typecheck && pnpm test` doivent passer.
