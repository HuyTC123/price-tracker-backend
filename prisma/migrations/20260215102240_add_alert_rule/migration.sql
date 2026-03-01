/*
  Warnings:

  - You are about to drop the column `lastTriggeredAt` on the `AlertRule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,productId]` on the table `AlertRule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AlertRule_userId_createdAt_idx";

-- DropIndex
DROP INDEX "AlertRule_userId_productId_targetPrice_key";

-- AlterTable
ALTER TABLE "AlertRule" DROP COLUMN "lastTriggeredAt";

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_userId_productId_key" ON "AlertRule"("userId", "productId");
