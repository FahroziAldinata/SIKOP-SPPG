-- CreateTable
CREATE TABLE "GrupHari" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hariAktif" "HariMenu"[],

    CONSTRAINT "GrupHari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterTargetGizi" (
    "id" TEXT NOT NULL,
    "kelompokUmurMenuId" TEXT NOT NULL,
    "energiKkal" INTEGER NOT NULL,
    "proteinGr" INTEGER NOT NULL,
    "lemakGr" INTEGER NOT NULL,
    "karbohidratGr" INTEGER NOT NULL,
    "seratGr" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterTargetGizi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumenBuktiLpd2m" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "namaBukti" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DokumenBuktiLpd2m_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InputPenerimaManfaat" DROP COLUMN IF EXISTS "hariAktif",
ADD COLUMN     "grupHariId" TEXT;

-- CreateIndex
CREATE INDEX "GrupHari_periodeId_idx" ON "GrupHari"("periodeId");

-- CreateIndex
CREATE UNIQUE INDEX "GrupHari_periodeId_label_key" ON "GrupHari"("periodeId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "MasterTargetGizi_kelompokUmurMenuId_key" ON "MasterTargetGizi"("kelompokUmurMenuId");

-- CreateIndex
CREATE INDEX "DokumenBuktiLpd2m_periodeId_idx" ON "DokumenBuktiLpd2m"("periodeId");

-- CreateIndex
CREATE INDEX "InputPenerimaManfaat_grupHariId_idx" ON "InputPenerimaManfaat"("grupHariId");

-- AddForeignKey
ALTER TABLE "GrupHari" ADD CONSTRAINT "GrupHari_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterTargetGizi" ADD CONSTRAINT "MasterTargetGizi_kelompokUmurMenuId_fkey" FOREIGN KEY ("kelompokUmurMenuId") REFERENCES "KelompokUmurMenu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaat" ADD CONSTRAINT "InputPenerimaManfaat_grupHariId_fkey" FOREIGN KEY ("grupHariId") REFERENCES "GrupHari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenBuktiLpd2m" ADD CONSTRAINT "DokumenBuktiLpd2m_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenBuktiLpd2m" ADD CONSTRAINT "DokumenBuktiLpd2m_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
