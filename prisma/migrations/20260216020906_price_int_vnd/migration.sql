/*
  Warnings:

  - You are about to alter the column `oldPrice` on the `Alert` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `newPrice` on the `Alert` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `targetPrice` on the `AlertRule` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price` on the `PriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "oldPrice" SET DATA TYPE INTEGER,
ALTER COLUMN "newPrice" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "AlertRule" ALTER COLUMN "targetPrice" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "PriceHistory" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE INDEX "Product_lastCheckedAt_idx" ON "Product"("lastCheckedAt");
