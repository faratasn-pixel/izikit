import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  monerooWebhookProvider,
  getMonerooWebhookProvider,
  __resetMonerooWebhookProvider,
} from './moneroo';

const SECRET = 'test-webhook-secret';

beforeEach(() => {
  vi.stubEnv('MONEROO_API_URL', 'https://api.moneroo.io');
  vi.stubEnv('MONEROO_SECRET_KEY', 'test-secret-key');
  vi.stubEnv('MONEROO_WEBHOOK_SECRET', SECRET);
  __resetMonerooWebhookProvider();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetMonerooWebhookProvider();
});

describe('monerooWebhookProvider', () => {
  it('verifies a valid HMAC signature', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.success', data: { id: 'py1' } }));
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    const r = monerooWebhookProvider.verifySignature(body, { 'x-moneroo-signature': sig });
    expect(r.valid).toBe(true);
  });

  it('rejects a tampered body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.success', data: { id: 'py1' } }));
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    const tampered = Buffer.from(JSON.stringify({ event: 'payment.failed', data: { id: 'py1' } }));
    const r = monerooWebhookProvider.verifySignature(tampered, { 'x-moneroo-signature': sig });
    expect(r.valid).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const body = Buffer.from('{}');
    const r = monerooWebhookProvider.verifySignature(body, {});
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/no x-moneroo-signature/i);
  });

  it('throws when env unset (lazy init)', () => {
    vi.stubEnv('MONEROO_SECRET_KEY', '');
    __resetMonerooWebhookProvider();
    expect(() => getMonerooWebhookProvider()).toThrow(/not configured/i);
  });

  it('extractIds maps status=success to kind=paid', () => {
    const ids = monerooWebhookProvider.extractIds({
      event: 'payment.success',
      data: { id: 'py1', status: 'success' },
    });
    expect(ids).toEqual({ externalId: 'py1', eventType: 'payment.success', kind: 'paid' });
  });

  it('extractIds maps status=failed to kind=failed', () => {
    const ids = monerooWebhookProvider.extractIds({
      event: 'payment.failed',
      data: { id: 'py2', status: 'failed' },
    });
    expect(ids.kind).toBe('failed');
  });

  it('extractIds maps status=cancelled to kind=failed', () => {
    const ids = monerooWebhookProvider.extractIds({
      event: 'payment.cancelled',
      data: { id: 'py3', status: 'cancelled' },
    });
    expect(ids.kind).toBe('failed');
  });

  it('extractIds maps status=pending to kind=other', () => {
    const ids = monerooWebhookProvider.extractIds({
      event: 'payment.initiated',
      data: { id: 'py4', status: 'pending' },
    });
    expect(ids.kind).toBe('other');
  });
});
