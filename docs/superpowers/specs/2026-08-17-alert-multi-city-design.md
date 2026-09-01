# Alertes secteur — sélection multi-villes

Date: 2026-08-17

## Contexte

`/alertes/new` permet de créer une "alerte secteur" avec un pays et **une seule**
ville (deux `<select>`). L'utilisateur veut pouvoir cocher plusieurs villes pour
la même alerte (ex. "Cotonou + Porto-Novo"), dans un seul pays.

Le champ `city` est aujourd'hui une `String` sur le modèle `Alert`, consommée
par :
- `POST /api/alerts` (validation + création)
- `GET /api/alerts`, `GET /api/alerts/[id]` (sélection/retour)
- le moteur de matching (`frontend/src/lib/server/alerts/matching.ts`), qui
  compare `alert.city === request.city` pour rapprocher une alerte d'une
  `PropertyRequest`
- `frontend/src/lib/alerts.ts` (types `AlertListItem` / `AlertMatchRequest`,
  partagés par le frontend)

La page liste `/alertes` n'affiche que `country` (pas `city`), et la page
détail `/alertes/[id]` affiche un objet `alert` mocké différent
(`alert.criteria`, `alert.title`, …) qui ne lit pas `city` directement — hors
scope.

## Décisions validées

- Migration : backfill automatique, `city` existant → `cities: [city]`.
- Portée géographique : un seul pays par alerte ; plusieurs villes dans ce pays.

## Design

### 1. Schéma Prisma

**Correction post-review :** `propertyTypes` (le seul autre champ "tableau"
du modèle `Alert`) est stocké en `Json` (colonne `JSONB`), pas en tableau
Postgres natif (`String[]`) — convention du codebase, probablement pour
rester cohérent avec le pattern "parse défensif" déjà utilisé
(`Array.isArray(alert.propertyTypes) ? ... : []` dans `matching.ts`). On
suit la même convention pour `cities`, pas `String[]`.

`frontend/prisma/schema.prisma`, modèle `Alert` (ligne ~560) :

```prisma
// avant
city            String
// après
cities          Json // string[] of city names, e.g. ["Cotonou","Porto-Novo"]
```

Migration versionnée (`prisma/migrations/<ts>_alert_cities/migration.sql`) :
1. `ALTER TABLE "Alert" ADD COLUMN "cities" JSONB;`
2. `UPDATE "Alert" SET "cities" = to_jsonb(ARRAY["city"]) WHERE "city" IS NOT NULL;`
3. `ALTER TABLE "Alert" ALTER COLUMN "cities" SET NOT NULL;`
4. `ALTER TABLE "Alert" DROP COLUMN "city";`

### 2. API `/api/alerts`

`CreateBody.city: z.string()...` →
`cities: z.array(z.string().trim().min(1).max(120)).min(1).max(10)`
(limite à 10 villes/alerte — garde-fou anti-abus, pas de contrainte métier
connue au-delà).

`GET /api/alerts` et `GET /api/alerts/[id]` : `ALERT_SELECT`/`ALERT_WITH_MATCHES_SELECT`
remplacent `city: true` par `cities: true`.

`prisma.alert.create({ data: { ..., cities: data.cities } })` — Prisma
accepte directement un `string[]` JS pour une colonne `Json`.

### 3. Moteur de matching (`matching.ts`)

- `AlertForMatching` : `'city'` → `'cities'` dans le `Pick<Alert, ...>` (type
  `Json` côté Prisma — caster en `string[]` avec le même garde défensif que
  `propertyTypes` : `Array.isArray(alert.cities) ? (alert.cities as string[]) : []`).
- `matchesAlert` : remplacer la comparaison directe `alert.city !== request.city`
  par une variable locale `const cities = Array.isArray(alert.cities) ? (alert.cities as string[]) : [];`
  puis `if (alert.country !== request.country || !cities.includes(request.city)) return false;`.
- `findMatchingRequestsForAlert` : la table interrogée est `PropertyRequest`
  (`city` y reste une colonne `String` normale) — le filtre SQL devient
  `where: { transactionType: alert.transactionType, country: alert.country, city: { in: citiesOf(alert) } }`
  où `citiesOf(alert)` applique le même garde `Array.isArray` ci-dessus. Le
  filtre `in` sur une colonne `String` fonctionne normalement, qu'importe
  que le tableau source vienne d'un champ JSON côté appelant.
- `findMatchingAlertsForRequest` : ici c'est `Alert.cities` (JSONB) qui doit
  être filtré, et Prisma ne supporte pas de filtre `has`/`in` fiable sur
  JSONB de cette forme. **Retirer `city`/`cities` du `where` Prisma** — ne
  garder que `{ active: true, transactionType: request.transactionType, country: request.country }`
  — et laisser le filtre `matchesAlert(...)` (déjà appliqué en JS après la
  requête) éliminer les alertes dont `cities` ne contient pas
  `request.city`. C'est exactement le même pattern déjà utilisé pour
  `propertyTypes` dans cette fonction — aucun filtre SQL dessus non plus,
  tout est filtré en JS via `matchesAlert`.

Comportement inchangé pour les alertes à une seule ville (liste à un élément).

### 4. Types frontend (`frontend/src/lib/alerts.ts`)

`AlertListItem.city: string` → `AlertListItem.cities: string[]`.
`AlertMatchRequest.city` reste inchangé (c'est la ville de la *demande*, pas
de l'alerte — toujours une seule ville côté `PropertyRequest`).

### 5. UI `/alertes/new`

- State : `const [city, setCity] = useState('')` →
  `const [cities, setCities] = useState<string[]>([])`.
- `handleCountryChange` : au changement de pays, filtrer `cities` pour ne
  garder que celles présentes dans la nouvelle liste (au lieu de vider une
  seule valeur).
- Le `<select>` ville est remplacé par une grille de boutons "chip"
  toggle-able (même pattern visuel que la section "Type de bien", §2 du
  formulaire) listant `availableCities`, avec un état "sélectionné" quand
  `cities.includes(c)`. Disabled tant que `!country`, avec le même message
  placeholder.
- Validation `onCreate` : `!country || !city` → `!country || cities.length === 0`.
- `api('/api/alerts', { body: { ..., cities } })`.

### Hors scope

- `/alertes` (liste) : n'affiche pas la ville, aucun changement nécessaire.
- `/alertes/[id]` (détail) : consomme un objet `alert` mocké distinct
  (`alert.criteria`, etc.), pas le type `AlertDetail` réel — aucun changement
  nécessaire pour cette feature.
- `PropertyRequest.city` reste une ville unique (une demande a une seule
  localisation) — uniquement `Alert.city` devient `Alert.cities`.

## Tests

- Aucun fichier de test n'existe encore pour `matching.ts` — en ajouter un
  (`frontend/src/lib/server/alerts/matching.test.ts`) couvrant au moins :
  alerte avec plusieurs villes matche une demande sur n'importe laquelle
  d'entre elles ; alerte avec une seule ville garde le comportement actuel ;
  alerte ne matche pas une ville absente de `cities`.
- Vérifier qu'aucun autre test (`route.test.ts` sous `api/alerts`,
  `api/requests`) ne référence `city` sur un payload/`select` d'`Alert`.

## Checklist avant merge

`pnpm format && pnpm lint && pnpm typecheck && pnpm test` doivent passer,
comme l'exige CLAUDE.md.
