import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fulfillPaidOrder } from './fulfill-order';

const subscriptionUpsert = vi.fn();
const tokenWalletUpsert = vi.fn();
const tokenTransactionCreate = vi.fn();
const outboxCreate = vi.fn();

const tx = {
  subscription: { upsert: subscriptionUpsert },
  tokenWallet: { upsert: tokenWalletUpsert },
  tokenTransaction: { create: tokenTransactionCreate },
  outboxEvent: { create: outboxCreate },
} as never;

beforeEach(() => {
  subscriptionUpsert.mockReset();
  tokenWalletUpsert.mockReset().mockResolvedValue({ userId: 'u1', balance: 150 });
  tokenTransactionCreate.mockReset();
  outboxCreate.mockReset();
});

describe('fulfillPaidOrder', () => {
  it('activates a subscription when metadata.kind is subscription_plan_change', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: 'u1',
      customerEmail: null,
      amount: 29_900,
      currency: 'XOF',
      metadata: { kind: 'subscription_plan_change', planKey: 'PRO_AGENT' },
    });
    expect(subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        update: expect.objectContaining({ planKey: 'PRO_AGENT', status: 'ACTIVE' }),
      }),
    );
  });

  it('credits the token wallet when metadata.kind is token_purchase', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: 'u1',
      customerEmail: null,
      amount: 40_000,
      currency: 'XOF',
      metadata: { kind: 'token_purchase', packKey: 'STANDARD' },
    });
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

  it('ignores an unknown packKey', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: 'u1',
      customerEmail: null,
      amount: 40_000,
      currency: 'XOF',
      metadata: { kind: 'token_purchase', packKey: 'NOT_A_REAL_PACK' },
    });
    expect(tokenWalletUpsert).not.toHaveBeenCalled();
  });

  it('enqueues a notification event when userId is present', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: 'u1',
      customerEmail: null,
      amount: 1000,
      currency: 'XOF',
    });
    const kinds = outboxCreate.mock.calls.map(
      (c) => (c[0] as { data: { kind: string } }).data.kind,
    );
    expect(kinds).toContain('notification.payment_received');
  });

  it('enqueues an email confirmation event when customerEmail is present', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: null,
      customerEmail: 'a@b.com',
      amount: 1000,
      currency: 'XOF',
    });
    const kinds = outboxCreate.mock.calls.map(
      (c) => (c[0] as { data: { kind: string } }).data.kind,
    );
    expect(kinds).toContain('email.payment_confirmation');
  });

  it('does nothing beyond outbox skips when userId and customerEmail are both null', async () => {
    await fulfillPaidOrder(tx, {
      id: 'o1',
      userId: null,
      customerEmail: null,
      amount: 1000,
      currency: 'XOF',
    });
    expect(outboxCreate).not.toHaveBeenCalled();
    expect(subscriptionUpsert).not.toHaveBeenCalled();
    expect(tokenWalletUpsert).not.toHaveBeenCalled();
  });
});
