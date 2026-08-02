-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "description" TEXT,
ADD COLUMN     "agencyType" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "rccmNumber" TEXT,
ADD COLUMN     "facebookHandle" TEXT,
ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "linkedinHandle" TEXT,
ADD COLUMN     "whatsappNumber" TEXT,
ADD COLUMN     "zones" JSONB NOT NULL DEFAULT '[]';
