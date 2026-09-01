import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  return import('./provider-singleton');
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('provider-singleton (default: Moneroo)', () => {
  it('throws PaymentProviderUnconfiguredError when MONEROO_* env is missing', async () => {
    const { getProvider, PaymentProviderUnconfiguredError } = await freshModule();
    expect(() => getProvider()).toThrow(PaymentProviderUnconfiguredError);
  });

  it('constructs a Moneroo provider when env is fully set', async () => {
    vi.stubEnv('MONEROO_API_URL', 'https://api.moneroo.io');
    vi.stubEnv('MONEROO_SECRET_KEY', 'test-secret-key');
    vi.stubEnv('MONEROO_WEBHOOK_SECRET', 'test-webhook-secret');
    const { getProvider } = await freshModule();
    const provider = getProvider();
    expect(provider.name).toBe('moneroo');
  });

  it('caches the provider across calls', async () => {
    vi.stubEnv('MONEROO_API_URL', 'https://api.moneroo.io');
    vi.stubEnv('MONEROO_SECRET_KEY', 'test-secret-key');
    vi.stubEnv('MONEROO_WEBHOOK_SECRET', 'test-webhook-secret');
    const { getProvider } = await freshModule();
    expect(getProvider()).toBe(getProvider());
  });

  it('exposes a shared circuit breaker named moneroo.charge', async () => {
    const { breaker } = await freshModule();
    expect(breaker).toBeDefined();
  });
});
