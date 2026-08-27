// Dev seed script. Creates 3 sample users with bcrypt-hashed passwords for
// local development against a real Postgres. Refuses to run with
// NODE_ENV=production to prevent accidental destructive seeding in prod.
//
// Usage: pnpm seed:dev
//
// Idempotent — uses upsert keyed on email, so running multiple times
// does not duplicate rows.
//
// SCRIPT-01 refactor: exports `main(args, deps)` so tests can inject a
// mocked PrismaClient (no DB connection at module import time). The CLI
// guard at the bottom mirrors `make-superadmin.ts:85-92`.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

const SEED_USERS = [
  { email: 'admin@example.com', password: 'AdminPassword123!', role: 'SUPERADMIN' },
  { email: 'user@example.com', password: 'UserPassword123!', role: 'USER' },
  {
    email: 'unverified@example.com',
    password: 'UnverifiedPwd123!',
    role: 'USER',
    skipVerify: true,
  },
] as const;

interface SeedDeps {
  // Injectable for tests — defaults to a freshly-instantiated PrismaClient
  // when called as a CLI.
  prisma?: PrismaClient;
}

export async function main(_args: string[] = [], deps: SeedDeps = {}): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run seed-dev in production.');
    process.exit(1);
  }

  const prisma = deps.prisma ?? new PrismaClient();
  try {
    for (const seed of SEED_USERS) {
      const passwordHash = await bcrypt.hash(seed.password, 12);
      const user = await prisma.user.upsert({
        where: { email: seed.email },
        update: { passwordHash, role: seed.role },
        create: {
          email: seed.email,
          passwordHash,
          role: seed.role,
          emailVerifiedAt: 'skipVerify' in seed && seed.skipVerify ? null : new Date(),
        },
        select: { email: true, role: true, emailVerifiedAt: true },
      });
      const verified = user.emailVerifiedAt ? 'verified' : 'unverified';
      console.log(`✓ ${user.email} (${user.role}, ${verified})`);
    }
    console.log('\nLogin with the password from this file (do NOT use these in prod).');
  } finally {
    // Only disconnect the real client; tests pass their own mock and close
    // it themselves.
    if (!deps.prisma) {
      await prisma.$disconnect();
    }
  }
}

// CLI entrypoint guard — only run when invoked as a script, not when
// imported by tests. Compares via pathToFileURL (not a raw `file://`
// template) because process.argv[1] uses OS-native path separators —
// on Windows that's backslashes, which never match import.meta.url's
// forward-slash file:// form, silently no-opping the whole script.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
