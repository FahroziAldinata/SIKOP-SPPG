/*
  Warnings:

  - Added the required column `baseUrl` to the `ChatApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `ChatApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatApiKey" ADD COLUMN     "baseUrl" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL;
