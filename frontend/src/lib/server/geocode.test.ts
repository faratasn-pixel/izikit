import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeCity } from './geocode';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('geocodeCity', () => {
  it('returns lat/lon parsed from the first Nominatim result', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '6.3654', lon: '2.4183' }],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toEqual({ lat: 6.3654, lon: 2.4183 });
  });

  it('returns null when Nominatim returns no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Nowhere', 'Nowhere');
    expect(result).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => [],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toBeNull();
  });
});
