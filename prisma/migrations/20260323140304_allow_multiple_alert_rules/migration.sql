-- DropIndex
DROP INDEX "AlertRule_userId_productId_key";

-- CreateIndex
CREATE INDEX "AlertRule_userId_createdAt_idx" ON "AlertRule"("userId", "createdAt");
