// GET /api/tokens/usage-this-month — /jetons "Jetons utilisés ce mois" card.
//
// Sums TokenTransaction rows of type USAGE created since the 1st of the
// current calendar month. TokenTransaction.amount is stored negative for
// USAGE rows, so the sum is negative (or null when no rows exist) — we
// return its absolute value. Will read 0 until some feature in the app
// actually debits tokens (none does yet) — that is the correct, real
// behavior, not a bug.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await prisma.tokenTransaction.aggregate({
      where: { userId: auth.user.sub, type: 'USAGE', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    });

    const used = Math.abs(result._sum.amount ?? 0);

    return NextResponse.json({ used }, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}
