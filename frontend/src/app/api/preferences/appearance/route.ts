// GET/PATCH /api/preferences/appearance — /settings "Apparence" tab.
//
// Real, persisted, but DORMANT: this starter ships zero dark-mode CSS
// anywhere, so `theme` doesn't actually restyle the app yet, and the same
// is true for accentColor/fontScale/density/sidebarStyle/animation flags.
// See .planning/banani/apparence-settings.md.
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
  theme: true,
  accentColor: true,
  fontScale: true,
  density: true,
  sidebarStyle: true,
  animationsEnabled: true,
  hoverEffectsEnabled: true,
  reduceMotion: true,
} as const;

const PatchBody = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'accentColor must be a #RRGGBB hex string')
    .optional(),
  fontScale: z.enum(['SMALL', 'NORMAL', 'LARGE']).optional(),
  density: z.enum(['COMPACT', 'NORMAL', 'SPACIOUS']).optional(),
  sidebarStyle: z.enum(['EXPANDED', 'COMPACT']).optional(),
  animationsEnabled: z.boolean().optional(),
  hoverEffectsEnabled: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
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
      // Cast — Zod inference produces an explicit `theme?: X | undefined`
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
