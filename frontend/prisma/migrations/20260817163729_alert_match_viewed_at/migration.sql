-- AlterTable: nullable, additive-only, no backfill needed (existing rows
-- become "never viewed" by default, which is correct).
ALTER TABLE "AlertMatch" ADD COLUMN "viewedAt" TIMESTAMP(3);
