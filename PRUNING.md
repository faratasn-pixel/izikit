# Pruning protocol — how to safely remove an optional feature

When the user says *"I don't need feature X"*, an AI agent must follow this protocol **EXACTLY**. Naive deletion based only on the `owns` field of [.planning/features.json](.planning/features.json) WILL break the build — the manifest's `cross_dependencies`, `surgical_edits`, `cron_entries`, `prisma_user_relations`, `outbox_event_kinds`, and `tripwires_to_update` fields exist precisely to prevent that.

This file is referenced from [CLAUDE.md](CLAUDE.md) — every Claude Code session loads CLAUDE.md, which points here when a prune is requested.

---

## Step 0 — Read the feature entry

Open [.planning/features.json](.planning/features.json), find the feature, and check `prune_complexity`:

| Value | Action |
|---|---|
| `safe` | Proceed with the protocol below; minimal cross-deps. |
| `with-care` | Proceed, but execute every `surgical_edits` step before any deletion. Re-run typecheck after each edit to catch new compile errors. |
| `never` | **STOP.** Tell the user *why* it's not prunable (read `$prune_complexity_reason` in the feature entry) and offer the configure-off alternative (leave env vars empty so the surface stays inert at runtime). Do NOT delete the code. |

## Step 1 — Resolve cross-dependencies

For each `cross_dependencies` entry, check whether the dependency is ALSO being pruned by the user (or is already absent). If a dependency is still required by another live feature, the surgical edits below may need adjustments — surface a question to the user before proceeding.

## Step 2 — Surgical edits FIRST (don't delete yet)

Apply every entry in `surgical_edits`:

- Remove dispatcher `case` statements before deleting the queue file the case references
- Remove `OutboxEvent` union variants before deleting the libs that produce them
- Remove `createNotification(...)` calls in caller routes before deleting `lib/server/notifications/`
- Remove `withSentryConfig(...)` wrap before deleting `sentry.*.config.ts`

## Step 3 — Update Prisma schema

Remove every `prisma_user_relations` entry from the `User` model (and any other parent model that holds the relation). Then drop the model itself (listed in `owns.models`). Generate a new migration:

```bash
pnpm db:migrate:dev --name prune_<feature>
```

## Step 4 — Update docs/deploy/n0c-crons.md

Remove every `cron_entries` entry from the cron table in `docs/deploy/n0c-crons.md`. The tripwire `n0c-crons-shape.test.ts` cross-checks every documented cron against an existing `app/api/cron/<name>/route.ts` — if the route is gone but the table row remains, the test fails. (Also delete the cron's panel entry on the N0C server itself.)

## Step 5 — Delete owned files

Delete every entry in:

- `owns.routes` → `frontend/src/app/<entry>/route.ts` (and the sibling `route.test.ts`)
- `owns.libs` → `frontend/src/lib/server/<entry>` (file or directory)

## Step 6 — Update tripwires

For every `tripwires_to_update` entry, edit the test to reflect the new shape (remove assertions that referenced the pruned feature). Do NOT delete the tripwire file itself — it still protects the remaining surfaces.

## Step 7 — Update env example + README

- Remove the feature's `envVars` from [.env.example](.env.example) (you can keep them as commented examples if you want, but make sure the README doesn't reference them as required)
- If the feature was mentioned in README.md route inventory, update the list

## Step 8 — Update features.json

Remove the pruned feature's entry from the manifest. The fork now has a leaner `features.json` reflecting its actual surface.

## Step 9 — Validate (NON-NEGOTIABLE)

Run all gates and read every output:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

If ANY step is red:

- **DO NOT commit.**
- Diagnose: typically a missed `surgical_edits` entry, a stale import, or a Prisma relation residue.
- **Rollback** with the right command depending on what you've done:
  - If you haven't committed yet: `git checkout HEAD -- .` (restores BOTH modified AND deleted tracked files; `git restore .` alone misses deletions)
  - If you committed an intermediate step: `git reset --hard HEAD~N` where N is the number of intermediate commits to undo (use cautiously — only on uncommitted-to-remote state)
- Re-run the protocol from Step 2 with the missed dependency added.

If green: commit atomically with `chore(prune): remove <feature>` and update [.planning/PROJECT.md](.planning/PROJECT.md) to note the prune in the Context section.

---

## Anti-patterns to avoid

- ❌ Deleting `owns` files first then trying to fix the cascading errors. Always do `surgical_edits` BEFORE deletions.
- ❌ Pruning a feature with `prune_complexity: never` (you'll break auth verification flows).
- ❌ Skipping Step 9 to "save time". The 559 tests + build are your safety net — they catch every missed surgical edit.
- ❌ Pruning without telling the user *what* will be removed. Show the planned changes (files to delete, surgical edits, env vars) and wait for explicit confirmation.
- ❌ Using `git restore .` to roll back deletions — it doesn't restore files the user deleted, only modifications. Use `git checkout HEAD -- .` for deletions.
