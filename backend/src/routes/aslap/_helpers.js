const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");

function inferJenjang(nama) {
  if (!nama || typeof nama !== "string") return "SD";
  const upper = nama.toUpperCase();
  if (upper.includes("SD") || upper.includes("MIN") || upper.includes("ELEMENTARY")) return "SD";
  if (upper.includes("SMP") || upper.includes("MTS") || upper.includes("JUNIOR")) return "SMP";
  if (upper.includes("SMA") || upper.includes("SMK") || upper.includes("MA") || upper.includes("HIGH")) return "SMA_SMK";
  return "TK";
}

async function getLembaga(periodeId) {
  const setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  return {
    namaLembaga: setupLembaga?.namaLembaga || "",
    alamat: setupLembaga?.alamat || "",
    namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
  };
}

const authMiddleware = (resourceKode, aksi = "READ") => [requireAuth, requirePermission(resourceKode, aksi)];

module.exports = {
  inferJenjang,
  getLembaga,
  authMiddleware,
};

