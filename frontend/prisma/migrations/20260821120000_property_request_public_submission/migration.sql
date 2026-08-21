-- DropForeignKey
ALTER TABLE "PropertyRequest" DROP CONSTRAINT "PropertyRequest_userId_fkey";

-- AlterTable: userId becomes nullable (public anonymous submissions have no
-- owning agent), plus two new optional fields for the public wizard.
ALTER TABLE "PropertyRequest"
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "landmark" TEXT,
  ADD COLUMN "notes" TEXT;

-- AddForeignKey (unchanged target/behavior, just re-added against the now-nullable column)
ALTER TABLE "PropertyRequest" ADD CONSTRAINT "PropertyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
