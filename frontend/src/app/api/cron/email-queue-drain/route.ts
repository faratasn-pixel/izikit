export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // D-10

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { redis } from '@/lib/server/redis';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const log = createLogger();
const BATCH_SIZE = 100; // D-08
const LEASE_TTL_MS = 120_000; // ~2 × maxDuration (Pitfall 3)

export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let processed = 0;

    await withLease(redis ?? undefined, 'email-queue-drain', LEASE_TTL_MS, async () => {
      const queue = getEmailQueue();
      if (!queue) {
        // No mailer/redis configured — graceful no-op. Operators see this in
        // logs and can wire UPSTASH_REDIS_REST_URL + BREVO_API_KEY.
        log.warn(
          'email-queue-drain: not configured (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN/BREVO_API_KEY missing)',
          {
            requestId: ctx.requestId,
          },
        );
        return;
      }

      for (let i = 0; i < BATCH_SIZE; i++) {
        const handled = await queue.drainOne();
        if (!handled) break; // queue empty
        processed++;
      }

      log.info('email-queue-drain tick', { processed, requestId: ctx.requestId });
    });

    return NextResponse.json(
      { ok: true, processed },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

// Vercel Cron invokes scheduled routes with GET, not POST.
export const GET = POST;
