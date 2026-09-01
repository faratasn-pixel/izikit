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
