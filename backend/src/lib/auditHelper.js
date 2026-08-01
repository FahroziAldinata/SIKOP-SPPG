/**
 * Helper audit log modul keuangan (A-6).
 * Menyimpan dataLama/dataBaru (Json) secara utuh untuk seluruh aksi mutasi
 * keuangan — jurnal, saldo awal, override harga RAB, dokumen resmi, tutup-periode.
 *
 * Dipanggil dari DALAM transaksi (tx) agar atomik dengan mutasinya:
 * kalau mutasi sukses, audit log ikut ter-commit; kalau gagal, ikut rollback.
 */

function serializeForAudit(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toNumber" in value) {
    const n = value.toNumber();
    return Number.isNaN(n) ? value.toString() : n;
  }
  if (Array.isArray(value)) return value.map(serializeForAudit);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeForAudit(v);
    }
    return out;
  }
  return value;
}

/**
 * Catat 1 baris AuditLog.
 * @param {object} client prisma client ATAU transaction client (tx)
 * @param {object} opts
 * @param {string} opts.userId  id user yang melakukan aksi (req.user.sub)
 * @param {string} opts.entityType  nama model/entitas (mis. "JurnalTransaksi")
 * @param {string} opts.entityId  id record yang dimutasi
 * @param {string} opts.aksi  salah satu dari AksiAudit (CREATE/UPDATE/DELETE/...)
 * @param {object|null} opts.dataLama  snapshot sebelum mutasi (null utk CREATE)
 * @param {object|null} opts.dataBaru  snapshot sesudah mutasi (null utk DELETE)
 */
async function logAudit(client, { userId, entityType, entityId, aksi, dataLama, dataBaru }) {
  if (!userId) {
    throw new Error("[AUDIT] userId wajib diisi untuk mencatat audit log");
  }
  return client.auditLog.create({
    data: {
      entityType,
      entityId,
      aksi,
      dataLama: serializeForAudit(dataLama),
      dataBaru: serializeForAudit(dataBaru),
      userId
    }
  });
}

module.exports = { logAudit, serializeForAudit };
