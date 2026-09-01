// POST /api/subscriptions/change-plan — /settings "Abonnement & paiement".
//
// Only handles moves to the FREE plan (immediate, no charge). Moving to a
// paid plan is NOT done here — it goes through the existing, battle-tested
// `POST /api/orders` one-time-charge pipeline directly from the client
// (metadata.kind = "subscription_plan_change"), and the webhook activates
// the plan once Bictorys confirms payment (see
// frontend/src/app/api/webhooks/bictorys/route.ts). Keeping upgrades out of
// this route avoids a second, competing charge-creation path.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { PLAN_CATALOG, PLAN_KEYS } from '@/lib/subscription-plans';

const Body = z.object({
  planKey: z.enum(PLAN_KEYS),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) {
      csrfFail.headers.set('x-request-id', ctx.requestId);
      return csrfFail;
    }

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const target = PLAN_CATALOG[parsed.data.planKey];
    if (target.priceFcfa > 0) {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRES_PAYMENT',
          message: 'Upgrading to a paid plan requires a payment — use POST /api/orders',
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const subscription = await prisma.subscription.upsert({
      where: { userId: auth.user.sub },
      create: {
        userId: auth.user.sub,
        planKey: 'FREE',
        status: 'ACTIVE',
      },
      update: {
        planKey: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: null,
        canceledAt: null,
      },
      select: { planKey: true, status: true, currentPeriodEnd: true, canceledAt: true },
    });

    return NextResponse.json(
      { subscription },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
