-- CreateEnum
CREATE TYPE "GrantSource" AS ENUM ('SEED', 'MANUAL');

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "source" "GrantSource" NOT NULL DEFAULT 'SEED';
