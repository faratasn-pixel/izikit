# Jetons & visites virtuelles — solde réel + achat de jetons

## Contexte

`/jetons` (`frontend/src/app/jetons/page.tsx`) est aujourd'hui une reproduction
Banani entièrement statique : `TOKEN_PACKS`, `VR_LISTINGS`, `USAGE_BREAKDOWN`,
`TRANSACTIONS` en dur dans le fichier ; boutons "Exporter"/"Acheter"/"Filtrer"
désactivés. Aucun concept de portefeuille de jetons n'existe dans le schéma.

Objectif de cette itération : un vrai solde de jetons par utilisateur, un vrai
historique de transactions, et un achat de jetons fonctionnel via le pipeline
de paiement Bictorys existant.

**Hors scope explicite** (décisions utilisateur) :
- Le débit réel de jetons (ex. activation d'une visite VR sur une annonce)
  n'est pas câblé ici — aucune fonctionnalité de l'app ne consomme de jetons
  aujourd'hui. Seul l'achat (crédit) est implémenté.
- La liste "Annonces avec visite VR active" et le camembert "Répartition
  d'utilisation" restent des données d'exemple — la fonctionnalité de visite
  VR 360 elle-même n'existe pas dans le produit et n'est pas construite ici.
- Export, filtre de l'historique : restent désactivés (non demandés).

## Modèle de données

```prisma
// Ajout dans frontend/prisma/schema.prisma, à la suite de Withdrawal.
model TokenWallet {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Int      @default(0)
  updatedAt DateTime @updatedAt
}

model TokenTransaction {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type         String   // PURCHASE | USAGE | BONUS
  amount       Int      // signé : +tokens (achat/bonus) ou -tokens (utilisation)
  balanceAfter Int
  description  String
  orderId      String?  @unique // lien vers Order pour un achat (traçabilité)
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
}
```

`User` gagne les relations inverses `tokenWallet TokenWallet?` et
`tokenTransactions TokenTransaction[]`.

**Catalogue de packs** — `frontend/src/lib/token-packs.ts` (nouveau fichier,
non protégé, importable côté client ET serveur — pas de secret), même
convention que `frontend/src/lib/subscription-plans.ts` :

```ts
export const TOKEN_PACK_KEYS = ['STARTER', 'STANDARD', 'PRO', 'ENTREPRISE'] as const;
export type TokenPackKey = (typeof TOKEN_PACK_KEYS)[number];

export interface TokenPackDefinition {
  key: TokenPackKey;
  label: string;
  tokens: number;
  priceFcfa: number; // smallest currency unit, XOF n'a pas de décimales
}

export const TOKEN_PURCHASE_CURRENCY = 'XOF';

export const TOKEN_PACK_CATALOG: Record<TokenPackKey, TokenPackDefinition> = {
  STARTER:    { key: 'STARTER',    label: 'Starter',    tokens: 50,   priceFcfa: 15_000 },
  STANDARD:   { key: 'STANDARD',   label: 'Standard',   tokens: 150,  priceFcfa: 40_000 },
  PRO:        { key: 'PRO',        label: 'Pro',        tokens: 350,  priceFcfa: 85_000 },
  ENTREPRISE: { key: 'ENTREPRISE', label: 'Entreprise', tokens: 1000, priceFcfa: 220_000 },
};
```

Source unique de vérité pour le prix et le nombre de jetons — utilisée par la
page (rendu des cartes) ET par le webhook (crédit). Le client envoie un
`packKey`, jamais un prix ou un nombre de jetons.

## Flux d'achat

Reproduit exactement le pattern `subscription_plan_change` déjà en place
(`SubscriptionCard.tsx` → `POST /api/orders` → webhook Bictorys). Aucune
nouvelle route de charge, aucune modification de `/api/orders` ni du
`webhook/handler.ts` (protégé).

1. Le composant client (bouton "Acheter des jetons", pack déjà sélectionné
   dans l'UI existante) appelle :
   ```ts
   api('/api/orders', {
     method: 'POST',
     headers: { 'Idempotency-Key': crypto.randomUUID() },
     body: {
       amount: pack.priceFcfa,
       currency: TOKEN_PURCHASE_CURRENCY,
       metadata: { kind: 'token_purchase', packKey: pack.key },
     },
   })
   ```
   puis `window.location.href = res.paymentUrl`.
2. `frontend/src/app/api/webhooks/bictorys/route.ts` (fair-to-modify) —
   nouveau branchement dans `onPaid`, symétrique à celui de
   `subscription_plan_change`, **avant** le `return {}` final :
   ```ts
   const packKey = meta?.kind === 'token_purchase' && isTokenPackKey(meta.packKey)
     ? meta.packKey : null;
   if (order.userId && packKey) {
     const pack = TOKEN_PACK_CATALOG[packKey];
     const wallet = await tx.tokenWallet.upsert({
       where: { userId: order.userId },
       create: { userId: order.userId, balance: pack.tokens },
       update: { balance: { increment: pack.tokens } },
     });
     await tx.tokenTransaction.create({
       data: {
         userId: order.userId,
         type: 'PURCHASE',
         amount: pack.tokens,
         balanceAfter: wallet.balance,
         description: `Achat pack ${pack.label}`,
         orderId: order.id,
       },
     });
   }
   ```
   Le crédit est un état financier central : il tourne **dans la même
   transaction Serializable** que le webhook, pas via l'outbox (qui reste
   réservé aux effets de bord — notification/email, déjà émis juste après pour
   toute commande payée, y compris celle-ci).
3. Pages de succès/échec : réutilise `/orders/[id]/success` et
   `/orders/[id]/failed` existantes, aucun changement.

## Endpoints de lecture

Nouveau dossier `frontend/src/app/api/tokens/`, même squelette que les autres
routes (`runtime = 'nodejs'`, `requireAuth`, `withRequestContext`).

### `GET /api/tokens/wallet`
`{ balance: number }`. Si aucune ligne `TokenWallet` n'existe encore pour
l'utilisateur, retourne `{ balance: 0 }` sans créer de ligne (la ligne naît au
premier achat, via l'`upsert` du webhook).

### `GET /api/tokens/transactions?cursor=&limit=20`
Historique paginé (cursor sur `createdAt`/`id`, même style que les autres
listes paginées de l'app), le plus récent d'abord. Réponse :
```json
{ "items": [{ "id", "date", "description", "type", "amount", "balance" }], "nextCursor": "..." }
```
`type` est déjà `PURCHASE | USAGE | BONUS` côté DB ; le frontend fait juste le
mapping d'affichage vers `achat | utilisation | bonus` (déjà présent dans
`TX_STYLE`).

### `GET /api/tokens/usage-this-month`
`{ used: number }` — somme (valeur absolue) des `TokenTransaction` de type
`USAGE` créées depuis le 1er du mois courant. Sera `0` tant qu'aucune
fonctionnalité ne débite de jetons — c'est le comportement réel attendu, pas
un bug.

## Frontend — `frontend/src/app/jetons/page.tsx`

- Carte "Solde de jetons" → `GET /api/tokens/wallet` au montage (remplace le
  `240` en dur).
- Carte "Jetons utilisés ce mois" → `GET /api/tokens/usage-this-month`. Retire
  la barre de progression et le dénominateur `/300` fictif (pas de plafond
  mensuel réel dans le système) ; affiche uniquement le nombre.
- Tableau "Historique des transactions" → `GET /api/tokens/transactions`
  (remplace `TRANSACTIONS`).
- Bouton "Acheter des jetons" (déjà `disabled` → devient actif) : déclenche le
  flux d'achat décrit ci-dessus pour le pack actuellement sélectionné
  (`selectedPack` déjà en state) ; état "Traitement…" pendant l'appel, erreurs
  via `useToast` (`ApiError.message`), même pattern que `SubscriptionCard`.
- Carte "Visites VR actives", section "Annonces avec visite VR active",
  camembert "Répartition d'utilisation" : **inchangés**, restent les tableaux
  `VR_LISTINGS`/`USAGE_BREAKDOWN` mockés.
- Boutons "Exporter" et "Filtrer" : restent `disabled` (hors scope).

## Tests

Vitest, mock Prisma, même style que
`app/api/subscriptions/change-plan/route.test.ts` et
`app/api/webhooks/bictorys/route.test.ts` :
- `GET /api/tokens/wallet` : ligne existante → balance ; pas de ligne → `0`.
- `GET /api/tokens/transactions` : pagination, tri, mapping des champs.
- `GET /api/tokens/usage-this-month` : agrégation bornée au mois courant.
- Webhook `onPaid` : nouveau cas `token_purchase` — crédite le wallet
  (création + increment), insère la `TokenTransaction`, `balanceAfter`
  correct ; `packKey` invalide ou `kind` différent → aucun effet (comme le
  `isPlanKey` guard existant pour les abonnements).

## Hors scope

- Débit de jetons (toute fonctionnalité de consommation — visite VR,
  boost d'annonce, mise en avant).
- Modèle de données pour les annonces VR / visites 360 elles-mêmes.
- Export CSV et filtre de l'historique des transactions.
- Notification/email dédiés à l'achat de jetons au-delà de ceux déjà émis
  génériquement pour tout `Order` payé (`notification.payment_received`,
  `email.payment_confirmation`).
