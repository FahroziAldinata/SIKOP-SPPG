-- AlterTable
ALTER TABLE "Notifikasi" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT;
