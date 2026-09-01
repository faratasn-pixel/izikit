// frontend/src/lib/server/queues/email-queue-singleton.ts — Phase 5.
//
// Lazy-init EmailQueue. Returns null when any of UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN / BREVO_API_KEY is missing. Callers MUST handle
// the null case gracefully — outbox-drain skips email.* events with a logged
// "email queue not configured" warning; email-queue-drain returns a no-op
// `{ ok: true, processed: 0 }` response.
//
// Pattern mirrors payments/provider-singleton.ts (lazy + cached + reset hook).
//
// Uses `createMailer({ BREVO_API_KEY, EMAIL_FROM })` from `lib/server/email.ts`
// — keeps the surface DRY and benefits from its built-in List-Unsubscribe
// header support.
import 'server-only';
import { EmailQueue } from './email-queue';
import { prisma } from '../prisma';
import { redis } from '../redis';
import { createMailer } from '../email';
import { createLogger } from '../logger';

const log = createLogger();

let _queue: EmailQueue | null = null;
let _initialized = false;

/**
 * Lazy-init EmailQueue. Idempotent — first call constructs, subsequent calls
 * return the cached instance (or cached null if env was missing on first call).
 *
 * Returns null if any required env var is missing — caller decides whether to
 * skip work (preferred) or surface as an error.
 */
export function getEmailQueue(): EmailQueue | null {
  if (_initialized) return _queue;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  const brevoKey = process.env.BREVO_API_KEY ?? '';
  const emailFrom = process.env.EMAIL_FROM ?? '';

  if (!url || !token || !brevoKey || !emailFrom || !redis) {
    log.warn(
      'email-queue-singleton: not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN / BREVO_API_KEY / EMAIL_FROM required)',
    );
    _initialized = true;
    _queue = null;
    return null;
  }

  const mailer = createMailer({
    BREVO_API_KEY: brevoKey,
    EMAIL_FROM: emailFrom,
  });

  _queue = new EmailQueue({ redis, prisma, mailer });
  _initialized = true;
  return _queue;
}

/** Test-only — clear the cached queue. */
export function __resetEmailQueueSingleton(): void {
  _queue = null;
  _initialized = false;
}
