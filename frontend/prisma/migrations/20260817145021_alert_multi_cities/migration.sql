-- AlterTable: add cities as nullable first so we can backfill from the old city column
ALTER TABLE "Alert" ADD COLUMN "cities" JSONB;

-- Backfill: wrap each existing single city into a one-element JSON array
UPDATE "Alert" SET "cities" = to_jsonb(ARRAY["city"]) WHERE "city" IS NOT NULL;

-- Now that every row has a value, enforce NOT NULL
ALTER TABLE "Alert" ALTER COLUMN "cities" SET NOT NULL;

-- Drop the old single-city column
ALTER TABLE "Alert" DROP COLUMN "city";
