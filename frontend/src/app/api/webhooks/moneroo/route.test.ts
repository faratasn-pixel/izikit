import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { monerooFixtureRequest } from '@/test-utils/moneroo-mock';

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const orderFindFirst = vi.fn();
const orderUpdate = vi.fn();
const outboxCreate = vi.fn();
const subscriptionUpsert = vi.fn();
const tokenWalletUpsert = vi.fn();
const tokenTransactionCreate = vi.fn();

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

vi.mock('@/lib/server/prisma', () => ({
  prisma: { $transaction },
}));

beforeEach(() => {
  vi.stubEnv('MONEROO_API_URL', 'https://api.moneroo.io');
  vi.stubEnv('MONEROO_SECRET_KEY', 'test-secret-key');
  vi.stubEnv('MONEROO_WEBHOOK_SECRET', 'test-webhook-secret');
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
  orderFindFirst.mockReset();
  orderUpdate.mockReset();
  outboxCreate.mockReset();
  subscriptionUpsert.mockReset();
  tokenWalletUpsert.mockReset();
  tokenTransactionCreate.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('POST /api/webhooks/moneroo', () => {
  it('valid HMAC + first delivery returns 200 deduped:false', async () => {
    findUnique.mockResolvedValueOnce(null);
    orderFindFirst.mockResolvedValueOnce(null); // unknown charge — onPaid drops
    const { POST } = await import('./route');
    const { req } = monerooFixtureRequest({ status: 'success' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deduped: false });
    expect(create).toHaveBeenCalled();
  });

  it('replay of same (externalId, eventType) returns deduped:true', async () => {
    findUnique.mockResolvedValueOnce({ id: 'wl1', processedAt: new Date() });
    const { POST } = await import('./route');
    const { req } = monerooFixtureRequest({ status: 'success' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deduped: true });
    expect(create).not.toHaveBeenCalled();
  });

  it('tampered signature returns 401', async () => {
    const { POST } = await import('./route');
    const { req } = monerooFixtureRequest({ status: 'success', badSignature: true });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

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
    const { req } = monerooFixtureRequest({ status: 'success' });
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
          orderId: 'o1',
        }),
      }),
    );
  });

  it('onFailed marks the order FAILED', async () => {
    findUnique.mockResolvedValueOnce(null);
    orderFindFirst.mockResolvedValueOnce({ id: 'o2', userId: 'u1' });
    const { POST } = await import('./route');
    const { req } = monerooFixtureRequest({ status: 'failed' });
    await POST(req);
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: 'o2' }, data: { status: 'FAILED' } });
  });

  it('cancelled status is treated as failed', async () => {
    findUnique.mockResolvedValueOnce(null);
    orderFindFirst.mockResolvedValueOnce({ id: 'o3', userId: 'u1' });
    const { POST } = await import('./route');
    const { req } = monerooFixtureRequest({ status: 'cancelled' });
    await POST(req);
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: 'o3' }, data: { status: 'FAILED' } });
  });

  it('exports runtime=nodejs and dynamic=force-dynamic', async () => {
    const mod = (await import('./route')) as { runtime?: string; dynamic?: string };
    expect(mod.runtime).toBe('nodejs');
    expect(mod.dynamic).toBe('force-dynamic');
  });
});
