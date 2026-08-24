# Jetons Wallet & Purchase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/jetons` a real token balance, a real transaction history, and a working "Acheter des jetons" purchase flow through the existing Bictorys payment pipeline.

**Architecture:** Two new Prisma models (`TokenWallet`, `TokenTransaction`) plus a hardcoded pack catalog (`frontend/src/lib/token-packs.ts`, mirrors `subscription-plans.ts`). Purchases ride the existing `POST /api/orders` one-time-charge pipeline unmodified — the client sends `metadata: { kind: 'token_purchase', packKey }`, and a new branch in the Bictorys webhook's `onPaid` handler credits the wallet inside the same Serializable transaction the webhook already opens. Three new read-only GET routes expose the balance, this month's usage, and transaction history to the page.

**Tech Stack:** Next.js 16 App Router Route Handlers, Prisma 5 / Postgres (Neon), Vitest + `vitest-mock-extended` for route tests, existing `api()` fetch wrapper + `useToast` on the frontend.

**Spec:** [docs/superpowers/specs/2026-08-24-jetons-wallet-purchase-design.md](../specs/2026-08-24-jetons-wallet-purchase-design.md)

## Global Constraints

- Token prices and token counts per pack live ONLY in the server-trusted catalog (`TOKEN_PACK_CATALOG`) — the client sends a `packKey`, never a price or a token count that gets trusted.
- The wallet credit on a paid order runs synchronously inside the webhook's existing Serializable transaction (the `tx` passed into `onPaid`) — never via `enqueueOutbox` (outbox is for side-effects like email/notification, not core financial state).
- `frontend/src/lib/server/webhook/handler.ts` and `POST /api/orders` (`frontend/src/app/api/orders/route.ts`) are NOT modified — the purchase flow reuses them exactly as they exist today, mirroring the `subscription_plan_change` pattern already in `frontend/src/app/api/webhooks/bictorys/route.ts`.
- No token debit logic is added anywhere in this plan — nothing in the app consumes tokens yet, by explicit decision.
- "Annonces avec visite VR active" and "Répartition d'utilisation" (the donut chart) on `/jetons` stay mocked — no new fetch is wired for them.
- Every new Route Handler exports `runtime = 'nodejs'` and follows the `makeRequestContext` / `withRequestContext` / `requireAuth` boilerplate already used throughout `frontend/src/app/api/`.

---

## Task 1: Prisma schema — `TokenWallet` + `TokenTransaction`

**Files:**
- Modify: `frontend/prisma/schema.prisma` (add two models after `Withdrawal`, around line 450; add two relation lines on `User` after `alerts Alert[]`, around line 89)
- Create: migration via `prisma migrate dev` (generates its own timestamped folder under `frontend/prisma/migrations/`)

**Interfaces:**
- Produces: `prisma.tokenWallet` (`{ userId, balance, updatedAt }`) and `prisma.tokenTransaction` (`{ id, userId, type, amount, balanceAfter, description, orderId, createdAt }`) — every later task in this plan reads/writes through these two Prisma models.

- [ ] **Step 1: Add the models to the schema**

In `frontend/prisma/schema.prisma`, insert immediately after the closing `}` of `model Withdrawal` (the line `@@index([provider, providerPayoutId])` followed by `}`, right before the `// ───` comment block that introduces `Listing`):

```prisma
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
  type         String // PURCHASE | USAGE | BONUS
  amount       Int // signed: +tokens (purchase/bonus) or -tokens (usage)
  balanceAfter Int
  description  String
  orderId      String?  @unique // links a PURCHASE row back to its Order
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
}
```

In `model User`, add two relation lines right after `alerts Alert[]` (around line 89):

```prisma
  tokenWallet       TokenWallet?
  tokenTransactions TokenTransaction[]
```

- [ ] **Step 2: Generate and apply the migration**

Run: `pnpm --filter frontend exec prisma migrate dev --name add_token_wallet`

Expected: a new folder appears under `frontend/prisma/migrations/`, the command reports the migration applied successfully, and `frontend/node_modules/.prisma/client` regenerates (so `prisma.tokenWallet` / `prisma.tokenTransaction` are typed).

- [ ] **Step 3: Verify the generated client has the new models**

Run: `pnpm --filter frontend exec tsc --noEmit`

Expected: no errors (confirms the Prisma client picked up the new models).

- [ ] **Step 4: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations
git commit -m "feat(db): add TokenWallet and TokenTransaction models"
```

---

## Task 2: Token pack catalog

**Files:**
- Create: `frontend/src/lib/token-packs.ts`
- Test: `frontend/src/lib/token-packs.test.ts`

**Interfaces:**
- Consumes: nothing (pure constants module, no server-only imports — importable from client components).
- Produces: `TOKEN_PACK_KEYS: readonly ['STARTER','STANDARD','PRO','ENTREPRISE']`, `type TokenPackKey`, `TokenPackDefinition { key, label, tokens, priceFcfa }`, `TOKEN_PACK_CATALOG: Record<TokenPackKey, TokenPackDefinition>`, `TOKEN_PURCHASE_CURRENCY: 'XOF'`, `isTokenPackKey(value: unknown): value is TokenPackKey`. Task 3 (webhook) and Task 7 (frontend) both import from here.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/token-packs.test.ts
import { describe, it, expect } from 'vitest';
import { TOKEN_PACK_CATALOG, TOKEN_PACK_KEYS, isTokenPackKey } from './token-packs';

describe('token-packs catalog', () => {
  it('has one definition per key with matching tokens/price', () => {
    for (const key of TOKEN_PACK_KEYS) {
      const pack = TOKEN_PACK_CATALOG[key];
      expect(pack.key).toBe(key);
      expect(pack.tokens).toBeGreaterThan(0);
      expect(pack.priceFcfa).toBeGreaterThan(0);
    }
  });

  it('isTokenPackKey accepts only known keys', () => {
    expect(isTokenPackKey('STANDARD')).toBe(true);
    expect(isTokenPackKey('FREE')).toBe(false);
    expect(isTokenPackKey(undefined)).toBe(false);
    expect(isTokenPackKey(123)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/token-packs.test.ts`
Expected: FAIL — `Cannot find module './token-packs'`

- [ ] **Step 3: Write the implementation**

```ts
// frontend/src/lib/token-packs.ts
// Single source of truth for the 4 token packs (Banani "Jetons & visites
// virtuelles" screen). Shared between the purchase button (client) and the
// Bictorys webhook (server) so price/token-count never drift between what's
// charged and what's credited. No secrets here — safe to import from client
// components. Mirrors frontend/src/lib/subscription-plans.ts.

export const TOKEN_PACK_KEYS = ['STARTER', 'STANDARD', 'PRO', 'ENTREPRISE'] as const;
export type TokenPackKey = (typeof TOKEN_PACK_KEYS)[number];

export interface TokenPackDefinition {
  key: TokenPackKey;
  label: string;
  tokens: number;
  priceFcfa: number; // smallest currency unit; XOF has no decimals
}

export const TOKEN_PURCHASE_CURRENCY = 'XOF';

export const TOKEN_PACK_CATALOG: Record<TokenPackKey, TokenPackDefinition> = {
  STARTER: { key: 'STARTER', label: 'Starter', tokens: 50, priceFcfa: 15_000 },
  STANDARD: { key: 'STANDARD', label: 'Standard', tokens: 150, priceFcfa: 40_000 },
  PRO: { key: 'PRO', label: 'Pro', tokens: 350, priceFcfa: 85_000 },
  ENTREPRISE: { key: 'ENTREPRISE', label: 'Entreprise', tokens: 1000, priceFcfa: 220_000 },
};

export function isTokenPackKey(value: unknown): value is TokenPackKey {
  return typeof value === 'string' && (TOKEN_PACK_KEYS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/token-packs.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/token-packs.ts frontend/src/lib/token-packs.test.ts
git commit -m "feat: add token pack catalog"
```

---

## Task 3: Webhook — credit wallet on `token_purchase`

**Files:**
- Modify: `frontend/src/app/api/webhooks/bictorys/route.ts`
- Modify: `frontend/src/app/api/webhooks/bictorys/route.test.ts`

**Interfaces:**
- Consumes: `TOKEN_PACK_CATALOG`, `isTokenPackKey` from `@/lib/token-packs` (Task 2); `tx.tokenWallet.upsert`, `tx.tokenTransaction.create` from the Prisma client regenerated in Task 1.
- Produces: nothing new consumed by later tasks — this is a leaf change to an existing file.

- [ ] **Step 1: Add the failing test cases**

Open `frontend/src/app/api/webhooks/bictorys/route.test.ts`. Add two new mock functions next to the existing ones (top of file, after `const subscriptionUpsert = vi.fn();`):

```ts
const tokenWalletUpsert = vi.fn();
const tokenTransactionCreate = vi.fn();
```

Add both to the `$transaction` mock's `tx` object (the object passed to `fn(...)`), alongside `subscription`:

```ts
const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
  fn({
    webhookLog: { findUnique, create, update },
    order: { findFirst: orderFindFirst, update: orderUpdate },
    outboxEvent: { create: outboxCreate },
    subscription: { upsert: subscriptionUpsert },
    tokenWallet: { upsert: tokenWalletUpsert },
    tokenTransaction: { create: tokenTransactionCreate },
  }),
);
```

Reset both in `beforeEach` alongside the existing `.mockReset()` calls:

```ts
tokenWalletUpsert.mockReset();
tokenTransactionCreate.mockReset();
```

Add two new `it(...)` blocks at the end of the `describe` block, right before the `runtime=nodejs` test:

```ts
  it('onPaid credits the token wallet when metadata.kind is token_purchase', async () => {
    findUnique.mockResolvedValueOnce(null);
    orderFindFirst.mockResolvedValueOnce({
      id: 'o1',
      userId: 'u1',
      customerEmail: 'a@b.com',
      amount: 40_000,
      currency: 'XOF',
      metadata: { kind: 'token_purchase', packKey: 'STANDARD' },
    });
    tokenWalletUpsert.mockResolvedValue({ userId: 'u1', balance: 150 });
    const { POST } = await import('./route');
    const { req } = bictorysFixtureRequest({ status: 'succeeded' });
    await POST(req);
    expect(tokenWalletUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        create: { userId: 'u1', balance: 150 },
        update: { balance: { increment: 150 } },
      }),
    );
    expect(tokenTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'PURCHASE',
          amount: 150,
          balanceAfter: 150,
          orderId: 'o1',
        }),
      }),
    );
  });

  it('onPaid ignores orders with an unknown packKey', async () => {
    findUnique.mockResolvedValueOnce(null);
    orderFindFirst.mockResolvedValueOnce({
      id: 'o3',
      userId: 'u1',
      customerEmail: 'a@b.com',
      amount: 40_000,
      currency: 'XOF',
      metadata: { kind: 'token_purchase', packKey: 'NOT_A_REAL_PACK' },
    });
    const { POST } = await import('./route');
    const { req } = bictorysFixtureRequest({ status: 'succeeded' });
    await POST(req);
    expect(tokenWalletUpsert).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter frontend exec vitest run src/app/api/webhooks/bictorys/route.test.ts`
Expected: the two new tests FAIL (`tokenWalletUpsert` never called); the pre-existing tests still PASS.

- [ ] **Step 3: Implement the webhook branch**

In `frontend/src/app/api/webhooks/bictorys/route.ts`, add the import at the top alongside the existing ones:

```ts
import { TOKEN_PACK_CATALOG, isTokenPackKey } from '@/lib/token-packs';
```

Change the `meta` cast (currently `const meta = (order.metadata ?? null) as { kind?: unknown; planKey?: unknown } | null;`) to also carry `packKey`:

```ts
    const meta = (order.metadata ?? null) as {
      kind?: unknown;
      planKey?: unknown;
      packKey?: unknown;
    } | null;
```

Immediately after the existing `subscription_plan_change` `if` block (right after its closing `}`, still before the `// Outbox emits stay inside...` comment), add:

```ts
    // "Acheter des jetons" rides the same Order/Bictorys one-time-charge
    // pipeline as the subscription upgrade above — POST /api/orders is
    // called directly with this metadata tag from the /jetons page. Credit
    // the wallet here, inside the same Serializable tx, once payment is
    // confirmed: this is core financial state, not a side-effect, so it
    // does NOT go through the outbox.
    if (order.userId && meta?.kind === 'token_purchase' && isTokenPackKey(meta.packKey)) {
      const pack = TOKEN_PACK_CATALOG[meta.packKey];
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/app/api/webhooks/bictorys/route.test.ts`
Expected: PASS, all tests (old + 2 new) green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/webhooks/bictorys/route.ts frontend/src/app/api/webhooks/bictorys/route.test.ts
git commit -m "feat(webhook): credit token wallet on token_purchase orders"
```

---

## Task 4: `GET /api/tokens/wallet`

**Files:**
- Create: `frontend/src/app/api/tokens/wallet/route.ts`
- Test: `frontend/src/app/api/tokens/wallet/route.test.ts`

**Interfaces:**
- Consumes: `requireAuth` from `@/lib/server/middleware`; `prisma.tokenWallet.findUnique` (Task 1).
- Produces: `GET /api/tokens/wallet` → `200 { balance: number }`, consumed by Task 7 (frontend).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/tokens/wallet/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { createAccessToken } from '@/lib/server/auth';
import { GET } from './route';

function makeReq(bearer?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new NextRequest('https://test/api/tokens/wallet', { method: 'GET', headers });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('GET /api/tokens/wallet', () => {
  it('returns balance 0 when no wallet row exists yet', async () => {
    prismaMock.tokenWallet.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 0 });
  });

  it('returns the existing balance', async () => {
    prismaMock.tokenWallet.findUnique.mockResolvedValue({
      userId: 'user_1',
      balance: 240,
      updatedAt: new Date(),
    } as never);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 240 });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/wallet/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the route**

```ts
// frontend/src/app/api/tokens/wallet/route.ts
// GET /api/tokens/wallet — /jetons "Solde de jetons" card.
//
// Absence of a TokenWallet row means "never purchased tokens" (no row is
// ever created for a user with a 0 balance — same find-or-create-on-first-
// purchase convention as Subscription; the row is created lazily by the
// Bictorys webhook's upsert on first successful token purchase).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId: auth.user.sub },
      select: { balance: true },
    });

    return NextResponse.json(
      { balance: wallet?.balance ?? 0 },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/wallet/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/tokens/wallet
git commit -m "feat(api): add GET /api/tokens/wallet"
```

---

## Task 5: `GET /api/tokens/usage-this-month`

**Files:**
- Create: `frontend/src/app/api/tokens/usage-this-month/route.ts`
- Test: `frontend/src/app/api/tokens/usage-this-month/route.test.ts`

**Interfaces:**
- Consumes: `requireAuth`; `prisma.tokenTransaction.aggregate`.
- Produces: `GET /api/tokens/usage-this-month` → `200 { used: number }`, consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/tokens/usage-this-month/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { createAccessToken } from '@/lib/server/auth';
import { GET } from './route';

function makeReq(bearer?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new NextRequest('https://test/api/tokens/usage-this-month', { method: 'GET', headers });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('GET /api/tokens/usage-this-month', () => {
  it('returns 0 when no usage rows exist this month', async () => {
    prismaMock.tokenTransaction.aggregate.mockResolvedValue({
      _sum: { amount: null },
    } as never);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ used: 0 });
  });

  it('returns the absolute value of the summed USAGE amount', async () => {
    prismaMock.tokenTransaction.aggregate.mockResolvedValue({
      _sum: { amount: -60 },
    } as never);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ used: 60 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/usage-this-month/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the route**

```ts
// frontend/src/app/api/tokens/usage-this-month/route.ts
// GET /api/tokens/usage-this-month — /jetons "Jetons utilisés ce mois" card.
//
// Sums TokenTransaction rows of type USAGE created since the 1st of the
// current calendar month. TokenTransaction.amount is stored negative for
// USAGE rows, so the sum is negative (or null when no rows exist) — we
// return its absolute value. Will read 0 until some feature in the app
// actually debits tokens (none does yet) — that is the correct, real
// behavior, not a bug.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await prisma.tokenTransaction.aggregate({
      where: { userId: auth.user.sub, type: 'USAGE', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    });

    const used = Math.abs(result._sum.amount ?? 0);

    return NextResponse.json(
      { used },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/usage-this-month/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/tokens/usage-this-month
git commit -m "feat(api): add GET /api/tokens/usage-this-month"
```

---

## Task 6: `GET /api/tokens/transactions`

**Files:**
- Create: `frontend/src/app/api/tokens/transactions/route.ts`
- Test: `frontend/src/app/api/tokens/transactions/route.test.ts`

**Interfaces:**
- Consumes: `requireAuth`; `clampLimit`, `cursorWhere`, `decodeCursor`, `buildPage` from `@/lib/server/pagination/paginate` (existing helper); `prisma.tokenTransaction.findMany`.
- Produces: `GET /api/tokens/transactions?cursor=&limit=` → `200 { items: TokenTransactionDTO[], nextCursor: string | null }` where `TokenTransactionDTO = { id, date: string (ISO), description: string, type: 'PURCHASE'|'USAGE'|'BONUS', amount: number, balance: number }`. Consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/api/tokens/transactions/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { createAccessToken } from '@/lib/server/auth';
import { GET } from './route';

function makeReq(bearer?: string, qs = ''): NextRequest {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new NextRequest(`https://test/api/tokens/transactions${qs}`, { method: 'GET', headers });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('GET /api/tokens/transactions', () => {
  it('maps rows to the DTO shape, most recent first', async () => {
    const createdAt = new Date('2026-08-02T10:00:00.000Z');
    prismaMock.tokenTransaction.findMany.mockResolvedValue([
      {
        id: 't1',
        userId: 'user_1',
        type: 'PURCHASE',
        amount: 150,
        balanceAfter: 240,
        description: 'Achat pack Standard',
        orderId: 'o1',
        createdAt,
      },
    ] as never);

    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        {
          id: 't1',
          date: createdAt.toISOString(),
          description: 'Achat pack Standard',
          type: 'PURCHASE',
          amount: 150,
          balance: 240,
        },
      ],
      nextCursor: null,
    });
    expect(prismaMock.tokenTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user_1' }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('scopes the query to the authenticated user', async () => {
    prismaMock.tokenTransaction.findMany.mockResolvedValue([] as never);
    await GET(makeReq(validToken));
    const call = prismaMock.tokenTransaction.findMany.mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ userId: 'user_1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/transactions/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the route**

```ts
// frontend/src/app/api/tokens/transactions/route.ts
// GET /api/tokens/transactions — /jetons "Historique des transactions" table.
// Cursor-paginated, most recent first. Same helper as
// GET /api/listings/inquiries (frontend/src/lib/server/pagination/paginate.ts).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const rows = await prisma.tokenTransaction.findMany({
      where: { userId: auth.user.sub, ...cursorWhere(cursor) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });

    const { items, nextCursor } = buildPage(rows, limit);

    return NextResponse.json(
      {
        items: items.map((row) => ({
          id: row.id,
          date: row.createdAt.toISOString(),
          description: row.description,
          type: row.type,
          amount: row.amount,
          balance: row.balanceAfter,
        })),
        nextCursor,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/api/tokens/transactions/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/tokens/transactions
git commit -m "feat(api): add GET /api/tokens/transactions"
```

---

## Task 7: Wire `/jetons` to real data + working purchase button

**Files:**
- Modify: `frontend/src/app/jetons/page.tsx`

**Interfaces:**
- Consumes: `api` + `ApiError` from `@/lib/api`; `useToast` from `@/contexts/ToastContext`; `TOKEN_PACK_CATALOG`, `TOKEN_PACK_KEYS`, `TOKEN_PURCHASE_CURRENCY`, `type TokenPackKey` from `@/lib/token-packs` (Task 2); `GET /api/tokens/wallet`, `GET /api/tokens/usage-this-month`, `GET /api/tokens/transactions` (Tasks 4-6); `POST /api/orders` (existing, unmodified).
- Produces: nothing (leaf — this is the page).

No automated test for this file (no browser test harness in this repo, matching `/visites`, `/contacts`, `/demandes` — see spec's Tests section). Verify manually per Step 6.

- [ ] **Step 1: Replace the hardcoded `TOKEN_PACKS` array with the shared catalog**

In `frontend/src/app/jetons/page.tsx`, remove the local `interface TokenPack` and the `TOKEN_PACKS` constant (lines 19-46 in the current file). Add this import near the top, alongside the other `@/lib/...` imports:

```tsx
import {
  TOKEN_PACK_CATALOG,
  TOKEN_PACK_KEYS,
  TOKEN_PURCHASE_CURRENCY,
  type TokenPackKey,
} from '@/lib/token-packs';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
```

Where the page currently maps `TOKEN_PACKS.map((pack) => ...)`, change the source array to `TOKEN_PACK_KEYS.map((key) => { const pack = TOKEN_PACK_CATALOG[key]; ... })`, keeping the rest of the card markup (name/tokens/price/perToken/select button) identical — `pack.name` becomes `pack.label`, `pack.price`/`pack.perToken` (currently pre-formatted French strings) are now derived at render time:

```tsx
const priceLabel = `${pack.priceFcfa.toLocaleString('fr-FR')} FCFA`;
const perTokenLabel = `${Math.round(pack.priceFcfa / pack.tokens).toLocaleString('fr-FR')} FCFA/jeton`;
```

`pack.popular` (previously a per-pack boolean) becomes `pack.key === 'STANDARD'` inline in the JSX where the "Populaire" badge is rendered.

`selectedPack` state type changes from `useState<string>('standard')` to `useState<TokenPackKey>('STANDARD')`.

- [ ] **Step 2: Remove the mocked `TRANSACTIONS` array and its types**

Delete the `type TxType`, `interface Transaction`, and `const TRANSACTIONS: Transaction[] = [...]` block. Keep `TX_STYLE` (still needed to render the badge) — its keys `'achat' | 'utilisation' | 'bonus'` now come from mapping the API's `'PURCHASE' | 'USAGE' | 'BONUS'`:

```tsx
function mapTxType(apiType: string): TxType {
  if (apiType === 'PURCHASE') return 'achat';
  if (apiType === 'USAGE') return 'utilisation';
  return 'bonus';
}
```

(`TxType` stays declared as `'achat' | 'utilisation' | 'bonus'` — only its source changes from a mock literal to this mapping function.)

- [ ] **Step 3: Add state + fetch effects for balance, usage, and transactions**

Near the top of the `JetonsPage` component body, alongside the existing `selectedPack` state:

```tsx
const { toast } = useToast();
const [balance, setBalance] = useState<number | null>(null);
const [usedThisMonth, setUsedThisMonth] = useState<number | null>(null);
const [transactions, setTransactions] = useState<
  { id: string; date: string; description: string; type: TxType; amount: number; balance: number }[]
>([]);
const [buying, setBuying] = useState(false);

useEffect(() => {
  let cancelled = false;
  api<{ balance: number }>('/api/tokens/wallet')
    .then((res) => {
      if (!cancelled) setBalance(res.balance);
    })
    .catch(() => undefined);
  api<{ used: number }>('/api/tokens/usage-this-month')
    .then((res) => {
      if (!cancelled) setUsedThisMonth(res.used);
    })
    .catch(() => undefined);
  api<{
    items: { id: string; date: string; description: string; type: string; amount: number; balance: number }[];
  }>('/api/tokens/transactions')
    .then((res) => {
      if (!cancelled) {
        setTransactions(
          res.items.map((tx) => ({ ...tx, type: mapTxType(tx.type) })),
        );
      }
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
  };
}, []);
```

Add `useEffect` to the existing `import { useState } from 'react';` line, making it `import { useEffect, useState } from 'react';`.

- [ ] **Step 4: Wire the "Acheter des jetons" button**

Add this handler inside `JetonsPage`, above the `return`:

```tsx
async function buyTokens() {
  const pack = TOKEN_PACK_CATALOG[selectedPack];
  setBuying(true);
  try {
    const res = await api<{ paymentUrl: string }>('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: {
        amount: pack.priceFcfa,
        currency: TOKEN_PURCHASE_CURRENCY,
        metadata: { kind: 'token_purchase', packKey: pack.key },
      },
    });
    window.location.href = res.paymentUrl;
  } catch (err) {
    toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    setBuying(false);
  }
}
```

Update the header's "Acheter des jetons" `<button>` (currently `disabled title="Bientôt disponible"`) to:

```tsx
<button
  type="button"
  disabled={buying}
  onClick={() => void buyTokens()}
  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
>
  <Coins className="h-[15px] w-[15px]" aria-hidden />
  <span className="lg:hidden">{buying ? '…' : 'Acheter'}</span>
  <span className="hidden lg:inline">{buying ? 'Traitement…' : 'Acheter des jetons'}</span>
</button>
```

Leave the "Exporter" button and the transaction table's "Filtrer" button exactly as they are (`disabled`, `title="Bientôt disponible"`) — out of scope.

- [ ] **Step 5: Replace hardcoded balance/usage displays with fetched state**

"Solde de jetons" card — replace the hardcoded `<p ...>240</p>` with:

```tsx
<p className="font-sora mb-1.5 text-3xl font-semibold">{balance ?? '—'}</p>
```

"Jetons utilisés ce mois" card — replace the hardcoded `60 / 300` text and the progress bar `<div>` beneath it with just the real count (no denominator, no bar — per the design decision that no real monthly cap exists):

```tsx
<p className="font-sora mb-1.5 text-2xl font-semibold text-neutral-900">
  {usedThisMonth ?? '—'}
</p>
```

(Delete the `<div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">...</div>` progress-bar block that followed it.)

Transaction table — change `TRANSACTIONS.map((tx) => ...)` to `transactions.map((tx) => ...)`; the row rendering body stays identical since the mapped shape (`id/date/description/type/amount/balance`) matches what the JSX already destructures. Format `tx.date` (now an ISO string) at render time instead of using it raw:

```tsx
{new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
```

If `transactions.length === 0`, the existing `<tbody>` will render an empty table — acceptable (no empty-state redesign requested).

- [ ] **Step 6: Manual verification**

Run: `pnpm dev` (from repo root) and sign in as a test user.

1. Navigate to `http://localhost:3000/jetons`. Confirm "Solde de jetons" shows `0` (no wallet row yet) and "Jetons utilisés ce mois" shows `0`, transaction table is empty. VR listings section and the donut chart still show the same mocked content as before.
2. Select a pack, click "Acheter des jetons" — confirm it redirects to a Bictorys checkout URL (requires `BICTORYS_*` env vars configured locally; if absent, confirm the button surfaces a toast with `PAYMENT_PROVIDER_UNCONFIGURED` rather than crashing).
3. If a full Bictorys sandbox payment can be completed, confirm that after redirect back, revisiting `/jetons` shows the updated balance and a new "Achat pack …" row in the transaction table.

- [ ] **Step 7: Run the full verification gate**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all four pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/jetons/page.tsx
git commit -m "feat(jetons): wire real wallet balance, usage, history, and purchase flow"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), pack catalog (Task 2), purchase flow + webhook credit (Task 3), `GET /api/tokens/wallet` (Task 4), `GET /api/tokens/usage-this-month` (Task 5), `GET /api/tokens/transactions` (Task 6), frontend wiring incl. dropping the fake `/300` denominator (Task 7) — every spec section has a task. VR listings / usage breakdown explicitly left untouched per Task 7 Step 1-5 scope. Export/Filtre buttons explicitly left disabled per Task 7 Step 4.
- **Type consistency:** `TokenPackKey` (Task 2) flows unchanged through Task 3 (webhook `meta.packKey`) and Task 7 (`selectedPack` state, `buyTokens`). `TokenTransactionDTO` shape (`id/date/description/type/amount/balance`) defined in Task 6 is consumed as-is by Task 7's `transactions` state and `mapTxType`. `tx.tokenWallet.upsert`/`tx.tokenTransaction.create` signatures in Task 3 match the Prisma models defined in Task 1.
- **No placeholders:** every step has runnable code, no "add error handling" hand-waving — errors are handled the same way the codebase already handles them (`ApiError` + toast, `auth instanceof NextResponse` early-return).
