// GET/PATCH /api/preferences/regional — /settings "Langue & région" tab.
//
// Real, persisted, but DORMANT: no i18n library is wired in this starter,
// so `locale` doesn't actually translate any UI text, and nothing formats
// dates/numbers off `dateFormat`/`numberFormat` yet either. Same convention
// as the 5 notification-preference toggles shipped earlier this session.
// See .planning/banani/langue-region.md.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const SELECT = {
  locale: true,
  timezone: true,
  currency: true,
  dateFormat: true,
  numberFormat: true,
  country: true,
  city: true,
} as const;

const PatchBody = z.object({
  locale: z.enum(['fr', 'en', 'pt', 'wo', 'fon', 'dyu']).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  currency: z.enum(['XOF_UEMOA', 'XAF_CEMAC', 'GHS', 'NGN']).optional(),
  dateFormat: z.enum(['DMY', 'MDY', 'YMD']).optional(),
  numberFormat: z.enum(['SPACE', 'COMMA', 'DOT']).optional(),
  country: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const preferences = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: SELECT,
    });

    return NextResponse.json(
      { preferences },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const preferences = await prisma.user.update({
      where: { id: auth.user.sub },
      // Cast — Zod inference produces an explicit `locale?: X | undefined`
      // shape (exactOptionalPropertyTypes) for omitted keys, while
      // Prisma's UserUpdateInput expects the key itself to be absent.
      // Structurally identical (JSON.parse never yields actual `undefined`).
      data: parsed.data as Prisma.UserUpdateInput,
      select: SELECT,
    });

    return NextResponse.json(
      { preferences },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
