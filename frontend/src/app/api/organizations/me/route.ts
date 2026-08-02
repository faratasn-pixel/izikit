// GET/PATCH /api/organizations/me — Settings → Mon agence (phase 1: identity
// + zones d'activité — see .planning/banani/mon-agence.md).
//
// Phase 1 has no team members yet, so "my agency" is simply the
// Organization owned by the caller — find-or-create on first PATCH (a
// OWNER_AGENT user who never touched this screen has no Organization row).
// No requireOrgRole gate: that middleware is for param-based multi-member
// org routes, which land in phase 2 (team invites).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { slugify, ensureUniqueSlug } from '@/lib/server/slug';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const ZoneSchema = z.object({
  country: z.string().trim().min(1).max(120),
  cities: z.array(z.string().trim().min(1).max(120)).max(50),
});

const PatchBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  agencyType: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().max(200).optional(),
  website: z.string().trim().max(200).optional(),
  rccmNumber: z.string().trim().max(120).optional(),
  facebookHandle: z.string().trim().max(120).optional(),
  instagramHandle: z.string().trim().max(120).optional(),
  linkedinHandle: z.string().trim().max(120).optional(),
  whatsappNumber: z.string().trim().max(32).optional(),
  zones: z.array(ZoneSchema).max(50).optional(),
});

const ORG_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  agencyType: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  rccmNumber: true,
  facebookHandle: true,
  instagramHandle: true,
  linkedinHandle: true,
  whatsappNumber: true,
  zones: true,
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const org = await prisma.organization.findFirst({
      where: { ownerId: auth.user.sub },
      select: ORG_SELECT,
    });

    return NextResponse.json(
      { organization: org },
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

    const existing = await prisma.organization.findFirst({
      where: { ownerId: auth.user.sub },
      select: { id: true },
    });

    const data = parsed.data;

    let orgId: string;
    if (existing) {
      orgId = existing.id;
    } else {
      // First save — find-or-create the Organization for this owner.
      const base = slugify(data.name ?? auth.user.email.split('@')[0] ?? 'agence') || 'agence';
      const slug = await ensureUniqueSlug(base, (candidate) =>
        prisma.organization.create({
          data: {
            slug: candidate,
            name: data.name ?? 'Mon agence',
            ownerId: auth.user.sub,
            members: { create: { userId: auth.user.sub, role: 'OWNER' } },
          },
        }),
      );
      const created = await prisma.organization.findUniqueOrThrow({
        where: { slug },
        select: { id: true },
      });
      orgId = created.id;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.agencyType !== undefined && { agencyType: data.agencyType || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.rccmNumber !== undefined && { rccmNumber: data.rccmNumber || null }),
        ...(data.facebookHandle !== undefined && { facebookHandle: data.facebookHandle || null }),
        ...(data.instagramHandle !== undefined && {
          instagramHandle: data.instagramHandle || null,
        }),
        ...(data.linkedinHandle !== undefined && { linkedinHandle: data.linkedinHandle || null }),
        ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber || null }),
        ...(data.zones !== undefined && { zones: data.zones }),
      },
      select: ORG_SELECT,
    });

    return NextResponse.json(
      { organization: updated },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
