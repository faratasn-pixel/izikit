// GET /api/tokens/transactions — /jetons "Historique des transactions" table.
// Cursor-paginated, most recent first. Same helper as
// GET /api/listings/inquiries (frontend/src/lib/server/pagination/paginate.ts).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const rows = await prisma.tokenTransaction.findMany({
      where: { userId: auth.user.sub, ...cursorWhere(cursor) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });

    const { items, nextCursor } = buildPage(rows, limit);

    return NextResponse.json(
      {
        items: items.map((row) => ({
          id: row.id,
          date: row.createdAt.toISOString(),
          description: row.description,
          type: row.type,
          amount: row.amount,
          balance: row.balanceAfter,
        })),
        nextCursor,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
