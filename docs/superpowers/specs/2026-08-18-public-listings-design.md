# Vitrine publique /annonces — API réelle + filtres

Date: 2026-08-18

## Contexte

`/annonces` (liste publique, `PublicNavbar`/`PublicFooter`, pas d'auth) est
entièrement statique : un tableau `LISTINGS` codé en dur dans
`frontend/src/app/annonces/page.tsx`, avec des filtres visuels tous inertes
(`InertPill`, `title="Bientôt disponible"`) et des comptes inventés (128
annonces, 34 maisons, …).

Le modèle `Listing` (Prisma) contient déjà tout le nécessaire : `title`,
`city`, `country`, `propertyType`, `transactionType`, `price`, `currency`,
`status`, `description`, `surfaceM2`, `bedrooms`, `bathrooms`, `amenities`,
relation `photos: ListingPhoto[]` (`isPrimary`, `url`, `position`),
relation `user: User` (agent — `name`, `avatarUrl` nullable, jamais
`email` côté public). Les annonces sont créées via `/listings/new` puis
validées par un admin (`status: DRAFT → PENDING → VERIFIED`, ou `SOLD`).

Il n'existe **aucune API publique** listant les annonces tous utilisateurs
confondus. `GET /api/listings` existant est strictement privé (scopé
`userId = auth.user.sub`, "Mes annonces" du dashboard agent) et exclut déjà
les `DRAFT` — mais reste privé, donc inutilisable ici.

`/annonces/[id]` (détail) est également statique. **Hors scope** pour cette
spec (décision utilisateur : liste d'abord, détail dans une session
suivante). Les liens "Voir" continuent de pointer dessus sans casser —
la page existe, elle affiche juste des données mock indépendamment de
l'id cliqué.

## Décisions validées

- Statut affiché publiquement : `VERIFIED` uniquement (ni DRAFT, ni
  PENDING, ni SOLD).
- Filtres rendus fonctionnels dans cette étape : **pays, type de bien,
  transaction, prix**. Ville, surface minimale et "Plus de filtres"
  restent visuellement présents mais inertes (`InertPill`), comme
  aujourd'hui.
- Pagination **par numéro de page** (`?page=N&limit=9`), pas par curseur —
  correspond à l'UI existante (1, 2, 3… N cliquables), même si ça diffère
  du pattern curseur utilisé ailleurs (`/api/alerts`, `/api/notifications`).
- Les 4 pills du haut ("Maisons"/"Appartements"/"Terrains"/"Bureaux") sont
  une taxonomie inventée qui ne correspond à aucun des 10 vrais
  `propertyType`. Remplacées par des pills **par transaction réelle**
  ("Toutes" + une pill par `transactionType` présent en base parmi VENTE/
  LOCATION/SEJOUR/AUBERGE). Le filtre fin par type de bien vit dans la
  sidebar (checkboxes, 10 vrais types, vrais comptes).

## Design

### 1. API publique — `GET /api/public/listings`

Nouveau fichier `frontend/src/app/api/public/listings/route.ts`.
`export const runtime = 'nodejs'`. **Pas d'auth** (`requireAuth` non
appelé — route publique par design). Pas de mutation, donc pas de
`verifyCsrf` non plus.

Query params (tous optionnels sauf pagination) :
- `country: string`
- `propertyType: string` (une des clés `PROPERTY_TYPE_LABEL`)
- `transactionType: string` (une des clés `TRANSACTION_TYPE_LABEL`)
- `priceMin: number`, `priceMax: number`
- `page: number` (défaut 1, min 1)
- `limit: number` (défaut 9, clampé [1, 24])

Validation Zod légère sur les query params (tous optionnels, valeurs
invalides silencieusement ignorées plutôt que 400 — c'est une page de
navigation publique, pas un formulaire, une erreur de filtre ne doit
jamais casser la page).

`where` de base : `{ status: 'VERIFIED', ...filtres }`. Requête
`Promise.all` :
1. `prisma.listing.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page-1)*limit, take: limit, select: LISTING_SELECT })`
2. `prisma.listing.count({ where })` → `total`
3. Facets (comptes réels pour peupler les filtres) — trois `groupBy` sur
   le **même `where` de base SANS le filtre correspondant à la facette
   elle-même** (pour que choisir un pays ne fasse pas disparaître les
   autres pays de la liste de filtres) :
   - `prisma.listing.groupBy({ by: ['country'], where: { status: 'VERIFIED', ...autresFiltres }, _count: true })`
   - `prisma.listing.groupBy({ by: ['propertyType'], where: { status: 'VERIFIED', ...autresFiltresSaufType }, _count: true })`
   - `prisma.listing.groupBy({ by: ['transactionType'], where: { status: 'VERIFIED', ...autresFiltresSaufTransaction }, _count: true })`

`LISTING_SELECT` :
```typescript
{
  id: true,
  title: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  createdAt: true,
  photos: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
  },
  _count: { select: { photos: true } },
  user: { select: { id: true, name: true, avatarUrl: true } }, // JAMAIS email
}
```

Réponse `200` :
```typescript
{
  items: Array<{
    id: string; title: string; city: string; country: string;
    propertyType: string; transactionType: string;
    price: number; currency: string; createdAt: string;
    primaryPhotoUrl: string | null; photoCount: number;
    agent: { name: string | null; avatarUrl: string | null; seed: string }; // seed = user.id
  }>;
  page: number; limit: number; total: number; totalPages: number;
  facets: {
    countries: { value: string; count: number }[];
    propertyTypes: { value: string; count: number }[];
    transactionTypes: { value: string; count: number }[];
  };
}
```

### 2. `InitialsAvatar` — seed sans email

`frontend/src/components/dashboard/InitialsAvatar.tsx` expose déjà
`name`/`email`/`avatarUrl`, mais dérive la teinte depuis `email` — une
donnée qu'on ne peut pas exposer publiquement. Ajout d'un prop optionnel
`seed?: string` : si fourni, `hueFrom(seed)` remplace `hueFrom(email)` (le
fallback textuel des initiales reste basé sur `name`/`email` comme
aujourd'hui, `email` restant requis pour ce fallback texte mais jamais
affiché ni envoyé au public — la page publique lui passera une chaîne
vide `''` puisque seul `seed` pilotera le rendu quand il est fourni).

### 3. UI `/annonces` — `frontend/src/app/annonces/page.tsx`

- Supprime le tableau `LISTINGS` mock, l'interface `Listing` locale, et
  `TYPE_TABS`/`PROPERTY_TYPE_FILTERS`/`COUNTRY_FILTERS` codés en dur.
- State : `country`, `propertyType`, `transactionType`, `priceMin`,
  `priceMax`, `page` → un seul `useEffect` qui refetch
  `GET /api/public/listings` à chaque changement (querystring construite
  à partir de ces states, `URLSearchParams` en omettant les valeurs
  vides).
- Pills du haut : "Toutes" + une pill par `facets.transactionTypes`
  (`TRANSACTION_TYPE_LABEL[value]`), remplace `transactionType` filter.
- Sidebar "Type de bien" : checkboxes générées depuis
  `facets.propertyTypes` (label via `PROPERTY_TYPE_LABEL`, compte réel) —
  multi-select non nécessaire pour v1, un seul type actif à la fois
  (cohérent avec le state `propertyType: string | null`).
- Sidebar "Pays" : idem depuis `facets.countries`, avec `COUNTRY_FLAG`
  (déjà dans `frontend/src/lib/alerts.ts` — réutilisable ou dupliqué
  localement si l'import cross-module est mal vu ; réutilisation
  préférée).
- Sidebar "Fourchette de prix" : deux inputs numériques (`priceMin`,
  `priceMax`), pas de slider draggable pour v1 (le slider visuel actuel
  reste décoratif/statique, comme le reste des filtres non encore
  branchés — cohérent avec l'esprit "petit pas fonctionnel" déjà choisi
  pour ville/surface).
- Ville (pill du haut) et Surface minimale (sidebar) restent `InertPill`
  / non-cliquables, **inchangées**.
- Cartes (grille et liste) : `primaryPhotoUrl` (fallback : bloc gris avec
  icône `ImageIcon` si `null`, pas de service d'image placeholder
  externe), badge type de bien (`PROPERTY_TYPE_LABEL`), badge transaction
  (`TRANSACTION_TYPE_LABEL`), prix formaté via
  `formatListingPrice(price, currency)` (déjà dans
  `frontend/src/lib/listings.ts`), agent via `InitialsAvatar` (`seed:
  agent.seed`), badge "Vérifié" toujours affiché (tous les items sont
  `VERIFIED` par construction de l'API), `photoCount`, date via un format
  identique à `formatDate` de `frontend/src/lib/alerts.ts` (réutilisable).
- Pagination : `page`/`totalPages` réels, boutons Précédent/Suivant +
  numéros cliquables (max 4 numéros visibles + ellipsis, calque du visuel
  existant) qui mettent à jour `page` state.
- En-tête ("Toutes les annonces · N annonces trouvées · pays…") : `N` =
  `total` réel ; la liste de pays dans le sous-titre devient la liste des
  pays présents dans `facets.countries` (ou un texte générique si vide).

### Hors scope

- `/annonces/[id]` reste statique (session suivante).
- Filtre ville (dépendant du pays, comme `/alertes/new`) — pas dans cette
  étape.
- Filtre surface minimale.
- Tri ("Trier par : Date (récent)") — reste la seule option, pas de
  sélecteur fonctionnel de tri alternatif.
- Vue "Liste" vs "Grille" : le toggle existant reste, les deux vues
  consomment les mêmes `items` réels (pas de logique supplémentaire
  nécessaire, juste le rendu déjà présent adapté aux vrais champs).

## Tests

- `frontend/src/app/api/public/listings/route.test.ts` : ne retourne que
  `status: VERIFIED` ; applique chaque filtre indépendamment (country,
  propertyType, transactionType, priceMin/Max) ; pagination
  (`page`/`limit`/`total`/`totalPages` corrects) ; `facets` reflètent les
  comptes réels et ignorent leur propre filtre (ex. filtrer par pays ne
  doit pas réduire `facets.countries` aux seuls pays déjà filtrés) ;
  aucune fuite d'email dans la réponse (`agent.email` n'existe pas dans le
  DTO).

## Checklist avant merge

`pnpm format && pnpm lint && pnpm typecheck && pnpm test` doivent passer.
