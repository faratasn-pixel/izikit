// Single source of truth for the 4 token packs (Banani "Jetons & visites
// virtuelles" screen). Shared between the purchase button (client) and the
// Bictorys webhook (server) so price/token-count never drift between what's
// charged and what's credited. No secrets here — safe to import from client
// components. Mirrors frontend/src/lib/subscription-plans.ts.

export const TOKEN_PACK_KEYS = ['STARTER', 'STANDARD', 'PRO', 'ENTREPRISE'] as const;
export type TokenPackKey = (typeof TOKEN_PACK_KEYS)[number];

export interface TokenPackDefinition {
  key: TokenPackKey;
  label: string;
  tokens: number;
  priceFcfa: number; // smallest currency unit; XOF has no decimals
}

export const TOKEN_PURCHASE_CURRENCY = 'XOF';

export const TOKEN_PACK_CATALOG: Record<TokenPackKey, TokenPackDefinition> = {
  STARTER: { key: 'STARTER', label: 'Starter', tokens: 50, priceFcfa: 15_000 },
  STANDARD: { key: 'STANDARD', label: 'Standard', tokens: 150, priceFcfa: 40_000 },
  PRO: { key: 'PRO', label: 'Pro', tokens: 350, priceFcfa: 85_000 },
  ENTREPRISE: { key: 'ENTREPRISE', label: 'Entreprise', tokens: 1000, priceFcfa: 220_000 },
};

export function isTokenPackKey(value: unknown): value is TokenPackKey {
  return typeof value === 'string' && (TOKEN_PACK_KEYS as readonly string[]).includes(value);
}
