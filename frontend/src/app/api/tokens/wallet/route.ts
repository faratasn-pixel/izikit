// GET /api/tokens/wallet — /jetons "Solde de jetons" card.
//
// Absence of a TokenWallet row means "never purchased tokens" (no row is
// ever created for a user with a 0 balance — same find-or-create-on-first-
// purchase convention as Subscription; the row is created lazily by the
// Bictorys webhook's upsert on first successful token purchase).
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

    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId: auth.user.sub },
      select: { balance: true },
    });

    return NextResponse.json(
      { balance: wallet?.balance ?? 0 },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
