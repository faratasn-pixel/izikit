/**
 * Moneroo provider — hosted multi-provider aggregator covering African
 * mobile money + cards (Wave, Orange Money, MTN, Moov, Airtel, …) behind a
 * single API. Charges only — Moneroo does not expose a payout/disbursement
 * API, so `payout()` and `refund()` both throw explicitly (callers should
 * keep using the Bictorys provider directly for withdrawals if needed).
 *
 * Auth: `Authorization: Bearer <secretKey>`. No separate sandbox host — test
 * vs live is determined by which secret key you use.
 *
 * Webhook signature: `X-Moneroo-Signature` header = hex HMAC-SHA256 of the
 * raw body with the shared `MONEROO_WEBHOOK_SECRET`.
 *
 * Dev escape hatch: when `process.env.SMOKE_BYPASS_WEBHOOK_VERIFY === '1'`,
 * `verifySignature` returns `{ valid: true }` regardless. **DEV ONLY** — a
 * loud warning is logged on every bypass. Mirrors the same flag used by the
 * Bictorys provider.
 */
import crypto from 'node:crypto';
import { createLogger } from '../logger';
import type { WebhookProvider, ParsedIds } from '../webhook/handler';
import type {
  PaymentProvider,
  ChargeInput,
  ChargeResult,
  PayoutInput,
  PayoutResult,
  RefundInput,
  RefundResult,
} from './provider';

const logger = createLogger();

// ───────────────────────────────────────────────────────────────────────
// Env shape
// ───────────────────────────────────────────────────────────────────────

export interface MonerooEnv {
  /** Secret key for /v1/payments/*. Required. */
  MONEROO_SECRET_KEY: string;
  /** Base URL — always "https://api.moneroo.io" (sandbox vs live is key-based). */
  MONEROO_API_URL: string;
  /** HMAC secret paired with the X-Moneroo-Signature webhook header. */
  MONEROO_WEBHOOK_SECRET: string;
}

// ───────────────────────────────────────────────────────────────────────
// Webhook payload
// ───────────────────────────────────────────────────────────────────────

export interface MonerooWebhookPayload {
  /** e.g. "payment.success" | "payment.failed" | "payment.cancelled" | "payment.initiated". */
  event?: string;
  data?: {
    id?: string;
    amount?: number;
    currency?: string | { code?: string };
    /** e.g. "success" | "succeeded" | "failed" | "cancelled" | "pending". */
    status?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ───────────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────────────────────

const HTTP_TIMEOUT_MS = 30_000;
const DESCRIPTION_MAX_LEN = 200;

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function classifyStatus(raw: string | undefined): 'PENDING' | 'PAID' | 'FAILED' {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'success' || s === 'succeeded') return 'PAID';
  if (s === 'failed' || s === 'cancelled' || s === 'canceled') return 'FAILED';
  return 'PENDING';
}

/** Moneroo requires customer.first_name/last_name — split a display name. */
function splitCustomerName(name: string | undefined, email: string | undefined) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    const localPart = (email ?? '').split('@')[0] || 'Client';
    return { firstName: localPart, lastName: '-' };
  }
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0]!;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '-';
  return { firstName, lastName };
}

/** Moneroo rejects non-string metadata values with a 422 — filter + stringify. */
function stringifyMetadata(input: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────
// Factory
// ───────────────────────────────────────────────────────────────────────

export interface MonerooProviderHandle extends PaymentProvider {
  webhookProvider: WebhookProvider<MonerooWebhookPayload>;
}

export function createMonerooProvider(env: MonerooEnv): MonerooProviderHandle {
  if (!env.MONEROO_API_URL) throw new Error('createMonerooProvider: MONEROO_API_URL is required');
  if (!env.MONEROO_SECRET_KEY)
    throw new Error('createMonerooProvider: MONEROO_SECRET_KEY is required');
  if (!env.MONEROO_WEBHOOK_SECRET)
    throw new Error('createMonerooProvider: MONEROO_WEBHOOK_SECRET is required');

  const baseUrl = env.MONEROO_API_URL.replace(/\/+$/, '');

  // ── charge ─────────────────────────────────────────────────────────
  async function charge(input: ChargeInput): Promise<ChargeResult> {
    if (!input.customer.email) {
      throw new Error('Moneroo charge requires customer.email');
    }
    const { firstName, lastName } = splitCustomerName(input.customer.name, input.customer.email);

    const description =
      typeof input.metadata?.description === 'string'
        ? (input.metadata.description as string)
        : 'Paiement HabitatAfrik';

    const body: Record<string, unknown> = {
      amount: input.amount,
      currency: input.currency,
      description: description.slice(0, DESCRIPTION_MAX_LEN),
      // Moneroo has a single redirect URL — there is no separate cancel_url.
      // It appends `?paymentId=...&paymentStatus=...` on return, so the
      // success page can branch on paymentStatus itself.
      return_url: input.successUrl,
      customer: {
        email: input.customer.email,
        first_name: firstName,
        last_name: lastName,
        ...(input.customer.phone ? { phone: input.customer.phone } : {}),
      },
      metadata: { paymentId: input.externalRef, ...stringifyMetadata(input.metadata) },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v1/payments/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.MONEROO_SECRET_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Moneroo network error: ${msg}`);
    }
    clearTimeout(timer);

    const raw = await res.text();
    let parsed: { data?: { id?: string; checkout_url?: string; status?: string } } | undefined;
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : undefined;
    } catch {
      throw new Error(`Moneroo returned non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(`Moneroo charge failed: HTTP ${res.status} — ${raw.slice(0, 200)}`);
    }

    const providerChargeId = parsed?.data?.id ?? '';
    const paymentUrl = parsed?.data?.checkout_url ?? '';
    if (!providerChargeId || !paymentUrl) {
      throw new Error('Moneroo returned no charge id or checkout_url');
    }

    return {
      providerChargeId,
      paymentUrl,
      status: classifyStatus(parsed?.data?.status),
    };
  }

  // ── payout / refund — not supported by Moneroo's public API ────────
  async function payout(_input: PayoutInput): Promise<PayoutResult> {
    throw new Error('Payout not supported by Moneroo provider — use Bictorys for withdrawals');
  }

  async function refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error('Refund not supported by Moneroo provider');
  }

  // ── webhook provider ──────────────────────────────────────────────
  const webhookProvider: WebhookProvider<MonerooWebhookPayload> = {
    name: 'moneroo',

    verifySignature(rawBody, headers) {
      if (process.env.SMOKE_BYPASS_WEBHOOK_VERIFY === '1') {
        logger.warn(
          '[moneroo] !! SMOKE_BYPASS_WEBHOOK_VERIFY=1 — webhook signature ACCEPTED unconditionally. NEVER set this in production.',
        );
        return { valid: true };
      }

      const sig = headers['x-moneroo-signature'];
      if (!sig) return { valid: false, reason: 'no x-moneroo-signature header' };

      const expected = crypto
        .createHmac('sha256', env.MONEROO_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      if (timingSafeStringEqual(sig.trim(), expected)) {
        return { valid: true };
      }
      return { valid: false, reason: 'HMAC mismatch' };
    },

    parsePayload(rawBody) {
      const text = rawBody.toString('utf8');
      return JSON.parse(text) as MonerooWebhookPayload;
    },

    extractIds(payload): ParsedIds {
      const externalId = String(payload.data?.id ?? '');
      const eventType = String(payload.event ?? payload.data?.status ?? 'unknown');
      const klass = classifyStatus(payload.data?.status);
      const kind: ParsedIds['kind'] =
        klass === 'PAID' ? 'paid' : klass === 'FAILED' ? 'failed' : 'other';
      return { externalId, eventType, kind };
    },
  };

  return {
    name: 'moneroo',
    charge,
    payout,
    refund,
    webhookProvider,
  };
}
