// frontend/src/test-utils/moneroo-mock.ts
//
// Fixture builder for /api/webhooks/moneroo route tests. Mirrors
// bictorys-mock.ts. HMAC algorithm matches
// `frontend/src/lib/server/payments/moneroo.ts` verbatim (hex HMAC-SHA256
// of the raw body with the webhook secret) — drift between fixture and
// verifier is impossible by construction.
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import type { MonerooWebhookPayload } from '@/lib/server/payments/moneroo';

export interface MonerooFixtureOpts {
  status?: 'success' | 'failed' | 'cancelled';
  paymentId?: string;
  webhookSecret?: string;
  /** Corrupt the signature to simulate a tampered/invalid delivery. */
  badSignature?: boolean;
}

export function monerooFixture(opts: MonerooFixtureOpts = {}): {
  rawBody: Buffer;
  headers: Record<string, string>;
  payload: MonerooWebhookPayload;
} {
  const status = opts.status ?? 'success';
  const event =
    status === 'success'
      ? 'payment.success'
      : status === 'failed'
        ? 'payment.failed'
        : 'payment.cancelled';
  const payload: MonerooWebhookPayload = {
    event,
    data: {
      id: opts.paymentId ?? 'py_test_001',
      amount: 40_000,
      currency: 'XOF',
      status,
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const secret = opts.webhookSecret ?? 'test-webhook-secret';
  const sig = opts.badSignature
    ? '0'.repeat(64)
    : crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return {
    rawBody,
    headers: { 'content-type': 'application/json', 'x-moneroo-signature': sig },
    payload,
  };
}

/** Build a NextRequest with the fixture body + headers. Use in route tests. */
export function monerooFixtureRequest(opts: MonerooFixtureOpts = {}): {
  req: NextRequest;
  payload: MonerooWebhookPayload;
} {
  const { rawBody, headers, payload } = monerooFixture(opts);
  const body = rawBody as unknown as BodyInit;
  return {
    req: new NextRequest('http://localhost/api/webhooks/moneroo', {
      method: 'POST',
      headers,
      body,
    }),
    payload,
  };
}
