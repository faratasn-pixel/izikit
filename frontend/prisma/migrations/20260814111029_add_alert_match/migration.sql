-- CreateTable
CREATE TABLE "AlertMatch" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "propertyRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertMatch_alertId_createdAt_idx" ON "AlertMatch"("alertId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMatch_alertId_propertyRequestId_key" ON "AlertMatch"("alertId", "propertyRequestId");

-- AddForeignKey
ALTER TABLE "AlertMatch" ADD CONSTRAINT "AlertMatch_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertMatch" ADD CONSTRAINT "AlertMatch_propertyRequestId_fkey" FOREIGN KEY ("propertyRequestId") REFERENCES "PropertyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
