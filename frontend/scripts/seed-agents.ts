// Dev seed script. Creates 5 sample OWNER_AGENT users (with varied KYC
// completion and listing counts) so the public "/agents" directory and
// "/agents/[id]" profile pages have real data to render locally. Mirrors
// seed-dev.ts: idempotent (upsert keyed on email), refuses to run in
// production, and exports main(args, deps) so it can be unit-tested with
// an injected PrismaClient mock.
//
// Usage: pnpm seed:agents

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

const LEGAL_DOCUMENT_TYPES = [
  'ID_CARD',
  'PRO_CARD',
  'RCCM',
  'TAX_CERTIFICATE',
  'MANAGEMENT_MANDATE',
  'LIABILITY_INSURANCE',
] as const;

interface SeedListing {
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  status: 'VERIFIED' | 'SOLD';
  bedrooms?: number;
  bathrooms?: number;
  surfaceM2?: number;
  photoUrl: string;
}

interface SeedAgent {
  email: string;
  name: string;
  city: string;
  country: string;
  bio: string;
  phone: string;
  avatarUrl: string;
  verifiedDocCount: number; // how many of the 6 LEGAL_DOCUMENT_TYPES are VERIFIED
  listings: SeedListing[];
}

const SEED_AGENTS: SeedAgent[] = [
  {
    email: 'aminata.sarr@habitat-afrik.test',
    name: 'Aminata Sarr',
    city: 'Dakar',
    country: 'Sénégal',
    bio: 'Spécialiste des appartements, résidences et bureaux pour expatriés et jeunes actifs à Dakar et Plateau.',
    phone: '+221770000001',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    verifiedDocCount: 6,
    listings: [
      {
        title: 'Appartement meublé, Plateau',
        city: 'Dakar',
        country: 'Sénégal',
        propertyType: 'APPARTEMENT',
        transactionType: 'LOCATION',
        price: 350_000,
        status: 'VERIFIED',
        bedrooms: 3,
        bathrooms: 2,
        surfaceM2: 145,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/aeb3b3b2-0485-4a4a-a4f5-16674c826a8e.jpg',
      },
      {
        title: 'Studio résidentiel, Mermoz',
        city: 'Dakar',
        country: 'Sénégal',
        propertyType: 'APPARTEMENT',
        transactionType: 'LOCATION',
        price: 180_000,
        status: 'VERIFIED',
        bedrooms: 1,
        bathrooms: 1,
        surfaceM2: 45,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/aeb3b3b2-0485-4a4a-a4f5-16674c826a8e.jpg',
      },
      {
        title: 'Bureau haut de gamme, Plateau',
        city: 'Dakar',
        country: 'Sénégal',
        propertyType: 'BUREAU',
        transactionType: 'LOCATION',
        price: 800_000,
        status: 'SOLD',
        surfaceM2: 220,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/c4f7451e-3131-41f4-a4de-bcbd71f39a70.jpg',
      },
    ],
  },
  {
    email: 'kodjo.mensah@habitat-afrik.test',
    name: 'Kodjo Mensah',
    city: 'Lomé',
    country: 'Togo',
    bio: "Expert des terrains titrés et opportunités d'investissement à fort potentiel autour de Lomé.",
    phone: '+22890000002',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F6',
    verifiedDocCount: 3,
    listings: [
      {
        title: 'Parcelle titrée, Agoè',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'PARCELLE',
        transactionType: 'VENTE',
        price: 25_000_000,
        status: 'VERIFIED',
        surfaceM2: 600,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/4957ee68-0565-4368-9433-203197e44eb9.jpg',
      },
      {
        title: 'Domaine investisseur, Baguida',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'DOMAINE',
        transactionType: 'VENTE',
        price: 60_000_000,
        status: 'VERIFIED',
        surfaceM2: 2000,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/eeae1866-66b5-4155-890f-f3c987e2996f.jpg',
      },
    ],
  },
  {
    email: 'nadege.ahouanvoebla@habitat-afrik.test',
    name: 'Nadège Ahouanvoébla',
    city: 'Cotonou',
    country: 'Bénin',
    bio: 'Conseil patrimonial et accompagnement des familles sur Cotonou et Abomey-Calavi.',
    phone: '+22990000003',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F1',
    verifiedDocCount: 6,
    listings: [
      {
        title: 'Villa familiale, Abomey-Calavi',
        city: 'Cotonou',
        country: 'Bénin',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 95_000_000,
        status: 'VERIFIED',
        bedrooms: 4,
        bathrooms: 3,
        surfaceM2: 280,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/4957ee68-0565-4368-9433-203197e44eb9.jpg',
      },
    ],
  },
  {
    email: 'issouf.traore@habitat-afrik.test',
    name: 'Issouf Traoré',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    bio: 'Spécialiste des villas prestige à Marcory, Deux Plateaux et Zone 4 à Abidjan.',
    phone: '+22507000004',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F7',
    verifiedDocCount: 0,
    listings: [
      {
        title: 'Villa duplex standing, Cocody',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 185_000_000,
        status: 'VERIFIED',
        bedrooms: 5,
        bathrooms: 4,
        surfaceM2: 320,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/4957ee68-0565-4368-9433-203197e44eb9.jpg',
      },
      {
        title: 'Villa prestige, Deux Plateaux',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 240_000_000,
        status: 'VERIFIED',
        bedrooms: 6,
        bathrooms: 5,
        surfaceM2: 480,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/eeae1866-66b5-4155-890f-f3c987e2996f.jpg',
      },
      {
        title: 'Appartement meublé, Zone 4',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'APPARTEMENT',
        transactionType: 'LOCATION',
        price: 350_000,
        status: 'VERIFIED',
        bedrooms: 3,
        bathrooms: 2,
        surfaceM2: 145,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/aeb3b3b2-0485-4a4a-a4f5-16674c826a8e.jpg',
      },
      {
        title: 'Villa vendue, Riviera',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 150_000_000,
        status: 'SOLD',
        bedrooms: 4,
        bathrooms: 3,
        surfaceM2: 300,
        photoUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/4957ee68-0565-4368-9433-203197e44eb9.jpg',
      },
    ],
  },
  {
    email: 'fatou.diallo@habitat-afrik.test',
    name: 'Fatou Diallo',
    city: 'Dakar',
    country: 'Sénégal',
    bio: 'Spécialiste des locations longue durée et gestion locative pour résidents et investisseurs.',
    phone: '+221770000005',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F3',
    verifiedDocCount: 6,
    listings: [],
  },
];

const SEED_PASSWORD = 'AgentPassword123!';

interface SeedDeps {
  prisma?: PrismaClient;
}

export async function main(_args: string[] = [], deps: SeedDeps = {}): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run seed-agents in production.');
    process.exit(1);
  }

  const prisma = deps.prisma ?? new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    for (const seed of SEED_AGENTS) {
      const user = await prisma.user.upsert({
        where: { email: seed.email },
        update: {
          name: seed.name,
          city: seed.city,
          country: seed.country,
          bio: seed.bio,
          phone: seed.phone,
          avatarUrl: seed.avatarUrl,
          accountType: 'OWNER_AGENT',
        },
        create: {
          email: seed.email,
          passwordHash,
          emailVerifiedAt: new Date(),
          accountType: 'OWNER_AGENT',
          name: seed.name,
          city: seed.city,
          country: seed.country,
          bio: seed.bio,
          phone: seed.phone,
          avatarUrl: seed.avatarUrl,
        },
        select: { id: true, email: true },
      });

      // Legal documents — the first N of the fixed 6-type set are VERIFIED,
      // matching this agent's target KYC completion level.
      for (let i = 0; i < LEGAL_DOCUMENT_TYPES.length; i++) {
        const type = LEGAL_DOCUMENT_TYPES[i]!;
        const verified = i < seed.verifiedDocCount;
        await prisma.legalDocument.upsert({
          where: { userId_type: { userId: user.id, type } },
          update: { status: verified ? 'VERIFIED' : 'PENDING' },
          create: {
            userId: user.id,
            type,
            status: verified ? 'VERIFIED' : 'PENDING',
            key: `seed/${user.id}/${type}`,
            url: `https://example.com/seed/${user.id}/${type}.pdf`,
            filename: `${type}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 1024,
          },
        });
      }

      // Listings — wipe and recreate this agent's seeded listings on every
      // run so re-seeding stays deterministic (titles are seed-owned, not
      // user-editable data worth preserving across runs).
      await prisma.listing.deleteMany({
        where: { userId: user.id, title: { in: seed.listings.map((l) => l.title) } },
      });
      for (const listing of seed.listings) {
        await prisma.listing.create({
          data: {
            userId: user.id,
            title: listing.title,
            city: listing.city,
            country: listing.country,
            propertyType: listing.propertyType,
            transactionType: listing.transactionType,
            price: listing.price,
            status: listing.status,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            surfaceM2: listing.surfaceM2,
            photos: {
              create: [{ key: `seed/${user.id}`, url: listing.photoUrl, isPrimary: true }],
            },
          },
        });
      }

      console.log(
        `✓ ${user.email} — ${seed.verifiedDocCount}/6 docs vérifiés, ${seed.listings.length} annonce(s)`,
      );
    }
    console.log(`\nMot de passe de test pour tous les agents : ${SEED_PASSWORD}`);
  } finally {
    if (!deps.prisma) {
      await prisma.$disconnect();
    }
  }
}

// Compares via pathToFileURL (not a raw `file://` template) because
// process.argv[1] uses OS-native path separators — on Windows that's
// backslashes, which never match import.meta.url's forward-slash
// file:// form, silently no-opping the whole script.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
