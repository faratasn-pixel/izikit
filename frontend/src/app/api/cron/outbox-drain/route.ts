/**
 * POST /api/cron/outbox-drain — Vercel cron handler (every 1 minute).
 *
 * Thin adapter (~60 LOC). All business logic lives in PROTECTED helpers:
 *   - verifyCronSecret  — auth gate (CRON-06)
 *   - withLease         — multi-instance coordination (D-07)
 *   - drainOutbox       — per-row claim, backoff, dead-letter (PROTECTED)
 *
 * Lifecycle inside the lease:
 *   1. Reset stuck PROCESSING rows older than 90s (D-09).
 *   2. Drain up to BATCH_SIZE PENDING rows via the dispatcher.
 *
 * Pitfall 7: OutboxEvent has NO `startedAt` column. The stuck-row reset uses
 * `scheduledAt` as the cutoff — dispatcher.ts does NOT touch scheduledAt on
 * claim, so a row stuck in PROCESSING for ≥90s reliably matches.
 *
 * Pitfall 4: rows reset from PROCESSING carry their `attempts++` history.
 * The dispatcher's backoff index uses `attempts - 1`, so a reset row hits a
 * longer backoff slot. Acceptable feature — chronic failures back off more.
 *
 * Pitfall 3: lease TTL is ~2× maxDuration so a stuck leader can't deadlock
 * its peers indefinitely, but doesn't expire mid-execution under load.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // D-10

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { drainOutbox } from '@/lib/server/outbox/dispatcher';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { redis } from '@/lib/server/redis';
import { prisma } from '@/lib/server/prisma';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const log = createLogger();
const BATCH_SIZE = 100; // D-08 — not env-configurable in v1
const STUCK_RESET_MS = 90_000; // D-09 — 90 seconds
const LEASE_TTL_MS = 120_000; // ~2× maxDuration (Pitfall 3)

export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let processed = 0;

    await withLease(redis ?? undefined, 'outbox-drain', LEASE_TTL_MS, async () => {
      // 1. FIRST step (D-09): reset stuck PROCESSING rows older than 90s.
      // Uses `scheduledAt` (not `startedAt` — column does not exist) per
      // RESEARCH §"Schema corrections" + Pitfall 7. The dispatcher does NOT
      // update scheduledAt on claim, so any row stuck in PROCESSING for ≥90s
      // reliably matches this WHERE clause and gets re-queued.
      await prisma.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          scheduledAt: { lt: new Date(Date.now() - STUCK_RESET_MS) },
        },
        data: { status: 'PENDING', scheduledAt: new Date() },
      });

      // 2. Drain. EmailQueue is required for `email.*` outbox kinds; if
      // unconfigured (no UPSTASH+BREVO env), the dispatcher throws per-row
      // ("email queue not configured"), the row is rescheduled with backoff,
      // and notification.* events still process. Graceful degradation.
      // exactOptionalPropertyTypes: spread to omit `emailQueue` when null
      // rather than assigning undefined to an optional field.
      const queue = getEmailQueue();
      const result = await drainOutbox(
        { prisma, ...(queue ? { emailQueue: queue } : {}) },
        BATCH_SIZE,
      );
      processed = result.processed;
      log.info('outbox-drain tick', {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        dead: result.dead,
        requestId: ctx.requestId,
      });
    });

    return NextResponse.json(
      { ok: true, processed },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
