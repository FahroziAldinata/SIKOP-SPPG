const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logger } = require("../lib/logger");
const { logAudit } = require("../lib/auditHelper");
const { createNotifikasiRows, queueEmailDispatch } = require("../lib/emailHelper");

const router = express.Router();

/**
 * Helper: lockAndVerifyTarget
 * Mengunci target (MenuHarian/RabHarian) secara atomik menggunakan SELECT FOR UPDATE.
 * 
 * @param {import('@prisma/client').PrismaClient} tx - Transaction client
 * @param {'MENU' | 'RAB'} targetType - Jenis target
 * @param {string} targetId - ID dari target yang ingin dikunci
 * @returns {Promise<{ id: string, status: string }>} Objek target yang berhasil dikunci
 * @throws {Error} Jika data tidak ditemukan (404) atau status bukan DIAJUKAN (400)
 */
async function lockAndVerifyTarget(tx, targetType, targetId) {
  // Guard targetType
  if (targetType !== "MENU" && targetType !== "RAB") {
    const err = new Error("Developer Error: targetType tidak valid. Harus 'MENU' atau 'RAB'.");
    err.statusCode = 500;
    throw err;
  }

  let rows = [];
  if (targetType === "MENU") {
    rows = await tx.$queryRaw`
      SELECT id, status FROM "MenuHarian" WHERE id = ${targetId} FOR UPDATE
    `;
    if (rows.length === 0) {
      const err = new Error("Data menu harian tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
  } else if (targetType === "RAB") {
    rows = await tx.$queryRaw`
      SELECT id, status FROM "RabHarian" WHERE id = ${targetId} FOR UPDATE
    `;
    if (rows.length === 0) {
      const err = new Error("Data RAB harian tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
  }

  const target = rows[0];
  if (target.status !== "DIAJUKAN") {
    const err = new Error(`Status data saat ini adalah ${target.status}, wajib DIAJUKAN untuk dapat diproses Kepala SPPG`);
    err.statusCode = 400;
    throw err;
  }

  return target;
}

/**
 * Handler: handlePostApproval
 * Memproses log approval dan memperbarui status target.
 */
async function handlePostApproval(req, res) {
  try {
    const { menuHarianId, rabHarianId, status, catatan } = req.body || {};

    // 1. Validasi mutually exclusive target (wajib diisi tepat satu)
    const targetType = menuHarianId ? "MENU" : (rabHarianId ? "RAB" : null);
    if (!targetType || (menuHarianId && rabHarianId)) {
      return res.status(400).json({ error: "Request harus menentukan tepat salah satu dari menuHarianId atau rabHarianId" });
    }
    const targetId = menuHarianId || rabHarianId;

    // 2. Validasi nilai status baru (hanya boleh DISETUJUI atau DITOLAK)
    const allowedStatuses = ["DISETUJUI", "DITOLAK"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Status approval baru harus berupa DISETUJUI atau DITOLAK" });
    }

    // 3. Validasi tipe data catatan jika ada (mencegah TypeError pada trim())
    if (catatan !== undefined && typeof catatan !== "string") {
      return res.status(400).json({ error: "catatan harus berupa teks" });
    }

    // 4. Validasi wajib catatan jika status DITOLAK
    if (status === "DITOLAK" && (!catatan || catatan.trim() === "")) {
      return res.status(400).json({ error: "Catatan wajib diisi jika status ditolak" });
    }

    // Registrasi email yang harus dikirim SETELAH transaksi commit (tidak block approval)
    const emailQueue = [];

    // Eksekusi atomik via transaction
    const result = await prisma.$transaction(async (tx) => {
      // 5. Lock row target & verifikasi status saat ini (wajib DIAJUKAN)
      await lockAndVerifyTarget(tx, targetType, targetId);

      // 6. Simpan record log Approval
      const approval = await tx.approval.create({
        data: {
          menuHarianId: targetType === "MENU" ? targetId : null,
          rabHarianId: targetType === "RAB" ? targetId : null,
          status,
          catatan: catatan ? catatan.trim() : null,
          approvedById: req.user.sub // Proteksi regresi: wajib menggunakan .sub dari JWT
        }
      });

      // 7. Update status target secara dinamis tanpa percabangan if/else tambahan
      const modelName = targetType === "MENU" ? "menuHarian" : "rabHarian";
      await tx[modelName].update({
        where: { id: targetId },
        data: { status }
      });

      // Audit log — APPROVE/REJECT (keputusan Kepala SPPG)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: targetType === "MENU" ? "MenuHarian" : "RabHarian",
        entityId: targetId,
        aksi: status === "DISETUJUI" ? "APPROVE" : "REJECT",
        dataLama: { status: "DIAJUKAN" },
        dataBaru: { status, catatan: catatan ? catatan.trim() : null }
      });

      // 8. Kirim Notifikasi kepada Pembuat Dokumen (in-app) + antri email (setelah commit)
      if (targetType === "MENU") {
        // [ASUMSI] Notifikasi dikirim ke seluruh kontributor (Ahli Gizi) unik dari blok menu harian
        const blocks = await tx.menuHarianBlok.findMany({
          where: { menuHarianId: targetId },
          select: { createdById: true }
        });
        const creatorIds = [...new Set(blocks.map((b) => b.createdById))];

        if (creatorIds.length === 0) {
          // [ASUMSI] Jika MenuHarian tidak memiliki blok sama sekali, lewati pembuatan notifikasi
          logger.warn(`[NOTIFIKASI] MenuHarian ID ${targetId} tidak memiliki blok, lewati pengiriman notifikasi.`);
        } else {
          const judul = `Menu Harian Anda ${status === "DISETUJUI" ? "Disetujui" : "Ditolak"}`;
          const pesan = status === "DISETUJUI"
            ? "Menu Harian Anda telah disetujui oleh Kepala SPPG."
            : `Menu Harian Anda ditolak oleh Kepala SPPG. Alasan: ${catatan ? catatan.trim() : "-"}`;
          const rows = await createNotifikasiRows(tx, {
            userIds: creatorIds,
            judul,
            pesan,
            entityType: "MENU",
            entityId: targetId
          });
          emailQueue.push({ rows, msg: { judul, pesan, entityType: "MENU" } });
        }
      } else if (targetType === "RAB") {
        const rab = await tx.rabHarian.findUnique({
          where: { id: targetId },
          select: { createdById: true, tanggal: true }
        });
        if (rab) {
          const judul = `RAB Harian Anda ${status === "DISETUJUI" ? "Disetujui" : "Ditolak"}`;
          const pesan = status === "DISETUJUI"
            ? "RAB Harian Anda telah disetujui oleh Kepala SPPG."
            : `RAB Harian Anda ditolak oleh Kepala SPPG. Alasan: ${catatan ? catatan.trim() : "-"}`;
          const rows = await createNotifikasiRows(tx, {
            userIds: [rab.createdById],
            judul,
            pesan,
            entityType: "RAB",
            entityId: targetId
          });
          emailQueue.push({ rows, msg: { judul, pesan, entityType: "RAB" } });

          // C.4 — Notifikasi ke Mitra saat RAB DISETUJUI (in-app saja, tanpa email)
          if (status === "DISETUJUI") {
            const mitraUsers = await tx.user.findMany({
              where: { role: "MITRA" },
              select: { id: true }
            });
            if (mitraUsers.length > 0) {
              const notifMitra = mitraUsers.map((u) => ({
                userId: u.id,
                judul: "RAB Harian Disetujui",
                pesan: `RAB Harian tanggal ${rab.tanggal.toISOString().split("T")[0]} telah disetujui oleh Kepala SPPG. Silakan cek estimasi kebutuhan bahan sebelum membuat PO.`,
                entityType: "RAB",
                entityId: targetId
              }));
              await tx.notifikasi.createMany({ data: notifMitra });
            }
          }
        }
      }

      return approval;
    });

    // Kirim email async SETELAH transaksi commit — gagal tidak pernah memengaruhi hasil approval
    for (const { rows, msg } of emailQueue) {
      queueEmailDispatch(rows, msg);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    // Tangkap error dengan status code terdefinisi dari lockAndVerifyTarget (400/404, abaikan 500)
    if (error.statusCode && error.statusCode !== 500) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses approval" });
  }
}

/**
 * Handler: handleGetApprovals
 * Menampilkan riwayat log approval berdasarkan periode dan filter opsional.
 * [ASUMSI] Hanya dapat diakses oleh KEPALA_SPPG.
 */
async function handleGetApprovals(req, res) {
  try {
    const { periodeId, status, targetType, limit, offset } = req.query;

    // 1. Validasi parameter wajib periodeId
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    // 2. Pagination (skip/take) dengan cap maksimal 100
    let take = limit ? parseInt(limit, 10) : 10;
    const skip = offset ? parseInt(offset, 10) : 0;
    if (isNaN(take) || take < 0 || isNaN(skip) || skip < 0) {
      return res.status(400).json({ error: "Parameter limit dan offset harus berupa angka non-negatif" });
    }
    take = Math.min(take, 100);

    const where = {};

    // 3. Filter status (opsional)
    if (status) {
      const allowedStatuses = ["DISETUJUI", "DITOLAK"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Status filter harus berupa DISETUJUI atau DITOLAK" });
      }
      where.status = status;
    }

    // 4. Filter targetType dan periodeId secara dinamis & terindeks (tanpa redundancies)
    if (targetType) {
      if (targetType === "MENU") {
        where.menuHarian = { periodeId };
      } else if (targetType === "RAB") {
        where.rabHarian = { periodeId };
      } else {
        return res.status(400).json({ error: "targetType filter tidak valid. Harus 'MENU' atau 'RAB'." });
      }
    } else {
      // Jika targetType kosong, ambil log approval Menu ATAU Rab di periode ini
      where.OR = [
        { menuHarian: { periodeId } },
        { rabHarian: { periodeId } }
      ];
    }

    // 5. Query data & count total untuk metadata pagination
    const [list, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          approvedBy: {
            select: {
              id: true,
              nama: true,
              username: true
            }
          },
          menuHarian: {
            select: {
              id: true,
              tanggal: true,
              status: true
            }
          },
          rabHarian: {
            select: {
              id: true,
              tanggal: true,
              status: true
            }
          }
        }
      }),
      prisma.approval.count({ where })
    ]);

    res.json({
      data: list,
      pagination: {
        total,
        limit: take,
        offset: skip
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil riwayat approval" });
  }
}

// Mounting Route dengan autentikasi & otorisasi KEPALA_SPPG
router.post("/approval", requireAuth, requirePermission("kepala-approval", "APPROVE"), handlePostApproval);
router.get("/approval", requireAuth, requirePermission("kepala-approval", "READ"), handleGetApprovals);

module.exports = router;
