-- AlterTable
ALTER TABLE "ListingInquiry" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE';

-- CreateIndex
CREATE INDEX "ListingInquiry_status_createdAt_idx" ON "ListingInquiry"("status", "createdAt");
