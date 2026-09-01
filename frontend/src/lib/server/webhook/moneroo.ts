// frontend/src/lib/server/webhook/moneroo.ts
//
// Re-exports the WebhookProvider impl from the payments adapter so the
// webhook namespace is cohesive (handler factory + per-provider impls).
// Mirrors webhook/bictorys.ts's lazy-init wrapper pattern (supports
// vi.stubEnv in tests — env is read on first call, not at module load).
import 'server-only';
import type { WebhookProvider } from './handler';
import { createMonerooProvider, type MonerooWebhookPayload } from '../payments/moneroo';

export type { MonerooWebhookPayload };

let _provider: WebhookProvider<MonerooWebhookPayload> | null = null;

/** Lazy-init — env reads happen at first call so `vi.stubEnv` works in tests. */
export function getMonerooWebhookProvider(): WebhookProvider<MonerooWebhookPayload> {
  if (_provider) return _provider;
  const env = {
    MONEROO_API_URL: process.env.MONEROO_API_URL ?? '',
    MONEROO_SECRET_KEY: process.env.MONEROO_SECRET_KEY ?? '',
    MONEROO_WEBHOOK_SECRET: process.env.MONEROO_WEBHOOK_SECRET ?? '',
  };
  if (!env.MONEROO_API_URL || !env.MONEROO_SECRET_KEY || !env.MONEROO_WEBHOOK_SECRET) {
    throw new Error('Moneroo webhook provider not configured (env missing)');
  }
  _provider = createMonerooProvider(env).webhookProvider;
  return _provider;
}

/** Convenience binding for the route file. */
export const monerooWebhookProvider: WebhookProvider<MonerooWebhookPayload> = {
  name: 'moneroo',
  verifySignature: (raw, headers) => getMonerooWebhookProvider().verifySignature(raw, headers),
  parsePayload: (raw) => getMonerooWebhookProvider().parsePayload(raw),
  extractIds: (payload) => getMonerooWebhookProvider().extractIds(payload),
};

/** Test-only — clear the cached provider for `vi.stubEnv` reuse. */
export function __resetMonerooWebhookProvider(): void {
  _provider = null;
}
