-- AlterTable
ALTER TABLE "MasterMenuMingguan" ADD COLUMN "catatan" TEXT,
ADD COLUMN "mingguKe" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX IF EXISTS "MasterMenuMingguan_periodeId_jalur_hari_key";

-- CreateIndex
CREATE UNIQUE INDEX "MasterMenuMingguan_periodeId_jalur_hari_mingguKe_key" ON "MasterMenuMingguan"("periodeId", "jalur", "hari", "mingguKe");
