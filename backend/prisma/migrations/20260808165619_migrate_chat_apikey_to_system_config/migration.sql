/*
  Warnings:

  - You are about to drop the `ChatApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "PermissionAksi" ADD VALUE 'MANAGE';

-- DropForeignKey
ALTER TABLE "ChatApiKey" DROP CONSTRAINT "ChatApiKey_userId_fkey";

-- DropTable
DROP TABLE "ChatApiKey";

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "baseUrl" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
