# Visites programmées — brancher des données réelles

## Contexte

`/visites` (`frontend/src/app/visites/page.tsx`) est aujourd'hui une reproduction
pixel-perfect du mockup Banani "Visites Programmées", entièrement statique :
tableaux `CALENDAR_DAYS`, `TODAY_VISITS`, `UPCOMING_VISITS`, `ALL_VISITS` en dur
dans le fichier, tous les boutons d'action désactivés ("Bientôt disponible").

Objectif : remplacer ces données par un vrai modèle `Visit` en base, avec CRUD
complet et un calendrier mensuel réellement navigable.

## Modèle de données

Une visite naît toujours de la conversion d'un `ListingInquiry` existant (pas de
saisie libre de coordonnées client). Ce choix évite de dupliquer
nom/téléphone/email/bien — déjà portés par `ListingInquiry` → `Listing`. Il active
aussi au passage `ListingInquiry.status = 'VISITE_PLANIFIEE'`, une valeur de
l'enum déjà déclarée mais jamais atteinte jusqu'ici.

```prisma
// Ajout dans frontend/prisma/schema.prisma, à la suite de ListingInquiry.
model Visit {
  id        String         @id @default(cuid())
  inquiryId String         @unique
  inquiry   ListingInquiry @relation(fields: [inquiryId], references: [id], onDelete: Cascade)

  scheduledAt DateTime
  type        String  @default("PRESENTIEL") // PRESENTIEL | VIRTUELLE
  status      String  @default("EN_ATTENTE")  // CONFIRMEE | EN_ATTENTE | ANNULEE
  notes       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([scheduledAt])
  @@index([status])
}
```

`ListingInquiry` gagne la relation inverse optionnelle :

```prisma
model ListingInquiry {
  // ...existing fields...
  visit Visit?
}
```

**Ownership** : pas de `userId` direct sur `Visit`. L'agent propriétaire se
déduit transitivement via `inquiry.listing.userId`, exactement la même
convention que `ListingInquiry` elle-même (`listing.userId`). Toute vérification
d'accès traverse `visit.inquiry.listing.userId` et renvoie 404 (pas 403) en cas
de mismatch ou d'inexistence — convention déjà en place sur
`PATCH /api/listings/inquiries/[id]` et `PATCH /api/listings/[id]`.

**Pourquoi `inquiryId` unique** : un `ListingInquiry` ne peut donner lieu qu'à
une seule visite planifiée à la fois. Annuler puis re-planifier réutilise la
même ligne `Visit` (`PATCH` la remet à `EN_ATTENTE`/nouvelle date) plutôt que
d'en créer une seconde — évite l'ambiguïté "plusieurs visites pour un même
contact" que ni le mockup ni la table n'anticipent.

## Endpoints

Tous sous `frontend/src/app/api/visits/`, calqués sur le pattern
`api/listings/inquiries` (mêmes imports : `requireAuth`, `verifyCsrf`,
`makeRequestContext`/`withRequestContext`, `runtime = 'nodejs'`).

### `GET /api/visits`

Liste paginée (cursor, même `pagination/paginate` helper que les inquiries) des
visites de l'agent courant, scope `{ inquiry: { listing: { userId: auth.user.sub } } }`.
Réponse : `{ items, nextCursor, stats }` où `stats` couvre le mois calendaire en
cours : `{ total, confirmees, enAttente, annulees }`. Alimente la barre de stats
(toujours visible, indépendante de l'onglet actif) et le tableau "Toutes les
visites". Supporte `?search=` (filtre côté serveur sur
`inquiry.name`/`inquiry.listing.title`, remplace le filtre client actuel) et
`?status=`.

### `GET /api/visits/calendar?year=YYYY&month=MM`

Pas de pagination — un mois ne dépasse jamais quelques dizaines de visites.
Réponse :
```json
{
  "days": [{ "day": 15, "date": "2026-08-15", "events": [{ "id", "label", "status" }] }],
  "today": [{ "id", "title", "time", "client", "status" }],
  "upcoming": [{ "id", "title", "time", "client", "status", "date" }]
}
```
`today` et `upcoming` (5 prochaines visites `scheduledAt > now`, tous mois
confondus) sont recalculés à chaque appel indépendamment de `year`/`month` —
naviguer le calendrier ne doit pas faire bouger le panneau latéral. Défaut
`year`/`month` = mois courant si absents.

### `POST /api/visits`

Body : `{ inquiryId: string, scheduledAt: string (ISO), type: 'PRESENTIEL' | 'VIRTUELLE', notes?: string }`.
Vérifie que l'inquiry appartient à une annonce de l'agent (404 sinon), qu'elle
n'a pas déjà de visite liée (409 `VISIT_ALREADY_EXISTS` sinon). Transaction :
crée `Visit` + met à jour `ListingInquiry.status = 'VISITE_PLANIFIEE'`. C'est
l'action du bouton "Planifier une visite".

### `PATCH /api/visits/[id]`

Body partiel : `{ status?, notes?, scheduledAt?, type? }` (même pattern
`.refine` "au moins un champ" que `PATCH /api/listings/inquiries/[id]`).
Ownership via `visit.inquiry.listing.userId`, 404 sinon. Alimente : l'icône
crayon (édition date/heure/type), l'icône X (annulation — `PATCH { status:
'ANNULEE' }`, pas de suppression physique). Pas de route `DELETE`.

### `GET /api/listings/inquiries` — extension

Ajout d'un paramètre optionnel `?eligibleForVisit=true` : filtre
`status != 'VISITE_PLANIFIEE' AND visit IS NULL`. Utilisé par le sélecteur
d'inquiry du formulaire "Planifier une visite" (pas de nouvel endpoint dédié).
Fichier hors liste protégée — extension directe de la route existante.

## Frontend — `frontend/src/app/visites/page.tsx`

Remplace les tableaux statiques par des fetches vers les endpoints ci-dessus au
montage (stats + table) et à chaque changement d'onglet/mois (calendrier).
Utilise le wrapper `api()` (`frontend/src/lib/api.ts`) comme le reste de l'app
— CSRF et retry GET déjà gérés, aucune logique réseau custom à écrire.

Boutons qui passent d'`disabled` à actifs :
- **Planifier une visite** → modale : sélection d'un inquiry éligible (liste
  `GET .../inquiries?eligibleForVisit=true`) + date/heure + type → `POST /api/visits`.
- **Icône crayon** (ligne du tableau) → modale d'édition → `PATCH`.
- **Icône X** (ligne du tableau) → confirmation puis `PATCH { status: 'ANNULEE' }`.
- **Icône œil** → modale lecture seule (mêmes données déjà chargées dans la ligne,
  pas de fetch supplémentaire).
- **Flèches précédent/suivant du calendrier** → change `year`/`month` en state,
  refetch `GET /api/visits/calendar`.
- **Filtres "Visites du jour" (Toutes/Confirmées/En attente)** → restent un
  filtre client-side sur la réponse `today` déjà chargée (pas de refetch).
- Recherche du tableau → passe de filtre client à `?search=` server-side.

Restent `disabled` (hors scope, non demandé) : **Exporter**, **Filtrer**
(bouton dédié à côté de la recherche du tableau — distinct du filtre "Visites du
jour"), le toggle Semaine/Mois du calendrier (le mockup n'a jamais eu de vraie
vue semaine).

## Tests

Routes API testées en Vitest avec mock Prisma, même style que
`api/listings/inquiries/route.test.ts` et `[id]/route.test.ts` : cas nominal,
404 ownership, validation Zod, transition de statut `ListingInquiry` sur
`POST`, 409 sur double-planification. Pas de harnais E2E navigateur dans ce
repo — pas de test frontend automatisé pour cette page, comme les autres pages
`/contacts`, `/demandes`.

## Hors scope

- Notifications (email/WhatsApp) à la création/annulation d'une visite — pas
  demandé, pas d'outbox event ajouté ici.
- Export, filtre avancé du tableau, vue "Semaine" du calendrier.
- Visite créée sans `ListingInquiry` préalable (saisie libre) — décision
  utilisateur explicite d'exiger un inquiry existant.
