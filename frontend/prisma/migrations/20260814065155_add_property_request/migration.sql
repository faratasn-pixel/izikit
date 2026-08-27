-- CreateTable
CREATE TABLE "PropertyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bedrooms" TEXT,
    "salons" TEXT,
    "surfaceM2" INTEGER,
    "capacity" INTEGER,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'Normale',
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "financing" TEXT NOT NULL,
    "delay" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientType" TEXT NOT NULL DEFAULT 'Particulier',
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyRequest_userId_createdAt_idx" ON "PropertyRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyRequest_status_idx" ON "PropertyRequest"("status");

-- AddForeignKey
ALTER TABLE "PropertyRequest" ADD CONSTRAINT "PropertyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
