// Source: planner-derived; covers OPS-01 + OPS-04.
// Asserts .env.example documents the N0C dual-URL contract (DATABASE_URL ===
// DIRECT_URL, non-pooled local Postgres, no neon.tech) + CRON_SECRET.
//
// On failure, each assertion message names the offending file path so an
// incident responder can grep a CI log without grepping the test source.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// frontend/src/lib/server/observability/ → repo root is 5 levels up.
// Use import.meta.url so this works under both ESM and CJS Vitest configs.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_EXAMPLE = resolve(__dirname, '../../../../../.env.example');

describe('.env.example shape — cible PlanetHoster N0C (OPS-01, OPS-04)', () => {
  const src = readFileSync(ENV_EXAMPLE, 'utf8');

  it(`DATABASE_URL est une URL postgres locale N0C, sans pooler Neon (file: ${ENV_EXAMPLE})`, () => {
    const m = src.match(/^DATABASE_URL="([^"]+)"/m);
    expect(m, `DATABASE_URL introuvable dans ${ENV_EXAMPLE}`).not.toBeNull();
    const url = m![1]!;
    expect(url).toMatch(/^postgresql:\/\//);
    expect(url).not.toMatch(/neon\.tech/);
    expect(url).not.toContain('pgbouncer=true');
    expect(url).toContain('schema=public');
  });

  it('DIRECT_URL est présent et documenté comme identique à DATABASE_URL sur N0C', () => {
    expect(src).toMatch(/^DIRECT_URL="postgresql:\/\/[^"]+"/m);
    expect(src.toLowerCase()).toContain('migrate deploy');
    expect(src).toMatch(/identique à DATABASE_URL|même valeur que DATABASE_URL/i);
  });

  it('DATABASE_URL et DIRECT_URL ont la MÊME valeur (Postgres N0C non poolé)', () => {
    const db = src.match(/^DATABASE_URL="([^"]+)"/m);
    const direct = src.match(/^DIRECT_URL="([^"]+)"/m);
    expect(db, `DATABASE_URL introuvable dans ${ENV_EXAMPLE}`).not.toBeNull();
    expect(direct, `DIRECT_URL introuvable dans ${ENV_EXAMPLE}`).not.toBeNull();
    expect(direct![1]).toBe(db![1]);
  });

  it('déclare CRON_SECRET avec défaut vide + indice openssl', () => {
    expect(src).toMatch(/^CRON_SECRET=""/m);
    expect(src).toContain('openssl rand -base64 32');
  });
});

// ───────────────────────────────────────────────────────────────────────
// Phase 4 — UPLOAD + Cloudinary + WITHDRAWAL safety knobs.
//
// These assertions are tripwires: refactors that "tidy up" .env.example by
// stripping the FINANCIAL-SAFETY warning block or the verbatim defaults
// will fail CI here. The wording is the product — the test quotes it
// character-for-character.
// ───────────────────────────────────────────────────────────────────────
describe('.env.example phase 4 additions (UP-01, UP-02, WD-01..04)', () => {
  const src = readFileSync(ENV_EXAMPLE, 'utf8');

  it(`contains the verbatim WITHDRAWAL_BALANCE_CHECK FINANCIAL-SAFETY warning (file: ${ENV_EXAMPLE})`, () => {
    expect(src).toContain('⚠️  FINANCIAL-SAFETY WARNING — DO NOT CASUALLY DISABLE  ⚠️');
    expect(src).toContain('WITHDRAWAL_BALANCE_CHECK="1"');
  });

  it('declares the upload allow-list and max-bytes defaults', () => {
    expect(src).toContain('UPLOAD_ALLOWED_MIME="image/jpeg,image/png,image/webp"');
    expect(src).toContain('UPLOAD_MAX_BYTES="10485760"');
  });

  it('declares CLOUDINARY_* keys with empty defaults', () => {
    expect(src).toMatch(/^CLOUDINARY_CLOUD_NAME=""$/m);
    expect(src).toMatch(/^CLOUDINARY_API_KEY=""$/m);
    expect(src).toMatch(/^CLOUDINARY_API_SECRET=""$/m);
  });

  it('declares production-safe withdrawal-policy defaults', () => {
    expect(src).toContain('WITHDRAWAL_MIN_AMOUNT="1000"');
    expect(src).toContain('WITHDRAWAL_REQUIRE_PIN="1"');
  });
});

// ───────────────────────────────────────────────────────────────────────
// Phase 5 — webhook log retention + order expiration knobs.
//
// Tripwires for the two new env keys CRON-05 (webhook-log-purge retention)
// and the Phase-3 fork-knob ORDER_EXPIRATION_MINUTES. Refactors that drop
// either default fail CI here.
// ───────────────────────────────────────────────────────────────────────
describe('.env.example phase 5 additions (CRON-05 + Phase 5 ENV)', () => {
  const src = readFileSync(ENV_EXAMPLE, 'utf8');

  it('contains WEBHOOK_LOG_RETENTION_DAYS and ORDER_EXPIRATION_MINUTES with defaults', () => {
    expect(src).toContain('WEBHOOK_LOG_RETENTION_DAYS="90"');
    expect(src).toContain('ORDER_EXPIRATION_MINUTES="30"');
  });
});
