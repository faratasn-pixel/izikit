// Bootstrap script. Promotes a user to SUPERADMIN by email.
// Usage: pnpm db:make-superadmin <email>
//
// ADMIN-07 / D-SCRIPT-01:
//   - Idempotent — running it twice is a no-op for an existing SUPERADMIN.
//   - The role flip + AdminAction insert run in a single prisma.$transaction
//     so promotion + audit are atomic.
//   - AdminAction is logged with action='BOOTSTRAP_SUPERADMIN', actorId=self,
//     metadata={ via: 'cli-script', previousRole }. This means the bootstrap
//     SUPERADMIN signs their own promotion — appropriate for the bootstrap
//     case (T-03-07-07 — accepted threat: shell access required).
//
// Role hierarchy: USER < ADMIN < SUPERADMIN. Only SUPERADMINs can promote
// others via the admin back-office, so this script exists to bootstrap the
// very first one.

import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { logAdminAction } from '../src/lib/server/admin/audit';

// Lazy-construct the client so tests can substitute the prisma module via
// vi.mock('@/lib/server/prisma') without spinning up a real connection.
let prismaClient: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!prismaClient) prismaClient = new PrismaClient();
  return prismaClient;
}

interface RunDeps {
  // Injectable for tests — defaults to the lazy-instantiated PrismaClient
  // when called as a CLI.
  prisma?: Pick<PrismaClient, 'user' | '$transaction' | '$disconnect'>;
}

export async function main(
  args: string[] = process.argv.slice(2),
  deps: RunDeps = {},
): Promise<number> {
  const email = args[0]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm db:make-superadmin <email>');
    return 1;
  }

  const prisma = deps.prisma ?? getPrisma();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`Error: user ${email} not found. Sign up first.`);
      return 1;
    }

    if (user.role === 'SUPERADMIN') {
      console.log(`User ${email} is already SUPERADMIN — no-op.`);
      return 0;
    }

    const previousRole = user.role;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'SUPERADMIN' },
      });
      await logAdminAction(tx, {
        actorId: user.id,
        action: 'BOOTSTRAP_SUPERADMIN',
        targetType: 'User',
        targetId: user.id,
        metadata: { via: 'cli-script', previousRole },
      });
    });

    console.log(`✓ Promoted ${email} (id=${user.id}) to SUPERADMIN.`);
    return 0;
  } finally {
    // Only disconnect the real client; tests pass their own mock and
    // close it themselves.
    if (!deps.prisma && prismaClient) {
      await prismaClient.$disconnect();
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
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
