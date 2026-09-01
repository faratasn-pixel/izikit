export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // D-10

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { expirePendingOrders } from '@/lib/server/orders/expire';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const log = createLogger();
const LEASE_TTL_MS = 60_000; // ~2 × maxDuration (Pitfall 3)

export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let processed = 0;

    await withLease(redis ?? undefined, 'order-expiration', LEASE_TTL_MS, async () => {
      // D-14: helper reads Order.expiresAt set at creation time. The expiration-window
      // env (see .env.example) is documentation-only — forks adjusting checkout windows
      // tweak that value in their order-creation route (Phase 3) per RESEARCH A3.
      // This cron does NOT compute the cutoff itself.
      const { expired } = await expirePendingOrders({ prisma });
      processed = expired;
      log.info('order-expiration tick', { processed, requestId: ctx.requestId });
    });

    return NextResponse.json(
      { ok: true, processed },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

// Vercel Cron invokes scheduled routes with GET, not POST.
export const GET = POST;
