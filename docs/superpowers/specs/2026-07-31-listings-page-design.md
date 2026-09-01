# Design — Page dédiée "Mes annonces" (`/listings`)

Date : 2026-07-31
Statut : Approuvé (brainstorming)

## Contexte

Le lien "Mes annonces" existe déjà dans la sidebar desktop
(`frontend/src/components/dashboard/DashboardShell.tsx`, groupe "Gestion") et
dans le bottom nav mobile (`frontend/src/components/dashboard/BottomNav.tsx`),
mais aucun des deux n'a de `href` — l'entrée est rendue inerte avec un badge
"Bientôt". Le dashboard (`frontend/src/app/dashboard/page.tsx`) affiche déjà
un aperçu "Mes annonces" (8 dernières annonces, `GET /api/listings`) mais
sans recherche, filtre ni pagination.

Le backend n'expose aujourd'hui que `GET /api/listings` (scopé
`userId = auth.user.sub`, pagination par curseur `{ items, nextCursor }`,
voir `frontend/src/lib/server/pagination/paginate.ts`). Il n'y a pas de
`POST` (créer/publier), pas de route de détail, pas de `PATCH` (modifier).

## Objectif

Construire l'écran complet vers lequel les deux liens de nav pointeront :
liste paginée et filtrable des annonces de l'utilisateur connecté, sur le
modèle visuel de la table déjà présente dans le dashboard.

## Hors périmètre

- Aucune nouvelle route API (pas de POST/PATCH/DELETE sur `/api/listings`).
- Les actions "Publier une annonce", "Voir" et "Modifier" restent
  désactivées (tooltip "Bientôt disponible"), identique au comportement
  actuel du dashboard — leur backend n'existe pas encore.

## Architecture

- Nouvelle page `frontend/src/app/listings/page.tsx`, client component,
  enveloppée dans `<DashboardShell active="listings">` (même pattern que
  `dashboard/page.tsx`).
- Pas de nouvelle route API : consommation de `GET /api/listings` via
  `useApi`, pagination par curseur gérée côté client (accumulation des
  pages chargées dans un state local `listings: Listing[]` +
  `nextCursor: string | null`).
- Extraction vers `frontend/src/lib/listings.ts` des éléments déjà
  dupliqués (ou sur le point de l'être) entre le dashboard et la nouvelle
  page : type `Listing`, `STATUS_STYLE`, `PROPERTY_TYPE_LABEL`,
  `formatPrice()`. `frontend/src/app/dashboard/page.tsx` est mis à jour
  pour importer depuis ce module au lieu de ses définitions locales.
  Rien d'autre n'est extrait — le tableau du dashboard reste un aperçu
  simple sans recherche/filtre/pagination, la nouvelle page a sa propre
  table complète (pas de composant de table partagé).

## Composants & mise en page

**En-tête de page**
- Titre `Mes annonces` (Sora, semi-bold) + sous-titre dynamique = nombre
  d'annonces actuellement visibles après filtre (ex. « 8 annonces »).
- Bouton `Publier une annonce` (désactivé, tooltip « Bientôt disponible —
  l'écran de publication n'est pas encore implémenté »), aligné à droite,
  même style que le bouton équivalent du dashboard.

**Barre d'outils**
- Champ de recherche fonctionnel : filtre côté client sur `title`, `city`,
  `country` (insensible à la casse) parmi les annonces déjà chargées.
- Bouton `Filtrer` fonctionnel : ouvre un popover avec deux `<select>` —
  Statut (Tous / Vérifié / En attente / Vendu) et Type (Tous / Villa /
  Appartement / Terrain / Duplex / Bureau) — plus un lien `Réinitialiser`.
  Badge sur le bouton indiquant le nombre de filtres actifs.
- Recherche et filtres se combinent (ET logique) et s'appliquent
  uniquement aux annonces déjà chargées en mémoire (pas de nouveau param
  serveur). Une note discrète apparaît sous la liste filtrée quand
  `nextCursor !== null` : « Résultats filtrés parmi les annonces chargées —
  cliquez sur Charger plus pour élargir la recherche ».

**Table** (mêmes colonnes que le dashboard)
- Colonnes : ID (masqué mobile), Titre, Localisation, Type (masqué
  mobile), Prix, Statut, Actions.
- Actions `Voir` (icône `Eye`) / `Modifier` (icône `Pencil`) désactivées
  avec tooltip, identique au dashboard actuel.

**Pied de liste**
- Bouton `Charger plus` sous la table : actif tant que
  `nextCursor !== null` ; état "chargement" (spinner/texte) pendant le
  fetch ; disparaît quand `nextCursor === null`.

**États**
- Chargement initial : texte centré « Chargement… », identique au
  dashboard (pas de skeleton).
- Aucune annonce du tout (liste vide + pas de filtre actif) : reprend
  l'état vide existant du dashboard (« Aucune annonce pour l'instant » +
  explication).
- Annonces existent mais aucune ne correspond aux filtres actifs : état
  vide distinct (« Aucun résultat pour ces critères » + bouton
  `Réinitialiser les filtres`).

## Câblage de la navigation

- `DashboardShell.tsx` — l'entrée `listings` de `NAV_GROUPS` (groupe
  "Gestion") reçoit `href: '/listings'`. `NavItem` n'affiche le badge
  "Bientôt" que si `href` est absent, donc il disparaît automatiquement.
- `BottomNav.tsx` — l'entrée `listings` de `BOTTOM_NAV` reçoit
  `href: '/listings'` (actuellement rendue en `<div>` inerte faute de
  `href`).
- Aucun autre changement : `BOTTOM_NAV_KEY_MAP` route déjà `listings`
  vers la bonne clé de bottom nav.

## Tests

- Aucune nouvelle route API → aucun nouveau test serveur nécessaire.
- Vérifier la convention de test existante pour les modules `lib/`
  clients (ex. présence de fichiers `*.test.ts` sœurs) avant d'écrire un
  test unitaire pour `formatPrice()` et les tables de labels extraites
  dans `lib/listings.ts` ; à confirmer/ajuster lors de l'écriture du plan
  d'implémentation.
