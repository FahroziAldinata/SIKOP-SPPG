-- AlterTable
ALTER TABLE "RabHarian" ADD COLUMN     "menuHarianId" TEXT,
ADD COLUMN     "selisih" DECIMAL(14,2),
ADD COLUMN     "totalKebutuhan" DECIMAL(14,2),
ADD COLUMN     "totalPagu" DECIMAL(14,2),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- CreateTable
CREATE TABLE "RabHarianItem" (
    "id" TEXT NOT NULL,
    "rabHarianId" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "qtySiswa" DECIMAL(12,3) NOT NULL,
    "qtyB3" DECIMAL(12,3) NOT NULL,
    "qtyTotal" DECIMAL(12,3) NOT NULL,
    "satuan" TEXT NOT NULL,
    "hargaSatuan" DECIMAL(12,2) NOT NULL,
    "hargaOverride" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "RabHarianItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RabHarianItem_rabHarianId_bahanPokokId_key" ON "RabHarianItem"("rabHarianId", "bahanPokokId");

-- AddForeignKey
ALTER TABLE "RabHarian" ADD CONSTRAINT "RabHarian_menuHarianId_fkey" FOREIGN KEY ("menuHarianId") REFERENCES "MenuHarian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabHarian" ADD CONSTRAINT "RabHarian_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabHarianItem" ADD CONSTRAINT "RabHarianItem_rabHarianId_fkey" FOREIGN KEY ("rabHarianId") REFERENCES "RabHarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabHarianItem" ADD CONSTRAINT "RabHarianItem_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
